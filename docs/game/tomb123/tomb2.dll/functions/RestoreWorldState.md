# Function: RestoreWorldState

## Description
Restores the game world state from a previously recorded buffer, reversing the work of RecordWorldState. Rebuilds inventory, flip map state, entity positions/states, Lara's full state, mesh model pointers, vehicle state, and harpoon projectiles. Handles special geometry adjustments for push blocks and moving blocks during restoration.

## Notes
- Param 0 selects the restore mode: 0 = save game restore (from the backup buffer, starting past the inventory header), non-zero = demo restore (from the demo state buffer, requires a "DEMO" signature at the start)
- In demo mode (non-zero), restores RNG seed and camera state; in save game mode (0) these are skipped
- If the demo state buffer doesn't have the "DEMO" signature, the function aborts early
- Inventory restoration is complex: weapons consolidate their ammo pickups (e.g. picking up a shotgun absorbs all loose shotgun shells into ammo count), alternate model IDs are resolved
- Entity restoration selectively reads position, animation, flags, and AI data based on per-type flags in the entity type table — same flags used by RecordWorldState
- TR2-specific: handles vehicle state (boats type 13/14, skidoo type 65), restores harpoon projectile count and state (type 152)
- Push blocks trigger floor height adjustments and pathfinding box updates during restore
- Pickup entities that were collected get unlinked from their room's entity linked list
- Lara's mesh model pointers are rebuilt from stored offsets relative to the mesh pointer base
- Special handling for level 13 (Diving Area) drawbridge collision restoration
- Paired with RecordWorldState which writes the same buffer format

## Details

| Field     | Value                          |
|-----------|--------------------------------|
| Usage     | `Hook`                         |
| Params    | `int`                          |
| Return    | `void`                         |

### Parameters

| #   | Type  | Description                                                |
|-----|-------|------------------------------------------------------------|
| 0   | `int` | Restore mode — 0 = save game restore, non-zero = demo restore (includes camera state) |

## Usage
### Hooking
```javascript
mod.hook('RestoreWorldState')
    .onEnter(function(mode) {
        // mode: 0 = save game restore, non-zero = demo restore
    })
    .onLeave(function(returnValue, mode) {
        // returnValue: null (void)
        // World state has been restored from the buffer
    });
```

## Pseudocode
```
function RestoreWorldState(mode):
    if mode == 0:
        source = save game backup buffer (skip past inventory header)
    else:
        source = demo state buffer
        if signature != "DEMO":
            abort (clear flag and return)
        restore RNG seeds (two seed values)
        advance past header

    // restore game version/patch info
    restore levelId and related state

    // restore inventory — per item type with weapon consolidation
    for each item type (keys, puzzle items, pickups, weapons, ammo, medipacks):
        count = stored count for this item type
        repeat count times:
            resolve model ID (check alternate IDs if needed)
            check if item fits weapon/item slots

            // weapon consolidation logic:
            if item is shotgun:
                absorb all loose shotgun shells into ammo count
                add shotgun to inventory
                update entity model IDs
            if item is magnums/autopistols:
                absorb all loose clips into ammo count
                add weapon to inventory
            if item is uzis:
                absorb all loose uzi clips into ammo count
                add uzis to inventory
            if item is harpoons/grenade launcher:
                handle special ammo consolidation

            // ammo without weapon:
            if item is ammo type and weapon not owned:
                add ammo pickup to inventory as standalone item

            // ammo with weapon already owned:
            if item is ammo type and weapon exists:
                add ammo value directly to weapon's ammo count

            // keys, puzzles, pickups: add directly
            add item to inventory

    // restore flip map state
    if stored flip map flag != 0:
        flipMap()
    restore flip map flags
    restore flip effect status
    restore flip effect flags (block copy)

    // restore camera trigger flags
    for each camera:
        restore camera flag word

    // restore entity state
    for each entity:
        typeFlags = entityTypeTable[entity.typeId]

        // pre-restore: undo push block floor modifications
        if entity is pushBlock and not fully active:
            raise floor at entity position
            unblock pathfinding box

        if typeFlags has SAVE_POSITION (0x08):
            restore x, y, z, speed, rotation
            if room changed: RoomChange()
            if entity type count > 1: recalculate floor height

        if typeFlags has SAVE_ANIM (0x40):
            restore animation state fields (id, frame, goal, etc.)

        if typeFlags has SAVE_FLAGS (0x10):
            restore entity-specific flags

        if typeFlags has SAVE_FULL (0x20):
            restore hit points + animation frame
            if typeFlags has SAVE_EXTRA (0x02):
                restore additional AI/enemy data block

            // activation/deactivation logic
            if hit points negative:
                deactivate entity, set killed flag
            else:
                if entity newly activated: add to processing chain
                if has AI: activate enemy AI
                sync visibility/collision flags from stored state

            // post-restore: slot entity trigger handling
            if entity is slot type and partially active:
                advance entity type ID to next variant

            // post-restore: pickup unlinking
            if entity is pickup/collectable and killed:
                remove from room entity linked list

        // TR2 vehicle state
        if entity.typeId == 13 or 14:  // boat types
            restore vehicle state (24 bytes)
        else if entity.typeId == 65:   // skidoo
            restore vehicle state (8 bytes)

        // post-restore: push block floor lowering
        if entity is pushBlock and inactive:
            lower floor at entity position
            block pathfinding box

        // post-restore: trapdoor entity handling
        if entity is trapdoor and activated:
            adjust Y position and call init

        // level 13 (Diving Area) drawbridge collision
        if levelId == 13 and room == 20 and entity is drawbridge:
            restore linked collision sectors

        // run entity initialization if init function exists
        if entity has init function:
            call init function
            copy entity data to interpolation buffer
            sync previous position to current

    // restore Lara state
    block copy Lara entity data
    set vehicle flag based on VehicleId
    clear aiming/target state
    restore mesh model pointers (15 slots, offsets relative to mesh base)
    restore frame pointer offsets

    // restore vehicle entity state
    if VehicleId != -1:
        allocate vehicle entity from pool
        restore vehicle type, animation, room, rotation
        set vehicle flags

    // handle Lara's projectile (render flag check)
    if render flag has projectile bit set:
        clear bit
        if Lara not in water state:
            allocate projectile for Lara
            restore projectile state, re-set render flag bit

    restore additional Lara state values (timers, secret count, etc.)

    // restore harpoon projectiles
    harpoonCount = read stored count
    for i = 0 to harpoonCount:
        allocate entity from pool
        set entity type to 152 (harpoon)
        restore position, rotation, flags
        activate entity

    // camera state (demo mode only)
    if mode != 0:
        restore current camera position + room
        restore previous camera position + room
        restore camera target, mode, transition data
        restore camera pointer references

    // statistics / session data
    restore game statistics block
```
