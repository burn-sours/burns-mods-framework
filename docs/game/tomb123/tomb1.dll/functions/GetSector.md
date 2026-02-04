# Function: GetSector

## Description
Resolves which sector a 3D world position belongs to. Takes X/Y/Z coordinates and a room ID pointer, then finds the correct sector by following portal chains — first horizontally through floor data portal entries, then vertically through floor or ceiling portals depending on whether the position is above or below the sector's height boundaries. Updates the room ID pointer to the resolved room.

## Notes
- The room ID pointer (param 3) is read-write — updated to the final resolved room on return
- Each sector entry is 12 bytes. Sector index is computed from X/Z position relative to the room's origin, clamped to room boundaries
- Horizontal portal resolution reads floor data entries looking for portal types that redirect to adjacent rooms
- Vertical resolution: if Y is below the floor height, follows floor portals downward; if Y is above the ceiling height, follows ceiling portals upward

## Details

| Field     | Value                              |
|-----------|------------------------------------|
| Usage     | `Hook & Call`                      |
| Params    | `int, int, int, pointer`           |
| Return    | `pointer`                          |

### Parameters

| #   | Type      | Description                                                    |
|-----|-----------|----------------------------------------------------------------|
| 0   | `int`     | X world position                                               |
| 1   | `int`     | Y world position (vertical)                                    |
| 2   | `int`     | Z world position                                               |
| 3   | `pointer` | Room ID as UInt16 (read-write, updated to resolved room)       |

### Return Values

| Value     | Description                              |
|-----------|------------------------------------------|
| `pointer` | Pointer to the resolved sector data      |

## Usage
### Hooking
```javascript
mod.hook('GetSector')
    .onEnter(function(x, y, z, roomPtr) {
        // x, y, z: world position
        // roomPtr: pointer to UInt16 room ID (will be updated)
    })
    .onLeave(function(returnValue) {
        // returnValue: pointer to resolved sector data
    });
```

### Calling from mod code
```javascript
// Resolve sector and room for a world position
const roomId = game.alloc(2);
roomId.writeU16(currentRoomId);
const sector = game.callFunction(game.module, 'GetSector', x, y, z, roomId);
const resolvedRoom = roomId.readU16();

// Use sector with CalculateFloorHeight / CalculateCeilingHeight
const floorH = game.callFunction(game.module, 'CalculateFloorHeight', sector, x, y, z);
const ceilH = game.callFunction(game.module, 'CalculateCeilingHeight', sector, x, y, z);
```

## Pseudocode
```
function GetSector(x, y, z, roomPtr):
    roomId = *roomPtr

    // resolve sector within room, following horizontal portals
    while true:
        room = Rooms + roomId * ROOM_SIZE
        clamp X/Z indices to room boundaries
        sectorIndex = xIndex * room.zLength + zIndex
        sector = room.sectorData + sectorIndex * 12

        // check floor data for horizontal portal entry
        if sector has no floor data: break
        walk floor data entries, skipping slopes
        if portal entry found (type 1):
            roomId = portal destination room
            *roomPtr = roomId
        else:
            break

    // resolve vertically based on Y position
    if y < sector.floorHeight:
        // below floor — follow floor portals downward
        while sector has a floor portal and y < floor height:
            roomId = floor portal room
            *roomPtr = roomId
            look up sector in new room from X/Z
    else:
        // above ceiling — follow ceiling portals upward
        while sector has a ceiling portal and y >= ceiling height:
            roomId = ceiling portal room
            *roomPtr = roomId
            look up sector in new room from X/Z

    return sector
```
