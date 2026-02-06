# Function: EntityRatWet

## Description
AI behaviour for the water rat. Swims underwater with passive mood, pursuing Lara with two distinct bite attacks — one from swimming range and one from close range. Has a passive waiting state triggered randomly while swimming. Uses a caller-provided Y reference for water surface height queries. When the water surface is detected, transitions to a land-based animation and repositions at the surface. Faster turning than the land variant.

## Notes
- Only called by the game loop for entities on the active processing list (`ENTITY_STATUS` bit 0 set)
- Called with the entity's index into the entity array plus a Y reference for water surface detection
- The second parameter is typed as `pointer` for 64-bit width but represents a Y coordinate value used in water height queries
- When activated (status flags pending), the Y reference is zeroed before continuing
- `UpdateEnemyMood` called with passive flag (0), unlike the land rat which uses aggressive (1)
- Touch bitmask for attacks: specific body-part touch mask (same as land rat)
- Both bite states use `GetBonePosition` to create a hit effect at the head
- Head yaw tracking via AI data joint (with per-frame and total rotation limits)
- State 2 (water bite) queues state 3 (swim) after biting — returns to swimming
- State 4 (close bite) queues state 1 (idle) after biting — stays near target
- Swim state has random chance to enter passive state 6 via queued transition through idle
- At end of each frame: checks water surface height. If water surface found, transitions to land animation set, sets entity Y to water height, and continues with land movement. If no water, stays in current swim mode
- If Lara dies from a bite under certain game version conditions, sets a death/completion tracking flag

### States

| State | Name       | Description                                                        |
|-------|------------|--------------------------------------------------------------------|
| 1     | Idle       | Decision state; routes based on queued state, distance, and facing |
| 2     | Water bite | Bite from swim range; returns to swimming after                    |
| 3     | Swim       | Standard swimming pursuit; mood-based transitions                  |
| 4     | Close bite | Bite at close range; returns to idle after                         |
| 5     | Death      | Death animation                                                    |
| 6     | Passive    | Waiting/bobbing state; returns to idle on mood change or randomly  |

### State Transitions

**State 1 (idle):**
- If queued state set → use queued state as target
- If not facing or far → 3 (swim)
- If facing and close → 4 (close bite)

**State 2 (water bite):**
- Deals damage on contact, queues state 3 (swim)

**State 3 (swim):**
- Facing + contact → 1 (idle)
- Facing + close → 2 (water bite)
- Random chance while facing → 1 (idle) with queued 6 (passive)

**State 4 (close bite):**
- Deals damage on contact, queues state 1 (idle)

**State 6 (passive):**
- Mood not bored or random chance → 1 (idle)

### Damage

**Bite (states 2 and 4):**

| Condition              | Damage |
|------------------------|--------|
| Normal                 | -20    |
| New Game Plus (hard)   | -50    |

- Sets bit 4 of Lara's `ENTITY_STATUS`
- Each bite only triggers once per engagement (tracked via queued state)

### Turn Rate

| Context  | Rate  |
|----------|-------|
| Swimming | fast  |

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
// Log water rat swim and bite transitions
mod.hook('EntityRatWet')
    .onEnter(function(entityId, surfaceY) {
        const entities = game.readVar(game.module, 'Entities');
        const entity = entities.add(entityId * ENTITY_SIZE);
        this._state = entity.add(ENTITY_CURRENT_STATE).readS16();
    })
    .onLeave(function(returnValue, entityId, surfaceY) {
        const entities = game.readVar(game.module, 'Entities');
        const entity = entities.add(entityId * ENTITY_SIZE);
        const newState = entity.add(ENTITY_CURRENT_STATE).readS16();
        if (newState !== this._state) {
            log('Water rat', entityId, 'state:', this._state, '->', newState);
        }
    });
```

### Calling from mod code
```javascript
game.callFunction(game.module, 'EntityRatWet', ratEntityIndex, ptr(surfaceYValue));
```

## Pseudocode
```
function EntityRatWet(entityId, surfaceY):
    entity = entities[entityId]

    // Activation check
    if entity[ENTITY_STATUS] activation bits pending:
        surfaceY = 0
        if not activateAI(entityId): return
        clear pending bits

    aiData = entity[AI_DATA_POINTER]
    turnDelta = 0
    headYaw = 0

    // --- Dead ---
    if entity[ENTITY_HEALTH] <= 0:
        if currentState != 5 (death):
            set death animation (base + 8)
            set state = 5
        skip to head tracking + movement

    // --- Alive ---
    SenseLara(entity, trackData)
    headYaw = trackData.turnAngle if facing
    UpdateEnemyMood(entity, trackData, passive=true)
    turnDelta = TurnTo(entity, SWIM_TURN_RATE)

    switch entity[ENTITY_CURRENT_STATE]:
        case 1 (idle):
            if queued state set:
                targetState = queued state
            elif not facing or far:
                targetState = 3 (swim)
            else:
                targetState = 4 (close bite)

        case 2 (water bite):
            if bite not delivered and facing and contact detected:
                GetBonePosition(entity, pos, boneIndex)
                create damage effect at head position
                if normal or low NG+ difficulty:
                    Lara health -= 20
                else (hard NG+):
                    Lara health -= 50
                set Lara ENTITY_STATUS bit 4
                queue state 3 (swim)
                if Lara dead and specific game version:
                    set death tracking flag

        case 3 (swim):
            if facing and contact detected:
                targetState = 1 (idle)
            elif facing and close:
                targetState = 2 (water bite)
            elif facing and random chance:
                targetState = 1, queue state 6 (passive)

        case 4 (close bite):
            if bite not delivered and facing and contact detected:
                GetBonePosition(entity, pos, boneIndex)
                create damage effect at head position
                if normal or low NG+ difficulty:
                    Lara health -= 20
                else (hard NG+):
                    Lara health -= 50
                set Lara ENTITY_STATUS bit 4
                queue state 1 (idle)
                if Lara dead and specific game version:
                    set death tracking flag

        case 6 (passive):
            if mood not bored or random chance:
                targetState = 1 (idle)

    // Head tracking
    if AI data head joint exists:
        adjust joint toward headYaw (with per-frame and total rotation limits)

    // Water surface check
    waterHeight = queryWaterSurfaceHeight(entityX, surfaceY, entityZ, entityRoom)
    if waterHeight != NO_HEIGHT:
        // Water surface found — transition to land mode
        set speed to land movement value
        set land animation (dry rat base)
        set state from animation
        entityY = waterHeight

    ProcessEntityMovement(entityId, turnDelta, 0)
```
