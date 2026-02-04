# Function: EntitySkaterBoy

## Description
AI behaviour for Skater Boy — a dual-uzi gunman on a skateboard with unique terrain-tilt physics and a health-triggered environment effect. Calculates the slope of the terrain each frame using floor probes ahead and behind, then tilts the entity to match the surface. Uses a fixed turn rate (0x2D8) instead of dynamic rates. Fires both uzis simultaneously with state-dependent damage — standing shots deal significantly more than skating shots. When health drops below a threshold, triggers a flip effect (environment change). Drops items on death.

## Notes
- Only called by the game loop for entities on the active processing list (`ENTITY_STATUS` bit 0 set)
- Called with the entity's index into the entity array, not a pointer
- **Terrain tilt**: each frame, probes the floor height at two points along the entity's facing direction (forward and backward). If a probed height is within 0x200 of the entity's current Y, it's used; otherwise the current Y is kept. The height difference between front and back is converted to a tilt angle via ATAN2 lookup tables. This angle drives the entity's lean
- **Tilt stored at entity field 0x64** (not `ENTITY_PITCH`) — adjusted toward terrain tilt at ±0x100 per frame, even when dead
- Fixed turn rate: `TurnTo(entity, 0x2D8)` — always the same, no per-state adjustment
- `UpdateEnemyMood` called with passive flag — cautious behaviour
- Always checks visibility and updates combat state every frame while alive
- **Dual uzis**: fires two `ShootLara` calls per frame with different weapon data, with a dual-weapon flag set between shots
- **State-dependent damage**: standing shots (states 1/4 from idle) deal more damage than skating shots (state 4 while skating)
- **Shot counter** in AI data: reset to 0 when entering idle (state 0) or skate (state 2). States 1 and 4 only fire when counter is 0, then set it to 1
- **Health-triggered flip effect**: when health drops below 120 and effect hasn't been triggered yet, executes an environment change command via `sprintf` and a game function call. This likely triggers an arena modification (ramp flip, door opening, etc.)
- On death: calls `DropEnemyItems` to drop carried items, then sets death animation (state 5)
- On death (normal/easy NG+ only): triggers a game event with params (12, 100)
- Head yaw tracking via AI data joint (clamped ±0x38E per frame, ±0x4000 total)
- No torso pitch tracking (unlike Larson/Pierre/Cowboy)
- After shooting in states 1/4, if escaping or very close (< 0x100000): queues skate (2) to disengage

### States

| State | Name   | Description                                                              |
|-------|--------|--------------------------------------------------------------------------|
| 0     | Idle   | Hub state; resets shot counter, routes to shoot or skate                 |
| 1     | Shoot  | Fires dual uzis (from idle); higher damage than state 4                 |
| 2     | Skate  | Movement state; random tricks, transitions to idle or shoot              |
| 3     | Trick  | Display animation while skating; random chance to resume skating         |
| 4     | Shoot  | Fires dual uzis (while skating); lower damage than state 1              |
| 5     | Death  | Death animation; drops carried items                                     |

### State Transitions

**State 0 (idle):**
- Resets shot counter to 0
- If queued state set → use queued state
- Can see Lara → 1 (shoot from idle)
- Otherwise → 2 (skate)

**State 1 (shoot from idle):**
- If shot counter == 0 AND can see Lara: fire dual uzis, set counter = 1
- If escaping or very close (< 0x100000) → queue 2 (skate)

**State 2 (skate):**
- Resets shot counter to 0
- Random chance → 3 (trick)
- If can see Lara:
  - Medium range (between ~6.6M and ~16.7M squared distance) AND not escaping → 0 (idle, to stop and shoot)
  - Otherwise → 4 (shoot while skating)

**State 3 (trick):**
- Random chance → 2 (skate)

**State 4 (shoot while skating):**
- Same shoot logic as state 1 (but lower damage)
- If escaping or very close (< 0x100000) → queue 2 (skate)

### Damage

**Dual uzis — per uzi, per shot:**

| Condition                     | Damage |
|-------------------------------|--------|
| Normal, skating (state 4)    | -40    |
| Normal, standing (state 1)   | -50    |
| Hard NG+, skating (state 4)  | -60    |
| Hard NG+, standing (state 1) | -100   |

- Total per frame (both uzis): -80/-100 skating, -100/-200 standing
- Each hit sets bit 4 of Lara's `ENTITY_STATUS`
- If Lara dies from a shot under specific NG+ conditions, sets a tracking flag

### Turn Rates

| Context    | Rate  |
|------------|-------|
| All states | 0x2D8 |

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
// Track when Skater Boy triggers the environment effect
mod.hook('EntitySkaterBoy')
    .onEnter(function(entityId) {
        const entities = game.readVar(game.module, 'Entities');
        const entity = entities.add(entityId * ENTITY_SIZE);
        this._health = entity.add(ENTITY_HEALTH).readS16();
    })
    .onLeave(function(returnValue, entityId) {
        const entities = game.readVar(game.module, 'Entities');
        const entity = entities.add(entityId * ENTITY_SIZE);
        const newHealth = entity.add(ENTITY_HEALTH).readS16();
        if (this._health >= 120 && newHealth < 120) {
            log('Skater Boy triggered environment flip effect');
        }
    });
