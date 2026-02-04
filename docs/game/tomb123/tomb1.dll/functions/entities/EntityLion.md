# Function: EntityLion

## Description
AI behaviour shared by all lion-type enemies: lion, lioness, and panther. A ground predator with a claw swipe and a bite attack, with damage values that vary by model type on New Game Plus. Death animations are also model-specific.

## Notes
- Only called by the game loop for entities on the active processing list (`ENTITY_STATUS` bit 0 set)
- Called with the entity's index into the entity array, not a pointer
- Handles three model types via `ENTITY_MODEL`: 12 (lioness), 13 (panther), 14 (lion) — each with different NG+ damage scaling and death animation sets
- Touch bitmask for attacks: 0x380066
- On death: picks a random death animation from a model-specific set, enters death state (5)
- Head tilt via `ENTITY_PITCH` (clamped ±0x222), head yaw via behaviour (clamped ±0x38E)

### States

| State | Name  | Description                                          |
|-------|-------|------------------------------------------------------|
| 1     | Idle  | Decision state; routes to walk, run, or attack       |
| 2     | Walk  | Slow patrol; random roar                             |
| 3     | Run   | Fast pursuit; transitions to idle when close enough  |
| 4     | Claw  | Swipe attack on contact                              |
| 5     | Death | Model-specific random death animation                |
| 6     | Roar  | Roar animation (queued state)                        |
| 7     | Bite  | Bite attack using `GetBonePosition` for hit detection |

### Damage

**Claw (state 4):**

| Model          | Normal | New Game Plus |
|----------------|--------|---------------|
| All            | -150   | —             |
| Lioness (12)   | —      | -200          |
| Panther (13)   | —      | -250          |
| Lion (14)      | —      | -220          |

**Bite (state 7):**

| Model          | Normal | New Game Plus |
|----------------|--------|---------------|
| All            | -250   | —             |
| Lioness (12)   | —      | -300          |
| Others         | —      | -350          |

- Both attacks set bit 4 of Lara's `ENTITY_STATUS`

### Turn Rates

| Context | Rate  |
|---------|-------|
| Walking | 0x16C |
| Running | 0x38E |

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
// Log which lion variant is attacking
mod.hook('EntityLion')
    .onEnter(function(entityId) {
        const entities = game.readVar(game.module, 'Entities');
        const entity = entities.add(entityId * ENTITY_SIZE);
        const model = entity.add(ENTITY_MODEL).readS16();
        const names = { 12: 'lioness', 13: 'panther', 14: 'lion' };
        log('Ticking', names[model] || 'unknown', 'entity', entityId);
    });
```

### Calling from mod code
```javascript
game.callFunction(game.module, 'EntityLion', lionEntityIndex);
```

## Pseudocode
```
function EntityLion(entityId):
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
        if currentState != 5 (death):
            pick random death animation based on ENTITY_MODEL
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
            if passive: targetState = 2 (walk)
            if facing + contact (0x380066): targetState = 7 (bite)
            elif facing + close (< 0x100000): targetState = 4 (claw)
            else: targetState = 3 (run)

        case 2 (walk):
            behaviour.targetYaw = 0x16C
            if aggressive: targetState = 1
            if passive: random → queued 6 (roar) + target 1

        case 3 (run):
            behaviour.targetYaw = 0x38E
            headTilt = turnDelta
            if passive OR close+facing OR contact+facing: targetState = 1
            if not escaping: random → queued 6 + target 1

        case 4 (claw):
            if no queued AND contact (0x380066):
                damage Lara (varies by ENTITY_MODEL):
                    normal: -150
                    NG+ lioness: -200, NG+ panther: -250, NG+ lion: -220
                set Lara ENTITY_STATUS bit 4
                queue state 1

        case 7 (bite):
            if no queued AND contact (0x380066):
                GetBonePosition(entity, pos, boneIndex), damage Lara:
                    normal: -250
                    NG+ lioness: -300, NG+ others: -350
                set Lara ENTITY_STATUS bit 4
                queue state 1

    // Movement
    adjust ENTITY_PITCH toward headTilt * 4 (clamped ±0x222)
    adjust behaviour yaw toward headYaw (clamped ±0x38E, ±0x4000)
    ProcessEntityMovement(entityId, turnDelta, headTilt)
```
