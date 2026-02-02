# Variable: Projectiles

## Description
Pointer to the projectiles array. Tracks active projectiles in the level (arrows, darts, etc.).

## Notes
- Each projectile is `PROJECTILE_SIZE` (0x44) bytes

## Details

| Field     | Value           |
|-----------|-----------------|
| Type      | `Pointer`       |

## Usage
### Calling from mod code
```javascript
const projectiles = game.readVar(game.module, 'Projectiles');
```
