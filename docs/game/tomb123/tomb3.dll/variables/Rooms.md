# Variable: Rooms

## Description
Pointer to the rooms array. Each room is `ROOM_SIZE` (0xa8) bytes.

## Notes
- Use with room constants to access individual room properties
- Rooms contain entity linked lists via `ROOM_ENTITY_HEAD` (0x60)

## Details

| Field     | Value           |
|-----------|-----------------|
| Type      | `Pointer`       |

## Usage
### Calling from mod code
```javascript
const rooms = game.readVar(game.module, 'Rooms');
const count = game.readVar(game.module, 'RoomsCount');
```
