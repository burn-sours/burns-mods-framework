# Function: CheckAim

## Description
Evaluates whether Lara can aim at her current target. Validates range, line of sight, and whether the target falls within the weapon's aiming boundaries, then updates the left/right gun aiming states and aiming angles.

If no target exists, clears all aiming state immediately. Otherwise, calculates the relative yaw and pitch from Lara's gun position to the target, performs horizontal and vertical range checks (prioritising the axis with greater distance), verifies line of sight, and tests the resulting angles against three boundary zones: an inner lock-on zone, a left gun persistence zone, and a right gun persistence zone.

## Notes
- The source position is Lara's world position with a vertical offset applied (gun height)
- The target's 3D position is resolved from the entity pointed to by LaraAimingEnemy
- Range checks use TraceRangeX and TraceRangeZ — the one covering the greater distance axis runs first
- Line of sight is checked via TraceLineOfSight after resolving the target's sector with GetSector
- The screen boundaries parameter contains 12 consecutive Int16 angle values: 3 zones × (yaw min, yaw max, pitch min, pitch max)
  - Zone 0 (indices 0–3): inner lock-on zone — if target is within this, aiming locks on
  - Zone 1 (indices 4–7): left gun persistence zone — if already aiming and target leaves this, left gun stops aiming
  - Zone 2 (indices 8–11): right gun persistence zone — same as above for right gun
- Updates LaraAimingLeft, LaraAimingRight (0 or 1), and LaraAimingYaw/LaraAimingPitch globals
- Relative angles are computed by GetRelYawPitch then adjusted by subtracting Lara's own yaw and pitch

## Details

| Field     | Value                          |
|-----------|--------------------------------|
| Usage     | `Hook`                         |
| Params    | `pointer`                      |
| Return    | `void`                         |

### Parameters

| #   | Type      | Description                                                      |
|-----|-----------|------------------------------------------------------------------|
| 0   | `pointer` | Aiming boundaries — 12 consecutive Int16 values defining 3 angle zones |

## Usage
### Hooking
```javascript
mod.hook('CheckAim')
    .onLeave(function(returnValue, aimBoundaries) {
        // Check aiming state after evaluation
        const left = game.readVar(game.module, 'LaraAimingLeft');
        const right = game.readVar(game.module, 'LaraAimingRight');
        const yaw = game.readVar(game.module, 'LaraAimingYaw');
        const pitch = game.readVar(game.module, 'LaraAimingPitch');
        log('Aiming L:', left, 'R:', right, 'yaw:', yaw, 'pitch:', pitch);
    });
```

## Pseudocode
```
function CheckAim(aimBoundaries):
    if LaraAimingEnemy == null:
        LaraAimingLeft = 0
        LaraAimingRight = 0
        LaraAimingYaw = 0
        LaraAimingPitch = 0
        return

    // Source: Lara's position with vertical gun-height offset
    source = { Lara.x, Lara.y - gunHeightOffset, Lara.z, Lara.room }

    // Get target's world position
    targetPos = getTransformed3DPos(LaraAimingEnemy)

    // Calculate relative angles from source to target
    yaw, pitch = GetRelYawPitch(targetPos.x - source.x,
                                 targetPos.y - source.y,
                                 targetPos.z - source.z)

    // Make angles relative to Lara's facing direction
    relYaw = yaw - Lara.yaw
    relPitch = pitch - Lara.pitch

    // Range checks — run the larger-distance axis first
    verticalDist = abs(targetPos.z - source.z)
    horizontalDist = abs(targetPos.x - source.x)

    if horizontalDist < verticalDist:
        hResult = TraceRangeX(source, targetPos)
        vResult = TraceRangeZ(source, targetPos)
    else:
        vResult = TraceRangeZ(source, targetPos)
        hResult = TraceRangeX(source, targetPos)

    if hResult == 0:
        // Out of range
        LaraAimingLeft = 0
        LaraAimingRight = 0
        goto updateAngles

    // Verify line of sight
    GetSector(targetPos.x, targetPos.y, targetPos.z, roomId)
    losResult = TraceLineOfSight(source, targetPos)

    if losResult == 0 or hResult != 1 or vResult != 1:
        LaraAimingLeft = 0
        LaraAimingRight = 0
        goto updateAngles

    // Test angles against boundary zones
    if relYaw in zone0.yaw AND relPitch in zone0.pitch:
        // Target within inner lock-on zone
        LaraAimingLeft = 1
    else:
        LaraAimingLeft = 0
        // Check if left gun should stop (persistence zone)
        if LaraAimingLeft was active AND target outside zone1:
            LaraAimingLeft = 0
        // Check if right gun stays locked (persistence zone)
        if LaraAimingRight active AND target within zone2:
            skip right gun update

    LaraAimingRight = LaraAimingLeft

    updateAngles:
    LaraAimingYaw = relYaw
    LaraAimingPitch = relPitch
```
