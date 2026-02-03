# Variable: Lara

## Description
Pointer to Lara's entity data structure in memory. This is a direct pointer to Lara's entry in the `Entities` array.

## Notes
- All entity constants (`ENTITY_X`, `ENTITY_Y`, `ENTITY_HEALTH`, etc.) apply — see `Entities` doc for the full constant reference
- Also used as the base for Lara-specific block variables like `LaraCircleShadow`, `LaraGunFlags`
- Equivalent to `Entities + (LaraId * ENTITY_SIZE)`

## Details

| Field     | Value           |
|-----------|-----------------|
| Type      | `Pointer`       |

## Usage
### Calling from mod code
```javascript
const lara = game.readVar(game.module, 'Lara');

// Read Lara's position
const x = game.memory.readS32(lara.add(game.constants.ENTITY_X));
const y = game.memory.readS32(lara.add(game.constants.ENTITY_Y));
const z = game.memory.readS32(lara.add(game.constants.ENTITY_Z));

// Read Lara's health
const health = game.memory.readS16(lara.add(game.constants.ENTITY_HEALTH));
```
