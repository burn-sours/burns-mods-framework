# Function: OnDamage

## Description
Damage event handler called when an enemy takes damage. Does not perform the actual HP subtraction — instead, evaluates level-specific conditions to track kills and accumulated damage for triggering level events (secrets, progression flags).

Checks the enemy's model type, the weapon used, and whether the damage is lethal, then applies per-level logic: TR2 levels track specific enemy kill counts and room conditions. When thresholds are met, a level event is triggered.

## Notes
- This function does **not** subtract health from the enemy — it only reacts to damage events
- Lethality is determined by computing `health - dmg` locally and checking if ≤ 0
- Most levels have no special handling — the function returns early for levels without trigger logic
- Active levels: 1, 7, 8, 10, 11, 15, 16, 18, 20, 21, 22, 23 — all others are no-ops
- Some conditions require specific weapon types and lethal blows
- NewGamePlus state gates certain trigger conditions (level 21)
- Internal flags prevent the same event from being triggered more than once
- Room checks compare both enemy and Lara's room against required areas

## Details

| Field     | Value                          |
|-----------|--------------------------------|
| Usage     | `Hook`                         |
| Params    | `pointer, int, int`            |
| Return    | `void`                         |

### Parameters

| #   | Type      | Description                    |
|-----|-----------|--------------------------------|
| 0   | `pointer` | Enemy entity pointer           |
| 1   | `int`     | Weapon type identifier         |
| 2   | `int`     | Damage amount                  |

## Usage
### Hooking
```javascript
mod.hook('OnDamage')
    .onEnter(function(enemy, weapon, dmg) {
        const hpBefore = enemy.add(ENTITY_HEALTH).readS16();
        const model = enemy.add(ENTITY_MODEL).readS16();
        const hpAfter = hpBefore - dmg;
        const isLethal = hpAfter <= 0;
    });
```

## Pseudocode
```
function OnDamage(enemy, weapon, dmg):
    enemyModel = enemy.model
    remainingHp = enemy.health - dmg
    isLethal = (remainingHp <= 0)
    
    // Level 18: Multi-enemy arena kill tracking
    if LevelId == 18:
        if not isLethal: return
        if enemy.room not in [63..66]: return
        if Lara.room not in [63..66]: return
        if not (progressFlags & 0x80): return
        if enemyModel in [15, 16, 20, 32]:
            killCounter++
        if killCounter == 16:
            triggerEvent(165, 100)
        return
    
    // Level 1: Specific enemy with weapon type
    if LevelId == 1:
        if enemyModel != 214: return
        if weapon != 6: return
        if not isLethal: return
        if progressFlags & 2: return
        killCounter++
        if killCounter >= 2:
            triggerEvent(118, 100)
        return
    
    // Level 11: Room-specific kill
    if LevelId == 11:
        if enemyModel != 39: return
        if not isLethal: return
        if enemy.room not in [78..80]: return
        triggerEvent(144, 100)
        return
    
    // Level 15: Mass enemy kill tracking
    if LevelId == 15:
        if enemyModel in [36, 37]:
            if not isLethal: return
            if weapon != 1: return
            if progressFlags & 0x200: return
            if enemy.room not in [148..160]: return
            killCounter++
            if killCounter >= 12:
                triggerEvent(158, 100)
        return
    
    // Level 16: Boss tracking with state flag
    if LevelId == 16:
        if enemyModel != 43: return
        if enemy.state == 355:
            progressFlags |= 0x100
        if not isLethal: return
        if progressFlags & 0x100: return
        killCounter++
        if killCounter >= 8:
            triggerEvent(160, 100)
        return
    
    // Levels 7, 8, 10 (not 9): Flag set only
    if LevelId in [7, 8, 10]:
        if enemyModel != 25: return
        progressFlags |= 0x2000000
        return
    
    // Level 20: Kill count tracking
    if LevelId == 20:
        if not isLethal: return
        if enemyModel != 34: return
        if progressFlags & 2: return
        if progressFlags & 0x40000: return
        killCounter++
        if killCounter >= 6:
            triggerEvent(178, 100)
        return
    
    // Level 21: Multiple enemy types with NG+ check
    if LevelId == 21:
        if not isLethal: return
        if enemyModel == 28:
            progressFlags |= 0x4000000
            return
        if enemyModel != 37: return
        if weapon != 6: return
        killCounter++
        if killCounter < 2: return
        if progressFlags & 2: return
        // NG+ gating conditions
        if NewGamePlus and versionCheck and stateChecks:
            return
        triggerEvent(183, 100)
        return
    
    // Level 22: Specific room requirement
    if LevelId == 22:
        if not isLethal: return
        if enemyModel != 46: return
        if Lara.room != 77: return
        if enemy.room != 77: return
        if flagCheck != 1: return
        triggerEvent(187, 100)
        return
    
    // Level 23: Dual enemy type tracking
    if LevelId == 23:
        if enemyModel == 46:
            // Room flag tracking
            if enemy.room != 6 or Lara.room != 6:
                progressFlags |= 0x80000
            if not isLethal: return
            if progressFlags & 0x80000: return
            if progressFlags & 2: return
            triggerEvent(190, 100)
        else if enemyModel == 214:
            if not isLethal: return
            killCounter++
            if killCounter < 2: return
            if progressFlags & 2: return
            triggerEvent(171, 100)
        return
```
