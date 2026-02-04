# Function: EntityMutant

## Description
AI behaviour for the Atlantean mutant — the most complex enemy in TR1 with 14 states, three melee attack ranges, two ranged projectile types (large slow projectile and fast shard), and a flying mode for one model variant. Handles three model types (20 = winged, 21 = grounded, 22 = another variant) with model-specific behavior. The winged mutant (model 20) can enter a flying state with reconfigured AI sensing. On death, explodes with a sound effect and deactivates. Has extensive level-specific kill tracking for end-game events.

## Notes
- Only called by the game loop for entities on the active processing list (`ENTITY_STATUS` bit 0 set)
- Called with the entity's index into the entity array, not a pointer
- **Three model variants**: model 20 (winged, can fly), model 21 (grounded), model 22 (no visibility check)
- **Death behavior**: calls an explosion effect function. If explosion succeeds, plays sound 0xAB, deallocates AI data, and deactivates. On level 17, if Lara is in room 95 and entityId is 177 or 178, increments a global kill counter — likely tracking specific mutant kills for a level completion event
- If explosion fails on death, skips to movement processing (entity persists)
- **Flying flag** (bit 2 of AI data flags): controls entry to/exit from flying state (13). For model 20 only
  - Set when: can't see Lara AND not in forward/rear aiming arcs AND (not facing or bored or escaping)
  - Cleared when: in flying state AND not escaping AND Lara in same zone
- **AI sensing reconfiguration**: in flying state (13) for model 20, the AI perception parameters are changed (wider range, different sensing) and `SenseLara` is called a second time
- **Mood system**: flying state with flag uses aggressive mood. All other states use passive mood (0)
- **Targeting**: determines two directional booleans — "Lara ahead" (forward arc) and "Lara behind" (rear arc). These control which aiming state to use and which projectile type to fire
- Turn rate is dynamic from AI data field
- Head yaw tracking via AI data joint (clamped ±0x38E per frame, ±0x4000 total)
- **Turn rate buffering**: AI data uses a two-slot turn rate system with a flag (bit 3) controlling whether the current rate carries over between frames
- Touch bitmask for melee attacks: 0x678

### States

| State | Name           | Description                                                        |
|-------|----------------|--------------------------------------------------------------------|
| 1     | Idle           | Hub state; extensive branching based on range, direction, contact   |
| 2     | Walk           | Slow patrol (turn rate 0x16C); random transitions                  |
| 3     | Run            | Fast pursuit (turn rate 0x444); close attack transition             |
| 4     | Ranged attack  | Fires from bone position; medium damage                            |
| 6     | Patrol         | Wandering/patrol state; mood-based transitions                     |
| 7     | Close attack   | Running attack from bone position; lower damage                    |
| 8     | Melee attack   | Close-range attack; highest damage                                 |
| 9     | Aim front      | Sets front-aim flag; transitions to shoot (11)                     |
| 10    | Aim rear       | Sets rear-aim flag; transitions to shoot (11)                      |
| 11    | Shoot          | Fires large projectile (front aim) or fast shard (rear aim)        |
| 12    | Transition     | Returns to idle                                                    |
| 13    | Flying         | Model 20 only; reconfigured sensing; returns to idle on landing    |

### State Transitions

**State 1 (idle):**
- Clears aim flag bits (0-3)
- Flying flag set → 13 (fly)
- Touch contact (0x678):
  - Very close (< 90000) → 8 (melee)
  - Otherwise → 8 (melee)
- Facing + very close (< 90000) → 8 (melee)
- Facing + medium range (< 360000) → 4 (ranged attack)
- Lara ahead → 9 (aim front)
- Lara behind → 10 (aim rear)
- Bored or stalking close → 6 (patrol)
- Otherwise → 3 (run)

**State 2 (walk, 0x16C):**
- If no aim flags AND not in attack/escape mood:
  - Bored + random → 6 (patrol)
  - Stalking + far (> 0x1440000) → 1 (idle)
- Falls through to → 1 (idle) or stays

**State 3 (run, 0x444):**
- If no flying flag AND no contact AND (not facing or far):
  - Facing + close (< 0x640000) → 7 (close attack)
  - If Lara not ahead/behind AND not bored/stalking close → stays running
- Otherwise → 1 (idle)

**State 4 (ranged attack):**
- If not yet fired AND touch contact (0x678): fires from bone position, sets queued = 1

**State 6 (patrol):**
- If no aim flags AND no flying flag:
  - Stalking + close (< 0x1440000): same zone or random → 2 (walk)
  - Bored + random → 2 (walk)
  - Attack/escape mood → 1 (idle)
- Otherwise → 1 (idle)

