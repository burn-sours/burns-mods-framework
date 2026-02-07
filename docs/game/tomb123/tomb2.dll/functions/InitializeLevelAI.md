# Function: InitializeLevelAI

## Description
Initializes AI navigation data when a level starts. Allocates a structure from the memory pool containing 21 pathfinding slots, each backed by a box array sized to the level's `boxCount`. Resets the active enemy AI counter.

Each slot is initialized with a `0xFFFF` marker and an associated box array for AI navigation lookups. The allocations come from a contiguous memory pool, advancing the pool position with each allocation.

## Notes
- Allocates a 0x6E0 byte structure from the memory pool for the AI data
- TR2 has 21 slots (vs tomb1's 20)
- Each slot gets a `boxCount * 8` byte box array
- If the pool doesn't have enough space for a box array, that slot gets a null pointer
- Resets active enemy counter to 0
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
    // Allocate AI structure from memory pool
    if poolRemaining > 0x6DF:
        poolRemaining -= 0x6E0
        poolOffset += 0x6E0
        aiStruct = allocateFromPool(0x6E0)
    
    // Initialize 21 AI slots
    slotOffsets = [0x18, 0x70, 0xC8, 0x120, 0x178, 0x1D0, 0x228, 
                   0x280, 0x2D8, 0x330, 0x388, 0x3E0, 0x438, 0x490,
                   0x4E8, 0x540, 0x598, 0x5F0, 0x648, 0x6A0, 0x6B8]
    
    boxArraySize = boxCount * 8
    
    for each slotOffset in slotOffsets:
        aiStruct[slotOffset] = 0xFFFF  // marker = none
        
        if poolRemaining >= boxArraySize:
            // Allocate box array for this slot
            boxArray = allocateFromPool(boxArraySize)
            aiStruct[slotOffset - 0x18 + 0x30] = boxArray
        else:
            aiStruct[slotOffset - 0x18 + 0x30] = null
    
    activeEnemyAICount = 0
```
