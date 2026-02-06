# Variable: ResolutionH2

## Description
Override for the horizontal screen resolution. When non-zero, the engine uses this instead of ResolutionH.

## Notes
- When `0`, the engine falls back to ResolutionH (default)
- When non-zero, this value takes priority
- See also: ResolutionH

## Details

| Field     | Value           |
|-----------|-----------------|
| Type      | `Int32`         |

## Value Range

| Value | Description                    |
|-------|--------------------------------|
| `0`   | No override (use ResolutionH)  |
| `>0`  | Override resolution height     |

## Usage
### Calling from mod code
```javascript
const override = game.readVar('tomb123.exe', 'ResolutionH2');

// Get effective resolution
const effective = override || game.readVar('tomb123.exe', 'ResolutionH');
```
