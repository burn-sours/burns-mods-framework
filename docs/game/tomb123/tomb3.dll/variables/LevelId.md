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
| `0`   | Lara's Home - TR3             |
| `1`   | Jungle                         |
| `2`   | Temple Ruins                   |
| `3`   | River Ganges                   |
| `4`   | Caves of Kaliya                |
| `5`   | Coastal Village                |
| `6`   | Crash Site                     |
| `7`   | Madubu Gorge                   |
| `8`   | Temple Of Puna                 |
| `9`   | Thames Wharf                   |
| `10`  | Aldwych                        |
| `11`  | Lud's Gate                     |
| `12`  | City                           |
| `13`  | Nevada Desert                  |
| `14`  | HSC                            |
| `15`  | Area 51                        |
| `16`  | Antarctica                     |
| `17`  | RX-Tech Mines                  |
| `18`  | Tinnos                         |
| `19`  | Meteorite                      |
| `20`  | All Hallows                    |
| `21`  | Highland                       |
| `22`  | Willard                        |
| `23`  | Shakespeare Cliff              |
| `24`  | Fishes                         |
| `25`  | Madhouse                       |
| `26`  | Reunion                        |
| `63`  | Main Menu                      |

## Usage
### Calling from mod code
```javascript
const levelId = game.readVar(game.module, 'LevelId');

if (levelId === 1) {
    // Player is in Jungle
}
```
