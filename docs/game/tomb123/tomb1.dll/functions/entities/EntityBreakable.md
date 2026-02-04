# Function: EntityBreakable

## Description
Behaviour for crumbling/breakable platforms. Waits for Lara to stand on top, then transitions through a crumble → fall → land sequence. Enables gravity during the fall and snaps to the floor on landing. Removes itself from the active processing list when deactivated. For a specific breakable model, tracks destruction per level for achievement stats.

## Notes
- Only called by the game loop for entities on the active processing list (`ENTITY_STATUS` bit 0 set)
- Called with the entity's index into the entity array, not a pointer
- **Trigger condition**: Lara's Y must exactly equal the entity's Y minus 512 — meaning Lara is standing directly on top of the platform
- If Lara is not on the platform during state 0, the entity clears its status flags and removes itself from the active processing list
- Uses `ProcessEntityAnimation` (not `ProcessEntityMovement`) — no AI movement, purely animation-driven
- Handles room transitions via `GetSector` during the fall
- Updates the entity's stored floor value each frame using `CalculateFloorHeight`
- **Landing**: when falling (state 2) and floor height ≤ entity Y, snaps to floor, clears gravity, clears fall speed, transitions to landed state
- **Achievement tracking**: for one specific breakable model, on specific levels (1, 2, 4, 5, 7, 8, 9, 13, 15), increments a per-level destruction counter and updates achievement stats when the entity reaches the landed state at a specific animation frame

### States

| State | Name      | Description                                                    |
|-------|-----------|----------------------------------------------------------------|
| 0     | Idle      | Waits for Lara to stand on top; deactivates if she's not there |
| 1     | Crumbling | Transitional — immediately targets state 2                     |
| 2     | Falling   | Gravity enabled; falls until reaching the floor                |
| 3     | Landed    | Final resting state on the floor                               |

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
// Log when a breakable platform is triggered
mod.hook('EntityBreakable')
    .onEnter(function(entityId) {
        const entities = game.readVar(game.module, 'Entities');
        const entity = entities.add(entityId * ENTITY_SIZE);
        this._state = entity.add(ENTITY_CURRENT_STATE).readS16();
    })
    .onLeave(function(returnValue, entityId) {
        const entities = game.readVar(game.module, 'Entities');
        const entity = entities.add(entityId * ENTITY_SIZE);
        const newState = entity.add(ENTITY_CURRENT_STATE).readS16();
        if (this._state === 0 && newState === 1) {
            log('Breakable platform', entityId, 'triggered!');
        }
    });
```

### Calling from mod code
```javascript
game.callFunction(game.module, 'EntityBreakable', breakableEntityIndex);
```

## Pseudocode
```
function EntityBreakable(entityId):
    entity = entities[entityId]

    switch entity[ENTITY_CURRENT_STATE]:
        case 0 (idle):
            if Lara.y != entity.y - 512:
                // Lara not on platform — deactivate
                clear entity status flags
                removeFromProcessingList(entityId)
                return
            entity[ENTITY_TARGET_STATE] = 1  // start crumbling

        case 1 (crumbling):
            entity[ENTITY_TARGET_STATE] = 2  // start falling

        case 2 (falling):
            if entity[ENTITY_TARGET_STATE] != 3:
                enable gravity flag

    ProcessEntityAnimation(entity)

    // Check if entity was deactivated
    if entity deactivated:
        removeFromProcessingList(entityId)
        return

    // Room transition
    sector = GetSector(entity.x, entity.y, entity.z, &roomOut)
    if roomOut != entity.room:
        changeRoom(entityId, roomOut)

    // Update floor tracking
    entity.previousFloor = entity.floor
    entity.floor = CalculateFloorHeight(sector, entity.x, entity.y, entity.z)

    // Landing check
    if entity[ENTITY_CURRENT_STATE] == 2 AND entity.floor <= entity.y:
        entity.y = entity.floor
        entity.fallSpeed = 0
        clear gravity flag
        entity[ENTITY_TARGET_STATE] = 3  // landed

    // Achievement tracking (specific model + levels only)
    if entity is tracked breakable model AND landed AND at final frame:
        increment per-level destruction counter
        updateAchievementStats()
```
