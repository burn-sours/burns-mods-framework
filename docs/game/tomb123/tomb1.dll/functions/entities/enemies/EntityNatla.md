# Function: EntityNatla

## Description
Two-phase boss AI for Natla. Above a health threshold she flies and attacks with meatball projectiles, including a three-round burst. When damaged below the threshold she falls to the ground, becomes stunned and invulnerable for 480 frames (~16 seconds), then recovers with restored health and triggers a flip effect (room transformation). In the grounded phase she switches to faster bullet projectiles while running and aiming.

## Notes
- Only called by the game loop for entities on the active processing list (`ENTITY_STATUS` bit 0 set)
- Called with the entity's index into the entity array, not a pointer
- **Health threshold**: 200 (normal) or 300 (New Game Plus) — determines the transition between flying and grounded phases
- Uses `SenseLara` for AI tracking, `UpdateEnemyMood` for mood, and a combat state tracking function each frame
- Visibility check combines a forward arc of approximately ±30 degrees with a line-of-sight test
- Maintains a "lost sight" flag — set when Lara leaves the forward arc while flying; random chance per frame (~1/128) to clear it when she re-enters view
- **Body offset torso tracking**: rotation is temporarily decomposed into base rotation and a torso offset around `ProcessEntityMovement`, allowing independent aiming
- **Head pitch tracking**: smoothed with ±0x222 clamp per frame
- Steering uses `Atan2` — flying turn rate 0x38E (tight: 0x1C7), grounded turn rate 0x444 (tight: 0x222)
- On death: sets target state 9, triggers a game event on non-NG+ conditions

### Phase 1 — Flying (health > threshold)
- Fires `ShootAtlanteanMeatball` from bone position every 30 frames in state 2
- **Burst fire** (state 6): fires 3 meatballs — first aimed directly, second and third with random angular spread (random value / 4 applied to projectile direction)
- Plays `SoundEffect` 123 on each meatball fired
- `UpdateEnemyMood` called with parameter 1 when actively tracking, parameter 0 otherwise
- Routes to attack approach (state 4) when Lara is visible, fly/search (state 2) when not
- Animation control data is modified per phase to change flight/mesh behaviour

### Phase 2 — Grounded (health ≤ threshold)
- Entered when health drops to or below threshold — flying states immediately redirect to landing/stun
- **State 7 (falling)**: enables gravity, clears movement speed; on landing → state 5
- **State 5 (stunned)**: invulnerable for 480 frames — health forced to −16384 each frame
  - On recovery: restores health to the threshold value (200/300), triggers a flip effect (room transformation), transitions to state 8
- Fires `ShootAtlanteanBullet` from bone position every 20 frames in states 3 and 8
- Plays `SoundEffect` 123 on each bullet fired
- State 3 (running): shoots while moving, transitions to state 8 when Lara is visible
- State 8 (aiming): shoots while stationary, transitions to state 3 when Lara leaves sight

### States

| State | Name       | Phase    | Description                                                     |
|-------|------------|----------|-----------------------------------------------------------------|
| 1     | Idle       | Flying   | Routes to approach (4) if can see Lara, fly/search (2) if not   |
| 2     | Flying     | Flying   | Shoots meatball every 30 frames; lands (→1) when visible + at floor |
| 3     | Running    | Grounded | Shoots bullet every 20 frames; if can see → aiming (8)         |
| 4     | Approach   | Flying   | Attack approach; routes to burst fire (6) or idle (1)           |
| 5     | Stunned    | Grounded | Invulnerable 480 frames, restores health, triggers flip effect  |
| 6     | Burst Fire | Flying   | Fires 3 meatballs (1 aimed + 2 spread); one-shot per entry     |
| 7     | Falling    | Grounded | Gravity enabled; on landing → stunned (5)                       |
| 8     | Aiming     | Grounded | Shoots bullet every 20 frames; if loses sight → running (3)    |
| 9     | Death      | —        | Final death                                                     |

### Phase Transitions (entering grounded from flying)

