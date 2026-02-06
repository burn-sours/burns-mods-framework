# Variable: BinaryTick

## Description
A binary flag that alternates between 0 and 1 each game tick. Useful for timing logic that should run every other frame.

## Notes
- Toggled via XOR every game loop: `binaryTick = binaryTick ^ 1`
- Commonly used to halve the frequency of per-frame operations

## Details

| Field     | Value           |
|-----------|-----------------|
| Type      | `Int8`          |

## Value Range

| Value | Description                    |
|-------|--------------------------------|
| `0`   | Even tick                      |
| `1`   | Odd tick                       |

## Usage
### Calling from mod code
```javascript
const tick = game.readVar(game.module, 'BinaryTick');

// Run logic every other frame
if (tick === 1) {
    // do something
}
```