```

### Calling from mod code
```javascript
game.callFunction(game.module, 'EntitySkaterBoy', skaterEntityIndex);
```

## Pseudocode
```
function EntitySkaterBoy(entityId):
    entity = entities[entityId]
    globalCombatValue = readGlobalValue()
    headYaw = 0
    aiData = entity[AI_DATA_POINTER]

    // --- Terrain tilt calculation ---
    yaw = entity[ENTITY_YAW_INTERNAL]
    sinOffset = sin(yaw) scaled
    cosOffset = cos(yaw) scaled
    entityY = entity[ENTITY_Y]

    // Probe forward
    forwardX = entity[ENTITY_X] + sinOffset
    forwardZ = entity[ENTITY_Z] + cosOffset
    sector = GetSector(forwardX, entityY, forwardZ, entity.room)
    forwardFloor = CalculateFloorHeight(sector, forwardX, entityY, forwardZ)

    // Probe backward
    backX = entity[ENTITY_X] - sinOffset
    backZ = entity[ENTITY_Z] - cosOffset
    sector = GetSector(backX, entityY, backZ, entity.room)
    backFloor = CalculateFloorHeight(sector, backX, entityY, backZ)

    // Use probed heights if within threshold (< 0x201)
    frontY = forwardFloor if abs(entityY - forwardFloor) < 0x201 else entityY
    backY = backFloor if abs(entityY - backFloor) < 0x201 else entityY

    // Calculate tilt angle from height difference
    heightDiff = frontY - backY  // signed
    terrainTilt = ATAN2(heightDiff)  // absolute value of result

    // --- Dead ---
    if entity[ENTITY_HEALTH] <= 0:
        updateCombatState(entity, 0, 0, 0, globalCombatValue)

        if currentState != 5 (death):
            set death animation
            set state = 5
            DropEnemyItems(entity)
            if normal/easy NG+:
                triggerGameEvent(12, 100)

        // Dead tilt — gradually adjust toward terrain slope
        currentTilt = entity.tiltField
        turnDelta = 0
        if abs(terrainTilt - currentTilt) < 0x100:
            entity.tiltField = terrainTilt
        elif currentTilt < terrainTilt:
            entity.tiltField += 0x100
        elif terrainTilt < currentTilt:
            entity.tiltField -= 0x100
        skip to head tracking + movement

    // --- Alive ---
    SenseLara(entity, trackData)
    health = entity[ENTITY_HEALTH]

    canTarget = checkTargetVisibility(entity, trackData)
    updateCombatState(entity, canTarget, health, 0, globalCombatValue)

    headYaw = trackData.turnAngle if facing
    UpdateEnemyMood(entity, trackData, passive=true)
    turnDelta = TurnTo(entity, 0x2D8)

    // Health-triggered environment effect
    if health < 120 and flipEffectStatus != 0x38:
        trigger environment flip effect via game function
        set flipEffectStatus

    switch entity[ENTITY_CURRENT_STATE]:
        case 0 (idle):
            aiData.shotCounter = 0
            if queued state: targetState = queued state
            elif canTarget: targetState = 1 (shoot standing)
            else: targetState = 2 (skate)

        case 1 (shoot from idle):  // falls through to shared shoot logic
        case 4 (shoot while skating):
            if shotCounter == 0 and canTarget:
                // First uzi
                hit1 = ShootLara(entity, distance, weaponData1, headAngle)
                if hit1:
                    if currentState == 1:
                        // Standing — higher damage
                        if normal: Lara health -= 50
                        else: Lara health -= 100
                    else:
                        // Skating — lower damage
                        if normal: Lara health -= 40
                        else: Lara health -= 60
                    set Lara ENTITY_STATUS bit 4
                    if Lara dead and specific NG+ condition:
                        set tracking flag

                set dual-weapon flag = 1

                // Second uzi
                hit2 = ShootLara(entity, distance, weaponData2, headAngle)
                if hit2:
                    // Same state-dependent damage as first uzi
                    ...
                    set Lara ENTITY_STATUS bit 4

                aiData.shotCounter = 1

            if mood == escape or very close (< 0x100000):
                queue = 2 (skate)

        case 2 (skate):
            aiData.shotCounter = 0
            random chance → targetState = 3 (trick)
            if canTarget:
                if medium range and not escaping:
                    targetState = 0 (idle, to shoot standing)
                else:
                    targetState = 4 (shoot while skating)

        case 3 (trick):
            random chance → targetState = 2 (skate)

    // Head tracking
    if AI data head joint exists:
        adjust joint toward headYaw (±0x38E per frame, clamped ±0x4000)

    ProcessEntityMovement(entityId, turnDelta, 0)
```
