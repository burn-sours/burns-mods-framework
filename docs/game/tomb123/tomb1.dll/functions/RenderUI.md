# Function: RenderUI

## Description
Draws the player health bar with visibility and flashing logic. Called from two points in the render loop, positioned to run at the ideal time for UI rendering each frame.

Reads Lara's health, clamps it to 0–1000, and manages a display timer that keeps the bar visible for 40 ticks after any health change. When health decreases, triggers an effect (likely a screen flash or damage indicator) via a function pointer in the executable's dispatch table. Below a critical threshold (≤250 HP), the bar flashes by alternating between drawing and hiding every other tick using BinaryTick. The actual bar rendering is delegated to DrawHealth with the health value scaled to 0–100.

The function's primary modding value is as a **UI render hook point** — it runs at the correct time in the frame loop for drawing custom UI elements.

## Notes
- Health is read from `Lara + ENTITY_HEALTH` (Int16), clamped to 0–1000
- Display timer is set to 40 (0x28) ticks whenever health changes, then counts down
- When health decreases, an unknown function is called (likely a damage flash or screen effect)
- A rendering mode flag (bit 0) controls an overlay mode — when set and HP ≤ 250, the bar flashes via BinaryTick. Same flag checked in DrawHealth
- `LaraGunType == 4` bypasses the hide logic — the bar stays visible regardless of the timer (purpose of this weapon type exception is unclear)
- The bar is hidden when: HP > 0, timer has expired, gun type is not 4, and the overlay flag condition isn't forcing visibility
- DrawHealth receives `hp / 10` (0–100 range); when flashing at critical HP on even ticks, it receives 0

## Details

| Field     | Value       |
|-----------|-------------|
| Usage     | `Hook`      |
| Params    | _(none)_    |

## Usage
### Hooking
```javascript
// Hook to add custom UI rendering at the right point in the frame loop
mod.hook('RenderUI')
    .onLeave(function() {
        // Draw custom UI here — runs every frame after the health bar
        // Use DrawSetup with UI_RENDER_LAYER before drawing primitives
        game.callFunction(game.module, 'DrawSetup', UI_RENDER_LAYER, ptr(0));
        // Then use DrawRect for your custom elements
    });
```

## Pseudocode
```
function RenderUI():
    tick = BinaryTick
    hp = Lara.ENTITY_HEALTH  // Int16
    clamp hp to 0–1000

    if hp == storedHP:
        if displayTimer < 0:
            displayTimer = 0
    else:
        if hp < storedHP:  // health decreased
            call exe dispatch function(0, 0x4000, 0x4000, 2, 0x1000, 1)  // damage effect
        displayTimer = 40
        storedHP = hp

    // visibility logic
    if overlay flag bit 0 is NOT set OR hp > 250:
        if displayTimer < 1 AND hp > 0 AND LaraGunType != 4:
            return  // hide bar
    else:
        // critical HP flashing mode
        if tick == 0:
            DrawHealth(0)  // flash off
            return

    DrawHealth(hp / 10)  // draw bar (0–100 scale)
```
