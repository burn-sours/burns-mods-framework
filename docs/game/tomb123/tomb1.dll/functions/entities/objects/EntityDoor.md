# Function: EntityDoor

## Description
Controls door objects that toggle between open and closed states using the trigger/timer system. Beyond animation, doors physically modify up to 4 sector floor/ceiling entries to block or unblock passage, and update associated AI navigation box flags so enemies respect the door state.

## Notes
- Only called by the game loop for entities on the active processing list (`ENTITY_STATUS` bit 0 set)
- Called with the entity's index into the entity array, not a pointer
- **Trigger toggle**: uses `ENTITY_FLAGS` bits 9–14 and `ENTITY_TIMER` to determine activation state
- **Two states**: 0 (closed) and 1 (open)
- **Behaviour data**: reads a pointer from `ENTITY_BEHAVIOUR` containing 4 sector slots. Each slot holds a sector pointer, saved floor/ceiling data, and an AI navigation box index
- **Closing** (target 0):
  - If current state is 1: sets target state 0, animates, returns early
  - Otherwise: for each of the 4 sector slots (if sector pointer is not null):
    - Clears the sector's floor data and sets blocking values for floor and ceiling, making the sector impassable
    - If the slot has an associated box index: sets the blocked flag (bit 14) on that AI navigation box
- **Opening** (target 1):
  - If current state is 0: sets target state 1, animates, returns early
  - Otherwise: for each of the 4 sector slots (if sector pointer is not null):
    - Restores the sector's original floor/ceiling data from the saved values in the behaviour data
    - If the slot has an associated box index: clears the blocked flag (bit 14) on that AI navigation box
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
// Log when a door opens or closes
mod.hook('EntityDoor')
    .onEnter(function(entityId) {
        const entities = game.readVar(game.module, 'Entities');
        const entity = entities.add(entityId * ENTITY_SIZE);
        this._state = entity.add(ENTITY_CURRENT_STATE).readS16();
    })
    .onLeave(function(returnValue, entityId) {
        const entities = game.readVar(game.module, 'Entities');
        const entity = entities.add(entityId * ENTITY_SIZE);
        const newTarget = entity.add(ENTITY_TARGET_STATE).readS16();
        if (this._state === 0 && newTarget === 1) {
            log('Door', entityId, 'opening');
        } else if (this._state === 1 && newTarget === 0) {
            log('Door', entityId, 'closing');
        }
    });
```

### Calling from mod code
```javascript
game.callFunction(game.module, 'EntityDoor', doorEntityIndex);
```

## Pseudocode
```
function EntityDoor(entityId):
    entity = entities[entityId]
    behaviourData = entity[ENTITY_BEHAVIOUR]  // pointer to 4 sector slots

    // Trigger/timer toggle
    target = (~(entity[ENTITY_FLAGS] >> 14)) & 1
    if ENTITY_FLAGS bits 9–13 all set:
        ...resolve target using ENTITY_TIMER...
    else:
        target = target ^ 1

    if target == 0:
        // --- Closing ---
        if entity[ENTITY_CURRENT_STATE] == 1:
            entity[ENTITY_TARGET_STATE] = 0
            ProcessEntityAnimation(entity)
            return

        // Block up to 4 sectors
        for each sector slot in behaviourData:
            if slot.sectorPointer != null:
                clear sector floor data
                set sector ceiling and collision to blocking values
                if slot.boxIndex is valid:
                    set blocked flag (bit 14) on navigation box

    else:
        // --- Opening ---
        if entity[ENTITY_CURRENT_STATE] == 0:
            entity[ENTITY_TARGET_STATE] = 1
            ProcessEntityAnimation(entity)
            return

        // Restore up to 4 sectors
        for each sector slot in behaviourData:
            if slot.sectorPointer != null:
                restore sector floor/ceiling data from saved values
                if slot.boxIndex is valid:
                    clear blocked flag (bit 14) on navigation box

    ProcessEntityAnimation(entity)
```
