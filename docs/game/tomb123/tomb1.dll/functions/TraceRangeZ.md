# Function: TraceRangeZ

## Description
Traces a horizontal ray along the Z axis from a source position to a target position, stepping sector by sector. At each sector boundary, it checks whether the interpolated position is in open space (between floor and ceiling). If an obstruction is found, the target position is updated in-place to the point where the ray was blocked.

X and Y coordinates are linearly interpolated along the Z axis as the ray steps forward or backward through sectors.

## Notes
- Both params use the same position struct as GetLineOfSight: three consecutive Int32 values (x, y, z) followed by a UInt16 room ID at byte offset 12
- Param 0 (source) is read-only. Param 1 (target) is read-write — modified in-place when the ray is blocked
- If source and target have the same Z coordinate, returns 1 immediately (trivially in range)
- Steps in 1024-unit increments (one sector width), aligned to sector boundaries
- At each step, checks two points: the current sector boundary and the adjacent sector boundary
- Uses GetSector, CalculateFloorHeight, and CalculateCeilingHeight internally
- Tracks room transitions as the ray crosses sector boundaries
- Part of the spatial range-checking system alongside TraceRangeX (which traces along the X axis)

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
| `1`   | Clear path — no obstruction between source and target along the Z axis |
| `0`   | Blocked at adjacent sector boundary — target updated to last position before obstruction |
| `-1`  | Blocked at current sector boundary — target updated to obstruction point |

## Usage
### Hooking
```javascript
mod.hook('TraceRangeZ')
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

const result = game.callFunction(game.module, 'TraceRangeZ', source, target);

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
function TraceRangeZ(source, target):
    zDiff = target.z - source.z

    if zDiff == 0:
        return 1  // same Z, trivially in range

    // interpolation slopes per Z unit (scaled by 1024)
    xSlope = (target.x - source.x) * 1024 / zDiff
    ySlope = (target.y - source.y) * 1024 / zDiff

    roomId = source.roomId
    currentX = source.x
    currentY = source.y

    if zDiff < 0:
        // stepping backward (negative Z direction)
        z = alignToSectorFloor(source.z)
        interpolate currentX, currentY to sector boundary

        while z > target.z:
            // check current sector boundary
            tile = GetSector(currentX, currentY, z, roomId)
            floor = CalculateFloorHeight(tile, currentX, currentY, z)
            ceiling = CalculateCeilingHeight(tile, currentX, currentY, z)
            if currentY > floor or currentY < ceiling:
                update target to (currentX, currentY, z, roomId)
                return -1  // blocked at boundary

            // check adjacent sector boundary
            nextZ = z - 1
            tile = GetSector(currentX, currentY, nextZ, roomId)
            floor = CalculateFloorHeight(tile, currentX, currentY, nextZ)
            ceiling = CalculateCeilingHeight(tile, currentX, currentY, nextZ)
            if currentY > floor or currentY < ceiling:
                update target to (currentX, currentY, z, roomId)
                return 0  // blocked at adjacent boundary

            // advance to next sector
            currentX -= xSlope
            currentY -= ySlope
            z -= 1024

    else:
        // stepping forward (positive Z direction)
        z = alignToSectorCeiling(source.z)
        interpolate currentX, currentY to sector boundary

        while z < target.z:
            // check current sector boundary
            tile = GetSector(currentX, currentY, z, roomId)
            floor = CalculateFloorHeight(tile, currentX, currentY, z)
            ceiling = CalculateCeilingHeight(tile, currentX, currentY, z)
            if currentY > floor or currentY < ceiling:
                update target to (currentX, currentY, z, roomId)
                return -1  // blocked at boundary

            // check adjacent sector boundary
            nextZ = z + 1
            tile = GetSector(currentX, currentY, nextZ, roomId)
            floor = CalculateFloorHeight(tile, currentX, currentY, nextZ)
            ceiling = CalculateCeilingHeight(tile, currentX, currentY, nextZ)
            if currentY > floor or currentY < ceiling:
                update target to (currentX, currentY, z, roomId)
                return 0  // blocked at adjacent boundary

            // advance to next sector
            currentX += xSlope
            currentY += ySlope
            z += 1024

    // reached target without obstruction
    update target roomId
    return 1
```
