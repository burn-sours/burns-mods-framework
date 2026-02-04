# Function: RestoreWorldState

## Description
Restores the game world state from a previously recorded buffer, reversing the work of RecordWorldState. Rebuilds inventory, flip map state, entity positions/states, Lara's full state, and mesh model pointers. Handles special geometry adjustments for push blocks, moving blocks, and thor hammer entities during restoration.

## Notes
- Param 0 selects the restore mode: 0 = full backup restore (from WorldStateBackupPointer at offset 0x6DD), non-zero = replay restore (from worldStateRestorePointer, requires "DEMO" signature at the start)
- In replay mode (non-zero), restores RNG seed and camera state; in backup mode (0) these are skipped
- If replay mode buffer doesn't have the "DEMO" signature (0x4F4D4544), the function aborts early
- Inventory restoration is complex: weapons consolidate their ammo pickups (e.g. picking up a shotgun absorbs all loose shotgun shells into ammo count), alternate model IDs are resolved, and New Game Plus restricts medipacks in certain levels/difficulties
- Entity restoration selectively reads position, animation, flags, and AI data based on per-type flags in the entity type table — same flags used by RecordWorldState
- Push blocks, moving blocks, and thor hammer handle entities trigger floor height adjustments and pathfinding box updates during restore
- Pickup entities that were collected get unlinked from their room's entity linked list
- Lara's mesh model pointers are rebuilt from stored offsets relative to the mesh pointer base
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
| 0   | `int` | Restore mode — 0 = full backup restore, non-zero = replay restore with camera state |

## Usage
### Hooking
```javascript
mod.hook('RestoreWorldState')
    .onEnter(function(mode) {
        // mode: 0 = full backup restore, non-zero = replay restore
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
        restoreStatePointer = &WorldStateBackupPointer
        restoreStateOffset = 0x6DD
    else:
        restoreStatePointer = worldStateRestorePointer
        if signature != "DEMO":
            abort (clear flag and return)
        restore RNG seed
        restoreStateOffset = 0x0C

    // restore game version/patch info
    restore levelId and related state

    // restore inventory — per item type with weapon consolidation
    for each item type (scion1, scion2, puzzle1-4, key1-4, lead bar,
                         pistols, shotgun, magnums, uzis, ammo types,
                         small/large medipacks):
        count = stored count for this item type
        repeat count times:
            resolve model ID (check alternate IDs if needed)
            check if item fits weapon/item slots

            // weapon consolidation logic:
            if item is shotgun:
                absorb all loose shotgun shells → ammo count (+12 each)
                add shotgun to inventory
                update entity model IDs
            if item is magnums:
                absorb all loose magnum clips → ammo count (+50 each)
                add magnums to inventory
                update entity model IDs
            if item is uzis:
                absorb all loose uzi clips → ammo count (+100 each)
                add uzis to inventory
                update entity model IDs

            // ammo without weapon:
            if item is shotgun shells and no shotgun: add shells to inventory
            if item is magnum clips and no magnums: add clips to inventory
            if item is uzi clips and no uzis: add clips to inventory

            // ammo with weapon already owned:
            if item is ammo and weapon exists: add directly to ammo count

            // new game plus medpack restrictions:
            if New Game Plus active:
                skip medipacks on certain levels/difficulties

            // keys, puzzles, scions, lead bar: add directly
            add item to inventory

    // restore flip map state
    if stored flip map flag != 0:
        flipMap()
    restore FlipMapFlags (5 values)
    restore flip effect status
    restore flip effect flags (256 bytes, block copy)

    // restore camera trigger flags
    for each camera:
        restore camera flag word

    // restore entity state
    for each entity:
        typeFlags = entityTypeTable[entity.typeId]

        // pre-restore: undo push block floor modifications
        if entity is pushBlock and not fully active:
            raise floor at entity position (+4 quarter-blocks)
            unblock pathfinding box

        // pre-restore: undo moving block floor modifications
        if entity is movingBlock:
            raise floor at entity position (+8 quarter-blocks)
            unblock pathfinding box

        // pre-restore: thor hammer handle collision
        if entity is thorHammerHandle and animation state == 3:
            offset position by rotation direction
            adjust collision floor height (+0x800)
            restore original position

        if typeFlags has SAVE_POSITION:
            restore x, y, z, speed, rotation
            if room changed: changeRoom()
            if entity type count > 1: recalculate floor height

        if typeFlags has SAVE_ANIM:
            restore animation state fields (id, frame, goal, etc.)

        if typeFlags has SAVE_FLAGS:
            restore entity-specific flags

        if typeFlags has SAVE_FULL:
            restore hit points + animation frame
            if typeFlags has SAVE_EXTRA:
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
                adjust entity type ID (+4)

            // post-restore: mutant spawn
            if entity is mutantSpawn and killed:
                set touch bits, clear visibility

            // post-restore: pickup unlinking
            if entity is pickup/collectable and killed:
                remove from room entity linked list

        // post-restore: moving block floor lowering
        if entity is movingBlock and animation state != 2:
            lower floor at entity position (-8 quarter-blocks)
            block pathfinding box

        // post-restore: thor hammer handle collision
        if entity is thorHammerHandle and animation state == 3:
            offset position by rotation direction
            adjust collision floor height (-0x800)
            restore original position

        // post-restore: weapon drop entities
        if entity is scion holder and health <= 0 and has scion:
            drop linked entities
        if entity is uzi holder and health <= 0 and no uzis:
            drop linked entities
        if entity is magnum holder and health <= 0 and no magnums:
            drop linked entities
        if entity is shotgun holder and health <= 0 and no shotgun:
            drop linked entities

        // post-restore: push block floor lowering
        if entity is pushBlock and inactive:
            lower floor at entity position (-4 quarter-blocks)
            block pathfinding box

        // post-restore: save/restore collision data
        if typeFlags has SAVE_FULL:
            restore extended collision/trigger data (16 bytes)

        // run entity initialization if init function exists
        if entity has init function:
            call init function
            copy entity data to interpolation buffer
            sync previous position to current

    // restore Lara state
    block copy Lara entity data
    clear aiming/target state
    restore 15 mesh model pointers (offsets relative to mesh base)
    restore frame pointer offsets

    // handle Lara's projectile (render flag check)
    if render flag has projectile bit set:
        clear bit
        if Lara not in water state:
            allocate projectile for Lara
            restore projectile state, re-set render flag bit

    restore additional Lara state values

    // camera state (replay mode only)
    if mode != 0:
        restore current camera position + room
        restore previous camera position + room
        restore camera target, mode, transition data
        restore camera pointer references

    // statistics / session data
    restore game statistics block
```
