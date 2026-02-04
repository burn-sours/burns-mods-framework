# Function: EntityTorso

## Description
AI behaviour for the giant mutant torso — the final boss encounter in Tomb Raider 1. A legless creature that turns, walks, and uses two melee attacks plus an instant-kill grab. Deals contact damage every frame. The grab attack becomes available when Lara's health drops below a threshold, teleporting Lara to the entity and forcing a death animation. On death, triggers an explosion effect, activates a linked entity for the next game sequence, and fires a game event.

## Notes
- Only called by the game loop for entities on the active processing list (`ENTITY_STATUS` bit 0 set)
- Called with the entity's index into the entity array, not a pointer
- Uses `SenseLara` for AI tracking, `UpdateEnemyMood` with parameter 1 (aggressive), and a combat state tracking function each frame
- Visibility check via line-of-sight function
- **Contact damage**: deals damage every frame while touch bits are non-zero — −5 normal, −10 NG+ hard. Sets Lara's flags bit 4.
- **Lara health threshold**: 500 (normal) or 900 (NG+) — determines whether the torso uses regular attacks or the grab
  - Above threshold: regular attacks (states 4/5)
  - At or below threshold: grab attack (state 6) when close, walk (state 7) when far
  - In NG+, the threshold is 900 (out of 1000), meaning the grab becomes available almost immediately
- **Asymmetric turning**: left turn rotates −1638 per frame, right turn rotates +2548 per frame
- Head tracking with smoothing: ±0x38E delta per frame, clamped to ±0x4000 total
- No turn delta passed to `ProcessEntityMovement` — all steering done via state-based rotation
- State 9 (falling) uses `ProcessEntityAnimation` only, no full movement processing
- **Death sequence**: plays `SoundEffect` 171 (explosion), triggers explosion effect (250 radius normal, 280 NG+), activates a linked entity for the game sequence, deactivates self, fires game event

### States

| State | Name        | Description                                                          |
|-------|-------------|----------------------------------------------------------------------|
| 1     | Idle        | Decision hub — routes to turns, attacks, grab, or walk               |
| 2     | Turn Left   | Rotates −1638/frame (frames 14–22 of animation), returns when angle in range |
| 3     | Turn Right  | Rotates +2548/frame (frames 17–22 of animation), returns when angle in range |
| 4     | Attack (narrow) | Checks touch mask 0x3FF8000, deals heavy damage on contact      |
| 5     | Attack (wide)   | Checks touch mask 0x3FFFFF0, deals heavy damage on contact      |
| 6     | Grab        | On contact or Lara death: teleports Lara, forces death animation, instant kill |
| 7     | Walk        | Approaches Lara with ±0x222 turn smoothing per frame                 |
| 8     | Gravity On  | Enables gravity flag, transitions to 9                               |
| 9     | Falling     | Falls with gravity; on landing: resets to idle, snaps to floor       |
| 10    | Death       | Forced on health ≤ 0, sets death animation                          |
| 11    | Grab Hold   | Maintains grabbed-state flags while Lara's death animation plays     |

### State 1 — Idle Decision Logic

| Condition                                    | Target State |
|----------------------------------------------|--------------|
| Angle to Lara > ~45° right                   | 3 (turn right) |
| Angle to Lara > ~45° left                    | 2 (turn left)  |
| Distance² ≥ ~6.7M (~2592 units)             | 7 (walk)       |
| Close + Lara health > threshold              | 4 or 5 (~50/50 random) |
| Close + Lara health ≤ threshold + dist < ~2258 | 6 (grab)     |
| Close + Lara health ≤ threshold + dist ≥ ~2258 | 7 (walk)     |

### State 6 — Grab (Instant Kill)
- Triggers on contact (touch mask 0x3FF8000) or if Lara is already dead
- Teleports Lara to the entity's position and room
- Forces Lara into a specific death animation (state 46)
- Sets Lara's health to −1
- Clears Lara's gravity, speed, and pitch
- Sets oxygen to max negative, forces weapon type, sets global flags
- Transitions to state 11 (grab hold)

### Damage

| Attack               | Normal | NG+ Hard |
|----------------------|--------|----------|
| Contact (per frame)  | −5     | −10      |
| Attack (states 4/5)  | −500   | −900     |
| Grab (state 6)       | instant kill | instant kill |

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
// Prevent the grab attack from killing Lara
mod.hook('EntityTorso')
    .onEnter(function(entityId) {
        const laraPtr = game.readVar(game.module, 'Lara');
        this._hp = laraPtr.add(ENTITY_HEALTH).readS16();
    })
    .onLeave(function(returnValue, entityId) {
        const laraPtr = game.readVar(game.module, 'Lara');
        const newHp = laraPtr.add(ENTITY_HEALTH).readS16();
        if (newHp === -1 && this._hp > 0) {
            log('Torso grabbed Lara! Restoring health...');
            laraPtr.add(ENTITY_HEALTH).writeS16(this._hp);
        }
    });
