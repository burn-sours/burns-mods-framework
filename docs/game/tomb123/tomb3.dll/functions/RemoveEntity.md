# Function: RemoveEntity

## Description
Removes an entity from the game world. Handles unlinking from active entity list and room entity list, clears targeting references, processes attached effects, and either adds to free list or marks as disabled.

## Notes
- If called during entity processing loop, removal is **deferred** to prevent list corruption — entity ID is queued and removed after processing completes
- Clears Lara's aim target if this entity was being aimed at
- Iterates through attached effects (up to 2048) — converts to world-space or removes them
- Clears entity status bit 0 (active processing flag)
- Unlinks from two linked lists: active entity list and room's entity list
- Two removal modes based on entity ID:
  - Dynamic entities (ID >= total level entities): added to free list for reuse
  - Static level entities (ID < total): marked with flag bit 15 (disabled)

## Details

| Field     | Value           |
|-----------|-----------------|
| Usage     | `Hook & Call`   |
| Params    | `int`           |
| Return    | `void`          |

### Parameters

| #   | Type  | Description                    |
|-----|-------|--------------------------------|
| 0   | `int` | Entity ID to remove            |

## Usage
### Hooking
```javascript
mod.hook('RemoveEntity')
    .onEnter(function(entityId) {
        // entityId is being removed
        // Can prevent removal by not calling original
    });
```

### Calling from mod code
```javascript
// Remove a specific entity
game.callFunction(game.module, 'RemoveEntity', entityId);
```

## Pseudocode
```
function RemoveEntity(entityId):
    // Check if currently processing entities
    if processingEntityFlag:
        // Defer removal to prevent list corruption
        deferredRemovalQueue[queueCount].entityId = entityId
        deferredRemovalQueue[queueCount].action = 5
        queueCount++
        return
    
    // Clear aiming target if this entity was targeted
    if (aimingFlags >> 13 & 1) and aimingTargetId == entityId:
        aimingState = 0
        aimingTargetId = -1
        aimingFlags &= ~0x2000
    
    // Process attached effects (2048 max)
    for i = 0 to 2048:
        effect = effectsArray[i]
        
        if not effect.active:
            continue
        if not (effect.flags & 0x80):  // not attached to entity
            continue
        if effect.attachedEntityId != entityId:
            continue
        
        if (effect.flags >> 10 & 1) == 0:
            // Convert effect to world-space position
            entity = Entities + entityId * ENTITY_SIZE
            effect.x += entity.x
            effect.y += entity.y
            effect.z += entity.z
            effect.flags &= ~0x80  // clear attached flag
        else:
            // Remove effect entirely
            effect.active = false
    
    // Get entity pointer
    entity = Entities + entityId * ENTITY_SIZE
    
    // Clear active status flag (bit 0)
    entity.status &= ~0x0001
    
    // Unlink from active entity linked list
    if activeEntityId == entityId:
        // Head of list - update head to next
        activeEntityId = entity.nextActive
    else:
        // Find previous entity in list
        prevId = activeEntityId
        while prevId != -1:
            prev = Entities + prevId * ENTITY_SIZE
            if prev.nextActive == entityId:
                // Unlink by pointing previous to next
                prev.nextActive = entity.nextActive
                break
            prevId = prev.nextActive
    
    // Unlink from room's entity linked list
    if entity.room != 255:  // valid room
        room = Rooms + entity.room * ROOM_SIZE
        
        if room.entityList == entityId:
            // Head of room list - update head to next
            room.entityList = entity.nextInRoom
        else:
            // Find previous entity in room list
            prevId = room.entityList
            while prevId != -1:
                prev = Entities + prevId * ENTITY_SIZE
                if prev.nextInRoom == entityId:
                    // Unlink
                    prev.nextInRoom = entity.nextInRoom
                    break
                prevId = prev.nextInRoom
    
    // Clear aiming pointer if this was aimed entity
    if entity == aimingAtPointer:
        aimingAtPointer = null
    
    // Handle entity slot recycling
    if entityId >= totalLevelEntities:
        // Dynamic entity - add to free list
        entity.nextInRoom = freeEntityList
        freeEntityList = entityId
    else:
        // Static level entity - mark as disabled (bit 15)
        entity.flags |= 0x8000
```
