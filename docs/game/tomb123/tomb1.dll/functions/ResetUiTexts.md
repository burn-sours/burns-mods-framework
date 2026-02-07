# Function: ResetUiTexts

## Description
Resets the UI text pool by clearing all 64 text slots and setting `UiTextsCount` to 0. Called during level initialization after `InitializeLevelAI`. This is the correct hook for adding persistent text labels when a level starts or loads.

## Notes
- Hook `onLeave` (not `onEnter`) to ensure the pool is already cleared before adding text
- Similar to `InitializeLevelAI` — runs once per level load
- Text added here will persist until the next `ResetUiTexts` call or manual clearing

## Details

| Field     | Value                          |
|-----------|--------------------------------|
| Usage     | `Hook`                         |
| Params    | *(none)*                       |
| Return    | `void`                         |

## Usage
### Hooking
```javascript
mod.hook('ResetUiTexts')
    .onLeave(function() {
        // Add persistent text after the pool is cleared
        const label = game.callFunction(game.module, 'AddText', 100, 50, 0, game.allocString('Level Loaded'));
        // Configure the text entry as needed
        label.add(TEXT_FONT_SIZE).writeS16(11000);
    });
```

## Pseudocode
```
function ResetUiTexts():
    for i = 0 to 63:
        UiTexts[i].flags &= ~1  // clear active bit
    
    UiTextsCount = 0
    ProcessUiTexts()
```
