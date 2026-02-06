# Function: DrawHealth

## Description
Renders Lara's health bar on screen. Takes a health value parameter and a secondary flag that affects color scheme selection. Draws a styled bar with game-version-specific color schemes. Handles both modern rendering (using `DrawSetup`, `DrawRect`, `DrawQuad`) and OG graphics mode with a fallback rendering path.

## Notes
- Position is calculated relative to `UiDrawWidth` (right-aligned, offset -108 from right edge)
- Has four different color schemes based on game version and the second parameter:
  - **Version 0**: Blue theme (`0xff2c5c70`, `0xff4878a4`, etc.)
  - **Version 1**: Red/blue-to-green gradient theme (poison indicator colors)
  - **Version 2, param2 == 0**: Green theme (`0xff000040`/`0xff008000`, etc.)
  - **Version 2, param2 != 0**: Cyan/teal theme (`0xff006060`, `0xff00b0b0`, `0xff00f0f0`) — used for special states like poison
- Each version has an OG graphics fallback path (checks flag at offset `0x7e4` bit 0)
- Uses `DrawSetup` with mode `0x39` for modern rendering
- Draws border frame using `DrawRect`, then fills with `DrawQuad`
- Health bar is drawn in 5 horizontal strips (rows 10-14)
- Uses color interpolation function to blend colors based on health value
- If health param is 0, only the frame is drawn (empty bar)

## Details

| Field     | Value        |
|-----------|--------------|
| Usage     | `Hook`       |
| Params    | `int, int`   |
| Return    | `void`       |

### Parameters

| #   | Type  | Description                                                      |
|-----|-------|------------------------------------------------------------------|
| 0   | `int` | Health bar fill width (0 = empty, higher = more filled)          |
| 1   | `int` | Color scheme flag — for version 2+, 0 = green, non-zero = cyan   |

## Usage
### Hooking
```javascript
mod.hook('DrawHealth')
    .onEnter(function(health, colorFlag) {
        // health is the fill width of the bar
        // colorFlag affects color scheme in version 2+
    });
```

### Calling from mod code
```javascript
// Draw a health bar with specific fill (green scheme)
game.callFunction(game.module, 'DrawHealth', 100, 0);

// Draw with cyan/teal scheme (e.g., poisoned state)
game.callFunction(game.module, 'DrawHealth', 100, 1);
```

## Pseudocode
```
function DrawHealth(healthWidth, colorFlag):
    gameVersion = getGameVersion()
    
    if gameVersion == 0:
        // Blue color scheme
        if not ogGraphicsMode:
            drawModernHealthBar(healthWidth, blueColors)
        else:
            drawOgHealthBar(healthWidth, blueColorTable)
        return
    
    if gameVersion == 1:
        // Red-blue to green gradient scheme (poison indicator)
        if not ogGraphicsMode:
            drawModernHealthBar(healthWidth, redGreenColors)
        else:
            drawOgHealthBar(healthWidth, redGreenColorTable)
        return
    
    // gameVersion >= 2
    if colorFlag == 0:
        // Green color scheme (normal health)
        if not ogGraphicsMode:
            drawModernHealthBar(healthWidth, greenColors)
        else:
            drawOgHealthBar(healthWidth, greenColorTable)
    else:
        // Cyan/teal color scheme (special state, e.g. poison)
        if not ogGraphicsMode:
            drawModernHealthBar(healthWidth, cyanColors)
        else:
            drawOgHealthBar(healthWidth, cyanColorTable)

function drawModernHealthBar(healthWidth, colors):
    baseX = UiDrawWidth - 108
    
    DrawSetup(0x39, null)
    
    // Draw border frame
    leftEdge = UiDrawWidth - 110
    rightEdge = UiDrawWidth - 6
    
    DrawRect(leftEdge, 8, leftEdge, 16, borderColor, borderColor)   // left
    DrawRect(rightEdge, 8, rightEdge, 16, borderColor, borderColor) // right
    DrawRect(leftEdge, 8, rightEdge, 8, borderColor, borderColor)   // top
    
    // Draw bottom edge with gradient
    DrawQuad(bottomLeftX, 16, bottomRightX, 16, 
             bottomRightX, 17, bottomLeftX, 17,
             color1, color2, color3, color4, 0x80)
    
    // Draw inner background
    DrawQuad(innerLeft, 9, innerRight, 9,
             innerRight, 16, innerLeft, 16,
             bgColor, bgColor, bgColor, bgColor, 0x80)
    
    // Draw health fill (5 rows)
    if healthWidth > 0:
        // Calculate gradient colors based on health
        color1 = interpolateColor(baseColor1A, baseColor1B, healthWidth)
        color2 = interpolateColor(baseColor2A, baseColor2B, healthWidth)
        color3 = interpolateColor(baseColor3A, baseColor3B, healthWidth)
        color4 = interpolateColor(baseColor4A, baseColor4B, healthWidth)
        
        for row = 10 to 14:
            DrawRect(baseX, row, baseX + healthWidth, row,
                     rowColors[row - 10], interpolatedColors[row - 10])
```
