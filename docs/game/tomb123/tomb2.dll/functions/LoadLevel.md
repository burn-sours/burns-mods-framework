# Function: LoadLevel

## Description
Loads a level by ID. Handles initialization, loads level assets, runs the level lifecycle, and handles post-level flow (level completion, menu selection, save/load, death).

After loading assets, it optionally backs up world state via `RecordWorldState` if a pending state exists. The level lifecycle then runs until it returns a result code. Post-level, the return value determines what happens next.

## Notes
- Sets `LevelId` globally before loading assets
- Mode parameter (param_2) affects initialization:
  - Mode 2: minimal reset, preserves some state
  - Other modes: full reset, clears counters and stats
- Calls `RecordWorldState(0)` if there's a pending world state backup
- Return codes:
  - `0x400`: Special exit condition from lifecycle
  - `0x500`: Level complete or death (return to title)
  - `0x600 | levelId`: Continue to next level
  - `0x700`: Error/abort
  - `0x100 | saveSlot`: Save was loaded
  - `levelId + 1`: Level restart
  - `levelId`: State copied from previous level
- Level-specific save data propagation for certain level ranges (2-16, 20-22)

## Details

| Field     | Value                                  |
|-----------|----------------------------------------|
| Usage     | `Hook`                                 |
| Params    | `int, int, pointer, pointer`           |
| Return    | `pointer`                              |

### Parameters

| #   | Type      | Description                    |
|-----|-----------|--------------------------------|
| 0   | `int`     | Level ID to load               |
| 1   | `int`     | Mode (1=?, 2=minimal, 3=?)     |
| 2   | `pointer` | Context parameter              |
| 3   | `pointer` | Asset file handle              |

### Return Values

| Value              | Description                              |
|--------------------|------------------------------------------|
| `0x400`            | Special lifecycle exit                   |
| `0x500`            | Return to title (death or completion)    |
| `0x600 \| levelId` | Advance to next level                    |
| `0x700`            | Error/abort, sets LevelId to 0           |
| `0x100 \| slot`    | Save was loaded from slot                |
| `levelId + 1`      | Restart current level                    |
| `levelId`          | Continue with state from previous level  |

## Usage
### Hooking
```javascript
mod.hook('LoadLevel')
    .onEnter(function(levelId, mode, param3, assetFile) {
        // levelId: which level to load
        // mode: affects initialization behavior
    })
    .onLeave(function(returnValue, levelId, mode, param3, assetFile) {
        // returnValue indicates what happens next
    });
```

## Pseudocode
```
function LoadLevel(levelId, mode, param3, assetFile):
    // Set global level ID
    LevelId = levelId
    
    // Initialize based on mode
    if mode >= 1 and mode <= 3 and mode == 2:
        clearPartialState()
    else:
        fullLevelReset(levelId)
        clearAllCounters()
    
    // Load level assets
    if loadLevelAssets(levelId, mode, param3, assetFile) fails:
        LevelId = 0
        return 0x700
    
    // Backup world state if pending
    if pendingWorldState != -1:
        if saveFlag:
            worldStateBackupFlag = 1
        RecordWorldState(0)
        processPendingState(pendingWorldState, mode, param3, assetFile)
        pendingWorldState = -1
        worldStateBackupFlag = 0
    
    // Run level lifecycle
    result = levelLifecycle(0)
    
    // Handle lifecycle result
    if result == 0x400 or result == 0x500:  // with mask check
        return result
    
    if result == 0x700:
        LevelId = 0
        return 0x700
    
    // Handle level completion
    if levelComplete != 0:
        if (specialFlag & 1) == 0 or saveFlag == 0:
            if LevelId != 0:
                return LevelId | 0x600
        return 0x500
    
    // Handle menu selection
    if MenuSelection != 0:
        if loadMode == 0:
            // Load save
            saveData = getSaveData(saveSlot)
            if saveData.valid:
                copyToWorldStateBackup(saveData)
            return saveSlot | 0x100
        
        if loadMode == 1:
            if menuType != 5:
                return saveSlot + 1
            
            // Level restart with state copy
            if levelId in [2..16] or levelId in [20..22]:
                // Copy save data from previous level
                copyLevelSaveData(levelId - 1, levelId)
                return levelId
            
            fullLevelReset(levelId)
            return levelId
    
    return 0x500  // default: return to title
```