| Flying State | Grounded Redirect |
|--------------|-------------------|
| 1, 4, 6      | → 5 (stunned)     |
| 2             | → 7 (falling)     |

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
// Monitor Natla's phase transitions
mod.hook('EntityNatla')
    .onEnter(function(entityId) {
        const entities = game.readVar(game.module, 'Entities');
        const entity = entities.add(entityId * ENTITY_SIZE);
        this._health = entity.add(ENTITY_HEALTH).readS16();
    })
    .onLeave(function(returnValue, entityId) {
        const entities = game.readVar(game.module, 'Entities');
        const entity = entities.add(entityId * ENTITY_SIZE);
        const newHealth = entity.add(ENTITY_HEALTH).readS16();
        if (this._health > 200 && newHealth <= 200) {
            log('Natla entering grounded phase!');
        }
    });
```

### Calling from mod code
```javascript
game.callFunction(game.module, 'EntityNatla', natlaEntityIndex);
```

## Pseudocode
```
function EntityNatla(entityId):
    entity = entities[entityId]
    THRESHOLD = 200  // 300 on NG+

    // Activation check
    if entity flags pending:
        if not activateEnemyAI(entityId): return
        clear pending, set active

    animData = entity.animationData
    turnDelta = 0
    timer = entity.timer
    health = entity.health
    headAngle = 0
    projSpeed = animData[0] * 7 / 8

    // === DEATH ===
    if health <= 0:
        callCombatTracking(entity, 0, 0, 0, THRESHOLD)
        entity.targetState = 9
        trigger game event on non-NG+ conditions
        goto postProcess

    // Set default animation control masks
    animData.meshMask = default
    animData.meshFlags = 0

    // === FLYING PHASE (health > threshold) ===
    if health > THRESHOLD:
        SenseLara(entity, aiData)
        health = entity.health
        canSee = visibilityCheck(entity, aiData)

        // Aggression scaling based on health percentage above threshold
        // Manages internal combat tracking slots

        // Forward arc check (~±30°) + line-of-sight
        if aiData.angle within ±0x1554:
            canSeeForward = visibilityCheck(entity, aiData)
        else:
            canSeeForward = false

        // Lost sight management (state 2 only)
        if entity.currentState == 2 AND entity.lostSightFlag != 0:
            if canSeeForward AND random chance (~1/128):
                entity.lostSightFlag = 0
            if entity.lostSightFlag == 0:
                UpdateEnemyMood(entity, aiData, 1)
            // Switch to flying animation control
            animData.meshMask = flying mode
            animData.meshFlags = 0x20
            SenseLara(entity, aiData)
        elif not canSeeForward:
            entity.lostSightFlag = 1

        // Head tracking
        if aiData.distance != 0:
            headAngle = aiData.angle

        // Mood update for non-tracking states
        if entity.currentState != 2 OR entity.lostSightFlag != 0:
            UpdateEnemyMood(entity, aiData, 0)

        // Rotation with body offset
        entity.yaw -= entity.torsoOffset

        // Atan2 steering (turn rate 0x38E, tight rate 0x1C7)
        turnDelta = steerTowardTarget(entity, 0x38E, 0x1C7)
        entity.yaw += turnDelta

        // Torso offset management
        if entity.currentState == 2:
            apply aiData.angle to torsoOffset (clamped ±0x38E)
        else:
            smooth torsoOffset via turnDelta

        entity.yaw += torsoOffset

        // --- Flying state machine ---
        switch entity.currentState:
            case 1 (idle):
                timer = 0
                if entity.lostSightFlag == 0:
                    entity.targetState = 4  // attack approach
                else:
                    entity.targetState = 2  // fly/search

            case 2 (flying):
                if entity.lostSightFlag == 0 AND entity.y == entity.floor:
                    entity.targetState = 1  // land
                if timer > 29:
                    GetBonePosition(entity, pos, boneOffset)
                    projectile = ShootAtlanteanMeatball(pos, entity.xzSpeed,
                                     entity.yaw, entity.room, entity.objectId)
                    if projectile != -1:
                        projSpeed = projectile.speed
                        SoundEffect(123, projectile.position, 0)
                    timer = 0

            case 4 (approach):
                speedField = entity.speedField
                if speedField == 0:
                    if canSeeForward:
                        entity.targetState = 6  // burst fire
                    else:
                        entity.targetState = 1  // regroup
                else:
                    entity.targetState = speedField

            case 6 (burst fire):
                if entity.speedField == 0:
                    // Fire 3 meatballs from bone position
                    GetBonePosition(entity, pos, boneOffset)
                    proj1 = ShootAtlanteanMeatball(pos, ...)
                    if proj1 != -1: projSpeed = proj1.speed

                    GetBonePosition(entity, pos, boneOffset)
                    proj2 = ShootAtlanteanMeatball(pos, ...)
                    if proj2 != -1: proj2.direction += randomSpread / 4

                    GetBonePosition(entity, pos, boneOffset)
                    proj3 = ShootAtlanteanMeatball(pos, ...)
                    if proj3 != -1: proj3.direction += randomSpread / 4

                    entity.speedField = 1  // prevent re-fire

    // === GROUNDED PHASE (health ≤ threshold) ===
    else:
        SenseLara(entity, aiData)

        // Combat tracking — varies by state and visibility
        callCombatTracking based on current state

        // Head tracking
        if aiData.distance != 0:
            headAngle = aiData.angle

        UpdateEnemyMood(entity, aiData, 1)

        // Atan2 steering (turn rate 0x444, tight rate 0x222)
        turnDelta = steerTowardTarget(entity, 0x444, 0x222)

        // Forward arc + visibility recheck
        if angle outside ±0x1554 OR visibilityCheck fails:
            canSeeForward = false

        // Apply and clear torso offset
        if entity.torsoOffset != 0:
            entity.yaw += entity.torsoOffset
            entity.torsoOffset = 0

        // --- Grounded state machine ---
        switch entity.currentState:
            case 1, 4, 6:
                entity.targetState = 5  // → stunned
                entity.xzSpeed = 0
                timer = 0

            case 2:
                entity.targetState = 7  // → falling
                timer = 0

            case 3 (running):
                if timer > 19:
                    GetBonePosition(entity, pos, boneOffset)
                    projectile = ShootAtlanteanBullet(pos, entity.xzSpeed,
                                     entity.yaw, entity.room, entity.objectId)
                    if projectile != -1:
                        projSpeed = projectile.speed
                        SoundEffect(123, projectile.position, 0)
                    timer = 0
                pitchTracking = turnDelta
                if canSeeForward:
                    entity.targetState = 8  // → aiming

            case 5 (stunned):
                if timer == 480:
                    timer = 0
                    entity.targetState = 8
                    entity.health = THRESHOLD  // restore health
                    trigger flip effect (room transformation)
                else:
                    entity.health = -16384  // invulnerable

            case 7 (falling):
                if entity.y < entity.floor:
                    entity.xzSpeed = 0
                    enable gravity flag
                else:
                    entity.targetState = 5  // landed → stunned
                    entity.y = entity.floor
                    clear gravity flag
                    timer = 0

            case 8 (aiming):
                if not canSeeForward:
                    entity.targetState = 3  // → running
                if timer > 19:
                    GetBonePosition(entity, pos, boneOffset)
                    projectile = ShootAtlanteanBullet(pos, entity.xzSpeed,
                                     entity.yaw, entity.room, entity.objectId)
                    if projectile != -1:
                        projSpeed = projectile.speed
                        SoundEffect(123, projectile.position, 0)
                    timer = 0

    // === POST-PROCESSING (both phases) ===
    postProcess:

    // Head pitch smoothing (±0x222 clamp per frame)
    pitchDelta = clamp(pitchTarget * 4 - entity.pitch, -0x222, 0x222)
    entity.pitch += pitchDelta

    // Animation data update
    if entity.currentState == 5:
        animData[1] = 0  // no head tracking while stunned
    else:
        animData[1] = -headAngle
        if projSpeed != 0:
            animData[0] = projSpeed

    entity.timer = timer + 1

    // Movement processing with body offset
    entity.yaw -= entity.torsoOffset
    ProcessEntityMovement(entityId, turnDelta, 0)
    entity.yaw += entity.torsoOffset
```
