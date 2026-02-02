# Variable: LaraAimingRight

## Description
Flag indicating whether Lara is holding her right gun up (raised/aiming pose).

## Notes
- Binary flag: 0 or 1

## Details

| Field     | Value           |
|-----------|-----------------|
| Type      | `Int16`         |

## Value Range

| Value | Description                    |
|-------|--------------------------------|
| `0`   | Right gun lowered              |
| `1`   | Right gun raised               |

## Usage
### Calling from mod code
```javascript
const rightUp = game.readVar(game.module, 'LaraAimingRight');
```
