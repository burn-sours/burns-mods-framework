# Tomb Raider IV-VI Remastered

Documentation for TR IV-VI Remastered game internals.

## Modules

| Module | Description |
|--------|-------------|
| [`tomb456.exe`](tomb456.exe/) | Main executable — input, settings, shared systems |
| [`tomb4.dll`](tomb4.dll/) | Tomb Raider: The Last Revelation game logic |
| [`tomb5.dll`](tomb5.dll/) | Tomb Raider: Chronicles game logic |

## Constants

Constants are defined at the game level and may be overridden by patch-specific values. They are available as global constants in mod scripts (e.g., `ENTITY_SIZE`, `ENTITY_HEALTH`).

### Structure Sizes

| Constant | Value | Description |
|----------|-------|-------------|
| `ROOM_SIZE` | 304 | Size of a room structure in bytes |
| `ENTITY_SIZE` | 9416 | Size of an entity structure in bytes |
| `ENTITY_BONES_SIZE` | 752 | Size of entity bone data |
| `ENTITY_POS_SIZE` | 16 | Size of position data (with rotation) |
| `ENTITY_POS_NO_ROT_SIZE` | 12 | Size of position data (without rotation) |
| `LARA_HAIR_SIZE` | 1708 | Size of Lara's hair simulation data |
| `LARA_BASIC_SIZE` | 30 | Size of Lara's basic state data |
| `LARA_SHADOW_SIZE` | 12 | Size of Lara's shadow data |
| `LARA_APPEARANCE_SIZE` | 24 | Size of Lara's appearance data |
| `LARA_GUNFLAG_SIZE` | 2 | Size of Lara's gun flags |
| `LARA_OUTFIT_SIZE` | 56 | Size of Lara's outfit data |
| `LARA_FACE_SIZE` | 20 | Size of Lara's face/expression data |

### Entity Offsets

| Constant | Value | Description |
|----------|-------|-------------|
| `ENTITY_CURRENT_STATE` | 18 | Offset to current animation state |
| `ENTITY_TARGET_STATE` | 20 | Offset to target animation state |
| `ENTITY_QUEUED_STATE` | 22 | Offset to queued animation state |
| `ENTITY_ANIM_ID` | 24 | Offset to current animation ID |
| `ENTITY_ANIM_FRAME` | 26 | Offset to current animation frame |
| `ENTITY_ROOM` | 28 | Offset to room index |
| `ENTITY_XZ_SPEED` | 34 | Offset to horizontal speed |
| `ENTITY_Y_SPEED` | 36 | Offset to vertical speed |
| `ENTITY_HEALTH` | 38 | Offset to health value |
| `ENTITY_FLAGS` | 44 | Offset to entity flags |
| `ENTITY_X` | 96 | Offset to X world position |
| `ENTITY_Y` | 100 | Offset to Y world position |
| `ENTITY_Z` | 104 | Offset to Z world position |
| `ENTITY_LAST_X` | 6208 | Offset to last frame X position |
| `ENTITY_LAST_BONES` | 6248 | Offset to last frame bone positions |
| `ENTITY_BONES` | 7832 | Offset to current bone positions |

### Rendering

| Constant | Value | Description |
|----------|-------|-------------|
| `UI_RENDER_LAYER` | 65-66 | UI render layer for DrawSetup (patch-defined: 65 in patch1, 66 in patch2+) |
