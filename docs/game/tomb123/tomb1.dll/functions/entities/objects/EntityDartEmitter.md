# Function: EntityDartEmitter

## Description
Controls dart emitter trap objects. Uses a trigger/timer toggle to cycle between idle and firing states. On the firing frame, spawns a dart entity offset from the emitter based on its facing direction, allocates a projectile for collision tracking, and plays a sound effect. In demo mode, the projectile is immediately destroyed and replaced with randomised spark effects.

## Notes
- Only called by the game loop for entities on the active processing list (`ENTITY_STATUS` bit 0 set)
- Called with the entity's index into the entity array, not a pointer
- **Trigger toggle**: uses `ENTITY_FLAGS` bits 9–14 and `ENTITY_TIMER` to determine activation state
- **State behaviour**:
  - Target on + current state 0: sets target state 1 (begin firing animation), animates, returns early
  - Target off + current state 1: sets target state 0 (return to idle)
  - Current state 1 (either toggle direction): proceeds to dart spawn check
- **Dart spawn conditions**: current state is 1, animation frame equals the start frame of the current animation, AND a free entity slot is available
- **Dart entity setup**:
  - Model 39 (dart projectile model)
  - Same room as emitter, copies emitter's yaw
  - Y offset: 512 units above the emitter
  - X/Z offset: 412 units in the emitter's facing direction (cardinal axes only — north, south, east, west)
  - Initialises the dart's animation, adds to active processing list if it has a behaviour function, sets status to active
- **Projectile allocation**: allocates a projectile entry for the dart, copies position data, sets projectile speed to 160, plays sound 151 at the dart's position
- **Demo mode**: if a demo flag is set, immediately destroys the projectile and creates 10 spark particles with random spread along the dart's travel axis using the RNG
- Calls `ProcessEntityAnimation` on the emitter every frame (at the end, regardless of spawn logic)

## Details

| Field     | Value                          |
|-----------|--------------------------------|
| Usage     | `Hook & Call`                  |
| Params    | `int`                          |
| Return    | `void`                         |

### Parameters

| #   | Type  | Description                          |
|-----|-------|--------------------------------------|
| 0   | `int` | Entity index in the entity array     |

## Usage
### Hooking
```javascript
// Log each time a dart is fired
mod.hook('EntityDartEmitter')
    .onEnter(function(entityId) {
        const entities = game.readVar(game.module, 'Entities');
        const entity = entities.add(entityId * ENTITY_SIZE);
        this._state = entity.add(ENTITY_CURRENT_STATE).readS16();
    });
```

### Calling from mod code
```javascript
game.callFunction(game.module, 'EntityDartEmitter', dartEmitterEntityIndex);
```

## Pseudocode
```
function EntityDartEmitter(entityId):
    entity = entities[entityId]

    // Trigger/timer toggle
    target = (~(entity[ENTITY_FLAGS] >> 14)) & 1
    if ENTITY_FLAGS bits 9–13 all set:
        ...resolve target using ENTITY_TIMER...
    else:
        target = target ^ 1

    currentState = entity[ENTITY_CURRENT_STATE]

    if target == 0:
        // Toggle off
        if currentState != 1: goto ANIMATE
        entity[ENTITY_TARGET_STATE] = 0  // return to idle

    else:
        // Toggle on
        if currentState == 0:
            entity[ENTITY_TARGET_STATE] = 1  // begin firing
            ProcessEntityAnimation(entity)
            return
        if currentState != 1: goto ANIMATE

    // --- Dart spawn (state 1, at fire frame) ---
    if entity[ENTITY_ANIM_FRAME] != startFrameOf(entity[ENTITY_ANIM_ID]):
        goto ANIMATE
    if no free entity slot available:
        goto ANIMATE

    // Claim a free entity slot for the dart
    dart = freeEntitySlot
    dart[ENTITY_MODEL] = 39             // dart model
    dart[ENTITY_ROOM] = entity[ENTITY_ROOM]
    dart[ENTITY_FLAGS] = 0
    dart[ENTITY_YAW] = entity[ENTITY_YAW]
    dart.y = entity.y - 512              // above emitter

    // Offset dart position based on emitter yaw (cardinal directions)
    switch entity[ENTITY_YAW]:
        South: dart.z = entity.z + 412
        West:  dart.x = entity.x + 412
        North: dart.z = entity.z - 412
        East:  dart.x = entity.x - 412

    // Initialise dart entity (animation, behaviour)
    initialiseEntity(dart)

    // Add dart to active processing list if it has a behaviour
    if dart has behaviour function:
        add to processing list
    set dart status to active

    // Allocate projectile for collision tracking
    projectile = allocateProjectile(dart[ENTITY_ROOM])
    if projectile valid:
        copy dart position to projectile
        projectile.speed = 160
        SoundEffect(151, dart.position, 0)

        // Demo mode: replace projectile with spark effects
        if demo flag set:
            destroyProjectile(projectile)
            repeat 10 times:
                create spark at dart position with random spread

ANIMATE:
    ProcessEntityAnimation(entity)
```
