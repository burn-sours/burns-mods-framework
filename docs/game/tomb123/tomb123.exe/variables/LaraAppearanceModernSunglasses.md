# Variable: LaraAppearanceModernSunglasses

## Description
Flag indicating whether Lara is wearing sunglasses in modern/remastered graphics mode.

## Notes
- Only applies when using modern/remastered graphics mode

## Details

| Field     | Value           |
|-----------|-----------------|
| Type      | `Int8`          |

## Value Range

| Value | Description                    |
|-------|--------------------------------|
| `0`   | No sunglasses                  |
| `1`   | Wearing sunglasses             |

## Usage
### Calling from mod code
```javascript
const sunglasses = game.readVar('tomb123.exe', 'LaraAppearanceModernSunglasses');
```
