# Variable: ProcessingEntityId

## Description
The entity ID currently being processed by the game loop (e.g. during entity behaviour/animation updates).

## Details

| Field     | Value           |
|-----------|-----------------|
| Type      | `Int16`         |

## Usage
### Calling from mod code
```javascript
const entityId = game.readVar(game.module, 'ProcessingEntityId');
```
