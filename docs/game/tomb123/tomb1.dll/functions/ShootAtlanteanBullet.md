# Function: ShootAtlanteanBullet

## Description
Creates an Atlantean bullet projectile at a given world position. Allocates a projectile slot, initializes it with bullet-specific properties (model 250, sound 172, speed 3584), and calls `AimProjectileAtLara` to orient it toward Lara with random spread.

## Notes
- Allocates a projectile in the specified room — if no free projectile slot is available, does nothing
- The `speed` parameter from the signature is not used in the function body — bullet speed is hardcoded to 3584
- Sets the projectile yaw from the parameter (entity's facing direction) before `AimProjectileAtLara` recalculates both pitch and yaw toward Lara
- Projectile stride is 0x44 bytes per entry in the `Projectiles` array
- Bullet projectile uses model 250 and sound effect 172
- Slower than `ShootAtlanteanMeatball` (3584 vs 4096 speed)
- Used by `EntityMutant` (state 11, rear aim flag) — the shard/bullet variant of the Atlantean ranged attack
- Counterpart to `ShootAtlanteanMeatball` which uses a different model, sound, and speed

## Details

| Field     | Value                          |
|-----------|--------------------------------|
| Usage     | `Hook & Call`                  |
| Params    | `int, int, int, int64, uint16, int16, uint16` |
| Return    | `void`                         |

### Parameters

| #   | Type     | Description                              |
|-----|----------|------------------------------------------|
| 0   | `int`    | X world position                         |
| 1   | `int`    | Y world position                         |
| 2   | `int`    | Z world position                         |
| 3   | `int64`  | Speed (unused — bullet speed is hardcoded to 3584) |
| 4   | `uint16` | Initial yaw (entity facing direction)    |
| 5   | `int16`  | Room ID to allocate the projectile in    |
| 6   | `uint16` | Source model ID (stored on the projectile) |

## Usage
### Hooking
```javascript
// Log when a bullet projectile is fired
mod.hook('ShootAtlanteanBullet')
    .onEnter(function(x, y, z, speed, yaw, roomId, sourceModelId) {
        log('Atlantean bullet fired at:', x, y, z, 'room:', roomId);
    });
```

### Calling from mod code
```javascript
// Fire a bullet projectile from an entity's position
const entities = game.readVar(game.module, 'Entities');
const entity = entities.add(entityId * ENTITY_SIZE);
const x = entity.add(ENTITY_X).readS32();
const y = entity.add(ENTITY_Y).readS32();
const z = entity.add(ENTITY_Z).readS32();
const yaw = entity.add(ENTITY_YAW).readU16();
const room = entity.add(ENTITY_ROOM).readS16();
const model = entity.add(ENTITY_MODEL).readU16();
game.callFunction(game.module, 'ShootAtlanteanBullet', x, y, z, 0, yaw, room, model);
```

## Pseudocode
```
function ShootAtlanteanBullet(x, y, z, speed, yaw, roomId, sourceModelId):
    projectileId = allocateProjectile(roomId)

    if projectileId == -1:
        return  // no free slot

    projectile = Projectiles[projectileId]

    // Set position
    projectile.x = x
    projectile.y = y
    projectile.z = z

    // Set direction and source
    projectile.yaw = yaw
    projectile.sourceModel = sourceModelId
    projectile.room = roomId

    // Bullet-specific properties
    projectile.model = 250
    projectile.sound = 172
    projectile.speed = 3584    // hardcoded, ignores speed param
    projectile.pitch = 0

    // Aim at Lara with random spread
    AimProjectileAtLara(projectile)
```
