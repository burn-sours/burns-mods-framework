# Function: ProcessEntityMovement

## Description
Handles per-frame movement for an enemy entity. Calls `ProcessEntityAnimation` internally to advance the animation and update speed-based position, then validates and constrains the resulting movement against sector boundaries, zone limits, floor/ceiling heights, and entity-to-entity collisions. Also applies yaw rotation and pitch tilt. Counterpart to `ProcessLaraAnimation` — this is the movement pipeline for all non-Lara entities.

## Notes
- Returns early (0) if the entity has no behaviour data (`ENTITY_BEHAVIOUR` is null)
- Calls `ProcessEntityAnimation` to advance the animation and apply speed-based XZ movement
- If the entity dies during animation processing (status indicates death): sets health to a large negative value, frees AI data, removes entity from the active processing list, and returns 0
- After animation, validates the new position:
  - Checks the destination sector's box index, zone, and height limits against the entity's behaviour constraints (allowed step-up/step-down range)
  - If the new position is invalid, clamps XZ back within the previous sector grid cell
- Performs sector-boundary-aware movement: tests whether the entity can cross into adjacent sectors and adjusts position if blocked, using `ENTITY_YAW` to determine preferred direction when choices exist
- Applies `turnDelta` to `ENTITY_YAW` and adjusts `ENTITY_PITCH` toward `tiltDelta × 8`, clamped ±0x222 per frame
- Checks for entity-to-entity collisions in the same room — if another active entity with XZ speed is within collision radius (based on model data), reverts to the old position and returns 1
- For entities with a step height (set in behaviour data): moves vertically toward a target Y, clamped by step height per frame, checks floor and ceiling, and calculates pitch from the vertical/horizontal speed ratio via `Atan2`
- For entities without step height: snaps to the floor with a max descent rate of 0x40 per frame
- Triggers a room change if the entity moved into a different room

## Details

| Field     | Value                          |
|-----------|--------------------------------|
| Usage     | `Hook & Call`                  |
| Params    | `int, int, int`                |
| Return    | `int`                          |

### Parameters

| #   | Type  | Description                                    |
|-----|-------|------------------------------------------------|
| 0   | `int` | Entity index in the entity array               |
| 1   | `int` | Turn delta — yaw rotation to apply this frame  |
| 2   | `int` | Tilt delta — pitch adjustment factor           |

### Return Values

| Value | Description                                      |
|-------|--------------------------------------------------|
| `0`   | Entity was killed or has no behaviour data       |
| `1`   | Movement processed successfully                  |

## Usage
### Hooking
```javascript
// Log when an entity is killed during movement
mod.hook('ProcessEntityMovement')
    .onLeave(function(returnValue, entityId, turnDelta, tiltDelta) {
        if (returnValue === 0) {
            log('Entity', entityId, 'removed during movement');
        }
    });
```

### Calling from mod code
```javascript
// Manually process movement for an entity
const result = game.callFunction(game.module, 'ProcessEntityMovement', entityIndex, turn, tilt);
```

## Pseudocode
```
function ProcessEntityMovement(entityId, turnDelta, tiltDelta):
    entity = entities[entityId]
    behaviour = entity[ENTITY_BEHAVIOUR]
    if behaviour == null:
        return 0

    // Save old position
    oldX = entity[ENTITY_X]
    oldY = entity[ENTITY_Y]
    oldZ = entity[ENTITY_Z]

    // Get current box floor height and select zone table
    currentBoxHeight = boxes[entity[ENTITY_BOX_INDEX]].height
    zoneTable = selectZoneTable(behaviour, flipMapState)

    // Advance animation (updates position via speed + yaw)
    ProcessEntityAnimation(entity)

    // Check if entity died during animation
    if entity[ENTITY_STATUS] indicates death:
        entity[ENTITY_HEALTH] = 0xC000
        free behaviour data, decrement active AI count
        remove from processing list
        return 0

    // Get bounding box and resolve sector at new position
    bounds = GetEntityBox(entity)
    newY = entity[ENTITY_Y] + bounds.minY
    sector = GetSector(entity[ENTITY_X], newY, entity[ENTITY_Z], &room)
    newBoxHeight = boxes[sector.boxIndex].height

    // Validate movement against zone and height limits
    if sector invalid OR zone changed OR height difference out of range:
        clamp entity[ENTITY_X] and entity[ENTITY_Z] within old sector grid
        re-resolve sector

    // Test sector boundary crossings
    // Check if entity can move into adjacent sectors
    // Adjust X/Z if blocked by impassable boundaries
    // Uses ENTITY_YAW to prefer forward direction

    // Apply rotation and tilt
    entity[ENTITY_YAW] += turnDelta
    adjust entity[ENTITY_PITCH] toward tiltDelta * 8 (clamped ±0x222)

    // Entity-to-entity collision check
    for each entity in same room:
        if active AND has speed AND within collision radius:
            revert to oldX, oldY, oldZ
            return 1

    // Vertical movement
    if behaviour has step height:
        move entity[ENTITY_Y] toward target, clamped by step height
        check floor and ceiling at new position
        if blocked: revert X/Z, use max step
        calculate ENTITY_PITCH from Atan2(xzSpeed, -verticalDelta)
    else:
        snap entity[ENTITY_Y] to floor (max descent 0x40 per frame)

    // Room transition
    if room changed:
        changeRoom(entityId, newRoom)

    return 1
```
