# Function: AddText

## Description
Adds a text entry to the UI text pool for on-screen rendering. Allocates a slot from a fixed pool of 64 text entries, copies the string into a dedicated text buffer, and sets up position and display properties. Returns a pointer to the allocated text entry, or null if the pool is full or the input text is null.

## Notes
- Maximum of 64 simultaneous text entries (pool size `0x40`). Returns null when full.
- Each text slot has a 512-byte string buffer (`0x200`), so text is limited to that length.
- The text string is copied into the internal buffer — the original pointer does not need to stay valid after the call.
- Increments UiTextsCount on success.
- The pool search is unrolled — walks 4 slots at a time looking for inactive entries (active flag bit 0 == 0).
- X and Y offsets are stored internally as floats.
- A default style/font value is applied from a global setting if it is not -1.

## Details

| Field     | Value                          |
|-----------|--------------------------------|
| Usage     | `Hook & Call`                  |
| Params    | `int, int, int, pointer`       |
| Return    | `pointer`                      |

### Parameters

| #   | Type      | Description                                  |
|-----|-----------|----------------------------------------------|
| 0   | `int`     | X position offset on screen                  |
| 1   | `int`     | Y position offset on screen                  |
| 2   | `int`     | Z order / render layer offset                |
| 3   | `pointer` | Pointer to null-terminated text string        |

### Return Values

| Value     | Description                                  |
|-----------|----------------------------------------------|
| `pointer` | Pointer to the allocated text entry in the pool |
| `null`    | Text was null or pool is full (64 entries)   |

## Usage
### Hooking
```javascript
mod.hook('AddText', (args) => {
    // args[0] = x offset
    // args[1] = y offset
    // args[2] = z order
    // args[3] = text string pointer
});
```

### Calling from mod code
```javascript
const text = game.allocString('Hello World');
const entry = game.callFunction(game.module, 'AddText', x, y, z, text);
```

## Pseudocode
```
function AddText(xOffset, yOffset, zOffset, text):
    if text == null: return null
    if UiTextsCount >= 64: return null

    // Search pool for a free slot (walks 4 at a time)
    for slotIndex = 0 to 63:
        slot = uiTextPool[slotIndex]
        if slot is inactive (active flag bit 0 == 0):
            // Copy text string into slot's dedicated buffer (512 bytes each)
            copy text -> textBuffer[slotIndex]

            slot.unknown_0x44 = 0
            slot.textPointer = textBuffer[slotIndex]
            slot.unknown_0x14 = 0
            slot.zOrder = zOffset
            slot.active = 1
            slot.unknown_0x08 = 0
            slot.x = (float)xOffset
            slot.unknown_0x40 = 0
            slot.y = (float)yOffset
            slot.style = globalStyleSetting != -1 ? globalStyleSetting : 0x10000

            UiTextsCount++
            return slot

    return null
```
