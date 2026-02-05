# Function: UpdateLighting

## Description
Calculates lighting for a given world position within a room. Iterates through the room's light sources, computes distance-based attenuation, and determines the brightest light affecting the position. Outputs an ambient light level and directional lighting factor.

This function has different code paths depending on the game version and graphics mode. In OG graphics mode, it delegates to a specialized handler. Otherwise, each game version (TR1/TR2/TR3) has its own lighting implementation.

## Notes
- **TR3-only**: This function does not exist in tomb1.dll or tomb2.dll
- OG graphics mode (bit 0 of `Tomb123 + 0x7E4`) uses a separate lighting path
- Each game version has its own lighting handler called internally
- Room light data is accessed via `Rooms` pointer at room offset `0x18`
- Light count stored at room offset `0x46`, ambient at `0x40`
- Each light structure is 36 bytes (9 int32s): position (x, y, z), intensity, falloff, plus additional data
- Distance attenuation uses squared distance formula with falloff factor
- Results stored to global lighting state variables

## Details

| Field     | Value                           |
|-----------|---------------------------------|
| Usage     | `Hook`                          |
| Params    | `int, int, int, int, pointer`   |
| Return    | `void`                          |

### Parameters

| #   | Type      | Description                           |
|-----|-----------|---------------------------------------|
| 0   | `int`     | X world position                      |
| 1   | `int`     | Y world position                      |
| 2   | `int`     | Z world position                      |
| 3   | `int`     | Room index (cast from ushort)         |
| 4   | `pointer` | Context pointer (usage varies by path)|

## Usage
### Hooking
```javascript
mod.hook('UpdateLighting')
    .onEnter(function(x, y, z, roomIndex, context) {
        // Called before lighting calculation
        console.log('Calculating light at:', x, y, z, 'room:', roomIndex);
    });
```

```javascript
mod.hook('UpdateLighting')
    .onLeave(function(returnValue, x, y, z, roomIndex, context) {
        // Lighting calculation complete
    });
```

## Pseudocode
```
function UpdateLighting(x, y, z, roomIndex, context):
    // OG graphics mode uses different path
    if Tomb123[0x7E4] & 1:
        callOgLightingHandler(x, y, z, roomIndex, context)
        return

    gameVersion = getGameVersion()
    
    if gameVersion != 0:  // Not TR1
        if gameVersion != 1:  // TR3
            callTR3LightingHandler(x, y, z, roomIndex, context)
        else:  // TR2
            callTR2LightingHandler(x, y, z, roomIndex, context)
        return

    // TR1 lighting calculation
    room = Rooms + roomIndex * ROOM_SIZE
    lightCount = room[0x46]  // short
    ambientLight = room[0x40]  // short
    
    directionalFactor = 0
    bestBrightness = 0
    bestDirX = 0
    bestDirY = 1
    bestDirZ = 0
    
    baseAmbient = 0x1FFF - ambientLight
    
    if lightCount != 0:
        lights = room[0x18]  // pointer to light array
        
        for i in 0..lightCount:
            light = lights + i * 36  // 9 ints per light
            
            // Calculate direction to light
            dirX = x - light[0]
            dirY = y - light[1]
            dirZ = z - light[2]
            
            // Get light properties
            intensity = light[3]  // short
            falloff = light[4]
            
            // Distance-based attenuation
            distSquared = (dirX*dirX + dirY*dirY + dirZ*dirZ) >> 12
            falloffSquared = (falloff * falloff) >> 12
            
            brightness = (intensity * falloffSquared) / (distSquared + falloffSquared)
            brightness = brightness + baseAmbient
            
            if brightness > bestBrightness:
                bestBrightness = brightness
                bestDirX = dirX
                bestDirY = dirY
                bestDirZ = dirZ
        
        // Calculate final values
        midpoint = (bestBrightness + baseAmbient) / 2
        
        if bestBrightness != baseAmbient:
            directionalFactor = 0x4000000 / (bestBrightness - midpoint)
        
        // Normalize direction vector
        normalizeDirection(bestDirX, bestDirY, bestDirZ)
        
        finalAmbient = 0x1FFF - midpoint
    else:
        finalAmbient = baseAmbient
    
    // Store results to globals
    globalDirectionalFactor = directionalFactor
    globalAmbientLevel = finalAmbient
```
