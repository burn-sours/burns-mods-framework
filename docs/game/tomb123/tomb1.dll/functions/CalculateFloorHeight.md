# Function: CalculateFloorHeight

## Description
Calculates the floor height at a given world position. Takes a sector pointer (from GetTileData) and X/Y/Z coordinates. Traverses floor portal chains to find the correct sector, reads the base floor height, applies slope adjustments, and processes trigger entities that may modify the height.

Also sets global side-effect variables: `slopeType` (0 = flat, 1 = gentle slope, 2 = steep slope) and `currentTrigger` (pointer to the first trigger entry in the floor data, if any).

## Notes
- Param 0 (sector) comes from GetTileData. Sector data is 0xc (12) bytes per entry
- Floor height is read from sector byte offset 9 as a signed byte, scaled by 256 (× 0x100) to world units
- Floor portal room ID is at sector byte offset 8 — traversed until 0xFF (no more portals)
- Floor slope (floor data type 2) interpolates height based on X/Z position within the 1024-unit sector grid (`& 0x3ff`). Slope gradients are packed in one word: low byte = X gradient (signed), high byte = Z gradient (signed)
- A global flag (`DAT_1800fd690`) controls whether steep slopes are skipped — when set, slopes with either gradient abs ≥ 3 are ignored
- `slopeType` is set to 1 when both gradients have abs < 3 (gentle), or 2 when either gradient has abs ≥ 3 (steep)
- Trigger entities (floor data type 4) look up the entity's model type to call a callback function via a function pointer table — these callbacks can further modify the floor height
- Type 5 floor data entries are tracked as kill triggers via `currentTrigger`
- Y parameter is only passed through to entity trigger callbacks — not used directly in the height calculation

## Details

| Field     | Value                          |
|-----------|--------------------------------|
| Usage     | `Hook & Call`                  |
| Params    | `pointer, int, int, int`       |
| Return    | `int`                          |

### Parameters

| #   | Type      | Description                                              |
|-----|-----------|----------------------------------------------------------|
| 0   | `pointer` | Sector data pointer (from GetTileData)                   |
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
        // sector: pointer to sector data from GetTileData
        // x, y, z: world position
    })
    .onLeave(function(retval) {
        // retval: calculated floor height
    });
```

### Calling from mod code
```javascript
// Get tile data first, then calculate floor height
const roomId = game.alloc(2);
roomId.writeU16(currentRoomId);
const sector = game.callFunction(game.module, 'GetTileData', x, y, z, roomId);
const floorHeight = game.callFunction(game.module, 'CalculateFloorHeight', sector, x, y, z);
```

## Pseudocode
```
function CalculateFloorHeight(sector, x, y, z):
    // traverse floor portals to find correct sector
    portalRoomId = sector[FLOOR_PORTAL]  // byte offset 8
    slopeType = 0

    while portalRoomId != 0xFF:
        room = Rooms + portalRoomId * ROOM_SIZE
        sectorIndex = ((z - room.zOrigin) >> 10) + ((x - room.xOrigin) >> 10) * room.zLength
        sector = room.sectorData + sectorIndex * 12
        portalRoomId = sector[FLOOR_PORTAL]

    // read base floor height (signed byte at offset 9, scaled to world units)
    height = sector[FLOOR_HEIGHT_BYTE] * 256
    currentTrigger = null

    // process floor data entries
    if sector.floorDataIndex != 0:
        entry = floorData + sector.floorDataIndex * 2

        for each floor data entry:
            type = entry & 0xFF

            case type 1 (portal):
                skip (advance 2 words)

            case type 2 (floor slope):
                xGradient = entry.data low byte (signed)
                zGradient = entry.data high byte (signed)

                // check if steep slopes should be skipped
                if steepSlopeFlag set and (abs(zGradient) >= 3 or abs(xGradient) >= 3):
                    skip slope adjustment

                // classify slope steepness
                if abs(zGradient) < 3 and abs(xGradient) < 3:
                    slopeType = 1  // gentle
                else:
                    slopeType = 2  // steep

                // interpolate height based on position within sector
                zAdjust = interpolate(z & 0x3FF, zGradient)
                xAdjust = interpolate(x & 0x3FF, xGradient)
                height = height + zAdjust + xAdjust
                skip (advance 2 words)

            case type 3 (ceiling slope):
                skip (advance 2 words)

            case type 4 (trigger):
                if first trigger: store currentTrigger
                for each trigger entry:
                    if entity trigger (mask 0x3C00 == 0):
                        entity = Entities + (entry & 0x3FF) * ENTITY_SIZE
                        call entity's height callback(entity, x, y, z)
                        // callback may modify height

            case type 5 (kill trigger):
                store as currentTrigger

    return height
```
