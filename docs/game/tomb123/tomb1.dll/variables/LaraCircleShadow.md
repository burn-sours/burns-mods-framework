# Variable: LaraCircleShadow

## Description
Memory block containing Lara's circular shadow data, accessed via pointer offset from Lara.

## Notes
- 48 bytes (0x30) at offset 0xe20 from Lara
- Controls the shadow rendered beneath Lara

## Details

| Field     | Value           |
|-----------|-----------------|
| Type      | `Block`         |
| Pointer   | `0xe20`         |
| Size      | `0x30`          |

## Usage
### Calling from mod code
```javascript
const ptr = game.getVarPtr(game.module, 'LaraCircleShadow');
```
