# Variable: DevMode

## Description
Flag indicating whether developer/debug mode is active.

## Notes
- When enabled, provides access to debug features like speed control (DevModeSpeed)

## Details

| Field     | Value           |
|-----------|-----------------|
| Type      | `Int8`          |

## Value Range

| Value | Description                    |
|-------|--------------------------------|
| `0`   | Dev mode off                   |
| `1`   | Dev mode on                    |

## Usage
### Calling from mod code
```javascript
const devMode = game.readVar('tomb123.exe', 'DevMode');
```
