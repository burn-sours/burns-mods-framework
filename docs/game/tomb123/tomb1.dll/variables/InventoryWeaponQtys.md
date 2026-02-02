# Variable: InventoryWeaponQtys

## Description
Array of weapon quantities, one per weapon slot.

## Notes
- Tracks quantity for each weapon slot
- When a weapon hasn't been found yet, ammo pickups use a weapon slot with a qty to track until the weapon is found

## Details

| Field     | Value           |
|-----------|-----------------|
| Type      | `Int16`         |

## Usage
### Calling from mod code
```javascript
const qtys = game.readVar(game.module, 'InventoryWeaponQtys');
```
