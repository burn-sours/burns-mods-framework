# Function: Menu

## Description
Opens and runs the in-game inventory/pause menu. Handles initialization, the main menu loop (input, rendering, camera), and returns a result based on the player's selection.

Takes a menu type parameter that determines which inventory section to display. Initializes internal state, clears screen effects, sets a fixed FOV, selects the appropriate inventory slots, plays a menu open sound via SoundEffect, then enters the main loop. The loop processes menu animation, input navigation, and camera updates until the player exits or makes a selection.

On exit, cleans up UI text elements, restores camera state, and returns a value indicating what happened — no action, item used, or special flow codes for specific menu outcomes.

## Notes
- Menu type determines which inventory is shown:
  - Type 1: weapons inventory
  - Type 2: items inventory — if no items unlocked, exits immediately with MenuSelection set to 0xFFFF
  - Type 3: special inventory mode
  - Types 4-5: additional modes with fallback handling
- Sets FOV to 0x38E0 during menu display
- Plays SoundEffect 0x6F (111) with no position (non-spatial) as menu open sound
- Clears screen effects on entry
- The main loop runs until an exit condition is met (player closes menu or an external signal)
- Cleans up UI text elements on exit (decrements UiTextsCount)
- Camera state is saved and restored around the menu

## Details

| Field     | Value       |
|-----------|-------------|
| Usage     | `Hook`      |
| Params    | `int`       |
| Return    | `int`       |

### Parameters

| #   | Type  | Description                                    |
|-----|-------|------------------------------------------------|
| 0   | `int` | Menu type (1 = weapons, 2 = items, 3+ = other) |

### Return Values

| Value    | Description                              |
|----------|------------------------------------------|
| `0`      | Menu closed, no action taken             |
| `1`      | Item was selected/used                   |
| `0x400`  | Special outcome (flag 0x4fdf38 set)      |
| `0x500`  | Special outcome (flag 0x132b3c set)      |
| `0x700`  | Special outcome (flag 0x4fdf3c set)      |

## Usage
### Hooking
```javascript
mod.hook('Menu')
    .onEnter(function(menuType) {
        // menuType: 1 = weapons, 2 = items, etc.
    })
    .onLeave(function(returnValue, menuType) {
        // returnValue: 0 = closed, 1 = item used, etc.
    });
```

## Pseudocode
```
function Menu(menuType):
    // Reset internal state
    reset transition counter
    clear internal menu flags
    clear screen effect arrays
    
    // Early exit if items menu with nothing unlocked
    if menuType == 2 and itemsUnlocked == 0:
        MenuSelection = 0xFFFF
        return 0
    
    // Setup
    runMenuSetup()
    setFOV(0x38E0)
    storeMenuType(menuType)
    initializeMenuGraphics()
    
    if menuType != 1:
        runAdditionalSetup()
    
    clearScreenEffects(0, 0, 0, 0, 0, 0)
    clearScreenEffects(1, 0, 0, 0, 0, 0)
    
    // Select inventory based on menu type
    switch menuType:
        case 1:
            slots = weaponSlots
            count = weaponsUnlocked
        case 2:
            slots = itemSlots
            count = itemsUnlocked
        case 3:
            slots = specialSlots
            count = specialCount
        default:
            slots = fallbackSlots
    
    setupInventoryDisplay(slots, count)
    SoundEffect(0x6F, null, 2)  // menu open sound
    runInitialAnimation()
    
    // Main menu loop
    do:
        animating = processMenuAnimation()
        processMenuInput()
        tickCounter = getFrameTicks()
        totalTicks += tickCounter
        processFrame()
        exitSignal = checkExitCondition()
    while not exitSignal and not animating
    
    // Cleanup
    resetDisplayTimers()
    
    // Remove active UI text elements
    if textElement1 active:
        textElement1.active = false
        UiTextsCount--
    if textElement2 active:
        textElement2.active = false
        UiTextsCount--
    
    cleanupMenuGraphics()
    restoreCameraState()
    updateCameraMatrix()
    
    // Return based on flags and selection
    if specialFlag1:
        return 0x500
    if specialFlag2:
        return 0x400
    if specialFlag3:
        return 0x700
    
    if MenuSelection == -1:
        // No selection
        if menuType != 1:
            restoreAudioIfNeeded()
        return 0
    
    switch MenuSelection:
        case 0x78:  // Item used
            if condition and audioFlag:
                restoreAudio()
            return 1
        
        case 0x7A:  // Special item check
            if inventoryFlag & 0x10:
                clearSpecialFlag()
                return 1
            break
        
        case 0x9D..0xA3:  // Level select options
        case 0xAB..0xAD:
            processLevelSelect(MenuSelection)
            break
    
    // Default exit
    if menuType != 1:
        restoreAudioIfNeeded()
    return 0
```
