# Function: CanInterpolateCamera

## Description
Determines whether the camera can safely interpolate between its previous and current positions. Checks if the position and angle deltas are within acceptable thresholds, and if not, performs line-of-sight and range tracing to verify the interpolation path is unobstructed.

## Notes
- Returns 1 (can interpolate) immediately if all position deltas are small and all angle deltas are small — the camera barely moved, so interpolation is safe
- If deltas exceed thresholds, falls back to geometry checks: validates the previous camera position is in a valid room, then traces the path between previous and current positions using TraceRangeX/TraceRangeZ (ordered by which axis has the larger delta) and checks line of sight
- Skips geometry checks entirely if a certain game state flag is set (always returns 0)
- Also returns 0 if the game is in a specific mode or the render flag indicates a cutscene-like state
- Used by the rendering system to decide whether to smoothly blend camera positions between game loop ticks or snap to the new position

## Details

| Field     | Value                          |
|-----------|--------------------------------|
| Usage     | `Hook`                         |
| Params    | *(none)*                       |
| Return    | `int`                          |

### Return Values

| Value | Description                                     |
|-------|-------------------------------------------------|
| `1`   | Camera can safely interpolate between positions |
| `0`   | Camera should snap to new position (no interpolation) |

## Usage
### Hooking
```javascript
mod.hook('CanInterpolateCamera')
    .onEnter(function() {
        // Called to check if camera interpolation is safe
    })
    .onLeave(function(returnValue) {
        // returnValue: 1 = can interpolate, 0 = snap
    });
```

## Pseudocode
```
function CanInterpolateCamera():
    if game state flag is set:
        return 0  // interpolation disabled

    // fast path: check if camera barely moved
    if abs(previousX - currentX) < position threshold
    and abs(previousZ - currentZ) < position threshold
    and abs(previousY - currentY) < position threshold
    and abs(previousYaw - currentYaw) < angle threshold
    and abs(previousPitch - currentPitch) < angle threshold
    and abs(previousRoll - currentRoll) < angle threshold:
        return 1  // small movement, safe to interpolate

    // slow path: geometry validation
    if previous position is not in a valid room:
        return 0
    if game is in specific mode or render flag indicates cutscene:
        return 0

    // set up trace between previous and current camera positions
    // trace along the axis with the larger delta first
    if abs(deltaX) < abs(deltaY):
        resultA = TraceRangeX(previous, current)
        resultB = TraceRangeZ(previous, current)
    else:
        resultA = TraceRangeZ(previous, current)
        resultB = TraceRangeX(previous, current)

    if resultB == 0:
        return 0  // range trace failed

    // update sector for the current position
    GetSector(currentX, currentZ, currentY, roomId)

    // final line of sight check
    if line of sight clear and both traces passed:
        return 1

    return 0
```
