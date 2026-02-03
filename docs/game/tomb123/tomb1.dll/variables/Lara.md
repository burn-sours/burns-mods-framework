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
const x = lara.add(ENTITY_X).readS32();
const y = lara.add(ENTITY_Y).readS32();
const z = lara.add(ENTITY_Z).readS32();

// Read Lara's health
const health = lara.add(ENTITY_HEALTH).readS16();
```
