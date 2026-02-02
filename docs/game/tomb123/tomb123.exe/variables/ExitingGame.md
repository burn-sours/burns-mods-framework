# Variable: ExitingGame

## Description
Flag indicating whether the game is in the process of exiting/shutting down.

## Details

| Field     | Value           |
|-----------|-----------------|
| Type      | `Int8`          |

## Value Range

| Value | Description                    |
|-------|--------------------------------|
| `0`   | Game running normally          |
| `1`   | Game is exiting                |

## Usage
### Calling from mod code
```javascript
const exiting = game.readVar('tomb123.exe', 'ExitingGame');

if (exiting) {
    // Clean up before exit
}
```
