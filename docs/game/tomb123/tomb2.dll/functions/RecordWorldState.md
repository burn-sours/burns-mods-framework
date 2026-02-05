# Function: RecordWorldState

## Description
Snapshots the current game world state into a buffer for later restoration. Runs every frame, and is also reused by the save file mechanism. Captures level ID, inventory counts, flip map state, flip effect state, camera flags, entity state (position, rotation, flags, animation), Lara's full state (entity data + mesh model pointers), vehicle state, and camera data.

## Notes
- Param 0 selects the recording mode: 0 = save game (to the backup buffer), non-zero = demo system (to the demo state buffer with additional camera state)
- Mode 0 clears the destination buffer before writing; mode non-zero writes a "DEMO" signature and includes RNG seeds and full camera state
- Entity data is recorded selectively based on per-type flags in the entity type table — not all entities are stored the same way
- Lara's state includes entity data plus mesh model offsets stored relative to the mesh pointer base (converted to half-word offsets)
- TR2-specific: handles vehicle state (skidoo, boat) and counts/stores harpoon projectiles (entity type 152) separately
- Paired with RestoreWorldState which reads the same buffer format back

## Details

| Field     | Value                          |
|-----------|--------------------------------|
| Usage     | `Hook`                         |
| Params    | `int`                          |
| Return    | `void`                         |

### Parameters

| #   | Type  | Description                                                |
|-----|-------|------------------------------------------------------------|
| 0   | `int` | Recording mode — 0 = save game, non-zero = demo system (includes camera state) |

## Usage
### Hooking
```javascript
mod.hook('RecordWorldState')
    .onEnter(function(mode) {
        // mode: 0 = save game, non-zero = demo system
    })
    .onLeave(function(returnValue, mode) {
        // returnValue: null (void)
        // World state has been written to the backup buffer
    });
```

## Pseudocode
```
function RecordWorldState(mode):
    store game version/patch info
    store levelId
    store inventory counts (keys, puzzle items, pickups)

    if mode == 0:
        dest = save game backup buffer
        clear destination buffer
    else:
        dest = demo state buffer
        write "DEMO" signature
        store RNG seeds

    // flip map state
    store FlipMapStatus
    store FlipMapFlags (5 values)
    store flip effect status
    store flip effect flags (256 bytes, block copy)

    // camera trigger flags
    for each camera:
        store camera flag word

    // entity state (selective based on type flags)
    for each entity:
        typeFlags = entityTypeTable[entity.typeId]

        if typeFlags has SAVE_POSITION (0x08):
            store x, y, z, speed, roomId, rotation, flags

        if typeFlags has SAVE_ANIM (0x40):
            store animation state fields (id, frame, goal, etc.)

        if typeFlags has SAVE_FLAGS (0x10):
            store entity-specific flags

        if typeFlags has SAVE_FULL (0x20):
            store computed animation frame + hit points
            if typeFlags has SAVE_EXTRA (0x02):
                store additional entity data block
            store entity collision/trigger data

        // TR2 vehicle special cases
        if entity.typeId == 13 or 14:  // boat types
            store vehicle state (24 bytes)
        else if entity.typeId == 65:   // skidoo
            store vehicle state (8 bytes)

    // Lara state (full entity + extended data)
    block copy Lara entity data
    store mesh model offsets relative to mesh base pointer (15 slots)
    store frame pointer offsets
    store additional Lara state values

    // vehicle state (if Lara has active vehicle)
    if VehicleId != -1:
        store vehicle animation and control state

    // game timers and statistics
    store elapsed time, secret count, etc.

    // harpoon projectile count and state
    count active harpoons (entity type 152) in extended entity pool
    store harpoon count
    for each active harpoon:
        store position, rotation, flags

    // camera state (demo mode only)
    if mode != 0:
        store current camera position + room
        store previous camera position + room
        store camera target, mode, transition data
        store camera pointer references

    // statistics / session data
    store game statistics block
    update record counter
    store final offset for RestoreWorldState
```
