# Function: ProcessLaraAnimation

## Description
Lara-specific counterpart to `ProcessEntityAnimation`. Advances Lara's animation by one frame, handling state transitions, animation commands, speed calculation, and XZ movement. Contains additional logic for Lara that doesn't apply to other entities: jump speed overrides, weapon holstering, a special state change condition for a specific animation, and movement based on an adjusted yaw angle rather than entity yaw.

## Notes
- Increments `ENTITY_ANIM_FRAME` by 1 each call
- Has a special state change condition: besides the normal animation state change check, also triggers on a specific Lara animation (anim 0x5C with target state 3) when certain global flags are set — allows state transitions that wouldn't normally fire
- End-of-animation commands:
  - **Position shift** (command 1): applies the shift, then calls an additional Lara-specific handler
  - **Jump setup** (command 2): sets `ENTITY_Y_SPEED` and `ENTITY_XZ_SPEED`, enables gravity — an external override variable can replace the Y speed, allowing other code to modify Lara's jump height
  - **Holster** (command 3): clears `LaraGunType` to 0
- Gravity mode adjusts `ENTITY_XZ_SPEED` based on frame-to-frame acceleration differences, maintaining horizontal momentum during jumps and falls
- XZ movement uses an adjusted yaw angle (a global variable) instead of `ENTITY_YAW`, and is skipped when a specific render flag is set

## Details

| Field     | Value                          |
|-----------|--------------------------------|
| Usage     | `Hook & Call`                  |
| Params    | `pointer`                      |
| Return    | `void`                         |

### Parameters

| #   | Type      | Description                    |
|-----|-----------|--------------------------------|
| 0   | `pointer` | Pointer to Lara's entity       |

## Usage
### Hooking
```javascript
// Monitor Lara's animation state each frame
mod.hook('ProcessLaraAnimation')
    .onEnter(function(laraPtr) {
        const animId = laraPtr.add(ENTITY_ANIM_ID).readS16();
        const frame = laraPtr.add(ENTITY_ANIM_FRAME).readS16();
        log('Lara anim:', animId, 'frame:', frame);
    });
```

### Calling from mod code
```javascript
// Manually advance Lara's animation by one frame
const laraPtr = game.readVar(game.module, 'Lara');
game.callFunction(game.module, 'ProcessLaraAnimation', laraPtr);
```

## Pseudocode
```
function ProcessLaraAnimation(entity):
    entity[ENTITY_ANIM_FRAME] += 1

    anim = animations[entity[ENTITY_ANIM_ID]]

    // Check for state change — normal check plus Lara-specific special case
    shouldCheck = anim has state change entries
                  OR (global flags set AND entity is Lara
                      AND animId == 0x5C AND ENTITY_TARGET_STATE == 3)
    if shouldCheck:
        if stateChangeConditionMet(entity, anim):
            entity[ENTITY_CURRENT_STATE] = anim.state

    // Check if animation has ended
    if entity[ENTITY_ANIM_FRAME] > anim.endFrame:

        // Process end-of-animation commands
        for each command in anim.commands:
            switch command.type:
                case 1 (position shift):
                    applyPositionShift(entity, dx, dy, dz)
                    laraSpecificHandler(entity)
                case 2 (jump/fall setup):
                    entity[ENTITY_Y_SPEED] = command.ySpeed
                    entity[ENTITY_XZ_SPEED] = command.xzSpeed
                    entity[ENTITY_STATUS] |= 0x08  // enable gravity
                    // External override: if jump override is set, use it instead
                    if jumpOverride != 0:
                        entity[ENTITY_Y_SPEED] = jumpOverride
                        jumpOverride = 0
                case 3 (holster weapons):
                    LaraGunType = 0

        // Transition to next animation
        entity[ENTITY_ANIM_ID] = anim.nextAnimId
        entity[ENTITY_ANIM_FRAME] = anim.nextFrame
        nextAnim = animations[entity[ENTITY_ANIM_ID]]
        entity[ENTITY_CURRENT_STATE] = nextAnim.state

    // Process per-frame animation commands
    for each command in currentAnim.commands:
        switch command.type:
            case 5 (sound):
                if entity[ENTITY_ANIM_FRAME] == command.frame:
                    playSound(command.soundId, entity position, 2)
            case 6 (effect):
                if entity[ENTITY_ANIM_FRAME] == command.frame:
                    callEffect(command.effectIndex, entity)

    // Calculate speed and apply movement
    if entity[ENTITY_STATUS] bit 3 is clear:
        // Normal mode — speed from animation data
        speed = anim.baseSpeed + anim.acceleration * frameProgress
        entity[ENTITY_XZ_SPEED] = speed >> 16
    else:
        // Gravity mode — adjust XZ speed by acceleration delta
        prevFrameSpeed = anim.baseSpeed + anim.acceleration * (frameProgress - 1)
        entity[ENTITY_XZ_SPEED] -= prevFrameSpeed >> 16
        thisFrameSpeed = prevFrameSpeed + anim.acceleration
        entity[ENTITY_XZ_SPEED] += thisFrameSpeed >> 16
        speed = entity[ENTITY_XZ_SPEED]

        // Apply gravity to Y
        if entity[ENTITY_Y_SPEED] < 128:
            entity[ENTITY_Y_SPEED] += 6
        else:
            entity[ENTITY_Y_SPEED] += 1
        entity[ENTITY_Y] += entity[ENTITY_Y_SPEED]

    // Move along adjusted yaw direction (skipped if render flag set)
    if not renderFlagSet:
        entity[ENTITY_X] += sin(adjustedYaw) * speed >> 14
        entity[ENTITY_Z] += cos(adjustedYaw) * speed >> 14
```
