# Variable: LaraBehaviourFlags

## Description
Bitmask controlling various Lara behaviour/state flags.

## Notes
- Each bit represents a different behaviour state
- Needs more info: full bit mapping not yet documented

## Details

| Field     | Value           |
|-----------|-----------------|
| Type      | `Int8`          |

## Known Bits

| Bit | Mask   | Description                    |
|-----|--------|--------------------------------|
| 6   | `0x40` | Currently climbing wall        |

## Usage
### Calling from mod code
```javascript
const flags = game.readVar(game.module, 'LaraBehaviourFlags');

// Check if Lara is climbing
if (flags & 0x40) {
    // wall climbing
}

// Set climbing flag
game.writeVar(game.module, 'LaraBehaviourFlags', flags | 0x40);
```
