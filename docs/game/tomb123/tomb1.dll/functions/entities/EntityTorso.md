# Function: EntityTorso

## Description
AI behaviour for the giant mutant torso — the final boss encounter in Tomb Raider 1. A legless creature that turns, walks, and uses two melee attacks plus an instant-kill grab. Deals contact damage every frame while touching Lara. The grab attack becomes available when Lara's health drops below a threshold, teleporting Lara to the entity and forcing a death animation. On death, triggers an explosion effect, activates a linked entity for the next game sequence, and fires a game event.

## Notes
- Only called by the game loop for entities on the active processing list (`ENTITY_STATUS` bit 0 set)
- Called with the entity's index into the entity array, not a pointer
- Uses `SenseLara` for AI tracking, `UpdateEnemyMood` with parameter 1 (aggressive), and a combat state tracking function each frame
- Visibility checked via line-of-sight function every frame while alive
- **Contact damage**: every frame while touch bits are non-zero — sets Lara's `ENTITY_STATUS` bit 4
- **Lara health threshold**: 500 (normal) or 900 (NG+) — determines whether the torso uses regular attacks or the grab
  - Above threshold: regular attacks (states 4/5)
  - At or below threshold: grab attack (state 6) when close, walk (state 7) when far
  - In NG+, the threshold is 900 (out of 1000), meaning the grab becomes available almost immediately
- **Asymmetric turning**: left turn applies −0x666 rotation per frame, right turn applies +0x9F4 per frame — both only during specific animation frame windows
- Head yaw tracking via behaviour data (clamped ±0x38E per frame, ±0x4000 total)
- No turn delta passed to `ProcessEntityMovement` — all steering done via state-based rotation
- State 9 (falling) uses `ProcessEntityAnimation` only, no full movement processing
- **Death sequence**: plays `SoundEffect` 171, triggers explosion effect (radius 250 normal, 280 NG+), activates entity 86 for the game sequence, deactivates self, fires game event (14, 100) on non-NG+ conditions

### States

| State | Name            | Description                                                          |
|-------|-----------------|----------------------------------------------------------------------|
| 1     | Idle            | Decision hub — routes to turns, attacks, grab, or walk               |
| 2     | Turn Left       | Applies −0x666 rotation (frames 14–22); returns when angle in range  |
| 3     | Turn Right      | Applies +0x9F4 rotation (frames 17–22); returns when angle in range  |
| 4     | Attack (narrow) | Touch mask 0x3FF8000; deals heavy damage on contact                  |
| 5     | Attack (wide)   | Touch mask 0x3FFFFF0; deals heavy damage on contact                  |
| 6     | Grab            | On contact or Lara death: teleports Lara, forces death animation     |
| 7     | Walk            | Approaches Lara with ±0x222 turn smoothing per frame                 |
| 8     | Gravity On      | Enables gravity flag, transitions to 9                               |
| 9     | Falling         | Falls with gravity; on landing: resets to idle, snaps to floor       |
| 10    | Death           | Forced on health ≤ 0; sets death animation                          |
| 11    | Grab Hold       | Maintains grabbed-state flags while Lara's death animation plays     |

### State Transitions

**State 1 (idle):**
- Clears a tracking field in behaviour data
- Angle to target ≥ 0x1FFF → 3 (turn right)
- Angle to target ≤ −0x1FFE → 2 (turn left)
- Distance² ≥ 0x672640 → 7 (walk)
- Close + Lara health > threshold → 4 or 5 (~50/50 random)
- Close + Lara health ≤ threshold + distance² < 0x4D3F64 → 6 (grab)
- Close + Lara health ≤ threshold + distance² ≥ 0x4D3F64 → 7 (walk)

**State 2 (turn left):**
- Stores a reference animation frame on first tick
- Between frames 14–22 of animation: applies −0x666 rotation
- Returns to idle (1) when angle > −0x1FFE

**State 3 (turn right):**
- Same reference frame pattern as turn left
- Between frames 17–22: applies +0x9F4 rotation
- Returns to idle (1) when angle < 0x1FFE

