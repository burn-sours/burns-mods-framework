# Function: GetRelYawPitch

## Description
Computes the yaw and pitch angles from a 3D coordinate difference. Takes three axis deltas and writes two angle values (yaw and pitch) to the output pointer.

Yaw is calculated from the two horizontal components using `Atan2`. Pitch is calculated by first computing the horizontal distance (integer square root of the sum of squared horizontal components), then using `Atan2` of the horizontal distance against the vertical component, with a sign correction applied.

## Notes
- Output is two consecutive Int16 angle values at the result pointer: yaw at offset 0, pitch at offset 2
- Params 0 and 2 are the horizontal components (X and Z), param 1 is the vertical component (Y)
- Uses the engine's `Atan2` function for both angle calculations
- The integer square root uses a classic bit-by-bit algorithm — shifts the input values right in groups of 2 bits if any component overflows a short, to prevent integer overflow during squaring
- Sign correction on pitch: if the vertical difference and computed pitch have the same sign, the pitch is negated — this ensures the angle is oriented correctly relative to the vertical axis

## Details

| Field     | Value                          |
|-----------|--------------------------------|
| Usage     | `Hook & Call`                  |
| Params    | `int, int, int, pointer`       |
| Return    | `void`                         |

### Parameters

| #   | Type      | Description                                              |
|-----|-----------|----------------------------------------------------------|
| 0   | `int`     | X difference (horizontal)                                |
| 1   | `int`     | Y difference (vertical)                                  |
| 2   | `int`     | Z difference (horizontal)                                |
| 3   | `pointer` | Output — two consecutive Int16 values: [yaw, pitch]      |

## Usage
### Hooking
```javascript
mod.hook('GetRelYawPitch')
    .onEnter(function(xDiff, yDiff, zDiff, result) {
        // xDiff, yDiff, zDiff: coordinate deltas
        // result: pointer to output [yaw, pitch] (two Int16 values)
    });
```

### Calling from mod code
```javascript
// Compute angles from position A to position B
const result = game.alloc(4); // two Int16 values
game.callFunction(game.module, 'GetRelYawPitch', xB - xA, yB - yA, zB - zA, result);
const yaw = result.readS16();
const pitch = result.add(2).readS16();
```

## Pseudocode
```
function GetRelYawPitch(xDiff, yDiff, zDiff, result):
    // compute yaw from horizontal components
    yaw = Atan2(zDiff, xDiff)
    result[0] = yaw

    // scale down if any component overflows Int16 range
    while xDiff overflows short OR zDiff overflows short OR yDiff overflows short:
        xDiff >>= 2
        zDiff >>= 2
        yDiff >>= 2

    // integer square root of horizontal distance squared
    sumSquares = xDiff * xDiff + yDiff * yDiff
    horizontalDist = isqrt(sumSquares)

    // compute pitch from horizontal distance vs vertical component
    pitch = Atan2(horizontalDist, zDiff)

    // sign correction: negate if vertical diff and pitch have same sign
    if (zDiff > 0 and pitch > 0) or (zDiff < 0 and pitch < 0):
        pitch = -pitch

    result[1] = pitch
```
