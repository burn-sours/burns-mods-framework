# Function: EntityRocket

## Description
Processes rocket projectile entity behavior. Handles movement using velocity and angle-based trigonometry, applies acceleration based on room type (air vs water), performs entity collision with damage application, and creates explosion effects on impact.

## Notes
- Called each tick for active rocket entities
- Movement uses yaw and pitch angles with sine/cosine lookups for 3D trajectory
- Air vs water: in air, speed increases up to max 320 with rolling rotation; in water, speed increases up to max 128 with reduced acceleration
- Creates smoke trail particles behind the rocket
- Creates bubble/splash effects when in water
- Creates particle pool entry for visual trail effect using RNG-based positioning
- On collision (floor/ceiling or entity hit): creates explosion effects, plays sounds (105, 106), applies screen shake based on distance to Lara, removes rocket
- Damage is scaled: base 30 left-shifted by a value from the projectile data
- Models 101-104 trigger special entity behavior
- Models 38 and 373 trigger state change on hit
- Model 36 has level-specific behavior
- Model 102 on level 6 requires specific projectile flag to trigger
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
| 0   | `int16` | Entity ID of the rocket        |

## Usage
### Hooking
```javascript
mod.hook('EntityRocket')
    .onEnter(function(entityId) {
        // entityId is the rocket's entity slot
    });
```

