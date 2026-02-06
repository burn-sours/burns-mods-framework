# Variable: LaraAimingEnemy

## Description
Pointer to the entity Lara is currently targeting/aiming at.

## Notes
- Zero when Lara is not aiming at anything

## Details

| Field     | Value           |
|-----------|-----------------|
| Type      | `UInt64`        |

## Value Range

| Value | Description                    |
|-------|--------------------------------|
| `0`   | Not aiming at anything         |
| `!0`  | Pointer to targeted entity     |

## Usage
### Calling from mod code
```javascript
const target = game.readVar(game.module, 'LaraAimingEnemy');

if (target) {
    // Lara is aiming at something
}
```
