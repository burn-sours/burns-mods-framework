# Function: EntityHarpoon

## Description
Processes harpoon projectile entity behavior. Handles underwater and above-water movement, floor/ceiling collision detection, entity collision with damage application, and visual effects on impact.

## Notes
- Called each tick for active harpoon entities
- Has gravity when NOT underwater — harpoon drops in air, travels straight in water
- Underwater detection uses room water flag (byte 0x66 bit 0)
- Movement uses pitch angle for XZ direction, speed value for velocity
- On entity hit: creates blood splatter effect, deals damage from global variable
- Model 72 (0x48) has special handling — explosive barrels
- Level 20 has special flag tracking on barrel hits
- On wall collision underwater: creates bubble effect
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
| 0   | `int16` | Entity ID of the harpoon       |

## Usage
### Hooking
```javascript
mod.hook('EntityHarpoon')
    .onEnter(function(entityId) {
        // entityId is the harpoon's entity slot
    });
```

```javascript
mod.hook('EntityHarpoon')
    .onLeave(function(returnValue, entityId) {
        // Harpoon tick processing complete
    });
```

## Pseudocode
```
function EntityHarpoon(entity):
    entity = Entities + entityId * ENTITY_SIZE
    
    // Store initial state
    roomId = entity.room
    prevX = entity.x
    prevZ = entity.z
    
    // Check if room is underwater
    roomFlags = Rooms[roomId].flags
    isUnderwater = (roomFlags & 1) != 0
    
    // Apply gravity if NOT underwater
    if not isUnderwater:
        entity.yVelocity += 3
    
    // Update Y position
    entity.y += entity.yVelocity
    
    // Calculate XZ velocity from pitch angle and speed
    pitch = entity.pitch
    speed = entity.speed
    
    // Z velocity = cos(pitch) * speed
    zVelocity = cos(pitch) * speed >> 14
    entity.z += zVelocity
    
    // X velocity = sin(pitch) * speed  
    xVelocity = sin(pitch) * speed >> 14
    entity.x += xVelocity
    
    // Get sector and floor height at new position
    sector = GetSector(entity.x, entity.y, entity.z, &newRoomId)
    entity.prevFloor = entity.floor
    entity.floor = CalculateFloorHeight(sector, entity.x, entity.y, entity.z)
    
    // Handle room change
    if entity.room != newRoomId:
        changeRoom(entityId, newRoomId)
    
    // Iterate through entities in room's linked list
    targetId = room.entityList
    while targetId != -1:
        target = Entities + targetId * ENTITY_SIZE
        
        // Skip Lara
        if target == Lara:
            targetId = target.nextInRoom
            continue
        
        // Check if entity is shootable (flag bit 5)
        if (target.flags & 0x20) == 0:
            targetId = target.nextInRoom
            continue
        
        // Check if valid target
        targetModel = target.model
        isExplosiveBarrel = (targetModel == 72)
        isShootableEnemy = (target.flags & 6) != 6 and hasHealth(targetModel)
        
        if not isExplosiveBarrel and not isShootableEnemy:
            targetId = target.nextInRoom
            continue
        
        // Get target bounding box
        targetBox = GetEntityBox(target)
        
        // Check Y bounds
        if entity.y < targetBox.minY + target.y:
            targetId = target.nextInRoom
            continue
        if entity.y > targetBox.maxY + target.y:
            targetId = target.nextInRoom
            continue
        
        // Transform harpoon position to target's local space
        // Rotate by target's pitch angle
        localX = (entity.x - target.x) * cos(pitch) - (entity.z - target.z) * sin(pitch) >> 14
        localZ = (entity.x - target.x) * sin(pitch) + (entity.z - target.z) * cos(pitch) >> 14
        
        // Also check previous position
        prevLocalX = (prevX - target.x) * cos(pitch) - (prevZ - target.z) * sin(pitch) >> 14
        prevLocalZ = (prevX - target.x) * sin(pitch) + (prevZ - target.z) * cos(pitch) >> 14
        
        // Check X bounds
        if localX < targetBox.minX and prevLocalX < targetBox.minX:
            targetId = target.nextInRoom
            continue
        if localX > targetBox.maxX and prevLocalX > targetBox.maxX:
            targetId = target.nextInRoom
            continue
        
        // Check Z bounds
        if localZ < targetBox.minZ and prevLocalZ < targetBox.minZ:
            targetId = target.nextInRoom
            continue
        if localZ > targetBox.maxZ and prevLocalZ > targetBox.maxZ:
            targetId = target.nextInRoom
            continue
        
        // Collision confirmed
        if isExplosiveBarrel:
            triggerExplosiveBarrel(targetId)
            if LevelId == 20:
                setLevelFlag(0x100000)
        else:
            // Check if enemy can take damage
            if canTakeDamage(targetModel) and (target.flags & 6) == 2:
                // Create blood splatter effect
                createBloodEffect(entity.x, entity.y, entity.z, 0, 0, entity.room, 5)
                
                // Deal damage (amount from global variable)
                dealDamage(target, null, harpoonDamage)
                incrementKillCounter()
            
            // Remove harpoon
            removeEntity(entityId)
            return
        
        targetId = target.nextInRoom
    
    // No entity hit - check world collision
    if entity.y < entity.floor:
        ceiling = CalculateCeilingHeight(sector, entity.x, entity.y, entity.z)
        if ceiling < entity.y:
            // Hit ceiling - still in valid space
            // Check if underwater for bubble effect
            roomFlags = Rooms[entity.room].flags
            if roomFlags & 1:  // underwater
                if ogGraphicsEnabled:
                    createBubbleEffect(entity.position, entity.room)
                else:
                    createParticleEffect(entity.position, entity.room, 2, 8)
    else:
        // Hit floor or out of bounds
        removeEntity(entityId)
```
