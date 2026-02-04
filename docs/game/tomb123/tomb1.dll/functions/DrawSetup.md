# Function: DrawSetup

## Description
Configures the rendering state for subsequent 2D draw calls (DrawRect, etc.). Must be called before drawing UI primitives to set the render layer and optional material/color data.

Has an early-out optimisation — if the same render layer and data are already active (and viewport dimensions haven't changed), it skips redundant setup. Otherwise, it records a new render command entry with the current viewport state, the render layer, and the material data.

## Notes
- Called by DrawHealth before drawing the health bar
- The second parameter is a pointer to a 48-byte block (12 × 4-byte values) — likely color or material properties. Pass null to use the engine's default data
- The early-out compares: render layer, material data, viewport dimensions, and a scale factor

## Details

| Field     | Value          |
|-----------|----------------|
| Usage     | `Hook & Call`  |
| Params    | `int, pointer` |

### Parameters

| #   | Type      | Description                                                    |
|-----|-----------|----------------------------------------------------------------|
| 0   | `int`     | Render layer — determines where in the pipeline UI elements are drawn. Use `UI_RENDER_LAYER` for standard UI drawing |
| 1   | `pointer` | Material/color data (48 bytes, 12 values) or null for default |

## Usage
### Hooking
```javascript
mod.hook('DrawSetup')
    .onEnter(function(layer, data) {
        // layer: render layer ID
        // data: pointer to 48-byte material block, or null
    });
```

### Calling from mod code
```javascript
// Set up draw state for UI rendering using the standard render layer
game.callFunction(game.module, 'DrawSetup', UI_RENDER_LAYER, ptr(0));

// Then draw with DrawRect...
```

## Pseudocode
```
function DrawSetup(layer, materialData):
    // early-out if state unchanged
    if layer == currentLayer:
        if materialData matches stored data (48-byte compare):
            if viewport dimensions unchanged:
                return  // skip redundant setup

    // record viewport deltas for the current render command
    store deltas from 6 render buffer positions
    increment render command counter

    // store new state
    currentLayer = layer
    store viewport dimensions

    // copy material data (or use default if null)
    if materialData != null:
        copy 48 bytes from materialData to internal storage
    else:
        use default material data

    // finalize render command entry
    finalizeSetup()
    write render command: layer, material, viewport snapshots
```
