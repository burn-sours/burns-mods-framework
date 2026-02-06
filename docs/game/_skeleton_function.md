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

<!-- Add Return Values section only when the function returns a meaningful value (omit for void):
### Return Values

| Value | Description                    |
|-------|--------------------------------|
| `0`   | Description of return value    |
| `1`   | Description of return value    |
-->

## Usage
### Hooking
```javascript
mod.hook('Name')
    .onEnter(function(arg0, arg1, arg2) {
        // Called before the function executes
    });
```

```javascript
mod.hook('Name')
    .onLeave(function(returnValue, arg0, arg1, arg2) {
        // Called after the function executes
        // returnValue is null for void functions
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
