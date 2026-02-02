# Variable: LaraAimingLeft

## Description
Flag indicating whether Lara is holding her left gun up (raised/aiming pose).

## Notes
- Binary flag: 0 or 1

## Details

| Field     | Value           |
|-----------|-----------------|
| Type      | `Int16`         |

## Value Range

| Value | Description                    |
|-------|--------------------------------|
| `0`   | Left gun lowered               |
| `1`   | Left gun raised                |

## Usage
### Calling from mod code
```javascript
const leftUp = game.readVar(game.module, 'LaraAimingLeft');
```
