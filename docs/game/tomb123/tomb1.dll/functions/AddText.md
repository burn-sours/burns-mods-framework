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
- The text content can be updated after creation using `game.updateString` on the text pointer at offset `0x48`.

## Text Entry Structure

| Offset | Type    | Description                              |
|--------|---------|------------------------------------------|
| 0x00   | Int32   | Flags (e.g. `4097` / `0x1001`)           |
| 0x0C   | Float   | X position                               |
| 0x10   | Float   | Y position                               |
| 0x14   | Int32   | Unknown (initialized to 0)               |
| 0x38   | Int64   | Unknown (initialized to 0)               |
| 0x40   | Int32   | Color (e.g. `0x00011111`)                |
| 0x44   | Int32   | Unknown (initialized to 0)               |
| 0x48   | Pointer | Text string pointer                      |
| 0x50   | Int32   | Font size (e.g. `11000`)                 |

> **Note:** The z order parameter (param 2) is written as a UInt16 at offset `0x42`, which sits within the color field at `0x40`. Writing color as an Int32 at `0x40` will overwrite the z order value.

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
entry.writeS32(4097);                // flags
entry.add(0x50).writeS32(11000);     // font size
entry.add(0x40).writeS32(0x00011111); // color
entry.add(0xc).writeFloat(x);        // x position
entry.add(0x10).writeFloat(y);       // y position

// Update text content later
game.updateString(entry.add(0x48).readPointer(), 'Updated text');
```

## Pseudocode
```
function AddText(xOffset, yOffset, zOffset, text):
    if text == null: return null
    if UiTextsCount >= 64: return null

    // Search pool for a free slot (walks 4 at a time)
    for slotIndex = 0 to 63:
        slot = uiTextPool[slotIndex]
        if slot is inactive (flags bit 0 == 0):
            // Copy text string into slot's dedicated buffer (512 bytes each)
            copy text -> textBuffer[slotIndex]

            slot.unknown_0x44 = 0
            slot.textPointer = textBuffer[slotIndex]
            slot.unknown_0x14 = 0
            slot.color_zOrder = zOffset (at +0x42 as uint16)
            slot.flags = 1 (active)
            slot.unknown_0x08 = 0
            slot.x = (float)xOffset
            slot.unknown_0x38 = 0
            slot.y = (float)yOffset
            slot.fontSize = globalFontSize != -1 ? globalFontSize : 0x10000

            UiTextsCount++
            return slot

    return null
```
