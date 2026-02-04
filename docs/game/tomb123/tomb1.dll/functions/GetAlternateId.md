# Function: GetAlternateId

## Description
Returns the alternate model ID for a given model ID. Every inventory-related item type has two valid model IDs (original and alternate). This function maps between the two, allowing either ID to resolve to the other. Used internally by functions like AddItemToInventory to normalise model IDs before processing.

## Notes
- Pure lookup table — no side effects, no memory access
- All mappings are bidirectional pairs (A→B and B→A), with one exception: four IDs (143, 144, 145, 146) all map to 150 with no reverse
- Returns `-1` when the given ID has no alternate
- Covers all pickup types: weapons, ammo, medipacks, puzzle items, keys, quest items

## Details

| Field     | Value                          |
|-----------|--------------------------------|
| Usage     | `Call`                         |
| Params    | `int`                          |
| Return    | `int`                          |

### Parameters

| #   | Type  | Description                              |
|-----|-------|------------------------------------------|
| 0   | `int` | Model ID to convert                      |

### Return Values

| Value | Description                                |
|-------|--------------------------------------------|
| `≥ 0` | The alternate model ID for the given input |
| `-1`  | No alternate exists for this model ID      |

## Usage
### Calling from mod code
```javascript
// Get the alternate model ID for a given item
const alternateId = game.callFunction(game.module, 'GetAlternateId', 0x48);
// alternateId = 0x52

// Check if an ID has an alternate
const result = game.callFunction(game.module, 'GetAlternateId', 0x10);
// result = -1 (no alternate)
```

## Pseudocode
```
function GetAlternateId(modelId):
    // Lookup table of bidirectional pairs
    // Each inventory item type has an original and alternate model ID
    // The function maps original → alternate and alternate → original

    match modelId against known pairs:
        if found: return the paired alternate ID
        default: return -1
```
