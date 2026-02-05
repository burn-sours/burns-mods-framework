# Function: EntityMovingBlock

## Description
Controls pushable/movable block objects. Uses the trigger/timer toggle to transition between idle and moving states, adjusting the sector collision floor height as the block moves. On deactivation, snaps the block's position to the centre of its current sector grid cell and restores the collision floor.

## Notes
- Only called by the game loop for entities on the active processing list (`ENTITY_STATUS` bit 0 set)
- Called with the entity's index into the entity array, not a pointer
- **Trigger toggle**: uses `ENTITY_FLAGS` bits 9–14 and `ENTITY_TIMER` to determine activation state
- **Two states**: 0 (idle) and 1 (moving)
- **State transitions**:
  - Target on + current state 0: sets target state 1 (begin moving)
  - Target off + current state 1: sets target state 0 (stop moving)
  - On either transition: calls `AdjustEntityCollision` with height 2048 to raise the collision floor at the block's position (block occupies the sector)
- Calls `ProcessEntityAnimation` every frame
- Handles room transitions via `GetSector` each frame
- **Deactivation** (when `ENTITY_STATUS` bits 1–2 indicate bit 2 set, bit 1 clear):
  - Switches status from deactivated (bit 2) back to active (bit 1)
  - Calls `AdjustEntityCollision` with height -2048 to lower the collision floor back (block no longer blocking the old sector)
  - Snaps X and Z positions to the centre of the current 1024-unit sector grid cell (clears lower 10 bits, adds 512)

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
// Log when a moving block changes state
mod.hook('EntityMovingBlock')
    .onEnter(function(entityId) {
        const entities = game.readVar(game.module, 'Entities');
        const entity = entities.add(entityId * ENTITY_SIZE);
        this._state = entity.add(ENTITY_CURRENT_STATE).readS16();
    })
    .onLeave(function(returnValue, entityId) {
        const entities = game.readVar(game.module, 'Entities');
        const entity = entities.add(entityId * ENTITY_SIZE);
        const newTarget = entity.add(ENTITY_TARGET_STATE).readS16();
        if (this._state !== newTarget) {
            log('Moving block', entityId, 'transitioning to state', newTarget);
        }
    });
```

### Calling from mod code
```javascript
game.callFunction(game.module, 'EntityMovingBlock', blockEntityIndex);
```

## Pseudocode
```
function EntityMovingBlock(entityId):
    entity = entities[entityId]

    // Trigger/timer toggle
    target = (~(entity[ENTITY_FLAGS] >> 14)) & 1
    if ENTITY_FLAGS bits 9–13 all set:
        ...resolve target using ENTITY_TIMER...
    else:
        target = target ^ 1

    if target == 0:
        if entity[ENTITY_CURRENT_STATE] != 1: goto ANIMATE
        entity[ENTITY_TARGET_STATE] = 0
    else:
        if entity[ENTITY_CURRENT_STATE] != 0: goto ANIMATE
        entity[ENTITY_TARGET_STATE] = 1

    // Raise collision floor at block position (block occupies sector)
    AdjustEntityCollision(entity, 2048)

ANIMATE:
    ProcessEntityAnimation(entity)

    // Room transition
    room = entity[ENTITY_ROOM]
    GetSector(entity.x, entity.y, entity.z, &roomOut)
    if roomOut != room:
        changeRoom(entityId, roomOut)

    // Deactivation handling
    if (ENTITY_STATUS & 6) == 4:
        // Switch from deactivated to active
        clear ENTITY_STATUS bit 2
        set ENTITY_STATUS bit 1

        // Lower collision floor (block leaving old position)
        AdjustEntityCollision(entity, -2048)

        // Snap to sector grid centre (1024-unit grid)
        entity.x = (entity.x & ~0x3FF) + 512
        entity.z = (entity.z & ~0x3FF) + 512
```
