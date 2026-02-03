# Function: UpdateTickRef

## Description
Resets the reference tick used by `TickFunction` for frame timing. Captures the current performance counter as the new reference point, calls an internal function, then measures the time elapsed during that call.

## Notes
- Sets `referenceTick` which `TickFunction` uses to calculate elapsed time
- The internal function called between the two performance counter reads is unidentified
- The elapsed time from that internal call is stored, purpose unknown

## Details

| Field     | Value      |
|-----------|------------|
| Usage     | `Hook`     |
| Params    | *(none)*   |
| Return    | `void`     |

## Usage
### Hooking
```javascript
mod.hook('UpdateTickRef')
    .onEnter(function() {
        // called when the tick reference is being reset
    });
```

## Pseudocode
```
function UpdateTickRef():
    QueryPerformanceCounter(referenceTick)

    callInternalFunction(0)

    QueryPerformanceCounter(now)
    elapsed = ((now - referenceTick) * 1000) / tickFrequency
    store elapsed
```
