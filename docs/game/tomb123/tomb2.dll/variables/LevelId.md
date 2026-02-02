# Variable: LevelId

## Description
The ID of the currently loaded level.

## Notes
- Each level has a unique numeric ID
- Changes when a new level is loaded
- This variable is per-module — each DLL has its own LevelId with its own level mappings

## Details

| Field     | Value           |
|-----------|-----------------|
| Type      | `Int32`         |

## Value Range

| Value | Description                    |
|-------|--------------------------------|
| `0`   | Lara's Home - TR2             |
| `1`   | Great Wall                     |
| `2`   | Venice                         |
| `3`   | Bartoli's                      |
| `4`   | Opera House                    |
| `5`   | Offshore Rig                   |
| `6`   | Diving Area                    |
| `7`   | 40 Fathoms                     |
| `8`   | Maria Doria                    |
| `9`   | Living Quarters                |
| `10`  | The Deck                       |
| `11`  | Tibet                          |
| `12`  | Barkhang                       |
| `13`  | Talion                         |
| `14`  | Ice Palace                     |
| `15`  | Temple of Xian                 |
| `16`  | Floating Islands               |
| `17`  | Dragon's Lair                  |
| `18`  | Home Sweet Home                |
| `19`  | The Cold War                   |
| `20`  | Fool's Gold                    |
| `21`  | Furnace of Gods                |
| `22`  | Kingdom                        |
| `23`  | Vegas                          |
| `63`  | Main Menu                      |

## Usage
### Calling from mod code
```javascript
const levelId = game.readVar(game.module, 'LevelId');

if (levelId === 1) {
    // Player is in Great Wall
}
```
