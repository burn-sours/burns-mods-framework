# Variable: Level

## Description
The ID of the currently loaded level. Same numbering as per-DLL LevelId variables but accessible across all modules.

## Notes
- Read only
- Same level numbering as the per-DLL LevelId variables
- Accessible from any module context, unlike per-DLL LevelId which is module-specific

## Details

| Field     | Value           |
|-----------|-----------------|
| Type      | `Int32`         |

## Usage
### Calling from mod code
```javascript
const level = game.readVar('tomb123.exe', 'Level');
```
