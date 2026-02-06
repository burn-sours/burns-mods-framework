# Function: RenderLara

## Description
Renders Lara's model. Handles culling checks, lighting setup, body part rendering with bone interpolation, and gun model rendering for left/right hands.

If Lara is flagged as invisible, the function returns immediately. Otherwise it performs a bone-based culling check against the camera — if all bone positions are within culling range, rendering is skipped.

Each body part is iterated (up to 15 bones) and rendered with matrix interpolation for smooth movement between ticks. Gun models are rendered separately for left and right hands based on gun flags.

## Notes
- The invisible flag is checked via a bitmask (`0x100`) on `ENTITY_FLAGS`
- The culling check only runs under certain conditions (two flags set and a state check)
- Gun rendering is conditional on `LaraGunFlags` — bit 3 for one hand, bit 2 for the other
- Interpolation can be disabled by an internal flag, in which case `0x100` (fixed) is used
- Lighting is set up twice — once before body rendering, once after for an additional pass (under a flag condition)

## Details

| Field     | Value       |
|-----------|-------------|
| Usage     | `Hook`      |
| Params    | `pointer`   |
| Return    | `void`      |

### Parameters

| #   | Type      | Description          |
|-----|-----------|----------------------|
| 0   | `pointer` | Pointer to Lara entity data |

## Usage
### Hooking
```javascript
mod.hook('RenderLara')
    .onEnter(function(lara) {
        // lara is a pointer to Lara's entity data
    });
```

## Pseudocode
```
function RenderLara(lara):
    if lara.ENTITY_FLAGS & 0x100:  // invisible
        return

    // bone-based culling check (conditional)
    if culling conditions met:
        for each bone (0–14):
            GetBonePosition(lara, position, boneIndex)
            if bone is within camera culling radius:
                return  // too close to cull boundary, skip render

    set render flag
    getAnimationFrameBounds(lara)
    setupEntityLighting(lara)
    interpolate lara position
    setupBodyParts(lara)

    // render each body part (up to 15 bones)
    for each bone:
        if bone is active (bitmask check):
            interpolateMatrix(currentBones, previousBones, interpolationFactor)
            apply render transform offsets (X, Y, Z)
            render bone mesh

    // render gun models
    if LaraGunFlags & 8:
        interpolateMatrix for right hand
        apply render transform offsets
        renderGunEffect(LaraGunType, rightHand)

    if LaraGunFlags & 4:
        interpolateMatrix for left hand
        apply render transform offsets
        renderGunEffect(LaraGunType, leftHand)

    // optional second lighting pass
    if lighting flag set:
        setupEntityLighting(lara)
        additional render pass
```
