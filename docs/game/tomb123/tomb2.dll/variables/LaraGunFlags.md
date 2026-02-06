# Variable: LaraGunFlags

## Description
Bitmask representing the state of Lara's weapon system (drawn, holstered, firing, etc.).

## Notes
- Bit 2 (0x4): right gun firing
- Bit 3 (0x8): left gun firing
- Bit 9 (0x200): weapon state flag
- Needs more info: full bit mapping not yet documented

## Details

| Field     | Value           |
|-----------|-----------------|
| Type      | `UInt16`        |

## Known Bits

| Bit | Mask   | Description                    |
|-----|--------|--------------------------------|
| 2   | `0x4`  | Right gun firing               |
| 3   | `0x8`  | Left gun firing                |
| 9   | `0x200`| Weapon state flag              |

## Usage
### Calling from mod code
```javascript
const flags = game.readVar(game.module, 'LaraGunFlags');

// Check if right gun is firing
if (flags & 0x4) {
    // right gun active
}
```
