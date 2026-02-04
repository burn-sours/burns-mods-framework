# Function: ProcessTriggers

## Description
Processes sector trigger data when Lara or a heavy entity steps on a triggered sector. This is the core trigger execution system — it reads trigger commands embedded in the level's floor data and performs actions like activating entities, switching cameras, flipping rooms, completing levels, playing music, and collecting secrets.

## Notes
- Trigger data is a sequence of 16-bit words read from sector floor data, passed as a pointer
- The heavy trigger flag distinguishes between Lara stepping on a sector (0) and a heavy entity like a rolling boulder (non-zero) — heavy triggers only fire for trigger type 5
- Each trigger has a **type** (6 bits) that determines the activation condition, and a **command list** that determines what happens when activated
- Entity activation uses a 5-bit mask system on `ENTITY_FLAGS` — trigger mode controls whether the mask bits are toggled, cleared, or set. When all 5 mask bits (0x3E00) are set, the entity fully activates
- Timer values from the trigger data are written to `ENTITY_TIMER`, scaled by 30 (×0x1E) unless the timer is 1 (instant)
- Death triggers (type 5 in the first byte) fire immediately when Lara's Y position matches her base position, calling a separate death handler
- Secret collection (command type 10) tracks found secrets per-level via a bitfield, plays the secret chime, and updates achievement stats grouped by level ranges

### Trigger Types

| Type | Name       | Condition                                                    |
|------|------------|--------------------------------------------------------------|
| 1    | Standard   | Lara is standing on the floor                                |
| 2    | Pad        | Linked entity is in a specific state with timer              |
| 3    | Switch     | Linked entity is active and `LaraGunType` is not 1           |
| 4    | Key        | Linked entity is in consumed state                           |
| 5    | Heavy      | Only fires for heavy triggers (boulders, etc.)               |
| 6    | Pickup     | Level-specific; checks Lara's animation state                |
| 7    | Combat     | `LaraGunType` is 4                                           |
| 8    | Antipad    | Returns immediately (blocks trigger processing)              |

### Command Types

| Type | Name              | Action                                                 |
|------|-------------------|--------------------------------------------------------|
| 0    | Entity            | Activate/deactivate an entity via mask and timer       |
| 1    | Camera            | Trigger a camera angle change with timer/transition    |
| 2    | Camera target     | Set camera look-at position                            |
| 3    | Flip map          | Apply mask to `FlipMapFlags`, trigger `FlipMap` when ready |
| 4    | Flip on           | Trigger `FlipMap` if all flags set and currently off   |
| 5    | Flip off          | Trigger `FlipMap` if all flags set and currently on    |
| 6    | Camera entity     | Set camera to track a specific entity                  |
| 7    | Level complete    | Sets `LevelCompleted` to 1                             |
| 8    | Flip effect       | Call a flip effect function                            |
| 9    | Music             | Set a music track to play                              |
| 10   | Secret            | Collect a secret (sound, stats, per-level counter)     |

## Details

| Field     | Value                          |
|-----------|--------------------------------|
| Usage     | `Hook & Call`                  |
| Params    | `pointer, int`                 |
| Return    | `void`                         |

### Parameters

| #   | Type      | Description                                                |
|-----|-----------|------------------------------------------------------------|
| 0   | `pointer` | Pointer to trigger data from sector floor data             |
| 1   | `int`     | Heavy trigger flag — 0 for Lara, non-zero for heavy entity |

## Usage
### Hooking
```javascript
// Monitor all trigger activations
mod.hook('ProcessTriggers')
    .onEnter(function(triggerPtr, isHeavy) {
        if (triggerPtr.isNull()) return;
        const triggerWord = triggerPtr.readU16();
        const triggerType = (triggerWord >> 8) & 0x3F;
        log('Trigger type:', triggerType, 'heavy:', isHeavy);
    });
```

### Calling from mod code
```javascript
// Manually fire trigger data from a sector
const roomId = game.alloc(2);
roomId.writeU16(currentRoom);
const sector = game.callFunction(game.module, 'GetSector', x, y, z, roomId);
game.callFunction(game.module, 'ProcessTriggers', sector, 0);
```

## Pseudocode
```
function ProcessTriggers(trigger, isHeavyTrigger):
    if trigger == null:
        return

    triggerWord = trigger[0]
    shouldFlipMap = false
    musicTrack = -1

    // Death trigger (first byte == 5)
    if (triggerWord & 0xFF) == 5:
        if not isHeavyTrigger AND Lara is on floor:
            deathTrigger(trigger)
        if trigger ends: return
        // advance past death trigger byte
        triggerWord = trigger[1]
        trigger += 1

    triggerType = (triggerWord >> 8) & 0x3F
    triggerMask = trigger[1] & 0x3E00
    timerValue = trigger[1] & 0xFF
    commands = trigger + 2

    // Camera pre-processing: scan commands for camera targets
    if cameraMode != 5:
        scan commands for camera (type 1) and camera entity (type 6)
        update camera tracking state

    // Check trigger activation condition
    switch triggerType:
        case 1 (standard): if Lara not on floor → return
        case 2 (pad):      check linked entity state/timer → return if not met
        case 3 (switch):   check linked entity active, LaraGunType != 1
        case 4 (key):      check linked entity consumed
        case 5 (heavy):    only valid for heavy triggers
        case 6 (pickup):   level-specific Lara animation check
        case 7 (combat):   if LaraGunType != 4 → return
        case 8 (antipad):  return immediately
        heavy trigger:     only process if triggerType == 5

    // Process command list
    for each command in commands:
        targetId = command & 0x3FF
        commandType = (command >> 10) & 0xF

        switch commandType:
            case 0 (entity):
                entity = entities[targetId]
                set entity[ENTITY_TIMER] from timerValue
                apply triggerMask to entity[ENTITY_FLAGS] (toggle/clear/set)
                if all mask bits set (0x3E00):
                    activate entity (update ENTITY_STATUS, link into processing list)
                    if entity has AI behaviour: activateEnemyAI(targetId)

            case 1 (camera):
                read extra camera data word
                set camera timer, transition mode
                optionally mark as one-shot

            case 2 (camera target):
                set camera look-at position from camera data

            case 3 (flip map):
                apply triggerMask to FlipMapFlags[targetId]
                if all flags set: shouldFlipMap = true
                else if FlipMapStatus is on: shouldFlipMap = true

            case 4 (flip on):
                if FlipMapFlags all set AND FlipMapStatus off: shouldFlipMap = true

            case 5 (flip off):
                if FlipMapFlags all set AND FlipMapStatus on: shouldFlipMap = true

            case 6 (camera entity):
                set camera to track entity at targetId

            case 7 (level complete):
                LevelCompleted = 1

            case 8 (flip effect):
                call flipEffect(targetId, triggerData, triggerType)

            case 9 (music):
                musicTrack = targetId

            case 10 (secret):
                if secret not already found:
                    mark secret as found in bitfield
                    play secret chime
                    increment per-level secret counter
                    update achievement stats by level group

        // command list ends when high bit is set

    // Post-processing
    if camera entity was set and camera mode allows:
        update camera tracking target

    if shouldFlipMap:
        FlipMap()
        if musicTrack valid: set music track
```
