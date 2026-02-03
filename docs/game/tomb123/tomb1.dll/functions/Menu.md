# Function: Menu

## Description
Opens and runs the in-game inventory/pause menu. Handles initialization, the main menu loop (input, rendering, camera), and returns a result based on the player's selection.

Takes a menu type parameter that determines which inventory section to display. Initializes internal state, clears screen effects, sets a fixed FOV, selects the appropriate inventory slots (weapons, items, or a fallback set), plays a menu open sound via SoundEffect, then enters the main loop. The loop processes menu animation, input navigation, and camera updates until the player exits or makes a selection.

On exit, cleans up UI text elements, restores camera state, and returns a value indicating what happened — no action, item used, or special flow codes for specific menu outcomes.

## Notes
- Menu type determines which inventory is shown:
  - Type 1: weapons inventory (uses InventoryWeaponSlots / InventoryWeaponsUnlocked)
  - Type 2: items inventory (uses InventoryItemSlots / InventoryItemsUnlocked) — if no items unlocked, exits immediately with MenuSelection set to 0xFFFF
  - Other types: falls through to weapons, or a secondary slot set if no weapons unlocked
- Sets FOV to 0x38E0 during menu display
- Plays SoundEffect 0x6F (menu open sound) with no position (non-spatial)
- Clears screen effects on entry by calling the same effect function seen in RenderUI, twice with zeroed params
- The main loop runs until an exit condition is met (player closes menu or an external signal)
- Cleans up ammo count text and other UI text elements on both entry and exit (decrements UiTextsCount)
- Camera state is saved and restored around the menu
- MenuSelection values observed in the exit logic: 0x47, 0x49, 99, 100, 0x65, 0x66, 0x6C, 0x6D — these map to specific inventory actions (not yet fully documented)

## Details

| Field     | Value       |
|-----------|-------------|
| Usage     | `Hook`      |
| Params    | `int`       |
| Return    | `int`       |

### Parameters

| #   | Type  | Description                                    |
|-----|-------|------------------------------------------------|
| 0   | `int` | Menu type (1 = weapons, 2 = items, others vary) |

### Return Values

| Value    | Description                              |
|----------|------------------------------------------|
| `0`      | Menu closed, no action taken             |
| `1`      | Item was selected/used                   |
| `0xC0`   | Special menu outcome (unknown purpose)   |
| `0x100`  | Special menu outcome (unknown purpose)   |
| `0x180`  | Special menu outcome (unknown purpose)   |

## Usage
### Hooking
```javascript
mod.hook('Menu')
    .onEnter(function(menuType) {
        // menuType: 1 = weapons, 2 = items
    })
    .onLeave(function(result) {
        // result: 0 = closed, 1 = item used, etc.
    });
```

## Pseudocode
```
function Menu(menuType):
    reset transition counter and internal menu state
    clear screen effects

    // early exit if items menu with nothing unlocked
    if menuType == 2 and InventoryItemsUnlocked == 0:
        MenuSelection = 0xFFFF
        return 0

    // cleanup any active ammo count text
    if ammoCountText is active:
        UiTextsCount -= 1
        deactivate ammoCountText

    set FOV to 0x38E0
    store menuType for later reference
    run menu setup functions

    if menuType != 1:
        run additional setup

    // select inventory to display
    if menuType == 2:
        slots = InventoryItemSlots
        count = InventoryItemsUnlocked
    else if InventoryWeaponsUnlocked > 0:
        slots = InventoryWeaponSlots
        count = InventoryWeaponsUnlocked
    else:
        slots = fallback slot set

    setupInventoryDisplay(slots, count)
    SoundEffect(0x6F, null, 2)  // menu open sound

    // main menu loop
    do:
        processMenuAnimation()
        processMenuInput()
        processCamera()
        updateDisplay()
    while not exiting

    // cleanup
    reset display timers
    remove UI text elements (decrement UiTextsCount)
    restore camera state

    // return based on selection
    if special state flags set:
        return 0x100 / 0xC0 / 0x180

    switch MenuSelection:
        0x49: return 1  // item used
        0x47: special handling, return 1
        99, 100, 0x65, 0x66, 0x6C, 0x6D: process inventory action
        default: no action

    return 0  // menu closed normally
```
