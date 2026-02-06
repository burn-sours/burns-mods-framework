# Function: UpdateLaraAppearance

## Description
Updates Lara's visual appearance. Manages weapon visibility, model swaps, hair simulation, and outfit configuration based on the current state and game version.

Called from multiple contexts — not limited to photo mode. Handles two states: when a specific mode flag is inactive, it restores Lara's state (`LaraGunFlags`, render flags, animation data, hair positions). When active, it sets a gun visibility flag and clears weapon/render state.

After state setup, it runs Lara's entity behaviour function, processes hair attachment (with multiple iterations for a settling pass), and then configures outfit model parts (gun models, pocket models, face pose) based on the current game version and outfit selection.

## Notes
- The outfit configuration has extensive branching based on game version (TR1/TR2/TR3) and outfit index (0–9)
- Each outfit can override which gun, pocket, and back models are displayed
- Hair attachment runs once initially, then loops (30 or 60 times depending on OG graphics flag) for physics settling
- `ENTITY_ANIM_ID` and `ENTITY_ANIM_FRAME` are restored from saved state when the mode flag is inactive
- The function reads `LevelId` to handle special cases (e.g. title screen level 0, and level 18 in TR1)
- Uses a bitmask (`0x1c003800420`) to validate weapon model indices before applying them
- **TR3-specific**: Body part flags written to `Tomb123 + 0x2fc` through `0x300`
- **TR3-specific**: Back pocket slot handling for larger weapons
- Gun visibility flag is bit 9 (`0x200`) on `LaraGunFlags`

## Details

| Field     | Value    |
|-----------|----------|
| Usage     | `Hook`   |
| Params    | *(none)* |
| Return    | `void`   |

## Usage
### Hooking
```javascript
mod.hook('UpdateLaraAppearance')
    .onEnter(function() {
        // Called when Lara's appearance is being updated
    });
```

```javascript
mod.hook('UpdateLaraAppearance')
    .onLeave(function(returnValue) {
        // Appearance update complete
    });
```

## Pseudocode
```
function UpdateLaraAppearance():
    gameVersion = getGameVersion()

    if modeFlag inactive or stateFlag != 0:
        // Restore state
        LaraGunFlags &= ~0x200  // clear gun visibility flag
        gunTypeState = -1
        LaraClimbState = savedClimbState
        restore animation data to Lara entity
        LaraBehaviourFlags = (savedFlags & 1) | (LaraBehaviourFlags & 0xFFFE)
        
        // Handle special cases for TR1/TR2 outfit 8/9
        if gameVersion == 1 and savedGunType == 8:
            LaraBehaviourFlags = (savedBehaviourFlags & 1) | clearedFlags
        else if gameVersion == 2 and savedGunType == 9:
            LaraBehaviourFlags = (savedBehaviourFlags & 1) | clearedFlags
        
        // Restore hair positions (8 iterations of 128 bytes each)
        copy savedHairPositions to LaraHairLeftX
    else:
        // Active state
        LaraGunFlags |= 0x200  // set gun visibility flag
        gunTypeState = modeFlag - 1
        clear climb state, behaviour flags, animation data

    // Run Lara's entity behaviour function
    call behaviourDispatchTable[Lara.ENTITY_MODEL]()

    // Hair simulation
    hairMode = (gameVersion != 0) ? 2 : 0xBD
    setupHairAttachment(hairMode)
    SimulateLaraHair(0, hairMode)
    
    iterations = 30  // 0x1E
    if ogGraphicsFlag & 1:
        iterations = 60  // 0x3C
    
    for i in 0..iterations:
        SimulateLaraHair(1, hairMode)

    // Update appearance counter
    Tomb123[0x2F8] = savedCounter + 1

    // Get outfit index
    outfitIndex = savedOutfitIndex
    Tomb123[0x301] = outfitIndex
    
    // Set face model from weapon offset
    ogFaceModel = ogModelsOffset[0x70 + ogWeaponsOffset * 8]

    // Determine effective outfit index
    if LevelId == 0 or (gameVersion == 1 and LevelId == 0x12):
        effectiveOutfit = 0  // title screen or TR1 level 18
    else:
        effectiveOutfit = outfitIndex

    // Configure models based on outfit
    if effectiveOutfit == 0:
        // Default outfit
        validate weapon indices using bitmask 0x1c003800420
        set body part flags from saved state
        assign gun/pocket/back models based on weapon index
        
    else if effectiveOutfit == 1:
        // Outfit 1: specific gun/pocket configuration
        Tomb123[0x2FC] = 0x0B0B
        assign models if outfit flag set
        
    else if effectiveOutfit == 2:
        // Outfit 2: version-specific handling
        if gameVersion == 0:
            Tomb123[0x2FC] = 0x0E0E
        else if gameVersion == 1:
            Tomb123[0x2FC] = 0x0F0F
        else if gameVersion == 2:
            // TR3-specific configuration
            Tomb123[0x2FC] = 0, Tomb123[0x2FD] = 0x10
        assign models based on outfit flags
        
    else if effectiveOutfit == 3:
        // Outfit 3
        Tomb123[0x2FC] = 0x0C0C
        assign models based on version and flags
        
    else if effectiveOutfit == 4:
        // Outfit 4: version-specific
        assign models, set body part flags
        
    else if effectiveOutfit in [5, 6, 7]:
        // Outfits 5-7: similar structure
        assign models based on outfit flags
        set body part index based on version
        
    else if effectiveOutfit == 8:
        // Outfit 8: TR1-specific handling
        if gameVersion == 1:
            special TR1 configuration
        else:
            set body part flags, assign models
            
    else if effectiveOutfit == 9:
        // Outfit 9: TR2-specific handling
        special configuration for TR2/TR3
```
