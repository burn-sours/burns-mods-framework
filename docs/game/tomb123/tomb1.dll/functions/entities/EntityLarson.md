# Function: EntityLarson

## Description
AI behaviour for Larson — a recurring human enemy with a ranged pistol attack. Uses `ShootLara` for gunfire with a visibility check determining when to aim and shoot. Navigates with walk and run states using dynamic turn rates stored in AI data. Heavy use of queued state transitions through an idle hub state. Has level-specific logic: boosted combat values on one level, and triggers a game event on death in another.

## Notes
- Only called by the game loop for entities on the active processing list (`ENTITY_STATUS` bit 0 set)
- Called with the entity's index into the entity array, not a pointer
- `UpdateEnemyMood` called with passive flag — cautious behaviour
- Turn rate is **dynamic**: stored in an AI data field, updated per state (slower for walk, faster for run). `TurnTo` reads this value each frame
- Uses a visibility/targeting check to determine if Larson can see Lara — controls aim/shoot vs movement decisions
- A combat state tracking function is called each frame with health values and targeting status — purpose not fully identified
- On death: calls combat tracking function, then sets death animation (state 5)
- On a specific level, entity health and a base combat value are both boosted by 10%
- On another level (on death, normal/easy NG+ only): triggers a level-specific game event
- **Torso tracking** via `ENTITY_PITCH`: in run state, torso tilts at half the turn delta (leans into turns). In other states, torso centers back to zero. Clamped per frame
- Head yaw tracking via AI data joint, clamped per frame with a total rotation limit
- Shoot state uses `ShootLara` — a patch-level function that performs hit detection with projectile data
- After shooting, queues aim state (4) for follow-up shots; if escaping, queues idle (1) instead
- On death under certain conditions, sets a death tracking flag

### States

| State | Name       | Description                                                          |
|-------|------------|----------------------------------------------------------------------|
| 1     | Idle       | Hub state; routes via queued state to walk, run, aim, or idle anim   |
| 2     | Walk       | Slow patrol; mood-based transitions                                  |
| 3     | Run        | Fast pursuit; torso tilts into turns                                 |
| 4     | Aim        | Aiming at Lara; checks visibility to decide shoot or disengage      |
| 5     | Death      | Death animation                                                      |
| 6     | Idle anim  | Standing idle animation; returns to walk or idle based on mood       |
| 7     | Shoot      | Fires at Lara via `ShootLara`; queues aim for follow-up              |

### State Transitions

**State 1 (idle):**
- If queued state set → use queued state
- Bored mood + random chance → 6 (idle anim)
- Bored mood → 2 (walk)
- Escape mood → 3 (run)
- Default → 2 (walk)

**State 2 (walk):**
- Sets slow turn rate
- Bored + random → 1 (idle) + queue 6 (idle anim)
- Can see Lara → 1 (idle) + queue 4 (aim)
- Facing + close → stay walking
- Escape or too far → 1 (idle) + queue 3 (run)

**State 3 (run):**
- Sets fast turn rate, torso tilt = turnDelta / 2
- Bored + random → 1 (idle) + queue 6 (idle anim)
- Can see Lara → 1 (idle) + queue 4 (aim)
- Facing + close → 1 (idle) + queue 2 (walk)

**State 4 (aim):**
- If queued state set → use queued state
- Can see Lara → 7 (shoot)
- Lost sight → 1 (idle)

**State 6 (idle anim):**
- Bored + random → 1 (idle) + queue 2 (walk)
- Not bored → 1 (idle)

**State 7 (shoot):**
- If not yet fired: `ShootLara` → damage on hit, queue 4 (aim)
- If escape mood: queue 1 (idle) — flee instead of re-aiming

### Damage

**Shoot (state 7):**

| Condition              | Damage |
|------------------------|--------|
| Normal                 | -50    |
| New Game Plus (hard)   | -70    |

