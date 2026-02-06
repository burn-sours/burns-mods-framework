# Variable: IsPhotoMode

## Description
Flag indicating whether photo mode is currently active.

## Notes
- When photo mode is active, gameplay is paused and the camera is freely controllable
- See also: IsPhotoModeUI

## Details

| Field     | Value           |
|-----------|-----------------|
| Type      | `Int32`         |

## Value Range

| Value | Description                    |
|-------|--------------------------------|
| `0`   | Photo mode inactive            |
| `1`   | Photo mode active              |

## Usage
### Calling from mod code
```javascript
const photoMode = game.readVar('tomb123.exe', 'IsPhotoMode');

if (photoMode) {
    // Player is in photo mode
}
```
