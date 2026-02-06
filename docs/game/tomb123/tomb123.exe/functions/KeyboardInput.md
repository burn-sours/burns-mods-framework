# Function: KeyboardInput

## Description
Handles keyboard input events. Maps keycodes to game control flags and tracks key press/release state.

When a key is pressed, it converts the keycode to a control bitmask via an internal function and sets the corresponding bit in a control bitfield. When released, it clears the bit. A secondary control bitfield is used for keys in a specific range (0x5C–0x6B).

Also maintains a rolling buffer of recent keypresses. Under a specific game state condition, the buffer is compared against several stored sequences. When a match is found, an internal value is set (1–5) and the buffer is cleared.

## Notes
- Early returns if the key state hasn't actually changed (already pressed/already released)
- The purpose of the stored sequences and the resulting value (1–5) is unknown — needs clarification
- The game state condition that enables sequence detection is also unidentified
- Keycodes are **not** standard Windows VK codes — the game uses its own mapping (see Known Keycodes below)

## Known Keycodes

These are the game's internal keycodes, not Windows virtual key codes:

### Function Keys
| Key | Keycode |
|-----|---------|
| F1  | 62      |
| F2  | 63      |
| F3  | 64      |
| F4  | 65      |
| F5  | 66      |
| F6  | 67      |
| F7  | 68      |
| F8  | 69      |
| F9  | 70      |
| F10 | 71      |
| F11 | 72      |
| F12 | 73      |

### Number Row
| Key | Keycode |
|-----|---------|
| 0   | 11      |
| 1   | 12      |
| 2   | 13      |
| 3   | 14      |
| 4   | 15      |
| 5   | 16      |
| 6   | 17      |
| 7   | 18      |
| 8   | 19      |
| 9   | 20      |
| -   | 74      |
| =   | 75      |

### Letters
| Key | Keycode |
|-----|---------|
| A   | 21      |
| B   | 22      |
| C   | 23      |
| D   | 24      |
| E   | 25      |
| F   | 26      |
| G   | 27      |
| H   | 28      |
| I   | 29      |
| J   | 30      |
| K   | 31      |
| L   | 32      |
| M   | 33      |
| N   | 34      |
| O   | 35      |
| P   | 36      |
| Q   | 37      |
| R   | 38      |
| S   | 39      |
| T   | 40      |
| U   | 41      |
| V   | 42      |
| W   | 43      |
| X   | 44      |
| Y   | 45      |
| Z   | 46      |

### Punctuation
| Key | Keycode |
|-----|---------|
| [   | 76      |
| ]   | 77      |
| ;   | 83      |
| '   | 82      |
| \   | 79      |
| ,   | 80      |
| .   | 81      |
| /   | 78      |

### Numpad
| Key       | Keycode |
|-----------|---------|
| Numpad 1  | 48      |
| Numpad 2  | 49      |
| Numpad 3  | 50      |
| Numpad 4  | 51      |
| Numpad 5  | 52      |
| Numpad 6  | 53      |
| Numpad 7  | 54      |
| Numpad 8  | 55      |
| Numpad 9  | 56      |
| Numpad +  | 57      |
| Numpad -  | 58      |
| Numpad *  | 59      |
| Numpad /  | 60      |

### Modifiers & Special
| Key         | Keycode |
|-------------|---------|
| Space       | 4       |
| Tab         | 5       |
| Enter       | 6       |
| Shift       | 8       |
| Ctrl        | 9       |
| Alt         | 10      |

### Mouse
| Button       | Keycode |
|--------------|---------|
| Left Click   | 108     |
| Right Click  | 109     |
| Middle Click | 110     |

## Details

| Field     | Value            |
|-----------|------------------|
| Usage     | `Hook & Call`    |
| Params    | `uint, int`      |
| Return    | `void`           |

### Parameters

| #   | Type   | Description                                      |
|-----|--------|--------------------------------------------------|
| 0   | `uint` | Keycode                                          |
| 1   | `int`  | Pressed state (non-zero = pressed, 0 = released) |

## Usage
### Hooking
```javascript
mod.hook('KeyboardInput')
    .onEnter(function(keycode, pressedDown) {
        log('Key:', keycode, 'State:', pressedDown);
    });
```

### Calling from mod code
```javascript
// Simulate a keypress
game.callFunction(game.executable, 'KeyboardInput', keycode, 1);
// Simulate a key release
game.callFunction(game.executable, 'KeyboardInput', keycode, 0);
```

## Pseudocode
```
function KeyboardInput(keycode, pressedDown):
    controlFlag = keyToControl(keycode)
    controlBitfield = selectBitfield(keycode)

    // no change — early exit
    if pressedDown == keyStates[keycode]:
        return

    if key released:
        controlBitfield &= ~controlFlag
    else:
        // sequence detection (purpose unknown)
        if checkGameState() == 2:
            shift input buffer left
            append keycode to buffer
            compare buffer against 5 stored sequences
            if match found:
                set matchId (1–5)
                clear input buffer

        controlBitfield |= controlFlag
        store last keycode

    keyStates[keycode] = pressedDown
```
