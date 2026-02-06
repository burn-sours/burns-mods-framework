# Function: RenderUI

## Description
Draws the player health bar with visibility and flashing logic. Called from the render loop, positioned to run at the ideal time for UI rendering each frame.

Reads Lara's health, clamps it to 0–1000, and manages a display timer that keeps the bar visible for 40 ticks after any health change. When health decreases, triggers an effect (likely a screen flash or damage indicator) via a function pointer in the executable's dispatch table. Below a critical threshold (≤250 HP), the bar flashes by alternating between drawing and hiding every other tick using BinaryTick. The actual bar rendering is delegated to DrawHealth with the health value scaled to 0–100.

The function's primary modding value is as a **UI render hook point** — it runs at the correct time in the frame loop for drawing custom UI elements.

## Notes
- **TR2-specific**: Level 18 has special handling — skips rendering if a specific flag and Lara state condition is met
- Health is read from `Lara + ENTITY_HEALTH` (Int16), clamped to 0–1000
- Display timer is set to 40 (0x28) ticks whenever health changes, then counts down
- When health decreases, an effect function is called (likely a damage flash)
- Below 251 HP, the bar flashes via BinaryTick — on tick 0, DrawHealth(0) is called
- `LaraGunType == 4` bypasses the hide logic — the bar stays visible regardless of the timer
- The bar is hidden when: HP > 250, timer has expired, and gun type is not 4
- DrawHealth receives `hp / 10` (0–100 range)

## Details

| Field     | Value       |
|-----------|-------------|
| Usage     | `Hook`      |
| Params    | _(none)_    |
| Return    | `void`      |

## Usage
### Hooking
```javascript
// Hook to add custom UI rendering at the right point in the frame loop
mod.hook('RenderUI')
    .onLeave(function() {
        // Draw custom UI here — runs every frame after the health bar
        game.callFunction(game.module, 'DrawSetup', UI_RENDER_LAYER, ptr(0));
        // Then use DrawRect, DrawQuad, AddText for your custom elements
    });
```

## Pseudocode
```
function RenderUI():
    tick = BinaryTick
    
    // TR2-specific: Level 18 special condition
    if LevelId == 18 and (flags & 4) and Lara.state == 10:
        return
    
    hp = Lara.ENTITY_HEALTH
    
    // Clamp health to 0–1000
    if hp < 0:
        hp = 0
    else if hp > 1000:
        hp = 1000
    
    // Update display timer
    if hp == storedHP:
        if displayTimer < 0:
            displayTimer = 0
    else:
        if hp < storedHP:  // health decreased
            triggerDamageEffect(0, 0x4000, 0x4000, 2, 0x1000, 1)
        displayTimer = 40
        storedHP = hp
    
    // Visibility and flashing logic
    if hp < 251:  // critical HP
        if tick == 0:
            DrawHealth(0)  // flash off
            return
    else:
        // Normal HP — check if should hide
        if displayTimer < 1 and LaraGunType != 4:
            return  // hide bar
    
    DrawHealth(hp / 10)  // draw bar (0–100 scale)
```
