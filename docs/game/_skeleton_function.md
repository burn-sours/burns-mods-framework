# Function: [Name]

## Description
Brief description of what this function does.

## Notes
- Additional notes about behavior, edge cases, etc.
- Needs more info? Include a note.

## Details

| Field     | Value                          |
|-----------|--------------------------------|
| Usage     | `Hook`, `Call`, or `Hook & Call`|
| Params    | `int, pointer, int`            |
| Return    | `void`                         |

### Parameters

| #   | Type      | Description                    |
|-----|-----------|--------------------------------|
| 0   | `int`     | Description of first param     |
| 1   | `pointer` | Description of second param    |
| 2   | `int`     | Description of third param     |

### Return Values

| Value | Description                    |
|-------|--------------------------------|
| `0`   | Description of return value    |
| `1`   | Description of return value    |

## Usage
### Hooking
```javascript
game.hookFunction(game.module, 'Name', (args) => {
    // args[0], args[1], args[2]
});
```

### Calling from mod code
```javascript
const result = game.callFunction(game.module, 'Name', arg0, arg1, arg2);
```

## Pseudocode
```
// Pseudocode of what the function does
// Can be partial — still useful context
```
