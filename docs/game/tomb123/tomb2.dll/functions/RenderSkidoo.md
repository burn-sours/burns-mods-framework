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
// Skip skidoo rendering entirely
mod.hook(game.module, 'RenderSkidoo', {
    onEnter(entity) {
        // Return early to hide the skidoo
        // Or modify entity data before rendering
    }
});
```

```javascript
// Execute code after skidoo renders
mod.hook(game.module, 'RenderSkidoo', {
    onLeave(returnValue, entity) {
        // Skidoo has finished rendering
        // Could render additional effects here
    }
});
```

## Pseudocode
```
function RenderSkidoo(entity):
    // Get bounding box for culling/collision
    entityBox = GetEntityBox(entity)
    
    // Read flags from entity data
    flags = 0
    if entity.flagsPointer != null:
        flags = *entity.flagsPointer
    
    // Save current room ID
    savedRoomId = entity.roomId
    
    // Select model data based on flags
    if (flags & 4) == 0:
        modelData = roomModels[entity.roomId]
    else:
        // OG graphics mode - use alternate model
        if ogGraphicsEnabled:
            entity.roomId = 51  // Skidoo model ID
        modelData = alternateModelData
    
    // Setup entity transformation
    SetupEntityTransform(entity, entityBox)
    
    // Push matrix stack
    PushMatrixStack()
    
    // Apply entity position/rotation to matrix
    ApplyEntityRotation(entity.rotation, entity.position)
    
    // Check for OG mode mesh rendering
    if modelData.meshPointer != 0 and ogGraphicsEnabled:
        RenderEntityMesh(entity)
        
        // Handle driver appearance swap if available
        driverSlot = (flags >> 8)
        if entity.flagsPointer != 0 and driverSlot valid:
            // Save original mesh data
            // Apply alternate driver appearance
            // Render with swapped appearance
            // Restore original mesh data
        
        goto cleanup
    
    // Determine alternate mesh based on flag bits
    alternateMesh = null
    if (flags & 3) == 1:
        alternateMesh = meshTable[baseIndex + 1]
    else if (flags & 3) == 2:
        alternateMesh = meshTable[baseIndex + 7]
    
    // Iterate through mesh parts
    meshCount = modelData.meshCount
    meshBits = entity.meshBits
    meshIndex = 0
    
    for i = 0 to meshCount:
        if (meshBits & (1 << i)) != 0:
            // Apply interpolation for smooth rendering
            if interpolationEnabled:
                factor = cameraInterpolationFactor
            else:
                factor = 256  // Full weight to current frame
            
            InterpolateMeshTransform(entity.currentFrame, entity.previousFrame, factor)
            
            // Add camera offset to matrix
            AddCameraOffset()
            
            // Finalize transformation
            FinalizeTransform()
            
            // Render the mesh
            if meshIndex == 0 or alternateMesh == null:
                RenderMesh(modelData.meshes[i], 1)
            else:
                RenderMesh(alternateMesh, 1)
                alternateMesh = null
        
        meshIndex++
    
cleanup:
    // Restore original room ID
    entity.roomId = savedRoomId
    
    // Pop matrix stack
    PopMatrixStack()
```
