# Function: GetLOS

## Description
Tests whether a clear line of sight exists between a source position and a target position by checking if the target point sits in open space (between floor and ceiling). If the target is inside geometry, it steps backward along the line in 4 samples to find the furthest reachable point, updates the target position in-place to that point, and returns 0.

## Notes
- Param 0 (source) is read-only. Param 1 (target) is read-write — modified in-place when LOS fails
- Target position struct: three consecutive Int32 values (x, y, z) followed by a room ID as UInt16 at byte offset 12. The room ID may also be updated on failure
- Uses GetTileData, GetFloorHeight, and GetCeilingHeight internally
- The sampling steps from ~31/32 to ~7/8 of the way along the line (near the target end), providing coarse resolution for the obstruction point
- Floor check: if floor height at target < target Y, the target is below the floor
- Ceiling check: if ceiling height at target > target Y, the target is above the ceiling

## Details

| Field     | Value                  |
|-----------|------------------------|
| Usage     | `Hook & Call`          |
| Params    | `pointer, pointer`     |
| Return    | `int`                  |

### Parameters

| #   | Type      | Description                                                        |
|-----|-----------|--------------------------------------------------------------------|
| 0   | `pointer` | Source position — three Int32 values: x, y, z (read-only)          |
| 1   | `pointer` | Target position — three Int32 values: x, y, z + UInt16 room ID at byte offset 12 (read-write, updated on failure) |

### Return Values

| Value | Description                                                    |
|-------|----------------------------------------------------------------|
| `1`   | Line of sight exists — target is in open space                 |
| `0`   | Line of sight blocked — target position updated to last valid sample point |

## Usage
### Hooking
```javascript
mod.hook('GetLOS')
    .onEnter(function(source, target) {
        // source: pointer to [x, y, z] Int32 values
        // target: pointer to [x, y, z] Int32 values + UInt16 room ID
    })
    .onLeave(function(retval) {
        // retval: 1 = clear LOS, 0 = blocked
    });
```

### Calling from mod code
```javascript
// Set up source position
const source = game.alloc(12);
source.writeS32(srcX);
source.add(4).writeS32(srcY);
source.add(8).writeS32(srcZ);

// Set up target position (12 bytes position + 2 bytes room ID)
const target = game.alloc(14);
target.writeS32(tgtX);
target.add(4).writeS32(tgtY);
target.add(8).writeS32(tgtZ);
target.add(12).writeU16(roomId);

const hasLOS = game.callFunction(game.module, 'GetLOS', source, target);

if (!hasLOS) {
    // target was updated to the furthest reachable point
    const reachedX = target.readS32();
    const reachedY = target.add(4).readS32();
    const reachedZ = target.add(8).readS32();
}
```

## Pseudocode
```
function GetLOS(source, target):
    roomId = target.roomId
    tile = GetTileData(target.x, target.y, target.z, roomId)
    floorHeight = GetFloorHeight(tile, target.x, target.y, target.z)

    if floorHeight < target.y:
        // target is below the floor — blocked downward
        // step backward along the line to find furthest reachable point
        startX = source.x + 7/8 * (target.x - source.x)
        startY = source.y + 7/8 * (target.y - source.y)
        startZ = source.z + 7/8 * (target.z - source.z)

        for step = 3 down to 0:
            sampleX = startX + step/4 * (target.x - startX)
            sampleY = startY + step/4 * (target.y - startY)
            sampleZ = startZ + step/4 * (target.z - startZ)

            tile = GetTileData(sampleX, sampleY, sampleZ, roomId)
            floor = GetFloorHeight(tile, sampleX, sampleY, sampleZ)

            if sampleY < floor:
                break  // found a point above the floor

        update target to last sampled position and room ID
        return 0  // blocked

    else:
        // floor is fine, now check ceiling
        tile = GetTileData(target.x, target.y, target.z, roomId)
        ceilingHeight = GetCeilingHeight(tile, target.x, target.y, target.z)

        if target.y < ceilingHeight:
            // target is above the ceiling — blocked upward
            // same backward stepping approach
            startX = source.x + 7/8 * (target.x - source.x)
            startY = source.y + 7/8 * (target.y - source.y)
            startZ = source.z + 7/8 * (target.z - source.z)

            for step = 3 down to 0:
                sampleX = startX + step/4 * (target.x - startX)
                sampleY = startY + step/4 * (target.y - startY)
                sampleZ = startZ + step/4 * (target.z - startZ)

                tile = GetTileData(sampleX, sampleY, sampleZ, roomId)
                ceiling = GetCeilingHeight(tile, sampleX, sampleY, sampleZ)

                if ceiling < sampleY:
                    // found a point below the ceiling
                    update target to this position and room ID
                    return 0  // blocked

            update target to last sampled position and room ID
            return 0  // blocked

        else:
            // target is between floor and ceiling — clear LOS
            return 1
```