## Pseudocode
```
function EntityRocket(entityId):
    rocket = Entities + entityId * ENTITY_SIZE
    
    roomId = rocket.room
    prevX = rocket.x
    prevY = rocket.y
    prevZ = rocket.z
    speed = rocket.speed
    
    inWater = (room.flags & 1) != 0
    createAirTrail = false
    
    // Apply physics based on environment
    accel = speed >> 2
    
    if not inWater:
        if speed < 320:
            speed = accel + speed + 4
            rocket.speed = speed
        createAirTrail = true
        rotSpeed = (speed >> 2) + 7
    else:
        if speed < 129:
            speed = accel + speed + 4
            if speed > 128:
                speed = 128
            rocket.speed = speed
        createAirTrail = false
        rotSpeed = (speed >> 3) + 3
    
    // Apply roll rotation
    rocket.rotZ += rotSpeed * 182
    rocket.frame = 49680
    
    // Setup transform matrices
    pushMatrix()
    applyRotation(rocket.rotY, rocket.pitch, rocket.rotZ)
    copyMatrix()
    translateLocal(0, 0, -128)
    
    // Calculate trail offset with random variation
    random = updateRNG()
    tailOffset = -1536 - (random >> 10 & 511)
    
    trailX = matrix1.x >> 14
    trailY = matrix1.y >> 14
    trailZ = matrix1.z >> 14
    
    // Create smoke trail
    if (flags & 4) != 0:
        createSmokeTrail(trailX, trailY, trailZ, ...)
    
    createTrailParticle(rocket.x + trailX, rocket.y + trailY, rocket.z + trailZ, -1)
    
    // Create water effects if in water
    if inWater:
        createWaterBubbles(rocket.x + trailX, rocket.y + trailY, rocket.z + trailZ, roomId)
    
    // Add to particle effects pool
    if particlePoolCount != 32:
        pool[count].active = 1
        pool[count].timer = 3584
        pool[count].x = rocket.x + trailX + random offset
        pool[count].y = rocket.y + trailY + random offset
        pool[count].z = rocket.z + trailZ + random offset
        pool[count].velocityY = random
        pool[count].color = random RGB
        pool[count].room = currentRoom
        particlePoolCount++
    
    // Calculate velocity from angles
    pitch = rocket.pitch
    yaw = rocket.yaw
    
    yVelocity = -sin(pitch) * speed >> 14
    
    cosYaw = cos(yaw)
    sinYaw = sin(yaw)
    
    zVelocity = cosYaw * yVelocity >> 14
    xVelocity = sinYaw * yVelocity >> 14
    
    rocket.z += zVelocity
    rocket.x += xVelocity
    rocket.y -= sin(pitch) * speed >> 14
    
    // Get sector and floor/ceiling heights
    sector = GetSector(rocket.x, rocket.y, rocket.z, roomId)
    rocket.prevFloor = rocket.floor
    floorHeight = CalculateFloorHeight(sector, rocket.x, rocket.y, rocket.z)
    rocket.floor = floorHeight
    
    // Handle room change
    if rocket.room != newRoomId:
        RoomChange(entityId, newRoomId)
    
    // Check floor/ceiling collision
    hasCollision = 0
    collisionRadius = 0
    
    if rocket.y < floorHeight:
        ceilingHeight = CalculateCeilingHeight(sector, rocket.x, rocket.y, rocket.z)
        if ceilingHeight < rocket.y:
            hasCollision = 0
            collisionRadius = 0
        else:
            collisionRadius = 640 << (rocket.scaleFlag & 31)
            hasCollision = 1
    else:
        hasCollision = 0
        collisionRadius = 0
    
    // Create water splash if entering water
    if inWater and createAirTrail:
        createWaterSplash(rocket.x, room.waterHeight, rocket.z, ...)
    
    // Expand search to nearby rooms
    processNearbyRooms(rocket.x, rocket.y, rocket.z, collisionRadius * 4, collisionRadius * 4, roomId)
    
    // Iterate through entities in nearby rooms
    for each room in searchList:
        targetId = room.entityHead
        while targetId != -1:
            target = Entities + targetId * ENTITY_SIZE
            
            // Skip Lara
            if target == Lara:
                continue
            
            // Check if entity is shootable
            if (target.flags & 32) == 0:
                continue
            
            targetModel = target.model
            
            // Check for valid target types
            if targetModel in [101, 102, 103, 104] or targetModel == 38 or 
               targetModel == 373 or targetModel == 47 or
               (hasShootableFlag(targetModel) and (target.flags & 6) != 6 and hasHealth(targetModel)):
                
                // Get bounding box and check collision
                targetBox = GetEntityBox(target)
                
                // Check Y bounds
                if not withinYBounds(rocket.y, target.y, targetBox, collisionRadius):
                    continue
                
                // Transform to target's local space and check XZ bounds
                if not withinXZBounds(...):
                    continue
                
                // Handle collision based on model type
                if targetModel == 102:
                    if levelId == 6:
                        if rocket.scaleFlag == 1:
                            triggerSpecialEntity(targetId)
                    else:
                        triggerSpecialEntity(targetId)
                else if targetModel in [101, 103, 104]:
                    triggerSpecialEntity(targetId)
                else if targetModel in [38, 373]:
                    if (target.flags & 6) == 2:
                        continue
                    target.flags = (target.flags & ~4) | 2
                    activateEntity(targetId)
                else if (target.flags & 6) == 2:
                    // Apply scaled damage
                    damage = 30 << (rocket.scaleFlag & 31)
                    
                    if targetModel == 36 and specialFlag:
                        handleSpecialDamage(rocket.x, rocket.y, rocket.z, target)
                    else:
                        if target.health > 0:
                            OnDamage(target, gunType, damage)
                        if target.health > 0 and target.health <= damage:
                            incrementKillCounter()
                        target.health -= damage
                        target.flags |= 16
                        if target.linkedEntity != null:
                            target.linkedEntity.flags |= 16
                    
                    incrementHitCounter()
                    
                    // Handle death
                    if target.health < 1:
                        if targetModel not in special list:
                            if targetModel == 35 and flag set:
                                clearFlag()
                            triggerDeath(targetId, 1)
                
                if not hasCollision:
                    hasCollision = 1
                    collisionRadius = 640 << (rocket.scaleFlag & 31)
                    break
            
            targetId = target.nextInRoom
    
    // Handle explosion
    if hasCollision:
        if not inWater:
            if ogGraphicsMode:
                // Calculate offset explosion position
                offsetX = rocket.x - (sin(yaw) << 9 >> 14)
                offsetY = rocket.y - (sin(pitch) << 8 >> 14)
                offsetZ = rocket.z - (cos(yaw) << 9 >> 14)
            
            // Create explosion graphics
            CreateGraphic(offsetX, offsetY, offsetZ, 3, -2, 0, rocket.room)
            CreateGraphic(offsetX, offsetY, offsetZ, 3, -1, 0, rocket.room)  // x2
        else:
            // Restore position and create underwater explosion
            rocket.x = prevX
            rocket.y = prevY
            rocket.z = prevZ
            RoomChange(entityId, originalRoom)
            createUnderwaterExplosion(rocket)
        
        // Calculate distance to Lara for screen shake
        dx = offsetX - Lara.x
        dy = offsetY - Lara.y
        dz = offsetZ - Lara.z
        distSquared = dx*dx + dy*dy + dz*dz
        
        if distSquared < 26214400:
            shakeIntensity = 65280 - ((distSquared >> 9) & 65280)
            applyScreenShake(1, shakeIntensity, shakeIntensity, 2, shakeIntensity >> 4, 2)
        
        triggerEffects(rocket)
        SoundEffect(105, rocket.position, 25165828)
        SoundEffect(106, rocket.position, 0)
        RemoveEntity(entityId)
```
