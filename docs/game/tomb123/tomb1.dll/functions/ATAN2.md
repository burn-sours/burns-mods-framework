# Function: ATAN2

## Description
Computes the angle from a 2D delta (deltaZ, deltaX) using a lookup table. Returns the angle as a fixed-point value in the engine's angle format (0–65535 = full rotation). Equivalent to a standard atan2 but using integer math and a precomputed table.

## Notes
- Returns 0 if both deltas are zero
- Determines the quadrant from the signs of deltaZ and deltaX, reduces the problem to a first-octant lookup, then adjusts the result based on the quadrant and octant
- Uses a precomputed tangent-to-angle lookup table for the actual angle calculation
- Large input values are scaled down (both deltas shifted right equally) to fit the table index range before lookup
- The result is always returned as a positive angle value

## Details

| Field     | Value                          |
|-----------|--------------------------------|
| Usage     | `Call`                         |
| Params    | `int, int`                     |
| Return    | `int`                          |

### Parameters

| #   | Type  | Description            |
|-----|-------|------------------------|
| 0   | `int` | Delta Z (forward axis) |
| 1   | `int` | Delta X (lateral axis) |

### Return Values

| Value     | Description                                              |
|-----------|----------------------------------------------------------|
| `0`       | Both deltas are zero                                     |
| `0–65535` | Angle in the engine's fixed-point format (full rotation) |

## Usage
### Calling from mod code
```javascript
const angle = game.callFunction(game.module, 'ATAN2', deltaZ, deltaX);
```

## Pseudocode
```
function ATAN2(deltaZ, deltaX):
    if deltaZ == 0 and deltaX == 0:
        return 0

    absZ = abs(deltaZ)
    absX = abs(deltaX)

    // determine quadrant (0-3) from signs
    quadrant = 0
    if deltaZ < 0: quadrant += 4
    if deltaX < 0: quadrant += 2

    // determine octant within quadrant
    if absZ < absX:
        minor = absZ
        major = absX
        octant = quadrant + 1
    else:
        minor = absX
        major = absZ
        octant = quadrant

    // scale down large values to fit lookup table range
    while minor doesn't fit in 16 bits:
        minor >>= 1
        major >>= 1

    // lookup table: maps (minor/major) ratio to angle
    tableIndex = (minor << 11) / major
    angle = angleLookupTable[tableIndex] + quadrantOffsetTable[octant]

    return abs(angle)
```
