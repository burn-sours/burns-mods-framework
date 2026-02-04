# Function: EntityBat

## Description
AI behaviour for the bat enemy. A simple flying enemy that steers directly toward its target position and attacks Lara on contact. On death, falls to the ground with gravity.

## Notes
- Only called by the game loop for entities on the active processing list (`ENTITY_STATUS` bit 0 set)
- Called with the entity's index into the entity array, not a pointer
- Steers toward the behaviour's target position using `ATAN2` to calculate the angle, with a fast base turn rate per frame — tightens to a slower rate when the target is behind the bat and close
- On death: enters a falling state with gravity enabled (`ENTITY_STATUS` bit 3), `ENTITY_XZ_SPEED` cleared — snaps to the floor on landing
- No pitch tilt — always passes 0 to `ProcessEntityMovement`

### States

| State | Name     | Description                                          |
|-------|----------|------------------------------------------------------|
| 1     | Idle     | Transitions immediately to flying                    |
| 2     | Flying   | Steers toward target; attacks on contact             |
| 3     | Attack   | Biting Lara; deals damage on contact each frame      |
| 4     | Falling  | Dead, falling with gravity; lands when reaching floor |
| 5     | Landed   | Dead on ground, snapped to floor                     |

### Damage

| Attack | Normal | New Game Plus |
|--------|--------|---------------|
| Bite   | -2     | -5            |

- Requires contact (touch bits field non-zero) and sets bit 4 of Lara's `ENTITY_STATUS`

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
// Make bats harmless
mod.hook('EntityBat')
    .onEnter(function(entityId) {
        const laraPtr = game.readVar(game.module, 'Lara');
        this._hp = laraPtr.add(ENTITY_HEALTH).readS16();
    })
    .onLeave(function(returnValue, entityId) {
        const laraPtr = game.readVar(game.module, 'Lara');
        laraPtr.add(ENTITY_HEALTH).writeS16(this._hp);
    });
```

### Calling from mod code
```javascript
// Manually tick a bat's AI
game.callFunction(game.module, 'EntityBat', batEntityIndex);
```

## Pseudocode
```
function EntityBat(entityId):
    entity = entities[entityId]

    // Activation check
    if entity[ENTITY_STATUS] activation bits pending:
        if not activateAI(entityId): return
        clear pending bits

    behaviour = entity[ENTITY_BEHAVIOUR]
    turnAmount = 0

    // Death
    if entity[ENTITY_HEALTH] <= 0:
        if currentState == 4 (falling):
            if entity[ENTITY_Y] >= floor height:
                snap to floor
                entity[ENTITY_Y_SPEED] = 0
                clear ENTITY_STATUS bit 3 (gravity)
                targetState = 5 (landed)
        elif currentState == 5 (landed):
            snap to floor
        else:
            targetState = 4 (falling)
            set ENTITY_STATUS gravity flag
            entity[ENTITY_XZ_SPEED] = 0

    // Alive
    else:
        SenseLara(entity, trackData)
        UpdateEnemyMood(entity, trackData)

        // Steering toward target position
        if behaviour != null AND entity[ENTITY_XZ_SPEED] != 0:
            targetX = behaviour.targetX
            targetZ = behaviour.targetZ
            deltaX = targetX - entity[ENTITY_X]
            deltaZ = targetZ - entity[ENTITY_Z]
            angleToTarget = ATAN2(deltaZ, deltaX)
            angleDiff = angleToTarget - entity[ENTITY_YAW]

            turnRate = FAST_TURN_RATE
            // Tighten turn if target is behind and close
            scaledSpeed = (entity[ENTITY_XZ_SPEED] * QUARTER_TURN) / FAST_TURN_RATE
            if target is behind (~rear arc) AND distance < scaledSpeed²:
                turnRate = SLOW_TURN_RATE

            // Clamp and apply turn
            turnAmount = clamp(angleDiff, -turnRate, turnRate)
            entity[ENTITY_YAW] += turnAmount

        // State machine
        switch entity[ENTITY_CURRENT_STATE]:
            case 1 (idle):
                targetState = 2 (fly)

            case 2 (flying):
                if contact bits != 0:
                    targetState = 3 (attack)

            case 3 (attack):
                if contact bits == 0:
                    targetState = 2 (fly)
                    clear mood
                else:
                    get bite bone position, apply damage to Lara
                    damage = -2 (or -5 on NG+)
                    set Lara ENTITY_STATUS bit 4

    ProcessEntityMovement(entityId, turnAmount, 0)
```
