# Variable: GameVersion

## Description
Identifies which game (Tomb Raider 1, 2, or 3) is currently active.

## Notes
- Read only
- Useful for mods that need to behave differently per game

## Details

| Field     | Value           |
|-----------|-----------------|
| Type      | `Int32`         |

## Value Range

| Value | Description                    |
|-------|--------------------------------|
| `0`   | Tomb Raider I                  |
| `1`   | Tomb Raider II                 |
| `2`   | Tomb Raider III                |

## Usage
### Calling from mod code
```javascript
const version = game.readVar('tomb123.exe', 'GameVersion');

if (version === 0) {
    // Tomb Raider I
}
```
