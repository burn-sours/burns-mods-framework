# Function: Menu

## Description
Opens and runs the in-game inventory/pause menu. Handles initialization, the main menu loop (input, rendering, camera), and returns a result based on the player's selection.

Takes a menu type parameter that determines which inventory section to display. Initializes internal state, clears screen effects, sets a fixed FOV, selects the appropriate inventory slots, plays a menu open sound via `SoundEffect`, then enters the main loop. The loop processes menu animation, input navigation, and camera updates until the player exits or makes a selection.

On exit, cleans up UI text elements, restores camera state, and returns a value indicating what happened — no action, item used, or special flow codes for specific menu outcomes.

## Notes
- Menu type determines which inventory is shown:
  - Type 1: main inventory (weapons)
  - Type 2: items inventory — if no items unlocked, exits immediately with `MenuSelection` set to `0xFFFF`
  - Type 6: falls through to default handling
  - Type 7: secrets/bonus menu — initializes bonus flags from saved data bitfield (bits 5-9 control unlock states)
- Sets FOV to `0x38E0` during menu display
- Plays `SoundEffect` `0x6F` (111) with no position (non-spatial) as menu open sound for types 2-7
- Clears screen effects on entry
- The main loop runs until an exit condition is met (player closes menu or an external signal)
- Cleans up UI text elements on exit (decrements `UiTextsCount`)
- Camera state is saved and restored around the menu
- Return code `0xC00` indicates a special engine state flag was set (unique to tomb3)

## Details

| Field     | Value       |
|-----------|-------------|
| Usage     | `Hook`      |
| Params    | `int`       |
| Return    | `int`       |

### Parameters

| #   | Type  | Description                                           |
|-----|-------|-------------------------------------------------------|
| 0   | `int` | Menu type (1 = weapons, 2 = items, 7 = secrets, etc.) |

### Return Values

| Value    | Description                              |
|----------|------------------------------------------|
| `0`      | Menu closed, no action taken             |
| `1`      | Item was selected/used                   |
| `0x400`  | Special outcome (internal flag set)      |
| `0x500`  | Special outcome (internal flag set)      |
| `0x700`  | Special outcome (internal flag set)      |
| `0xC00`  | Engine state flag triggered              |

## Usage
### Hooking
```javascript
mod.hook('Menu')
    .onEnter(function(menuType) {
        // menuType: 1 = weapons, 2 = items, 7 = secrets, etc.
    })
    .onLeave(function(returnValue, menuType) {
        // returnValue: 0 = closed, 1 = item used, 0x400/0x500/0x700/0xC00 = special
    });
```

## Pseudocode
```
function Menu(menuType):
    // Reset internal state
    reset transition counter
    set menu active flag
    clear internal menu flags
    clear screen effect arrays (144 bytes across multiple regions)
    
    if menuType == 7:
        // Secrets/bonus menu - extract unlock flags from saved data bitfield
        bonusBit5 = (savedData >> 5) & 1
        bonusBit6 = (savedData >> 6) & 1
        bonusBit7 = (savedData >> 7) & 1
        bonusBit8 = (savedData >> 8) & 1
        set secrets menu flag
        
        // Determine how many bonus items to show
        if all four bits set:
            bonusBit9 = (savedData >> 9) & 1
        else:
            bonusBit9 = 0xFF (locked)
        
        // Count available items
        itemCount = 0
        if bonusBit5:
            count items until reaching locked (0) entry
        
        setupSecretsMenu()
        clearScreenEffects()
    else:
        clearScreenEffects()
        
        if menuType == 2:
            if itemsUnlocked == 0:
                MenuSelection = -1
                goto cleanup
        else if menuType == 1:
            goto skipAdditionalSetup
        
        runAdditionalSetup()
        clearAudioState()
    
    skipAdditionalSetup:
    runMenuSetup()
    setFOV(0x38E0)
    storeMenuType(menuType)
    initializeMenuGraphics()
    initializeMenuAudio()
    
    clearScreenEffects(0, 0, 0, 0, 0, 0)
    clearScreenEffects(1, 0, 0, 0, 0, 0)
    
    // Select inventory based on menu type
    switch menuType:
        case 2:
            setupInventoryDisplay(itemSlots, itemsUnlocked, itemsOffset)
            break
        case 6:
            // Fall through to default
        case 7:
            setupInventoryDisplay(secretSlots, 1, 0)
            break
        default:
            if demoFlag:
                slots = demoSlots
                mode = 0
            else:
                slots = mainSlots
                mode = 1
            setupInventoryDisplay(slots, slotCount, offset)
    
    if menuType != 1:
        SoundEffect(0x6F, null, 2)  // menu open sound
    
    runInitialAnimation(1)
    
    // Main menu loop
    do:
        animating = processMenuAnimation(tickCounter)
        processMenuInput()
        tickCounter = getFrameTicks()
        totalTicks += tickCounter
        storedTicks = tickCounter
        processFrame()
        exitSignal = checkExitCondition()
    while not exitSignal and not animating
    
    // Cleanup
    resetDisplayTimers()
    
    // Remove active UI text elements
    if textElement1 active:
        textElement1.flags &= ~1
        UiTextsCount--
    textElement1 = null
    
    if textElement2 active:
        UiTextsCount--
        textElement2.flags &= ~1
    textElement2 = null
    
    cleanupMenuGraphics()
    restoreCameraState()
    updateCameraMatrix()
    storeCameraFOV()
    
    cleanup:
    // Return based on flags
    if specialFlag1:
        clear menu active
        return 0x500
    if specialFlag2:
        clear menu active
        return 0x400
    if engineStateFlag == 1:
        clear menu active
        return 0xC00
    if specialFlag3:
        clear menu active
        return 0x700
    
    if MenuSelection == -1:
        // No selection made
        if menuType != 1 and menuType != 7:
            restoreAudioIfNeeded()
        clear menu active
        return 0
    
    switch MenuSelection:
        case 0x91:  // Item used
            if condition and audioPosition != 0:
                restoreAudio(audioPosition * 25 + 5)
            clear menu active
            return 1
        
        case 0x93:  // Special item check
            if inventoryFlags & 0x10:
                clearSpecialFlag()
                clear menu active
                return 1
            break
        
        case 0xB9..0xC0:  // Level select options
        case 0xC9..0xCB:
            processLevelSelect(MenuSelection)
            break
    
    // Default exit
    if menuType != 1 and menuType != 7:
        if audioPosition != 0:
            restoreAudio(audioPosition * 25 + 5)
    
    clear menu active
    return 0
```
