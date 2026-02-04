# Function: EntityCrocodileWet

## Description
AI behaviour for the water crocodile. Swims underwater with multiple movement states, pursuing and biting Lara. Has a dedicated fast-turn state for when Lara is behind it. Checks the current room's environment flag to determine if the room has become dry — if so, transitions to a land-based animation and AI configuration. Bite damage matches the land crocodile.

## Notes
- Only called by the game loop for entities on the active processing list (`ENTITY_STATUS` bit 0 set)
- Called with the entity's index into the entity array, not a pointer
- On death: enters state 7 (death animation). On a specific level, if the entity index is within specific entity indices for that level, sets a tracking flag — likely related to a level-specific event
- In state 4 (fast turn), bypasses `TurnTo` and directly increments the entity's neck/head angle at a fast rate per frame to spin toward Lara quickly
- Touch bitmask for swim contact: specific body-part touch mask
- Bite (state 5) uses `GetBonePosition` to create a hit effect at the head, same as the land variant
- Head yaw tracking via AI data joint (with per-frame and total rotation limits)
- `UpdateEnemyMood` called with aggressive flag set
- At the end of each frame, checks a room environment flag (water bit). If set, the room has become non-water — transitions to a land animation set and modifies AI zone data. If not set, continues normal underwater movement via `ProcessEntityMovement`
- Falls back to `ProcessEntityAnimation` only if AI data pointer is null

### States

| State | Name      | Description                                                                |
|-------|-----------|----------------------------------------------------------------------------|
| 1     | Idle      | Decision state; routes to bite, swim, fast turn, or swim fast based on mood |
| 2     | Swim      | Standard swimming pursuit; re-evaluates based on mood and contact           |
| 3     | Swim fast | Faster pursuit/stalking swim; transitions on mood change or contact         |
| 4     | Fast turn | Direct fast rotation to face Lara; transitions to swim fast when facing |
| 5     | Bite      | Attack state; damages Lara via `GetBonePosition` head lookup               |
| 7     | Death     | Death animation; may set level-specific tracking flag                      |

### State Transitions

**State 1 (idle):**
- Close + facing → 5 (bite)
- Escape mood → 2 (swim)
- Attack mood + roughly facing or close → 2 (swim)
- Attack mood + far + not facing → 4 (fast turn)
- Stalk mood → 3 (swim fast)

**State 2 (swim):**
- Facing + contact detected → 1 (idle)
- Stalk mood → 3 (swim fast)
- Bored mood → 1 (idle)
- Attack mood + far + not facing → 1 (idle)

**State 3 (swim fast):**
- Facing + contact detected → 1 (idle)
- Attack or escape mood → 2 (swim)
- Bored mood → 1 (idle)

**State 4 (fast turn):**
- Roughly facing Lara → 3 (swim fast)

### Damage

**Bite (state 5):**

| Condition              | Damage |
|------------------------|--------|
| Normal                 | -100   |
| New Game Plus (hard)   | -180   |

- Sets bit 4 of Lara's `ENTITY_STATUS`
- Bite only triggers once per contact engagement (tracked via queued state, reset on state transition)
- If Lara dies from the bite under certain game version conditions, sets a tracking flag

### Turn Rates

| Context           | Rate  |
|-------------------|-------|
| Normal (TurnTo)    | medium |
| Fast turn (direct) | fast   |

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
// Log water croc swim state changes
mod.hook('EntityCrocodileWet')
    .onEnter(function(entityId) {
        const entities = game.readVar(game.module, 'Entities');
        const entity = entities.add(entityId * ENTITY_SIZE);
        this._state = entity.add(ENTITY_CURRENT_STATE).readS16();
    })
    .onLeave(function(returnValue, entityId) {
        const entities = game.readVar(game.module, 'Entities');
        const entity = entities.add(entityId * ENTITY_SIZE);
        const newState = entity.add(ENTITY_CURRENT_STATE).readS16();
        if (newState !== this._state) {
            log('Water croc', entityId, 'state:', this._state, '->', newState);
        }
    });
```

### Calling from mod code
```javascript
game.callFunction(game.module, 'EntityCrocodileWet', crocEntityIndex);
```

## Pseudocode
```
function EntityCrocodileWet(entityId):
    entity = entities[entityId]

    // Activation check
    if entity[ENTITY_STATUS] activation bits pending:
        if not activateAI(entityId): return
        clear pending bits

    aiData = entity[AI_DATA_POINTER]
    turnDelta = 0
    headYaw = 0

    // --- Dead ---
    if entity[ENTITY_HEALTH] <= 0:
        if currentState != 7:
            set death animation
            set state = 7
            if on a specific level and entityId within expected entity indices:
                set level tracking flag
        skip to movement

    // --- Alive ---
    SenseLara(entity, trackData)
    headYaw = trackData.turnAngle if facing
    UpdateEnemyMood(entity, trackData, aggressive=true)

    if currentState == 4 (fast turn):
        entity neck angle += FAST_TURN_RATE  // direct rotation
    else:
        turnDelta = TurnTo(entity, NORMAL_TURN_RATE)

    switch entity[ENTITY_CURRENT_STATE]:
        case 1 (idle):
            if close + facing:
                targetState = 5 (bite)
            elif mood == escape:
                targetState = 2 (swim)
            elif mood == attack:
                if roughly facing or close:
                    targetState = 2 (swim)
                else:
                    targetState = 4 (fast turn)
            elif mood == stalk:
                targetState = 3 (swim fast)

        case 2 (swim):
            if facing and contact detected:
                targetState = 1 (idle)
            elif mood == stalk:
                targetState = 3 (swim fast)
            elif mood == bored or (attack + far + not facing):
                targetState = 1 (idle)

        case 3 (swim fast):
            if facing and contact detected:
                targetState = 1 (idle)
            elif mood == attack or escape:
                targetState = 2 (swim)
            elif mood == bored:
                targetState = 1 (idle)

        case 4 (fast turn):
            if roughly facing Lara:
                targetState = 3 (swim fast)

        case 5 (bite):
            if bite not yet delivered:
                GetBonePosition(entity, pos, boneIndex)
                create damage effect at head position
                if normal or low NG+ difficulty:
                    Lara health -= 100
                else (hard NG+):
                    Lara health -= 180
                set Lara ENTITY_STATUS bit 4
                mark bite delivered
                if Lara dead and specific game version:
                    set death tracking flag

    // Head tracking
    if AI data head joint exists:
        adjust joint toward headYaw (with per-frame and total rotation limits)

    // Room environment check
    roomFlags = rooms[entity room].environmentFlags
    if room is non-water:
        // Room became non-water — transition to land mode
        set speed to land movement value
        set land animation (base from dry croc set)
        set state from animation
        update AI zone data for land mode
        ProcessEntityMovement(entityId, turnDelta, 0)
    else:
        // Still underwater — normal swim movement
        ProcessEntityMovement(entityId, turnDelta, 0)
```
