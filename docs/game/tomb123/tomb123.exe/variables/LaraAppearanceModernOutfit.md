# Variable: LaraAppearanceModernOutfit

## Description
Lara's currently selected modern (remastered) outfit ID.

## Notes
- Only applies when using modern/remastered graphics mode

## Details

| Field     | Value           |
|-----------|-----------------|
| Type      | `Int32`         |

## Usage
### Calling from mod code
```javascript
const outfit = game.readVar('tomb123.exe', 'LaraAppearanceModernOutfit');
game.writeVar('tomb123.exe', 'LaraAppearanceModernOutfit', 14); // Vegas outfit
```
