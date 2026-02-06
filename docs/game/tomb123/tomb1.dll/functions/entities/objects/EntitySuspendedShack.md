# Function: EntitySuspendedShack

## Description
Controls the suspended shack object in Natla's Mines. Progresses through a sequence of animation states (0→1→2→3) each time the trigger activation count reaches maximum, clearing the flags after each step. When it reaches state 4, triggers a flip map, sets a flip map flag, and deactivates.

## Notes
- Only called by the game loop for entities on the active processing list (`ENTITY_STATUS` bit 0 set)
- Called with the entity's index into the entity array, not a pointer
- **Stepped progression**: each time `ENTITY_FLAGS` bits 9–13 are all set (activation count maxed), advances the target state by one step (0→1, 1→2, 2→3), then clears `ENTITY_FLAGS` entirely — resetting the activation count so another trigger cycle is needed for the next step
- **No timer logic**: unlike other trigger-toggled objects, this does not use `ENTITY_TIMER` — only the activation count matters
- **Final state (4)**: sets a flip map flag, calls `FlipMap`, and deactivates the entity — this is the shack collapsing/breaking, permanently changing the room geometry
- Calls `ProcessEntityAnimation` every frame

### States

| State | Name       | Description                                      |
|-------|------------|--------------------------------------------------|
| 0     | Intact     | Waiting for first trigger activation              |
| 1     | Stage 1    | First damage/loosening step                       |
| 2     | Stage 2    | Further deterioration                             |
| 3     | Stage 3    | Final warning state before collapse               |
| 4     | Collapsed  | Triggers flip map and deactivates                 |

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
// Log each progression step of the suspended shack
mod.hook('EntitySuspendedShack')
    .onEnter(function(entityId) {
        const entities = game.readVar(game.module, 'Entities');
        const entity = entities.add(entityId * ENTITY_SIZE);
        this._state = entity.add(ENTITY_CURRENT_STATE).readS16();
    })
    .onLeave(function(returnValue, entityId) {
        const entities = game.readVar(game.module, 'Entities');
        const entity = entities.add(entityId * ENTITY_SIZE);
        const newTarget = entity.add(ENTITY_TARGET_STATE).readS16();
        if (newTarget !== this._state) {
            log('Suspended shack', entityId, 'progressing to state', newTarget);
        }
    });
```

### Calling from mod code
```javascript
game.callFunction(game.module, 'EntitySuspendedShack', shackEntityIndex);
```

## Pseudocode
```
function EntitySuspendedShack(entityId):
    entity = entities[entityId]

    // Check if activation count is maxed
    if ENTITY_FLAGS bits 9–13 all set:
        // Advance to next state
        switch entity[ENTITY_CURRENT_STATE]:
            case 0: entity[ENTITY_TARGET_STATE] = 1
            case 1: entity[ENTITY_TARGET_STATE] = 2
            case 2: entity[ENTITY_TARGET_STATE] = 3

        // Clear flags — reset activation count for next trigger cycle
        entity[ENTITY_FLAGS] = 0

    // Final collapse
    if entity[ENTITY_CURRENT_STATE] == 4:
        set flip map flag
        FlipMap()
        deactivateEntity(entityId)

    ProcessEntityAnimation(entity)
```
