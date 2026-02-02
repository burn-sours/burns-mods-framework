# Variable: FlipMapFlags

## Description
Bitmask flags controlling the current state used when flipping the map. Flip maps swap room geometry between alternate versions (e.g. flooded/drained rooms).

## Notes
- Does not trigger a flip on its own — controls which state is used when a flip occurs
- Block of 20 bytes (0x14)

## Details

| Field     | Value           |
|-----------|-----------------|
| Type      | `Block`         |
| Size      | `0x14`          |

## Usage
### Calling from mod code
```javascript
const ptr = game.getVarPtr(game.module, 'FlipMapFlags');
```
