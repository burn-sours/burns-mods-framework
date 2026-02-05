# Function: RenderSkidoo

## Description
Renders the skidoo (snowmobile) vehicle entity. Handles mesh rendering with interpolation, transformation matrix setup, and driver appearance swapping in OG graphics mode.

## Notes
- Called during the render phase for skidoo entities
- Supports both modern and OG (original) graphics modes
- In OG mode with certain flags, swaps to model 51 and can apply alternate driver appearance
- Uses interpolation factor for smooth rendering between frames
- Iterates through mesh parts using bit flags from entity data

## Details

| Field     | Value           |
|-----------|-----------------|
| Usage     | `Hook`          |
| Params    | `pointer`       |
| Return    | `void`          |

### Parameters

| #   | Type      | Description                              |
|-----|-----------|------------------------------------------|
| 0   | `pointer` | Pointer to the skidoo entity structure   |

## Usage
### Hooking
```javascript
mod.hook('RenderSkidoo')
    .onEnter(function(entity) {
        // entity is a pointer to the skidoo entity data
    });
```

```javascript
mod.hook('RenderSkidoo')
    .onLeave(function(returnValue, entity) {
        // Skidoo has finished rendering
    });
```

## Pseudocode
```
function RenderSkidoo(entity):
    meshIndex = 0
    flags = 0
    
    entityBox = GetEntityBox(entity)
    
    // Read flags from entity flag pointer if present
    if entity.flagPointer != null:
        flags = *entity.flagPointer
    
    savedRoomId = entity.roomId
    
    // Select model data source based on flag bit 2
    if (flags & 4) == 0:
        // Standard path: use room-indexed model table
        modelData = modelTable[entity.roomId]
    else:
        // Alternate path: OG graphics mode
        if ogGraphicsFlag & 1:
            entity.roomId = 51  // Skidoo model ID
        modelData = alternateModelData
    
    // Setup entity bounding/transform
    setupEntityBounds(entity, entityBox)
    
    // Push matrix stack, copy current matrix state
    pushMatrix()
    
    // Apply entity rotation and position to matrix
    applyEntityTransform(entity.rotation, entity.position)
    
    // OG graphics rendering path
    if modelData.meshPointer != 0 and ogGraphicsFlag & 1:
        renderMesh(entity)
        
        // Driver appearance swap
        driverSlot = flags >> 8
        if entity.flagPointer != 0:
            slotOffset = driverSlot * 0x8f8
            if slotValid(driverSlot) and slotHasMesh(slotOffset):
                // Save original model mesh data (6 mesh entries)
                savedMeshData = modelData.meshes[0..5]
                
                // Copy alternate appearance mesh data
                modelData.meshes[0..5] = alternateAppearance[slotOffset]
                
                // Render with swapped appearance
                renderMesh(entity)
                
                // Restore original mesh data
                modelData.meshes[0..5] = savedMeshData
        
        goto cleanup
    
    // Modern graphics rendering path
    // Select alternate mesh based on flag bits 0-1
    alternateMesh = null
    if (flags & 3) == 1:
        alternateMesh = meshTable[baseIndex + 1]
    else if (flags & 3) == 2:
        alternateMesh = meshTable[baseIndex + 7]
    
    // Iterate through mesh parts
    meshCount = modelData.meshCount
    meshBit = 1
    
    while meshIndex < meshCount:
        // Check if this mesh part is enabled
        if entity.meshBits & meshBit:
            // Calculate frame data offset for this mesh
            frameOffset = meshIndex * 0x30
            
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
            
            // Render mesh
            if meshIndex == 0 or alternateMesh == null:
                renderMeshPart(modelData.meshes[meshIndex], 1)
            else:
                renderMeshPart(alternateMesh, 1)
                alternateMesh = null
        
        meshIndex++
        meshBit = (meshBit << 1) | (meshBit >> 31)  // Rotate bit
    
cleanup:
    // Restore original room ID
    entity.roomId = savedRoomId
    
    // Pop matrix stack
    popMatrix()
```
