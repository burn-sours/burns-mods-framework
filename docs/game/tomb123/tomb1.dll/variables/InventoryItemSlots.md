# Variable: InventoryItemSlots

## Description
Pointer to the array of key/puzzle item slots. Each slot points to an item object.

## Notes
- Same structure as `InventoryWeaponSlots` but for key and puzzle items

## Details

| Field     | Value           |
|-----------|-----------------|
| Type      | `Pointer`       |

## Usage
### Calling from mod code
```javascript
const slots = game.readVar(game.module, 'InventoryItemSlots');
```
