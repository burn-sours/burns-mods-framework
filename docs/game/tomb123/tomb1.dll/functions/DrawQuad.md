# Function: DrawQuad

## Description
Low-level quad rendering function. Allocates a 4-vertex render primitive and fills in per-vertex position, color, and alpha values (UVs zeroed). Used internally by DrawRect and other UI rendering functions.

Useful for modders who need direct control over quad rendering with per-vertex colors and custom geometry, bypassing DrawRect's auto-gradient logic.

## Notes
- Allocates a render primitive with 4 vertices, each with a stride of 10 floats (position, UV, alpha, color).
- UVs are zeroed for all vertices (no texture mapping).
- Each vertex gets its own float color value and a shared byte alpha value.
- Called by DrawRect with alpha hardcoded to `0x80` (128).
- Vertex order: top-left, top-right, bottom-right, bottom-left (as called from DrawRect).

## Details

| Field     | Value                                                                                   |
|-----------|-----------------------------------------------------------------------------------------|
| Usage     | `Hook & Call`                                                                           |
| Params    | `int, int, int, int, int, int, int, int, float, float, float, float, int`              |
| Return    | `void`                                                                                  |

### Parameters

| #   | Type    | Description                        |
|-----|---------|------------------------------------|
| 0   | `int`   | X position of vertex 0             |
| 1   | `int`   | Y position of vertex 0             |
| 2   | `int`   | X position of vertex 1             |
| 3   | `int`   | Y position of vertex 1             |
| 4   | `int`   | X position of vertex 2             |
| 5   | `int`   | Y position of vertex 2             |
| 6   | `int`   | X position of vertex 3             |
| 7   | `int`   | Y position of vertex 3             |
| 8   | `float` | Color for vertex 3                 |
| 9   | `float` | Color for vertex 0                 |
| 10  | `float` | Color for vertex 1                 |
| 11  | `float` | Color for vertex 2                 |
| 12  | `int`   | Alpha (byte, e.g. `0x80` = 128)    |

### Return Values

None (`void`).

## Usage
### Hooking
```javascript
mod.hook('DrawQuad')
    .onEnter(function(x0, y0, x1, y1, x2, y2, x3, y3, color3, color0, color1, color2, alpha) {
        log('DrawQuad at:', x0, y0, 'alpha:', alpha);
    });
```

### Calling from mod code
```javascript
game.callFunction(game.module, 'DrawQuad',
    x0, y0, x1, y1, x2, y2, x3, y3,
    color3, color0, color1, color2, alpha);
```

## Pseudocode
```
function DrawQuad(x0, y0, x1, y1, x2, y2, x3, y3, color3, color0, color1, color2, alpha):
    // Allocate a 4-vertex render primitive (type 5)
    vertices = allocPrimitive(0, 5, 0)

    // Vertex 0: position + color + alpha (UV = 0)
    vertices[0].x = x0
    vertices[0].y = y0
    vertices[0].uv = 0
    vertices[0].alpha = (float)alpha
    vertices[0].color = color0

    // Vertex 1
    vertices[1].x = x1
    vertices[1].y = y1
    vertices[1].uv = 0
    vertices[1].alpha = (float)alpha
    vertices[1].color = color1

    // Vertex 2
    vertices[2].x = x2
    vertices[2].y = y2
    vertices[2].uv = 0
    vertices[2].alpha = (float)alpha
    vertices[2].color = color2

    // Vertex 3
    vertices[3].x = x3
    vertices[3].y = y3
    vertices[3].uv = 0
    vertices[3].alpha = (float)alpha
    vertices[3].color = color3
```
