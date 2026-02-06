# Function: DropEnemyItems

## Description
Spawns up to 4 linked item drops from a dying enemy entity. Each enemy can have up to 4 drop slots (ENTITY_DROP_1 through ENTITY_DROP_4) containing entity IDs of items to drop. The dropped items are moved to the enemy's position, weapon models are swapped to ammo variants if Lara already owns that weapon, and the items are activated in the game world.

## Notes
- Processes all 4 drop slots (ENTITY_DROP_1 through ENTITY_DROP_4) — a slot value of -1 means no drop
- Each dropped entity's position is set to the dying enemy's position (copies ENTITY_X, ENTITY_Y, ENTITY_Z)
- **Weapon-to-ammo swap:** If the drop is a weapon (shotgun, magnums, or uzis) and Lara already has that weapon in her inventory, the drop's model is changed to the corresponding ammo type instead
- If the dropped entity is in a different room than the enemy, it gets moved to the enemy's room
- After positioning, the entity is activated: if it has a behaviour function, it runs immediately and a bone snapshot is taken; if it has no behaviour, it's deactivated (flags cleared)
- Activated drops get linked into the ProcessingEntityId chain for continued processing

## Details

| Field     | Value                          |
|-----------|--------------------------------|
| Usage     | `Hook`                         |
| Params    | `pointer`                      |
| Return    | `void`                         |

### Parameters

| #   | Type      | Description                              |
|-----|-----------|------------------------------------------|
| 0   | `pointer` | Pointer to the dying enemy entity        |

## Usage
### Hooking
```javascript
mod.hook('DropEnemyItems')
    .onEnter(function(entityPtr) {
        const drop1 = entityPtr.add(ENTITY_DROP_1).readS16();
        const drop2 = entityPtr.add(ENTITY_DROP_2).readS16();
        log('Enemy dropping items:', drop1, drop2);
    });
```

## Pseudocode
```
function DropEnemyItems(entity):
    for each dropSlot in [ENTITY_DROP_1, ENTITY_DROP_2, ENTITY_DROP_3, ENTITY_DROP_4]:
        dropId = entity[dropSlot]
        if dropId == -1:
            continue

        dropEntity = Entities[dropId]

        // Position the drop at the enemy's location
        dropEntity.x = entity.x
        dropEntity.y = entity.y
        dropEntity.z = entity.z

        // If drop is a weapon Lara already has, swap to ammo model
        if dropEntity.model == Shotgun and inventoryHas(Shotgun):
            dropEntity.model = ShotgunShells
        else if dropEntity.model == Magnums and inventoryHas(Magnums):
            dropEntity.model = MagnumClips
        else if dropEntity.model == Uzis and inventoryHas(Uzis):
            dropEntity.model = UziClips

        // Move to enemy's room if needed
        if dropEntity.room != entity.room:
            changeRoom(dropId, entity.room)

        // Activate the dropped entity
        if dropEntity has no behaviour function:
            clear active flags on dropEntity
        else if dropEntity is not already active:
            set active flag
            link dropEntity into ProcessingEntityId chain

        // Run behaviour and snapshot bones if behaviour exists
        if dropEntity has behaviour function:
            runBehaviour(dropEntity)
            snapshotBones(dropEntity)
            copy position to last position
```
