# Function: RenderLara

## Description
Renders Lara's model. Handles culling checks, lighting setup, body part rendering with bone interpolation, back pocket item rendering, and gun model rendering for left/right hands.

If Lara is flagged as invisible, the function returns immediately. Otherwise it performs a bone-based culling check against the camera — if all bone positions are within culling range, rendering is skipped.

Each body part is iterated (up to 15 bones) and rendered with matrix interpolation for smooth movement between ticks. Gun models are rendered separately for left and right hands based on gun flags.

## Notes
- The invisible flag is checked via a bitmask (`0x100`) on `ENTITY_FLAGS`
- The culling check only runs under certain conditions (OG graphics flags set and a state check)
- **TR3-specific**: Checks `VehicleId` — skips entity setup if Lara is in a vehicle
- **TR3-specific**: Renders back pocket items (e.g., shotgun on back) when equipped
- **TR3-specific**: Special weapon sprite rendering for certain level types (level type 3) with muzzle flash effects
- Gun rendering for right hand: conditional on `LaraGunFlags` bit 3 (`0x8`)
- Gun rendering for left hand: conditional on `LaraGunFlags` bit 2 (`0x4`)
- Interpolation can be disabled by an internal flag, in which case `0x100` (fixed) is used
- Sets behavior flag `0x1000` on `LaraBehaviourFlags` when rendering proceeds

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
    LaraBehaviourFlags |= 0x1000
    
    // Skip certain renders based on level and state
    if levelType == 3 and lara.field_0x7a == 0 and levelId != 5:
        return
    
    // Entity setup (skip if in vehicle)
    if VehicleId == -1:
        setupEntityLighting(lara)
    
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
    
    // Back pocket item rendering (TR3-specific)
    if not ogGraphicsMode and backPocketSlot != 0 and (lara.meshBits & 0x80):
        // Push matrix for back item
        interpFactor = InterpolationFactor
        if interpolationDisabled:
            interpFactor = 0x100
        
        // Interpolate back bone transform
        interpolateTransform(backBoneCurrent, backBonePrevious, interpFactor)
        addCameraOffset()
        finalizeTransform()
        
        // Apply item rotation offset
        applyItemRotation(itemRotationData)
        
        // Parse mesh vertex data and render
        renderBackPocketItem(backPocketSlot)
    
    // Right hand gun rendering
    if LaraGunFlags & 0x8:
        interpFactor = InterpolationFactor
        if interpolationDisabled:
            interpFactor = 0x100
        
        interpolateTransform(rightHandCurrent, rightHandPrevious, interpFactor)
        addCameraOffset()
        finalizeTransform()
        
        if levelType == 3:
            // TR3-specific: special weapon rendering with muzzle flash sprites
            if gunState != 4 and specialFlag & 1:
                applyWeaponOffset(ogGraphicsMode)
                applyRotation(0, 0xC004, aimAngle << 8)
                setLightIntensity(600)
                
                if not ogGraphicsMode or alternateRenderFlag == 0:
                    renderMesh(weaponMeshPointer, 1)
                    draw_setup(ogGraphicsMode | 0x2E, tempMatrix)
                    // Render muzzle flash sprite
                    renderSprite(flashSpriteData)
                else:
                    renderAlternateWeapon()
        else:
            renderGunEffect(LaraGunType, rightHandData, 13)
    
    // Left hand gun rendering
    if LaraGunFlags & 0x4:
        interpFactor = InterpolationFactor
        if interpolationDisabled:
            interpFactor = 0x100
        
        interpolateTransform(leftHandCurrent, leftHandPrevious, interpFactor)
        addCameraOffset()
        finalizeTransform()
        
        if levelType == 3:
            // TR3-specific: special weapon rendering with muzzle flash sprites
            if gunState != 4 and specialFlag & 1:
                applyWeaponOffset(ogGraphicsMode)
                applyRotation(0, 0xC004, aimAngle << 8)
                setLightIntensity(600)
                
                if not ogGraphicsMode or alternateRenderFlag == 0:
                    renderMesh(weaponMeshPointer, 1)
                    draw_setup(ogGraphicsMode | 0x2E, tempMatrix)
                    // Render muzzle flash sprite
                    renderSprite(flashSpriteData)
                else:
                    renderAlternateWeapon()
        else:
            renderGunEffect(LaraGunType, leftHandData, 10)
    
    // Pop main matrix
    popMatrix()
    
    // Final lighting/setup pass
    entityBox = GetEntityBox(lara)
    setupEntityBounds(lara, entityBox)
    finalLightingPass()
```
