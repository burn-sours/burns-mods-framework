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
game.callFunction(game.exe, 'KeyboardInput', keycode, 1);
// Simulate a key release
game.callFunction(game.exe, 'KeyboardInput', keycode, 0);
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
