# Function: RemoveItemFromInventory

## Description
Removes one instance of an item from Lara's inventory by model ID. Searches weapon slots first, then item slots. Decrements the quantity, and if it reaches zero, removes the slot entirely by shifting remaining slots down to fill the gap.

## Notes
- Converts the model ID to an inventory slot ID via the same internal lookup used by AddItemToInventory
- Searches weapon slots first, then item slots — returns as soon as a match is found
- Decrementing to zero triggers slot removal: remaining slots shift down, and the unlocked count decreases by one
- If quantity is still above zero after decrementing, the slot stays and returns immediately
- Returns 0 if the item wasn't found in any slot
- Used internally by AddItemToInventory during weapon pickup consolidation (removing loose ammo pickups)

## Details

| Field     | Value                          |
|-----------|--------------------------------|
| Usage     | `Hook & Call`                  |
| Params    | `int`                          |
| Return    | `int`                          |

### Parameters

| #   | Type  | Description                              |
|-----|-------|------------------------------------------|
| 0   | `int` | Model ID of the item to remove           |

### Return Values

| Value | Description                                |
|-------|--------------------------------------------|
| `1`   | Item found and decremented/removed         |
| `0`   | Item not found in inventory                |

## Usage
### Hooking
```javascript
mod.hook('RemoveItemFromInventory')
    .onLeave(function(returnValue, modelId) {
        if (returnValue) {
            log('Removed item model:', modelId);
        }
    });
```

### Calling from mod code
```javascript
// Remove one shotgun shell pickup from inventory
game.callFunction(game.module, 'RemoveItemFromInventory', 0x59);

// Remove a key from inventory
game.callFunction(game.module, 'RemoveItemFromInventory', 0x81);
```

## Pseudocode
```
function RemoveItemFromInventory(modelId):
    inventoryId = ModelIdToInventoryId(modelId)

    // Search weapon slots
    for i = 0 to InventoryWeaponsUnlocked - 1:
        if InventoryWeaponSlots[i].id == inventoryId:
            InventoryWeaponQtys[i] -= 1
            if InventoryWeaponQtys[i] > 0:
                return 1
            // Quantity hit zero — remove slot
            InventoryWeaponsUnlocked -= 1
            if i < InventoryWeaponsUnlocked:
                shift InventoryWeaponQtys[i+1..end] down by one
                shift InventoryWeaponSlots[i+1..end] down by one
            return 1

    // Search item slots
    for i = 0 to InventoryItemsUnlocked - 1:
        if InventoryItemSlots[i].id == inventoryId:
            InventoryItemQtys[i] -= 1
            if InventoryItemQtys[i] > 0:
                return 1
            // Quantity hit zero — remove slot
            InventoryItemsUnlocked -= 1
            if i < InventoryItemsUnlocked:
                shift InventoryItemQtys[i+1..end] down by one
                shift InventoryItemSlots[i+1..end] down by one
            return 1

    return 0  // not found
```
