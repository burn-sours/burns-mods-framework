# Variable: InventoryWeaponSlots

## Description
Pointer to the array of weapon slots. Each slot points to a weapon item object.

## Notes
- First entry is a pointer to the first weapon item object
- Used alongside `InventoryWeaponQtys` and `InventoryWeaponsUnlocked` for rendering and logic

## Details

| Field     | Value           |
|-----------|-----------------|
| Type      | `Pointer`       |

## Usage
### Calling from mod code
```javascript
const slots = game.readVar(game.module, 'InventoryWeaponSlots');
```
