# Function: GetBonePosition

## Description
Calculates the world position of a specific bone on an entity, with an optional local offset. Loads the bone's pre-computed transform matrix from the entity data, applies a translation offset, converts from fixed-point to world units, and adds the entity's world position. The result is written to the output buffer.

## Notes
- The `outputPos` buffer serves dual purpose: on input it contains a local offset (x, y, z) to apply before the transform; on output it receives the final world position
- Pass zeroes in the output buffer for no offset — the result will be the bone's raw world position
- Each entity stores per-bone transform matrices (48 bytes per bone, 3 rows × 4 values) used by the rendering system
- The bone index selects which bone's transform to use (0–14 for standard entities, varies by model)
- Fixed-point conversion: matrix translation values are shifted right by 14 bits to convert to world units
- Uses the engine's matrix stack internally (push/pop) — safe to call without side effects
- Widely used across entity AI for attack hit positions, muzzle flash origins, projectile spawn points, and visual effects
- Called by: `RenderLara` (culling), `ShootLara` (muzzle/target), `SimulateLaraHair` (attachment), `DrawEntityOnScreen` (pickup display), and most entity AI functions for melee/bite damage positioning

## Details

| Field     | Value                          |
|-----------|--------------------------------|
| Usage     | `Hook & Call`                  |
| Params    | `pointer, pointer, int`        |
| Return    | `void`                         |

### Parameters

| #   | Type      | Description                              |
|-----|-----------|------------------------------------------|
| 0   | `pointer` | Entity pointer                           |
| 1   | `pointer` | Output position buffer (3 × int32: x, y, z) — also used as input offset |
| 2   | `int`     | Bone index                               |

## Usage
### Hooking
```javascript
// Log bone position lookups
mod.hook('GetBonePosition')
    .onEnter(function(entityPtr, outputPtr, boneIndex) {
        log('GetBonePosition: bone', boneIndex);
    })
    .onLeave(function(returnValue, entityPtr, outputPtr, boneIndex) {
        const x = outputPtr.readS32();
        const y = outputPtr.add(4).readS32();
        const z = outputPtr.add(8).readS32();
        log('Result:', x, y, z);
    });
```

### Calling from mod code
```javascript
// Get the world position of Lara's head bone (bone 10)
const laraPtr = game.readVar(game.module, 'Lara');
const pos = game.alloc(12);  // 3 × int32
pos.writeS32(0);             // no X offset
pos.add(4).writeS32(0);      // no Y offset
pos.add(8).writeS32(0);      // no Z offset
game.callFunction(game.module, 'GetBonePosition', laraPtr, pos, 10);
const worldX = pos.readS32();
const worldY = pos.add(4).readS32();
const worldZ = pos.add(8).readS32();
```

## Pseudocode
```
function GetBonePosition(entity, outputPos, index):
    // Save matrix stack state
    pushMatrixStack()

    // Copy entity's bone transform matrix for the given index
    // Each bone has a 3×4 transform matrix (48 bytes)
    loadBoneMatrix(entity, index)

    // Apply the input offset as a translation on the bone matrix
    applyTranslation(outputPos.x, outputPos.y, outputPos.z)

    // Extract the translation column from the transformed matrix
    // Convert from fixed-point (>>14) to world units
    localX = matrixColumn3.row0 >> 14
    localY = matrixColumn3.row1 >> 14
    localZ = matrixColumn3.row2 >> 14

    // Add entity world position to get final coordinates
    outputPos.x = localX + entity.x
    outputPos.y = localY + entity.y
    outputPos.z = localZ + entity.z

    // Restore matrix stack state
    popMatrixStack()
```
