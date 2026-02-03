# Function: DrawSetup

## Description
Configures the rendering state for subsequent 2D draw calls (DrawRect, etc.). Must be called before drawing UI primitives to set the draw mode and optional material/color data.

Has an early-out optimisation — if the same draw mode and data are already active (and viewport dimensions haven't changed), it skips redundant setup. Otherwise, it records a new render command entry with the current viewport state, the draw mode, and the material data.

## Notes
- Called by DrawHealth before drawing the health bar
- The second parameter is a pointer to a 48-byte block (12 × 4-byte values) — likely color or material properties. Pass null to use the engine's default data
- Manages an internal render command list — each setup call appends an entry with viewport deltas, draw mode, and material state
- The early-out check compares: draw mode, material data (48-byte memcmp), viewport dimensions, and a scale factor
- Modders should call this before any DrawRect sequence to ensure the correct render state is active

## Details

| Field     | Value          |
|-----------|----------------|
| Usage     | `Hook & Call`  |
| Params    | `int, pointer` |
| Return    | `void`         |

### Parameters

| #   | Type      | Description                                                    |
|-----|-----------|----------------------------------------------------------------|
| 0   | `int`     | Draw mode ID                                                   |
| 1   | `pointer` | Material/color data (48 bytes, 12 values) or null for default |

## Usage
### Hooking
```javascript
mod.hook('DrawSetup')
    .onEnter(function(mode, data) {
        // mode: draw mode ID
        // data: pointer to 48-byte material block, or null
    });
```

### Calling from mod code
```javascript
// Set up draw state before drawing UI primitives
game.callFunction(game.module, 'DrawSetup', mode, ptr(0));

// Then draw with DrawRect...
```

## Pseudocode
```
function DrawSetup(mode, materialData):
    // early-out if state unchanged
    if mode == currentMode:
        if materialData matches stored data (48-byte compare):
            if viewport dimensions unchanged:
                return  // skip redundant setup

    // record viewport deltas for the current render command
    store deltas from 6 render buffer positions
    increment render command counter

    // store new state
    currentMode = mode
    store viewport dimensions

    // copy material data (or use default if null)
    if materialData != null:
        copy 48 bytes from materialData to internal storage
    else:
        use default material data

    // finalize render command entry
    finalizeSetup()
    write render command: mode, material, viewport snapshots
```