- Sets bit 4 of Lara's `ENTITY_STATUS`
- Hit detection performed by `ShootLara` using projectile data and distance/angle

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
// Log when Larson shoots at Lara
mod.hook('EntityLarson')
    .onEnter(function(entityId) {
        const entities = game.readVar(game.module, 'Entities');
        const entity = entities.add(entityId * ENTITY_SIZE);
        this._state = entity.add(ENTITY_CURRENT_STATE).readS16();
    })
    .onLeave(function(returnValue, entityId) {
        const entities = game.readVar(game.module, 'Entities');
        const entity = entities.add(entityId * ENTITY_SIZE);
        const newState = entity.add(ENTITY_CURRENT_STATE).readS16();
        if (this._state === 7 && newState !== 7) {
            log('Larson fired at Lara');
        }
    });
```

### Calling from mod code
```javascript
game.callFunction(game.module, 'EntityLarson', larsonEntityIndex);
```

## Pseudocode
```
function EntityLarson(entityId):
    entity = entities[entityId]
    baseCombatValue = readGlobalBaseValue()

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
        bonus = baseCombatValue / 10 on specific level, else 0
        updateCombatState(entity, 0, bonus, 0, baseCombatValue)

        if currentState != 5 (death):
            set death animation
            set state = 5
            on specific level (normal/easy NG+):
                triggerGameEvent(...)  // level-specific event
        skip to torso/head tracking + movement

    // --- Alive ---
    SenseLara(entity, trackData)
    health = entity[ENTITY_HEALTH]
    // On specific level: boost health and baseCombatValue by 10%

    canTarget = checkTargetVisibility(entity, trackData)
    updateCombatState(entity, canTarget, health, 0, baseCombatValue)

    headYaw = trackData.turnAngle if facing
    UpdateEnemyMood(entity, trackData, passive=true)
    turnDelta = TurnTo(entity, aiData.turnRate)

    switch entity[ENTITY_CURRENT_STATE]:
        case 1 (idle):
            target = queued state (or 0)
            if target == 0:
                target = 2 (walk)
                if mood == bored:
                    random chance → target = 6 (idle anim)
                elif mood == escape:
                    target = 3 (run)
            targetState = target

        case 2 (walk):
            aiData.turnRate = WALK_TURN_RATE
            if mood == bored and random:
                targetState = 1, queue = 6
            elif mood != escape:
                if canTarget:
                    targetState = 1, queue = 4 (aim)
                elif facing + close:
                    stay
                else: fall through to run
            targetState = 1, queue = 3 (run)

        case 3 (run):
            aiData.turnRate = RUN_TURN_RATE
            torsoPitch = turnDelta / 2
            if mood == bored and random:
                targetState = 1, queue = 6
            elif canTarget:
                targetState = 1, queue = 4 (aim)
            elif facing + close:
                targetState = 1, queue = 2 (walk)

        case 4 (aim):
            target = queued state (or 0)
            if target == 0:
                if canTarget: target = 7 (shoot)
                else: target = 1 (idle)
            targetState = target

        case 6 (idle anim):
            if mood == bored and random:
                targetState = 1, queue = 2
            else:
                targetState = 1

        case 7 (shoot):
            if not yet fired:
                hit = ShootLara(entity, distance, weaponData, turnAngle)
                if hit:
                    if normal/easy NG+: Lara health -= 50
                    else (hard NG+): Lara health -= 70
                    set Lara ENTITY_STATUS bit 4
                    if Lara dead and specific game version:
                        set death tracking flag
                queue = 4 (aim for follow-up)
            if mood == escape:
                queue = 1 (flee)

    // Torso tracking — tilt toward torsoPitch, clamped per frame
    adjust ENTITY_PITCH toward torsoPitch

    // Head tracking — yaw toward target, clamped per frame with total limit
    if AI data head joint exists:
        adjust joint toward headYaw

    ProcessEntityMovement(entityId, turnDelta, 0)
```
