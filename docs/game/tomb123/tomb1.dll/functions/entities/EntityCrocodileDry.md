# Function: EntityCrocodileDry

## Description
AI behaviour for the land crocodile. Walks on land using standard AI, biting Lara on contact. Uses a caller-provided Y reference to locate the water surface via internal height queries — needed because the room the croc is in can flip to a flooded alternative. If the room becomes water, the croc transitions to a surface-level state. On death, the body drifts to the water surface and deactivates; if no water remains, a land death animation plays instead.

## Notes
- Only called by the game loop for entities on the active processing list (`ENTITY_STATUS` bit 0 set)
- Called with the entity's index into the entity array plus a Y reference for water surface detection
- The second parameter is typed as `pointer` for 64-bit width but represents a Y coordinate value used in water height queries — the query function needs a Y reference to determine which room layer to check in vertically stacked rooms
- When activated (status flags pending), the Y reference is zeroed before continuing
- Alive: walks on land with standard AI; checks for water beneath — if water appears (room flip), transitions to a ground animation at the floor and updates AI zone data; otherwise keeps entity near the water surface (0x100 units above)
- Dead with water: body moves toward the water surface at 0x20 per frame, AI deactivated on arrival
- Dead without water: land death animation, entity placed on floor via `GetSector` + `CalculateFloorHeight`
- Bite damage uses a bone position lookup to create a hit effect at the head
- Head yaw tracking via AI data joint (with per-frame and total rotation limits)
- `UpdateEnemyMood` called with aggressive flag set
- Contact check uses `ENTITY_TOUCH_BITS` (non-zero = touching)

### States

| State | Name          | Description                                                        |
|-------|---------------|--------------------------------------------------------------------|
| 1     | Idle          | Default state; transitions to bite on facing + contact             |
| 2     | Bite          | Attack state; damages Lara via head bone position, returns to idle |
| 3     | Death (water) | Water death; body drifts to water surface                          |
| 7     | Death (land)  | Fallback land death if water is absent                             |

### Damage

**Bite (state 2):**

| Condition              | Damage |
|------------------------|--------|
| Normal                 | -100   |
| New Game Plus (hard)   | -180   |

- Sets bit 4 of Lara's `ENTITY_STATUS`
- Bite only triggers once per contact engagement (tracked via internal bite flag, reset when returning to idle)
- If Lara dies from the bite under certain game version conditions, sets a tracking flag

### Turn Rate

| Context | Rate  |
|---------|-------|
| Walking | medium |

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
// Log land croc state and water reference
mod.hook('EntityCrocodileDry')
    .onEnter(function(entityId, waterY) {
        const entities = game.readVar(game.module, 'Entities');
        const entity = entities.add(entityId * ENTITY_SIZE);
        const health = entity.add(ENTITY_HEALTH).readS16();
        const state = entity.add(ENTITY_CURRENT_STATE).readS16();
        log('Land croc', entityId, 'state:', state, 'health:', health);
    });
```

### Calling from mod code
```javascript
game.callFunction(game.module, 'EntityCrocodileDry', crocEntityIndex, ptr(waterYValue));
```

## Pseudocode
```
function EntityCrocodileDry(entityId, waterY):
    entity = entities[entityId]

    // Activation check
    if entity[ENTITY_STATUS] activation bits pending:
        waterY = 0
        if not activateAI(entityId): return
        clear pending bits

    aiData = entity[AI_DATA_POINTER]

    // --- Dead ---
    if entity[ENTITY_HEALTH] <= 0:
        if currentState != 3 (water death):
            set water death animation
            set state = 3, set internal health marker

        waterHeight = queryWaterSurfaceHeight(entityX, waterY, entityZ, entityRoom)

        if waterHeight == NO_HEIGHT:
            set land death animation
            set state = 7
            floor = GetSector(entityX, entityY, entityZ, &room)
            entityY = CalculateFloorHeight(floor, entityX, entityY, entityZ)
            verticalSpeed = 0
        else:
            if entity far from water surface:
                move entityY gradually toward waterHeight
            elif entity reached water surface:
                entityY = waterHeight
                deactivate AI (decrement active count, clear AI pointer)

        ProcessEntityAnimation(entity)
        update sector and room if changed
        return

    // --- Alive ---
    SenseLara(entity, trackData)
    headYaw = trackData.turnAngle if facing
    UpdateEnemyMood(entity, trackData, aggressive=true)
    TurnTo(entity, WALK_TURN_RATE)

    switch entity[ENTITY_CURRENT_STATE]:
        case 1 (idle):
            if facing and contact:
                targetState = 2 (bite)
                reset bite tracker

        case 2 (bite):
            if facing and contact and bite not yet delivered:
                get bone position (head)
                create damage effect at head position
                if normal or low NG+ difficulty:
                    Lara health -= 100
                else (hard NG+):
                    Lara health -= 180
                set Lara ENTITY_STATUS bit 4
                mark bite delivered
                if Lara dead and specific game version:
                    set death tracking flag
            targetState = 1

    // Head tracking
    if AI data head joint exists:
        adjust joint toward headYaw (with per-frame and total rotation limits)

    // Water surface check
    waterHeight = queryWaterSurfaceHeight(entityX, ..., entityZ, entityRoom)
    if waterHeight == NO_HEIGHT:
        transition to ground animation
        entityY = floor height
        verticalSpeed = 0
        update AI zone data for ground mode
    else:
        keep entityY near waterHeight (slightly below surface)

    ProcessEnemyMovement(entityId, 0, 0)
```
