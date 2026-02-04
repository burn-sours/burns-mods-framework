# Function: SenseLara

## Description
Gathers AI tracking data for an enemy entity relative to Lara. Resolves pathfinding zones, calculates distance, facing angles, and line-of-approach information, then writes the results into an output structure (`AI_TRACKING_SIZE` bytes). Called by enemy behaviour functions to make decisions about pursuit, attack, and awareness.

## Notes
- Reads the entity's `ENTITY_BEHAVIOUR` pointer to determine which zone type the enemy uses for pathfinding (ground, water, or fly zones), selected based on the current flip map state
- Resolves the entity's and Lara's box indices from their sector data (using room geometry and position), writing both to their respective `ENTITY_BOX_INDEX` fields
- Looks up zone values for both boxes — if entity and Lara share the same zone value, the enemy can pathfind to Lara; different values mean no reachable path
- Marks Lara's zone as blocked (bit 14) if the entity's box overlap data or behaviour mask flags prevent traversal
- Calculates the angle from entity to Lara using `Atan2`, with a directional offset derived from the entity's `ENTITY_MODEL` data and a trig lookup table
- Squared distance is capped at max int (0x7FFFFFFF) when XZ deltas exceed safe range
- Returns early with an empty output if the entity has no behaviour data

### Output Structure

The output buffer is `AI_TRACKING_SIZE` (0x16) bytes with the following fields:

| Offset | Type    | Description                                                        |
|--------|---------|--------------------------------------------------------------------|
| 0      | `short` | Entity's zone value                                                |
| 2      | `short` | Lara's zone value (bit 14 set if path is blocked for this enemy)   |
| 4      | `int`   | Squared XZ distance to Lara                                       |
| 8      | `int`   | Facing flag — 1 if entity is facing toward Lara (within ~±90°)    |
| 12     | `int`   | Same height flag — 1 if entity and Lara are within ±256 Y units   |
| 16     | `short` | Turn angle — how much entity needs to rotate to face Lara          |
| 18     | `short` | Approach angle — angle to Lara relative to Lara's yaw, offset 180° |

## Details

| Field     | Value                          |
|-----------|--------------------------------|
| Usage     | `Hook & Call`                  |
| Params    | `pointer, pointer`             |
| Return    | `void`                         |

### Parameters

| #   | Type      | Description                                              |
|-----|-----------|----------------------------------------------------------|
| 0   | `pointer` | Pointer to the enemy entity                              |
| 1   | `pointer` | Pointer to the output buffer (`AI_TRACKING_SIZE` bytes)  |

## Usage
### Hooking
```javascript
// Monitor AI data calculations for all enemies
mod.hook('SenseLara')
    .onLeave(function(returnValue, entityPtr, outputPtr) {
        const entityZone = outputPtr.readS16();
        const laraZone = outputPtr.add(2).readS16();
        const canReach = (entityZone === (laraZone & 0x3FFF));
        log('Enemy can reach Lara:', canReach);
    });
```

### Calling from mod code
```javascript
// Gather AI data for a specific enemy
const entities = game.readVar(game.module, 'Entities');
const enemyPtr = entities.add(enemyIndex * ENTITY_SIZE);
const aiData = game.alloc(AI_TRACKING_SIZE);
game.callFunction(game.module, 'SenseLara', enemyPtr, aiData);
const distSq = aiData.add(4).readS32();
const isFacing = aiData.add(8).readS32();
```

## Pseudocode
```
function SenseLara(entity, output):
    lara = readVar('Lara')
    behaviour = entity[ENTITY_BEHAVIOUR]

    if behaviour == null:
        return

    // Select zone table based on enemy type and flip map state
    // (ground, water, or fly zones — determined by behaviour flags)
    zoneTable = selectZoneTable(behaviour, flipMapState)

    // Resolve entity's box index from its room/sector
    entityRoom = rooms[entity[ENTITY_ROOM]]
    entitySector = lookupSector(entityRoom, entity[ENTITY_X], entity[ENTITY_Z])
    entityBoxIndex = entitySector.boxIndex
    entity[ENTITY_BOX_INDEX] = entityBoxIndex

    // Resolve Lara's box index the same way
    laraRoom = rooms[lara[ENTITY_ROOM]]
    laraSector = lookupSector(laraRoom, lara[ENTITY_X], lara[ENTITY_Z])
    laraBoxIndex = laraSector.boxIndex
    lara[ENTITY_BOX_INDEX] = laraBoxIndex

    // Write zone values
    output.entityZone = zoneTable[entityBoxIndex]
    output.laraZone = zoneTable[laraBoxIndex]

    // Check if Lara's box is blocked for this enemy
    laraBoxFlags = boxes[laraBoxIndex].flags
    if (behaviour.blockMask & laraBoxFlags) != 0
       OR entity's overlap data marks this box blocked:
        output.laraZone |= 0x4000  // flag as blocked

    // Calculate angle and distance to Lara
    // (with directional offset based on entity model data and trig lookup)
    entityYaw = entity[ENTITY_YAW]
    xDiff = lara[ENTITY_X] - entity[ENTITY_X]  // adjusted by model offset
    zDiff = lara[ENTITY_Z] - entity[ENTITY_Z]  // adjusted by model offset

    angleToLara = Atan2(zDiff, xDiff)

    // Squared distance (capped at max int if deltas overflow)
    if abs(xDiff) > 32000 OR abs(zDiff) > 32000:
        output.distanceSquared = 0x7FFFFFFF
    else:
        output.distanceSquared = xDiff * xDiff + zDiff * zDiff

    // Turn angle: how much entity must rotate to face Lara
    output.turnAngle = angleToLara - entityYaw

    // Approach angle: direction relative to Lara's facing + 180°
    output.approachAngle = angleToLara - lara[ENTITY_YAW] - 0x8000

    // Facing: is Lara within ~±90° of entity's forward direction?
    if abs(output.turnAngle) < ~90°:
        output.isFacing = 1
        // Same height: within ±256 Y units?
        if abs(entity[ENTITY_Y] - lara[ENTITY_Y]) < 256:
            output.isSameHeight = 1
        else:
            output.isSameHeight = 0
    else:
        output.isFacing = 0
        output.isSameHeight = 0
```
