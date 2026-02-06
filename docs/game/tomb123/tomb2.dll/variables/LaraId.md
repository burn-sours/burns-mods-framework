# Variable: LaraId

## Description
The entity ID of Lara in the current level's entity list. Used to look up Lara's entity data from the Entities array.

## Notes
- Typically `0` but may vary depending on level

## Details

| Field     | Value           |
|-----------|-----------------|
| Type      | `Int16`         |

## Usage
### Calling from mod code
```javascript
const laraId = game.readVar(game.module, 'LaraId');
```
