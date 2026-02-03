# Function: KeyboardInput

## Description
Called when a keyboard input event occurs. Receives the key code and the input state.

## Notes
- Needs more info on exact key code format and state values.

## Details

| Field     | Value        |
|-----------|--------------|
| Usage     | `Hook`       |
| Params    | `uint, int`  |
| Return    | `void`       |

### Parameters

| #   | Type   | Description                              |
|-----|--------|------------------------------------------|
| 0   | `uint` | Key code                                 |
| 1   | `int`  | Input state (e.g. pressed/released)      |

## Usage
### Hooking
```javascript
game.hookFunction(game.exe, 'KeyboardInput', (args) => {
    // args[0] = key code
    // args[1] = input state
});
```

### Calling from mod code
```javascript
game.callFunction(game.exe, 'KeyboardInput', keyCode, state);
```
