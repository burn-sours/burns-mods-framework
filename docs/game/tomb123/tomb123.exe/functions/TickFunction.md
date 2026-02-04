# Function: TickFunction

## Description
Calculates frame timing for the current tick. Uses a high-resolution performance counter to determine elapsed time since a reference tick, scales it (with dev mode speed override support), and computes the frame time delta.

If a frame interpolation output pointer is provided, it calculates an interpolation factor based on the remainder of the time division — unless interpolation is disabled in game settings, in which case it outputs a fixed value of `0x100`.

## Notes
- The tick rate defaults to 30 (0x1E) but is overridden by `devModeSpeed` when `devMode` is active
- `frameTimeDelta` is the difference between the current and previous scaled time — used by the engine to advance game state
- The interpolation factor output is used for smooth rendering between game ticks

## Details

| Field     | Value         |
|-----------|---------------|
| Usage     | `Hook`        |
| Params    | `pointer`     |

### Parameters

| #   | Type      | Description                                                  |
|-----|-----------|--------------------------------------------------------------|
| 0   | `pointer` | Output pointer for frame interpolation factor (can be null)  |

## Usage
### Hooking
```javascript
mod.hook('TickFunction')
    .onEnter(function(frameInterpolation) {
        // frameInterpolation is a pointer (or null)
    });
```

## Pseudocode
```
function TickFunction(frameInterpolation):
    QueryPerformanceCounter(now)

    tickRate = 30
    if devMode != 0:
        tickRate = devModeSpeed

    elapsed = ((now - referenceTick) * 1000) / tickFrequency
    scaledTime = (tickRate * elapsed) / 1000
    currentFrameTime = scaledTime

    if frameInterpolation != null:
        if interpolation disabled in gameSettings:
            *frameInterpolation = 0x100
        else:
            remainder = elapsed - (scaledTime * 1000) / tickRate
            *frameInterpolation = (remainder * tickRate * 0x100) / 1000

    frameTimeDelta = scaledTime - prevScaledTime
    prevScaledTime = scaledTime
```
