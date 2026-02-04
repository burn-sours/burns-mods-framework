# Function: EntityWolf

## Description
AI behaviour for the wolf enemy. Runs each frame to drive the wolf's state machine — sleep, prowl, stalk, run, attack, howl, and death. The wolf has two attack types: a bite and a pounce, with damage scaled up on New Game Plus.

## Notes
- Only called by the game loop for entities on the active processing list (`ENTITY_STATUS` bit 0 set)
- Called with the entity's index into the entity array, not a pointer
- On first activation (status bits indicate pending): attempts AI activation, returns if it fails
- When health drops to zero: if currently biting and Lara is in gravity mode, triggers a sound; picks a random death animation and enters death state (11)
- Uses `SenseLara` to gather tracking data (distance, facing, zone reachability)
- Head tracks toward Lara via `ENTITY_PITCH`, clamped per frame
- Behaviour turn rate varies by state: slower when prowling, faster when running

### States

| State | Name       | Description                                                    |
|-------|------------|----------------------------------------------------------------|
| 1     | Idle       | Standing alert; transitions to prowl or uses queued state      |
| 2     | Prowl      | Slow patrol; random chance to idle, goes to stalk if aggressive |
| 3     | Run        | Fast pursuit; attacks if close, stalks if medium range         |
| 5     | Stalk      | Cautious approach; pounces if very close, runs if far          |
| 6     | Bite       | Close-range bite attack; deals damage on contact               |
| 8     | Howl       | Alert/howl; transitions to idle based on mood                  |
| 9     | Transition | Decision state; routes to next behaviour based on mood/distance |
| 11    | Death      | Random death animation, no further AI processing               |
| 12    | Pounce     | Lunging attack; stronger damage than bite                      |

### Damage

| Attack | Normal | New Game Plus |
|--------|--------|---------------|
| Bite   | -50    | -80           |
| Pounce | -100   | -200          |

- Both attacks require contact (specific body-part touch mask) and set bit 4 of Lara's `ENTITY_STATUS`

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
// Make wolves deal no damage
mod.hook('EntityWolf')
    .onEnter(function(entityId) {
        const laraPtr = game.readVar(game.module, 'Lara');
        this._healthBefore = laraPtr.add(ENTITY_HEALTH).readS16();
    })
    .onLeave(function(returnValue, entityId) {
        const laraPtr = game.readVar(game.module, 'Lara');
        laraPtr.add(ENTITY_HEALTH).writeS16(this._healthBefore);
    });
```

### Calling from mod code
```javascript
// Manually tick a wolf's AI
game.callFunction(game.module, 'EntityWolf', wolfEntityIndex);
```

## Pseudocode
```
function EntityWolf(entityId):
    entity = entities[entityId]

    // Activation check
    if entity[ENTITY_STATUS] activation bits pending:
        if not activateAI(entityId): return
        clear pending bits

    behaviour = entity[ENTITY_BEHAVIOUR]
    turnDelta = 0
    headTilt = 0
    headYaw = 0

    // Death
    if entity[ENTITY_HEALTH] <= 0:
        if currentState == 6 (bite) AND Lara in gravity mode:
            play sound
        if currentState != 11 (death):
            pick random death animation
            set currentState = 11
        skip to movement

    // AI sensing
    trackData = SenseLara(entity)
    headYaw = trackData.turnAngle if facing Lara
    UpdateEnemyMood(entity, trackData)
    turnDelta = turnToward(entity, behaviour.targetYaw)

    switch entity[ENTITY_CURRENT_STATE]:
        case 1 (idle):
            targetState = queued or 2 (prowl)

        case 2 (prowl):
            behaviour.targetYaw = PROWL_TURN_RATE
            if mood passive: random chance → idle
            if mood aggressive: targetState = 5 (stalk)

        case 3 (run):
            behaviour.targetYaw = RUN_TURN_RATE
            headTilt = turnDelta
            if close + facing: targetState = 6 (bite)
            elif close + not facing: targetState = 9, queued = 5 (stalk)
            elif far + aggressive: random → queued 7 + target 9
            elif mood passive: targetState = 9

        case 5 (stalk):
            behaviour.targetYaw = PROWL_TURN_RATE
            if mood escape: targetState = 3 (run)
            if very close + facing: targetState = 12 (pounce)
            if medium range + aggressive: random → target 9 + queued 7
            else: targetState = 3 (run)

        case 6 (bite):
            headTilt = 3
            headYaw = turnDelta
            if contact detected (touch bits & WOLF_TOUCH_MASK):
                GetBonePosition(entity, pos, boneIndex), apply damage to Lara
                damage = -50 (or -80 on NG+)
                set Lara ENTITY_STATUS bit 4
                queue state 3 (run)

        case 8 (howl):
            if not escaping:
                if zones don't match: random → idle + queued 2
                else: idle + queued 9
            if escaping: idle + queued 9

        case 9 (transition):
            use queued state, or:
            escape → 3, close+facing → 12, aggressive → 5, passive → 1

        case 12 (pounce):
            if contact + facing:
                GetBonePosition(entity, pos, boneIndex), apply damage
                damage = -100 (or -200 on NG+)
                set Lara ENTITY_STATUS bit 4
                queue state 9

    // Movement
    adjust ENTITY_PITCH toward headTilt * 4 (with per-frame limits)
    adjust behaviour yaw toward headYaw (with per-frame and total rotation limits)
    ProcessEntityMovement(entityId, turnDelta, headTilt)
```
