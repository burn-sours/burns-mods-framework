# Function: EntityBear

## Description
AI behaviour for the bear enemy. A versatile ground enemy that alternates between walking on all fours and rearing up to stand. Has four attack types with varying damage, and can even deal a death swipe while dying. New Game Plus significantly increases damage output.

## Notes
- Only called by the game loop for entities on the active processing list (`ENTITY_STATUS` bit 0 set)
- Called with the entity's index into the entity array, not a pointer
- Uses a behaviour flag to track whether the bear is standing upright — affects which attacks and transitions are available
- Touch bitmask for attacks: specific body-part touch mask
- If the bear is hit by Lara (`ENTITY_STATUS` bit 4), sets the standing flag — being shot provokes it to rear up
- On death: slowly turns toward Lara, transitions through rearing up to a standing death — can still deal a death swipe on contact before fully dying
- Head yaw tracking toward Lara, clamped per frame
- No pitch tilt — passes 0 to `ProcessEntityMovement`

### States

| State | Name               | Description                                              |
|-------|--------------------|----------------------------------------------------------|
| 0     | Walk               | Slow patrol on all fours; reacts to Lara or mood changes |
| 1     | Rear up            | Transition from all fours to standing                    |
| 2     | Run (all fours)    | Running pursuit; various transitions based on mood       |
| 3     | Charge             | Fast charge with contact damage each frame               |
| 4     | Standing transition| Routes to standing attacks or back to all fours          |
| 6     | Standing bite      | Powerful bite while standing                             |
| 7     | Standing swipe     | Strongest attack — devastating swipe while reared up     |
| 8     | Death swipe        | Swipe animation while dying                              |
| 9     | Death              | Final death state; can deal a last-hit swipe on contact  |

### Damage

| Attack          | Normal | New Game Plus |
|-----------------|--------|---------------|
| Charge (per frame) | -3  | -10           |
| Standing bite   | -200   | -400          |
| Standing swipe  | -400   | -650          |
| Death swipe     | -200   | -400          |

- All attacks set bit 4 of Lara's `ENTITY_STATUS`

### Turn Rates

| Context        | Rate   |
|----------------|--------|
| Walking        | slow      |
| Charging       | medium    |
| Death          | very slow |

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
// Log bear state transitions
mod.hook('EntityBear')
    .onEnter(function(entityId) {
        const entities = game.readVar(game.module, 'Entities');
        const entity = entities.add(entityId * ENTITY_SIZE);
        this._state = entity.add(ENTITY_CURRENT_STATE).readS16();
    })
    .onLeave(function(returnValue, entityId) {
        const entities = game.readVar(game.module, 'Entities');
        const entity = entities.add(entityId * ENTITY_SIZE);
        const newState = entity.add(ENTITY_CURRENT_STATE).readS16();
        if (newState !== this._state) {
            log('Bear', entityId, 'state:', this._state, '->', newState);
        }
    });
```

### Calling from mod code
```javascript
game.callFunction(game.module, 'EntityBear', bearEntityIndex);
```

## Pseudocode
```
function EntityBear(entityId):
    entity = entities[entityId]

    // Activation check
    if entity[ENTITY_STATUS] activation bits pending:
        if not activateAI(entityId): return
        clear pending bits

    behaviour = entity[ENTITY_BEHAVIOUR]

    // Death
    if entity[ENTITY_HEALTH] <= 0:
        turnDelta = turnToward(entity, 0xB6)  // slow death turn

        switch entity[ENTITY_CURRENT_STATE]:
            case 0, 3 (walking/charging):
                targetState = 1 (rear up)
            case 1 (rearing):
                clear standing flag
                targetState = 9 (death)
            case 2 (running):
                targetState = 4 (standing transition)
            case 4 (standing):
                set standing flag
                targetState = 9 (death)
            case 9 (death):
                if standing flag AND contact (0x2406C):
                    damage Lara: -200 (or -400 NG+)
                    set Lara ENTITY_STATUS bit 4
                    clear standing flag
        skip to head tracking + movement

    // Alive — AI processing
    SenseLara(entity, trackData)
    headYaw = trackData.turnAngle if facing
    UpdateEnemyMood(entity, trackData, aggressive=true)
    turnDelta = turnToward(entity, behaviour.targetYaw)
    if entity hit by Lara: set standing flag

    switch entity[ENTITY_CURRENT_STATE]:
        case 0 (walk):
            behaviour.targetYaw = 0x16C
            if Lara dead + contact + facing: targetState = 1
            elif passive: random → rear up with queued 5
            elif aggressive: targetState = 1 (or clear queued if escaping)

        case 1 (rear up):
            if Lara dead: queued state, or close+facing → 8 (death swipe)
            if alive: queued state, or:
                aggressive + close + facing → queued 4 + target 1
                close → target 6 (standing bite)

        case 2 (run):
            if standing flag: target 4
            if contact: target 4
            various mood-based transitions to standing or walking

        case 3 (charge):
            behaviour.targetYaw = 0x222
            if contact: damage Lara (-3 or -10 NG+)
            transition based on mood/distance/facing

        case 4 (standing transition):
            if standing flag: clear queued, target 1
            use queued state, or:
                aggressive → 2, close+facing → 7 (swipe), else → 2

        case 6 (standing bite):
            if contact (0x2406C):
                get bone position, damage Lara: -200 (or -400 NG+)
                set Lara ENTITY_STATUS bit 4
                queue state 1

        case 7 (standing swipe):
            if contact (0x2406C):
                damage Lara: -400 (or -650 NG+)
                set Lara ENTITY_STATUS bit 4
                queue state 4

    // Head tracking + movement
    adjust behaviour yaw toward headYaw (clamped ±0x38E, ±0x4000)
    ProcessEntityMovement(entityId, turnDelta, 0)
```
