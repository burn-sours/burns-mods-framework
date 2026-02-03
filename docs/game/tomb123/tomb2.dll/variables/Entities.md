# Variable: Entities

## Description
Pointer to the entity array. Each entity is `ENTITY_SIZE` bytes.

## Notes
- Index with `LaraId` to get Lara's entity, or iterate up to `EntitiesCount`
- Lara's entity can also be accessed directly via the `Lara` variable

## Details

| Field     | Value           |
|-----------|-----------------|
| Type      | `Pointer`       |

## Entity Constants

### Identity & Linkage

| Constant              | Description                              |
|-----------------------|------------------------------------------|
| `ENTITY_MODEL`        | Model/object ID                          |
| `ENTITY_ROOM`         | Room the entity is currently in          |
| `ENTITY_NEXT_IN_ROOM` | Next entity index in the same room       |
| `ENTITY_NEXT_ID`      | Next entity index in linked list         |
| `ENTITY_FLAGS`        | Entity flags bitfield                    |
| `ENTITY_STATUS`       | Bitmask for runtime state (active, on list, triggered, consumed, falling, etc.) |
| `ENTITY_BEHAVIOUR`    | Pointer to the AI data object that drives entity behaviour |

### Position & Rotation

| Constant              | Description                              |
|-----------------------|------------------------------------------|
| `ENTITY_X`            | X position (Int32)                       |
| `ENTITY_Y`            | Y position (Int32)                       |
| `ENTITY_Z`            | Z position (Int32)                       |
| `ENTITY_YAW`          | Y-axis rotation (heading)                |
| `ENTITY_TILT`         | Tilt angle                               |
| `ENTITY_ROLL`         | Roll angle                               |
| `ENTITY_LAST_X`       | Previous X position                      |

### Movement & Animation

| Constant                | Description                            |
|-------------------------|----------------------------------------|
| `ENTITY_XZ_SPEED`       | Horizontal speed                       |
| `ENTITY_Y_SPEED`        | Vertical speed (gravity/jump)          |
| `ENTITY_CURRENT_STATE`  | Current animation state                |
| `ENTITY_TARGET_STATE`   | Target animation state                 |
| `ENTITY_QUEUED_STATE`   | Queued animation state                 |
| `ENTITY_ANIM_ID`        | Current animation ID                   |
| `ENTITY_ANIM_FRAME`     | Current animation frame                |

### Combat & Health

| Constant              | Description                              |
|-----------------------|------------------------------------------|
| `ENTITY_HEALTH`       | Hit points                               |
| `ENTITY_TIMER`        | General-purpose timer                    |
| `ENTITY_BOX_INDEX`    | AI navigation box index                  |

### Bones & Mesh

| Constant              | Description                              |
|-----------------------|------------------------------------------|
| `ENTITY_BONES`        | Current bone/mesh transforms             |
| `ENTITY_LAST_BONES`   | Previous frame bone/mesh transforms      |

### Item Drops

| Constant              | Description                              |
|-----------------------|------------------------------------------|
| `ENTITY_DROP_1`       | First drop item slot                     |
| `ENTITY_DROP_2`       | Second drop item slot                    |
| `ENTITY_DROP_3`       | Third drop item slot                     |
| `ENTITY_DROP_4`       | Fourth drop item slot                    |

### Misc

| Constant                | Description                            |
|-------------------------|----------------------------------------|
| `ENTITY_PUSHBLOCK_BUSY` | Whether a pushblock is being interacted with |

## Usage
### Calling from mod code
```javascript
const entities = game.readVar(game.module, 'Entities');
const count = game.readVar(game.module, 'EntitiesCount');

// Read an entity's health
const entityHealth = entities.add(index * game.constants.ENTITY_SIZE + game.constants.ENTITY_HEALTH).readS16();

// Read Lara's position using LaraId
const laraId = game.readVar(game.module, 'LaraId');
const laraX = entities.add(laraId * game.constants.ENTITY_SIZE + game.constants.ENTITY_X).readS32();
```
