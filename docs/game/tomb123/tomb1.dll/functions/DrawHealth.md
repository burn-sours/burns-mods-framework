# Function: DrawHealth

## Description
Draws the health bar on screen. Called by RenderUI with a health value scaled to 0–100.

Queries the current game version to select version-specific colors — each game (TR1, TR2, TR3) has its own color palette for the bar. Supports two rendering modes: a classic mode that draws the bar using primitives (DrawSetup, DrawRect, and gradient fills), and a modern/remastered mode that delegates to a separate rendering function.

In classic mode, the bar is drawn right-aligned using UiDrawWidth, with a 2-pixel border and a 5-pixel tall fill region. The fill width corresponds directly to the health value (0–100 pixels). Colors are interpolated based on the health value to create a gradient effect — each game version uses distinct color pairs for the gradient.

## Notes
- `param_1` is the health value (0–100), passed from RenderUI as `hp / 10`
- Game version determines the color palette: 0 = TR1, 1 = TR2, 2+ = TR3
- A rendering mode flag selects classic (primitives) vs modern (delegated) — same flag checked in RenderUI
- Bar position: right-aligned at `UiDrawWidth - 108`, border extends to `UiDrawWidth - 6`
- Bar fill: Y rows 10–14 (5 pixels tall), X from bar start to `bar start + health value`
- Border: Y 8–16, drawn with DrawRect for left edge, right edge, and top line
- Color palettes per game version (classic mode):
  - TR1: blue/teal tones
  - TR2: blue-to-green gradient
  - TR3: dark blue to bright green
- Colors are interpolated between two values based on the health parameter (gradient from empty to full)
- If health is 0, only the border/background is drawn — no fill

## Details

| Field     | Value       |
|-----------|-------------|
| Usage     | `Hook & Call` |
| Params    | `int`       |
| Return    | `void`      |

### Parameters

| #   | Type  | Description                          |
|-----|-------|--------------------------------------|
| 0   | `int` | Health value (0–100 scale)           |

## Usage
### Hooking
```javascript
mod.hook('DrawHealth')
    .onEnter(function(health) {
        // health is 0–100
        // Replace to draw a custom health bar
    });
```

### Calling from mod code
```javascript
// Draw the health bar with a specific value
game.callFunction(game.module, 'DrawHealth', 75);
```

## Pseudocode
```
function DrawHealth(health):
    gameVersion = getGameVersion()

    // select color palette based on game version
    // 0 = TR1 (blue/teal), 1 = TR2 (blue-green), 2+ = TR3 (dark blue to green)
    colors = versionColors[gameVersion]

    barX = UiDrawWidth - 108
    borderLeft = UiDrawWidth - 110
    borderRight = UiDrawWidth - 6

    if modern rendering mode:
        modernDrawHealth(barX, 8, health, colors.modernData)
        return

    // classic rendering mode
    DrawSetup(0x39, null)

    // draw border
    DrawRect(borderLeft, 8, borderLeft, 16, borderColor, borderColor)       // left edge
    DrawRect(borderRight, 8, borderRight, 16, borderColor, borderColor)     // right edge
    DrawRect(borderLeft, 8, borderRight, 8, borderColor, borderColor)       // top edge

    // draw border shading (gradient quads for bottom and inner background)
    drawGradientQuad(bottom border area, shadowColors)
    drawGradientQuad(inner background area, bgColors)

    // draw health fill
    if health > 0:
        // interpolate 4 color pairs based on health value
        c1 = interpolateColor(colors.empty1, colors.full1, health)
        c2 = interpolateColor(colors.empty2, colors.full2, health)
        c3 = interpolateColor(colors.empty3, colors.full3, health)
        c4 = interpolateColor(colors.empty4, colors.full4, health)

        // draw 5 horizontal lines (rows 10–14) with gradient colors
        for row = 10 to 14:
            DrawRect(barX, row, barX + health, row, bgGradient[row], fillGradient[row])
```
