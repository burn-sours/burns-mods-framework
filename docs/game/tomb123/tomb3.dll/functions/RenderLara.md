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
- **TR3-specific**: Level type 3 has special weapon rendering with sprite-based muzzle flash effects
- **TR3-specific**: Level ID 5 bypasses certain state checks
- Sets `LaraBehaviourFlags` bit `0x1000` when rendering proceeds
- Gun rendering for right hand: conditional on `LaraGunFlags` bit 3 (`0x8`)
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
    if lara.ENTITY_FLAGS & 0x100:
        return
    
    // Bone-based culling check (OG graphics mode)
    if ogGraphicsFlag1 and ogGraphicsFlag2 and stateCheck != 3:
        for boneIndex = 0 to 14:
            getBonePosition(lara, position, boneIndex)
            distance = distanceSquared(position, cameraPosition)
            threshold = boneRadius + 32
            if distance < threshold * threshold:
                return  // too close, skip render
    
    // Set render active flag
    LaraBehaviourFlags |= 0x1000
    
    // Skip certain renders based on level type and state (TR3-specific)
    if levelType == 3 and lara.stateField == 0 and LevelId != 5:
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
                interpFactor = InterpolationFactor
                if interpolationDisabled:
                    interpFactor = 0x100
                
                interpolateTransform(currentBone, previousBone, interpFactor)
                addCameraOffset()
                finalizeTransform()
                renderMesh(boneMeshPointer, 1)
            
            meshBit = (meshBit << 1) | (meshBit >> 31)
    
    // Back pocket item rendering
    if not ogGraphicsMode and backPocketSlot != 0 and (lara.meshBits & 0x80):
        interpFactor = InterpolationFactor
        if interpolationDisabled:
            interpFactor = 0x100
        
        interpolateTransform(backBoneCurrent, backBonePrevious, interpFactor)
        addCameraOffset()
        finalizeTransform()
        applyItemRotation(itemRotationData)
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
            // TR3-specific: special weapon with muzzle flash sprites
            if gunState != 4 and specialFlag & 1:
                applyWeaponOffset(ogGraphicsMode)
                applyRotation(0, 0xC004, aimAngle << 8)
                setLightIntensity(600)
                renderMesh(weaponMeshPointer, 1)
                drawSetup(ogGraphicsMode | 0x2E, tempMatrix)
                renderMuzzleFlashSprite()
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
            // TR3-specific: special weapon with muzzle flash sprites
            if gunState != 4 and specialFlag & 1:
                applyWeaponOffset(ogGraphicsMode)
                applyRotation(0, 0xC004, aimAngle << 8)
                setLightIntensity(600)
                renderMesh(weaponMeshPointer, 1)
                drawSetup(ogGraphicsMode | 0x2E, tempMatrix)
                renderMuzzleFlashSprite()
        else:
            renderGunEffect(LaraGunType, leftHandData, 10)
    
    // Pop matrix and finalize
    popMatrix()
    
    // Final passes
    getEntityBox(lara)
    setupEntityBounds(lara)
    finalLightingPass()
```
