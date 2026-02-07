# Function: ResetUiTexts

## Description
Resets the UI text pool by clearing all 64 text slots and setting `UiTextsCount` to 0. Called during level initialization after `InitializeLevelAI`. This is the correct hook for adding persistent text labels when a level starts or loads.

## Details

| Field     | Value                          |
|-----------|--------------------------------|
| Usage     | `Hook`                         |
| Params    | (none)                         |
| Return    | `void`                         |

## Behavior
1. Clears the active flag (bit 0) for all 64 text pool slots
2. Resets `UiTextsCount` to 0
3. Calls `ProcessUiTexts` to finalize the reset

## Usage

### Hooking to add text on level load
```javascript
mod.hook('ResetUiTexts')
    .onLeave(function() {
        // Add persistent text after the pool is cleared
        const label = game.callFunction(game.module, 'AddText', 100, 50, UI_RENDER_LAYER, game.allocString('Level Loaded'));
        // Configure the text entry as needed
        label.add(TEXT_FONT_SIZE).writeS32(11000);
    });
```

## Notes
- Hook `onLeave` (not `onEnter`) to ensure the pool is already cleared before adding text
- Similar to `InitializeLevelAI` — runs once per level load
- Text added here will persist until the next `ResetUiTexts` call or manual clearing
