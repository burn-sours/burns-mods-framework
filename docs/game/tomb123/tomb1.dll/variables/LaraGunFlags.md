# Variable: LaraGunFlags

## Description
Bitmask representing the state of Lara's weapon system (drawn, holstered, firing, etc.).

## Notes
- Cleared with mask `0xfffff860` at the start of gun processing, preserving certain persistent bits
- Bit 2 (0x4): right gun firing
- Bit 3 (0x8): left gun firing
- Bit 9 (0x200): checked for a specific weapon state (triggers a function call when set)
- Bits cleared with `0xfffffff3` to stop firing (clears bits 2 and 3)
- Needs more info: full bit mapping not yet documented

## Details

| Field     | Value           |
|-----------|-----------------|
| Type      | `UInt32`        |

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

// Check if left gun is firing
if (flags & 0x8) {
    // left gun active
}
```
