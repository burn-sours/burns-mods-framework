# Variable: [Name]

## Description
Brief description of what this variable represents.

## Notes
- Additional notes about behavior, edge cases, etc.
- Needs more info? Include a note.

## Details

| Field     | Value           |
|-----------|-----------------|
| Type      | `Int32`         |

## Value Range

| Value | Description                    |
|-------|--------------------------------|
| `0`   | Description                    |
| `1`   | Description                    |

## Usage
### Calling from mod code
```javascript
const value = game.readVar(game.module, 'Name');

game.writeVar(game.module, 'Name', 42);

const ptr = game.getVarPtr(game.module, 'Name');
```
