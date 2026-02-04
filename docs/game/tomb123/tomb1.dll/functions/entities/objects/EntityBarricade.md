# Function: EntityBarricade

## Description
Controls barricade objects that toggle between two states based on trigger activation and an optional timer delay. Reads the entity's activation flag to determine a default state, then checks the trigger count and timer to decide whether to flip it. Processes animation and handles room transitions.

## Notes
- Only called by the game loop for entities on the active processing list (`ENTITY_STATUS` bit 0 set)
- Called with the entity's index into the entity array, not a pointer
- **Two-state toggle**: the barricade's target state is either 0 or 1, driven by flag and timer logic
- **Default state**: derived from bit 14 of `ENTITY_FLAGS` — if bit 14 is set, default target is 0; if clear, default target is 1
- **Trigger count check**: bits 9–13 of `ENTITY_FLAGS` form a 5-bit activation count (max 31). The timer system only activates when this count is at maximum (all 5 bits set)
- **Timer behaviour** (when trigger count is maxed):
  - Timer > 0: counts down by 1 each frame, no state change yet
  - Timer reaches 0: immediately set to -1 (signals countdown complete)
  - Timer == -1: flips target from default (permanent toggle)
  - Timer == 0 (no countdown set): keeps default target
- **Without max trigger count**: always flips target from default
- Uses `ProcessEntityAnimation` (not `ProcessEntityMovement`) — no AI movement, purely animation-driven
- Handles room transitions via `GetSector` each frame

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
// Log when a barricade toggles state
mod.hook('EntityBarricade')
    .onEnter(function(entityId) {
        const entities = game.readVar(game.module, 'Entities');
        const entity = entities.add(entityId * ENTITY_SIZE);
        this._target = entity.add(ENTITY_TARGET_STATE).readU16();
    })
    .onLeave(function(returnValue, entityId) {
        const entities = game.readVar(game.module, 'Entities');
        const entity = entities.add(entityId * ENTITY_SIZE);
        const newTarget = entity.add(ENTITY_TARGET_STATE).readU16();
        if (this._target !== newTarget) {
            log('Barricade', entityId, 'toggled to state', newTarget);
        }
    });
```

### Calling from mod code
```javascript
game.callFunction(game.module, 'EntityBarricade', barricadeEntityIndex);
```

## Pseudocode
```
function EntityBarricade(entityId):
    entity = entities[entityId]
    flags = entity[ENTITY_FLAGS]

    // Default target: inverted bit 14 of flags
    target = (~(flags >> 14)) & 1

    if flags bits 9–13 are all set:
        // Trigger count at maximum — use timer system
        timer = entity[ENTITY_TIMER]

        if timer != 0:
            if timer == -1:
                // Countdown complete — flip target permanently
                target = target ^ 1
            else:
                // Counting down
                timer = timer - 1
                entity[ENTITY_TIMER] = timer
                if timer == 0:
                    entity[ENTITY_TIMER] = -1  // signal completion
    else:
        // Trigger count not maxed — flip target
        target = target ^ 1

    entity[ENTITY_TARGET_STATE] = target

    ProcessEntityAnimation(entity)

    // Room transition
    room = entity[ENTITY_ROOM]
    sector = GetSector(entity.x, entity.y, entity.z, &roomOut)
    if roomOut != room:
        changeRoom(entityId, roomOut)
```
