# Function: EntityPierre

## Description
AI behaviour for Pierre — a recurring human enemy with dual ranged pistols who can flee and reappear across multiple levels. Only one Pierre can be active at a time (singleton). Has a unique health protection system: when not being directly shot by Lara, his health floors at 40 instead of dying, triggering an escape sequence. On actual death, drops carried items and may trigger a level-specific game event.

## Notes
- Only called by the game loop for entities on the active processing list (`ENTITY_STATUS` bit 0 set)
- Called with the entity's index into the entity array, not a pointer
- **Singleton**: tracked via a global `ActivePierreId`. If another Pierre triggers while one is already active, the one without the "hit by Lara" flag gets deactivated
- **Health protection**: when health drops below 41 and Lara hasn't hit Pierre (no player-hit flag), health floors at 40, increments an escape counter in AI data, and clears Pierre from the targeting system
- **Escape counter** (AI data field): incremented each time health is floored. While non-zero, AI tracking is forced into unreachable zone (escape mode) and the entity's hurt flag is set
- After movement each frame while escaping: checks line of sight from Pierre's position to camera position via range tracing. If clear LOS, resets counter to 1. If counter exceeds 10 without clear LOS, Pierre fully deactivates and leaves the level
- On death: calls `DropEnemyItems` to drop carried items, then sets death animation (state 5)
- On death (normal/easy NG+ only): triggers a game event with params (9, 100) — likely a level-specific event
- `UpdateEnemyMood` called with passive flag — cautious behaviour
- Turn rate is **dynamic**: stored in an AI data field, updated per state (0x222 for walk, 0x444 for run). `TurnTo` reads this value each frame
- Uses a visibility/targeting check to determine if Pierre can see Lara — only checked when entity is alerted or Lara is aiming at Pierre, AND escape counter is zero
- A combat state tracking function is called each frame with health values and targeting status
- **Dual pistols**: shoot state fires TWO `ShootLara` calls per frame with different weapon data — one per hand
- Between the two shots, sets a flag indicating the second weapon should fire
- **Torso tracking** via `ENTITY_PITCH`: in run state, torso tilts at half the turn delta (leans into turns). In other states, torso centers back to 0. Clamped ±0x222 per frame
- Head yaw tracking via AI data joint (clamped ±0x38E per frame, ±0x4000 total)
- After shooting, queues aim state (4) for follow-up shots; if escaping with random chance, queues idle (1) instead
- Pierre also deactivates if a room boundary check detects he has gone out of bounds
- On deactivation (escape or out-of-bounds): health set to 0xC000, AI data deallocated, entity deactivated, `ActivePierreId` reset to -1

### States

| State | Name       | Description                                                          |
|-------|------------|----------------------------------------------------------------------|
| 1     | Idle       | Hub state; routes via queued state to walk, run, aim, or idle anim   |
| 2     | Walk       | Slow patrol (turn rate 0x222); mood-based transitions                |
| 3     | Run        | Fast pursuit (turn rate 0x444); torso tilts into turns               |
| 4     | Aim        | Aiming at Lara; checks visibility to decide shoot or disengage      |
| 5     | Death      | Death animation; drops carried items                                 |
| 6     | Idle anim  | Standing idle animation; returns to walk or idle based on mood       |
| 7     | Shoot      | Fires dual pistols via two `ShootLara` calls; queues aim             |

### State Transitions

**State 1 (idle):**
- If queued state set → use queued state
- Bored mood + random chance → 6 (idle anim)
- Bored mood → 2 (walk)
- Escape mood → 3 (run)
- Default → 2 (walk)

**State 2 (walk):**
- Sets turn rate to 0x222
- Bored + random → 1 (idle) + queue 6 (idle anim)
- Escape mood → 1 (idle) + queue 3 (run)
- Can see Lara → 1 (idle) + queue 4 (aim)
- Facing + close (< 0x900000) → stay walking
- Otherwise → 1 (idle) + queue 3 (run)

**State 3 (run):**
- Sets turn rate to 0x444, torso tilt = turnDelta / 2
- Bored + random → 1 (idle) + queue 6 (idle anim)
- Can see Lara → 1 (idle) + queue 4 (aim)
- Facing + close (< 0x900000) → 1 (idle) + queue 2 (walk)

**State 4 (aim):**
- If queued state set → use queued state
- Can see Lara → 7 (shoot)
- Lost sight → 1 (idle)

**State 6 (idle anim):**
- Bored + random → 1 (idle) + queue 2 (walk)
- Not bored → 1 (idle)

**State 7 (shoot):**
- If not yet fired: two `ShootLara` calls (dual pistols), queue 4 (aim)
- If escape mood + random chance: queue 1 (idle) — flee instead of re-aiming

### Damage

**Shoot (state 7) — per pistol:**

| Condition              | Damage |
|------------------------|--------|
| Normal                 | -25    |
| New Game Plus (hard)   | -35    |

- Each pistol fires independently — max -50 (normal) or -70 (hard NG+) per frame
- Each hit sets bit 4 of Lara's `ENTITY_STATUS`
- If Lara dies from the second pistol under specific NG+ conditions, sets a tracking flag (0x800000)

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
// Track Pierre's escape sequence
mod.hook('EntityPierre')
    .onEnter(function(entityId) {
        const entities = game.readVar(game.module, 'Entities');
        const entity = entities.add(entityId * ENTITY_SIZE);
        this._health = entity.add(ENTITY_HEALTH).readS16();
        this._state = entity.add(ENTITY_CURRENT_STATE).readS16();
    })
    .onLeave(function(returnValue, entityId) {
        const entities = game.readVar(game.module, 'Entities');
        const entity = entities.add(entityId * ENTITY_SIZE);
        const newHealth = entity.add(ENTITY_HEALTH).readS16();
        if (this._state === 7) {
            log('Pierre fired dual pistols at Lara');
        }
        if (this._health > 40 && newHealth === 40) {
            log('Pierre health floored — starting escape sequence');
        }
    });
