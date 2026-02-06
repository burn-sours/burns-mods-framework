# Function: RenderEntity

## Description
Renders a single entity (enemy, object, NPC) by drawing its mesh parts with proper lighting, animation interpolation, and visual effects. Handles the full render pipeline including matrix transforms, mesh visibility masks, gunflash effects, and equipped item rendering.

Has two render paths: modern rendering with per-mesh transforms and interpolation, and OG graphics mode which uses a simplified batch approach.

## Notes
- Early return if entity visibility flag at offset `0x1e8` is 0 (entity not visible)
- Uses the entity's model ID to look up mesh data, bone structure, and mesh count
- Applies lighting setup before rendering via internal lighting function
- Pushes/pops the matrix stack around rendering
- Iterates through mesh parts using a bitmask in `entity[3]` to determine which meshes are visible
- Uses `InterpolationFactor` for smooth animation blending between frames (forced to `0x100` when interpolation disabled)
- Mesh transforms are stored at entity offsets `0x1f0` (current) and `0x820` (previous) in 12-int chunks per mesh
- Gunflash effects are rendered on a specific mesh index with random rotation and particle visuals
- Equipped items are rendered on a designated mesh when entity has items equipped (checked via offset `0x26`)
- OG graphics mode skips per-mesh rendering and uses a different batch render path

## Details

| Field     | Value       |
|-----------|-------------|
| Usage     | `Hook`      |
| Params    | `pointer`   |
| Return    | `void`      |

### Parameters

| #   | Type      | Description                |
|-----|-----------|----------------------------|
| 0   | `pointer` | Pointer to entity struct   |

## Usage
### Hooking
```javascript
mod.hook('RenderEntity')
    .onEnter(function(entity) {
        const modelId = entity.add(0x10).readS16();
        const meshMask = entity.add(0xc).readU32();
        log('Rendering entity with model:', modelId, 'meshMask:', meshMask.toString(16));
    });
```

## Pseudocode
```
function RenderEntity(entity):
    // Skip if entity is not visible
    if entity[0x1e8] == 0:
        return
    
    modelId = entity.modelId
    modelData = modelsPointer + modelId * MODEL_STRIDE
    meshCount = modelData.meshCount
    gunflashMeshIndex = getGunflashMeshIndex(modelId)
    
    // Handle multi-part models
    if meshCount > 1:
        setupMultiPartModel(entity)
    
    // Setup lighting for this entity
    setupEntityLighting(entity, modelId)
    
    // Push matrix stack
    pushMatrix()
    
    // Build entity world transform
    buildEntityTransform(entity.position, entity.rotation)
    
    if not ogGraphicsMode or not hasOgModelData:
        // Modern render path
        meshIndex = 0
        meshBit = 1
        transformOffset = 0
        
        for each mesh in model:
            if entity.meshMask & meshBit:
                // Get interpolation factor
                interpFactor = InterpolationFactor
                if interpolationDisabled:
                    interpFactor = 0x100
                
                // Interpolate between previous and current transforms
                interpolateMeshTransform(
                    entity + 0x1f0 + transformOffset,  // current
                    entity + 0x820 + transformOffset,  // previous
                    interpFactor
                )
                
                // Apply transform offsets
                matrix[3] += renderTransformX
                matrix[7] += renderTransformZ
                matrix[11] += renderTransformY
                
                finalizeTransform()
                drawMesh(modelMeshPointers[meshIndex], 1)
                
                // Render gunflash effect on designated mesh
                if entity.gunflashActive and meshIndex == gunflashMeshIndex:
                    randomSeed = updateRandom()
                    pushMatrix()
                    applyGunflashOffset(modelId)
                    randomRotation = calculateRandomRotation(randomSeed)
                    applyRotation(0, rotationFlags, randomRotation)
                    
                    DrawSetup(renderMode, matrix)
                    drawGunflashParticle()
                    setLightingIntensity(600)
                    drawGunflashMesh()
                    popMatrix()
                    entity.hasGunflash = 1
                
                // Render equipped item on designated mesh
                if entity.equippedItem > 0 and meshIndex == gunflashMeshIndex:
                    if modelHasEquipSlot:
                        popMatrix()
                        renderEquippedItem(entity)
                        pushMatrix()
            
            transformOffset += 0x30
            meshBit = rotateBitLeft(meshBit)
            meshIndex++
        
        if ogGraphicsMode:
            finalizeOgRender()
    else:
        // OG graphics batch render path
        renderOgModel(entity)
        
        // Still handle equipped items in OG mode
        if entity.equippedItem > 0:
            for each mesh:
                if entity.meshMask & meshBit:
                    interpolateMeshTransform(...)
                    if meshIndex == gunflashMeshIndex and modelHasEquipSlot:
                        popMatrix()
                        renderEquippedItem(entity)
                        pushMatrix()
                meshIndex++
    
    // Pop matrix stack
    popMatrix()
```
