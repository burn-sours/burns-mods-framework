# Function: LoadLevel

## Description
Loads a level by ID. Plays any associated FMV cutscenes, loads level assets, runs the level lifecycle, and handles post-level flow (level completion, menu selection, save/load, death).

Specific level IDs trigger FMV playback before loading (e.g. intro cutscenes between levels). After loading assets, it optionally backs up world state via `RecordWorldState` if a pending state exists. The level lifecycle then runs until it returns a result code.

Post-level, the return value determines what happens next: level completion advances to the next level (with save data propagation), menu selection can trigger save restore or level restart, and death returns to the title screen.

## Notes
- FMV cutscenes are hardcoded to specific level IDs (0, 1, 5, 10, 13, 14)
- Sets `LevelId` globally before loading assets
- Calls `RecordWorldState(0)` if there's a pending world state backup
- Return value `0x100` means return to title/menu
- Return value with `0x140` flag means level completed (level ID OR'd with `0x140`)
- Return value `0x19` means a save was loaded (world state restored from backup)
- Level 0x19 skips directly to asset loading without FMV or reset
- Save data is copied forward from the previous level on certain level transitions

## Details

| Field     | Value                                  |
|-----------|----------------------------------------|
| Usage     | `Hook`                                 |
| Params    | `int, pointer, pointer, pointer`       |
| Return    | `pointer`                              |

### Parameters

| #   | Type      | Description                    |
|-----|-----------|--------------------------------|
| 0   | `int`     | Level ID to load               |
| 1   | `pointer` | Context parameter (unknown)    |
| 2   | `pointer` | Context parameter (unknown)    |
| 3   | `pointer` | Asset file handle              |

## Usage
### Hooking
```javascript
mod.hook('LoadLevel')
    .onEnter(function(levelId, param2, param3, assetFile) {
        log('Loading level:', levelId);
    });
```

## Pseudocode
```
function LoadLevel(levelId, param2, param3, assetFile):
    // play FMV cutscenes for specific levels
    switch levelId:
        case 0:  playFMV("MANSION.FMV")
        case 1:  playFMV("CAFE.FMV"), playFMV("SNOW.FMV")
        case 5:  playFMV("LIFT.FMV")
        case 10: playFMV("VISION.FMV")
        case 13: playFMV("CANYON.FMV")
        case 14: playFMV("PYRAMID.FMV")

    set LevelId = levelId
    reset level state

    // load level data
    if loadLevelAssets(levelId, assetFile) fails:
        set LevelId = 0
        return 0x100

    // backup world state if pending
    if pending world state exists:
        RecordWorldState(0)
        process pending state
        clear pending flag

    // run level
    result = levelLifecycle(0)
    if result == 0x100:
        return 0x100  // title screen

    if level completed:
        if LevelId != 0:
            return LevelId | 0x140
        // check for all-secrets bonus
        return 0x100

    if MenuSelection != 0:
        if loading a save:
            restore WorldStateBackupPointer from save data
            return 0x19
        if restarting level:
            copy save data from previous level
            return LevelId

    return 0x100  // default: return to title
```
