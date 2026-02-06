# Function: ShootLara

## Description
Fires a gunshot from an enemy entity toward Lara. Calculates hit probability based on distance, creates a projectile, plays hit or miss effects, and applies a muzzle flash to the shooting enemy. Used by enemy AI behaviour functions for gun-wielding enemies.

Hit probability scales inversely with distance — closer enemies are more likely to hit. On a hit, a random bone on Lara is selected as the impact point and a blood/hit effect is spawned with a sound effect. On a miss, the shot scatters to a random position near Lara with a ricochet effect. A projectile is created in both cases.

## Notes
- Hit probability uses the RNG seed and is purely distance-based — no aiming accuracy factor
- Maximum effective range is approximately 0x3100000 — beyond this, the shot always misses
- On hit, a random Lara bone (0–13) is selected as the impact point
- On miss, the target position is Lara's position with random scatter applied
- A projectile entity is always created regardless of hit or miss
- Muzzle flash is applied to the enemy after the projectile is created, using the entity's model data to determine the flash variant
- A flag on the entity can modify the muzzle flash variant (incremented by 1), which is then cleared
- Impact sparks are created at a position 3/4 along the muzzle offset from the enemy's bone
- The projectile's angle is adjusted by the aimAngleOffset parameter after creation
- Sound effect 0x32 is played at Lara's position on a hit

## Details

| Field     | Value                                |
|-----------|--------------------------------------|
| Usage     | `Hook`                               |
| Params    | `pointer, int, pointer, int`         |
| Return    | `int`                                |

### Parameters

| #   | Type      | Description                                                              |
|-----|-----------|--------------------------------------------------------------------------|
| 0   | `pointer` | Enemy entity pointer (the shooter)                                       |
| 1   | `int`     | Distance to target — used for hit probability calculation                |
| 2   | `pointer` | Muzzle data — four consecutive Int32 values: x offset, y offset, z offset, bone index |
| 3   | `int`     | Aim angle offset — applied to the projectile's angle after creation      |

### Return Values

| Value | Description          |
|-------|----------------------|
| `1`   | Shot hit Lara        |
| `0`   | Shot missed          |

## Usage
### Hooking
```javascript
mod.hook('ShootLara')
    .onEnter(function(entity, dist, muzzleData, aimOffset) {
        const model = entity.add(ENTITY_MODEL).readS16();
        log('Enemy model', model, 'shooting at distance:', dist);
    })
    .onLeave(function(returnValue, entity, dist, muzzleData, aimOffset) {
        // returnValue: 1 = hit, 0 = miss
        if (returnValue) {
            log('Lara was hit!');
        }
    });
```

## Pseudocode
```
function ShootLara(entity, distToTarget, muzzleData, aimAngleOffset):
    // Calculate hit probability (distance-based)
    if distToTarget < MAX_RANGE:
        advance RngSeed
        hitChance = (MAX_RANGE - distToTarget) / scaleFactor - offset
        isHit = (RngSeed sample) < hitChance
    else:
        isHit = false

    // Get muzzle world position from enemy bone
    muzzlePos = GetBonePosition(entity, muzzleData.offsets, muzzleData.boneIndex)

    if isHit:
        // Pick random bone on Lara as impact point
        advance RngSeed
        randomBone = (RngSeed sample * 14) / MAX_SAMPLE
        targetPos = GetBonePosition(Lara, randomBone)

        // Create blood/hit effect at Lara's impact point
        createHitEffect(targetPos, Lara.speed, Lara.yaw)
        SoundEffect(0x32, Lara.position, 0)

        // Create projectile from muzzle position
        projectileId = createProjectile(muzzlePos, entity.speed, entity.yaw, entity.room)
    else:
        // Scatter target position around Lara with random offsets
        targetPos = Lara.position + randomScatter()

        // Create ricochet/miss effect
        createMissEffect(targetPos)

        // Create projectile from muzzle position
        projectileId = createProjectile(muzzlePos, entity.speed, entity.yaw, entity.room)

    if projectileId != -1:
        // Apply muzzle flash to enemy (variant based on model data + entity flag)
        modelFlags = lookupModelFlags(entity.model)
        if modelFlags has flash variant flag AND entity extra field != 0:
            applyMuzzleFlash(entity, baseFlash + 1)
            clear entity extra field
        else:
            applyMuzzleFlash(entity, baseFlash)

        // Create impact sparks at 3/4 muzzle offset position
        sparkPos = GetBonePosition(entity, muzzleData.offsets * 3/4, muzzleData.boneIndex)
        createSparks(sparkPos)

        // Adjust projectile angle
        projectile.angle += aimAngleOffset

    return isHit
```
