# Function: RecordWorldState

## Description
Snapshots the current game world state into a buffer for later restoration. Runs every frame, and is also reused by the save file mechanism. Captures level ID, inventory counts, flip map state, flip effect state, camera flags, entity state (position, rotation, flags, animation), Lara's full state (entity data + mesh model pointers), vehicle state, and camera data.

## Notes
- Param 0 selects the recording mode: 0 = save game (to the backup buffer), non-zero = demo system (to the demo state buffer with additional camera state)
- Mode 0 clears the destination buffer before writing; mode non-zero writes a "DEMO" signature and includes RNG seeds and full camera state
- Entity data is recorded selectively based on per-type flags in the entity type table — not all entities are stored the same way
- Lara's state includes entity data plus mesh model offsets stored relative to the mesh pointer base (converted to half-word offsets)
- TR3-specific: handles vehicle state and counts/stores projectiles (entity type 179) separately
- Special entity handling for models 14, 15, 16, 17, 18, 19, 73, and 291
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

        // Special case: model 73 with health and certain conditions
        if entity.typeId == 73 and entity.health > 0 and specificFlags:
            preserveFlag = true

        if typeFlags has SAVE_POSITION (0x08):
            store x, y, z, speed, roomId, rotation, flags

        if typeFlags has SAVE_ANIM (0x40):
            store animation state fields (id, frame, goal, etc.)

        if typeFlags has SAVE_FLAGS (0x10):
            store entity-specific flags

        if typeFlags has SAVE_FULL (0x20):
            compute packed flags from entity status bits
            if typeFlags has SAVE_EXTRA (0x02) and entity has linked data:
                set linked data flag
            store packed flags + trigger flags
            if SAVE_EXTRA:
                store timer/counter
            store room id
            if linked data flag:
                store 26-byte linked data block
            store collision/position data (16 bytes)

        if typeFlags has 0x80:
            store entity-specific int value

        // TR3 vehicle special cases
        if entity.typeId == 18:  // vehicle type
            store 8-byte vehicle state
        if entity.typeId == 15:  // vehicle type
            store 28-byte vehicle state
        if entity.typeId == 14:  // vehicle type
            store 48-byte vehicle state
        if entity.typeId == 17:  // vehicle type
            store 32-byte vehicle state
        if entity.typeId == 16:  // vehicle type
            store 44-byte vehicle state
        if entity.typeId == 19:  // vehicle type
            store 16-byte vehicle state
        if entity.typeId == 291:
            store 2-byte special value

    // Lara state (full entity + extended data)
    store inventory/statistics block
    block copy Lara entity data (464 bytes in 3 chunks)
    store mesh model offsets relative to mesh base pointer (15 slots)
    store frame pointer offsets (2 values)

    // vehicle state (if Lara has active vehicle)
    if VehicleId != -1:
        store vehicle animation and control state (10 bytes)

    // game timers and statistics
    store elapsed time, secret count, etc.
    store various game flags

    // projectile count and state (entity type 179)
    count active projectiles in extended entity pool (entities >= totalLevelEntities, up to 256)
    store projectile count
    for each active projectile:
        store position (20 bytes), rotation, flags (30 bytes total)

    // camera state (demo mode only)
    if mode != 0:
        store current camera position + room
        store previous camera position + room
        store camera target, mode, transition data (128 bytes)

    // statistics / session data
    store game statistics block (144 bytes)
    update record size counter
```
