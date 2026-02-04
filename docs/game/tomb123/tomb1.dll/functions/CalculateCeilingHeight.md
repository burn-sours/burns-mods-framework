# Function: CalculateCeilingHeight

## Description
Calculates the ceiling height at a given world position. Takes a sector pointer (from GetSector) and X/Y/Z coordinates. Traverses ceiling portal chains to resolve the correct sector, reads the base ceiling height, applies ceiling slope adjustments, then traverses floor portals to find and process entity trigger callbacks that may further modify the height.

## Notes
- Sector pointer comes from GetSector. Each sector entry is 12 bytes
- Base ceiling height is stored as a signed byte in the sector, scaled by 256 to world units
- Ceiling portals are separate from floor portals — stored at a different offset in the sector data
- After resolving the ceiling height and slope, a second portal traversal follows floor portals to reach the sector's trigger data
- Ceiling slopes interpolate height based on the X/Z position within the 1024-unit sector grid. Gradients are packed as two signed bytes (X and Z) in one word
- A global flag controls whether steep slopes (gradient magnitude ≥ 3) are skipped entirely
- Entity triggers look up the entity's model type to call a height callback — these can modify the returned height
- Y parameter is only passed through to entity trigger callbacks, not used in the height calculation itself
- Unlike CalculateFloorHeight, this function does not set slope type or current trigger globals

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

| Value | Description                                                |
|-------|------------------------------------------------------------|
| `int` | Calculated ceiling height at the given position (world units) |

## Usage
### Hooking
```javascript
mod.hook('CalculateCeilingHeight')
    .onEnter(function(sector, x, y, z) {
        // sector: pointer to sector data from GetSector
        // x, y, z: world position
    })
    .onLeave(function(retval) {
        // retval: calculated ceiling height
    });
```

### Calling from mod code
```javascript
// Get tile data first, then calculate ceiling height
const roomId = game.alloc(2);
roomId.writeU16(currentRoomId);
const sector = game.callFunction(game.module, 'GetSector', x, y, z, roomId);
const ceilingHeight = game.callFunction(game.module, 'CalculateCeilingHeight', sector, x, y, z);
```

## Pseudocode
```
function CalculateCeilingHeight(sector, x, y, z):
    // traverse ceiling portals to resolve the correct sector
    while sector has a ceiling portal:
        follow portal to connected room
        look up new sector from X/Z position in that room

    // read base ceiling height from sector (signed byte × 256)
    height = sector.ceilingHeightByte * 256

    // process floor data for ceiling slope
    if sector has floor data:
        skip floor slope entry if present

        if ceiling slope entry:
            extract X and Z gradients (two signed bytes)

            // skip if steep slope flag is active and slope is too steep
            if steepSlopeFlag and (abs(zGrad) >= 3 or abs(xGrad) >= 3):
                skip

            // interpolate height from position within sector
            height += interpolate(z position in sector, zGrad)
            height += interpolate(x position in sector, xGrad)

    // traverse floor portals to find trigger data
    while sector has a floor portal:
        follow portal to connected room
        look up new sector from X/Z position in that room

    // process trigger entities from floor data
    if sector has floor data:
        for each entry:
            skip portal, floor slope, ceiling slope entries

            if trigger entry:
                for each entity in trigger list:
                    call entity's ceiling height callback(entity, x, y, z)
                    // callback may modify height

    return height
```