**State 7 (close attack):**
- If not yet fired AND touch contact (0x678): fires from bone position, sets queued = 3

**State 8 (melee):**
- If not yet fired AND touch contact (0x678): fires from bone position, sets queued = 1

**State 9 (aim front):**
- Sets flag bits 0 + 3 (large projectile type)
- Lara still ahead → 11 (shoot)
- Otherwise → 1 (idle)

**State 10 (aim rear):**
- Sets flag bit 1 (bullet)
- Lara still behind → 11 (shoot)
- Otherwise → 1 (idle)

**State 11 (shoot):**
- If flag bit 0 set: clears it, fires a large slow projectile from bone position
- Elif flag bit 1 set: clears it, fires a fast shard projectile from bone position

**State 13 (flying, model 20 only):**
- If flying flag cleared AND entity on ground (animation at base position) → 1 (idle)

### Damage

**Ranged attack (state 4):**

| Condition              | Damage |
|------------------------|--------|
| Normal                 | -150   |
| New Game Plus (hard)   | -180   |

**Close attack (state 7):**

| Condition              | Damage |
|------------------------|--------|
| Normal                 | -100   |
| New Game Plus (hard)   | -150   |

**Melee attack (state 8):**

| Condition              | Damage |
|------------------------|--------|
| Normal                 | -200   |
| New Game Plus (hard)   | -300   |

- All melee attacks require touch contact (0x678) and set bit 4 of Lara's `ENTITY_STATUS`
- All melee attacks use `getAttackOrigin` + a projectile/impact creation function from the same bone
- States 9/10/11 fire projectiles (large slow projectile / fast shard) — damage determined by projectile type

### Level-Specific Kill Tracking

When Lara dies from an attack on specific NG+ conditions:

| Level(s) | Tracking Flag  | Note                            |
|----------|----------------|---------------------------------|
| 10–11    | 0x8000000      | —                               |
| 12       | Model-specific | Model 21: 0x10000000, Model 20: flag 4 (different var) |
| 14–15    | Model-specific | Same as level 12                |

### Turn Rates

| Context | Rate  |
|---------|-------|
| Walking | 0x16C |
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
// Log mutant attack types
mod.hook('EntityMutant')
    .onEnter(function(entityId) {
        const entities = game.readVar(game.module, 'Entities');
        const entity = entities.add(entityId * ENTITY_SIZE);
        this._state = entity.add(ENTITY_CURRENT_STATE).readS16();
    })
    .onLeave(function(returnValue, entityId) {
        const entities = game.readVar(game.module, 'Entities');
        const entity = entities.add(entityId * ENTITY_SIZE);
        const newState = entity.add(ENTITY_CURRENT_STATE).readS16();
        const model = entity.add(ENTITY_MODEL).readS16();
        if (newState === 13 && this._state !== 13) {
            log('Winged mutant', entityId, 'taking flight');
        }
        if (newState === 11) {
            log('Mutant', entityId, '(model', model + ') firing projectile');
        }
    });