**States 4/5 (attacks):**
- One-hit-per-attack: tracked via behaviour data field (prevents multi-hit)
- State 4 requires contact with touch mask 0x3FF8000 (narrower body area)
- State 5 requires contact with touch mask 0x3FFFFF0 (wider body area)
- Both deal −500 (normal) or −900 (NG+ hard) on hit

**State 6 (grab):**
- Triggers on contact (touch mask 0x3FF8000) or if Lara is already dead
- Teleports Lara to the entity's position and room
- Forces Lara into a death animation (state 46), sets health to −1
- Clears Lara's gravity, speed, and pitch
- Sets oxygen to max negative, forces weapon type, sets global flags
- Transitions to state 11 (grab hold)

**State 7 (walk):**
- Smoothly turns toward target (±0x222 clamp per frame)
- Returns to idle (1) when angle > ~45° or distance < 0x672640

### Damage

| Attack               | Normal | NG+ Hard |
|----------------------|--------|----------|
| Contact (per frame)  | −5     | −10      |
| Attack (states 4/5)  | −500   | −900     |
| Grab (state 6)       | instant kill | instant kill |

- All melee damage sets bit 4 of Lara's `ENTITY_STATUS`

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
    entity = entities[entityId]
    ATTACK_DAMAGE = 500    // 900 on NG+

    // Activation check
    if entity[ENTITY_STATUS] activation bits pending:
        if not activateEnemyAI(entityId): return
        clear pending bits

    behaviourData = entity[BEHAVIOUR_DATA_POINTER]

    // === DEATH ===
    if entity[ENTITY_HEALTH] <= 0:
        callCombatTracking(entity, 0, 0, 0, maxHealth)
        headAngle = 0

        if entity[ENTITY_CURRENT_STATE] != 10:
            force death animation (base + 13)
            entity[ENTITY_CURRENT_STATE] = 10
        goto postProcess

    // === ALIVE ===
    SenseLara(entity, trackData)
    health = entity[ENTITY_HEALTH]
    canSee = checkTargetVisibility(entity, trackData)
    callCombatTracking(entity, canSee, health, 0, maxHealth)

    headAngle = 0
    if trackData.distance != 0:
        headAngle = trackData.angle

    UpdateEnemyMood(entity, trackData, 1)

    // Angle to behaviour target
    angleToTarget = Atan2(target.z - entity[ENTITY_Z], target.x - entity[ENTITY_X])
    angleDiff = angleToTarget - entity[ENTITY_YAW]

    // --- Contact damage (every frame) ---
    if entity[ENTITY_TOUCH_BITS] != 0:
        if NG+ hard:
            Lara[ENTITY_HEALTH] -= 10
        else:
            Lara[ENTITY_HEALTH] -= 5
        set Lara[ENTITY_STATUS] bit 4

    // --- State machine ---
    switch entity[ENTITY_CURRENT_STATE]:
        case 1 (idle):
            if Lara[ENTITY_HEALTH] > 0:
                behaviourData.hitFlag = 0
                if angleDiff >= 0x1FFF:
                    entity[ENTITY_TARGET_STATE] = 3  // turn right
                elif angleDiff <= -0x1FFE:
                    entity[ENTITY_TARGET_STATE] = 2  // turn left
                elif trackData.distanceSq >= 0x672640:
                    entity[ENTITY_TARGET_STATE] = 7  // walk
                elif Lara[ENTITY_HEALTH] > ATTACK_DAMAGE:
                    // Regular attacks — ~50/50 random
                    if random < 50%:
                        entity[ENTITY_TARGET_STATE] = 4  // narrow attack
                    else:
                        entity[ENTITY_TARGET_STATE] = 5  // wide attack
                else:
                    // Health low — grab or approach
                    if trackData.distanceSq < 0x4D3F64:
                        entity[ENTITY_TARGET_STATE] = 6  // grab
                    else:
                        entity[ENTITY_TARGET_STATE] = 7  // walk

        case 2 (turn left):
            // Store reference frame on first tick
            if behaviourData.hitFlag == 0:
                behaviourData.hitFlag = entity[ENTITY_FRAME]
            else:
                frameDelta = entity[ENTITY_FRAME] - behaviourData.hitFlag
                if frameDelta > 13 AND frameDelta < 23:
                    entity[ENTITY_YAW] -= 0x666

            if angleDiff > -0x1FFE:
                entity[ENTITY_TARGET_STATE] = 1

        case 3 (turn right):
            if behaviourData.hitFlag == 0:
                behaviourData.hitFlag = entity[ENTITY_FRAME]
            else:
                frameDelta = entity[ENTITY_FRAME] - behaviourData.hitFlag
                if frameDelta > 16 AND frameDelta < 23:
                    entity[ENTITY_YAW] += 0x9F4

            if angleDiff < 0x1FFE:
                entity[ENTITY_TARGET_STATE] = 1

        case 4 (narrow attack):
            if behaviourData.hitFlag != 0: break  // already hit
            if entity[ENTITY_TOUCH_BITS] & 0x3FF8000:
                Lara[ENTITY_HEALTH] -= ATTACK_DAMAGE
                set Lara[ENTITY_STATUS] bit 4
                behaviourData.hitFlag = 1  // prevent multi-hit

        case 5 (wide attack):
            if behaviourData.hitFlag != 0: break
            if entity[ENTITY_TOUCH_BITS] & 0x3FFFFF0:
                Lara[ENTITY_HEALTH] -= ATTACK_DAMAGE
                set Lara[ENTITY_STATUS] bit 4
                behaviourData.hitFlag = 1

        case 6 (grab):
            if (entity[ENTITY_TOUCH_BITS] & 0x3FF8000) OR Lara[ENTITY_HEALTH] < 1:
                entity[ENTITY_TARGET_STATE] = 11

                // Teleport Lara to entity
                Lara[ENTITY_ANIMATION] = grabDeathAnimation
                Lara[ENTITY_FRAME] = animation start frame
                Lara[ENTITY_CURRENT_STATE] = 46
                Lara[ENTITY_TARGET_STATE] = 46
                Lara[ENTITY_ROOM] = entity[ENTITY_ROOM]
                Lara[ENTITY_X] = entity[ENTITY_X]
                Lara[ENTITY_Y] = entity[ENTITY_Y]
                Lara[ENTITY_Z] = entity[ENTITY_Z]
                Lara[ENTITY_YAW] = entity[ENTITY_YAW]
                clear Lara[ENTITY_STATUS] gravity flag
                Lara[ENTITY_HEALTH] = -1
                Lara[ENTITY_PITCH] = 0
                Lara[ENTITY_XZ_SPEED] = 0
                set global state flags
                LaraOxygen = -1
                LaraGunType = 1

        case 7 (walk):
            // Smooth turn toward Lara (±0x222 per frame)
            turnDelta = clamp(angleDiff, -0x222, 0x222)
            entity[ENTITY_TARGET_STATE] += turnDelta

            if abs(angleDiff) > 0x1FFE OR trackData.distanceSq < 0x672640:
                entity[ENTITY_TARGET_STATE] = 1

        case 8 (gravity on):
            set entity[ENTITY_STATUS] gravity flag
            entity[ENTITY_TARGET_STATE] = 9

        case 11 (grab hold):
            maintain grabbed-state flags

    // === POST-PROCESSING ===
    postProcess:

    // Head yaw tracking (±0x38E per frame, clamped ±0x4000)
    if behaviourData != null:
        delta = clamp(headAngle - behaviourData[0], -0x38E, 0x38E)
        behaviourData[0] = clamp(behaviourData[0] + delta, -0x4000, 0x4000)

    // Movement
    if entity[ENTITY_CURRENT_STATE] == 9:
        ProcessEntityAnimation(entity)
        if entity.floor < entity[ENTITY_Y]:
            clear entity[ENTITY_STATUS] gravity flag
            entity[ENTITY_TARGET_STATE] = 1
            entity[ENTITY_Y] = entity.floor
            set landing timer = 500
    else:
        ProcessEntityMovement(entityId, 0, 0)

    // Death explosion (flags check)
    if entity[ENTITY_STATUS] dying flag set:
        SoundEffect(171, entity.position, 0)
        triggerExplosion(entityId, -1, 250)  // 280 on NG+
        activate entity 86 for game sequence
        deactivateEntity(entityId)
        set entity dead flag
        trigger game event (14, 100) on non-NG+ conditions
```
