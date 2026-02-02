# Variable: Entities

## Description
Pointer to the entity array. Each entity is `ENTITY_SIZE` (0xE50) bytes.

## Notes
- Use with entity constants (e.g. `ENTITY_X`, `ENTITY_Y`, `ENTITY_HEALTH`) to access individual entity properties
- Index with `LaraId` to get Lara's entity, or iterate up to `EntitiesCount`

## Details

| Field     | Value           |
|-----------|-----------------|
| Type      | `Pointer`       |

## Usage
### Calling from mod code
```javascript
const entities = game.readVar(game.module, 'Entities');
const count = game.readVar(game.module, 'EntitiesCount');
```
