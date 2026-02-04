# Function: AddItemToInventory

## Description
Adds an item to Lara's inventory by model ID. Handles all item types: weapons, ammo, medipacks, puzzle items, keys, and quest items. Each model ID maps to a specific inventory slot and pickup behaviour.

Validates the model ID against the model data table, converts alternate IDs if needed, and then either increments an existing slot's quantity or adds a new item. Weapons have special handling — picking up a weapon consolidates any loose ammo pickups of that type into the weapon's ammo pool and updates world entity model IDs to the ammo variant.

## Notes
- Each item type has two accepted model IDs (original and alternate) — GetAlternateId resolves between them
- If the model ID's flag is not set in the model data table, the function attempts conversion and returns 0 on failure
- Items already in inventory just get their quantity incremented (weapons capped at 255)
- **Weapon pickup consolidation:** When picking up a weapon (shotgun, magnums, uzis), any loose ammo pickups of that type already in inventory are removed and converted to direct ammo. World entities of the weapon type are also updated to show as ammo pickups instead
- **Ammo pickup behaviour:** If Lara already has the weapon, ammo is added directly to the ammo counter. If she doesn't have the weapon, ammo is added as an inventory item
- Medipacks (small and large) can be gated by NewGamePlus conditions
- Ammo amounts per pickup: shotgun shells = 12, magnum clips = 50, uzi clips = 100
- Returns 1 on success, 0 on failure (unknown model ID or invalid flag)
- Uses InventoryWeaponSlots, InventoryWeaponQtys, InventoryItemSlots, InventoryItemQtys globals for slot management
- Uses InventoryAmmoShotgun, InventoryAmmoMagnums, InventoryAmmoUzis for direct ammo storage

## Details

| Field     | Value                          |
|-----------|--------------------------------|
| Usage     | `Hook & Call`                  |
| Params    | `int`                          |
| Return    | `int`                          |

### Parameters

| #   | Type  | Description                              |
|-----|-------|------------------------------------------|
| 0   | `int` | Model ID of the item to add              |

### Return Values

| Value | Description                                    |
|-------|------------------------------------------------|
| `1`   | Item added successfully                        |
| `0`   | Failed — unknown model ID or invalid item flag |

## Usage
### Hooking
```javascript
mod.hook('AddItemToInventory')
    .onLeave(function(returnValue, modelId) {
        if (returnValue) {
            log('Picked up item model:', modelId);
        }
    });
```

### Calling from mod code
```javascript
// Give Lara the shotgun
game.callFunction(game.module, 'AddItemToInventory', 0x55);

// Give Lara a small medipack
game.callFunction(game.module, 'AddItemToInventory', 0x5d);
```

## Pseudocode
```
function AddItemToInventory(modelId):
    // Validate model ID flag
    if model flag not set for modelId:
        modelId = GetAlternateId(modelId)
        if modelId == -1 or flag still not set:
            return 0

    // Convert to inventory slot ID
    inventoryId = modelIdToInventoryId(modelId)

    // Check if item exists in weapon slots
    foundWeapon = false
    for each slot in InventoryWeaponSlots (up to InventoryWeaponsUnlocked):
        if slot.id == inventoryId:
            foundWeapon = true
            break

    // Check if item exists in item slots
    for each slot in InventoryItemSlots (up to InventoryItemsUnlocked):
        if slot.id == inventoryId:
            increment InventoryItemQtys for this slot
            return 1

    // Existing weapon — increment quantity (capped at 255)
    if foundWeapon:
        if InventoryWeaponQtys < 255:
            increment InventoryWeaponQtys
        return 1

    // New item — handle by type
    switch modelId:
        Pistols:
            add to inventory
            return 1

        Shotgun:
            // Consolidate: remove loose shell pickups, convert to ammo
            for each shell pickup in inventory:
                RemoveItemFromInventory(shellModelId)
                InventoryAmmoShotgun += 12
            InventoryAmmoShotgun += 12
            add shotgun to inventory
            update world entities from weapon model to ammo model
            return 0  // (returns via default path)

        Magnums:
            // Same consolidation pattern
            consolidate magnum clip pickups → InventoryAmmoMagnums (+50 each)
            InventoryAmmoMagnums += 50
            add magnums to inventory
            return 0

        Uzis:
            // Same consolidation pattern
            consolidate uzi clip pickups → InventoryAmmoUzis (+100 each)
            InventoryAmmoUzis += 100
            add uzis to inventory
            return 0

        Shotgun Shells:
            if player has shotgun:
                InventoryAmmoShotgun += 12
            else:
                add shells as inventory item
            return 0 or 1

        Magnum Clips:
            if player has magnums:
                InventoryAmmoMagnums += 50
            else:
                add clips as inventory item

        Uzi Clips:
            if player has uzis:
                InventoryAmmoUzis += 100
            else:
                add clips as inventory item

        Small Medipack:
            if NewGamePlus conditions met:
                add to inventory
            return 1

        Large Medipack:
            if NewGamePlus conditions met:
                add to inventory
            return 1

        Puzzle 1–4, Keys 1–4, Lead Bar, Scion 1–3:
            add to inventory
            return 1

        default:
            return 0
```
