# Variable: LevelId

## Description
The ID of the currently loaded level.

## Notes
- Read only
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
| `0`   | Lara's Home - TR1             |
| `1`   | Caves                          |
| `2`   | Vilca                          |
| `3`   | Lost Valley                    |
| `4`   | Qualopec                       |
| `5`   | Francis' Folly                 |
| `6`   | Colosseum                      |
| `7`   | Palace Midas                   |
| `8`   | Cistern                        |
| `9`   | Tihocan                        |
| `10`  | Khamoon                        |
| `11`  | Obelisk Khamoon                |
| `12`  | Sanctuary                      |
| `13`  | Natla's Mines                  |
| `14`  | Atlantis                       |
| `15`  | Great Pyramid                  |
| `16`  | Egypt                          |
| `17`  | Temple of Cat                  |
| `18`  | Stronghold                     |
| `19`  | Hive                           |
| `24`  | Main Menu                      |

## Usage
### Calling from mod code
```javascript
const levelId = game.readVar(game.module, 'LevelId');

if (levelId === 1) {
    // Player is in Caves
}
```
