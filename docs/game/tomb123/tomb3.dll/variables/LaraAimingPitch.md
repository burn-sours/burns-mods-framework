# Variable: LaraAimingPitch

## Description
The vertical (pitch) angle of Lara's aim.

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
| `0`     | 0°      | Level           |
| `16384` | 90°     | Down            |
| `32768` | 180°    | Behind (inverted)|
| `49152` | 270°    | Up              |

## Usage
### Calling from mod code
```javascript
const pitch = game.readVar(game.module, 'LaraAimingPitch');

// Convert to degrees
const degrees = pitch * 360 / 65536;
```
