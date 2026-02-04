# Function: EntityTrex

## Description
AI behaviour for the T-Rex. A massive predator that deals contact damage every frame just by touching Lara, and has an instant-kill bite that triggers a grab-and-eat death sequence — repositioning Lara into the T-Rex's jaws and forcing a specific death animation.

## Notes
- Only called by the game loop for entities on the active processing list (`ENTITY_STATUS` bit 0 set)
- Called with the entity's index into the entity array, not a pointer
- Deals passive contact damage every frame if any touch bits are set — the amount depends on the current state (higher when running)
- Uses a behaviour flag (offset 0x0E) to track attack readiness — set when Lara is at medium range, facing, and the mood isn't escape
- The bite (state 7) uses a narrow touch bitmask (0x3000) — only the jaw triggers the grab
- The grab-and-eat sequence (state 7 → 8): instantly kills Lara (-10000 health), teleports her to the T-Rex's position and room, forces a specific death animation (state 0x2E), and restores Lara's default model appearance
- Head yaw tracks at half speed compared to other enemies (turn angle ÷ 2)
- Sets `ENTITY_STATUS` bit 5 after movement processing
- No pitch tilt — passes 0 to `ProcessEntityMovement`

### States

| State | Name     | Description                                              |
|-------|----------|----------------------------------------------------------|
| 1     | Idle     | Decision state; routes to walk, run, or bite             |
| 2     | Walk     | Slow pursuit; random roar                                |
| 3     | Run      | Fast charge; transitions based on distance and mood      |
| 5     | Death    | Death animation with sound                               |
| 6     | Roar     | Roar animation (queued state)                            |
| 7     | Bite     | Grab attempt — instant kill on jaw contact               |
| 8     | Eating   | Holding Lara in jaws after successful grab               |

### Damage

| Source                    | Normal | New Game Plus |
|---------------------------|--------|---------------|
| Contact (idle, per frame) | -1     | -5            |
| Contact (run, per frame)  | -10    | -25           |
| Bite grab                 | -10000 | -10000        |

- Contact damage triggers on any touch bits
- Bite grab uses touch bitmask 0x3000 (jaw only)
- All damage sets bit 4 of Lara's `ENTITY_STATUS`

### Turn Rates

| Context | Rate  |
|---------|-------|
| Walking | 0x16C |
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
// Survive the T-Rex bite (prevent instant kill)
mod.hook('EntityTrex')
    .onEnter(function(entityId) {
        const laraPtr = game.readVar(game.module, 'Lara');
        this._hp = laraPtr.add(ENTITY_HEALTH).readS16();
    })
    .onLeave(function(returnValue, entityId) {
        const laraPtr = game.readVar(game.module, 'Lara');
        const newHp = laraPtr.add(ENTITY_HEALTH).readS16();
        if (newHp <= -9000) {
            laraPtr.add(ENTITY_HEALTH).writeS16(this._hp);
        }
    });
```

### Calling from mod code
```javascript
game.callFunction(game.module, 'EntityTrex', trexEntityIndex);
```

## Pseudocode
```
function EntityTrex(entityId):
    entity = entities[entityId]

    // Activation check
    if entity[ENTITY_STATUS] activation bits pending:
        if not activateAI(entityId): return
        clear pending bits

    behaviour = entity[ENTITY_BEHAVIOUR]

    // Death
    if entity[ENTITY_HEALTH] <= 0:
        visualUpdate(entity, 0, 0, 0)
        if currentState == 1: targetState = 5 (death), play sound
        else: targetState = 1
        skip to movement

    // Alive
    SenseLara(entity, trackData)
    visualUpdate(entity, hitData, health)
    headYaw = trackData.turnAngle if facing
    UpdateEnemyMood(entity, trackData, aggressive=true)
    turnDelta = turnToward(entity, behaviour.targetYaw)

    // Contact damage every frame (any touch)
    if touch bits != 0:
        if currentState == 3 (running):
            damage = -10 (or -25 NG+)
        else:
            damage = -1 (or -5 NG+)
        Lara health -= damage

    // Attack readiness flag
    if escaping OR not facing OR out of range:
        behaviour.attackReady = 0
    elif medium range AND facing:
        behaviour.attackReady = 1

    switch entity[ENTITY_CURRENT_STATE]:
        case 1 (idle):
            use queued state if set, or:
            if very close + facing: targetState = 7 (bite)
            elif passive or attackReady: targetState = 2 (walk)
            elif aggressive: targetState = 3 (run)

        case 2 (walk):
            behaviour.targetYaw = 0x16C
            if passive + attackReady: random → queued 6 (roar) + target 1
            if aggressive: targetState = 1

        case 3 (run):
            behaviour.targetYaw = 0x2D8
            if close + facing + attackReady: targetState = 1
            if not escaping: random → queued 6 + target 1
            if passive: targetState = 1

        case 7 (bite):
            if jaw contact (touch 0x3000):
                // Instant kill grab sequence
                Lara health = -10000
                set Lara ENTITY_STATUS bit 4
                targetState = 8 (eating)
                // Teleport Lara to T-Rex position
                move Lara to entity[ENTITY_X/Y/Z]
                set Lara[ENTITY_YAW] = entity[ENTITY_YAW]
                change Lara's room to entity's room
                clear Lara gravity, pitch, roll
                force Lara death animation (state 0x2E)
                restore Lara's default model meshes
            queue state 2 (walk)

    // Movement
    adjust behaviour yaw toward headYaw / 2 (clamped ±0x38E, ±0x4000)
    ProcessEntityMovement(entityId, turnDelta, 0)
    entity[ENTITY_STATUS] |= 0x20
```
