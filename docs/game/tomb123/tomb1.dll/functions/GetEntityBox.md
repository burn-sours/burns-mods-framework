# Function: GetEntityBox

## Description
Returns a pointer to the interpolated bounding box for an entity based on its current animation frame. Fetches the animation frame bounds (start and end keyframes), then interpolates between them if the entity is between keyframes. If exactly on a keyframe, returns the bounds directly without interpolation.

## Notes
- The bounding box consists of 6 consecutive `short` values: minX, maxX, minY, maxY, minZ, maxZ
- When interpolation is needed, the result is written to a shared static buffer — the pointer is only valid until the next call
- When no interpolation is needed (exactly on a keyframe), returns a pointer directly into the animation data
- The interpolation factor comes from the animation frame progress between two keyframes

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
        log('Bounds:', minX, maxX, minY, maxY, minZ, maxZ);
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
    // Resolve current animation frame data
    animId = entity.animId
    
    if animId == -1:
        // No animation — use model's base frame data
        frameStep = 1
        frameStart = modelFrames[entity.modelId]
        frameEnd = frameStart
        interpolation = 0
    else:
        // Look up animation entry
        anim = animations[animId]
        frameStep = anim.frameStep
        frameDataBase = anim.frameDataPtr
        boundsSize = (models[entity.modelId].boneCount * 2 + 10) * 2

        // Calculate which keyframe pair we're between
        frameProgress = entity.animFrame - anim.startFrame
        keyframeIndex = frameProgress / frameStep
        interpolation = frameProgress % frameStep

        frameStart = frameDataBase + (keyframeIndex * boundsSize)
        frameEnd = frameStart + boundsSize

        // Adjust frame step if near end of animation
        if anim.endFrame < (keyframeIndex + 1) * frameStep:
            frameStep = anim.endFrame - ((keyframeIndex + 1) * frameStep) + frameStep

    if interpolation == 0:
        // Exactly on a keyframe — return bounds directly
        return frameStart

    // Between keyframes — interpolate each of the 6 bound values
    // (minX, maxX, minY, maxY, minZ, maxZ)
    for i = 0 to 5:
        staticBuffer[i] = frameStart[i] +
            ((frameEnd[i] - frameStart[i]) * interpolation) / frameStep

    return staticBuffer
```
