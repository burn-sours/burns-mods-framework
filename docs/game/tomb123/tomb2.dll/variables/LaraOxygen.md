# Variable: LaraOxygen

## Description
Lara's current oxygen/air level when underwater.

## Notes
- Decreases while submerged
- Lara drowns when it hits 0
- Refills when she surfaces

## Details

| Field     | Value           |
|-----------|-----------------|
| Type      | `Int16`         |

## Usage
### Calling from mod code
```javascript
const oxygen = game.readVar(game.module, 'LaraOxygen');

// Force full oxygen
game.writeVar(game.module, 'LaraOxygen', 1800);
```
