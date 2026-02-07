# Function: InitializeLevelAI

## Description
Initializes AI navigation data when a level starts. Allocates a structure from the memory pool containing 20 pathfinding slots, each backed by a box array sized to the level's `boxCount`. Resets the active enemy AI counter.

Each slot is initialized with a `0xFFFF` marker and an associated box array for AI navigation lookups. The allocations come from a contiguous memory pool, advancing the pool position with each allocation.

## Notes
- Allocates a 0x6E0 byte structure from the memory pool for the AI data
- Each of the 20 slots gets a `boxCount * 8` byte box array
- If the pool doesn't have enough space for a box array, that slot gets a null pointer
- Resets `totalActiveEnemiesAI` to 0
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
        // level AI is initialized, safe to read Lara pointer etc.
        game._lara = game.readVar(game.module, 'Lara');
    });
```

## Pseudocode
```
function InitializeLevelAI():
    allocate 0x6E0 bytes from memory pool for AI structure

    for each slot (0–19):
        set slot marker = 0xFFFF
        if pool has enough space (boxCount * 8):
            allocate box array from pool
            assign to slot
        else:
            assign null to slot

    totalActiveEnemiesAI = 0
```