```

### Calling from mod code
```javascript
game.callFunction(game.module, 'EntityPierre', pierreEntityIndex);
```

## Pseudocode
```
function EntityPierre(entityId):
    entity = entities[entityId]
    secondDistance = readGlobalValue()  // used as distance for second pistol shot

    // --- Singleton enforcement ---
    if ActivePierreId != -1 and ActivePierreId != entityId:
        if entity has NOT been hit by Lara (no player-hit flag):
            DeactivateEntity(entityId)  // keep existing Pierre
        else:
            DeactivateEntity(ActivePierreId)  // replace with this one
    ActivePierreId = resolved Pierre id

    // Activation check
    if entity[ENTITY_STATUS] activation bits pending:
        if not activateAI(entityId): return
        clear pending bits

    torsoPitch = 0
    turnDelta = 0
    aiData = entity[AI_DATA_POINTER]

    // --- Health protection (not killed by Lara) ---
    if entity[ENTITY_HEALTH] < 41 and NOT hit by Lara:
        entity[ENTITY_HEALTH] = 40  // floor health
        aiData.escapeCounter += 1
        if secondDistance > -0x4000:
            clear Pierre from targeting system (4-slot array)

    headYaw = 0

    // --- Dead ---
    if entity[ENTITY_HEALTH] <= 0:
        if hit by Lara:
            updateCombatState(entity, 0, 0, 0, secondDistance)
        if currentState != 5 (death):
            set death animation
            set state = 5
            DropEnemyItems(entity)
            if normal/easy NG+:
                triggerGameEvent(9, 100)
        skip to torso/head tracking + movement

    // --- Alive ---
    SenseLara(entity, trackData)

    // Only check visibility when alerted/aimed at AND not escaping
    if (entity alerted or Lara aiming at Pierre) and escapeCounter == 0:
        canTarget = checkTargetVisibility(entity, trackData)
        updateCombatState(entity, canTarget, health, 0, secondDistance)

    if hit by Lara (ENTITY_STATUS hit flag):
        mark entity as alerted

    headYaw = trackData.turnAngle if facing

    if escapeCounter != 0:
        force AI tracking to unreachable zone (escape)
        set ENTITY_STATUS hurt flag

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
            aiData.turnRate = 0x222
            if mood == bored and random:
                targetState = 1, queue = 6
            elif mood == escape:
                targetState = 1, queue = 3 (run)
            elif canTarget:
                targetState = 1, queue = 4 (aim)
            elif facing + close (< 0x900000):
                stay
            else:
                targetState = 1, queue = 3 (run)

        case 3 (run):
            aiData.turnRate = 0x444
            torsoPitch = turnDelta / 2
            if mood == bored and random:
                targetState = 1, queue = 6
            elif canTarget:
                targetState = 1, queue = 4 (aim)
            elif facing + close (< 0x900000):
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
                // First pistol
                hit1 = ShootLara(entity, distance, weaponData1, headAngle)
                if hit1:
                    if normal/easy NG+: Lara health -= 25
                    else (hard NG+): Lara health -= 35
                    set Lara ENTITY_STATUS bit 4

                set dual-weapon flag = 1

                // Second pistol
                hit2 = ShootLara(entity, secondDistance, weaponData2, headAngle)
                if hit2:
                    if normal/easy NG+: Lara health -= 25
                    else (hard NG+): Lara health -= 35
                    set Lara ENTITY_STATUS bit 4
                    if Lara dead and specific NG+ condition:
                        set tracking flag 0x800000

                queue = 4 (aim for follow-up)
                mark entity as alerted

            if mood == escape and random chance:
                queue = 1 (flee)

    // Torso tracking
    adjust ENTITY_PITCH toward torsoPitch * 4 (clamped ±0x222 per frame)

    // Head tracking
    if AI data head joint exists:
        adjust joint toward headYaw (±0x38E per frame, clamped ±0x4000)

    ProcessEntityMovement(entityId, turnDelta, 0)

    // --- Escape line-of-sight check ---
    if escapeCounter != 0:
        entityPos = (entity.x, entity.y - 0x400, entity.z)
        cameraPos = (cameraCurrentX, cameraCurrentY, cameraCurrentZ)

        // Trace range in X and Z axes (larger axis first)
        traceX, traceZ = TraceRangeX/Z between cameraPos and entityPos

        if both traces succeed:
            GetSector(entityPos)
            if has_line_of_sight(cameraPos, entityPos):
                escapeCounter = 1  // reset, Pierre found a clear path
                return

        if escapeCounter > 10:
            // Pierre escapes — deactivate
            clear alerted flag
            entity[ENTITY_HEALTH] = 0xC000
            deallocate AI data
            DeactivateEntity(entityId)
            ActivePierreId = -1
            clear global Pierre flag

    // --- Room boundary check ---
    if roomBoundaryCheck(entity) indicates out of bounds:
        entity[ENTITY_HEALTH] = 0xC000
        deallocate AI data
        DeactivateEntity(entityId)
        ActivePierreId = -1
```
