# Function: EntityCowboy

## Description
AI behaviour for the Cowboy — a human gunman with a powerful ranged attack that alternates between hitscan shots and projectiles. Simpler state machine than Larson/Pierre (no idle anim state). Always checks visibility each frame rather than conditionally. Features a shot counter in the shoot state: fires a hitscan on the first frame, then after 6 frames fires either a projectile (if Lara is out of sight) or another hitscan. Drops items on death and may trigger a level-specific game event.

## Notes
- Only called by the game loop for entities on the active processing list (`ENTITY_STATUS` bit 0 set)
- Called with the entity's index into the entity array, not a pointer
- `UpdateEnemyMood` called with passive flag — cautious behaviour
- Turn rate is **dynamic**: stored in an AI data field, updated per state (0x222 for walk, 0x444 for run). `TurnTo` reads this value each frame
- Always checks visibility (`checkTargetVisibility`) and updates combat state every frame while alive — not conditional on being alerted like Pierre
- **Shot counter** in AI data: reset to 0 when entering aim state, incremented each frame in shoot state. Frame 0 = hitscan, frame 6 = projectile or hitscan
- When Lara is out of sight on the 6th frame: calculates a bone position and creates a projectile via the projectile spawning function, adjusting its angle by the head tracking yaw. Sets the entity weapon state to 4
- When Lara IS in sight on the 6th frame: fires a second `ShootLara` hitscan with a different weapon data set
- On death: calls `DropEnemyItems` to drop carried items, then sets death animation (state 5)
- On death (normal/easy NG+ only): triggers a game event with params (11, 100)
- **Torso tracking** via `ENTITY_PITCH`: in run state, torso tilts at half the turn delta. In shoot state, torso centers to 0. Clamped ±0x222 per frame
- Head yaw tracking via AI data joint (clamped ±0x38E per frame, ±0x4000 total)
- After shoot state, if mood is escape: queues run (3)
- Sets dual-weapon flag before the first shot

### States

| State | Name   | Description                                                              |
|-------|--------|--------------------------------------------------------------------------|
| 1     | Idle   | Hub state; routes to walk, run, or aim based on visibility and mood      |
| 2     | Walk   | Slow patrol (turn rate 0x222); transitions to aim or run                 |
| 3     | Run    | Fast pursuit (turn rate 0x444); torso tilts into turns                   |
| 4     | Aim    | Resets shot counter; checks visibility to decide shoot or disengage      |
| 5     | Death  | Death animation; drops carried items                                     |
| 6     | Shoot  | Fires hitscan on frame 0, projectile or hitscan on frame 6              |

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
  - Close (< 0x900001) → stay walking
- Otherwise → 1 (idle) + queue 3 (run)

**State 3 (run):**
- Sets turn rate to 0x444, torso tilt = turnDelta / 2
- If not escaping OR facing Lara:
  - Can see Lara → 1 (idle) + queue 4 (aim)
  - Facing + close (< 0x900000) → 1 (idle) + queue 2 (walk)

**State 4 (aim):**
- Resets shot counter to 0
- If no queued state AND can see Lara → 6 (shoot)
- Otherwise → 1 (idle)

**State 6 (shoot):**
- Frame 0: hitscan via `ShootLara` with weapon data 1
- Frame 6:
  - Can see Lara → hitscan via `ShootLara` with weapon data 2
  - Can't see Lara → spawns projectile from bone position, adjusts angle by head yaw
- Counter increments each frame
- If escape mood → queue 3 (run)

### Damage

**Hitscan (ShootLara):**

| Condition              | Damage |
|------------------------|--------|
| Normal                 | -70    |
| New Game Plus (hard)   | -80    |

- Sets bit 4 of Lara's `ENTITY_STATUS`
- If Lara dies from the shot under specific NG+ conditions, sets a tracking flag (0x40000000)
- Both the frame-0 and frame-6 hitscan shots deal the same damage

**Projectile (frame 6, can't see Lara):**
- Spawns a projectile from a bone position with weapon data
- Sets entity weapon state to 4
- Projectile angle adjusted by head tracking yaw

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
// Log Cowboy's attack type (hitscan vs projectile)
mod.hook('EntityCowboy')
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
            log('Cowboy entering shoot state');
        }
    });
```

### Calling from mod code
```javascript
game.callFunction(game.module, 'EntityCowboy', cowboyEntityIndex);
```

## Pseudocode
```
function EntityCowboy(entityId):
    entity = entities[entityId]
    globalCombatValue = readGlobalValue()

    // Activation check
    if entity[ENTITY_STATUS] activation bits pending:
        if not activateAI(entityId): return
        clear pending bits

    torsoPitch = 0
    headYaw = 0
    turnDelta = 0
    aiData = entity[AI_DATA_POINTER]

    // --- Dead ---
    if entity[ENTITY_HEALTH] <= 0:
        updateCombatState(entity, 0, 0, 0, globalCombatValue)

        if currentState != 5 (death):
            set death animation
            set state = 5
            DropEnemyItems(entity)
            if normal/easy NG+:
                triggerGameEvent(11, 100)
        skip to torso/head tracking + movement

    // --- Alive ---
    SenseLara(entity, trackData)
    health = entity[ENTITY_HEALTH]

    canTarget = checkTargetVisibility(entity, trackData)
    updateCombatState(entity, canTarget, health, 0, globalCombatValue)

    headYaw = trackData.turnAngle if facing
    UpdateEnemyMood(entity, trackData, passive=true)
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
                elif close (< 0x900001):
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
                elif facing + close (< 0x900000):
                    targetState = 1, queue = 2 (walk)

        case 4 (aim):
            aiData.shotCounter = 0
            if no queued state and canTarget:
                targetState = 6 (shoot)
            else:
                targetState = 1 (idle)

        case 6 (shoot):
            if shotCounter == 0:
                // First shot — hitscan
                set dual-weapon flag = 1
                hit = ShootLara(entity, distance, weaponData1, headAngle)
                if hit:
                    if normal/easy NG+: Lara health -= 70
                    else (hard NG+): Lara health -= 80
                    set Lara ENTITY_STATUS bit 4
                    if Lara dead and specific NG+ condition:
                        set tracking flag 0x40000000

            elif shotCounter == 6:
                if canTarget:
                    // Second shot — hitscan
                    hit = ShootLara(entity, distance, weaponData2, headAngle)
                    if hit:
                        if normal/easy NG+: Lara health -= 70
                        else (hard NG+): Lara health -= 80
                        set Lara ENTITY_STATUS bit 4
                        if Lara dead: set tracking flag
                else:
                    // Blind fire — spawn projectile
                    bonePos = getBonePosition(entity, weaponData2.boneOffset)
                    projectileId = spawnProjectile(bonePos, entity.yaw, entity.room)
                    entity.weaponState = 4
                    if projectileId != -1:
                        adjust projectile angle by headYaw

            shotCounter += 1
            torsoPitch = 0

            if mood == escape:
                queue = 3 (run)

    // Torso tracking
    adjust ENTITY_PITCH toward torsoPitch * 4 (clamped ±0x222 per frame)

    // Head tracking
    if AI data head joint exists:
        adjust joint toward headYaw (±0x38E per frame, clamped ±0x4000)

    ProcessEntityMovement(entityId, turnDelta, 0)
```
