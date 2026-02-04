# Function: CalculateCeilingHeight

## Description
Calculates the ceiling height at a given world position. Takes a sector pointer (from GetTileData) and X/Y/Z coordinates. Traverses ceiling portal chains to find the correct sector, reads the base ceiling height, applies ceiling slope adjustments, then traverses floor portals to process trigger entities that may modify the height.

## Notes
- Param 0 (sector) comes from GetTileData. Sector data is 0xc (12) bytes per entry
- Ceiling height is read from sector byte offset 11 (0xb) as a signed byte, scaled by 256 (× 0x100) to world units
- Ceiling portal room ID is at sector byte offset 10 — traversed until 0xFF (no more portals)
- After ceiling portal traversal and slope processing, a second traversal follows floor portals (byte offset 8) to find the sector's trigger data
- Ceiling slope (floor data type 3) interpolates height based on X/Z position within the 1024-unit sector grid (`& 0x3ff`). Slope gradients are packed in one word: low byte = X gradient (signed), high byte = Z gradient (signed)
- A global flag (`DAT_1800fd690`) controls whether steep slopes are skipped — when set and either gradient has abs ≥ 3, the slope adjustment is skipped entirely
- Trigger entities (floor data type 4) look up the entity's model type to call a callback function via a function pointer table — these callbacks can further modify the ceiling height
- Y parameter is only passed through to entity trigger callbacks — not used directly in the height calculation
- Unlike CalculateFloorHeight, this function does not set `slopeType` or `currentTrigger` globals

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

| Value | Description                                                |
|-------|------------------------------------------------------------|
| `int` | Calculated ceiling height at the given position (world units) |

## Usage
### Hooking
```javascript
mod.hook('CalculateCeilingHeight')
    .onEnter(function(sector, x, y, z) {
        // sector: pointer to sector data from GetTileData
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
const sector = game.callFunction(game.module, 'GetTileData', x, y, z, roomId);
const ceilingHeight = game.callFunction(game.module, 'CalculateCeilingHeight', sector, x, y, z);
```

## Pseudocode
```
function CalculateCeilingHeight(sector, x, y, z):
    // traverse ceiling portals to find correct sector
    portalRoomId = sector[CEILING_PORTAL]  // byte offset 10
    while portalRoomId != 0xFF:
        room = Rooms + portalRoomId * ROOM_SIZE
        sectorIndex = ((z - room.zOrigin) >> 10) + ((x - room.xOrigin) >> 10) * room.zLength
        sector = room.sectorData + sectorIndex * 12
        portalRoomId = sector[CEILING_PORTAL]  // byte offset 10

    // read base ceiling height (signed byte at offset 11, scaled to world units)
    height = sector[CEILING_HEIGHT_BYTE] * 256

    // process floor data for ceiling slope
    if sector.floorDataIndex != 0:
        entry = floorData + sector.floorDataIndex * 2
        type = entry & 0xFF

        // skip floor slope entry (type 2) if present
        if type == 2:
            advance past floor slope data
            type = next entry type
            if end marker set: skip to trigger processing

        if type == 3 (ceiling slope):
            xGradient = entry.data low byte (signed)
            zGradient = entry.data high byte (signed)

            // check if steep slopes should be skipped
            if steepSlopeFlag set and (abs(zGradient) >= 3 or abs(xGradient) >= 3):
                skip slope adjustment

            // interpolate height based on position within sector
            zAdjust = interpolate(z & 0x3FF, zGradient)
            xAdjust = interpolate(x & 0x3FF, xGradient)
            height = height + zAdjust + xAdjust

    // traverse floor portals to find trigger data
    portalRoomId = sector[FLOOR_PORTAL]  // byte offset 8
    while portalRoomId != 0xFF:
        room = Rooms + portalRoomId * ROOM_SIZE
        sectorIndex = ((z - room.zOrigin) >> 10) + ((x - room.xOrigin) >> 10) * room.zLength
        sector = room.sectorData + sectorIndex * 12
        portalRoomId = sector[FLOOR_PORTAL]

    // process trigger entities from floor data
    if sector.floorDataIndex != 0:
        for each floor data entry:
            type = entry & 0xFF

            case type 1, 2, 3:
                skip (advance 2 words)

            case type 4 (trigger):
                for each trigger entry:
                    if entity trigger (mask 0x3C00 == 0):
                        entity = Entities + (entry & 0x3FF) * ENTITY_SIZE
                        call entity's ceiling callback(entity, x, y, z)
                        // callback may modify height

    return height
```
