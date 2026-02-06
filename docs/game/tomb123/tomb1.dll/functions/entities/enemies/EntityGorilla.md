# Function: EntityGorilla

## Description
AI behaviour for the gorilla enemy. A ground enemy with unique movement — uses a gorilla-specific movement handler instead of `ProcessEntityMovement` (except in one state). Features 90° snap turns, idle display animations (chest beat, jumps, rolls), and a single powerful swipe attack.

## Notes
- Only called by the game loop for entities on the active processing list (`ENTITY_STATUS` bit 0 set)
- Called with the entity's index into the entity array, not a pointer
- Uses a custom movement function for most states — only uses `ProcessEntityMovement` in state 0xB
- `UpdateEnemyMood` is called with aggressive=false (passive mood by default)
- Behaviour flag tracks aggro state (bit 0) and 90° turn state (bits 1-2) — aggro is set when Lara hits the gorilla or is close (< 0x400000)
- States 8 and 9 snap `ENTITY_YAW` by ±90° (0x4000) — when returning to idle (state 1), these rotations are corrected back
- Touch bitmask for attack: 0xFF00
- On death: random death animation from 2 choices; on level 6 in a specific room and position, plays a special sound
- When idle and not aggro, randomly performs display behaviours (chest beat, jump, roll) instead of immediately attacking

### States

| State | Name          | Description                                           |
|-------|---------------|-------------------------------------------------------|
| 1     | Idle          | Decision state; corrects turn rotations, routes next  |
| 3     | Run           | Fast pursuit; various transitions                     |
| 4     | Swipe         | Swipe attack on contact                               |
| 5     | Death         | Random death animation                                |
| 6     | Jump          | Idle display animation (queued)                       |
| 7     | Roll          | Idle display animation (queued)                       |
| 8     | Turn left     | Snaps yaw -90° then returns to idle                   |
| 9     | Turn right    | Snaps yaw +90° then returns to idle                   |
| 10    | Chest beat    | Idle display animation (queued)                       |
| 0xB   | Transition    | Uses standard `ProcessEntityMovement`                 |

### Damage

| Attack | Normal | New Game Plus |
|--------|--------|---------------|
| Swipe  | -200   | -350          |

- Sets bit 4 of Lara's `ENTITY_STATUS`

### Turn Rates

| Context | Rate  |
|---------|-------|
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
// Log gorilla idle behaviours
mod.hook('EntityGorilla')
    .onEnter(function(entityId) {
        const entities = game.readVar(game.module, 'Entities');
        const entity = entities.add(entityId * ENTITY_SIZE);
        const state = entity.add(ENTITY_CURRENT_STATE).readS16();
        const names = { 6: 'jump', 7: 'roll', 8: 'turn-L', 9: 'turn-R', 10: 'chest-beat' };
        if (names[state]) log('Gorilla', entityId, names[state]);
    });
```

### Calling from mod code
```javascript
game.callFunction(game.module, 'EntityGorilla', gorillaEntityIndex);
```

## Pseudocode
```
function EntityGorilla(entityId):
    entity = entities[entityId]

    // Activation check
    if entity[ENTITY_STATUS] activation bits pending:
        if not activateAI(entityId): return
        clear pending bits

    behaviour = entity[ENTITY_BEHAVIOUR]
    headYaw = 0

    // Death
    if entity[ENTITY_HEALTH] <= 0:
        if currentState != 5:
            pick random death animation (2 choices)
            set currentState = 5
            if level 6 AND specific room/position:
                play special sound
        skip to movement

    // Alive
    SenseLara(entity, trackData)
    headYaw = trackData.turnAngle if facing
    UpdateEnemyMood(entity, trackData, aggressive=false)
    turnDelta = turnToward(entity, behaviour.targetYaw)

    // Aggro trigger
    if hit by Lara OR Lara close (< 0x400000):
        set behaviour aggro flag (bit 0)

    switch entity[ENTITY_CURRENT_STATE]:
        case 1 (idle):
            // Correct previous 90° turns
            if behaviour turned-right flag: rotate yaw -90°, clear flag
            elif ENTITY_FLAGS turn flag: rotate yaw +90°, clear flag

            use queued state if set, or:
            if facing + very close: targetState = 4 (swipe)
            elif not aggro:
                if zones match + facing: random →
                    10 (chest beat), 6 (jump), 7 (roll),
                    8 (turn left), or 9 (turn right)
            elif aggro: targetState = 3 (run)

        case 3 (run):
            behaviour.targetYaw = 0x38E
            if not aggro + not facing behind: targetState = 1
            if facing + contact (0xFF00): queued 4 + target 1
            if not escaping: random → queued display + target 1

        case 4 (swipe):
            if no queued AND contact (0xFF00):
                GetBonePosition(entity, pos, boneIndex), damage Lara: -200 (or -350 NG+)
                set Lara ENTITY_STATUS bit 4
                queue state 1

        case 8 (turn left):
            entity[ENTITY_YAW] -= 0x4000
            set behaviour flag bit 2
            targetState = 1

        case 9 (turn right):
            entity[ENTITY_YAW] += 0x4000
            set behaviour flag bit 1
            targetState = 1

    // Movement
    adjust behaviour yaw toward headYaw (clamped ±0x38E, ±0x4000)
    if currentState == 0xB:
        ProcessEntityMovement(entityId, turnDelta, 0)
    else:
        gorillaMovement(entityId, turnDelta)
```
