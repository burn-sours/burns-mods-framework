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
    // Get animation frame bounds for entity's current state
    frameBoundsStart, frameBoundsEnd, interpolationInfo = getAnimationFrameBounds(entity)
    interpolationFactor = interpolationInfo[0]

    if interpolationFactor == 0:
        // Exactly on a keyframe — return bounds directly
        return frameBoundsStart

    // Between keyframes — interpolate each of the 6 bound values
    for i = 0 to 5:
        staticBuffer[i] = frameBoundsStart[i] +
            ((frameBoundsEnd[i] - frameBoundsStart[i]) * interpolationFactor) / interpolationInfo[0]

    return staticBuffer
```
