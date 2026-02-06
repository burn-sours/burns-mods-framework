# Function: SoundEffect

## Description
Plays a sound effect. Handles 3D spatial audio positioning, volume attenuation based on distance from the listener, pitch variation, and sound channel management.

Looks up the sound ID in a sample table to get playback properties (volume, pitch, range, randomisation flags, channel mode). If a position is provided, calculates distance and direction from the listener and attenuates volume accordingly — sounds outside the range are culled. Manages a pool of 32 active sound channels, handling channel modes for looping, restarting, and one-shot sounds.

## Notes
- Sound ID `0x4000` bit is used as a flag (stripped before lookup)
- If the position pointer is null, the sound plays without spatial attenuation (full volume, no panning)
- Volume randomisation flag (`0x4000` on sample flags) applies random volume reduction
- Pitch randomisation flag (`0x2000` on sample flags) applies random pitch variation
- Channel modes control how sounds interact: mode 1 restarts if already playing, mode 2 stops existing, mode 3 updates volume/pan if already playing (looping)
- Distance attenuation uses an integer square root approximation
- The active channel pool holds up to 32 simultaneous sounds
- If no free channel is available, the quietest active sound is evicted
- Game version affects volume scaling (version 2 uses a different multiplier)
- Sound ID 0x1B has special handling for randomisation chance based on a graphics flag
- Returns 0 on failure, 1 on success

## Details

| Field     | Value                   |
|-----------|-------------------------|
| Usage     | `Hook & Call`           |
| Params    | `int, pointer, int`     |
| Return    | `int`                   |

### Parameters

| #   | Type      | Description                                              |
|-----|-----------|----------------------------------------------------------|
| 0   | `int`     | Sound effect ID (bit 14 used as a flag)                  |
| 1   | `pointer` | Position in world space (X, Y, Z) or null for non-spatial |
| 2   | `int`     | Flags — bit 0: ambient check, bit 2: custom volume in upper bits, bit 3: override volume |

### Return Values

| Value | Description                              |
|-------|------------------------------------------|
| `0`   | Sound failed to play (culled, no channel, or invalid ID) |
| `1`   | Sound played successfully                |

## Usage
### Hooking
```javascript
mod.hook('SoundEffect')
    .onEnter(function(soundId, pos, flags) {
        log('Sound:', soundId & 0xBFFF, 'Flags:', flags);
    });
```

### Calling from mod code
```javascript
// Play a sound at Lara's position
const lara = game.readVar(game.module, 'Lara');
game.callFunction(game.module, 'SoundEffect', soundId, lara, 0);

// Play a non-spatial sound
game.callFunction(game.module, 'SoundEffect', soundId, ptr(0), 2);
```

## Pseudocode
```
function SoundEffect(soundId, position, flags):
    strip flag bit from soundId

    // ambient check
    if flags indicate ambient and ambient is disabled:
        return 0

    // lookup sound sample data
    sampleIndex = soundLookupTable[soundId]
    if sampleIndex invalid:
        return 0

    sample = sampleData[sampleIndex]

    // randomisation chance check
    if sample has random chance and random fails:
        return 0

    range = sample.range * 0x400
    distance = 0

    // spatial attenuation
    if position != null:
        delta = position - listenerPosition
        if any axis delta out of range:
            return 0
        distanceSq = deltaX² + deltaY² + deltaZ²
        if distanceSq > range²:
            return 0
        distance = integerSqrt(distanceSq) - 0x400
        direction = atan2(deltaZ, deltaX) - listenerYaw

    // calculate volume
    volume = sample.volume (scaled by game version)
    if flags override volume:
        volume = flags upper bits
    if sample has volume randomisation:
        apply random reduction
    volume = attenuate by distance/range ratio
    clamp volume to 1..0x7FFF

    // calculate pitch
    pitch = base pitch
    if sample has pitch randomisation:
        apply random variation

    // resolve sample index with variation
    sampleVariation = sample.variationCount
    if variation > 1:
        pick random variation offset

    // channel management
    channelMode = sample.channelMode
    if channelMode == looping and already playing:
        update existing channel volume/pan
        return 1
    if channelMode == restart and already playing:
        stop existing, play new
    if channelMode == one-shot and already playing:
        return 0

    // play sound
    channelId = allocateChannel(sampleIndex, volume, pitch, pan, looping)
    if channelId < 0:
        // no free channel — evict quietest if new sound is louder
        evict quietest channel
        retry allocateChannel
        if still fails:
            return 0

    store channel data (volume, pan, pitch, sampleIndex)
    return 1
```
