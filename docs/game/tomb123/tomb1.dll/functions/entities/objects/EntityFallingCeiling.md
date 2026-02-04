# Function: EntityFallingCeiling

## Description
Controls falling ceiling trap objects. Enables gravity immediately, falls until reaching the floor, and deals damage to Lara on contact during the fall. On landing, creates a ring of 8 impact/debris effects around the impact point at specific animation frames. In NG+ on most levels, contact is an instant kill.

## Notes
- Only called by the game loop for entities on the active processing list (`ENTITY_STATUS` bit 0 set)
- Called with the entity's index into the entity array, not a pointer
- **State 0 (idle)**: immediately sets gravity flag (`ENTITY_STATUS` bit 3) and sets target state 1 — the ceiling starts falling on the first frame
- **State 1 (falling) — contact damage**:
  - Only triggers if a contact/collision field is non-zero (ceiling is touching Lara)
  - Normal: deals -300 damage to Lara's health
  - NG+ on levels outside 16–19 with mid-range difficulty: instant kill (health set to -1)
  - Sets a status flag on Lara (bit 4) indicating trap damage
  - If Lara dies and the level is outside 16–19, sets a game-level death flag
- **Landing** (state 1, entity Y reaches floor): snaps Y to floor, clears fall speed, clears gravity flag, sets target state 2
- **State 2 (landed) — impact effects**: at the start frame and the frame before the end frame of the landing animation, creates 8 debris effects in a ring pattern at ±384 units in X and Z around the entity (all 8 surrounding positions in a grid)
- **Deactivation**: after `ProcessEntityAnimation`, if `ENTITY_STATUS` bits 1–2 indicate deactivated (bit 2 set, bit 1 clear), removes from active processing list
- Calls `ProcessEntityAnimation` every frame

### States

| State | Name    | Description                                            |
|-------|---------|--------------------------------------------------------|
| 0     | Idle    | Enables gravity, immediately targets state 1           |
| 1     | Falling | Falls under gravity, damages Lara on contact           |
| 2     | Landed  | Resting on floor, plays impact effects at key frames   |

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
// Log when a falling ceiling lands
mod.hook('EntityFallingCeiling')
    .onEnter(function(entityId) {
        const entities = game.readVar(game.module, 'Entities');
        const entity = entities.add(entityId * ENTITY_SIZE);
        this._state = entity.add(ENTITY_CURRENT_STATE).readS16();
    })
    .onLeave(function(returnValue, entityId) {
        const entities = game.readVar(game.module, 'Entities');
        const entity = entities.add(entityId * ENTITY_SIZE);
        const newTarget = entity.add(ENTITY_TARGET_STATE).readS16();
        if (this._state === 1 && newTarget === 2) {
            log('Falling ceiling', entityId, 'landed');
        }
    });
```

### Calling from mod code
```javascript
game.callFunction(game.module, 'EntityFallingCeiling', ceilingEntityIndex);
```

## Pseudocode
```
function EntityFallingCeiling(entityId):
    entity = entities[entityId]

    if entity[ENTITY_CURRENT_STATE] == 0:
        // Start falling immediately
        set ENTITY_STATUS bit 3  // gravity
        entity[ENTITY_TARGET_STATE] = 1

    else if entity[ENTITY_CURRENT_STATE] == 1 AND entity has contact:
        // Falling and touching Lara — deal damage
        if not NG+ OR level 16–19 OR specific difficulty:
            Lara.health -= 300
        else:
            Lara.health = -1  // instant kill

        set Lara status bit 4  // trap damage flag

        if Lara.health < 1 AND level outside 16–19:
            set game death flag

    ProcessEntityAnimation(entity)

    // Deactivation check
    if (ENTITY_STATUS & 6) == 4:
        removeFromProcessingList(entityId)
        return

    // Landing check
    if entity[ENTITY_CURRENT_STATE] == 1 AND entity.floor <= entity.y:
        entity.y = entity.floor
        entity[ENTITY_Y_SPEED] = 0
        entity[ENTITY_TARGET_STATE] = 2
        clear ENTITY_STATUS bit 3  // gravity off

    // Impact effects (state 2, at key animation frames)
    if entity[ENTITY_TARGET_STATE] == 2:
        if entity[ENTITY_ANIM_FRAME] == startFrame OR endFrame - 1:
            // Create 8 debris effects in a ring (±384 units in X and Z)
            for each of 8 surrounding grid positions:
                createDebrisEffect(offsetX, entity.y, offsetZ)
```
