# RenderLara

Renders Lara's complete character model including body, equipped weapons, back pocket items, and hair.

## Signature

```c
void RenderLara(Entity* entity)
```

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `entity` | `Entity*` | Pointer to Lara's entity structure |

## Details

| Property | Value |
|----------|-------|
| **Module** | tomb3.dll |
| **Address** | 0x298b0 |
| **Params** | `['pointer']` |
| **Return** | `void` |

## Behavior

1. **Visibility Check**: Returns immediately if entity has invisibility flag (0x100) set
2. **Frustum Culling**: Iterates through 15 bone positions checking distance from camera; skips rendering if all bones are outside view range
3. **Behavior Flags**: Sets flag 0x1000 on Lara's behavior flags when rendering proceeds
4. **Vehicle Check**: Performs additional setup when Lara is not in a vehicle
5. **Matrix Setup**: Pushes transformation matrix and sets up rendering transforms
6. **Body Part Rendering**: Iterates through 15 body mesh slots, rendering each visible part based on mesh visibility bits with interpolation support
7. **Back Pocket Item**: Renders equipped back pocket item (shotgun, harpoon gun, etc.) if present and visible
8. **Right Hand Weapon**: Renders weapon in right hand when gun flags indicate active (bit 3)
9. **Left Hand Weapon**: Renders weapon in left hand when gun flags indicate active (bit 2)
10. **Special Weapon Effects**: Handles special rendering for certain weapon types including muzzle flash sprites
11. **Hair Simulation**: Triggers hair rendering at the end of the process
12. **Matrix Cleanup**: Pops transformation matrix after rendering completes

## Tomb3-Specific

- Back pocket item rendering system for larger weapons
- Enhanced weapon rendering with level-type-specific handling
- Special sprite-based muzzle flash rendering for certain weapon configurations

## Use Cases

- **Custom Lara Models**: Replace or modify body part rendering
- **Weapon Visuals**: Customize equipped weapon appearance
- **Special Effects**: Add rendering effects during Lara's draw call
- **Visibility Control**: Implement custom culling or LOD systems

## Example

```javascript
// Add glow effect when Lara is rendering
const { hooks, memory, utils } = framework;

hooks.tomb3.dll.RenderLara.onEnter = function(entity) {
    // Custom pre-render logic
    console.log('Rendering Lara at:', memory.read.int32(entity + 0x10));
};

hooks.tomb3.dll.RenderLara.onLeave = function(returnValue, entity) {
    // Post-render effects
    // returnValue is null for void functions
};
```

## Related

- [RenderEntity](./RenderEntity.md) - Generic entity rendering
- [UpdateLaraAppearance](./UpdateLaraAppearance.md) - Updates Lara's visual state
- [SimulateLaraHair](./SimulateLaraHair.md) - Hair physics simulation
