# LaraBehaviourFlags

Bitfield controlling various Lara behavior and state flags. TR3-only variable (not present in TR1/TR2).

## Details

| Property | Value |
|----------|-------|
| Type | Int8 |
| Games | TR3 |

## Known Flags

| Bit | Value | Description |
|-----|-------|-------------|
| 2 | 0x04 | Set during climbing state transitions |
| 4 | 0x10 | State flag (checked during hazard interactions) |
| 6 | 0x40 | Climbing active |
| 11 | 0x800 | Periodic processing flag (cleared after handling) |

> **Note:** Not all bits are fully documented. The flag meanings were derived from decompiled code analysis.

## Usage

```javascript
const module = 'tomb3.dll';

// Check if climbing flag is set
const flags = game.readMemoryVariable('LaraBehaviourFlags', module);
const isClimbing = (flags & 0x40) !== 0;

// Set climbing flag
game.writeMemoryVariable(
    'LaraBehaviourFlags',
    game.readMemoryVariable('LaraBehaviourFlags', module) | 0x40,
    module
);

// Clear a flag (example: clear bit 4)
game.writeMemoryVariable(
    'LaraBehaviourFlags',
    game.readMemoryVariable('LaraBehaviourFlags', module) & ~0x10,
    module
);
```

## See Also

- [LaraClimbState](LaraClimbState.md) — Separate climbing state variable