```

### Calling from mod code
```javascript
game.callFunction(game.module, 'EntityMutant', mutantEntityIndex);
```

## Pseudocode
```
function EntityMutant(entityId):
    entity = entities[entityId]

    // Activation check
    if entity[ENTITY_STATUS] activation bits pending:
        if not activateAI(entityId): return
        clear pending bits

    aiData = entity[AI_DATA_POINTER]
    laraAhead = false
    laraBehind = false
    headYaw = 0

    // --- Dead ---
    if entity[ENTITY_HEALTH] <= 0:
        exploded = triggerExplosionEffect(entityId, 0xFFFFFFFF, 100)
        if exploded:
            sfx(0xAB, entity)
            deallocate AI data
            DeactivateEntity(entityId)
            set entity pending bit
            // Level 17: track specific mutant kills
            if levelId == 17 and Lara.room == 95 and entityId in [177, 178]:
                increment global kill counter
            return
        skip to turn rate management + movement

    // --- Alive ---
    // Configure AI perception defaults
    aiData.senseConfig = default values

    SenseLara(entity, trackData)

    // Determine directional targeting (skip for model 22)
    if entity.model != 22:
        canTarget = checkTargetVisibility(entity, trackData)
        if canTarget:
            if different zone or distance > 0xE10000:
                // Check angle — Lara ahead or behind?
                if angle in forward arc: laraAhead = true
                elif angle in rear arc: laraBehind = true

    // --- Model 20 (winged) flying logic ---
    if entity.model == 20:
        if currentState == 13 (flying):
            // May clear flying flag if not escaping and same zone
            if flyingFlag set and mood != escape and same zone:
                clear flyingFlag
            if flyingFlag not set:
                UpdateEnemyMood(entity, trackData, aggressive=true)
            // Reconfigure sensing for flight
            aiData.senseConfig = flight values (wider range)
            SenseLara(entity, trackData)  // re-sense with flight params
        else:
            // Not flying: set flying flag when conditions met
            if different zone AND not laraAhead AND not laraBehind AND
               (not facing or bored) OR escape mood:
                set flyingFlag

    headYaw = trackData.turnAngle if facing

    // Mood update
    if currentState == 13 and flyingFlag set:
        UpdateEnemyMood(entity, trackData, aggressive=true)
    else:
        UpdateEnemyMood(entity, trackData, passive=false)

    turnDelta = TurnTo(entity, aiData.turnRate)

    switch entity[ENTITY_CURRENT_STATE]:
        case 1 (idle):
            clear aim flag bits (0-3)
            if flyingFlag: targetState = 13 (fly)
            elif touch contact (0x678):
                if very close (< 90000): targetState = 8 (melee)
                else: targetState = 8 (melee)
            elif facing and very close (< 90000): targetState = 8 (melee)
            elif facing and medium (< 360000): targetState = 4 (ranged)
            elif laraAhead: targetState = 9 (aim front)
            elif laraBehind: targetState = 10 (aim rear)
            elif bored or stalking close: targetState = 6 (patrol)
            else: targetState = 3 (run)

        case 2 (walk):
            aiData.turnRate = 0x16C
            if not laraAhead and not laraBehind and not flyingFlag:
                mood-based: random → 6, stalking+far → 1
            else: → 1 (idle)

        case 3 (run):
            aiData.turnRate = 0x444
            if not flyingFlag and no contact and (not facing or far):
                if facing + close (< 0x640000): targetState = 7 (close attack)
                elif conditions to keep running: stay
            else: → 1 (idle)

        case 4 (ranged attack):
            if not yet fired and touch contact (0x678):
                pos = getAttackOrigin(entity, boneData)
                createImpactEffect(pos, entity.yaw, entity.room)
                if normal: Lara health -= 150
                else (hard NG+): Lara health -= 180
                set Lara ENTITY_STATUS bit 4
                level-specific kill tracking if Lara dead
                queued = 1

        case 6 (patrol):
            headYaw = 0
            if not laraAhead and not laraBehind and not flyingFlag:
                mood-based transitions to walk (2) or idle (1)
            else: → 1 (idle)

        case 7 (close attack):
            if not yet fired and touch contact (0x678):
                pos = getAttackOrigin(entity, boneData)
                createImpactEffect(pos, entity.yaw, entity.room)
                if normal: Lara health -= 100
                else (hard NG+): Lara health -= 150
                set Lara ENTITY_STATUS bit 4
                level-specific kill tracking if Lara dead
                queued = 3

        case 8 (melee):
            if not yet fired and touch contact (0x678):
                pos = getAttackOrigin(entity, boneData)
                createImpactEffect(pos, entity.yaw, entity.room)
                if normal: Lara health -= 200
                else (hard NG+): Lara health -= 300
                set Lara ENTITY_STATUS bit 4
                level-specific kill tracking if Lara dead
                queued = 1

        case 9 (aim front):
            flags |= 9  // bits 0 + 3 (large projectile)
            if laraAhead: targetState = 11 (shoot)
            else: targetState = 1 (idle)

        case 10 (aim rear):
            flags |= 2  // bit 1 (bullet)
            if laraBehind: targetState = 11 (shoot)
            else: targetState = 1 (idle)

        case 11 (shoot):
            if flags bit 0 set:
                clear bit 0
                pos = getAttackOrigin(entity, projectileBoneData)
                fireSlowProjectile(pos, entity.yaw, entity.room, entity.model)
            elif flags bit 1 set:
                clear bit 1
                pos = getAttackOrigin(entity, shardBoneData)
                fireShardProjectile(pos, entity.yaw, entity.room, entity.model)

        case 12 (transition):
            → 1 (idle)

        case 13 (flying):
            if flyingFlag cleared and entity on ground:
                → 1 (idle)

    // Turn rate management
    if flags bit 3 not set:
        aiData.currentTurnRate = aiData.bufferedTurnRate

    // Head tracking
    if AI data head joint exists:
        adjust joint toward headYaw (±0x38E per frame, clamped ±0x4000)

    // Turn rate buffer swap
    if flags bit 3 not set:
        aiData.bufferedTurnRate = aiData.currentTurnRate
        aiData.currentTurnRate = 0

    ProcessEntityMovement(entityId, turnDelta, 0)
```
