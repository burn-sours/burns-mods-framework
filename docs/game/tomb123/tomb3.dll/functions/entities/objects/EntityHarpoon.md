# Function: EntityHarpoon

## Description
Processes harpoon projectile entity behavior. Handles underwater and above-water movement with different physics, floor/ceiling collision detection, entity collision with damage application, and visual effects.

## Notes
- Called each tick for active harpoon entities
- Has a lifetime timer that counts down from `256` — when below `192`, applies wobble effect to trajectory
- In air: applies downward arc to pitch angle (gravity simulation), limited to min pitch `-16384`
- In water: creates bubble effects, slower velocity decay
- Movement uses yaw angle for XZ direction, pitch for Y velocity
- On entity hit: creates blood splatter effect (type 3), applies damage
- Damage is from global value, left-shifted by projectile scale factor
- Model `19` (19) is explicitly skipped (not a valid target)
- Models `101-104` (101-104) and `102` (102) on non-level-6 trigger special entity behavior
- Models `38` (38) and `373` (373) trigger state change on hit
- Model `36` (36) has special handling with flag check
- Model `57` (57) skips blood effect but still deals damage
- On ceiling collision: applies rotation and trajectory arc, creates effects in water
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

## Pseudocode
```
function EntityHarpoon(entityId):
    harpoon = Entities + entityId * ENTITY_SIZE
    
    // Store initial state
    yaw = harpoon.yaw
    prevX = harpoon.x
    prevZ = harpoon.z
    
    // Calculate XZ velocity from yaw angle
    speed = harpoon.speed
    zVelocity = cos(yaw) * speed >> 14
    xVelocity = sin(yaw) * speed >> 14
    
    // Update position
    harpoon.z += zVelocity
    harpoon.y += harpoon.yVelocity
    harpoon.x += xVelocity
    
    // Get sector and floor height at new position
    sector = GetSector(harpoon.x, harpoon.y, harpoon.z, &newRoomId)
    harpoon.prevFloor = harpoon.floor
    harpoon.floor = CalculateFloorHeight(sector, harpoon.x, harpoon.y, harpoon.z)
    
    // Handle room change
    if harpoon.room != newRoomId:
        RoomChange(entityId, newRoomId)
    
    // Iterate through entities in room's linked list
    targetId = room.entityHead
    while targetId != -1:
        target = Entities + targetId * ENTITY_SIZE
        
        // Skip Lara
        if target == Lara:
            continue
        
        // Check if entity is shootable (flag bit 5)
        if (target.flags & 32) == 0:
            continue
        
        targetModel = target.model
        
        // Skip model 19 explicitly
        if targetModel == 19:
            continue
        
        // Check for valid target types
        isSpecialTarget = targetModel in [101, 102, 103, 104] or
                         targetModel == 38 or targetModel == 373
        isShootableEnemy = (target.flags & 6) != 6 and hasHealth(targetModel)
        
        if not isSpecialTarget and not isShootableEnemy:
            continue
        
        // Get target bounding box
        targetBox = GetEntityBox(target)
        
        // Check Y bounds
        if harpoon.y < targetBox.minY + target.y:
            continue
        if harpoon.y > targetBox.maxY + target.y:
            continue
        
        // Transform to target's local space using target's yaw
        targetYaw = target.yaw
        
        localX = (harpoon.x - target.x) * cos(targetYaw) - (harpoon.z - target.z) * sin(targetYaw) >> 14
        localZ = (harpoon.x - target.x) * sin(targetYaw) + (harpoon.z - target.z) * cos(targetYaw) >> 14
        
        prevLocalX = (prevX - target.x) * cos(targetYaw) - (prevZ - target.z) * sin(targetYaw) >> 14
        prevLocalZ = (prevX - target.x) * sin(targetYaw) + (prevZ - target.z) * cos(targetYaw) >> 14
        
        // Check X bounds (sweep test)
        if localX < targetBox.minX and prevLocalX < targetBox.minX:
            continue
        if localX > targetBox.maxX and prevLocalX > targetBox.maxX:
            continue
        
        // Check Z bounds (sweep test)
        if localZ < targetBox.minZ and prevLocalZ < targetBox.minZ:
            continue
        if localZ > targetBox.maxZ and prevLocalZ > targetBox.maxZ:
            continue
        
        // Collision confirmed - handle based on target type
        if targetModel == 102:
            if levelId != 6:
                triggerSpecialEntity(targetId)
        else if targetModel in [101, 103, 104]:
            triggerSpecialEntity(targetId)
        else if targetModel in [38, 373]:
            if (target.flags & 6) == 2:
                continue
            target.flags = (target.flags & ~4) | 2
            activateEntity(targetId)
        else if hasShootableFlag(targetModel) and (target.flags & 6) == 2:
            // Special handling for model 36
            if targetModel == 36 and specialFlag:
                handleSpecialDamage(harpoon.x, harpoon.y, harpoon.z, target)
                RemoveEntity(entityId)
                return
            
            // Create blood effect (skip for model 57)
            if targetModel != 57:
                createBloodEffect(harpoon.x, harpoon.y, harpoon.z, 0, 0, harpoon.room, 3)
            
            // Calculate and apply damage
            damage = globalHarpoonDamage << (harpoon.scaleFlag & 31)
            
            if target.health > 0:
                OnDamage(target, gunType, damage)
            if target.health > 0 and target.health <= damage:
                incrementKillCounter()
            target.health -= damage
            target.flags |= 16
            
            if target.linkedEntity != null:
                target.linkedEntity.flags |= 16
            
            incrementHitCounter()
            RemoveEntity(entityId)
            return
        
        targetId = target.nextInRoom
    
    // No entity hit - check world collision
    if harpoon.y < harpoon.floor:
        ceiling = CalculateCeilingHeight(sector, harpoon.x, harpoon.y, harpoon.z)
        if ceiling < harpoon.y:
            // Between floor and ceiling - apply trajectory arc
            harpoon.rotZ += 6370  // roll
            
            roomFlags = Rooms[harpoon.room].flags
            isUnderwater = (roomFlags & 1) != 0
            
            if not isUnderwater:
                // Air: apply gravity arc to pitch
                harpoon.pitch -= 182
                if harpoon.pitch < -16384:
                    harpoon.pitch = -16384
                
                // Recalculate Y velocity from new pitch
                harpoon.yVelocity = sin(pitch) * -256 >> 14
                harpoon.speed = cos(pitch) << 8 >> 14
            else:
                // Water: create bubble effects
                if (tickCounter & 0xF) == 0:
                    if ogGraphicsMode:
                        createBubbleEffect(harpoon.position, harpoon.room, 2, 8)
                    else:
                        createParticleEffect(harpoon.position, harpoon.room, 2, 8)
                
                createTrailParticle(harpoon.x, harpoon.y, harpoon.z, 64)
                
                // Slower velocity in water
                harpoon.yVelocity = sin(pitch) * -128 >> 14
                harpoon.speed = cos(pitch) << 7 >> 14
            
            // Update sector after position change
            sector = GetSector(harpoon.x, harpoon.y, harpoon.z, &newRoomId)
            CalculateFloorHeight(sector, harpoon.x, harpoon.y, harpoon.z)
            if harpoon.room != newRoomId:
                RoomChange(entityId, newRoomId)
            return
    
    // Lifetime timer handling
    timer = harpoon.timer
    
    if timer == 256:
        // Store initial pitch for wobble reference
        harpoon.savedPitch = harpoon.pitch
    
    if timer > 191:
        // Apply wobble to trajectory
        wobbleAmount = (timer - 192) & 7
        wobbleOffset = (sin(wobbleAmount << 9) >> 1) - 640
        harpoon.pitch = harpoon.savedPitch + (wobbleOffset * (timer - 192) >> 6)
    
    timer--
    harpoon.timer = timer
    
    if timer == 0:
        RemoveEntity(entityId)
        return
    
    harpoon.yVelocity = 0
    harpoon.speed = 0
    
    // Update sector
    sector = GetSector(harpoon.x, harpoon.y, harpoon.z, &newRoomId)
    CalculateFloorHeight(sector, harpoon.x, harpoon.y, harpoon.z)
    if harpoon.room != newRoomId:
        RoomChange(entityId, newRoomId)
```
