# Function: EntityPushBlock

## Description
Controls pushable block objects that Lara can push or pull. Handles gravity when the block is above the floor, plays an impact sound and visual effects on landing, adjusts sector collision floor height, and processes sector triggers at the final resting position. On level 17, tracks specific block placements for puzzle progression.

## Notes
- Only called by the game loop for entities on the active processing list (`ENTITY_STATUS` bit 0 set)
- Called with the entity's index into the entity array, not a pointer
- **Initial setup check**: if `ENTITY_FLAGS` bit 8 is set, calls `AdjustEntityCollision` with height 1024 to raise the collision floor at the block's position, then deactivates the entity — this handles blocks that start already placed
- **Gravity**: if the block's Y is above the floor (calculated via `GetSector` + `CalculateFloorHeight`), sets `ENTITY_STATUS` bit 3 (gravity flag)
- **Landing** (gravity flag set and block reaches floor):
  - Snaps Y to floor height
  - Clears gravity flag (bit 3), clears bit 1, sets bit 2 (deactivation pending)
  - **Impact sound**: plays sound 70 at the block's position. Calculates volume based on 3D distance from the camera — louder when closer, with a maximum distance cutoff of 16384 units per axis
  - **Level 5 impact effects**: creates 8 debris effects in a ring at ±512 units in X and Z around the block (same 3x3 grid pattern as `EntityFallingCeiling`)
- **Idle check**: if gravity flag is not set and a busy flag at entity offset is zero, clears status bits and removes from processing list (block is at rest, not being interacted with)
- Calls `ProcessEntityAnimation` every frame
- Handles room transitions via `GetSector`
- **Final placement** (when `ENTITY_STATUS` bits 1–2 indicate deactivated):
  - Clears status bits and removes from processing list
  - Calls `AdjustEntityCollision` with height -1024 to lower the collision floor
  - Calls `CalculateFloorHeight` then `ProcessTriggers` on the current sector — activating any triggers at the block's final position
  - **Level 17 puzzle tracking**: checks specific entity IDs and increments puzzle progression counters when those blocks are placed

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
// Log when a pushblock lands and triggers
mod.hook('EntityPushBlock')
    .onEnter(function(entityId) {
        const entities = game.readVar(game.module, 'Entities');
        const entity = entities.add(entityId * ENTITY_SIZE);
        this._status = entity.add(ENTITY_STATUS).readU16();
    })
    .onLeave(function(returnValue, entityId) {
        const entities = game.readVar(game.module, 'Entities');
        const entity = entities.add(entityId * ENTITY_SIZE);
        const newStatus = entity.add(ENTITY_STATUS).readU16();
        if ((this._status & 8) !== 0 && (newStatus & 8) === 0) {
            log('Pushblock', entityId, 'landed');
        }
    });
```

### Calling from mod code
```javascript
game.callFunction(game.module, 'EntityPushBlock', pushblockEntityIndex);
```

## Pseudocode
```
function EntityPushBlock(entityId):
    entity = entities[entityId]

    // Initial setup — block already placed
    if ENTITY_FLAGS bit 8 set:
        AdjustEntityCollision(entity, 1024)
        deactivateEntity(entityId)
        return

    ProcessEntityAnimation(entity)

    // Get floor height at block position
    sector = GetSector(entity.x, entity.y, entity.z, &roomOut)
    floorH = CalculateFloorHeight(sector, entity.x, entity.y, entity.z)
    status = entity[ENTITY_STATUS]

    if entity.y < floorH:
        // Above floor — enable gravity
        set status bit 3

    else if status bit 3 set:
        // Was falling, now reached floor — land
        entity.y = floorH
        clear status bit 3
        clear status bit 1, set status bit 2  // deactivation pending

        // Impact sound with distance-based volume
        distance = 3D distance from camera to entity
        if distance within 16384 per axis:
            volume = scale by inverse distance
        SoundEffect(70, entity.position, 0)

        // Level 5: create 8 debris effects in ring (±512 units)
        if level == 5:
            for each of 8 surrounding grid positions at ±512:
                createDebrisEffect(offsetX, entity.y, offsetZ)

    else if pushblock not busy:
        // At rest, not being pushed — deactivate
        clear status bits 1 and 2
        removeFromProcessingList(entityId)

    // Room transition
    if roomOut != entity[ENTITY_ROOM]:
        changeRoom(entityId, roomOut)

    // Final placement
    if (ENTITY_STATUS & 6) == 4:
        clear status bits 1 and 2
        removeFromProcessingList(entityId)

        // Lower collision floor (block settled)
        AdjustEntityCollision(entity, -1024)

        // Trigger processing at final position
        CalculateFloorHeight(sector, entity.x, entity.y, entity.z)
        ProcessTriggers(sector, 1)

        // Level 17: puzzle progression tracking
        if level == 17:
            check specific entity IDs and increment puzzle counters
```
