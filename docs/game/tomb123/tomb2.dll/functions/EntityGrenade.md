# Function: EntityGrenade

## Description
Processes grenade projectile entity behavior. Handles movement using velocity and angle-based trigonometry, floor/ceiling collision detection, entity collision with damage application, and explosion effects on impact.

## Notes
- Called each tick for active grenade entities
- Grenade has a fuse timer that decrements each tick
- When timer drops below 190, animation frame advances (grenade spinning)
- Movement uses yaw and pitch angles with sine/cosine lookups for 3D trajectory
- On collision (floor, ceiling, or entity): creates explosion effects, plays sound, removes grenade
- Deals 30 damage to hit entities
- Model 72 (0x48) has special handling — possibly explosive barrels
- Level 20 has special flag tracking on model 72 hits
- Skips Lara when checking entity collisions
- Only damages entities with shootable flag (bit 5) set

## Details

| Field     | Value           |
|-----------|-----------------|
| Usage     | `Hook`          |
| Params    | `int16`         |
| Return    | `void`          |

### Parameters

| #   | Type    | Description                    |
|-----|---------|--------------------------------|
| 0   | `int16` | Entity ID of the grenade       |

## Usage
### Hooking
```javascript
mod.hook('EntityGrenade')
    .onEnter(function(entityId) {
        // entityId is the grenade's entity slot
    });
```

```javascript
mod.hook('EntityGrenade')
    .onLeave(function(returnValue, entityId) {
        // Grenade tick processing complete
    });
```

## Pseudocode
```
function EntityGrenade(entityId):
    entity = Entities + entityId * ENTITY_SIZE
    
    // Read current state
    fuseTimer = entity.timer
    prevY = entity.y
    prevX = entity.x
    prevZ = entity.z
    animFrame = entity.frame
    
    // Decrement fuse timer
    fuseTimer--
    entity.timer = fuseTimer
    
    // Advance animation when timer below threshold
    if fuseTimer < 190:
        animFrame++
        entity.frame = animFrame
    
    // Calculate velocity from angles using trig lookups
    yaw = entity.yaw
    pitch = entity.pitch
    
    // Apply gravity component to Y velocity
    yVelocity = animFrame - (sin(yaw) * fuseTimer >> 14)
    entity.y = yVelocity + prevY
    
    // Calculate XZ velocity from yaw and pitch
    horizontalSpeed = cos(yaw) * fuseTimer >> 14
    xVelocity = cos(pitch) * horizontalSpeed >> 14
    zVelocity = sin(pitch) * horizontalSpeed >> 14
    
    entity.x = xVelocity + prevX
    entity.z = zVelocity + prevZ
    
    // Get sector and floor height at new position
    sector = GetSector(entity.x, entity.y, entity.z, &roomId)
    entity.prevFloor = entity.floor
    entity.floor = CalculateFloorHeight(sector, entity.x, entity.y, entity.z)
    
    // Handle room change
    if entity.room != roomId:
        changeRoom(entityId, roomId)
    
    // Check floor/ceiling collision
    collisionRadius = 0
    hasCollision = false
    
    if entity.floor <= entity.y:
        hasCollision = true
        collisionRadius = 0x200
    else:
        ceiling = CalculateCeilingHeight(sector, entity.x, entity.y, entity.z)
        if entity.y <= ceiling:
            hasCollision = true
            collisionRadius = 0x200
    
    // Iterate through entities in room's linked list
    targetId = room.entityList
    while targetId != -1:
        target = Entities + targetId * ENTITY_SIZE
        
        // Skip Lara
        if target == Lara:
            continue
        
        // Check if entity is shootable (flag bit 5)
        if (target.flags & 0x20) == 0:
            continue
        
        // Check if valid target model
        targetModel = target.model
        isExplosiveBarrel = (targetModel == 72)
        isShootableEnemy = hasShootableFlag(targetModel) and 
                          (target.flags & 6) != 6 and
                          hasHealth(targetModel)
        
        if not isExplosiveBarrel and not isShootableEnemy:
            continue
        
        // Get target bounding box
        targetBox = GetEntityBox(target)
        
        // Check Y bounds (with collision radius)
        if entity.y + collisionRadius < targetBox.minY + target.y:
            continue
        if entity.y - collisionRadius > targetBox.maxY + target.y:
            continue
        
        // Transform grenade position to target's local space
        // Rotate by target's pitch angle
        localX = (entity.x - target.x) * cos(pitch) - (entity.z - target.z) * sin(pitch) >> 14
        localZ = (entity.x - target.x) * sin(pitch) + (entity.z - target.z) * cos(pitch) >> 14
        
        // Also transform previous position for sweep test
        prevLocalX = (prevX - target.x) * cos(pitch) - (prevZ - target.z) * sin(pitch) >> 14
        prevLocalZ = (prevX - target.x) * sin(pitch) + (prevZ - target.z) * cos(pitch) >> 14
        
        // Check X bounds
        if localX + collisionRadius < targetBox.minX and prevLocalX + collisionRadius < targetBox.minX:
            continue
        if localX - collisionRadius > targetBox.maxX and prevLocalX - collisionRadius > targetBox.maxX:
            continue
        
        // Check Z bounds
        if localZ + collisionRadius < targetBox.minZ and prevLocalZ + collisionRadius < targetBox.minZ:
            continue
        if localZ - collisionRadius > targetBox.maxZ and prevLocalZ - collisionRadius > targetBox.maxZ:
            continue
        
        // Collision confirmed
        if isExplosiveBarrel:
            triggerExplosiveBarrel(targetId)
            if LevelId == 20:
                setLevelFlag(0x100000)
        else if (target.flags & 6) == 2:
            // Deal damage to enemy
            dealDamage(target, null, 30)
            incrementKillCounter()
            hasCollision = true
            
            // Handle enemy death
            if target.health < 1 and targetModel != 22 and targetModel != 46:
                // Clear from tracking list and trigger death
                clearFromTrackingList(targetId)
                triggerDeath(targetId, 1)
        else:
            hasCollision = true
        
        targetId = target.nextInRoom
    
    // Handle grenade explosion on collision
    if hasCollision:
        if ogGraphicsEnabled:
            // OG graphics: use sprite-based explosion
            slot = prepareOgGfx(entity.room)
            if slot != -1:
                ogGfx[slot].x = prevX
                ogGfx[slot].y = prevY
                ogGfx[slot].z = prevZ
                ogGfx[slot].type = 0
                ogGfx[slot].counter = 0
                ogGfx[slot].sprite = 229
        else:
            // Modern graphics: particle-based explosion
            // Calculate offset position behind grenade
            offsetX = entity.x - (sin(pitch) << 9 >> 14)
            offsetY = entity.y - (sin(yaw) << 8 >> 14)
            offsetZ = entity.z - (cos(pitch) << 9 >> 14)
            
            // Spawn explosion particles
            spawnParticle(offsetX, offsetY, offsetZ, 3, -2, 0, entity.room)
            spawnParticle(offsetX, offsetY, offsetZ, 3, -1, 0, entity.room)  // x2
        
        // Play explosion sound
        SoundEffect(105, null, 0)
        
        // Remove grenade entity
        removeEntity(entityId)
```
