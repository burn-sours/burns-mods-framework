# Function: CreateBloodSplatter

## Description
Creates a blood splatter projectile at a given position traveling in a specified direction. In demo mode, creates visual-only particle effects instead of an actual projectile — with different particle types for water and dry rooms.

## Notes
- In normal gameplay: allocates a projectile entry, sets position/yaw/speed (158), and returns the projectile index
- In demo mode + water room (room flag bit 0): searches a particle pool (up to 512 entries) for a free slot and creates a blood particle with random size/colour properties and small random offsets near the position
- In demo mode + dry room: creates a different visual effect using scaled yaw and random parameters
- Returns the projectile index on success, or -1 (0xFFFF) if in demo mode or allocation fails
- Called by `EntitySwingBlade` to spawn blood when hitting Lara

## Details

| Field     | Value                          |
|-----------|--------------------------------|
| Usage     | `Hook & Call`                  |
| Params    | `int, int, int, uint16, int16, int16` |
| Return    | `int`                          |

### Parameters

| #   | Type     | Description                                |
|-----|----------|--------------------------------------------|
| 0   | `int`    | X position                                 |
| 1   | `int`    | Y position                                 |
| 2   | `int`    | Z position                                 |
| 3   | `uint16` | Fall speed / velocity value                |
| 4   | `int16`  | Yaw / direction angle                      |
| 5   | `int16`  | Room ID for projectile allocation          |

### Return Values

| Value    | Description                              |
|----------|------------------------------------------|
| `0+`     | Allocated projectile index               |
| `-1`     | Demo mode (visual only) or allocation failed |

## Usage
### Hooking
```javascript
// Log every blood splatter creation
mod.hook('CreateBloodSplatter')
    .onEnter(function(x, y, z, fallSpeed, yaw, room) {
        log('Blood splatter at', x, y, z, 'room', room);
    });
```

### Calling from mod code
```javascript
const projectileId = game.callFunction(game.module, 'CreateBloodSplatter',
    x, y, z, fallSpeed, yaw, roomId);
```

## Pseudocode
```
function CreateBloodSplatter(x, y, z, fallSpeed, yaw, room):
    if not demo mode:
        // Allocate real projectile
        projectile = allocateProjectile(room)
        if projectile == -1: return -1

        projectile.x = x
        projectile.y = y
        projectile.z = z
        projectile.yaw = yaw
        projectile.velocity = fallSpeed
        projectile.speed = 158
        return projectile index

    // Demo mode — visual only
    if room has water flag:
        // Blood particle in water
        find free slot in particle pool (max 512)
        if found:
            set particle properties (random size, colour)
            particle.x = x + random offset (±32)
            particle.y = y + 64
            particle.z = z + random offset (±32)
        return -1

    else:
        // Blood effect on dry surface
        create visual effect at position with scaled yaw and random params
        return -1
```
