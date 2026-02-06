# Variable: GameSettings

## Description
Bitfield or value representing the current game settings state.

## Notes
- Shares the same address as MoreSettings but uses a different type (UInt8 vs Int8)
- Exact bit layout needs further investigation

## Details

| Field     | Value           |
|-----------|-----------------|
| Type      | `UInt8`         |

## Usage
### Calling from mod code
```javascript
const settings = game.readVar('tomb123.exe', 'GameSettings');
```
