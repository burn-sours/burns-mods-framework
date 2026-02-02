# Variable: CameraYaw

## Description
Horizontal (yaw) rotation angle of the camera.

## Notes
- Uses the Tomb Raider fixed-point angle system
- Full 16-bit range (0–65535) maps to 0°–360°
- Conversion: `degrees = value * 360 / 65536`

## Details

| Field     | Value           |
|-----------|-----------------|
| Type      | `UInt16`        |

## Value Range

| Value   | Degrees | Description     |
|---------|---------|-----------------|
| `0`     | 0°      | Forward         |
| `16384` | 90°     | Right           |
| `32768` | 180°    | Behind          |
| `49152` | 270°    | Left            |

## Usage
### Calling from mod code
```javascript
const yaw = game.readVar(game.module, 'CameraYaw');

// Convert to degrees
const degrees = yaw * 360 / 65536;
```
