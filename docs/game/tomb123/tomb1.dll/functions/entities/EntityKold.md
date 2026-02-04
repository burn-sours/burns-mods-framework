# Function: EntityKold

## Description
AI behaviour for Kold — a powerful single-weapon ranged enemy. Structurally similar to the Cowboy but significantly more dangerous: aggressive AI mood, a single high-damage shot with halved distance for improved accuracy, and a longer engagement range. The hardest-hitting single shot of any human gunman. Drops items on death and may trigger a level-specific game event.

## Notes
- Only called by the game loop for entities on the active processing list (`ENTITY_STATUS` bit 0 set)
- Called with the entity's index into the entity array, not a pointer
- `UpdateEnemyMood` called with **aggressive flag (1)** — unlike Larson/Pierre/Cowboy/SkaterBoy who all use passive (0)
- Turn rate is **dynamic**: stored in an AI data field, updated per state (0x222 for walk, 0x444 for run). `TurnTo` reads this value each frame
- Always checks visibility and updates combat state every frame while alive
- **Single weapon**: only one `ShootLara` call per shot — no dual-weapon flag
- **Distance halved** for `ShootLara` — passes `distance / 2` instead of raw distance, effectively improving accuracy at range
- **Shot counter** in AI data: reset to 0 when entering aim state (4), set to 1 after firing in shoot state (6). Only fires when counter is 0
- **Longer engagement range**: walk/run distance thresholds are 0x1000001/0x1000000 (vs 0x900001/0x900000 for Cowboy/Larson)
- On death: calls `DropEnemyItems` to drop carried items, then sets death animation (state 5)
- On death (normal/easy NG+ only): triggers a game event with params (13, 100)
- **Torso tracking** via `ENTITY_PITCH`: in run state, torso tilts at half the turn delta. Clamped ±0x222 per frame
- Head yaw tracking via AI data joint (clamped ±0x38E per frame, ±0x4000 total)
- After shooting, if mood is escape: queues run (3)

### States

| State | Name   | Description                                                              |
|-------|--------|--------------------------------------------------------------------------|
| 1     | Idle   | Hub state; routes to walk, run, or aim based on visibility and mood      |
| 2     | Walk   | Slow patrol (turn rate 0x222); longer range threshold than other gunmen  |
| 3     | Run    | Fast pursuit (turn rate 0x444); torso tilts into turns                   |
| 4     | Aim    | Resets shot counter; checks visibility to decide shoot or disengage      |
| 5     | Death  | Death animation; drops carried items                                     |
| 6     | Shoot  | Single powerful shot with halved distance for accuracy                   |

### State Transitions

**State 1 (idle):**
- If queued state set → use queued state
- Can see Lara → 4 (aim)
- Bored mood → 2 (walk)
- Otherwise → 3 (run)

**State 2 (walk):**
- Sets turn rate to 0x222
- If not escaping AND facing Lara:
  - Can see Lara → 1 (idle) + queue 4 (aim)
  - Close (< 0x1000001) → stay walking
- Otherwise → 1 (idle) + queue 3 (run)

**State 3 (run):**
- Sets turn rate to 0x444, torso tilt = turnDelta / 2
- If not escaping OR facing Lara:
  - Can see Lara → 1 (idle) + queue 4 (aim)
  - Facing + close (< 0x1000000) → 1 (idle) + queue 2 (walk)

**State 4 (aim):**
- Resets shot counter to 0
- If no queued state AND can see Lara → 6 (shoot)
- Otherwise → 1 (idle)

**State 6 (shoot):**
- If shot counter == 0 AND can see Lara: fire single shot with halved distance, set counter = 1
- If escape mood → queue 3 (run)

### Damage

**Shoot (state 6):**

| Condition              | Damage |
|------------------------|--------|
| Normal                 | -150   |
| New Game Plus (hard)   | -250   |

- Sets bit 4 of Lara's `ENTITY_STATUS`
- Distance halved for ShootLara accuracy calculation
- If Lara dies from the shot under specific NG+ conditions, sets a tracking flag (0x80000000)

