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
- Sound ID 0x1B (27) has special handling for randomisation chance based on OG graphics flags
- Sound ID 0x3C (60) forces looping mode when game version check passes
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
| 2   | `int`     | Flags — bit 0: ambient check, bit 2: pitch override, bit 3: volume override |

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
        // soundId & 0xBFFF gives the actual sound ID
    });
```

### Calling from mod code
```javascript
// Play a sound at Lara's position
const lara = game.readVar(game.module, 'Lara');
game.callFunction(game.module, 'SoundEffect', soundId, lara, 0);

// Play a non-spatial sound (centered, no attenuation)
game.callFunction(game.module, 'SoundEffect', soundId, ptr(0), 2);
```

## Pseudocode
```
function SoundEffect(soundId, position, flags):
    gameVersion = getGameVersion()
    
    // Strip flag bit from soundId
    soundIdClean = soundId & 0xBFFF
    
    // Ambient check
    if flags != 2 and (flags & 1) and ambientDisabled:
        return 0
    
    // Lookup sound sample data
    sampleIndex = soundLookupTable[soundIdClean]
    if sampleIndex == -1:
        mark as invalid (-2)
        return 0
    if sampleIndex == -2:
        return 0
    
    sample = sampleData[sampleIndex]
    
    // Randomisation chance check (game version dependent)
    if gameVersion == 2:
        if sample.chance != 0 and random() < sample.chance:
            return 0
    else:
        // Special handling for sound 0x1B
        if soundIdClean == 0x1B:
            if ogGraphicsFlag2 == 0 or stateCheck == 3:
                sample.chance = 0
            else:
                sample.chance = 0x3FFF
        
        if sample.chance != 0 and random() < sample.chance:
            return 0
    
    range = sample.range * 0x400
    distance = 0
    direction = 0
    
    // Spatial attenuation
    if position != null:
        deltaX = position.x - listenerX
        deltaY = position.y - listenerY
        deltaZ = position.z - listenerZ
        
        // Range check on each axis
        if deltaX < -range or deltaX > range:
            return 0
        if deltaY < -range or deltaY > range:
            return 0
        if deltaZ < -range or deltaZ > range:
            return 0
        
        distanceSq = deltaX² + deltaY² + deltaZ²
        if distanceSq > range²:
            return 0
        
        // Calculate distance with integer sqrt
        if distanceSq >= 0x100000:
            distance = integerSqrt(distanceSq) - 0x400
        
        // Calculate direction for panning
        direction = atan2(deltaZ, deltaX) - listenerYaw
    
    // Calculate volume
    if gameVersion == 2:
        volume = sample.volume << 7
    else:
        volume = sample.volume
    
    if flags & 8:  // volume override
        volume = (flags & 0xF0) << 7
    
    // Volume randomisation
    if (sample.flags & 0x4000) and not (soundId & 0x4000):
        volume -= random() & 0x7FF
    
    // Distance attenuation
    volume = ((0x10000 - distance²/range²) * volume) >> 16
    
    if volume < 1:
        return 0
    if volume > 0x7FFF:
        volume = 0x7FFF
    
    // Calculate pitch
    if flags & 4:
        pitch = (flags >> 8) & 0xFFFFFF
    else:
        pitch = 0x10000
    
    if gameVersion == 2:
        pitch += sample.pitchOffset * 0x200
    
    // Pitch randomisation
    if (sample.flags & 0x2000) and not (soundId & 0x4000):
        pitch = (pitch - 6000) + random(6000)
    
    // Get sample variation
    baseSample = sample.baseSample
    variationCount = (sample.flags >> 2) & 0xF
    if variationCount > 1:
        baseSample += random(variationCount)
    variation = baseSample - sample.baseSample
    
    // Determine channel mode
    channelMode = sample.flags & 3
    
    // Special case: sound 0x3C forces looping
    if gameVersion == 0 and soundIdClean == 0x3C:
        channelMode = 3
    else:
        channelMode++
    
    // Channel mode handling
    if channelMode == 1:  // one-shot, stop if playing
        for i = 0 to 31:
            if channels[i].sampleIndex == sampleIndex:
                if isPlaying(i):
                    return 0
                channels[i].sampleIndex = -1
    
    else if channelMode == 2:  // restart
        for i = 0 to 31:
            if channels[i].sampleIndex == sampleIndex:
                stopChannel(i)
                channels[i].sampleIndex = -1
                break
    
    else if channelMode == 3:  // looping - update if playing
        for i = 0 to 31:
            if channels[i].sampleIndex == sampleIndex:
                if volume <= channels[i].volume:
                    return 0
                channels[i].volume = volume
                channels[i].pan = direction
                channels[i].pitch = pitch
                return 1
    
    // Resolve final sample index with remapping
    finalSample = resolveSampleIndex(soundIdClean, baseSample, variation)
    
    // Play sound
    channelId = playSound(finalSample, volume, pitch, direction, channelMode == 3)
    
    if channelId < 0:
        if channelId == -1:
            // No free channel - find quietest to evict
            quietest = findQuietestChannel()
            if quietest < 0 or channels[quietest].volume > volume:
                return 0
            
            stopChannel(quietest)
            channels[quietest].sampleIndex = -1
            
            channelId = playSound(finalSample, volume, pitch, direction, channelMode == 3)
            if channelId < 0:
                return 0
        else:
            sample.baseSample = -1
            return 0
    
    // Store channel data
    channels[channelId].volume = volume
    channels[channelId].pan = direction
    channels[channelId].pitch = pitch
    channels[channelId].sampleIndex = sampleIndex
    
    return 1
```
