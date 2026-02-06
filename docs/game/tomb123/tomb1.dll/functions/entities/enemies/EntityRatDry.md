# Function: EntityRatDry

## Description
AI behaviour for the land rat. A small ground enemy that runs toward Lara and bites on contact. Uses a caller-provided Y reference to locate the water surface via internal height queries — needed because the room can flip to a flooded state. While alive, gradually adjusts its Y position toward the water surface when water is present (wading). On death, either stays active on certain levels or deactivates and checks for water to determine the death pose.

## Notes
- Only called by the game loop for entities on the active processing list (`ENTITY_STATUS` bit 0 set)
- Called with the entity's index into the entity array plus a Y reference for water surface detection
- The second parameter is typed as `pointer` for 64-bit width but represents a Y coordinate value used in water height queries
- When activated (status flags pending), the Y reference is zeroed before continuing
- Touch bitmask for attacks: specific body-part touch mask
- Bite (state 2) uses `GetBonePosition` to create a hit effect at the head
- Head yaw tracking via AI data joint (with per-frame and total rotation limits)
- `UpdateEnemyMood` called with aggressive flag set
- While alive: after movement, gradually adjusts entity Y toward water height when water is present. If no water found, transitions to a different animation set
- On death (level 8 specifically): entity stays active with status flags preserved — likely for a level-specific visual (rats remain visible). On all other levels: AI deactivated, entity removed from processing list
- Dead with no water: transitions to land death animation, placed on floor (state 5)
- Dead with water: stays in water death state (state 3)
- On death, head joint tracks toward center (0) rather than toward Lara

### States

| State | Name          | Description                                                  |
|-------|---------------|--------------------------------------------------------------|
| 1     | Run           | Standard movement; transitions to bite on facing + contact   |
| 2     | Bite          | Attack state; damages Lara via `GetBonePosition` head lookup |
| 3     | Death (water) | Water death animation; head centers                          |
| 5     | Death (land)  | Land death; entity placed on floor                           |

### Damage

**Bite (state 2):**

| Condition              | Damage |
|------------------------|--------|
| Normal                 | -20    |
| New Game Plus (hard)   | -50    |

- Sets bit 4 of Lara's `ENTITY_STATUS`
- Bite only triggers once per contact engagement (tracked via queued state, reset when returning to run)

### Turn Rate

| Context | Rate  |
|---------|-------|
| Running | medium |

## Details

| Field     | Value                          |
|-----------|--------------------------------|
| Usage     | `Hook & Call`                  |
| Params    | `int`, `pointer`               |
| Return    | `void`                         |

### Parameters

| #   | Type      | Description                                              |
|-----|-----------|----------------------------------------------------------|
| 0   | `int`     | Entity index in the entity array                         |
| 1   | `pointer` | Y coordinate reference for water surface height queries  |

## Usage
### Hooking
```javascript
// Log rat bite damage
mod.hook('EntityRatDry')
    .onEnter(function(entityId, waterY) {
        const entities = game.readVar(game.module, 'Entities');
        const entity = entities.add(entityId * ENTITY_SIZE);
        const state = entity.add(ENTITY_CURRENT_STATE).readS16();
        log('Land rat', entityId, 'state:', state);
    });
```

### Calling from mod code
```javascript
game.callFunction(game.module, 'EntityRatDry', ratEntityIndex, ptr(waterYValue));
```

## Pseudocode
```
function EntityRatDry(entityId, waterY):
    entity = entities[entityId]

    // Activation check
    if entity[ENTITY_STATUS] activation bits pending:
        waterY = 0
        if not activateAI(entityId): return
        clear pending bits

    // --- Dead ---
    if entity[ENTITY_HEALTH] <= 0:
        if currentState != 3 (death):
            set death animation (base + 2)
            set state = 3

        // Head tracking toward center (0)
        if AI data head joint exists:
            adjust joint toward 0 (with per-frame and total rotation limits)

        ProcessEntityAnimation(entity)

        // Check if death animation completed (status flags)
        if entity status indicates completion:
            set internal health marker
            if levelId == 8:
                keep entity active (preserve status flags)
            else:
                deactivate AI (decrement active count, clear pointer)
                remove from processing entity list

        // Water check for death pose
        waterHeight = queryWaterSurfaceHeight(entityX, waterY, entityZ, entityRoom)
        if waterHeight == NO_HEIGHT:
            set speed to land movement value
            set land death animation
            entityY = floor height
            set state = 5 (land death)
        return

    // --- Alive ---
    SenseLara(entity, trackData)
    headYaw = trackData.turnAngle if facing
    UpdateEnemyMood(entity, trackData, aggressive=true)
    turnDelta = TurnTo(entity, RUN_TURN_RATE)

    switch entity[ENTITY_CURRENT_STATE]:
        case 1 (run):
            if facing and contact detected:
                targetState = 2 (bite)

        case 2 (bite):
            if bite not yet delivered and facing and contact detected:
                GetBonePosition(entity, pos, boneIndex)
                create damage effect at head position
                if normal or low NG+ difficulty:
                    Lara health -= 20
                else (hard NG+):
                    Lara health -= 50
                set Lara ENTITY_STATUS bit 4
                mark bite delivered
            targetState = 0

    // Head tracking
    if AI data head joint exists:
        adjust joint toward headYaw (with per-frame and total rotation limits)

    // Water surface check
    waterHeight = queryWaterSurfaceHeight(entityX, ..., entityZ, entityRoom)
    if waterHeight == NO_HEIGHT:
        transition to water-mode animation set
        set speed and state from animation

    // Movement
    savedY = entityY
    entityY = floor height  // ground the entity for movement calculation
    ProcessEntityMovement(entityId, turnDelta, 0)

    // Adjust Y toward water surface if water present
    if savedY != NO_HEIGHT:
        move entityY gradually toward waterHeight
```
