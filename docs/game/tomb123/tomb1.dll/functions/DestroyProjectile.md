# Function: DestroyProjectile

## Description
Removes a projectile from the game world. Handles cleanup of associated particles, unlinks the projectile from the active projectile chain and its room's projectile list, and returns the projectile slot to the free pool. If called during entity processing, the destruction is deferred to a queue instead.

## Notes
- If called while entities are being processed, the destruction is queued (operation ID 3) and executed later — avoids modifying lists mid-iteration
- Iterates through all 2048 particle slots looking for particles linked to this projectile:
  - Particles with the "sticky" flag (bit 10) are removed entirely
  - Other linked particles have velocity applied from the projectile and the link flag cleared (they become free-floating)
- Unlinks the projectile from the active projectile linked list (follows the chain from activeProjectileId)
- Unlinks the projectile from its room's projectile linked list
- Returns the projectile slot to the free pool by linking it into the nextProjectileId chain
- Projectile data is accessed at PROJECTILE_SIZE stride from the Projectiles pointer

## Details

| Field     | Value                          |
|-----------|--------------------------------|
| Usage     | `Hook`                         |
| Params    | `int`                          |
| Return    | `void`                         |

### Parameters

| #   | Type  | Description                              |
|-----|-------|------------------------------------------|
| 0   | `int` | Projectile ID (index into Projectiles array) |

## Usage
### Hooking
```javascript
mod.hook('DestroyProjectile')
    .onEnter(function(projectileId) {
        log('Destroying projectile:', projectileId);
    });
```

## Pseudocode
```
function DestroyProjectile(projectileId):
    // Defer if currently processing entities
    if processingEntities:
        queue(projectileId, operation: DESTROY)
        return

    // Clean up linked particles (2048 particle slots)
    for each particle in particlePool:
        if particle.active and particle.isProjectileLinked and particle.ownerId == projectileId:
            if particle.stickyFlag:
                // Remove particle entirely
                particle.active = false
            else:
                // Transfer projectile velocity to particle, unlink
                particle.x += Projectiles[projectileId].velocityX
                particle.y += Projectiles[projectileId].velocityY
                particle.z += Projectiles[projectileId].velocityZ
                particle.isProjectileLinked = false

    projectile = Projectiles[projectileId]

    // Unlink from active projectile chain
    if activeProjectileId == projectileId:
        activeProjectileId = projectile.nextActive
    else:
        walk chain from activeProjectileId until prev.nextActive == projectileId
        prev.nextActive = projectile.nextActive

    // Unlink from room's projectile list
    room = Rooms[projectile.room]
    if room.firstProjectile == projectileId:
        room.firstProjectile = projectile.nextInRoom
    else:
        walk chain until prev.nextInRoom == projectileId
        prev.nextInRoom = projectile.nextInRoom

    // Return to free pool
    projectile.nextInRoom = nextProjectileId
    nextProjectileId = projectileId
```
