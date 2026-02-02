# Variable: RngSeed

## Description
The current random number generator seed. Controls all pseudo-random behaviour in the game.

## Details

| Field     | Value           |
|-----------|-----------------|
| Type      | `UInt32`        |

## Usage
### Calling from mod code
```javascript
const seed = game.readVar(game.module, 'RngSeed');

// Force a specific seed for deterministic behaviour
game.writeVar(game.module, 'RngSeed', 12345);
```
