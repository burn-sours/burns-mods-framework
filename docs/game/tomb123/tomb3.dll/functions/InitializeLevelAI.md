# Function: InitializeLevelAI

## Description
Initializes AI navigation data when a level starts. Unlike TR1/TR2, TR3 allocates **two** AI structures from the memory pool. The first structure contains 21 pathfinding slots with markers and box arrays. The second structure contains 20 slots with markers only (no box arrays). Both active enemy AI counters are reset.

## Notes
- Allocates two 0x6E0 byte structures from the memory pool
- First structure: 21 slots with markers (`0xFFFF`) and box array pointers
- Second structure: 20 slots with markers only (no box arrays allocated)
- Each box array in the first structure is sized to `boxCount * 8` bytes
- If the pool lacks space for a box array, that slot gets a null pointer
- Resets two active enemy counters to 0
- This is a good hook point for mods that need to run setup when a level loads (for UI text labels, use `ResetUiTexts` instead — it runs after this and clears the text pool first)

## Details

| Field     | Value    |
|-----------|----------|
| Usage     | `Hook`   |
| Params    | *(none)* |
| Return    | `void`   |

## Usage
### Hooking
```javascript
mod.hook('InitializeLevelAI')
    .onLeave(function(returnValue) {
        // Level AI is initialized, safe to read Lara pointer etc.
        game._lara = game.readVar(game.module, 'Lara');
    });
```

## Pseudocode
```
function InitializeLevelAI():
    // Allocate first AI structure from memory pool
    if poolRemaining > 0x6DF:
        poolRemaining -= 0x6E0
        poolOffset += 0x6E0
        aiStruct1 = allocateFromPool(0x6E0)
    
    // Initialize 21 slots in first structure (markers + box arrays)
    boxArraySize = boxCount * 8
    
    for each of 21 slots:
        aiStruct1[markerOffset] = 0xFFFF
        
        if poolRemaining >= boxArraySize:
            boxArray = allocateFromPool(boxArraySize)
            aiStruct1[boxArrayOffset] = boxArray
        else:
            aiStruct1[boxArrayOffset] = null
    
    activeEnemyAICount1 = 0
    
    // Allocate second AI structure from memory pool
    if poolRemaining > 0x6DF:
        poolRemaining -= 0x6E0
        poolOffset += 0x6E0
        aiStruct2 = allocateFromPool(0x6E0)
    
    // Initialize 20 slots in second structure (markers only, no box arrays)
    for each of 20 slots:
        aiStruct2[markerOffset] = 0xFFFF
    
    activeEnemyAICount2 = 0
```
