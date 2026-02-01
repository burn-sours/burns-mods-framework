# 🔥 Burn's Mod Framework

A modding framework and mod collection for **Tomb Raider Remastered I-III** and **Tomb Raider Remastered IV-V**. Built on Frida injection with an Electron shell.

Focused on Tomb Raider Remastered I-V.

## Quick Start

**Prerequisites:** Node.js (18+)

```bash
git clone https://github.com/burn-sours/burns-mods-framework.git
cd burns-mods-framework
npm install
```

### Running a mod

1. Launch the game
2. Run `npm run start`
3. Click **Launch** in the shell

### Building

```bash
npm run build
```

Produces a portable executable in `releases/`.

## Creating a Mod

Mods live in `src/mod/` and follow a naming convention:

- `mod.js` — Default mod (loaded on startup)
- `mod.{name}.js` — Named mod (e.g. `mod.no-fall-damage.js`)
- `ui.html` — UI panel for `mod.js`
- `ui.{name}.html` — UI panel for `mod.{name}.js`

The shell displays a dropdown to switch between all available mods. See **[docs/FRAMEWORK.md](docs/FRAMEWORK.md)** for the full API reference and examples.

## Structure

```
burns-mods-framework/
├── docs/
│   ├── FRAMEWORK.md              # Builder API & runtime reference
│   ├── CONTRIBUTING.md           # Contribution guidelines
├── src/
│   ├── framework/                # Core framework (main branch only)
│   └── mod/                      # Mod files
│       ├── mod.js                # Default mod (Template Mod)
│       ├── mod.{name}.js         # Named mods (e.g. mod.no-fall-damage.js)
│       ├── ui.html               # UI for mod.js
│       └── ui.{name}.html        # UI for mod.{name}.js
└── media/                        # Icons and assets
```

## Branches

- **`main`** — Core framework, docs, and skeleton.
- **`mod/<name>`** — Each mod gets its own branch.

## Knowledge

All modding knowledge lives in `docs/`. If it's not documented, we don't assume it works.

All patch data definitions — variable names, function signatures, parameter descriptions, and behavioral observations — are entirely the interpretation of Burn and the project's contributors based on reverse engineering. They may be incomplete or inaccurate. 

Other community resources such as [TRosettaStone](https://opentomb.github.io/TRosettaStone3/trosettastone.html), [OpenLara](https://github.com/XProger/OpenLara), or [Croft Engine](https://github.com/stohrendorf/CroftEngine) may offer deeper or more accurate explanations of certain game mechanisms.

All contributors are welcome to improve the understanding of the game — better descriptions, corrected signatures, newly discovered variables — it all helps the project and everyone who enjoys it. Put in a PR!


## Contributing

See **[docs/CONTRIBUTING.md](docs/CONTRIBUTING.md)** for guidelines, code standards, and PR process.

## Links

- [Discord](https://discord.gg/DJrkR77HJD)
- [Support Burn](https://ko-fi.com/burn_sours)
- [Burn's Multiplayer Launcher](https://github.com/burn-sours/tomb-raider-remastered-multiplayer) (separate project)
