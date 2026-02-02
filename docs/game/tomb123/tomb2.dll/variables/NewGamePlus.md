# Variable: NewGamePlus

## Description
Flag indicating whether the current playthrough is a New Game+ run.

## Notes
- New Game+ is unlocked after completing the game

## Details

| Field     | Value           |
|-----------|-----------------|
| Type      | `UInt8`         |

## Value Range

| Value | Description                    |
|-------|--------------------------------|
| `0`   | Normal game                    |
| `!0`  | New Game+                      |

## Usage
### Calling from mod code
```javascript
const isNGPlus = game.readVar(game.module, 'NewGamePlus');

if (isNGPlus) {
    // New Game+ specific logic
}
```
