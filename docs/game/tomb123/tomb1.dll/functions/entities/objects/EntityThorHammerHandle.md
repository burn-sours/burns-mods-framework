# Function: EntityThorHammerHandle

## Description
Controls the handle portion of Thor's Hammer trap. Drives a multi-state sequence: idle → handle pulled → hammer strikes → aftermath. The handle is the master controller — every frame it syncs its animation, frame, and state to a linked hammer head entity via `ENTITY_BEHAVIOUR`. On the strike frame, creates debris effects at the impact zone and instantly kills Lara if she's within the crush area. On the aftermath state, processes sector triggers at the impact position and adjusts collision.

## Notes
- Only called by the game loop for entities on the active processing list (`ENTITY_STATUS` bit 0 set)
- Called with the entity's index into the entity array, not a pointer
- **State 0 (idle)**: trigger/timer toggle — target off deactivates (removes from processing, clears status), target on sets target state 1
- **State 1 (handle pulled)**: second trigger/timer toggle check — determines whether to advance to state 2 (hammer strike) or return to state 0, based on trigger activation
- **State 2 (hammer striking)**:
  - Calculates impact position 3072 units from the entity in the yaw direction (cardinal axes only)
  - Only acts after animation frame 30 (relative to animation start)
  - **Frame 31**: creates 8 debris effects in a ring at ±512 units around the impact position
  - **Crush check**: if Lara is alive and within ±520 units of the impact position in both X and Z:
    - Instant kill (health set to -1)
    - Snaps Lara's Y to entity Y
    - Clears Lara's gravity flag
    - Forces Lara into a specific crush death animation (animation 139) with death state
    - Sets game death flag if level outside 16–19
- **State 3 (aftermath)**:
  - Processes sector triggers at entity position via `GetSector` + `CalculateFloorHeight` + `ProcessTriggers`
  - Calculates offset position 3072 units in yaw direction
  - If Lara is alive: calls `AdjustEntityCollision` with -2048 at the offset position (lowers collision floor where hammer head landed)
  - Creates 8 debris effects at ±512 around the offset position
  - Removes from processing list, sets deactivated status
- **Animation sync** (every frame): after `ProcessEntityAnimation`, copies the handle's animation ID (with a model offset), frame, and current state to the linked entity read from `ENTITY_BEHAVIOUR` — keeping the hammer head visually synchronized with the handle
- Calls `ProcessEntityAnimation` every frame

### States

| State | Name           | Description                                              |
|-------|----------------|----------------------------------------------------------|
| 0     | Idle           | Waiting for trigger activation                            |
| 1     | Handle pulled  | Intermediate — second trigger advances to strike          |
| 2     | Striking       | Hammer falling — debris + instant kill in crush zone      |
| 3     | Aftermath      | Trigger processing, collision adjustment, deactivation    |

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
// Log when Thor's hammer enters the strike state
mod.hook('EntityThorHammerHandle')
    .onEnter(function(entityId) {
        const entities = game.readVar(game.module, 'Entities');
        const entity = entities.add(entityId * ENTITY_SIZE);
        this._state = entity.add(ENTITY_CURRENT_STATE).readS16();
    })
    .onLeave(function(returnValue, entityId) {
        const entities = game.readVar(game.module, 'Entities');
        const entity = entities.add(entityId * ENTITY_SIZE);
        const newState = entity.add(ENTITY_CURRENT_STATE).readS16();
        if (this._state !== 2 && newState === 2) {
            log('Thor hammer striking!');
        }
    });
```

### Calling from mod code
```javascript
game.callFunction(game.module, 'EntityThorHammerHandle', hammerHandleEntityIndex);
```

## Pseudocode
```
function EntityThorHammerHandle(entityId):
    entity = entities[entityId]
    currentState = entity[ENTITY_CURRENT_STATE]

    if currentState == 0:
        // Trigger/timer toggle
        target = resolve trigger toggle
        if target == 0:
            removeFromProcessingList(entityId)
            clear ENTITY_STATUS bits 1 and 2
        else:
            entity[ENTITY_TARGET_STATE] = 1
        goto ANIMATE

    if currentState == 1:
        // Second trigger/timer toggle — advance to strike or revert
        target = resolve trigger toggle
        if activation count maxed:
            entity[ENTITY_TARGET_STATE] = target-based (0 or 2)
        else:
            entity[ENTITY_TARGET_STATE] = target-based (0 or 2)
        goto ANIMATE

    if currentState == 2:
        // Hammer striking
        frameOffset = entity[ENTITY_ANIM_FRAME] - animationStartFrame
        if frameOffset <= 30: goto ANIMATE

        // Calculate impact position (3072 units in yaw direction)
        impactX, impactZ = entity position + 3072 in cardinal yaw direction

        if frameOffset == 31:
            // Debris ring at impact (±512 units)
            for each of 8 surrounding positions:
                createDebrisEffect(offsetX, entity.y, offsetZ)

        // Crush check — Lara within ±520 units of impact
        if Lara.health >= 0 AND Lara within ±520 of impact in X and Z:
            Lara.health = -1  // instant kill
            Lara.y = entity.y
            clear Lara gravity flag
            force Lara into crush death animation (anim 139, state 46)
            if level outside 16–19: set game death flag

        goto ANIMATE

    if currentState == 3:
        // Aftermath — process triggers at entity position
        sector = GetSector(entity.x, entity.y, entity.z, &roomOut)
        CalculateFloorHeight(sector, entity.x, entity.y, entity.z)
        ProcessTriggers(sector, 1)

        // Calculate offset position (3072 in yaw direction)
        offsetX, offsetZ = entity position + 3072 in cardinal yaw direction

        // Temporarily move entity to offset for collision adjustment
        entity.x = offsetX
        entity.z = offsetZ

        if Lara.health >= 0:
            AdjustEntityCollision(entity, -2048)

        // Debris ring at offset (±512 units)
        for each of 8 surrounding positions:
            createDebrisEffect(offsetX, entity.y, offsetZ)

        // Restore original position
        entity.x = originalX
        entity.z = originalZ

        removeFromProcessingList(entityId)
        set ENTITY_STATUS deactivated

ANIMATE:
    ProcessEntityAnimation(entity)

    // Sync linked hammer head entity
    linkedEntity = entity[ENTITY_BEHAVIOUR]
    linkedEntity[ENTITY_ANIM_ID] = handle anim + model offset
    linkedEntity[ENTITY_ANIM_FRAME] = handle frame adjusted to linked anim
    linkedEntity[ENTITY_CURRENT_STATE] = entity[ENTITY_CURRENT_STATE]
```
