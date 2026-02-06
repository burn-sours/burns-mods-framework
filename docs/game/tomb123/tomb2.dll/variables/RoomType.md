# Variable: RoomType

## Description
The type of room Lara is currently in.

## Notes
- Determines Lara's movement physics and animations

## Details

| Field     | Value           |
|-----------|-----------------|
| Type      | `Int16`         |

## Value Range

| Value | Description                    |
|-------|--------------------------------|
| `0`   | Land (normal)                  |
| `1`   | Underwater                     |
| `2`   | Floating at water surface      |
| `4`   | Waist deep wading in water     |

## Usage
### Calling from mod code
```javascript
const room = game.readVar(game.module, 'RoomType');

if (room === 4) {
    // Lara is wading
}
```
