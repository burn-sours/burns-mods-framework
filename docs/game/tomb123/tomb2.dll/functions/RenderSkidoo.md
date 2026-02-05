# Function: RenderSkidoo

## Description
Renders the skidoo (snowmobile) vehicle entity. Handles mesh rendering with interpolation, transformation matrix setup, and driver appearance swapping in OG graphics mode.

## Notes
- Called during the render phase for skidoo entities
- Supports both modern and OG (original) graphics modes
- In OG mode with certain flags, swaps to model 51 and can apply alternate driver appearance
- Uses interpolation factor for smooth rendering between frames
- Iterates through mesh parts using bit flags from entity data

## Details

| Field     | Value           |
|-----------|-----------------|
| Usage     | `Hook`          |
| Params    | `pointer`       |
| Return    | `void`          |

### Parameters

| #   | Type      | Description                              |
|-----|-----------|------------------------------------------|
| 0   | `pointer` | Pointer to the skidoo entity structure   |

## Usage
### Hooking
```javascript
mod.hook('RenderSkidoo')
    .onEnter(function(entity) {
        // entity is a pointer to the skidoo entity data
    });
```

```javascript
mod.hook('RenderSkidoo')
    .onLeave(function(returnValue, entity) {
        // Skidoo has finished rendering
    });
```

## Pseudocode
```
function RenderSkidoo(entity):
    entityBox = GetEntityBox(entity)
    
    // Read entity flags
    flags = read entity flag data (0 if null)
    savedRoomId = entity room ID
    
    // Select model based on flag bit 2
    if (flags & 4) == 0:
        use standard room model
    else:
        // OG graphics: override to model 51
        if OG mode enabled:
            set entity room to 51
        use alternate model data
    
    // Setup transformation matrix from entity position/rotation
    
    // OG graphics path
    if model has mesh data and OG mode enabled:
        render entity mesh
        
        // Driver appearance swap (from flags upper byte)
        if driver slot valid:
            save mesh data
            apply alternate appearance
            render again
            restore mesh data
        return
    
    // Modern graphics path
    // Select alternate mesh based on flag bits 0-1
    alternateMesh = none
    if (flags & 3) == 1: alternateMesh = slot 1
    if (flags & 3) == 2: alternateMesh = slot 7
    
    // Render each mesh part enabled in mesh bit flags
    for each enabled mesh part:
        // Interpolate frame transforms (uses InterpolationFactor)
        // Apply camera offset
        // Render mesh (alternate for first part if set)
    
    // Restore original room ID
```
