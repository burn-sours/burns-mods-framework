# Function: ProcessEntityAnimation

## Description
Advances an entity's animation by one frame, handling state transitions, animation commands (sounds, effects, position shifts), speed calculation, and XZ movement. This is the core animation tick for all entities — called each game frame to drive their animation state machine and movement.

## Notes
- Increments `ENTITY_ANIM_FRAME` by 1 each call, clears bit 4 of `ENTITY_STATUS`
- Checks for state changes mid-animation — if a state change condition is met, updates `ENTITY_CURRENT_STATE` and clears `ENTITY_QUEUED_STATE` if it matches the new state
- When the animation frame exceeds the animation's end frame, processes end-of-animation commands and transitions to the linked next animation, resetting the frame counter and updating `ENTITY_CURRENT_STATE` and `ENTITY_TARGET_STATE` to the new animation's state
- Processes per-frame animation commands each tick:
  - **Sound commands**: play a sound effect at the entity's position on a specific frame, with the room's water flag determining reverb
  - **Effect commands**: call an effect function on a specific frame (from an engine function pointer table)
- Two movement modes controlled by bit 3 of `ENTITY_STATUS`:
  - **Normal**: `ENTITY_XZ_SPEED` is calculated from the animation's base speed plus acceleration scaled by frame progress
  - **Gravity**: `ENTITY_Y_SPEED` increases each frame (by 6 if below 128, by 1 otherwise) and is added to `ENTITY_Y`
- XZ position is updated each frame by converting `ENTITY_XZ_SPEED` into X and Z deltas using sin/cos of `ENTITY_YAW`
- End-of-animation commands also include position shift (applied via a helper function) and jump setup (sets `ENTITY_Y_SPEED` and `ENTITY_XZ_SPEED`, enables gravity mode)

## Details

| Field     | Value                          |
|-----------|--------------------------------|
| Usage     | `Hook & Call`                  |
| Params    | `pointer`                      |
| Return    | `void`                         |

### Parameters

| #   | Type      | Description                    |
|-----|-----------|--------------------------------|
| 0   | `pointer` | Pointer to the entity          |

## Usage
### Hooking
```javascript
// Monitor animation transitions for all entities
mod.hook('ProcessEntityAnimation')
    .onEnter(function(entityPtr) {
        const animBefore = entityPtr.add(ENTITY_ANIM_ID).readS16();
        this._animBefore = animBefore;
    })
    .onLeave(function(returnValue, entityPtr) {
        const animAfter = entityPtr.add(ENTITY_ANIM_ID).readS16();
        if (animAfter !== this._animBefore) {
            log('Animation changed:', this._animBefore, '->', animAfter);
        }
    });
```

### Calling from mod code
```javascript
// Manually advance an entity's animation by one frame
const entities = game.readVar(game.module, 'Entities');
const entityPtr = entities.add(entityIndex * ENTITY_SIZE);
game.callFunction(game.module, 'ProcessEntityAnimation', entityPtr);
```

## Pseudocode
```
function ProcessEntityAnimation(entity):
    // Reset per-frame state
    entity.unknown_0x08 = 0
    entity[ENTITY_STATUS] &= ~0x10       // clear bit 4
    entity[ENTITY_ANIM_FRAME] += 1

    anim = animations[entity[ENTITY_ANIM_ID]]

    // Check for mid-animation state change
    if anim has state change entries:
        if stateChangeConditionMet(entity, anim):
            entity[ENTITY_CURRENT_STATE] = anim.state
            if entity[ENTITY_QUEUED_STATE] == anim.state:
                entity[ENTITY_QUEUED_STATE] = 0

    // Check if animation has ended
    if entity[ENTITY_ANIM_FRAME] > anim.endFrame:

        // Process end-of-animation commands
        for each command in anim.commands:
            switch command.type:
                case 1 (position shift):
                    applyPositionShift(entity, dx, dy, dz)
                case 2 (jump/fall setup):
                    entity[ENTITY_Y_SPEED] = command.ySpeed
                    entity[ENTITY_XZ_SPEED] = command.xzSpeed
                    entity[ENTITY_STATUS] |= 0x08  // enable gravity
                case 4 (landing):
                    entity[ENTITY_STATUS] &= ~0x02
                    entity[ENTITY_STATUS] |= 0x04

        // Transition to next animation
        entity[ENTITY_ANIM_ID] = anim.nextAnimId
        entity[ENTITY_ANIM_FRAME] = anim.nextFrame
        nextAnim = animations[entity[ENTITY_ANIM_ID]]
        entity[ENTITY_CURRENT_STATE] = nextAnim.state
        entity[ENTITY_TARGET_STATE] = nextAnim.state
        if entity[ENTITY_QUEUED_STATE] == nextAnim.state:
            entity[ENTITY_QUEUED_STATE] = 0

    // Process per-frame animation commands
    for each command in currentAnim.commands:
        switch command.type:
            case 5 (sound):
                if entity[ENTITY_ANIM_FRAME] == command.frame:
                    playSound(command.soundId, entity position, room water flag)
            case 6 (effect):
                if entity[ENTITY_ANIM_FRAME] == command.frame:
                    callEffect(command.effectIndex, entity)

    // Calculate speed and apply movement
    if entity[ENTITY_STATUS] bit 3 is clear:
        // Normal mode — speed from animation data
        speed = anim.baseSpeed + anim.acceleration * frameProgress
        entity[ENTITY_XZ_SPEED] = speed >> 16
    else:
        // Gravity mode — accelerate downward
        if entity[ENTITY_Y_SPEED] < 128:
            entity[ENTITY_Y_SPEED] += 6
        else:
            entity[ENTITY_Y_SPEED] += 1
        entity[ENTITY_Y] += entity[ENTITY_Y_SPEED]

    // Move entity along its facing direction
    entity[ENTITY_X] += sin(entity[ENTITY_YAW]) * entity[ENTITY_XZ_SPEED] >> 14
    entity[ENTITY_Z] += cos(entity[ENTITY_YAW]) * entity[ENTITY_XZ_SPEED] >> 14
```
