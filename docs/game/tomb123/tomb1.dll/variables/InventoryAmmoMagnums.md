# Variable: InventoryAmmoMagnums

## Description
Magnums ammo count.

## Notes
- Only tracks active ammo when the player has the magnums
- Before the weapon is found, ammo pickups are tracked via a weapon slot with qty

## Details

| Field     | Value           |
|-----------|-----------------|
| Type      | `Int32`         |

## Usage
### Calling from mod code
```javascript
const ammo = game.readVar(game.module, 'InventoryAmmoMagnums');
```
