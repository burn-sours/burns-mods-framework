# Game Documentation

Reference documentation for Tomb Raider Remastered game internals — variables, functions, and hooks available for modding.

## Games

| Folder | Game | Status |
|--------|------|--------|
| [`tomb123/`](tomb123/) | Tomb Raider I-III Remastered | ✅ Complete |
| [`tomb456/`](tomb456/) | Tomb Raider IV-VI Remastered | 🚧 In Progress |

## Structure

Each game folder contains subfolders per module (exe/dll):

```
tomb123/
├── tomb123.exe/     # Main executable (shared hooks)
├── tomb1.dll/       # TR1 game logic
├── tomb2.dll/       # TR2 game logic
└── tomb3.dll/       # TR3 game logic
```

Each module folder contains:
- `variables/` — Memory addresses (game state, positions, flags)
- `functions/` — Hookable/callable functions
- `functions/entities/` — Entity-specific AI and behavior functions

## Doc Format

Every doc follows a consistent format:
- **Description** — What it does
- **Notes** — Quirks, caveats, related items
- **Details** — Type, params, return values
- **Usage** — Hook and call examples
- **Pseudocode** — Behavior summary (functions only)
