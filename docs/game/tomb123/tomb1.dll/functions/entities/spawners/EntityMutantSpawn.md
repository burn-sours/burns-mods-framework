# Function: EntityMutantSpawn

## Description
A one-shot spawner entity that "hatches" into a mutant when triggered. Waits for Lara to come within close proximity or for the entity to be hit, then creates an explosion effect, activates the linked mutant entity (stored in AI data), and deactivates itself. The spawned mutant's entity ID is read from the first field of this entity's AI data.

## Notes
- Called with the entity's index into the entity array, not a pointer
- **Trigger conditions** (any of these):
  - Hit by Lara (player-hit flag set in `ENTITY_STATUS`)
  - Current animation frame is a specific frame (181) — likely the "ready to hatch" frame
  - Lara is within ±0xFFF (4095 units) on all three axes (X, Y, Z)
- Once triggered: sets target state to 1, which prevents re-triggering on subsequent frames
- **Spawn sequence**:
  1. Clears a status flag on this entity (bit 5 of `ENTITY_STATUS`)
  2. Sets an internal field to 0xFFFFFF (visual/state marker)
  3. Calls an explosion/effect function with a large radius (0xFFFE00)
  4. Reads the spawned entity ID from AI data
  5. Activates the spawned entity: clears its timer field, sets it on the active processing list, calls `activateEnemyAI`
  6. Deactivates itself (clears active bit, sets pending bit)
- If the spawned entity has no behaviour function defined, its activation bits are cleared instead of being added to the processing list
- After all logic, calls `processEntityAnimation` (not `ProcessEntityMovement` — no movement processing)
- No AI sensing, no mood system, no turn rates — purely a trigger-based spawner

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
// Log when a mutant spawns
mod.hook('EntityMutantSpawn')
    .onEnter(function(entityId) {
        const entities = game.readVar(game.module, 'Entities');
        const entity = entities.add(entityId * ENTITY_SIZE);
        this._targetState = entity.add(ENTITY_TARGET_STATE).readS16();
    })
    .onLeave(function(returnValue, entityId) {
        const entities = game.readVar(game.module, 'Entities');
        const entity = entities.add(entityId * ENTITY_SIZE);
        const newTarget = entity.add(ENTITY_TARGET_STATE).readS16();
        if (this._targetState !== 1 && newTarget === 1) {
            log('Mutant spawn triggered! Entity', entityId, 'hatching');
        }
    });
```

### Calling from mod code
```javascript
game.callFunction(game.module, 'EntityMutantSpawn', spawnEntityIndex);
```

## Pseudocode
```
function EntityMutantSpawn(entityId):
    entity = entities[entityId]

    // Already triggered — skip to animation
    if entity[ENTITY_TARGET_STATE] == 1:
        processEntityAnimation(entity)
        return

    // --- Check trigger conditions ---
    triggered = false

    if hit by Lara (player-hit flag in ENTITY_STATUS):
        triggered = true
    elif entity animation frame == 181:
        triggered = true  // ready-to-hatch frame
    else:
        // Proximity check — Lara within ±4095 on all axes
        dx = abs(Lara.x - entity.x)
        dy = abs(Lara.y - entity.y)
        dz = abs(Lara.z - entity.z)
        if dx <= 0xFFF and dy <= 0xFFF and dz <= 0xFFF:
            triggered = true

    if not triggered:
        processEntityAnimation(entity)
        return

    // --- Spawn sequence ---
    entity[ENTITY_TARGET_STATE] = 1
    clear ENTITY_STATUS bit 5
    entity.internalField = 0xFFFFFF  // visual/state marker
    triggerExplosionEffect(entityId, 0xFFFE00, 0)

    // Activate the linked mutant
    if entity[AI_DATA_POINTER] != null:
        spawnedId = aiData[0]  // first field = entity ID of the mutant
        spawnedEntity = entities[spawnedId]
        spawnedEntity.timer = 0

        if spawnedEntity has behaviour function:
            if not already active:
                set active bit
                link to processing list
        else:
            clear activation bits

        result = activateEnemyAI(spawnedId)
        if result == 0:
            set spawnedEntity status to pending (bits 1+2)
        else:
            clear pending, set active (bit 1 only)

    // Self-deactivate
    clear entity active bit
    set entity pending bit

    processEntityAnimation(entity)
```
