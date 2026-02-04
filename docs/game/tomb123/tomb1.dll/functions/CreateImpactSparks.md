# Function: CreateImpactSparks

## Description
Spawns a ring of 32 spark particles at a given world position, radiating outward from a specified yaw direction. Used for the falling sword impact effect in the Tomb of Tihocan (Damocles room) when a sword hits the floor. Only spawns sparks if the position is within range of Lara (±16384 units on X and Z axes).

## Notes
- Proximity check: skips entirely if the impact position is more than 16384 units from Lara on either the X or Z axis
- Spawns exactly 32 particles per call, each rotated incrementally (~2047 angle units apart) around the yaw
- Each particle's horizontal velocity is calculated using sine/cosine lookups from the yaw angle, scaled by a random speed factor
- Vertical velocity (Y) is randomised with a downward bias
- Uses the global RNG seed for speed and vertical randomisation

## Details

| Field     | Value                          |
|-----------|--------------------------------|
| Usage     | `Hook & Call`                  |
| Params    | `int, int, int, int`           |
| Return    | `void`                         |

### Parameters

| #   | Type  | Description                              |
|-----|-------|------------------------------------------|
| 0   | `int` | X world coordinate of impact             |
| 1   | `int` | Y world coordinate of impact             |
| 2   | `int` | Z world coordinate of impact             |
| 3   | `int` | Yaw angle of impact direction            |

## Usage
### Hooking
```javascript
mod.hook('CreateImpactSparks')
    .onEnter(function(x, y, z, yaw) {
        log('Impact sparks at:', x, y, z, 'yaw:', yaw);
    });
```

### Calling from mod code
```javascript
// Spawn sparks at a specific position facing north (yaw 0)
game.callFunction(game.module, 'CreateImpactSparks', 1000, -500, 2000, 0);
```

## Pseudocode
```
function CreateImpactSparks(x, y, z, yaw):
    // Proximity check — skip if too far from Lara
    if abs(Lara.x - x) > 16384 or abs(Lara.z - z) > 16384:
        return

    // Spawn 32 spark particles in a ring
    for i = 0 to 31:
        particle = allocateParticle()

        // Set particle colour, lifetime, type
        particle.colour = 0xa4ff01
        particle.lifetime = 167

        // Calculate horizontal velocity from yaw using trig lookups
        sinYaw = sin(yaw)
        cosYaw = cos(yaw + 0x4000)
        speed = randomRange(128, 383)

        particle.velocityX = sinYaw * speed >> 13
        particle.velocityZ = cosYaw * speed >> 13
        particle.velocityY = -(384 + random(0, 127))

        // Set position
        particle.x = x
        particle.y = y
        particle.z = z

        // Advance yaw for next particle
        yaw += 0x7ff
```
