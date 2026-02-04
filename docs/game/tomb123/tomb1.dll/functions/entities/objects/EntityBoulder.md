# Function: EntityBoulder

## Description
Controls boulder objects with three operational phases: rolling with gravity, wall collision detection via forward projection, and trigger-based reset to starting position. While rolling, processes sector triggers each frame and tracks floor height. Detects walls by projecting a point ahead using the entity's yaw and reverting on collision. On level 16, includes per-boulder proximity tracking relative to Lara for achievement progression.

## Notes
- Only called by the game loop for entities on the active processing list (`ENTITY_STATUS` bit 0 set)
- Called with the entity's index into the entity array, not a pointer
- **Three phases** controlled by `ENTITY_STATUS` bits 1–2:
  - Bit 1 set: rolling — active physics, animation, trigger processing
  - Bit 2 set: resetting — trigger/timer-based deactivation and position reset
  - Neither set: returns immediately (inactive)
- **Rolling phase**:
  - If boulder is above the floor and gravity flag (bit 3) is not set: sets initial fall speed and enables gravity (sets `ENTITY_STATUS` bit 3)
  - If boulder is on the floor with current state 0: sets target state 1 (stopped)
  - Calls `ProcessEntityAnimation` for movement
  - Calls `ProcessTriggers` on the current sector every frame
  - **Landing**: when boulder is within 256 units of the floor, snaps Y to floor, clears gravity flag and fall speed
  - **Wall collision**: projects a point ahead using the entity's yaw with sine/cosine lookups. If the floor at that point drops below the boulder's Y, the boulder stops — reverts X/Z to saved positions, clears bit 1, sets bit 2 (transitions to reset phase), snaps Y to floor, clears speeds
- **Reset phase**: uses the trigger count / timer toggle logic to determine when to reset. When target resolves to 0:
  - Restores original X, Y, Z and room from `ENTITY_BEHAVIOUR` data
  - Resets animation to the model's default first animation
  - Clears status bits 1 and 2 (fully inactive)
  - Removes from active processing list
- **Level 16 tracking**: maps specific entity IDs to boulder indices (0–4). For indices 3–4, checks if Lara has a gravity-related flag set, compares animation bounds and positions in sector grid coordinates. For indices 0–2, compares Lara's room and sector Z position to the boulder's with room-specific grid bounds. Updates a per-boulder tracking state
- **Achievement tracking**: on levels 16–19, increments a per-level counter when the boulder lands and calls the achievement stats update
- **Level 5 special**: on level 5 in room 47, sets a tracking flag during the reset phase and clears it when the boulder lands during the rolling phase
- Handles room transitions via `GetSector` each frame during the rolling phase

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
// Log when a boulder transitions between phases
mod.hook('EntityBoulder')
    .onEnter(function(entityId) {
        const entities = game.readVar(game.module, 'Entities');
        const entity = entities.add(entityId * ENTITY_SIZE);
        this._status = entity.add(ENTITY_STATUS).readU16();
    })
    .onLeave(function(returnValue, entityId) {
        const entities = game.readVar(game.module, 'Entities');
        const entity = entities.add(entityId * ENTITY_SIZE);
        const newStatus = entity.add(ENTITY_STATUS).readU16();
        if ((this._status & 6) !== (newStatus & 6)) {
            log('Boulder', entityId, 'phase changed from',
                this._status & 6, 'to', newStatus & 6);
        }
    });
```

### Calling from mod code
```javascript
game.callFunction(game.module, 'EntityBoulder', boulderEntityIndex);
```

## Pseudocode
```
function EntityBoulder(entityId):
    entity = entities[entityId]
    status = entity[ENTITY_STATUS]

    // Level 16: map specific entity IDs to boulder indices (0–4)
    // Used later for per-boulder Lara proximity tracking
    boulderIndex = lookupBoulderIndex(entityId)  // -1 if untracked

    // --- Phase dispatch ---
    if (status & 6) == 2:
        goto ROLLING
    if (status & 6) == 4:
        goto RESETTING
    return  // inactive

RESETTING:
    // Trigger/timer toggle
    target = (~(entity[ENTITY_FLAGS] >> 14)) & 1
    if ENTITY_FLAGS bits 9–13 all set:
        // Timer-based toggle (see EntityBarricade)
        ...resolve target using ENTITY_TIMER...
    else:
        target = target ^ 1

    if target == 0:
        // Reset boulder to starting position
        clear status bits 1 and 2
        restore X, Y, Z, room from ENTITY_BEHAVIOUR data
        reset animation to model's first animation
        clear states and speeds
        removeFromProcessingList(entityId)

    // Level 5, room 47: set tracking flag
    return

ROLLING:
    if entity.y < entity.floor:
        // Above the floor — enable gravity
        if status bit 3 not set:
            entity[ENTITY_Y_SPEED] = initial fall speed
            set status bit 3  // gravity on

    else if entity[ENTITY_CURRENT_STATE] == 0:
        // On floor, idle state — transition to stopped
        entity[ENTITY_TARGET_STATE] = 1

        // Achievement tracking (levels 16–19)
        if applicable:
            increment per-level counter
            updateAchievementStats()

        // Level 5, room 47: clear tracking flag

    // Save current X and Z for wall collision rollback
    prevX = entity.x
    prevZ = entity.z

    ProcessEntityAnimation(entity)

    // Room transition
    sector = GetSector(entity.x, entity.y, entity.z, &roomOut)
    if roomOut != entity[ENTITY_ROOM]:
        changeRoom(entityId, roomOut)

    // Update floor tracking
    entity.previousFloor = entity.floor
    entity.floor = CalculateFloorHeight(sector, entity.x, entity.y, entity.z)
    ProcessTriggers(sector, 1)

    // Landing check
    if entity.floor - 256 <= entity.y:
        entity.y = entity.floor
        clear status bit 3  // gravity off
        entity[ENTITY_Y_SPEED] = 0

    // Level 16: per-boulder Lara proximity tracking
    if level == 16 AND boulderIndex >= 0:
        if boulderIndex > 2:
            // Check Lara gravity flag, compare animation bounds
            // and sector grid positions — mark close if overlapping
        else:
            // Compare Lara room and sector Z to boulder
            // Room-specific grid bounds checking
            // Mark as close (1) or passed (3)

    // --- Wall collision detection ---
    // Project a point ahead using entity yaw (sine/cosine)
    projectedX = entity.x + forward X offset from yaw
    projectedZ = entity.z + forward Z offset from yaw

    sector = GetSector(projectedX, entity.y, projectedZ, &roomOut)
    floorAhead = CalculateFloorHeight(sector, projectedX, entity.y, projectedZ)

    if floorAhead < entity.y:
        // Wall or drop ahead — stop boulder
        entity.x = prevX
        entity.z = prevZ
        clear status bit 1  // no longer rolling
        set status bit 2    // enter reset phase
        entity.y = entity.floor
        clear speeds
```
