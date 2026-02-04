# Function: EntityCentaurSpawn

## Description
A one-shot proximity spawner that hatches into a centaur when Lara gets close enough. Checks vertical and horizontal distance thresholds, then triggers an explosion effect, deactivates itself, and activates the linked centaur entity from AI data. Plays a sound effect at the spawned entity's position.

## Notes
- Only processes entities on the active processing list (`ENTITY_STATUS` bit 0)
- Returns immediately if the entity's flags field is negative (bit 15 set) — used as a disable/already-triggered guard
- **Proximity check** (all must pass):
  - Vertical (Y): Lara must be within ±1023 units
  - Horizontal (XZ): squared distance must be ≤ ~12.8 million (roughly 3584 units radius)
- If Lara is out of range, returns with no processing — no animation tick, no state machine
- **Spawn sequence** on trigger:
  1. Calls an explosion/effect function on this entity
  2. Deactivates this spawner entity
  3. Updates own status flags (clears active, sets pending)
  4. Reads the spawned entity ID from the first field of AI data
  5. Clears the spawned entity's timer field
  6. Adds spawned entity to the active processing list (if it has a behaviour function)
  7. Calls AI activation on the spawned entity
  8. Sets spawned entity status to active
  9. Plays `SoundEffect` 104 at the spawned entity's position
- Simpler than `EntityMutantSpawn` — no hit detection, no animation frame check, no animation processing
- Purely proximity-triggered with no state machine

## Details

| Field     | Value                          |
|-----------|--------------------------------|
| Usage     | `Hook`                         |
| Params    | `int`                          |
| Return    | `void`                         |

### Parameters

| #   | Type  | Description                          |
|-----|-------|--------------------------------------|
| 0   | `int` | Entity index in the entity array     |

## Usage
### Hooking
```javascript
// Detect when a centaur spawns
mod.hook('EntityCentaurSpawn')
    .onEnter(function(entityId) {
        log('Centaur spawn check, entity:', entityId);
    });
```

## Pseudocode
```
function EntityCentaurSpawn(entityId):
    entity = entities[entityId]

    // Guard — already triggered or disabled
    if entity.flags < 0:
        return

    // Vertical proximity check
    yDiff = Lara.y - entity.y
    if abs(yDiff) > 1023:
        return

    // Horizontal proximity check (~3584 unit radius)
    xDiff = Lara.x - entity.x
    zDiff = Lara.z - entity.z
    if xDiff * xDiff + zDiff * zDiff > 0xC3FFFF:
        return

    // --- Trigger spawn ---
    triggerExplosionEffect(entityId, -1, 0)
    deactivateEntity(entityId)
    entity.status: clear active bit, set pending bit

    // Read linked entity from AI data
    spawnedId = entity.aiData[0]
    spawnedEntity = entities[spawnedId]
    spawnedEntity.timer = 0

    // Activate spawned entity
    if spawnedEntity has behaviour function:
        if not already on active list:
            set active bit
            link to processing list (before ProcessingEntityId)
    else:
        clear activation bits

    activateEnemyAI(spawnedId)
    spawnedEntity.status: clear pending, set active

    SoundEffect(104, spawnedEntity.position, 0)
```
