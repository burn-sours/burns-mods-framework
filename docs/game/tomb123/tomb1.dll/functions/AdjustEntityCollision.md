# Function: AdjustEntityCollision

## Description
Adjusts the collision floor height data in the sector beneath an entity by a given vertical amount. Also updates AI navigation box flags to reflect whether the floor was raised or lowered. Used when moveable objects (pushable blocks, trapdoors, elevators, etc.) change the effective floor height at their position.

## Notes
- Reads the entity's position (`ENTITY_X`, `ENTITY_Y`, `ENTITY_Z`) and room (`ENTITY_ROOM`) to resolve the sector via `GetSector`
- Resolves two sectors: one at the entity's current position, and one offset vertically by the adjustment minus 1024 units — the second sector provides a reference ceiling value
- The adjustment is scaled down by 256 (>> 8) before being applied to the sector's floor data
- A sentinel value (0x81) in the sector floor byte indicates an uninitialized state — on first adjustment, the floor data is set relative to the reference sector's ceiling; subsequent adjustments accumulate
- If the adjusted floor reaches the reference ceiling and another sector byte signals no further data, the floor byte is reset to the sentinel value
- Updates a flag on the sector's AI navigation box: raising the floor (negative adjustment) sets a flag bit; lowering it (positive adjustment) clears it — this affects enemy pathfinding over the adjusted area

## Details

| Field     | Value                          |
|-----------|--------------------------------|
| Usage     | `Hook & Call`                  |
| Params    | `pointer, int`                 |
| Return    | `void`                         |

### Parameters

| #   | Type      | Description                                            |
|-----|-----------|--------------------------------------------------------|
| 0   | `pointer` | Pointer to the entity causing the height change        |
| 1   | `int`     | Vertical adjustment amount (positive = lower, negative = raise) |

## Usage
### Hooking
```javascript
// Monitor floor height adjustments
mod.hook('AdjustEntityCollision')
    .onEnter(function(entityPtr, adjustment) {
        log('Floor adjusted by', adjustment, 'at entity position');
    });
```

### Calling from mod code
```javascript
// Adjust the collision floor at an entity's position
const entities = game.readVar(game.module, 'Entities');
const entityPtr = entities.add(entityIndex * ENTITY_SIZE);
game.callFunction(game.module, 'AdjustEntityCollision', entityPtr, adjustmentAmount);
```

## Pseudocode
```
function AdjustEntityCollision(entity, adjustment):
    room = entity[ENTITY_ROOM]
    x = entity[ENTITY_X]
    y = entity[ENTITY_Y]
    z = entity[ENTITY_Z]

    // Get sector at entity's current position
    sector = GetSector(x, y, z, &room)

    // Get sector at offset position (1024 units above the adjustment target)
    refSector = GetSector(x, y + adjustment - 1024, z, &room)

    // Scale adjustment to sector granularity
    scaledAdj = adjustment >> 8

    // Update sector floor height data
    if sector.floorByte == 0x81:
        // Uninitialized — set relative to reference sector ceiling
        sector.floorByte = scaledAdj + refSector.ceilingRef
    else:
        // Accumulate adjustment
        sector.floorByte += scaledAdj
        // Reset to sentinel if floor matches reference ceiling
        if sector.floorByte == refSector.ceilingRef AND sector.noFloorData:
            sector.floorByte = 0x81

    // Update AI navigation box flags
    boxIndex = sector.boxIndex
    boxFlags = boxes[boxIndex].flags
    if boxFlags is negative (blocked box):
        if adjustment < 0:
            boxFlags |= 0x4000    // mark as raised
        else:
            boxFlags &= ~0x4000   // clear raised flag
        boxes[boxIndex].flags = boxFlags
```
