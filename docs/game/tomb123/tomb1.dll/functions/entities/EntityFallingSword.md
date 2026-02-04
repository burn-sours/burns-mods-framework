# Function: EntityFallingSword

## Description
Controls the Sword of Damocles trap — a ceiling-mounted sword that hovers and spins until Lara walks beneath it. On activation, locks onto Lara's position, calculates a fixed trajectory, and falls with accelerating gravity. On floor impact, creates sparks, plays an impact sound, removes itself from active processing, and sets a global tracking flag.

## Notes
- Only called by the game loop for entities on the active processing list (`ENTITY_STATUS` bit 0 set)
- Called with the entity's index into the entity array, not a pointer
- **No animation processing** — movement is entirely custom physics (direct position updates, gravity, rotation)
- **No AI sensing or mood system** — purely distance-based activation
- Two-phase behaviour driven by a flag bit (bit 3):

### Phase 1 — Hovering
- Guards: if entity Y already equals the stored floor value (first field of entity struct), does nothing — sword is already at rest
- Spins each frame (rotation angle incremented by angular velocity)
- Proximity check — all three must pass:
  - X: Lara within ±1536 units
  - Z: Lara within ±1536 units
  - Y: Lara between 1 and 3071 units below the sword
- On trigger: calculates X and Z velocity as distance-to-Lara / 32, sets flag bit 3
- Velocity is locked in at activation — no mid-flight tracking

### Phase 2 — Falling
- Continues spinning each frame
- Gravity: fall speed increases by 6 per frame while below 128, then by 1 (fast initial acceleration tapering near terminal velocity)
- Updates position each frame: X += xVelocity, Y += fallSpeed, Z += zVelocity
- Handles room transitions via `GetSector` and room change
- **Floor collision** (entity Y passes below `CalculateFloorHeight` result):
  1. Plays `SoundEffect` 103 at sword position
  2. Positions sword at floor height + 10 (small embed offset)
  3. Clears flag bits 1 and 3, sets bit 2 (landed)
  4. Removes entity from active processing list
  5. `CreateImpactSparks` at sword position with current rotation
  6. Sets bit 1 in a global per-entity tracking array (indexed as 48 − entityId) — likely marks the sword as landed for the level's contact damage system

## Details

| Field     | Value                          |
|-----------|--------------------------------|
| Usage     | `Hook`                         |
| Params    | `int`                          |
| Return    | `void`                         |

### Parameters

| #   | Type  | Description                          |
|-----|-------|--------------------------------------|
| 0   | `int` | Entity index in the entity array     |

## Usage
### Hooking
```javascript
// Log when a sword activates and starts falling
mod.hook('EntityFallingSword')
    .onEnter(function(entityId) {
        log('Falling sword tick, entity:', entityId);
    });
```

## Pseudocode
```
function EntityFallingSword(entityId):
    entity = entities[entityId]

    if entity.flags bit 3 is NOT set:
        // --- Phase 1: Hovering ---

        // Already at floor — do nothing
        if entity.y == entity.floor:
            return

        // Spin
        entity.rotation += entity.rotationSpeed

        // Check Lara proximity
        dx = Lara.x - entity.x
        dz = Lara.z - entity.z
        dy = Lara.y - entity.y

        if abs(dx) <= 1536 AND abs(dz) <= 1536 AND dy >= 1 AND dy <= 3071:
            // Lock on — calculate velocity toward Lara (one-shot)
            entity.xVelocity = dx / 32
            entity.zVelocity = dz / 32
            set entity.flags bit 3
            return

    else:
        // --- Phase 2: Falling ---

        // Spin
        entity.rotation += entity.rotationSpeed

        // Gravity
        if entity.fallSpeed < 128:
            acceleration = 6
        else:
            acceleration = 1
        entity.fallSpeed += acceleration

        // Update position
        entity.x += entity.xVelocity
        entity.y += entity.fallSpeed
        entity.z += entity.zVelocity

        // Room transition
        oldRoom = entity.room
        sector = GetSector(entity.x, entity.y, entity.z, &roomOut)
        if roomOut != oldRoom:
            changeRoom(entityId, roomOut)

        // Floor collision
        floorY = CalculateFloorHeight(sector, entity.x, entity.y, entity.z)
        if floorY < entity.y:
            SoundEffect(103, entity.position, 0)
            entity.y = floorY + 10

            clear entity.flags bits 1 and 3
            set entity.flags bit 2  // landed

            removeFromProcessingList(entityId)
            CreateImpactSparks(entity.x, entity.y, entity.z, entity.rotation)

            // Mark sword as landed in global tracking
            globalEntityFlags[48 - entityId] |= 2
```
