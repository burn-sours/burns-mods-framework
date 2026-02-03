# Function: TickFunction

## Description
The main game tick function. Called once per game tick to advance the game state.

## Notes
- Needs more info on what the pointer parameter represents.

## Details

| Field     | Value       |
|-----------|-------------|
| Usage     | `Hook`      |
| Params    | `pointer`   |
| Return    | `void`      |

### Parameters

| #   | Type      | Description                         |
|-----|-----------|-------------------------------------|
| 0   | `pointer` | Context pointer (needs more info)   |

## Usage
### Hooking
```javascript
game.hookFunction(game.exe, 'TickFunction', (args) => {
    // args[0] = context pointer
});
```

### Calling from mod code
```javascript
game.callFunction(game.exe, 'TickFunction', contextPtr);
```
