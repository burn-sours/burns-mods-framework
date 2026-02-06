# Function: CreateGraphic

## Description
Creates a visual graphic/particle effect at a specified world position. Allocates a slot from the graphics effect pool and initializes properties including position, velocity, color, and size with randomized variations.

## Notes
- Distance culled: returns immediately if position is >16384 units from Lara in X or Z
- Room water flag affects effect behavior:
  - Underwater with mode -2: creates bubble effect first
  - Not underwater: uses count parameter for multiplier
- Allocates from graphics array (gets next available slot)
- Uses RNG for randomized offsets on position, velocity, color, and size
- Mode -2 allocates persistent tracking slot (max 32 concurrent)
- Mode -3 converts to -1 with special flag
- Type 0 vs other types trigger different final effect functions
- Two visual styles based on context:
  - Fire-like: smaller particles, brighter colors (mode 1)
  - Smoke-like: larger particles, darker colors (other modes)

## Details

| Field     | Value                                       |
|-----------|---------------------------------------------|
| Usage     | `Hook & Call`                               |
| Params    | `int, int, int, int, int, int, int`         |
| Return    | `void`                                      |

### Parameters

| #   | Type    | Description                                           |
|-----|---------|-------------------------------------------------------|
| 0   | `int`   | X world position                                      |
| 1   | `int`   | Y world position                                      |
| 2   | `int`   | Z world position                                      |
| 3   | `int`   | Graphic type (0 = type A, other = type B)             |
| 4   | `int`   | Mode (-1 = standard, -2 = persistent, -3 = flagged)   |
| 5   | `int`   | Count/intensity (used when not underwater)            |
| 6   | `int`   | Room ID (cast to ushort)                              |

## Usage
### Hooking
```javascript
mod.hook('CreateGraphic')
    .onEnter(function(x, y, z, type, mode, count, room) {
        // Intercept graphic creation
    });
```

### Calling from mod code
```javascript
// Create a graphic effect at position
const lara = game.readVar(game.module, 'Lara');
const x = lara.add(ENTITY_X).readS32();
const y = lara.add(ENTITY_Y).readS32();
const z = lara.add(ENTITY_Z).readS32();
const room = lara.add(ENTITY_ROOM).readS16();

// Standard fire-like effect
game.callFunction(game.module, 'CreateGraphic', x, y, z, 0, -1, 1, room);

// Persistent smoke effect
game.callFunction(game.module, 'CreateGraphic', x, y, z, 3, -2, 0, room);
```

## Pseudocode
```
function CreateGraphic(x, y, z, type, mode, count, room):
    // Distance culling - skip if too far from Lara
    if abs(Lara.x - x) > 16384:
        return
    if abs(Lara.z - z) > 16384:
        return
    
    // Check if room is underwater
    roomFlags = Rooms[room].flags
    isUnderwater = (roomFlags & 1) != 0
    
    // Determine effect intensity
    intensity = 1
    if isUnderwater and mode == -2:
        // Create bubble effect for underwater
        createBubbleEffect(x, y, z, room)
    else:
        if not isUnderwater:
            intensity = count
    
    // Allocate graphics slot
    slotIndex = allocateGraphicsSlot()
    slot = graphicsArray + slotIndex * SLOT_SIZE
    
    // Handle special modes
    if mode == -3:
        mode = -1
        slot.specialFlag = -1
    
    // Initialize RNG for randomization
    rng = globalRngState * 0x41c64e6d + 0x3039
    
    // Set visual properties based on intensity
    if intensity == 1:
        // Fire-like: smaller, brighter
        slot.colorR = (rng >> 10 & 0x3f) + 0x80
        slot.colorG = (nextRng >> 10 & 0x1f) + 0x40
        slot.colorB = 0
        slot.sizeBase = (rng >> 10 & 7) + 16
        slot.width = 7
        slot.height = 8
    else:
        // Smoke-like: larger, darker
        slot.colorR = (rng >> 10 & 0xf) + 0x20
        slot.colorG = (nextRng >> 10 & 0x3f) - 0x40
        slot.colorB = (rng >> 10 & 0x3f) + 0x80
        slot.colorExtra = 0x20
        slot.sizeBase = (rng >> 10 & 7) + 24
        slot.width = 8
        slot.height = 16
    
    slot.room = room
    slot.mode = mode
    
    // Handle persistent mode (-2)
    if mode == -2:
        // Allocate from persistent tracking array (max 32)
        for i = 0 to 32:
            if persistentSlots[i].active == 0:
                persistentSlots[i].active = 1
                persistentSlots[i].x = x
                persistentSlots[i].y = y
                persistentSlots[i].z = z
                slot.persistentIndex = i
                break
        if i == 32:
            slot.persistentIndex = 0xff  // no slot available
    
    // Randomize velocity
    slot.velocityX = (rng >> 10 & 0xfff) - 0x800
    slot.velocityY = (rng >> 10 & 0xfff) - 0x800
    slot.velocityZ = (rng >> 10 & 0xfff) - 0x800
    
    // Set position with random offset
    if mode == -2 and intensity != 1:
        // Larger random offset for persistent smoke
        slot.x = x + (rng >> 10 & 0x1ff) - 0x100
        slot.y = y + (rng >> 10 & 0x1ff) - 0x100
        slot.z = z + (rng >> 10 & 0x1ff) - 0x100
        slot.spriteId = 0x33
    else:
        // Smaller random offset
        slot.x = x + (rng >> 10 & 0x1f) - 0x10
        slot.y = y + (rng >> 10 & 0x1f) - 0x10
        slot.z = z + (rng >> 10 & 0x1f) - 0x10
        slot.spriteId = 0x11 if intensity == 1 else 0x33
    
    // Set animation properties
    slot.frameFlags = randomChoice(0xa0a/0xa1a or 0x20a/0x21a based on intensity)
    
    // Randomize lifetime
    lifetime = (rng >> 10 & 0xf) + 40
    slot.lifetime = lifetime
    slot.maxLifetime = lifetime
    slot.fadeStart = lifetime * 2
    slot.fadeRate = lifetime + (rng >> 10 & 7) + 8
    
    // Update global RNG state
    globalRngState = rng
    
    // Trigger effect based on type
    if type == 0:
        triggerEffectTypeA(x, y, z, intensity)
    else:
        triggerEffectTypeB(x, y, z, intensity)
```
