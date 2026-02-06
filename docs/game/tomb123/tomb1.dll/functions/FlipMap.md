# Function: FlipMap

## Description
Toggles the alternate room state for all rooms that have a flip room assigned. Swaps each room's data with its flip room counterpart and adjusts entity collision heights accordingly. This is the mechanism behind environmental changes like flooding, destruction, and other level state transitions.

Iterates through all rooms — for each room that has a valid flip room index, it swaps the entire room data structure between the original and its flip counterpart. Before swapping, entities in the room with specific model types have their collision floor height raised. After swapping, the same entity types in the now-active room have their collision floor height lowered by the same amount. Finally, toggles the FlipMapStatus global.

## Notes
- Only rooms with a valid flip room index (≥ 0) are processed — rooms without a flip pair are skipped
- The swap is a full room data exchange — all room properties are copied both ways
- After swapping, the flip room's flip index is set to -1 (invalidated) and the current room inherits the flip relationship
- Entity collision adjustment targets specific model types: models 0x30–0x33 get ±1024 adjustment, model 0x34 gets ±2048
- These collision adjustments handle entities like doors, bridges, and platforms that need floor height changes when the room state flips
- Entity traversal follows the room's entity linked list (ENTITY_NEXT_IN_ROOM)
- FlipMapStatus is toggled: 0 → 1 or 1 → 0
- The FlipMapFlags variable (separate from this function) tracks per-group flip states for levels with multiple independent flip zones
- Calling FlipMap when no rooms have flip pairs is safe — it just toggles the status flag

## Details

| Field     | Value                          |
|-----------|--------------------------------|
| Usage     | `Hook & Call`                  |
| Params    | (none)                         |
| Return    | `void`                         |

## Usage
### Hooking
```javascript
mod.hook('FlipMap')
    .onEnter(function() {
        const before = game.readVar(game.module, 'FlipMapStatus');
        log('FlipMap triggered, status before:', before);
    })
    .onLeave(function(returnValue) {
        const after = game.readVar(game.module, 'FlipMapStatus');
        log('FlipMap complete, status after:', after);
    });
```

### Calling from mod code
```javascript
// Toggle the flip map state
game.callFunction(game.module, 'FlipMap');

// Check current state
const status = game.readVar(game.module, 'FlipMapStatus');
log('Flip map active:', status !== 0);
```

## Pseudocode
```
function FlipMap():
    for each room in Rooms (0 to RoomsCount - 1):
        flipIndex = room.flipRoomIndex
        if flipIndex < 0:
            continue    // no flip room for this room

        flipRoom = Rooms[flipIndex]

        // Pre-swap: adjust collision for entities in current room
        for each entity in room's entity list:
            if entity.model in [0x30, 0x31, 0x32, 0x33]:
                adjustCollisionFloorHeight(entity, +1024)
            else if entity.model == 0x34:
                adjustCollisionFloorHeight(entity, +2048)

        // Swap entire room data between room and flipRoom
        temp = copy of room data
        room data = flipRoom data
        flipRoom data = temp

        // Update flip relationships
        room.flipRoomIndex = flipRoom.flipRoomIndex
        flipRoom.flipRoomIndex = -1    // invalidate
        room.entityListHead = flipRoom.entityListHead
        flipRoom.entityListHead = -1

        // Post-swap: adjust collision for entities in now-active room
        for each entity in room's entity list:
            if entity.model in [0x30, 0x31, 0x32, 0x33]:
                adjustCollisionFloorHeight(entity, -1024)
            else if entity.model == 0x34:
                adjustCollisionFloorHeight(entity, -2048)

    // Toggle status
    FlipMapStatus = (FlipMapStatus == 0) ? 1 : 0
```
