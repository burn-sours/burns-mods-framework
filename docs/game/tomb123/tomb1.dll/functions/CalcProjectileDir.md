# Function: CalcProjectileDir

## Description
Calculates the direction angles (pitch and yaw) for a projectile to aim at Lara, then adds random spread. Used by enemy projectile logic (darts, fireballs, etc.) to orient a projectile toward Lara's position with slight inaccuracy.

## Notes
- Always targets Lara — reads position directly from the `Lara` pointer using entity offsets
- Calls `GetEntityBox` on Lara to get her bounding box, then calculates a vertical target point roughly 3/4 up the box height — projectiles aim at Lara's upper body, not her feet
- Horizontal distance is computed via integer square root of the XZ distance squared
- Uses `ATAN2` to convert deltas into engine angle units for both pitch and yaw
- Pitch is stored negated (positive pitch = aiming downward in engine convention)
- Random spread is applied to both angles using the engine's LCG random number generator (`RngSeed`), giving a small ±deviation each time
- The projectile pointer refers to an entry in the `Projectiles` array — each projectile is `PROJECTILE_SIZE` bytes

## Details

| Field     | Value                          |
|-----------|--------------------------------|
| Usage     | `Hook & Call`                  |
| Params    | `pointer`                      |
| Return    | `void`                         |

### Parameters

| #   | Type      | Description                              |
|-----|-----------|------------------------------------------|
| 0   | `pointer` | Pointer to the projectile data           |

## Usage
### Hooking
```javascript
// Log when an enemy fires a projectile at Lara
mod.hook('CalcProjectileDir')
    .onEnter(function(projectilePtr) {
        log('Enemy firing projectile');
    });
```

### Calling from mod code
```javascript
// Recalculate direction for a specific projectile to aim at Lara
const projectiles = game.readVar(game.module, 'Projectiles');
const projectilePtr = projectiles.add(index * PROJECTILE_SIZE);
game.callFunction(game.module, 'CalcProjectileDir', projectilePtr);
```

## Pseudocode
```
function CalcProjectileDir(projectile):
    // Read Lara's position from entity data
    laraPtr = readVar('Lara')
    laraX = laraPtr.add(ENTITY_X).readS32()
    laraY = laraPtr.add(ENTITY_Y).readS32()
    laraZ = laraPtr.add(ENTITY_Z).readS32()

    // Calculate XZ deltas from projectile to Lara
    xDiff = laraX - projectile.x
    zDiff = laraZ - projectile.z

    // Get Lara's bounding box (6 shorts: minX, maxX, minY, maxY, minZ, maxZ)
    bounds = GetEntityBox(laraPtr)
    minY = bounds[2]
    maxY = bounds[3]

    // Calculate vertical target — roughly 3/4 up Lara's bounding box
    heightRange = (minY - maxY) * 3
    verticalTarget = (laraY - projectile.y) + (heightRange / 4) + maxY

    // Integer square root of horizontal distance
    horizontalDist = intSqrt(xDiff * xDiff + zDiff * zDiff)

    // Calculate pitch and yaw angles
    pitch = -ATAN2(horizontalDist, verticalTarget)
    yaw = ATAN2(zDiff, xDiff)

    // Write angles to projectile
    projectile.pitch = pitch
    projectile.yaw = yaw

    // Add random spread to both angles
    // (LCG: seed = seed * 0x41C64E6D + 0x3039)
    randomPitch = nextRandom() / 64
    projectile.pitch += randomPitch

    randomYaw = nextRandom() / 64
    projectile.yaw += randomYaw
```
