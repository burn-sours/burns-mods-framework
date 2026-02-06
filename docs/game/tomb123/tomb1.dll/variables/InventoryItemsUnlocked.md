# Variable: InventoryItemsUnlocked

## Description
The number of key/puzzle item slots currently unlocked/open.

## Notes
- Used for rendering the inventory UI and item logic
- Increases as the player acquires new key/puzzle items

## Details

| Field     | Value           |
|-----------|-----------------|
| Type      | `Int16`         |

## Usage
### Calling from mod code
```javascript
const unlocked = game.readVar(game.module, 'InventoryItemsUnlocked');
```
