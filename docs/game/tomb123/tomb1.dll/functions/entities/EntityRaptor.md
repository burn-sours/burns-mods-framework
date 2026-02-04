# Function: EntityRaptor

## Description
AI behaviour for the raptor enemy. An aggressive ground predator with three attack types — all dealing the same damage but triggered from different states. Faster and more persistent than the wolf, with a higher base running turn rate.

## Notes
- Only called by the game loop for entities on the active processing list (`ENTITY_STATUS` bit 0 set)
- Called with the entity's index into the entity array, not a pointer
- Touch bitmask for attacks: 0xFF7C00
- On death: picks a random death animation and enters death state (5)
- Head tilt via `ENTITY_PITCH` (clamped ±0x222), head yaw via behaviour (clamped ±0x38E)
- State 6 (roar) is only used as a queued state — triggers a roar animation before returning to idle

### States

| State | Name         | Description                                             |
|-------|--------------|---------------------------------------------------------|
| 1     | Idle         | Decision state; routes to attack, walk, or run          |
| 2     | Walk         | Slow patrol; random roar, transitions to idle if aggressive |
| 3     | Run          | Fast pursuit; attacks if close, roars randomly          |
| 4     | Claw attack  | Standing claw/jump attack on contact                    |
| 5     | Death        | Random death animation                                  |
| 6     | Roar         | Roar animation (queued state only)                      |
| 7     | Running bite | Attack without stopping; continues running after        |
| 8     | Bite         | Standing bite attack on contact                         |

### Damage

| Attack       | Normal | New Game Plus |
|--------------|--------|---------------|
| Claw attack  | -100   | -200          |
| Running bite | -100   | -200          |
| Bite         | -100   | -200          |

- All attacks set bit 4 of Lara's `ENTITY_STATUS`

### Turn Rates

| Context | Rate  |
|---------|-------|
| Walking | 0xB6  |
| Running | 0x2D8 |

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
// Double raptor damage
mod.hook('EntityRaptor')
    .onEnter(function(entityId) {
        const laraPtr = game.readVar(game.module, 'Lara');
        this._hp = laraPtr.add(ENTITY_HEALTH).readS16();
    })
    .onLeave(function(returnValue, entityId) {
        const laraPtr = game.readVar(game.module, 'Lara');
        const newHp = laraPtr.add(ENTITY_HEALTH).readS16();
        const diff = newHp - this._hp;
        if (diff < 0) {
            laraPtr.add(ENTITY_HEALTH).writeS16(this._hp + diff * 2);
        }
    });
```

### Calling from mod code
```javascript
game.callFunction(game.module, 'EntityRaptor', raptorEntityIndex);
```

## Pseudocode
```
function EntityRaptor(entityId):
    entity = entities[entityId]

    // Activation check
    if entity[ENTITY_STATUS] activation bits pending:
        if not activateAI(entityId): return
        clear pending bits

    behaviour = entity[ENTITY_BEHAVIOUR]
    headTilt = 0
    headYaw = 0

    // Death
    if entity[ENTITY_HEALTH] <= 0:
        turnDelta = 0
        if currentState != 5 (death):
            pick random death animation
            set currentState = 5
        skip to movement

    // Alive
    SenseLara(entity, trackData)
    headYaw = trackData.turnAngle if facing
    UpdateEnemyMood(entity, trackData, aggressive=true)
    turnDelta = turnToward(entity, behaviour.targetYaw)

    switch entity[ENTITY_CURRENT_STATE]:
        case 1 (idle):
            use queued state if set, or:
            if contact (0xFF7C00): targetState = 8 (bite)
            elif facing + very close: targetState = 8 (bite)
            elif facing + close: targetState = 4 (claw)
            elif passive: targetState = 2 (walk)
            elif aggressive: targetState = 3 (run)

        case 2 (walk):
            behaviour.targetYaw = 0xB6
            if passive: random → queued 6 (roar) + target 1
            if aggressive: targetState = 1

        case 3 (run):
            behaviour.targetYaw = 0x2D8
            headTilt = turnDelta
            if contact: targetState = 1
            if facing + close:
                random → target 1 or target 7 (running bite)
            if facing + not escaping: random → queued 6 + target 1
            if passive: targetState = 1

        case 4 (claw attack):
            headTilt = turnDelta
            if no queued AND facing AND contact (0xFF7C00):
                GetBonePosition(entity, pos, boneIndex), damage Lara: -100 (or -200 NG+)
                set Lara ENTITY_STATUS bit 4
                queue state 1

        case 7 (running bite):
            headTilt = turnDelta
            if no queued AND facing AND contact (0xFF7C00):
                GetBonePosition(entity, pos, boneIndex), damage Lara: -100 (or -200 NG+)
                set Lara ENTITY_STATUS bit 4
                queue state 3 (continue running)

        case 8 (bite):
            headTilt = turnDelta
            if no queued AND contact (0xFF7C00):
                GetBonePosition(entity, pos, boneIndex), damage Lara: -100 (or -200 NG+)
                set Lara ENTITY_STATUS bit 4
                queue state 1

    // Movement
    adjust ENTITY_PITCH toward headTilt * 4 (clamped ±0x222)
    adjust behaviour yaw toward headYaw (clamped ±0x38E, ±0x4000)
    ProcessEntityMovement(entityId, turnDelta, headTilt)
```
