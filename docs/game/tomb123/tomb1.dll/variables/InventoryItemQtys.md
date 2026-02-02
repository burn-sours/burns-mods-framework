# Variable: InventoryItemQtys

## Description
Array of key/puzzle item quantities, one per item slot.

## Notes
- Same structure as `InventoryWeaponQtys` but for key and puzzle items

## Details

| Field     | Value           |
|-----------|-----------------|
| Type      | `Int16`         |

## Usage
### Calling from mod code
```javascript
const qtys = game.readVar(game.module, 'InventoryItemQtys');
```