### Turn Rates

| Context | Rate  |
|---------|-------|
| Walking | 0x222 |
| Running | 0x444 |

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
// Log Kold's devastating shots
mod.hook('EntityKold')
    .onEnter(function(entityId) {
        const entities = game.readVar(game.module, 'Entities');
        const entity = entities.add(entityId * ENTITY_SIZE);
        this._state = entity.add(ENTITY_CURRENT_STATE).readS16();
    })
    .onLeave(function(returnValue, entityId) {
        const entities = game.readVar(game.module, 'Entities');
        const entity = entities.add(entityId * ENTITY_SIZE);
        const newState = entity.add(ENTITY_CURRENT_STATE).readS16();
        if (this._state === 4 && newState === 6) {
            log('Kold entering shoot state — brace for impact');
        }
    });
```

### Calling from mod code
```javascript
game.callFunction(game.module, 'EntityKold', koldEntityIndex);
```

## Pseudocode
```
function EntityKold(entityId):
    entity = entities[entityId]
    globalCombatValue = readGlobalValue()

    // Activation check
    if entity[ENTITY_STATUS] activation bits pending:
        if not activateAI(entityId): return
        clear pending bits

    aiData = entity[AI_DATA_POINTER]
    torsoPitch = 0
    headYaw = 0
    turnDelta = 0

    // --- Dead ---
    if entity[ENTITY_HEALTH] <= 0:
        updateCombatState(entity, 0, 0, 0, globalCombatValue)

        if currentState != 5 (death):
            set death animation
            set state = 5
            DropEnemyItems(entity)
            if normal/easy NG+:
                triggerGameEvent(13, 100)
        skip to torso/head tracking + movement

    // --- Alive ---
    SenseLara(entity, trackData)
    health = entity[ENTITY_HEALTH]

    canTarget = checkTargetVisibility(entity, trackData)
    updateCombatState(entity, canTarget, health, 0, globalCombatValue)

    headYaw = trackData.turnAngle if facing
    UpdateEnemyMood(entity, trackData, aggressive=true)  // flag 1!
    turnDelta = TurnTo(entity, aiData.turnRate)

    switch entity[ENTITY_CURRENT_STATE]:
        case 1 (idle):
            if queued state:
                targetState = queued state
            elif canTarget:
                targetState = 4 (aim)
            elif mood == bored:
                targetState = 2 (walk)
            else:
                targetState = 3 (run)

        case 2 (walk):
            aiData.turnRate = 0x222
            if mood != escape and facing:
                if canTarget:
                    targetState = 1, queue = 4 (aim)
                elif close (< 0x1000001):
                    stay
                else:
                    targetState = 1, queue = 3 (run)
            else:
                targetState = 1, queue = 3 (run)

        case 3 (run):
            aiData.turnRate = 0x444
            torsoPitch = turnDelta / 2
            if mood != escape or facing:
                if canTarget:
                    targetState = 1, queue = 4 (aim)
                elif facing + close (< 0x1000000):
                    targetState = 1, queue = 2 (walk)

        case 4 (aim):
            aiData.shotCounter = 0
            if no queued state and canTarget:
                targetState = 6 (shoot)
            else:
                targetState = 1 (idle)

        case 6 (shoot):
            if shotCounter == 0 and canTarget:
                hit = ShootLara(entity, distance / 2, weaponData, headAngle)
                if hit:
                    if normal/easy NG+: Lara health -= 150
                    else (hard NG+): Lara health -= 250
                    set Lara ENTITY_STATUS bit 4
                    if Lara dead and specific NG+ condition:
                        set tracking flag 0x80000000
                shotCounter = 1

            if mood == escape:
                queue = 3 (run)

    // Torso tracking
    adjust ENTITY_PITCH toward torsoPitch * 4 (clamped ±0x222 per frame)

    // Head tracking
    if AI data head joint exists:
        adjust joint toward headYaw (±0x38E per frame, clamped ±0x4000)

    ProcessEntityMovement(entityId, turnDelta, 0)
```
