# Variable: Lara

## Description
Pointer to Lara's entity data structure in memory. All Lara-specific offsets (position, health, state, etc.) are relative to this address.

## Notes
- Used with game constants like `ENTITY_X`, `ENTITY_Y`, `ENTITY_HEALTH` etc. to read/write Lara's properties
- Also used as the base for block variables like `LaraCircleShadow`

## Details

| Field     | Value           |
|-----------|-----------------|
| Type      | `Pointer`       |

## Usage
### Calling from mod code
```javascript
const lara = game.readVar(game.module, 'Lara');
```
