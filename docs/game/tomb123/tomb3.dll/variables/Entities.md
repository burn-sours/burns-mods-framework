# Variable: Entities

## Description
Pointer to the entity array. Each entity is `ENTITY_SIZE` (0xE50) bytes.

## Notes
- Index with `LaraId` to get Lara's entity, or iterate up to `EntitiesCount`
- Lara's entity can also be accessed directly via the `Lara` variable
- All offsets below are relative to the start of an entity struct

## Details

| Field     | Value           |
|-----------|-----------------|
| Type      | `Pointer`       |

## Entity Constants

### Identity & Linkage

| Constant              | Offset   | Description                              |
|-----------------------|----------|------------------------------------------|
| `ENTITY_MODEL`        | `0x10`   | Model/object ID                          |
| `ENTITY_ROOM`         | `0x1c`   | Room the entity is currently in          |
| `ENTITY_NEXT_IN_ROOM` | `0x1e`   | Next entity index in the same room       |
| `ENTITY_NEXT_ID`      | `0x20`   | Next entity index in linked list         |
| `ENTITY_FLAGS`        | `0x2c`   | Entity flags bitfield                    |
| `ENTITY_STATUS`       | `0x1e4`  | Bitmask for runtime state (active, on list, triggered, consumed, falling, etc.) |
| `ENTITY_BEHAVIOUR`    | `0x50`   | Pointer to the AI data object that drives entity behaviour |

### Position & Rotation

| Constant              | Offset   | Description                              |
|-----------------------|----------|------------------------------------------|
| `ENTITY_X`            | `0x58`   | X position (Int32)                       |
| `ENTITY_Y`            | `0x5c`   | Y position (Int32)                       |
| `ENTITY_Z`            | `0x60`   | Z position (Int32)                       |
| `ENTITY_YAW`          | `0x66`   | Y-axis rotation (heading)                |
| `ENTITY_TILT`         | `0x68`   | Tilt angle                               |
| `ENTITY_ROLL`         | `0x6a`   | Roll angle                               |
| `ENTITY_LAST_X`       | `0x6c`   | Previous X position                      |

### Movement & Animation

| Constant                | Offset   | Description                            |
|-------------------------|----------|----------------------------------------|
| `ENTITY_XZ_SPEED`       | `0x22`   | Horizontal speed                       |
| `ENTITY_Y_SPEED`        | `0x24`   | Vertical speed (gravity/jump)          |
| `ENTITY_CURRENT_STATE`  | `0x12`   | Current animation state                |
| `ENTITY_TARGET_STATE`   | `0x14`   | Target animation state                 |
| `ENTITY_QUEUED_STATE`   | `0x16`   | Queued animation state                 |
| `ENTITY_ANIM_ID`        | `0x18`   | Current animation ID                   |
| `ENTITY_ANIM_FRAME`     | `0x1a`   | Current animation frame                |

### Combat & Health

| Constant              | Offset   | Description                              |
|-----------------------|----------|------------------------------------------|
| `ENTITY_HEALTH`       | `0x26`   | Hit points                               |
| `ENTITY_TIMER`        | `0x2a`   | General-purpose timer                    |
| `ENTITY_BOX_INDEX`    | `0x28`   | AI navigation box index                  |

### Bones & Mesh

| Constant              | Offset   | Description                              |
|-----------------------|----------|------------------------------------------|
| `ENTITY_BONES`        | `0x820`  | Current bone/mesh transforms             |
| `ENTITY_LAST_BONES`   | `0x1f0`  | Previous frame bone/mesh transforms      |

### Item Drops

| Constant              | Offset   | Description                              |
|-----------------------|----------|------------------------------------------|
| `ENTITY_DROP_1`       | `0x3a`   | First drop item slot                     |
| `ENTITY_DROP_2`       | `0x3c`   | Second drop item slot                    |
| `ENTITY_DROP_3`       | `0x3e`   | Third drop item slot                     |
| `ENTITY_DROP_4`       | `0x40`   | Fourth drop item slot                    |

### Misc

| Constant                | Offset   | Description                            |
|-------------------------|----------|----------------------------------------|
| `ENTITY_PUSHBLOCK_BUSY` | `0x3c`   | Whether a pushblock is being interacted with |

## Usage
### Calling from mod code
```javascript
const entities = game.readVar(game.module, 'Entities');
const count = game.readVar(game.module, 'EntitiesCount');

// Read an entity's health
const entityHealth = game.memory.readS16(entities.add(index * game.constants.ENTITY_SIZE + game.constants.ENTITY_HEALTH));

// Read Lara's position using LaraId
const laraId = game.readVar(game.module, 'LaraId');
const laraX = game.memory.readS32(entities.add(laraId * game.constants.ENTITY_SIZE + game.constants.ENTITY_X));
```
