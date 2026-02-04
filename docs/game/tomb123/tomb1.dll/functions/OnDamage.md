# Function: OnDamage

## Description
Damage event handler called when an enemy takes damage. Does not perform the actual HP subtraction — instead, evaluates level-specific conditions to track kills and accumulated damage for triggering level events (secrets, progression flags).

Checks the enemy's model type, the weapon used, and whether the damage is lethal, then applies per-level logic: some levels track specific enemy kill counts, others track accumulated damage against particular enemy types with specific weapons. When thresholds are met, a level event is triggered.

## Notes
- This function does **not** subtract health from the enemy — it only reacts to damage events
- Lethality is determined by computing `health - dmg` into a local variable and checking if the result is ≤ 0 — the enemy's actual health is never modified
- Most levels have no special handling — the function returns early for levels without trigger logic
- Active levels: 3, 5, 6, 8, 9, 13, 14, 15, 19 — all others are no-ops
- Some conditions require a specific weapon type and that the blow is lethal
- NewGamePlus state can gate certain trigger conditions on specific levels
- Internal flags prevent the same event from being triggered more than once per playthrough
- The function reads from the Lara entity pointer, LevelId, and NewGamePlus globals
- Level event triggers pass an event ID and a fixed parameter value

## Details

| Field     | Value                          |
|-----------|--------------------------------|
| Usage     | `Hook & Call`                  |
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
        const hp = enemy.add(ENTITY_HEALTH).readS16();
        const model = enemy.add(ENTITY_MODEL).readS16();
        log('Damage:', dmg, 'to model', model, 'hp:', hp, 'weapon:', weapon);
    });
```

### Calling from mod code
```javascript
// Deal damage to an entity
const entities = game.readVar(game.module, 'Entities');
const enemyPtr = entities.add(entityIndex * ENTITY_SIZE);
game.callFunction(game.module, 'OnDamage', enemyPtr, weaponType, damageAmount);
```

## Pseudocode
```
function OnDamage(enemy, weapon, dmg):
    remainingHp = enemy.health - dmg    // local only, health not modified
    enemyModel = enemy.model
    isLethal = (remainingHp <= 0)

    // Level-specific trigger tracking
    switch LevelId:

        case 3:
            if enemyModel matches target type:
                set progression flag
            return

        case 6:
            // Lara and enemy must be in specific rooms
            if rooms don't match required areas:
                fall through to general check
            if not isLethal:
                fall through to general check
            // Track kills by enemy model type (3 separate counters)
            increment counter for matching model
            if kill thresholds met (type A ≥ 4 AND types B+C ≥ 6):
                trigger level event
            else:
                fall through to general check

        case 14:
            if enemyModel matches target type:
                set progression flag
            return

        case 13:
            // Guarded by progression flag and NewGamePlus conditions
            if already triggered: return
            if enemyModel != required type: return
            if weapon != required type: return
            track accumulated damage
            if damage threshold reached:
                trigger level event

        case 15:
            if already triggered: return
            if enemyModel != required type: return
            if weapon != required type: return
            if not isLethal: return
            trigger level event

        case 19:
            if enemyModel != required type: return
            if weapon != required type: return
            if Lara not in required room: return
            if already triggered: return
            if not isLethal: return
            increment kill counter
            if kill count ≥ 2:
                trigger level event

        default:
            // Only levels 5, 6, 8, 9 reach the general check
            if LevelId not in [5, 6, 8, 9]: return

    // General check (levels 5, 6, 8, 9 + level 6 fallthrough)
    if already triggered: return
    if enemyModel != required type: return
    if weapon != required type: return
    if NewGamePlus conditions not met: return
    if level-specific room conditions not met: return
    track accumulated damage
    if accumulated damage > threshold:
        trigger level event
```
