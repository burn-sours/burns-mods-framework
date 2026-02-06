# Function: RenderBoat

## Description
Renders the speedboat vehicle entity. Handles mesh rendering with interpolation and transformation matrix setup. Includes a level-specific timing check for level 4.

## Notes
- Called during the render phase for boat entities
- Has a guard condition: only renders if entity active flag is set, or during a specific timing window on level 4
- Level 4 timing window: entity room 124, tick range 3033-3050 (possibly for a cutscene/scripted sequence)
- Supports both modern and OG (original) graphics modes
- Simpler than RenderSkidoo — no driver appearance swapping

## Details

| Field     | Value           |
|-----------|-----------------|
| Usage     | `Hook`          |
| Params    | `pointer`       |
| Return    | `void`          |

### Parameters

| #   | Type      | Description                            |
|-----|-----------|----------------------------------------|
| 0   | `pointer` | Pointer to the boat entity structure   |

## Usage
### Hooking
```javascript
mod.hook('RenderBoat')
    .onEnter(function(entity) {
        // entity is a pointer to the boat entity data
    });
```

```javascript
mod.hook('RenderBoat')
    .onLeave(function(returnValue, entity) {
        // Boat has finished rendering
    });
```

## Pseudocode
```
function RenderBoat(entity):
    // Guard condition: check if boat should render
    activeFlag = entity.flags[0x7a]  // offset 0x1E8
    
    if activeFlag == 0:
        // Check level-specific timing condition
        if LevelId != 4:
            return
        if entity.roomId != 124:
            return
        if tickCounter < 3033 or tickCounter >= 3051:
            return
    
    // Get model slot from entity room ID
    modelSlot = entity.roomId
    meshPointers = modelTable[modelSlot]
    
    entityBox = GetEntityBox(entity)
    
    // Additional setup if mesh count > 1
    meshCount = getMeshCount(modelSlot)
    if meshCount > 1:
        setupMultiMesh(entity)
    
    // Setup entity bounds/transform
    setupEntityBounds(entity, entityBox)
    
    // Push matrix stack, copy current matrix state
    pushMatrix()
    
    // Apply entity rotation and position to matrix
    applyEntityTransform(entity.rotation, entity.position)
    
    // Check render mode
    hasMeshData = modelData[modelSlot].meshPointer != 0
    ogModeEnabled = ogGraphicsFlag & 1
    
    if hasMeshData and ogModeEnabled:
        // OG graphics path: direct mesh render
        renderMesh(entity)
    else:
        // Modern graphics path
        meshIndex = 0
        frameOffset = 0
        meshBit = 1
        
        while meshIndex < meshCount:
            // Check if this mesh part is enabled
            if entity.meshBits & meshBit:
                // Get interpolation factor (or 0x100 if disabled)
                interpFactor = InterpolationFactor
                if interpolationDisabled:
                    interpFactor = 0x100
                
                // Interpolate between current and previous frame transforms
                interpolateTransform(
                    entity.currentFrame + frameOffset,
                    entity.previousFrame + frameOffset,
                    interpFactor
                )
                
                // Add camera offset to matrix
                matrix[3] += cameraOffsetX
                matrix[7] += cameraOffsetY
                matrix[11] += cameraOffsetZ
                
                // Finalize transform
                finalizeTransform()
                
                // Render mesh part
                renderMeshPart(meshPointers[meshIndex], 1)
            
            meshIndex++
            frameOffset += 0x30
            meshBit = (meshBit << 1) | (meshBit >> 31)
        
        // Optional OG mode post-render pass
        if ogGraphicsFlag & 1:
            postRenderOGPass()
    
    // Pop matrix stack
    popMatrix()
```
