# Variable: LevelCompleted

## Description
Flag indicating whether the current level has been completed.

## Notes
- Set when the player triggers a level-end event (e.g. reaching the exit)

## Details

| Field     | Value           |
|-----------|-----------------|
| Type      | `Int32`         |

## Value Range

| Value | Description                    |
|-------|--------------------------------|
| `0`   | Level in progress              |
| `!0`  | Level completed                |

## Usage
### Calling from mod code
```javascript
const completed = game.readVar(game.module, 'LevelCompleted');

if (completed) {
    // level is done
}
```
