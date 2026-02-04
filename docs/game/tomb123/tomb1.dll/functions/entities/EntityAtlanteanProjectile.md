# Function: EntityAtlanteanProjectile

## Description
Handles movement and collision for atlantean projectiles — both bullets (from `ShootAtlanteanBullet`) and meatballs (from `ShootAtlanteanMeatball`). Moves the projectile each frame using 3D trigonometric velocity from pitch, yaw, and speed. Checks floor and ceiling collision plus hit detection against Lara. Bullets deal low damage on direct hit and ricochet toward Lara on environment impact. Meatballs deal high damage with camera shake on direct hit and have splash damage on environment impact.

## Notes
- Called with the projectile's index into the projectile array, not a pointer
- **Movement**: 3D velocity calculated from speed, pitch, and yaw using fixed-point sine/cosine lookups. Updates X, Y, Z positions each frame.
- Uses `GetSector` for room transitions, `CalculateFloorHeight` and `CalculateCeilingHeight` to determine valid space
- Hit detection against Lara with a 200-unit radius — only checked when projectile is between floor and ceiling
- Two projectile types determined by which creation function was used:

### Bullet (created by `ShootAtlanteanBullet`)
- **Direct hit on Lara**:
  - Plays `SoundEffect` 50
  - Classic graphics: transitions to impact state
  - Remastered graphics: spawns visual effect, then `DestroyProjectile`
- **Environment impact (ricochet)**:
  - Clears speed, applies random gravity arc
  - Calculates angle toward Lara and redirects the ricochet
  - Plays `SoundEffect` 10

### Meatball (created by `ShootAtlanteanMeatball`)
- **Direct hit on Lara**:
  - Spawns 3 impact particles slightly behind the projectile (calculated from current direction)
  - Plays `SoundEffect` 31 at Lara's position (hit feedback) + `SoundEffect` 104 at impact
  - If Lara survives: triggers camera shake (5 frames, locked to projectile)
  - Transitions to impact state, sets impact flag
- **Environment impact (splash damage)**:
  - Effective radius ~1024 units
  - Damage scales linearly with squared distance: max at point blank, tapering to 0 at max range
  - Spawns 3 impact particles behind the projectile (remastered only)
  - Plays `SoundEffect` 104
  - Remastered: `DestroyProjectile` after spawning particles
  - Sets Lara's `ENTITY_STATUS` bit 4 if within splash range

### Post-Hit (both types, direct hit only)
- Sets Lara's `ENTITY_STATUS` bit 4 (hit by projectile)
- Copies Lara's yaw and movement speed to the projectile
- Clears projectile gravity

### Damage

| Attack              | Normal | NG+ Hard                              |
|---------------------|--------|---------------------------------------|
| Bullet (direct)     | −30    | −70                                   |
| Meatball (direct)   | −100   | −150, −180, or −200 (by shooter model)|
| Meatball (splash)   | 0 to −100 (distance-based) | same as normal          |

## Details

| Field     | Value                          |
|-----------|--------------------------------|
| Usage     | `Hook & Call`                  |
| Params    | `int`                          |
| Return    | `void`                         |

### Parameters

| #   | Type  | Description                            |
|-----|-------|----------------------------------------|
| 0   | `int` | Projectile index in the projectile array |

## Usage
### Hooking
```javascript
// Monitor projectile damage to Lara
mod.hook('EntityAtlanteanProjectile')
    .onEnter(function(projectileId) {
        const laraPtr = game.readVar(game.module, 'Lara');
        this._hp = laraPtr.add(ENTITY_HEALTH).readS16();
    })
    .onLeave(function(returnValue, projectileId) {
        const laraPtr = game.readVar(game.module, 'Lara');
        const newHp = laraPtr.add(ENTITY_HEALTH).readS16();
        if (newHp < this._hp) {
            log('Projectile', projectileId, 'hit for', this._hp - newHp, 'damage');
        }
    });
```

### Calling from mod code
```javascript
game.callFunction(game.module, 'EntityAtlanteanProjectile', projectileIndex);
```

## Pseudocode
```
function EntityAtlanteanProjectile(projectileId):
    projectile = projectiles[projectileId]

    // === 3D MOVEMENT ===
    // Calculate velocity from pitch, yaw, and speed using trig lookups
    yDelta = sin(-pitch) * speed >> 14
    horizontalSpeed = cos(-pitch) * speed >> 14
    zDelta = cos(yaw) * horizontalSpeed >> 14
    xDelta = sin(yaw) * horizontalSpeed >> 14

    projectile.y += yDelta
    projectile.z += zDelta
    projectile.x += xDelta

    // === COLLISION DETECTION ===
    sector = GetSector(projectile.x, projectile.y, projectile.z, &roomOut)
    floorY = CalculateFloorHeight(sector, projectile.x, projectile.y, projectile.z)

    if projectile.y < floorY:
        // Above floor — check ceiling
        ceilingY = CalculateCeilingHeight(sector, projectile.x, projectile.y, projectile.z)

        if ceilingY < projectile.y:
            // In valid space (between floor and ceiling)

            // Room transition
            if roomOut != projectile.room:
                changeProjectileRoom(projectileId, roomOut)

            // Hit check against Lara (200 unit radius)
            hit = checkProjectileHitLara(projectile, 200)
            if not hit:
                return  // projectile continues flying

            // === DIRECT HIT ON LARA ===
            if projectile is bullet type:
                if NG+ hard:
                    Lara.health -= 70
                else:
                    Lara.health -= 30

                if remastered:
                    spawnVisualEffect(projectile)
                    DestroyProjectile(projectileId)
                else:
                    transition to impact state

                SoundEffect(50, projectile.position, 0)

            else:  // meatball type
                // Spawn 3 impact particles behind projectile
                behindPos = calculatePositionBehind(projectile)
                spawnParticle(behindPos, room)  // 1 large + 2 small

                if NG+ hard:
                    damage varies by shooter model: -150, -200, or -180
                else:
                    Lara.health -= 100

                transition to impact state
                set impact flag

                if Lara.health > 0:
                    SoundEffect(31, Lara.position, 0)
                    cameraShakeTimer = 5
                    cameraShakeSource = projectile

                SoundEffect(104, projectile.position, 0)

            // Post-hit: attach projectile to Lara's direction
            set Lara ENTITY_STATUS bit 4
            projectile.yaw = Lara.yaw
            projectile.speed = Lara.xzSpeed
            projectile.gravity = 0
            return

    // === ENVIRONMENT IMPACT (floor/ceiling/wall) ===
    if projectile is bullet type:
        // Ricochet toward Lara
        projectile.speed = 0
        apply random gravity arc
        transition to ricochet state

        SoundEffect(10, projectile.position, 0)

        angleToLara = calculateAngleToLara(projectile, Lara)
        applyRicochetDirection(projectile, angleToLara)

    else:  // meatball type
        if remastered:
            // Spawn 3 impact particles behind projectile
            behindPos = calculatePositionBehind(projectile)
            spawnParticle(behindPos, room)  // 1 large + 2 small
        else:
            transition to impact state
            stop movement

        SoundEffect(104, projectile.position, 0)

        if remastered:
            DestroyProjectile(projectileId)

        // Splash damage — distance-based
        distSq = distanceSquared(projectile.position, Lara.position)
        if distSq < 1048576:  // ~1024 unit radius
            // Scales from -100 at point blank to 0 at max range
            damage = (distSq - 1048576) * 100 >> 20
            Lara.health += damage
            set Lara ENTITY_STATUS bit 4
```
