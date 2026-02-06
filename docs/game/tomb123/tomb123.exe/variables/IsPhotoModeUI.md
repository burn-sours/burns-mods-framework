# Variable: IsPhotoModeUI

## Description
Flag indicating whether the photo mode UI overlay is visible.

## Notes
- Separate from IsPhotoMode — photo mode can be active with the UI hidden
- Useful for detecting when the player has toggled the UI off for a clean screenshot

## Details

| Field     | Value           |
|-----------|-----------------|
| Type      | `Int32`         |

## Value Range

| Value | Description                    |
|-------|--------------------------------|
| `0`   | Photo mode UI hidden           |
| `1`   | Photo mode UI visible          |

## Usage
### Calling from mod code
```javascript
const photoUI = game.readVar('tomb123.exe', 'IsPhotoModeUI');
```
