# Variable: InventoryWeaponsUnlocked

## Description
The number of weapon slots currently unlocked/open.

## Notes
- Used for rendering the inventory UI and weapon logic
- Increases as the player acquires new weapons

## Details

| Field     | Value           |
|-----------|-----------------|
| Type      | `Int16`         |

## Usage
### Calling from mod code
```javascript
const unlocked = game.readVar(game.module, 'InventoryWeaponsUnlocked');
```
