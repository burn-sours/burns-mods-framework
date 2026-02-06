# Function: DrawRect

## Description
Draws a gradient rectangle on screen. Takes two corner coordinates and two color/gradient values. The gradient direction is automatically determined by the rectangle's aspect ratio — horizontal gradient for wide rectangles, vertical gradient for tall rectangles. The ordering of the input coordinates determines which end gets which color.

## Notes
- Coordinates are sorted internally — the input order of x/y and x2/y2 doesn't matter for the rectangle shape, but it does affect which corner gets which gradient color.
- Wide rectangles (width > height): gradient runs left-to-right.
- Tall rectangles (height >= width): gradient runs top-to-bottom.
- The final render call adds 1 to the right and bottom edges (exclusive bounds).
- Passes a fixed value of `0x80` to the underlying render function (likely alpha or blend flags).
- The last two params are floats but typed as `uint64` in the patch — this is how floats are passed through the calling convention.

## Details

| Field     | Value                                      |
|-----------|--------------------------------------------|
| Usage     | `Hook & Call`                              |
| Params    | `int, int, int, int, uint64, uint64`       |
| Return    | `void`                                     |

### Parameters

| #   | Type      | Description                                  |
|-----|-----------|----------------------------------------------|
| 0   | `int`     | X coordinate of first corner                 |
| 1   | `int`     | Y coordinate of first corner                 |
| 2   | `int`     | X coordinate of second corner                |
| 3   | `int`     | Y coordinate of second corner                |
| 4   | `uint64`  | Gradient color value A (float)               |
| 5   | `uint64`  | Gradient color value B (float)               |

## Usage
### Hooking
```javascript
mod.hook('DrawRect')
    .onEnter(function(x, y, x2, y2, colorA, colorB) {
        log('DrawRect:', x, y, x2, y2);
    });
```

### Calling from mod code
```javascript
game.callFunction(game.module, 'DrawRect', x, y, x2, y2, colorA, colorB);
```

## Pseudocode
```
function DrawRect(x, y, x2, y2, colorA, colorB):
    // Sort coordinates: left, right, top, bottom
    left  = min(x, x2)
    right = max(x, x2)
    top   = min(y, y2)
    bottom = max(y, y2)

    width  = right - left
    height = bottom - top

    // Determine gradient direction and corner colors
    if height < width:
        // Wide rect: horizontal gradient
        // Corner assignment depends on original x ordering
        if x <= x2:
            topLeft=colorA, topRight=colorB, bottomLeft=colorB, bottomRight=colorA
        else:
            topLeft=colorB, topRight=colorA, bottomLeft=colorA, bottomRight=colorB
    else:
        // Tall rect: vertical gradient
        // Corner assignment depends on original y ordering
        if y2 < y:
            topLeft=colorA, topRight=colorA, bottomLeft=colorB, bottomRight=colorB
        else:
            topLeft=colorB, topRight=colorB, bottomLeft=colorA, bottomRight=colorA

    // Render with exclusive right/bottom edges
    DrawQuad(left, top, right+1, top, right+1, bottom+1, left, bottom+1,
             bottomRight, bottomLeft, topRight, topLeft, 0x80)
```
