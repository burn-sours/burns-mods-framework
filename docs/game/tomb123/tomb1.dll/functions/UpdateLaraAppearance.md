# Function: UpdateLaraAppearance

## Description
Updates Lara's visual appearance. Manages weapon visibility, model swaps, hair simulation, and outfit configuration based on the current state and game version.

Called from multiple contexts — not limited to photo mode. Handles two states: when a specific mode flag is inactive, it restores Lara's state (gun flags, render flags, animation data, hair positions). When active, it sets a gun visibility flag and clears weapon/render state.

After state setup, it runs Lara's entity behaviour function, processes hair attachment (with multiple iterations for a settling pass), and then configures outfit model parts (gun models, pocket models, face pose) based on the current game version and outfit selection.

## Notes
- The outfit configuration has extensive branching based on game version (TR1/TR2/TR3) and outfit index (0–9)
- Each outfit can override which gun, pocket, and back models are displayed
- Hair attachment runs once initially, then loops (30 or 60 times depending on a flag) for physics settling
- `ENTITY_ANIM_ID` and `ENTITY_ANIM_FRAME` are restored from saved state when the mode flag is inactive
- The function reads `LevelId` to handle special cases (e.g. title screen level 0, and level 0x12 in TR1)

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
        // called when Lara's appearance is being updated
    });
```

## Pseudocode
```
function UpdateLaraAppearance():
    gameVersion = getGameVersion()

    if mode flag inactive:
        clear gun visibility flag from LaraGunFlags
        restore LaraGunType from saved state
        restore lara ENTITY_ANIM_ID and ENTITY_ANIM_FRAME from saved state
        restore render flags
        copy saved hair positions back to LaraHairLeftX
    else:
        set gun visibility flag on LaraGunFlags
        clear LaraGunType and render flags

    // run Lara's entity behaviour
    call Lara's behaviour function via model dispatch table

    // hair simulation
    SimulateLaraHair(0, hairMode)
    iterations = 30 (or 60 if a flag is set)
    for i in 0..iterations:
        SimulateLaraHair(1, hairMode)

    // configure outfit models based on game version and outfit index
    outfitIndex = getOutfitIndex()

    if outfitIndex == 0:  // default outfit
        set body part flags from saved state
        assign gun/pocket/back models based on weapon model index
    else:
        // outfit-specific overrides (indices 1–9)
        // each outfit sets body part flags and selects
        // appropriate gun, pocket, and back models
        // some outfits are version-specific (TR1/TR2/TR3 only)
```
