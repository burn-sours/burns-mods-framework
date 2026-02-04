# Function: CalculateFloorHeight

## Description
Calculates the floor height at a given world position. Takes a sector pointer (from GetSector) and X/Y/Z coordinates. Traverses floor portal chains to resolve the correct sector, reads the base floor height from the sector data, applies floor slope adjustments based on position within the sector, and processes entity trigger callbacks that may further modify the height.

Also sets two global side-effect variables: a slope type flag (0 = flat, 1 = gentle slope, 2 = steep slope) and a current trigger pointer (the first trigger entry found in the floor data, if any).

## Notes
- Sector pointer comes from GetSector. Each sector entry is 12 bytes
- Base floor height is stored as a signed byte in the sector, scaled by 256 to world units
- Portal traversal walks through connected rooms until no further portal exists
- Floor slopes interpolate height based on the X/Z position within the 1024-unit sector grid. Gradients are packed as two signed bytes (X and Z) in one word
- A global flag controls whether steep slopes (gradient magnitude ≥ 3) are skipped
- Slope type is classified as gentle (both gradients abs < 3) or steep (either ≥ 3)
- Entity triggers look up the entity's model type to call a height callback — these can modify the returned height
- Y parameter is only passed through to entity trigger callbacks, not used in the height calculation itself

## Details

| Field     | Value                          |
|-----------|--------------------------------|
| Usage     | `Hook & Call`                  |
| Params    | `pointer, int, int, int`       |
| Return    | `int`                          |

### Parameters

| #   | Type      | Description                                              |
|-----|-----------|----------------------------------------------------------|
| 0   | `pointer` | Sector data pointer (from GetSector)                     |
| 1   | `int`     | X world position                                         |
| 2   | `int`     | Y world position (vertical, passed to trigger callbacks) |
| 3   | `int`     | Z world position                                         |

### Return Values

| Value | Description                                              |
|-------|----------------------------------------------------------|
| `int` | Calculated floor height at the given position (world units) |

## Usage
### Hooking
```javascript
mod.hook('CalculateFloorHeight')
    .onEnter(function(sector, x, y, z) {
        // sector: pointer to sector data from GetSector
        // x, y, z: world position
    })
    .onLeave(function(returnValue, sector, x, y, z) {
        // returnValue: calculated floor height
        // sector, x, y, z: same args from onEnter (captured automatically)
    });
```

### Calling from mod code
```javascript
// Get tile data first, then calculate floor height
const roomId = game.alloc(2);
roomId.writeU16(currentRoomId);
const sector = game.callFunction(game.module, 'GetSector', x, y, z, roomId);
const floorHeight = game.callFunction(game.module, 'CalculateFloorHeight', sector, x, y, z);
```

## Pseudocode
```
function CalculateFloorHeight(sector, x, y, z):
    // traverse floor portals to resolve the correct sector
    slopeType = 0
    while sector has a floor portal:
        follow portal to connected room
        look up new sector from X/Z position in that room

    // read base floor height from sector (signed byte × 256)
    height = sector.floorHeightByte * 256
    currentTrigger = null

    // process floor data entries
    if sector has floor data:
        for each entry:
            if portal entry:
                skip

            if floor slope entry:
                extract X and Z gradients (two signed bytes)

                // skip if steep slope flag is active and slope is too steep
                if steepSlopeFlag and (abs(zGrad) >= 3 or abs(xGrad) >= 3):
                    skip

                // classify slope
                if both gradients abs < 3:
                    slopeType = 1  // gentle
                else:
                    slopeType = 2  // steep

                // interpolate height from position within sector
                height += interpolate(z position in sector, zGrad)
                height += interpolate(x position in sector, xGrad)

            if ceiling slope entry:
                skip

            if trigger entry:
                if first trigger found: store as currentTrigger
                for each entity in trigger list:
                    call entity's floor height callback(entity, x, y, z)
                    // callback may modify height

            if kill trigger entry:
                store as currentTrigger

    return height
```
