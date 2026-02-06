# Function: GetEntityBox

## Description
Returns a pointer to the bounding box for an entity based on its current animation frame. Fetches the animation frame bounds and snaps to the nearest keyframe — unlike tomb1, this version does not interpolate between keyframes.

## Notes
- The bounding box consists of 6 consecutive `short` values: minX, maxX, minY, maxY, minZ, maxZ
- Returns a pointer directly into the animation data — no interpolation buffer
- When animId is -1 (no animation), returns the model's base frame bounds
- Snaps to nearest keyframe using a threshold of frameStep/2
- Simpler than tomb1 which performed full interpolation between keyframes

## Details

| Field     | Value                          |
|-----------|--------------------------------|
| Usage     | `Hook & Call`                  |
| Params    | `pointer`                      |
| Return    | `pointer`                      |

### Parameters

| #   | Type      | Description                          |
|-----|-----------|--------------------------------------|
| 0   | `pointer` | Pointer to the entity                |

### Return Values

| Value     | Description                                          |
|-----------|------------------------------------------------------|
| `pointer` | Pointer to 6 consecutive `short` values (the bounding box) |

## Usage
### Hooking
```javascript
mod.hook('GetEntityBox')
    .onLeave(function(returnValue, entityPtr) {
        const minX = returnValue.readS16();
        const maxX = returnValue.add(2).readS16();
        const minY = returnValue.add(4).readS16();
        const maxY = returnValue.add(6).readS16();
        const minZ = returnValue.add(8).readS16();
        const maxZ = returnValue.add(10).readS16();
    });
```

### Calling from mod code
```javascript
// Get bounding box for Lara
const laraPtr = game.readVar(game.module, 'Lara');
const boxPtr = game.callFunction(game.module, 'GetEntityBox', laraPtr);
const minX = boxPtr.readS16();
const maxX = boxPtr.add(2).readS16();
```

## Pseudocode
```
function GetEntityBox(entity):
    animId = entity.animId
    
    // No animation — return model's base frame bounds
    if animId == -1:
        modelId = entity.modelId
        return modelFrameData[modelId]
    
    // Get animation data
    anim = animationTable[animId]
    frameStepInfo = anim.frameStepInfo
    frameStep = frameStepInfo & 0xFF
    boundsSize = frameStepInfo >> 8
    
    // Calculate frame progress
    frameProgress = entity.animFrame - anim.startFrame
    keyframeIndex = frameProgress / frameStep
    remainder = frameProgress % frameStep
    
    // Get current keyframe bounds pointer
    boundsPtr = anim.frameDataPtr + (keyframeIndex * boundsSize * 2)
    
    // Adjust frame step if near end of animation
    if remainder != 0:
        nextFrameOffset = (keyframeIndex + 1) * frameStep
        if anim.endFrame < nextFrameOffset:
            frameStep = frameStep + (anim.endFrame - nextFrameOffset)
    
    // Snap to nearest keyframe (no interpolation)
    if remainder <= frameStep / 2:
        return boundsPtr  // Current keyframe
    else:
        return boundsPtr + (boundsSize * 2)  // Next keyframe
```