```

### Calling from mod code
```javascript
game.callFunction(game.module, 'EntityTorso', torsoEntityIndex);
```

## Pseudocode
```
function EntityTorso(entityId):
    ATTACK_DAMAGE = 500    // 900 on NG+
    entity = entities[entityId]

    // Activation check
    if entity flags pending:
        if not activateEnemyAI(entityId): return
        clear pending, set active

    animData = entity.animationData

    // === DEATH ===
    if entity.health <= 0:
        callCombatTracking(entity, 0, 0, 0, maxHealth)
        headAngle = 0

        if entity.currentState != 10:
            force death animation (base + 13)
            entity.currentState = 10
        goto postProcess

    // === ALIVE ===
    SenseLara(entity, aiData)
    health = entity.health
    canSee = visibilityCheck(entity, aiData)
    callCombatTracking(entity, canSee, health, 0, maxHealth)

    headAngle = 0
    if aiData.distance != 0:
        headAngle = aiData.angle

    UpdateEnemyMood(entity, aiData, 1)

    // Angle to behaviour target
    angleToTarget = Atan2(target.z - entity.z, target.x - entity.x)
    angleDiff = angleToTarget - entity.yaw

    // --- Contact damage (every frame) ---
    if entity.touchBits != 0:
        if NG+ hard:
            Lara.health -= 10
        else:
            Lara.health -= 5
        set Lara flags bit 4

    // --- State machine ---
    switch entity.currentState:
        case 1 (idle):
            if Lara.health > 0:
                animData.trackingRef = 0
                if angleDiff >= 0x1FFF:
                    entity.targetState = 3  // turn right
                elif angleDiff <= -0x1FFE:
                    entity.targetState = 2  // turn left
                elif aiData.distanceSq >= ~6.7M:
                    entity.targetState = 7  // walk
                elif Lara.health > ATTACK_DAMAGE:
                    // Regular attacks — ~50/50 random
                    if random < 50%:
                        entity.targetState = 4  // narrow attack
                    else:
                        entity.targetState = 5  // wide attack
                else:
                    // Health low — grab or approach
                    if aiData.distanceSq < ~5.1M:
                        entity.targetState = 6  // grab
                    else:
                        entity.targetState = 7  // walk

        case 2 (turn left):
            // Store reference frame on first tick
            if animData.trackingRef == 0:
                animData.trackingRef = entity.frame
            else:
                frameDelta = entity.frame - animData.trackingRef
                if frameDelta > 13 AND frameDelta < 23:
                    entity.yaw -= 1638  // rotate left

            if angleDiff > -0x1FFE:
                entity.targetState = 1  // angle in range

        case 3 (turn right):
            if animData.trackingRef == 0:
                animData.trackingRef = entity.frame
            else:
                frameDelta = entity.frame - animData.trackingRef
                if frameDelta > 16 AND frameDelta < 23:
                    entity.yaw += 2548  // rotate right

            if angleDiff < 0x1FFE:
                entity.targetState = 1

        case 4 (narrow attack):
            if animData.trackingRef != 0: break  // already hit
            if entity.touchBits & 0x3FF8000:
                Lara.health -= ATTACK_DAMAGE
                set Lara flags bit 4
                animData.trackingRef = 1  // prevent multi-hit

        case 5 (wide attack):
            if animData.trackingRef != 0: break
            if entity.touchBits & 0x3FFFFF0:
                Lara.health -= ATTACK_DAMAGE
                set Lara flags bit 4
                animData.trackingRef = 1

        case 6 (grab):
            if (entity.touchBits & 0x3FF8000) OR Lara.health < 1:
                entity.targetState = 11  // grab hold

                // Teleport Lara to entity
                Lara.animation = grabDeathAnimation
                Lara.frame = animation start
                Lara.currentState = 46
                Lara.targetState = 46
                Lara.room = entity.room
                Lara.position = entity.position
                Lara.yaw = entity.yaw
                clear Lara gravity flag
                Lara.health = -1  // instant kill
                Lara.pitch = 0
                Lara.xzSpeed = 0
                set global state flags
                oxygen = -1
                gunType = 1

        case 7 (walk):
            // Smooth turn toward Lara (±0x222 per frame)
            turnDelta = clamp(angleDiff, -0x222, 0x222)
            entity.targetState += turnDelta

            if abs(angleDiff) > ~45° OR distance < ~2592:
                entity.targetState = 1  // stop walking

        case 8 (gravity on):
            set entity flags bit 3 (gravity)
            entity.targetState = 9

        case 11 (grab hold):
            maintain grabbed-state flags

    // === POST-PROCESSING ===
    postProcess:

    // Head tracking (smooth, ±0x38E per frame, ±0x4000 max)
    if animData != null:
        delta = clamp(headAngle - animData[0], -0x38E, 0x38E)
        animData[0] = clamp(animData[0] + delta, -0x4000, 0x4000)

    // Movement
    if entity.currentState == 9:
        ProcessEntityAnimation(entity)
        if entity.floor < entity.y:
            clear gravity flag
            entity.targetState = 1
            entity.y = entity.floor
            set landing timer = 500
    else:
        ProcessEntityMovement(entityId, 0, 0)

    // Death explosion (flags check)
    if (entity.flags & 6) == 4:
        SoundEffect(171, entity.position, 0)
        triggerExplosion(entityId, -1, 250)  // 280 on NG+
        activate linked entity for game sequence
        DeactivateEntity(entityId)
        set entity dead flag
        trigger game event (14, 100)
```
