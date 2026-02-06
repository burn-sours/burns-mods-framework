# Variable: MenuSelection

## Description
The currently highlighted/selected item in the menu.

## Notes
- Tracks which menu option the player is hovering over
- Needs more info: exact value mappings not yet documented

## Details

| Field     | Value           |
|-----------|-----------------|
| Type      | `UInt16`        |

## Usage
### Calling from mod code
```javascript
const selection = game.readVar(game.module, 'MenuSelection');
```
