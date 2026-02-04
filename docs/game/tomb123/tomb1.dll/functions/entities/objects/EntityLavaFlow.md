# Function: EntityLavaFlow

## Description
Controls lava flow objects that advance slowly in their facing direction each frame. Checks terrain ahead and deactivates when the floor height changes (wall or edge reached). Instantly kills Lara on contact and sets her on fire.

## Notes
- Only called by the game loop for entities on the active processing list (`ENTITY_STATUS` bit 0 set)
- Called with the entity's index into the entity array, not a pointer
- **Room transition**: checks and updates the entity's room via `GetSector` every frame
- **Movement** (only while active — `ENTITY_STATUS` bits 1–2 not indicating deactivated):
  - Advances 25 units per frame along the entity's yaw direction (cardinal axes only)
  - Checks floor height 2048 units ahead in the travel direction using `GetSector` and `CalculateFloorHeight`
  - If the floor height ahead differs from the entity's Y position: deactivates (clears `ENTITY_STATUS` bit 1, sets bit 2) — the lava has reached a wall or terrain change
- **Contact damage**: if a contact/collision field is non-zero (lava is touching Lara):
  - If Lara's health is above 0: triggers instant death
  - Sets Lara on fire (global fire state flags, intensity, and entity reference)
- Does **not** call `ProcessEntityAnimation` — movement is purely direct position updates

## Details

| Field     | Value                          |
|-----------|--------------------------------|
| Usage     | `Hook & Call`                  |
| Params    | `int`                          |
| Return    | `void`                         |

### Parameters

| #   | Type  | Description                          |
|-----|-------|--------------------------------------|
| 0   | `int` | Entity index in the entity array     |

## Usage
### Hooking
```javascript
// Track lava flow position each frame
mod.hook('EntityLavaFlow')
    .onEnter(function(entityId) {
        const entities = game.readVar(game.module, 'Entities');
        const entity = entities.add(entityId * ENTITY_SIZE);
        const x = entity.add(ENTITY_X).readS32();
        const z = entity.add(ENTITY_Z).readS32();
        log('Lava flow', entityId, 'at', x, z);
    });
```

### Calling from mod code
```javascript
game.callFunction(game.module, 'EntityLavaFlow', lavaFlowEntityIndex);
```

## Pseudocode
```
function EntityLavaFlow(entityId):
    entity = entities[entityId]

    // Room transition check
    room = entity[ENTITY_ROOM]
    GetSector(entity.x, entity.y, entity.z, &roomOut)
    if roomOut != room:
        changeRoom(entityId, roomOut)

    // Movement (only if not deactivated)
    if (ENTITY_STATUS & 6) != 4:
        yaw = entity[ENTITY_YAW]

        // Advance 25 units per frame, look ahead 2048 units
        switch yaw:
            North (0):     entity.z += 25,  checkZ = entity.z + 2048
            South (-32768): entity.z -= 25, checkZ = entity.z - 2048
            East (16384):  entity.x += 25,  checkX = entity.x + 2048
            West (-16384): entity.x -= 25,  checkX = entity.x - 2048

        // Check terrain ahead
        sector = GetSector(checkX, entity.y, checkZ, &roomOut)
        floorAhead = CalculateFloorHeight(sector, checkX, entity.y, checkZ)

        if floorAhead != entity.y:
            // Terrain change ahead — stop flowing
            clear ENTITY_STATUS bit 1
            set ENTITY_STATUS bit 2  // deactivated

    // Contact damage
    if entity has contact:
        if Lara.health > 0:
            trigger instant death

        // Set Lara on fire
        set fire state flags, intensity, and entity reference
```
