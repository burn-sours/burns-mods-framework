# Function: AddText

## Description
Adds a text entry to the UI text pool for on-screen rendering. Allocates a slot from a fixed pool of 64 text entries, copies the string into a dedicated text buffer, and sets up position and display properties. Returns a pointer to the allocated text entry, or null if the pool is full or the input text is null.

The returned pointer can be used to modify the text entry's properties directly (position, font size, color, flags).

## Notes
- Maximum of 64 simultaneous text entries (pool size `0x40`). Returns null when full.
- Each text slot has a 512-byte string buffer (`0x200`), so text is limited to that length.
- The text string is copied into the internal buffer — the original pointer does not need to stay valid after the call.
- Increments UiTextsCount on success.
- The pool search is unrolled — walks 4 slots at a time looking for inactive entries (active flag bit 0 == 0).
- X and Y offsets are stored internally as floats.
- A default font size value is applied from a global setting if it is not -1, otherwise defaults to `0x10000`.
- The text content can be updated after creation using `game.updateString` on the text pointer at TEXT_STRING.

## Text Entry Structure

| Constant       | Type    | Description                    |
|----------------|---------|--------------------------------|
| TEXT_FLAGS      | Int32   | Flags (e.g. `0x1001`)          |
| TEXT_X          | Float   | X position                     |
| TEXT_Y          | Float   | Y position                     |
| TEXT_COLOR      | UInt16  | Color                          |
| TEXT_Z_ORDER    | UInt16  | Z order / render layer         |
| TEXT_STRING     | Pointer | Text string pointer            |
| TEXT_FONT_SIZE  | Int32   | Font size (e.g. `11000`)       |

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
const entry = ptr(game.callFunction(game.module, 'AddText', 0, 0, UI_RENDER_LAYER, game.allocString('Hello')));

// Modify properties on the returned entry
entry.writeS32(0x1001);                              // TEXT_FLAGS
entry.add(TEXT_FONT_SIZE).writeS32(11000);            // font size
entry.add(TEXT_COLOR).writeU16(0x1111);               // color
entry.add(TEXT_X).writeFloat(x);                      // x position
entry.add(TEXT_Y).writeFloat(y);                      // y position

// Update text content later
game.updateString(entry.add(TEXT_STRING).readPointer(), 'Updated text');
```

## Pseudocode
```
function AddText(xOffset, yOffset, zOffset, text):
    if text == null: return null
    if UiTextsCount >= 64: return null

    // Search pool for a free slot (walks 4 at a time)
    for slotIndex = 0 to 63:
        slot = uiTextPool[slotIndex]
        if slot is inactive (TEXT_FLAGS bit 0 == 0):
            // Copy text string into slot's dedicated buffer (512 bytes each)
            copy text -> textBuffer[slotIndex]

            slot.unknown_0x44 = 0
            slot[TEXT_STRING] = textBuffer[slotIndex]
            slot.unknown_0x14 = 0
            slot[TEXT_Z_ORDER] = zOffset
            slot[TEXT_FLAGS] = 1 (active)
            slot.unknown_0x08 = 0
            slot[TEXT_X] = (float)xOffset
            slot.unknown_0x38 = 0
            slot[TEXT_Y] = (float)yOffset
            slot[TEXT_FONT_SIZE] = globalFontSize != -1 ? globalFontSize : 0x10000

            UiTextsCount++
            return slot

    return null
```
