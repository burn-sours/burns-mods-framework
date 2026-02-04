# Function: EntitySwitch

## Description
Controls switch/lever objects. Forces the trigger activation count to maximum on every frame, then uses the timer to determine when to toggle the switch's target state. On level 19 in a specific room, plays a sound effect when a tracking condition is met.

## Notes
- Only called by the game loop for entities on the active processing list (`ENTITY_STATUS` bit 0 set)
- Called with the entity's index into the entity array, not a pointer
- **Activation count forced**: unlike other trigger-toggled objects, the switch explicitly sets `ENTITY_FLAGS` bits 9–13 to all 1s every frame — the activation count is always maxed, so the timer path is always used
- **Timer toggle**: same timer logic — countdown, -1 means toggled, 0 means steady state
- **Toggle action** (when target resolves to 0): sets target state 1 and resets `ENTITY_TIMER` to 0
- **Level 19 special**: in room 25, if a tracking condition has not been met, plays sound effect 80 at volume 100
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
// Log when a switch is toggled
mod.hook('EntitySwitch')
    .onEnter(function(entityId) {
        const entities = game.readVar(game.module, 'Entities');
        const entity = entities.add(entityId * ENTITY_SIZE);
        this._target = entity.add(ENTITY_TARGET_STATE).readS16();
    })
    .onLeave(function(returnValue, entityId) {
        const entities = game.readVar(game.module, 'Entities');
        const entity = entities.add(entityId * ENTITY_SIZE);
        const newTarget = entity.add(ENTITY_TARGET_STATE).readS16();
        if (this._target !== newTarget) {
            log('Switch', entityId, 'toggled to state', newTarget);
        }
    });
```

### Calling from mod code
```javascript
game.callFunction(game.module, 'EntitySwitch', switchEntityIndex);
```

## Pseudocode
```
function EntitySwitch(entityId):
    entity = entities[entityId]
    flags = entity[ENTITY_FLAGS]
    timer = entity[ENTITY_TIMER]

    // Force activation count to maximum
    entity[ENTITY_FLAGS] = flags | bits 9–13

    // Derive default target from bit 14
    target = (~(flags >> 14)) & 1

    // Timer toggle (activation count always maxed)
    if timer != 0:
        if timer == -1:
            target = target ^ 1
        else:
            timer = timer - 1
            entity[ENTITY_TIMER] = timer
            if timer == 0:
                entity[ENTITY_TIMER] = -1

    // Toggle action
    if target == 0:
        entity[ENTITY_TARGET_STATE] = 1
        entity[ENTITY_TIMER] = 0  // reset timer

    // Level 19, room 25: play sound if tracking condition not met
    if level == 19 AND entity[ENTITY_ROOM] == 25 AND condition not met:
        playSoundEffect(80, 100)

    ProcessEntityAnimation(entity)
```
