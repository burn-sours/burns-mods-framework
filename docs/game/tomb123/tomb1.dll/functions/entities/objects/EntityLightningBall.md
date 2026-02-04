# Function: EntityLightningBall

## Description
Controls lightning ball objects that cycle between a charging phase and a striking phase. During strikes, checks if Lara is within range and deals damage on hit, or targets a random point on miss. Toggles the flip map during strikes to change room lighting. Operates in two modes depending on a behaviour data flag — a wider-range mode with extensive ambient visual effects (used on level 5, Folly), and a tighter-range mode that targets the floor on miss (used in Atlantis levels).

## Notes
- Only called by the game loop for entities on the active processing list (`ENTITY_STATUS` bit 0 set)
- Called with the entity's index into the entity array, not a pointer
- **Trigger toggle**: uses `ENTITY_FLAGS` bits 9–14 and `ENTITY_TIMER` to determine activation state
- **Behaviour data**: reads a pointer from `ENTITY_BEHAVIOUR` containing the lightning ball's state, timers, mode flag, strike target, and bolt visual data
- **Two modes** controlled by a flag in the behaviour data:
  - Mode 0 (Folly/level 5): detection range 2560, on miss targets a random bone position on the entity via `GetBonePosition`, extensive ambient effects
  - Mode non-zero (Atlantis): detection range 1024, on miss targets the floor directly below the entity via `GetSector` + `CalculateFloorHeight`
- **Deactivation** (target 0): resets behaviour data, flips the map back if active, removes from processing list, clears status bits
- **Charging phase** (active flag off): counts down a random timer (35–79 frames). When timer expires, transitions to strike phase
- **Strike phase** (active flag on, 20 frame duration):
  - Uses a proximity check to determine if Lara is in range
  - **Hit**: targets Lara's position, deals -400 damage (instant kill in NG+ on applicable levels), sets Lara's trap damage flag
  - **Miss**: targets a random bone (mode 0) or the floor (mode non-zero)
  - Generates 2 lightning bolt segments with random offsets near the target position
  - Toggles `FlipMap` at strike start/end to change room lighting
  - Plays sound 98 at the entity position
- **Visual effects** (while striking): adds 2 dynamic lights — one at the entity, one at the target — with randomised colours. On level 5, additionally renders bolt lines between segments and creates randomised line effects near the target
- **Level 5 ambient effects** (every frame): random chance to create spark/glow effects near a stored position in the behaviour data, and random chance to create spark effects at random bone positions with line effects between nearby points
- Calls a bolt rendering update function every frame

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
// Log when lightning strikes and whether it hits Lara
mod.hook('EntityLightningBall')
    .onEnter(function(entityId) {
        log('Lightning ball tick, entity:', entityId);
    });
```

### Calling from mod code
```javascript
game.callFunction(game.module, 'EntityLightningBall', lightningBallEntityIndex);
```

## Pseudocode
```
function EntityLightningBall(entityId):
    entity = entities[entityId]
    data = entity[ENTITY_BEHAVIOUR]  // lightning ball state

    // Trigger/timer toggle
    target = (~(entity[ENTITY_FLAGS] >> 14)) & 1
    if ENTITY_FLAGS bits 9–13 all set:
        ...resolve target using ENTITY_TIMER...
    else:
        target = target ^ 1

    if target == 0:
        // --- Deactivate ---
        reset data (timer = 1, active = 0, hit = 0)
        if flipMapStatus active:
            FlipMap()
        removeFromProcessingList(entityId)
        clear ENTITY_STATUS bits 1 and 2
        goto VISUAL_UPDATE

    // --- Active cycle ---
    data.timer -= 1

    if data.timer <= 0:
        if data.active == 0:
            // Charging complete — begin strike
            data.active = 1
            data.timer = 20
            clear bolt segment data

            // Determine detection range based on mode
            if data.mode == 0:
                range = 2560      // Folly — wider
            else:
                range = 1024      // Atlantis — tighter

            // Check if Lara is within range
            if proximityCheck(entity.position, range) hits Lara:
                // HIT — target Lara
                data.target = Lara.position
                if not NG+ OR level 16–19 OR specific difficulty:
                    Lara.health -= 400
                else:
                    Lara.health = -1  // instant kill
                set Lara status bit 4  // trap damage
                data.hitLara = 1
            else:
                // MISS — target random point
                if data.mode == 0:
                    data.target = GetBonePosition(entity, randomBone)
                else:
                    data.target.x = entity.x
                    data.target.z = entity.z
                    data.target.y = CalculateFloorHeight(entity.position)
                data.hitLara = 0

            // Generate 2 bolt segments with random offsets near target
            for each of 2 bolt segments:
                randomise bolt properties and endpoint near target
                clear bolt visual data

            // Toggle room lighting
            if not demo mode AND flipMap not active:
                FlipMap()

        else:
            // Strike complete — begin charging
            data.active = 0
            data.hitLara = 0
            data.timer = random(35–79)
            if flipMap active:
                FlipMap()  // restore lighting

        SoundEffect(98, entity.position, 0)

    // --- Dynamic lights (while striking) ---
    if data.active:
        add dynamic light at entity position (random colour)
        add dynamic light at target position (random colour)

        // Level 5 (Folly): bolt line rendering + extra effects
        if level == 5:
            render bolt lines between segments
            create randomised line effects near target

VISUAL_UPDATE:
    updateBoltRendering(entity)

    // Level 5: ambient spark/glow effects
    if level == 5:
        random chance: create 3 ambient effects near stored position
        random chance: create spark effects at random bone positions
                       with line effects between nearby points
```
