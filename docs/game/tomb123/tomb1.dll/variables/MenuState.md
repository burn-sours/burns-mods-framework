# Variable: MenuState

## Description
The current state of the menu system (e.g. closed, open, which submenu is active).

## Notes
- Needs more info: exact value mappings not yet documented

## Details

| Field     | Value           |
|-----------|-----------------|
| Type      | `UInt16`        |

## Usage
### Calling from mod code
```javascript
const state = game.readVar(game.module, 'MenuState');
```
