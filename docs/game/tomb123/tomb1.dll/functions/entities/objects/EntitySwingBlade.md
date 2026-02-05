# Function: EntitySwingBlade

## Description
Controls swinging blade trap objects. Uses the trigger/timer toggle to activate and deactivate the swinging animation. While in the swinging state, damages Lara on contact and creates a blood splatter effect at a randomised position near Lara. In NG+ on applicable levels, contact is an instant kill.

## Notes
- Only called by the game loop for entities on the active processing list (`ENTITY_STATUS` bit 0 set)
- Called with the entity's index into the entity array, not a pointer
- **Trigger toggle**: uses `ENTITY_FLAGS` bits 9–14 and `ENTITY_TIMER` to determine activation state
- **Two active states**: 0 (idle) and 2 (swinging)
  - Target on + current state 0: sets target state 2 (start swinging)
  - Target off + current state 2: sets target state 0 (stop swinging)
- **Contact damage** (state 2, contact/collision field non-zero):
  - Normal: deals -100 damage to Lara's health
  - NG+ on levels outside 16–19 with mid-range difficulty: instant kill (health set to -1)
  - Sets Lara's trap damage flag (status bit 4)
  - Calls `CreateBloodSplatter` at a randomised position near Lara (random X/Z offset, random Y based on height, random yaw offset) using the RNG
  - If Lara dies and the level is outside 16–19, sets a game death flag
- Updates floor tracking via `GetSector` + `CalculateFloorHeight` each frame (stores previous and current floor)
- Calls `ProcessEntityAnimation` every frame

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
// Log when swinging blade hits Lara
mod.hook('EntitySwingBlade')
    .onEnter(function(entityId) {
        const laraHealth = game.readVar(game.module, 'Lara')
            .add(ENTITY_HEALTH).readS16();
        this._health = laraHealth;
    })
    .onLeave(function(returnValue, entityId) {
        const laraHealth = game.readVar(game.module, 'Lara')
            .add(ENTITY_HEALTH).readS16();
        if (laraHealth < this._health) {
            log('Swing blade hit! Health:', laraHealth);
        }
    });
```

### Calling from mod code
```javascript
game.callFunction(game.module, 'EntitySwingBlade', swingBladeEntityIndex);
```

## Pseudocode
```
function EntitySwingBlade(entityId):
    entity = entities[entityId]

    // Trigger/timer toggle
    target = (~(entity[ENTITY_FLAGS] >> 14)) & 1
    if ENTITY_FLAGS bits 9–13 all set:
        ...resolve target using ENTITY_TIMER...
    else:
        target = target ^ 1

    currentState = entity[ENTITY_CURRENT_STATE]

    if target == 0:
        if currentState != 2: goto UPDATE
        entity[ENTITY_TARGET_STATE] = 0  // stop swinging
    else:
        if currentState == 0:
            entity[ENTITY_TARGET_STATE] = 2  // start swinging
            goto UPDATE
        if currentState != 2: goto UPDATE

    // Contact damage (state 2, touching Lara)
    if entity has contact:
        if not NG+ OR level 16–19 OR specific difficulty:
            Lara.health -= 100
        else:
            Lara.health = -1  // instant kill

        set Lara status bit 4  // trap damage

        // Blood splatter at randomised position near Lara
        CreateBloodSplatter(
            Lara.x + random offset,
            Lara.y - random height,
            Lara.z + random offset,
            Lara.fallSpeed,
            Lara.yaw + random offset,
            Lara.room)

        if Lara.health < 1 AND level outside 16–19:
            set game death flag

UPDATE:
    // Floor tracking
    sector = GetSector(entity.x, entity.y, entity.z, &entity.room)
    entity.previousFloor = entity.floor
    entity.floor = CalculateFloorHeight(sector, entity.x, entity.y, entity.z)

    ProcessEntityAnimation(entity)
```
