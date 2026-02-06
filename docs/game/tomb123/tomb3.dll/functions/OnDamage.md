# Function: OnDamage

## Description
Damage event handler called when an enemy takes damage. Does not perform the actual HP subtraction — instead, evaluates level-specific conditions to track kills and accumulated damage for triggering level events (secrets, progression flags).

Checks the enemy's model type, the weapon used, and whether the damage is lethal, then applies per-level logic: TR3 levels track specific enemy kill counts and entity conditions. When thresholds are met, a level event is triggered.

## Notes
- This function does **not** subtract health from the enemy — it only reacts to damage events
- Lethality is determined by computing `health - dmg` locally and checking if ≤ 0
- Most levels have no special handling — the function returns early for levels without trigger logic
- Active levels: 4, 8, 11, 13, 14, 15, 17, 18, 21, 23, 24, 25 — all others are no-ops
- Some conditions require specific weapon types and lethal blows
- Internal flags and counters prevent the same event from being triggered more than once
- Entity ID is derived from the entity pointer offset from the entities array base

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
        log('OnDamage: model', model, 'weapon', weapon, 'dmg', dmg, 'lethal', isLethal);
    });
```

## Pseudocode
```
function OnDamage(enemy, weapon, dmg):
    enemyModel = enemy.model
    remainingHp = enemy.health - dmg
    isLethal = (remainingHp <= 0)
    entityId = (enemy - entitiesOffset) / ENTITY_SIZE
    
    switch LevelId:
        case 4:
            if enemyModel == 0x45:
                if not isLethal: return
                killCounter++
                if killCounter < 14: return
                triggerEvent(0xD6, 100)
                return
            if enemyModel == 0x49:
                if weapon != 7:
                    setFlag()
                if not isLethal: return
                if flagSet: return
                if weapon != 7: return
                if progressFlags & 2: return
                triggerEvent(0xD7, 100)
            return
        
        case 13:
            if enemyModel == 0x41 and isLethal:
                setFlag()
            return
        
        case 14:
            if enemyModel == 0x3C:
                if not isLethal: return
                if entityId != 0x3F: return
                if progressFlags & 0x400: return
                triggerEvent(0xDA, 100)
                return
            if enemyModel == 0x3E and isLethal:
                setFlag()
            return
        
        case 15:
            if enemyModel not in [0x3C, 0x3F]: return
            if not isLethal: return
            if progressFlags & 0x100: return
            if not validEntityRange(entityId): return
            killCounter++
            if killCounter < 5: return
            triggerEvent(0xDD, 100)
            return
        
        case 11:
            if VehicleId == -1: return
            if enemyModel != 0x1A: return
            if not isLethal: return
            killCounter++
            if killCounter < 4: return
            triggerEvent(0xF0, 100)
            return
        
        case 8:
            if enemyModel != 0x24: return
            if not isLethal: return
            if progressFlags & 0x80: return
            if progressFlags & 2: return
            triggerEvent(0xEB, 100)
            return
        
        case 17:
            if enemyModel != 0x2E: return
            if not isLethal: return
            killCounter++
            if killCounter < 21: return
            triggerEvent(0xF3, 100)
            return
        
        case 18:
            if enemyModel != 0x2D: return
            if entityId not in valid range: return
            if weapon != 1:
                setFlag()
                return
            if not isLethal: return
            if flagA set: return
            if flagB set: return
            killCounter++
            if killCounter < 3: return
            triggerEvent(0xF4, 100)
            return
        
        case 21:
            if enemyModel != 0x16: return
            if entityId not in valid range: return
            if not isLethal: return
            // lookup timing in entity table
            lastHitTime = lookupEntityTime(entityId)
            if totalTicks < lastHitTime + 15: return
            if progressFlags & 2: return
            triggerEvent(0x104, 100)
            updateEntityTracking(entityId)
            return
        
        case 23:
            if enemyModel != 0x1D: return
            if not isLethal: return
            if progressFlags & 0x10000: return
            killCounter++
            if killCounter < 4: return
            triggerEvent(0x10D, 100)
            return
        
        case 24:
            if enemyModel != 0x20: return
            if not isLethal: return
            if progressFlags & 2: return
            if progressFlags & 0x20000: return
            killCounter++
            if killCounter < 4: return
            triggerEvent(0x10E, 100)
            return
        
        case 25:
            if enemyModel != 0x47: return
            if entityId not in sourceList: return
            if entityId in excludeList: return
            if not isLethal: return
            killCounter++
            if killCounter < 7: return
            triggerEvent(0x110, 100)
            updateEntityTracking(entityId)
            return
```
