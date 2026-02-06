# Function: RenderLara

## Description
Renders Lara's model. Handles culling checks, lighting setup, body part rendering with bone interpolation, back pocket item rendering, and gun model rendering for left/right hands.

If Lara is flagged as invisible, the function returns immediately. Otherwise it performs a bone-based culling check against the camera — if all bone positions are within culling range, rendering is skipped.

Each body part is iterated (up to 15 bones) and rendered with matrix interpolation for smooth movement between ticks. Gun models are rendered separately for left and right hands based on gun flags.

## Notes
- The invisible flag is checked via a bitmask (`0x100`) on `ENTITY_FLAGS`
- The culling check only runs under certain conditions (OG graphics flags set and a state check)
- **TR2-specific**: Checks `VehicleId` — skips entity setup if Lara is in a vehicle
- **TR2-specific**: Renders back pocket items (e.g., shotgun on back) when equipped
- Gun rendering for right hand: conditional on `LaraGunFlags` bits 4 or 3 (`0x10` or `0x8`)
- Gun rendering for left hand: conditional on `LaraGunFlags` bit 2 (`0x4`)
- Interpolation can be disabled by an internal flag, in which case `0x100` (fixed) is used

## Details

| Field     | Value       |
|-----------|-------------|
| Usage     | `Hook`      |
| Params    | `pointer`   |
| Return    | `void`      |

### Parameters

| #   | Type      | Description                  |
|-----|-----------|------------------------------|
| 0   | `pointer` | Pointer to Lara entity data  |

## Usage
### Hooking
```javascript
mod.hook('RenderLara')
    .onEnter(function(lara) {
        // lara is a pointer to Lara's entity data
    });
```

```javascript
mod.hook('RenderLara')
    .onLeave(function(returnValue, lara) {
        // Lara has finished rendering
    });
```

## Pseudocode
```
function RenderLara(lara):
    // Check invisible flag
    if Lara.ENTITY_FLAGS & 0x100:
        return
    
    // Bone-based culling check (OG graphics mode)
    if ogGraphicsFlag1 and ogGraphicsFlag2 and stateCheck != 3:
        for boneIndex = 0 to 14:
            GetBonePosition(Lara, position, boneIndex)
            distance = distanceSquared(position, cameraPosition)
            threshold = boneRadius + 32
            if distance < threshold * threshold:
                return  // too close, skip render
    
    // Set render active flag
    globalFlags |= 0x1000
    
    // Entity setup (skip if in vehicle)
    if VehicleId == -1:
        setupEntityLighting(lara)
    
    entityBox = GetEntityBox(lara)
    setupEntityBounds(lara, entityBox)
    
    // Push matrix stack
    pushMatrix()
    
    // Apply entity transform
    applyEntityTransform(lara.rotation, lara.position)
    
    // Get animation frame bounds
    frameResult = getAnimationFrameBounds(lara)
    
    if frameResult == 0:
        // Render each body part (15 bones)
        meshBit = 1
        for boneIndex = 0 to 14:
            if lara.meshBits & meshBit:
                // Get interpolation factor
                interpFactor = InterpolationFactor
                if interpolationDisabled:
                    interpFactor = 0x100
                
                // Interpolate between current and previous frame
                interpolateTransform(currentBone, previousBone, interpFactor)
                
                // Add camera offset
                addCameraOffset()
                
                // Finalize and render
                finalizeTransform()
                renderMesh(boneMeshPointer, 1)
            
            meshBit = (meshBit << 1) | (meshBit >> 31)
    
    // Back pocket item rendering (TR2-specific)
    if not ogGraphicsMode and backPocketSlot != 0 and (lara.meshBits & 0x80):
        // Push matrix for back item
        pushMatrix()
        
        // Interpolate back bone transform
        interpolateTransform(backBoneCurrent, backBonePrevious, interpFactor)
        addCameraOffset()
        finalizeTransform()
        
        // Apply item rotation
        applyItemRotation(itemRotationData)
        
        // Parse mesh vertex data and render
        renderBackPocketItem(backPocketSlot)
        
        popMatrix()
    
    // Right hand gun rendering
    if LaraGunFlags & 0x10 or LaraGunFlags & 0x8:
        pushMatrix()
        
        interpolateTransform(rightHandCurrent, rightHandPrevious, interpFactor)
        addCameraOffset()
        finalizeTransform()
        
        if LaraGunFlags & 0x10 == 0:
            // Use current gun type
            renderGunEffect(LaraGunType, rightHandData, 13)
        else:
            // Flare (type 8)
            renderGunEffect(8, rightHandData, 13)
        
        popMatrix()
    
    // Left hand gun rendering
    if LaraGunFlags & 0x4:
        pushMatrix()
        
        interpolateTransform(leftHandCurrent, leftHandPrevious, interpFactor)
        addCameraOffset()
        finalizeTransform()
        
        renderGunEffect(LaraGunType, leftHandData, 10)
        
        popMatrix()
    
    // Pop main matrix
    popMatrix()
    
    // Final lighting/setup pass
    entityBox = GetEntityBox(lara)
    setupEntityBounds(lara, entityBox)
    finalLightingPass()
```
