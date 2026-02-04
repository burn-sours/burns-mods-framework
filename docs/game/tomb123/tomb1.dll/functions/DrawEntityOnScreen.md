# Function: DrawEntityOnScreen

## Description
Adds a pickup item to the on-screen pickup display. This is the spinning item display shown in the corner of the screen when Lara picks something up. Supports up to 12 simultaneous pickup displays. Projects the pickup's 3D world position to screen coordinates, sets up the model's animation frame, and prepares the display entry for rendering.

## Notes
- Maximum of 12 pickup displays at once — silently does nothing if the limit is reached
- If entity pointer is null, uses Lara's bone position (bone 10) as the pickup origin and sets up a fresh display from the model ID
- If entity pointer is provided, copies the full entity data block into the display slot
- Projects the pickup's world position to screen space using the camera transform matrix, FOV, and resolution
- Each display entry has a timer (starts at 120 ticks) controlling how long it stays on screen
- Sets up the model rendering data including animation frame, bones, and appearance for the spinning display
- Adjusts the viewport resolution for pickup rendering (sets to 1280×960, restores to 320×240 after)

## Details

| Field     | Value                          |
|-----------|--------------------------------|
| Usage     | `Hook & Call`                  |
| Params    | `int, pointer`                 |
| Return    | `void`                         |

### Parameters

| #   | Type      | Description                                          |
|-----|-----------|------------------------------------------------------|
| 0   | `int`     | Model ID of the pickup item                          |
| 1   | `pointer` | Pointer to entity data, or null to use Lara's position |

## Usage
### Hooking
```javascript
mod.hook('DrawEntityOnScreen')
    .onEnter(function(modelId, entityPtr) {
        log('Pickup display:', modelId, entityPtr.isNull() ? '(from Lara)' : '(from entity)');
    });
```

### Calling from mod code
```javascript
// Show a shotgun pickup display using Lara's position
game.callFunction(game.module, 'DrawEntityOnScreen', 0x55, ptr(0));
```

## Pseudocode
```
function DrawEntityOnScreen(modelId, entity):
    if pickupDisplaysCount == 12:
        return

    // Set viewport to high-res for pickup rendering
    setViewport(1280, 960)

    slot = pickupDisplaysCount
    pickupDisplaysCount += 1

    if entity == null:
        // No entity — use Lara's hand position
        position = getBonePosition(Lara, bone: 10)
        display[slot].entityId = -1
        display[slot].modelId = modelId
        display[slot].animId = modelAnims[modelId]
        display[slot].animFrame = animations[modelId].startFrame
        display[slot].yaw = Lara.yaw
        display[slot].position = position
    else:
        // Copy full entity data into display slot
        copyMemory(display[slot], entity, size: 0xe50)

    // Project world position to screen coordinates
    cameraTransform = setupCameraTransform(cameraStable)
    relX = display[slot].x - cameraX
    relY = display[slot].y - cameraY
    relZ = display[slot].z - cameraZ

    // Transform to camera space using rotation matrix
    camSpaceX = relX * matrix.rightX + relZ * matrix.rightZ + relY * matrix.rightY
    camSpaceY = relX * matrix.upX + relY * matrix.upY + relZ * matrix.upZ
    camSpaceZ = relX * matrix.forwardX + relY * matrix.forwardY + relZ * matrix.forwardZ

    // Perspective projection
    if camSpaceZ > nearClip and camSpaceZ < maxDepthThreshold:
        projDiv = camSpaceZ / cameraFOV
        screenX = camSpaceX / projDiv
        screenY = camSpaceY / projDiv
    else:
        screenX = 0
        screenY = 0

    // Convert to UI coordinates
    display[slot].screenX = (screenX + resolutionWidth) * uiDrawHeight / resolutionHeight + uiDrawX
    display[slot].screenY = (screenY + resolutionHeight) * uiDrawHeight / resolutionHeight + uiDrawY

    // Set display properties
    display[slot].timer = 120
    display[slot].animId = 0xFFFF
    display[slot].depth = 0x200

    // Prepare model rendering data and bone snapshot
    setupModelRendering(display[slot])
    snapshotBones(display[slot])

    // Restore viewport
    setViewport(320, 240)
```
