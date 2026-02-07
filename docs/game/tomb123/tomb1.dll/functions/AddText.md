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
- The text content can be updated after creation by writing to the text buffer via `entry.add(TEXT_STRING).readPointer().writeUtf8String()`.

## Text Entry Structure

| Constant       | Type    | Description                    |
|----------------|---------|--------------------------------|
| TEXT_FLAGS      | UInt32  | Flags (e.g. `0x1001`)          |
| TEXT_X          | Float   | X position                     |
| TEXT_Y          | Float   | Y position                     |
| TEXT_COLOR      | UInt32  | Color — `0x0` = white. Exact encoding TBD |
| TEXT_STRING     | Pointer | Text string pointer            |
| TEXT_FONT_SIZE  | UInt32  | Font size (e.g. `11000`)       |

## Text Flags

| Flag | Value | Description |
|------|-------|-------------|
| TEXT_FLAG_ACTIVE | 0x1 | Entry is in use |
| TEXT_FLAG_ALT_COLOR | 0x4 | Alt color for normal font (TR2/TR3 only) |
| TEXT_FLAG_CENTER_H | 0x10 | Horizontal center |
| TEXT_FLAG_CENTER_V | 0x20 | Vertical center |
| TEXT_FLAG_END_H | 0x80 | Horizontal end (right align) |
| TEXT_FLAG_END_V | 0x100 | Vertical end (bottom align) |
| TEXT_FLAG_BACKGROUND | 0x200 | Show background behind text |
| TEXT_FLAG_BORDER | 0x400 | Show border around text |
| TEXT_FLAG_HEADING | 0x3000 | Heading font (uses gradient color) |
| TEXT_FLAG_DIM | 0x4000 | Dim text |
| TEXT_FLAG_OFFSET_H | 0x8000 | Horizontal offset |

### Alignment

| Axis | Start | Center | End |
|------|-------|--------|-----|
| Horizontal | default | TEXT_FLAG_CENTER_H | TEXT_FLAG_END_H |
| Vertical | default | TEXT_FLAG_CENTER_V | TEXT_FLAG_END_V |

### Color Behavior

- **Normal font**: Fixed color with outline. TEXT_COLOR is ignored. Use TEXT_FLAG_ALT_COLOR for alternate color (TR2/TR3 only).
- **Heading font** (TEXT_FLAG_HEADING): Uses TEXT_COLOR for gradient. Color value controls both gradient colors.

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
| 2   | `int`     | Color high word (upper 16 bits of TEXT_COLOR) |
| 3   | `pointer` | Pointer to null-terminated text string        |

### Return Values

| Value     | Description                                  |
|-----------|----------------------------------------------|
| `pointer` | Pointer to the allocated text entry in the pool |
| `null`    | Text was null or pool is full (64 entries)   |

## Usage
### Hooking
```javascript
mod.hook('AddText')
    .onEnter(function(x, y, colorHigh, text) {
        log('AddText:', x, y, colorHigh, text.readUtf8String());
    });
```

### Calling from mod code
```javascript
const entry = game.callFunction(game.module, 'AddText', 0, 0, 0, game.allocString('Hello'));

// Modify properties on the returned entry
entry.writeU32(0x1001);                              // TEXT_FLAGS
entry.add(TEXT_FONT_SIZE).writeU32(11000);            // font size
entry.add(TEXT_COLOR).writeU32(0x1111);               // color
entry.add(TEXT_X).writeFloat(x);                      // x position
entry.add(TEXT_Y).writeFloat(y);                      // y position

// Update text content later
entry.add(TEXT_STRING).readPointer().writeUtf8String('Updated text');
```

## Pseudocode
```
function AddText(xOffset, yOffset, colorHigh, text):
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
            slot[TEXT_COLOR + 2] = colorHigh  // upper 16 bits
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
