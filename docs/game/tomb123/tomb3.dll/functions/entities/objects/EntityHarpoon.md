# Function: EntityHarpoon

## Description
Processes harpoon projectile entity behavior. Handles underwater and above-water movement with different physics, floor/ceiling collision detection, entity collision with damage application, and visual effects.

## Notes
- Called each tick for active harpoon entities
- Has a lifetime timer that counts down from `0x100` — when below `0xC0`, applies wobble effect to trajectory
- In air: applies downward arc to pitch angle (gravity simulation), limited to min pitch `-0x4000`
- In water: creates bubble effects, slower velocity decay
- Movement uses yaw angle for XZ direction, pitch for Y velocity
- On entity hit: creates blood splatter effect (type 3), applies damage
- Damage is from global value, left-shifted by projectile scale factor
- Model `0x13` (19) is explicitly skipped (not a valid target)
- Models `0x65-0x68` (101-104) and `0x66` (102) on non-level-6 trigger special entity behavior
- Models `0x26` (38) and `0x175` (373) trigger state change on hit
- Model `0x24` (36) has special handling with flag check
- Model `0x39` (57) skips blood effect but still deals damage
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
        if (target.flags & 0x20) == 0:
            continue
        
        targetModel = target.model
        
        // Skip model 0x13 explicitly
        if targetModel == 0x13:
            continue
        
        // Check for valid target types
        isSpecialTarget = targetModel in [0x65, 0x66, 0x67, 0x68] or
                         targetModel == 0x26 or targetModel == 0x175
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
        if targetModel == 0x66:
            if levelId != 6:
                triggerSpecialEntity(targetId)
        else if targetModel in [0x65, 0x67, 0x68]:
            triggerSpecialEntity(targetId)
        else if targetModel in [0x26, 0x175]:
            if (target.flags & 6) == 2:
                continue
            target.flags = (target.flags & ~4) | 2
            activateEntity(targetId)
        else if hasShootableFlag(targetModel) and (target.flags & 6) == 2:
            // Special handling for model 0x24
            if targetModel == 0x24 and specialFlag:
                handleSpecialDamage(harpoon.x, harpoon.y, harpoon.z, target)
                RemoveEntity(entityId)
                return
            
            // Create blood effect (skip for model 0x39)
            if targetModel != 0x39:
                createBloodEffect(harpoon.x, harpoon.y, harpoon.z, 0, 0, harpoon.room, 3)
            
            // Calculate and apply damage
            damage = globalHarpoonDamage << (harpoon.scaleFlag & 0x1F)
            
            if target.health > 0:
                OnDamage(target, gunType, damage)
            if target.health > 0 and target.health <= damage:
                incrementKillCounter()
            target.health -= damage
            target.flags |= 0x10
            
            if target.linkedEntity != null:
                target.linkedEntity.flags |= 0x10
            
            incrementHitCounter()
            RemoveEntity(entityId)
            return
        
        targetId = target.nextInRoom
    
    // No entity hit - check world collision
    if harpoon.y < harpoon.floor:
        ceiling = CalculateCeilingHeight(sector, harpoon.x, harpoon.y, harpoon.z)
        if ceiling < harpoon.y:
            // Between floor and ceiling - apply trajectory arc
            harpoon.rotZ += 0x18E2  // roll
            
            roomFlags = Rooms[harpoon.room].flags
            isUnderwater = (roomFlags & 1) != 0
            
            if not isUnderwater:
                // Air: apply gravity arc to pitch
                harpoon.pitch -= 0xB6
                if harpoon.pitch < -0x4000:
                    harpoon.pitch = -0x4000
                
                // Recalculate Y velocity from new pitch
                harpoon.yVelocity = sin(pitch) * -0x100 >> 14
                harpoon.speed = cos(pitch) << 8 >> 14
            else:
                // Water: create bubble effects
                if (tickCounter & 0xF) == 0:
                    if ogGraphicsMode:
                        createBubbleEffect(harpoon.position, harpoon.room, 2, 8)
                    else:
                        createParticleEffect(harpoon.position, harpoon.room, 2, 8)
                
                createTrailParticle(harpoon.x, harpoon.y, harpoon.z, 0x40)
                
                // Slower velocity in water
                harpoon.yVelocity = sin(pitch) * -0x80 >> 14
                harpoon.speed = cos(pitch) << 7 >> 14
            
            // Update sector after position change
            sector = GetSector(harpoon.x, harpoon.y, harpoon.z, &newRoomId)
            CalculateFloorHeight(sector, harpoon.x, harpoon.y, harpoon.z)
            if harpoon.room != newRoomId:
                RoomChange(entityId, newRoomId)
            return
    
    // Lifetime timer handling
    timer = harpoon.timer
    
    if timer == 0x100:
        // Store initial pitch for wobble reference
        harpoon.savedPitch = harpoon.pitch
    
    if timer > 0xBF:
        // Apply wobble to trajectory
        wobbleAmount = (timer - 0xC0) & 7
        wobbleOffset = (sin(wobbleAmount << 9) >> 1) - 0x400
        harpoon.pitch = harpoon.savedPitch + (wobbleOffset * (timer - 0xC0) >> 6)
    
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
