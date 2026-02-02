# Variable: InterpolationFactor

## Description
Fixed-point interpolation factor used for smoothing camera and rendering between game ticks. Controls how far between the previous and current game tick the renderer should blend.

## Notes
- Fixed-point 8-bit fraction: `0x100` (256) represents 1.0 (fully interpolated)
- Multiplied by `0.00390625` (1/256) to convert to float
- When `CanInterpolateCamera()` returns 0, factor is reset to `0x100`
- Camera positions interpolated as: `previous + (current - previous) * factor / 256`

## Details

| Field     | Value           |
|-----------|-----------------|
| Type      | `UInt32`        |

## Value Range

| Value  | Description                              |
|--------|------------------------------------------|
| `0x0`  | No interpolation (at previous frame)     |
| `0x100`| Fully interpolated (at current frame)    |

## Usage
### Calling from mod code
```javascript
const factor = game.readVar(game.module, 'InterpolationFactor');

// Convert to 0.0-1.0 float
const t = factor / 256;
```
