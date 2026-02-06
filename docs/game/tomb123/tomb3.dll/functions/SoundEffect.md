# Function: SoundEffect

## Description
Plays a sound effect, optionally positioned in 3D space relative to the camera. Handles volume attenuation based on distance, stereo panning, pitch variation, and manages up to 32 concurrent sound channels with priority-based replacement.

## Notes
- Sound ID can have flag 0x4000 to disable randomization effects
- If position is null, sound plays at full volume with no panning (2D sound)
- Distance attenuation uses squared falloff within the sound's defined range
- Supports three playback modes: one-shot, restart (stops existing instance), and looping
- Randomly varies pitch and volume when enabled in sound definition
- Will replace lower-priority sounds when all 32 channels are in use
- Special handling for sound ID 0x1B (footsteps) based on surface type
- Special handling for sound ID 0x3C (underwater ambience) forces looping

## Details

| Field     | Value                             |
|-----------|-----------------------------------|
| Usage     | `Call` / `Hook`                   |
| Params    | `int` soundId, `pointer` position, `int` flags |
| Return    | `int`                             |

## Parameters
- **soundId**: Sound effect identifier from the level's sound map. Can be OR'd with 0x4000 to disable pitch/volume randomization.
- **position**: Pointer to 3D coordinates (x, y, z as int32s) for spatial audio, or null for non-positional sound.
- **flags**: Playback flags:
  - Bit 0 (0x1): Conditional playback check
  - Bit 2 (0x4): Use custom pitch from upper 24 bits
  - Bit 3 (0x8): Use custom volume from bits 4-7

## Return Values
- **1**: Sound started successfully
- **0**: Sound not played (out of range, failed randomization check, no free channels, or invalid sound ID)

## Usage
### Calling
```javascript
// Play a sound at Lara's position
const laraPos = game.readVar(game.module, 'Lara');
game.call('SoundEffect', [soundId, laraPos, 0]);

// Play a 2D UI sound (no position)
game.call('SoundEffect', [soundId, ptr(0), 0]);

// Play with custom pitch (higher 24 bits)
const customPitch = 0x12000; // slightly higher pitch
game.call('SoundEffect', [soundId, position, 0x4 | (customPitch << 8)]);
```

### Hooking
```javascript
mod.hook('SoundEffect')
    .onEnter(function(soundId, position, flags) {
        // Block a specific sound
        if (soundId === 0x50) {
            this.skip = true;
        }
    })
    .onLeave(function(returnValue, soundId, position, flags) {
        if (returnValue === 1) {
            console.log('Sound played:', soundId);
        }
    });
```
