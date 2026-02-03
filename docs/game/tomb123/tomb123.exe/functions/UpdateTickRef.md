# Function: UpdateTickRef

## Description
Updates the tick reference. Called to synchronise or advance the tick counter.

## Notes
- Takes no parameters.
- Needs more info on exact purpose and when it is called relative to TickFunction.

## Details

| Field     | Value    |
|-----------|----------|
| Usage     | `Hook`   |
| Params    | *(none)* |
| Return    | `void`   |

## Usage
### Hooking
```javascript
game.hookFunction(game.exe, 'UpdateTickRef', (args) => {
    // No parameters
});
```

### Calling from mod code
```javascript
game.callFunction(game.exe, 'UpdateTickRef');
```
