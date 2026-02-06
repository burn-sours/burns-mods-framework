# Variable: ActionKeys

## Description
Bitmask of currently pressed action keys/inputs (e.g. jump, shoot, roll, action).

## Notes
- Each bit corresponds to a different input
- Read to detect what the player is pressing
- Needs more info: exact bit mappings not yet documented

## Details

| Field     | Value           |
|-----------|-----------------|
| Type      | `UInt32`        |

## Usage
### Calling from mod code
```javascript
const keys = game.readVar(game.module, 'ActionKeys');

// Check if a specific bit/flag is set
if (keys & someBitFlag) {
    // input is active
}
```
