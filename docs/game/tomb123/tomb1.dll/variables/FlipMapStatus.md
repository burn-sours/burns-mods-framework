# Variable: FlipMapStatus

## Description
The current flip map status — whether the map is in its normal or flipped state. Toggled at the end of the `FlipMap` function.

## Notes
- Toggled via: `flipMapStatus = (flipMapStatus == 0)` — flips between 0 and 1
- The `FlipMap` function swaps room data between normal and alternate versions, then toggles this status

## Details

| Field     | Value           |
|-----------|-----------------|
| Type      | `UInt32`        |

## Value Range

| Value | Description                    |
|-------|--------------------------------|
| `0`   | Normal (unflipped)             |
| `1`   | Flipped                        |

## Usage
### Calling from mod code
```javascript
const status = game.readVar(game.module, 'FlipMapStatus');

if (status) {
    // map is currently flipped
}
```
