# Variable: ResolutionH

## Description
The default horizontal screen resolution.

## Notes
- Read only
- This is the default value; if ResolutionH2 (override) is non-zero, the engine uses that instead
- See also: ResolutionH2

## Details

| Field     | Value           |
|-----------|-----------------|
| Type      | `Int32`         |

## Usage
### Calling from mod code
```javascript
const resH = game.readVar('tomb123.exe', 'ResolutionH');
```
