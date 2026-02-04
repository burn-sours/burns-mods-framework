# Function: EntityAtlanteanProjectile

## Description
Handles movement and collision for atlantean projectiles — both bullets (from `ShootAtlanteanBullet`) and meatballs (from `ShootAtlanteanMeatball`). Moves the projectile each frame using 3D trigonometric velocity from pitch, yaw, and speed. Checks floor and ceiling collision plus hit detection against Lara. Bullets deal low damage on direct hit and ricochet toward Lara on environment impact. Meatballs deal high damage with camera shake on direct hit and have splash damage on environment impact.

## Notes
- Called with the projectile's index into the projectile array, not a pointer
- Projectile struct size is 0x44 bytes, accessed at `projectilesPointer + projectileId * 0x44`
- **Movement**: 3D velocity calculated from speed, pitch, and yaw using fixed-point sine/cosine lookups (shared trig table). Updates X, Y, Z positions each frame.
- Uses `GetSector` for room transitions, `CalculateFloorHeight` and `CalculateCeilingHeight` to determine valid space
- Hit detection via `checkProjectileHitLara` with a 200-unit hit radius — only checked when projectile is between floor and ceiling
- Two projectile types distinguished by an animation identifier field:

### Bullet (animation identifier 172)
- **Direct hit on Lara**:
  - Normal: −30
  - NG+ hard: −70
  - Plays `SoundEffect` 50
  - Classic graphics: transitions to impact animation (158)
  - Remastered graphics: spawns visual effect, then `DestroyProjectile`
- **Environment impact (ricochet)**:
  - Clears speed, applies random gravity arc
  - Calculates angle toward Lara and redirects the ricochet
  - Sets a lifetime counter (6)
  - Transitions to ricochet animation (164)
  - Plays `SoundEffect` 10

### Meatball (any other animation identifier)
- **Direct hit on Lara**:
  - Normal: −100
  - NG+ hard: varies by shooter model (−150, −180, or −200)
  - Spawns 3 impact particles slightly behind the projectile (trig-offset from current direction)
  - Plays `SoundEffect` 31 at Lara's position (hit feedback) + `SoundEffect` 104 at impact
  - If Lara survives: triggers camera shake (5 frames, locked to projectile)
  - Transitions to impact animation (151), sets impact flag
- **Environment impact (splash damage)**:
  - Effective radius ~1024 units (distance² < 1,048,576)
  - Damage scales linearly with distance²: −100 at point blank, tapering to 0 at max range
  - Classic graphics: transitions to impact animation, stops movement
  - Remastered graphics: spawns 3 impact particles, then `DestroyProjectile`
  - Plays `SoundEffect` 104
  - Sets Lara's entity flags bit 4 if within splash range

### Post-Hit (both types, direct hit only)
- Sets Lara's entity flags bit 4 (hit by projectile)
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
            if projectile.animId == 172:  // bullet
                if NG+ hard:
                    Lara.health -= 70
                else:
                    Lara.health -= 30

                if remastered:
                    spawnVisualEffect(projectile)
                else:
                    projectile.animId = 158  // impact animation

                SoundEffect(50, projectile.position, 0)

                if remastered:
                    DestroyProjectile(projectileId)

            else:  // meatball
                // Calculate position slightly behind projectile using trig
                behindPos = offsetBehindProjectile(projectile)

                // Spawn 3 impact particles at behind position
                spawnParticle(behindPos, size=-2, room)
                spawnParticle(behindPos, size=-1, room)  // ×2

                if NG+ hard:
                    damage by shooter model: -150, -200, or -180
                else:
                    Lara.health -= 100

                projectile.animId = 151  // impact animation
                projectile.impactFlag = 1

                if Lara.health > 0:
                    SoundEffect(31, Lara.position, 0)
                    cameraShakeTimer = 5
                    cameraShakeSource = projectile

                SoundEffect(104, projectile.position, 0)

            // Post-hit: attach projectile direction to Lara
            set Lara flags bit 4
            projectile.yaw = Lara.yaw
            projectile.speed = Lara.xzSpeed
            projectile.gravity = 0
            return

    // === ENVIRONMENT IMPACT (floor/ceiling/wall) ===
    if projectile.animId == 172:  // bullet — ricochet
        projectile.speed = 0
        projectile.lifetime = 6
        projectile.animId = 164  // ricochet animation
        projectile.gravity = randomArc

        SoundEffect(10, projectile.position, 0)

        // Redirect ricochet toward Lara
        angleToLara = atan2XZ(projectile.pos, Lara.pos)
        applyRicochetDirection(projectile, angleToLara)

    else:  // meatball — splash damage
        if classic graphics:
            projectile.animId = 151  // impact animation
            projectile.speed = 0
            projectile.gravity = 0
            projectile.impactFlag = 1
        else:
            // Spawn 3 impact particles behind projectile
            behindPos = offsetBehindProjectile(projectile)
            spawnParticle(behindPos, size=-2, room)
            spawnParticle(behindPos, size=-1, room)  // ×2

        SoundEffect(104, projectile.position, 0)

        if remastered:
            DestroyProjectile(projectileId)

        // Distance-based splash damage
        distSq = distanceSquared(projectile.pos, Lara.pos)
        if distSq < 1048576:  // ~1024 unit radius
            // Linear falloff: -100 at point blank → 0 at max range
            damage = (distSq - 1048576) * 100 >> 20
            Lara.health += damage
            set Lara flags bit 4
```
