# Variable: LaraClimbState

## Description
Flag indicating whether Lara is currently climbing.

## Notes
- Binary flag: 0 or 1

## Details

| Field     | Value           |
|-----------|-----------------|
| Type      | `Int16`         |

## Value Range

| Value | Description                    |
|-------|--------------------------------|
| `0`   | Not climbing                   |
| `1`   | Climbing                       |

## Usage
### Calling from mod code
```javascript
const climbing = game.readVar(game.module, 'LaraClimbState');

if (climbing) {
    // Lara is climbing
}
```
