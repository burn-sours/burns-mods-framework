# Function: EntityCrocodileWet

## Description
AI behaviour for the water crocodile. Swims underwater with multiple movement states, pursuing and biting Lara. Has a dedicated fast-turn state for when Lara is behind it. Checks the current room's environment flag to determine if the room has become dry — if so, transitions to a land-based animation and AI configuration. Bite damage matches the land crocodile.

## Notes
- Only called by the game loop for entities on the active processing list (`ENTITY_STATUS` bit 0 set)
- Called with the entity's index into the entity array, not a pointer
- On death: enters state 7 (death animation). On level 0x10, if the entity index is in range 0x6F–0x74, sets a tracking flag — likely related to a level-specific event
- In state 4 (fast turn), bypasses `TurnTo` and directly increments the entity's neck/head angle by 0x444 per frame to spin toward Lara quickly
- Touch bitmask for swim contact: 0x3FC
- Bite (state 5) uses bone position to create a hit effect at the head, same as the land variant
- Head yaw tracking via AI data joint (clamped ±0x38E per frame, ±0x4000 total)
- `UpdateEnemyMood` called with aggressive flag set
- At the end of each frame, checks a room environment flag (room structure byte at offset 0x66, bit 0). If set, the room has become non-water — transitions to a land animation set and modifies AI zone data. If not set, continues normal underwater movement via `ProcessEntityMovement`
- Falls back to `ProcessEntityAnimation` only if AI data pointer is null

### States

| State | Name      | Description                                                                |
|-------|-----------|----------------------------------------------------------------------------|
| 1     | Idle      | Decision state; routes to bite, swim, fast turn, or swim fast based on mood |
| 2     | Swim      | Standard swimming pursuit; re-evaluates based on mood and contact           |
| 3     | Swim fast | Faster pursuit/stalking swim; transitions on mood change or contact         |
| 4     | Fast turn | Direct rotation (+0x444/frame) to face Lara; transitions to swim fast when facing |
| 5     | Bite      | Attack state; damages Lara via head bone position                          |
| 7     | Death     | Death animation; may set level-specific tracking flag                      |

### State Transitions

**State 1 (idle):**
- Close + facing (distance < 0x2E329) → 5 (bite)
- Escape mood → 2 (swim)
- Attack mood + angle within ±0x4000 or close → 2 (swim)
- Attack mood + far + angle outside ±0x4000 → 4 (fast turn)
- Stalk mood → 3 (swim fast)

**State 2 (swim):**
- Facing + contact (0x3FC) → 1 (idle)
- Stalk mood → 3 (swim fast)
- Bored mood → 1 (idle)
- Attack mood + far + not facing → 1 (idle)

**State 3 (swim fast):**
- Facing + contact (0x3FC) → 1 (idle)
- Attack or escape mood → 2 (swim)
- Bored mood → 1 (idle)

**State 4 (fast turn):**
- Angle within ±0x3FFF (roughly facing) → 3 (swim fast)

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
| Normal (TurnTo)   | 0x222 |
| Fast turn (direct) | 0x444 |

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
            set death animation (base + 0xB)
            set state = 7
            if levelId == 0x10 and entityId in range [0x6F, 0x74]:
                set level tracking flag
        skip to movement

    // --- Alive ---
    SenseLara(entity, trackData)
    headYaw = trackData.turnAngle if facing
    UpdateEnemyMood(entity, trackData, aggressive=true)

    if currentState == 4 (fast turn):
        entity neck angle += 0x444  // direct rotation
    else:
        turnDelta = TurnTo(entity, 0x222)

    switch entity[ENTITY_CURRENT_STATE]:
        case 1 (idle):
            if close + facing (distance < 0x2E329):
                targetState = 5 (bite)
            elif mood == escape:
                targetState = 2 (swim)
            elif mood == attack:
                if angle within ±0x4000 or close (< 0x900001):
                    targetState = 2 (swim)
                else:
                    targetState = 4 (fast turn)
            elif mood == stalk:
                targetState = 3 (swim fast)

        case 2 (swim):
            if facing and contact (0x3FC):
                targetState = 1 (idle)
            elif mood == stalk:
                targetState = 3 (swim fast)
            elif mood == bored or (attack + far + not facing):
                targetState = 1 (idle)

        case 3 (swim fast):
            if facing and contact (0x3FC):
                targetState = 1 (idle)
            elif mood == attack or escape:
                targetState = 2 (swim)
            elif mood == bored:
                targetState = 1 (idle)

        case 4 (fast turn):
            if angle within ±0x3FFF (roughly facing):
                targetState = 3 (swim fast)

        case 5 (bite):
            if bite not yet delivered:
                get bone position (head)
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
        adjust joint toward headYaw (±0x38E per frame, clamped ±0x4000)

    // Room environment check
    roomFlags = rooms[entity room].byte_0x66
    if roomFlags bit 0 is set:
        // Room became non-water — transition to land mode
        set speed = 0xB
        set land animation (base from dry croc set)
        set state from animation
        update AI zone data for land mode
        ProcessEntityMovement(entityId, turnDelta, 0)
    else:
        // Still underwater — normal swim movement
        ProcessEntityMovement(entityId, turnDelta, 0)
```
