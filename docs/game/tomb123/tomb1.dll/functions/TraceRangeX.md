# Function: TraceRangeX

## Description
Traces a horizontal ray along the X axis from a source position to a target position, stepping sector by sector. At each sector boundary, it checks whether the interpolated position is in open space (between floor and ceiling). If an obstruction is found, the target position is updated in-place to the point where the ray was blocked.

Y and Z coordinates are linearly interpolated along the X axis as the ray steps forward or backward through sectors.

## Notes
- Both params use the same position struct as GetLOS: three consecutive Int32 values (x, y, z) followed by a UInt16 room ID at byte offset 12
- Param 0 (source) is read-only. Param 1 (target) is read-write — modified in-place when the ray is blocked
- If source and target have the same X coordinate, returns 1 immediately (trivially in range)
- Steps in 1024-unit increments (one sector width), aligned to sector boundaries
- At each step, checks two points: the current sector boundary and the adjacent sector boundary
- Uses GetSector, CalculateFloorHeight, and CalculateCeilingHeight internally
- Tracks room transitions as the ray crosses sector boundaries
- Part of the spatial range-checking system alongside TraceRangeZ (which traces along the Z axis)

## Details

| Field     | Value                  |
|-----------|------------------------|
| Usage     | `Hook & Call`          |
| Params    | `pointer, pointer`     |
| Return    | `int`                  |

### Parameters

| #   | Type      | Description                                                        |
|-----|-----------|--------------------------------------------------------------------|
| 0   | `pointer` | Source position — three Int32 values: x, y, z + UInt16 room ID at byte offset 12 (read-only) |
| 1   | `pointer` | Target position — three Int32 values: x, y, z + UInt16 room ID at byte offset 12 (read-write, updated on obstruction) |

### Return Values

| Value | Description                                                    |
|-------|----------------------------------------------------------------|
| `1`   | Clear path — no obstruction between source and target along the X axis |
| `0`   | Blocked at adjacent sector boundary — target updated to last position before obstruction |
| `-1`  | Blocked at current sector boundary — target updated to obstruction point |

## Usage
### Hooking
```javascript
mod.hook('TraceRangeX')
    .onEnter(function(source, target) {
        // source: pointer to [x, y, z] Int32 values + UInt16 room ID
        // target: pointer to [x, y, z] Int32 values + UInt16 room ID
    })
    .onLeave(function(returnValue, source, target) {
        // returnValue: 1 = clear, 0 = blocked (adjusted), -1 = blocked (at boundary)
        // target may have been updated if blocked
    });
```

### Calling from mod code
```javascript
const source = game.alloc(14);
source.writeS32(srcX);
source.add(4).writeS32(srcY);
source.add(8).writeS32(srcZ);
source.add(12).writeU16(srcRoomId);

const target = game.alloc(14);
target.writeS32(tgtX);
target.add(4).writeS32(tgtY);
target.add(8).writeS32(tgtZ);
target.add(12).writeU16(tgtRoomId);

const result = game.callFunction(game.module, 'TraceRangeX', source, target);

if (result !== 1) {
    // target was updated to where the ray was blocked
    const blockedX = target.readS32();
    const blockedY = target.add(4).readS32();
    const blockedZ = target.add(8).readS32();
    const blockedRoom = target.add(12).readU16();
}
```

## Pseudocode
```
function TraceRangeX(source, target):
    xDiff = target.x - source.x

    if xDiff == 0:
        return 1  // same X, trivially in range

    // interpolation slopes per X unit (scaled by 1024)
    ySlope = (target.y - source.y) * 1024 / xDiff
    zSlope = (target.z - source.z) * 1024 / xDiff

    roomId = source.roomId
    currentY = source.y
    currentZ = source.z

    if xDiff < 0:
        // stepping backward (negative X direction)
        x = alignToSectorFloor(source.x)
        interpolate currentY, currentZ to sector boundary

        while x > target.x:
            // check current sector boundary
            tile = GetSector(x, currentY, currentZ, roomId)
            floor = CalculateFloorHeight(tile, x, currentY, currentZ)
            ceiling = CalculateCeilingHeight(tile, x, currentY, currentZ)
            if currentY > floor or currentY < ceiling:
                update target to (x, currentY, currentZ, roomId)
                return -1  // blocked at boundary

            // check adjacent sector boundary
            nextX = x - 1
            tile = GetSector(nextX, currentY, currentZ, roomId)
            floor = CalculateFloorHeight(tile, nextX, currentY, currentZ)
            ceiling = CalculateCeilingHeight(tile, nextX, currentY, currentZ)
            if currentY > floor or currentY < ceiling:
                update target to (x, currentY, currentZ, roomId)
                return 0  // blocked at adjacent boundary

            // advance to next sector
            currentY -= ySlope
            currentZ -= zSlope
            x -= 1024

    else:
        // stepping forward (positive X direction)
        x = alignToSectorCeiling(source.x)
        interpolate currentY, currentZ to sector boundary

        while x < target.x:
            // check current sector boundary
            tile = GetSector(x, currentY, currentZ, roomId)
            floor = CalculateFloorHeight(tile, x, currentY, currentZ)
            ceiling = CalculateCeilingHeight(tile, x, currentY, currentZ)
            if currentY > floor or currentY < ceiling:
                update target to (x, currentY, currentZ, roomId)
                return -1  // blocked at boundary

            // check adjacent sector boundary
            nextX = x + 1
            tile = GetSector(nextX, currentY, currentZ, roomId)
            floor = CalculateFloorHeight(tile, nextX, currentY, currentZ)
            ceiling = CalculateCeilingHeight(tile, nextX, currentY, currentZ)
            if currentY > floor or currentY < ceiling:
                update target to (x, currentY, currentZ, roomId)
                return 0  // blocked at adjacent boundary

            // advance to next sector
            currentY += ySlope
            currentZ += zSlope
            x += 1024

    // reached target without obstruction
    update target roomId
    return 1
```
