# Function: EntityCentaur

## Description
AI behaviour for the Atlantean centaur — a ranged and melee enemy that fires `ShootAtlanteanMeatball` projectiles and has a powerful stomping melee attack. Uses 6 states with a simple aim→shoot loop for ranged combat and a contact-based melee stomp. On death, explodes with a sound effect and deactivates.

## Notes
- Only called by the game loop for entities on the active processing list (`ENTITY_STATUS` bit 0 set)
- Called with the entity's index into the entity array, not a pointer
- **Activation**: if status has both pending bits set (bits 1+2), attempts AI activation — if it fails, returns immediately
- **Death behaviour**: if health ≤ 0, calls combat tracking (level 9) and sets death state (5) with a forced animation. Level 9: sets a global death tracking flag
- **Ranged attack**: state 2 fires `ShootAtlanteanMeatball` from a bone position via `GetBonePosition`. Copies the spawned projectile's angle data to the AI tracking field
- **Melee attack**: state 6 triggers on contact mask 0x30199, uses `GetBonePosition` for hit positioning, creates an impact effect
  - Damage: -200 normal, -300 NG+ hard
  - Sets Lara `ENTITY_STATUS` bit 4
- **Level-specific kill tracking**: level 19, entity in room 38 — sets a death tracking flag on kill
- **Death explosion**: after movement processing, if status indicates pending death (bit 2 set, bit 1 clear): plays sound 171, triggers explosion effect with flash intensity 100, deactivates entity
- Turn rate: 0x2D8 (728) via `TurnTo`
- `UpdateEnemyMood` called with aggressive flag (1)
- Head yaw tracking via AI data joint (clamped ±0x38E per frame, ±0x4000 total)
- Visibility check function used to gate ranged vs melee decisions

### States

| State | Name   | Description                                                      |
|-------|--------|------------------------------------------------------------------|
| 1     | Idle   | Hub state; branches to aim, run, or uses queued state            |
| 2     | Shoot  | Fires `ShootAtlanteanMeatball` from `GetBonePosition`           |
| 3     | Run    | Pursuit; visibility-based transitions to aim or melee            |
| 4     | Aim    | Transition state; checks visibility → shoot or idle              |
| 5     | Death  | Death animation; level-specific tracking                         |
| 6     | Stomp  | Melee contact attack; -200/-300 damage                           |

### Damage

| Attack | Touch Mask | Normal | NG+ Hard |
|--------|------------|--------|----------|
| Stomp  | 0x30199    | -200   | -300     |

### State Transitions

**State 1 (idle):**
- If queued state exists → use queued
- If not in same zone OR distance > ~2.3M: check visibility → can see Lara → 4 (aim)
- Otherwise → 3 (run)

**State 2 (shoot):**
- On first fire (queued == 0):
  - Sets queued to 4 (return to aim after shot)
  - `GetBonePosition` for muzzle position with weapon bone data
  - Fires `ShootAtlanteanMeatball` with entity's yaw, room, and model
  - If projectile spawned: copies projectile angle to AI tracking

**State 3 (run):**
- If not in same zone OR far away:
  - Check visibility → can see → queue aim (target 1, queued 4)
  - Else random chance → queue melee (target 1, queued 6)
- Otherwise → target 1, queued 6 (melee approach)

**State 4 (aim):**
- If queued state → use queued
- Else: check visibility → can see → 2 (shoot), else → 1 (idle)

**State 6 (stomp):**
- If not yet fired AND contact (0x30199):
  - `GetBonePosition` for stomp position with melee bone data
  - Create impact effect at position
  - Damage Lara: -200 (or -300 NG+ hard)
  - Set Lara `ENTITY_STATUS` bit 4
  - Set queued = 1
  - Level 19 + room 38: set death tracking flag if Lara dead

## Details

| Field     | Value                          |
|-----------|--------------------------------|
| Usage     | `Hook`                         |
| Params    | `int`                          |
| Return    | `void`                         |

### Parameters

| #   | Type  | Description                          |
|-----|-------|--------------------------------------|
| 0   | `int` | Entity index in the entity array     |

## Usage
### Hooking
```javascript
// Monitor centaur attacks
mod.hook('EntityCentaur')
    .onEnter(function(entityId) {
        const entities = game.readVar(game.module, 'Entities');
        const entity = entities.add(entityId * ENTITY_SIZE);
        const state = entity.add(ENTITY_STATE).readS16();
        if (state === 2) {
            log('Centaur shooting at Lara');
        } else if (state === 6) {
            log('Centaur stomping');
        }
    });
```

## Pseudocode
```
function EntityCentaur(entityId):
    entity = entities[entityId]

    // Activation check
    if entity status has both pending bits:
        if activateEnemyAI(entityId) fails: return
        clear extra pending bit, keep active

    headYaw = 0
    turnDelta = 0

    // --- Death ---
    if entity.health <= 0:
        if level == 9: call combat tracking
        if entity.state != 5:
            set death animation + state 5
            if level == 9: set global death flag
    else:
        // --- Alive ---
        SenseLara(entity, aiData)
        if level == 9:
            call visibility check + combat tracking

        if aiData.inSameZone:
            headYaw = aiData.relativeAngle

        UpdateEnemyMood(entity, aiData, 1)  // aggressive
        turnDelta = TurnTo(entity, 0x2D8)

        switch entity.state:
            case 1 (idle):
                aiData.headYaw = 0
                if queued state:
                    targetState = queued
                elif not inSameZone or distance > 0x23FFFF:
                    if canSeeLara: targetState = 4 (aim)
                else:
                    targetState = 3 (run)

            case 2 (shoot):
                if not yet fired (queued == 0):
                    queued = 4
                    GetBonePosition(entity, weaponPos, weaponBoneIndex)
                    projectileId = ShootAtlanteanMeatball(pos.x, pos.y, pos.z,
                        entity.speed, entity.yaw, entity.room, entity.model)
                    if projectileId != -1:
                        copy projectile angle to AI tracking

            case 3 (run):
                if not inSameZone or distance > 0x23FFFF:
                    if canSeeLara:
                        target = 1, queued = 4  // idle → aim
                    elif random chance:
                        target = 1, queued = 6  // idle → stomp
                else:
                    target = 1, queued = 6  // idle → stomp

            case 4 (aim):
                if queued: targetState = queued
                else:
                    if canSeeLara: targetState = 2 (shoot)
                    else: targetState = 1 (idle)

            case 6 (stomp):
                if not yet fired and contact (0x30199):
                    GetBonePosition(entity, stompPos, stompBoneIndex)
                    createImpactEffect(pos, entity.yaw, entity.room)
                    if normal or easy NG+:
                        Lara.health -= 200
                    else (hard NG+):
                        Lara.health -= 300
                    set Lara ENTITY_STATUS bit 4
                    queued = 1
                    if Lara dead and level-specific conditions:
                        set death tracking flag

    // Head yaw tracking
    adjust AI data head yaw toward headYaw (clamped ±0x38E, ±0x4000)

    ProcessEntityMovement(entityId, turnDelta, 0)

    // Death explosion (post-movement)
    if status bits indicate pending death:
        SoundEffect(171, entity.position, 0)
        triggerExplosionEffect(entityId, -1, 100)
        deactivateEntity(entityId)
        update status flags
```
