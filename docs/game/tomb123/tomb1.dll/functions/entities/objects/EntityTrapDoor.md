# Function: EntityTrapDoor

## Description
Controls trapdoor objects that toggle between closed and open states via the trigger/timer system. A simple two-state object with animation and room transition handling. Uses a Y offset of 256 when checking room transitions to account for the trapdoor's position relative to the sector boundary.

## Notes
- Only called by the game loop for entities on the active processing list (`ENTITY_STATUS` bit 0 set)
- Called with the entity's index into the entity array, not a pointer
- **Trigger toggle**: uses `ENTITY_FLAGS` bits 9–14 and `ENTITY_TIMER` to determine activation state
- **Two states**: 0 (closed) and 1 (open)
  - Target on + current state 0: sets target state 1 (open)
  - Target off + current state 1: sets target state 0 (close)
- **Room transition**: uses `GetSector` with entity Y + 256 offset (slightly below the trapdoor) to check for room changes — accounts for the trapdoor sitting at a room boundary
- Calls `ProcessEntityAnimation` every frame

## Details

| Field     | Value                          |
|-----------|--------------------------------|
| Usage     | `Hook & Call`                  |
| Params    | `int`                          |
| Return    | `void`                         |

### Parameters

| #   | Type  | Description                          |
|-----|-------|--------------------------------------|
| 0   | `int` | Entity index in the entity array     |

## Usage
### Hooking
```javascript
// Log when a trapdoor opens or closes
mod.hook('EntityTrapDoor')
    .onEnter(function(entityId) {
        const entities = game.readVar(game.module, 'Entities');
        const entity = entities.add(entityId * ENTITY_SIZE);
        this._state = entity.add(ENTITY_CURRENT_STATE).readS16();
    })
    .onLeave(function(returnValue, entityId) {
        const entities = game.readVar(game.module, 'Entities');
        const entity = entities.add(entityId * ENTITY_SIZE);
        const newTarget = entity.add(ENTITY_TARGET_STATE).readS16();
        if (this._state === 0 && newTarget === 1) {
            log('Trapdoor', entityId, 'opening');
        } else if (this._state === 1 && newTarget === 0) {
            log('Trapdoor', entityId, 'closing');
        }
    });
```

### Calling from mod code
```javascript
game.callFunction(game.module, 'EntityTrapDoor', trapdoorEntityIndex);
```

## Pseudocode
```
function EntityTrapDoor(entityId):
    entity = entities[entityId]

    // Trigger/timer toggle
    target = (~(entity[ENTITY_FLAGS] >> 14)) & 1
    if ENTITY_FLAGS bits 9–13 all set:
        ...resolve target using ENTITY_TIMER...
    else:
        target = target ^ 1

    if target == 0:
        if entity[ENTITY_CURRENT_STATE] == 1:
            entity[ENTITY_TARGET_STATE] = 0  // close
    else:
        if entity[ENTITY_CURRENT_STATE] == 0:
            entity[ENTITY_TARGET_STATE] = 1  // open

    ProcessEntityAnimation(entity)

    // Room transition (Y + 256 offset for boundary check)
    room = entity[ENTITY_ROOM]
    GetSector(entity.x, entity.y + 256, entity.z, &roomOut)
    if roomOut != room:
        changeRoom(entityId, roomOut)
```
