# Function: CanInterpolateCamera

## Description
Determines whether the camera can smoothly interpolate between its previous and current positions. Compares position and angle deltas against thresholds, and if exceeded, performs line-of-sight checks to verify the interpolation path is unobstructed. Returns 1 if interpolation is allowed, 0 if the camera should snap.

## Notes
- Called during camera updates to decide between smooth interpolation and instant snapping
- Position delta threshold: 257 world units per axis (X, Y, Z)
- Angle delta threshold: 8193 angle units per axis (yaw, pitch, roll)
- If deltas are within thresholds, interpolation is allowed without further checks
- If deltas exceed thresholds, performs geometry traces to verify line-of-sight between old and new camera positions
- Skips interpolation checks entirely if a certain game state flag is non-zero (e.g., cutscene mode)
- Also checks Lara behaviour flags bit 2 (0x4) — if set, disables interpolation
- Uses TraceRangeX, TraceRangeZ, GetSector, and TraceLineOfSight for geometry validation
- The order of X vs Z tracing depends on which axis has the larger delta

## Details

| Field     | Value                          |
|-----------|--------------------------------|
| Usage     | `Hook & Call`                  |
| Params    | (none)                         |
| Return    | `int`                          |

### Return Values

| Value | Description                                    |
|-------|------------------------------------------------|
| `1`   | Camera can interpolate smoothly                |
| `0`   | Camera should snap to new position immediately |

## Usage
### Hooking
```javascript
mod.hook('CanInterpolateCamera')
    .onEnter(function() {
        // Called before interpolation check
    })
    .onLeave(function(returnValue) {
        // returnValue: 1 = interpolate, 0 = snap
    });
```

### Calling from mod code
```javascript
// Check if camera can interpolate this frame
const canInterpolate = game.callFunction(game.module, 'CanInterpolateCamera');
if (canInterpolate === 0) {
    // Camera will snap — might want to trigger effects
}
```

## Pseudocode
```
function CanInterpolateCamera():
    // skip interpolation check if game state flag is set (e.g., cutscene)
    if gameStateFlag != 0:
        return 0

    // compare previous vs current camera position
    deltaX = abs(currentCameraX - previousCameraX)
    deltaY = abs(currentCameraY - previousCameraY)
    deltaZ = abs(currentCameraZ - previousCameraZ)

    // compare previous vs current camera angles
    deltaYaw = abs((short)(currentYaw - previousYaw))
    deltaPitch = abs((short)(currentPitch - previousPitch))
    deltaRoll = abs((short)(currentRoll - previousRoll))

    // if all deltas within thresholds, allow interpolation
    if deltaX < 257 and deltaY < 257 and deltaZ < 257:
        if deltaYaw < 8193 and deltaPitch < 8193 and deltaRoll < 8193:
            return 1

    // deltas exceeded — check if path is clear
    if not isValidCameraPosition(currentX, currentY, currentZ):
        return 0
    if cameraMode == 4:  // fixed camera
        return 0
    if laraBehaviourFlags & 0x4:  // behaviour flag blocks interpolation
        return 0

    // trace geometry between old and new camera positions
    // order X/Z traces by which axis has larger delta
    if abs(previousX - currentX) < abs(previousZ - currentZ):
        traceX = TraceRangeX(current, previous)
        traceZ = TraceRangeZ(current, previous)
    else:
        traceZ = TraceRangeZ(current, previous)
        traceX = TraceRangeX(current, previous)

    if traceZ == 0:
        return 0

    // resolve sector at traced position
    GetSector(previousX, previousY, previousZ, roomId)

    // final line-of-sight check
    if TraceLineOfSight(current, previous) != 0:
        if traceX == 1 and traceZ == 1:
            return 1

    return 0
```
