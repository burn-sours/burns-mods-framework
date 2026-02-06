# Function: GetAlternateId

## Description
Returns the alternate model ID for a given model ID. Every inventory-related item type has two valid model IDs (original and alternate). This function maps between the two, allowing either ID to resolve to the other. Used internally by functions like AddItemToInventory to normalise model IDs before processing.

## Notes
- Pure lookup table — no side effects, no memory access
- All mappings are bidirectional pairs (A→B and B→A), with one exception: four IDs (143, 144, 145, 146) all map to 150 with no reverse
- Returns `-1` when the given ID has no alternate
- Covers all pickup types: weapons, ammo, medipacks, puzzle items, keys, lead bars, scions

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
    switch modelId:
        72  ↔ 82          // Pair 1
        84  ↔ 99          // Pistols
        85  ↔ 100         // Shotgun
        86  ↔ 101         // Magnums
        87  ↔ 102         // Uzis
        89  ↔ 104         // Shotgun Shells
        90  ↔ 105         // Magnum Clips
        91  ↔ 106         // Uzi Clips
        93  ↔ 108         // Small Medipack
        94  ↔ 109         // Large Medipack
        110 ↔ 114         // Puzzle 1
        111 ↔ 115         // Puzzle 2
        112 ↔ 116         // Puzzle 3
        113 ↔ 117         // Puzzle 4
        126 ↔ 127         // Lead Bar
        129 ↔ 133         // Key 1
        130 ↔ 134         // Key 2
        131 ↔ 135         // Key 3
        132 ↔ 136         // Key 4
        141 ↔ 148         // Scion 1
        142 ↔ 149         // Scion 2
        143, 144, 145, 146 → 150  // Scion 3 (one-way)
        default: return -1
```
