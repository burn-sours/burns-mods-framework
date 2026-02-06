# Function: KeyboardInput

## Description
Handles keyboard input events. Maps keycodes to game control flags and tracks key press/release state.

When a key is pressed, it converts the keycode to a control bitmask via an internal function and sets the corresponding bit in a control bitfield. When released, it clears the bit. A secondary control bitfield is used for keys in a specific range (0x5C–0x6B).

Also maintains a rolling buffer of recent keypresses. Under a specific game state condition, the buffer is compared against several stored sequences. When a match is found, an internal value is set (1–5) and the buffer is cleared.

## Notes
- Early returns if the key state hasn't actually changed (already pressed/already released)
- The purpose of the stored sequences and the resulting value (1–5) is unknown — needs clarification
- The game state condition that enables sequence detection is also unidentified

## Details

| Field     | Value            |
|-----------|------------------|
| Usage     | `Hook & Call`    |
| Params    | `uint, int`      |
| Return    | `void`           |

### Parameters

| #   | Type   | Description                                      |
|-----|--------|--------------------------------------------------|
| 0   | `uint` | Keycode (see table below)                        |
| 1   | `int`  | Pressed state (non-zero = pressed, 0 = released) |

### Keycode Mappings

| Category | Key | Code |
|----------|-----|------|
| Navigation | LEFT | 0 |
| Navigation | RIGHT | 1 |
| Navigation | UP | 2 |
| Navigation | DOWN | 3 |
| Navigation | SPACE | 4 |
| Navigation | TAB | 5 |
| Navigation | ENTER | 6 |
| Navigation | ESC | 7 |
| Navigation | BACKSPACE | 91 |
| Modifiers | SHIFT | 8 |
| Modifiers | CTRL | 9 |
| Modifiers | ALT | 10 |
| Numbers | 0 | 11 |
| Numbers | 1 | 12 |
| Numbers | 2 | 13 |
| Numbers | 3 | 14 |
| Numbers | 4 | 15 |
| Numbers | 5 | 16 |
| Numbers | 6 | 17 |
| Numbers | 7 | 18 |
| Numbers | 8 | 19 |
| Numbers | 9 | 20 |
| Numbers | - | 74 |
| Numbers | = | 75 |
| Letters | A | 21 |
| Letters | B | 22 |
| Letters | C | 23 |
| Letters | D | 24 |
| Letters | E | 25 |
| Letters | F | 26 |
| Letters | G | 27 |
| Letters | H | 28 |
| Letters | I | 29 |
| Letters | J | 30 |
| Letters | K | 31 |
| Letters | L | 32 |
| Letters | M | 33 |
| Letters | N | 34 |
| Letters | O | 35 |
| Letters | P | 36 |
| Letters | Q | 37 |
| Letters | R | 38 |
| Letters | S | 39 |
| Letters | T | 40 |
| Letters | U | 41 |
| Letters | V | 42 |
| Letters | W | 43 |
| Letters | X | 44 |
| Letters | Y | 45 |
| Letters | Z | 46 |
| Numpad | NUM 0 | 47 |
| Numpad | NUM 1 | 48 |
| Numpad | NUM 2 | 49 |
| Numpad | NUM 3 | 50 |
| Numpad | NUM 4 | 51 |
| Numpad | NUM 5 | 52 |
| Numpad | NUM 6 | 53 |
| Numpad | NUM 7 | 54 |
| Numpad | NUM 8 | 55 |
| Numpad | NUM 9 | 56 |
| Numpad | NUM + | 57 |
| Numpad | NUM - | 58 |
| Numpad | NUM * | 59 |
| Numpad | NUM / | 60 |
| Function | F1 | 62 |
| Function | F2 | 63 |
| Function | F3 | 64 |
| Function | F4 | 65 |
| Function | F5 | 66 |
| Function | F6 | 67 |
| Function | F7 | 68 |
| Function | F8 | 69 |
| Function | F9 | 70 |
| Function | F10 | 71 |
| Function | F11 | 72 |
| Function | F12 | 73 |
| Mouse | LEFT CLICK | 108 |
| Mouse | RIGHT CLICK | 109 |
| Mouse | MIDDLE CLICK | 110 |

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
