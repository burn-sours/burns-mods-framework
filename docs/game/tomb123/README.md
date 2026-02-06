# Tomb Raider I-III Remastered

Documentation for TR I-III Remastered game internals.

## Modules

| Module | Description |
|--------|-------------|
| [`tomb123.exe`](tomb123.exe/) | Main executable — input, settings, shared systems |
| [`tomb1.dll`](tomb1.dll/) | Tomb Raider 1 game logic |
| [`tomb2.dll`](tomb2.dll/) | Tomb Raider 2 game logic |
| [`tomb3.dll`](tomb3.dll/) | Tomb Raider 3 game logic |

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
- `OnDamage` — Damage application hook
- `RenderLara` / `RenderEntity` — Rendering hooks
- `CalculateFloorHeight` / `CalculateCeilingHeight` — Collision geometry
