# Variable: IsInGameScene

## Description
Flag indicating whether the player is currently in an active game scene (not paused, not in menus).

## Details

| Field     | Value           |
|-----------|-----------------|
| Type      | `Int32`         |

## Value Range

| Value | Description                    |
|-------|--------------------------------|
| `0`   | Not in game scene              |
| `1`   | In game scene (unpaused)       |

## Usage
### Calling from mod code
```javascript
const inGame = game.readVar(game.module, 'IsInGameScene');

if (inGame) {
    // player is in active gameplay
}
```
