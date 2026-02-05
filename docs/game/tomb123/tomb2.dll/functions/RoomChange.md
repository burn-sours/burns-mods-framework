# Function: RoomChange

## Description
Moves an entity from its current room to a different room by updating the room linked lists. Each room maintains a singly linked list of entities (via `ROOM_ENTITY_HEAD` and `ENTITY_NEXT_IN_ROOM`). This function unlinks the entity from its current room's list, updates the entity's room field, and inserts it at the head of the new room's list.

If entities are currently being processed (iteration is active), the room change is deferred — it's queued with operation type 4 and executed after processing completes. This prevents corrupting the entity list mid-iteration.

## Notes
- Safe to call during entity processing — automatically defers via the internal queue
- Operates on the `Entities` and `Rooms` arrays using `ENTITY_SIZE` (`0xe50`) and `ROOM_SIZE` (`0xa8`) strides
- The linked list uses `ENTITY_NEXT_IN_ROOM` (offset `0x1e`) as the next pointer, with `-1` as the terminator
- Entity is always inserted at the head of the new room's list
- Skips unlinking if the entity's current room is `0xff` (invalid/no-room state)

## Details

| Field     | Value          |
|-----------|----------------|
| Usage     | `Hook & Call`  |
| Params    | `int, int`     |
| Return    | `void`         |

### Parameters

| #   | Type  | Description                              |
|-----|-------|------------------------------------------|
| 0   | `int` | Entity ID to move                        |
| 1   | `int` | Destination room ID                      |

## Usage
### Hooking
```javascript
mod.hook('RoomChange')
    .onEnter(function(entityId, newRoomId) {
        // entityId: entity being moved
        // newRoomId: target room
    });
```

### Calling from mod code
```javascript
// Move entity 5 into room 12
game.callFunction(game.module, 'RoomChange', 5, 12);
```

## Pseudocode
```
function RoomChange(entityId, newRoomId):
    // defer if entities are currently being iterated
    if processingEntities:
        queue operation: entityId, newRoomId, operation type 4
        increment queue count
        return

    entity = Entities + entityId * ENTITY_SIZE
    currentRoomId = entity[ENTITY_ROOM]

    // skip unlinking if entity has no valid room
    if currentRoomId != 0xff:
        room = Rooms + currentRoomId * ROOM_SIZE

        // unlink entity from current room's linked list
        if room[ROOM_ENTITY_HEAD] == entityId:
            // entity is the head — point head to the next entity
            room[ROOM_ENTITY_HEAD] = entity[ENTITY_NEXT_IN_ROOM]
        else:
            // walk the list to find the entity before this one
            prev = room[ROOM_ENTITY_HEAD]
            while prev != -1:
                next = Entities[prev * ENTITY_SIZE + ENTITY_NEXT_IN_ROOM]
                if next == entityId:
                    // splice out: prev.next = entity.next
                    Entities[prev * ENTITY_SIZE + ENTITY_NEXT_IN_ROOM] = entity[ENTITY_NEXT_IN_ROOM]
                    break
                prev = next

    // link entity into new room's list (insert at head)
    entity[ENTITY_ROOM] = newRoomId
    newRoom = Rooms + newRoomId * ROOM_SIZE
    entity[ENTITY_NEXT_IN_ROOM] = newRoom[ROOM_ENTITY_HEAD]
    newRoom[ROOM_ENTITY_HEAD] = entityId
```
