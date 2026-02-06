# Function: EntityGrenade

## Description
Processes grenade projectile entity behavior. Handles movement using velocity and angle-based trigonometry, applies gravity and drag based on room type (air vs water), performs entity collision with damage application, and creates explosion effects on impact.

## Notes
- Called each tick for active grenade entities
- Movement uses yaw and pitch angles with sine/cosine lookups for 3D trajectory
- Air vs water: in water rooms, pitch increases slower (gravity reduced), speed decays by 1/4 per tick; in air, pitch increases faster, speed decays by 1/2 per tick with additional rotation
- Rotation is applied to yaw and pitch each tick based on speed
- Creates smoke trail particles when in air
- On collision (timer expiry or entity hit): creates explosion effects, plays sounds (0x69, 0x6A), applies screen shake based on distance to Lara, removes grenade
- Deals 20 (`0x14`) damage to hit entities via `OnDamage`
- Models `0x65-0x68` (101-104) and `0x66` (102) have special handling
- Models `0x26` (38) and `0x175` (373) trigger state change on hit
- Model `0x24` (36) has level-specific behavior with special flag check
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

## Pseudocode
```
function EntityGrenade(entityId):
    grenade = Entities + entityId * ENTITY_SIZE
    
    prevX = grenade.x
    prevY = grenade.y
    prevZ = grenade.z
    speed = grenade.speed
    pitch = grenade.rotPitch
    
    grenade.frame = 0xC210
    inWater = (room.flags & 1) != 0
    createTrail = false
    
    // Apply physics based on environment
    if not inWater:
        grenade.rotYaw += 3
        if speed != 0:
            rotSpeed = (speed >> 2) + 7
            spinSpeed = (speed >> 1) + 7
            createTrail = true
    else:
        speed = speed - (speed >> 2)  // 1/4 drag
        grenade.rotYaw = (5 - pitch >> 1) + pitch
        grenade.speed = speed
        if speed != 0:
            rotSpeed = (speed >> 4) + 3
            spinSpeed = (speed >> 2) + 3
            createTrail = false
    
    // Apply rotation
    grenade.rotZ += rotSpeed * 0xB6
    if grenade.someFlag == 0:
        grenade.rotX += spinSpeed * 0xB6
    else:
        grenade.rotY += spinSpeed * 0xB6
    
    // Setup transform matrix
    pushMatrix()
    applyRotation(grenade.rotY, grenade.rotX, grenade.rotZ)
    translateLocal(0, 0, -0x40)
    
    // Create smoke trail if in air
    if speed != 0 and createTrail:
        createTrailParticle(matrix.x + grenade.x, grenade.y + matrix.y, matrix.z + grenade.z, -1)
    
    // Calculate velocity from yaw angle
    yaw = grenade.yaw
    zVelocity = -sin(yaw) * speed >> 14
    xVelocity = -cos(yaw) * speed >> 14
    
    prevYaw = grenade.auxYaw
    grenade.auxYaw = yaw
    
    grenade.z += zVelocity
    grenade.y += grenade.rotYaw  // gravity/buoyancy
    grenade.x += xVelocity
    
    // Process room collision and trigger checks
    processRoomCollision(entityId, prevX, prevY, prevZ, xVelocity, grenade.rotYaw, zVelocity)
    
    roomId = grenade.room
    grenade.yaw = grenade.auxYaw
    grenade.auxYaw = prevYaw
    
    // Create water splash if entering water
    if (room.flags & 1) != 0 and createTrail:
        createWaterSplash(grenade.x, room.waterHeight, grenade.z, ...)
    
    // Check for explosion trigger
    hasCollision = false
    collisionRadius = 0
    
    if grenade.timer != 0:
        grenade.timer--
        if grenade.timer == 0:
            hasCollision = true
            collisionRadius = 0x400
    
    // Expand search to nearby rooms
    processNearbyRooms(grenade.x, grenade.y, grenade.z, collisionRadius * 4, collisionRadius * 4, roomId)
    
    // Iterate through entities in nearby rooms
    for each room in searchList:
        entityId = room.entityHead
        while entityId != -1:
            target = Entities + entityId * ENTITY_SIZE
            
            // Skip Lara
            if target == Lara:
                continue
            
            // Check if entity is shootable
            if (target.flags & 0x20) == 0:
                continue
            
            targetModel = target.model
            
            // Check for valid target types
            if targetModel in [0x65, 0x66, 0x67, 0x68] or targetModel == 0x26 or 
               targetModel == 0x175 or targetModel == 0x2F or
               (hasShootableFlag(targetModel) and (target.flags & 6) != 6 and hasHealth(targetModel)):
                
                // Get bounding box
                targetBox = GetEntityBox(target)
                
                // Check Y bounds
                if not withinYBounds(grenade.y, target.y, targetBox, collisionRadius):
                    continue
                
                // Transform to target's local space
                localX, localZ = rotateToLocal(grenade.x - target.x, grenade.z - target.z, target.yaw)
                prevLocalX, prevLocalZ = rotateToLocal(prevX - target.x, prevZ - target.z, target.yaw)
                
                // Check XZ bounds
                if not withinXZBounds(localX, localZ, prevLocalX, prevLocalZ, targetBox, collisionRadius):
                    continue
                
                // Handle collision based on model type
                if targetModel == 0x66:
                    if levelId != 6:
                        triggerSpecialEntity(entityId)
                else if targetModel in [0x65, 0x67, 0x68]:
                    triggerSpecialEntity(entityId)
                else if targetModel in [0x26, 0x175]:
                    if (target.flags & 6) == 2:
                        continue
                    target.flags = (target.flags & ~4) | 2
                    activateEntity(entityId)
                else if (target.flags & 6) == 2:
                    // Apply damage
                    if targetModel == 0x24 and specialFlag:
                        handleSpecialDamage(grenade.x, grenade.y, grenade.z, target)
                    else:
                        if target.health > 0:
                            OnDamage(target, gunType, 0x14)
                        if target.health in range(1, 21):
                            incrementKillCounter()
                        target.health -= 0x14
                        target.flags |= 0x10
                        if target.linkedEntity != null:
                            target.linkedEntity.flags |= 0x10
                    
                    incrementHitCounter()
                    
                    // Handle death
                    if target.health < 1:
                        if targetModel not in special list:
                            if targetModel == 0x23 and flag set:
                                clearFlag()
                            triggerDeath(entityId, 1)
                
                if not hasCollision:
                    hasCollision = true
                    collisionRadius = 0x400
                    break
            
            entityId = target.nextInRoom
    
    // Handle explosion
    if hasCollision:
        if not inWater:
            if ogGraphicsMode:
                // Offset explosion position
                offsetX = grenade.x - (sin(yaw) << 9 >> 14)
                offsetY = grenade.y - (sin(yaw) << 8 >> 14)
                offsetZ = grenade.z - (cos(yaw) << 9 >> 14)
            
            // Create explosion graphics
            CreateGraphic(offsetX, offsetY, offsetZ, 3, -2, 0, grenade.room)
            CreateGraphic(offsetX, offsetY, offsetZ, 3, -1, 0, grenade.room)  // x2
        else:
            createUnderwaterExplosion(grenade)
        
        // Calculate distance to Lara for screen shake
        dx = offsetX - Lara.x
        dy = offsetY - Lara.y
        dz = offsetZ - Lara.z
        distSquared = dx*dx + dy*dy + dz*dz
        
        if distSquared < 0x1900000:
            shakeIntensity = 0xFF00 - ((distSquared >> 9) & 0xFF00)
            applyScreenShake(1, shakeIntensity, shakeIntensity, 2, shakeIntensity >> 4, 2)
        
        triggerEffects(grenade)
        SoundEffect(0x69, grenade.position, 0x1800004)
        SoundEffect(0x6A, grenade.position, 0)
        RemoveEntity(entityId)
```
