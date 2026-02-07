# Tomb Raider I-III Remastered

Documentation for TR I-III Remastered game internals.

## Modules

| Module | Description |
|--------|-------------|
| [`tomb123.exe`](tomb123.exe/) | Main executable — input, settings, shared systems |
| [`tomb1.dll`](tomb1.dll/) | Tomb Raider 1 game logic |
| [`tomb2.dll`](tomb2.dll/) | Tomb Raider 2 game logic |
| [`tomb3.dll`](tomb3.dll/) | Tomb Raider 3 game logic |

## Constants

Constants are defined at the game level and may be overridden by patch-specific values. They are available as global constants in mod scripts (e.g., `ENTITY_SIZE`, `ENTITY_HEALTH`).

### Structure Sizes

| Constant | Value | Description |
|----------|-------|-------------|
| `ROOM_SIZE` | 168 | Size of a room structure in bytes |
| `ENTITY_SIZE` | 3664 | Size of an entity structure in bytes |
| `ENTITY_BONES_SIZE` | 736 | Size of entity bone data |
| `ENTITY_POS_SIZE` | 16 | Size of position data (with rotation) |
| `ENTITY_POS_NO_ROT_SIZE` | 12 | Size of position data (without rotation) |
| `LARA_HAIR_SIZE` | 1708 | Size of Lara's hair simulation data |
| `LARA_BASIC_SIZE` | 40 | Size of Lara's basic state data |
| `LARA_SHADOW_SIZE` | 48 | Size of Lara's shadow data |
| `LARA_APPEARANCE_SIZE` | 13 | Size of Lara's appearance data |
| `LARA_GUNFLAG_SIZE` | 4 | Size of Lara's gun flags |
| `AI_TRACKING_SIZE` | 22 | Size of AI tracking data |
| `PROJECTILE_SIZE` | 68 | Size of a projectile structure |

### Entity Offsets

| Constant | Value | Description |
|----------|-------|-------------|
| `ENTITY_MODEL` | 16 | Offset to entity model ID |
| `ENTITY_CURRENT_STATE` | 18 | Offset to current animation state |
| `ENTITY_TARGET_STATE` | 20 | Offset to target animation state |
| `ENTITY_QUEUED_STATE` | 22 | Offset to queued animation state |
| `ENTITY_ANIM_ID` | 24 | Offset to current animation ID |
| `ENTITY_ANIM_FRAME` | 26 | Offset to current animation frame |
| `ENTITY_ROOM` | 28 | Offset to room index |
| `ENTITY_NEXT_IN_ROOM` | 30 | Offset to next entity in room (linked list) |
| `ENTITY_NEXT_ID` | 32 | Offset to next entity ID |
| `ENTITY_XZ_SPEED` | 34 | Offset to horizontal speed |
| `ENTITY_Y_SPEED` | 36 | Offset to vertical speed |
| `ENTITY_HEALTH` | 38 | Offset to health value |
| `ENTITY_BOX_INDEX` | 40 | Offset to AI box index |
| `ENTITY_TIMER` | 42 | Offset to entity timer |
| `ENTITY_FLAGS` | 44 | Offset to entity flags |
| `ENTITY_DROP_1` | 58 | Offset to first drop item |
| `ENTITY_DROP_2` | 60 | Offset to second drop item |
| `ENTITY_DROP_3` | 62 | Offset to third drop item |
| `ENTITY_DROP_4` | 64 | Offset to fourth drop item |
| `ENTITY_PUSHBLOCK_BUSY` | 60 | Offset to pushblock busy flag |
| `ENTITY_BEHAVIOUR` | 80 | Offset to entity behaviour/mood |
| `ENTITY_X` | 88 | Offset to X world position |
| `ENTITY_Y` | 92 | Offset to Y world position |
| `ENTITY_Z` | 96 | Offset to Z world position |
| `ENTITY_YAW` | 102 | Offset to Y rotation (yaw) |
| `ENTITY_PITCH` | 104 | Offset to X rotation (pitch) |
| `ENTITY_ROLL` | 106 | Offset to Z rotation (roll) |
| `ENTITY_LAST_X` | 108 | Offset to last frame X position |
| `ENTITY_LAST_BONES` | 496 | Offset to last frame bone positions |
| `ENTITY_STATUS` | 484 | Offset to entity status flags |
| `ENTITY_BONES` | 2080 | Offset to current bone positions |
| `ROOM_ENTITY_HEAD` | 96 | Offset to first entity ID in room |

### Text Offsets

| Constant | Value | Description |
|----------|-------|-------------|
| `TEXT_FLAGS` | 0 | Offset to text flags |
| `TEXT_X` | 12 | Offset to text X position |
| `TEXT_Y` | 16 | Offset to text Y position |
| `TEXT_COLOR` | 64 | Offset to text color |
| `TEXT_STRING` | 72 | Offset to text string pointer |
| `TEXT_FONT_SIZE` | 80 | Offset to font size |

### Rendering

| Constant | Value | Description |
|----------|-------|-------------|
| `UI_RENDER_LAYER` | 57 | UI render layer for DrawSetup |

## Notes

- The three game DLLs share similar structure but have different addresses and some game-specific variations
- Entity functions (AI, projectiles) are in `functions/entities/` subfolders
- All functions support `Hook & Call` usage unless noted otherwise
- Variables are typed for Frida (Int32, UInt16, Float, Pointer, etc.)

## Quick Links

### Variables
- `Lara` — Pointer to Lara's entity data
- `LevelId` — Current level index
- `BinaryTick` — Frame counter (0/1 toggle)
- `Entities` / `EntitiesCount` — Entity array

### Functions
- `LoadLevel` — Level initialization
- `InitializeLevelAI` — AI system setup (called after LoadLevel)
- `ResetUiTexts` — UI text pool reset (use this for adding text labels on level start)
- `OnDamage` — Damage application hook
- `RenderLara` / `RenderEntity` — Rendering hooks
- `CalculateFloorHeight` / `CalculateCeilingHeight` — Collision geometry
