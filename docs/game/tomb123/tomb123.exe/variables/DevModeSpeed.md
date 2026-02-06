# Variable: DevModeSpeed

## Description
Game speed multiplier when developer mode is active.

## Notes
- Only effective when DevMode is enabled

## Details

| Field     | Value           |
|-----------|-----------------|
| Type      | `Int32`         |

## Usage
### Calling from mod code
```javascript
const speed = game.readVar('tomb123.exe', 'DevModeSpeed');

// Set game speed
game.writeVar('tomb123.exe', 'DevModeSpeed', 2);
```
