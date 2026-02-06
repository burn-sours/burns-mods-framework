# Function: UpdateEnemyMood

## Description
Updates an enemy's AI mood state based on tracking data from `SenseLara`, the aggressive flag, and current conditions (zone reachability, distance, whether the entity has been hit). The mood drives which state transitions the entity's behaviour function chooses — bored enemies wander, attackers pursue, stalkers approach cautiously, and escaping enemies flee. Also updates the entity's pathfinding target after mood changes.

## Notes
- Called by all entity behaviour functions after `SenseLara`, passing the tracking data output
- The aggressive flag (param 2) fundamentally changes mood logic:
  - **Aggressive (1)**: entities quickly enter attack mode when in the same zone as Lara, and rarely escape
  - **Passive (0)**: entities prefer stalking and may escape when hit — more cautious transitions
- Zone matching (`SenseLara` output fields 0 and 1 being equal) is the primary factor — enemies can only attack or stalk when they can pathfind to Lara
- Being hit by Lara (`ENTITY_STATUS` bit 4) can trigger escape in passive enemies or random mood shifts
- If Lara is dead (health ≤ 0), mood is forced to bored (0)
- When mood changes, the current pathfinding target is reset and a new one is calculated based on the new mood
- Pathfinding targets vary by mood:
  - **Bored**: random box in the zone
  - **Attack**: Lara's current position (with vertical adjustment for flying entities)
  - **Escape**: random box that leads away from Lara
  - **Stalk**: random box with zone/path validation

### Mood Values

| Value | Name   | Description                                              |
|-------|--------|----------------------------------------------------------|
| 0     | Bored  | Passive wandering, picks random navigation targets       |
| 1     | Attack | Actively pursuing Lara, targets her position             |
| 2     | Escape | Fleeing from Lara, picks boxes away from her             |
| 3     | Stalk  | Cautious approach, validates paths before committing     |

### Aggressive Mode Transitions

| From    | Condition                  | To      |
|---------|----------------------------|---------|
| Bored   | Same zone as Lara          | Attack  |
| Bored   | Hit by Lara                | Escape  |
| Attack  | Different zone             | Bored   |
| Escape  | Same zone                  | Attack  |
| Stalk   | Same zone                  | Attack  |

### Passive Mode Transitions

| From    | Condition                           | To      |
|---------|--------------------------------------|---------|
| Bored   | Hit + random chance                  | Escape  |
| Bored   | Same zone + close or no path to stalk| Attack  |
| Bored   | Same zone + far                      | Stalk   |
| Attack  | Hit + random chance                  | Escape  |
| Attack  | Different zone                       | Bored   |
| Escape  | Same zone + random chance            | Stalk   |
| Stalk   | Same transitions as Bored            | —       |

## Details

| Field     | Value                          |
|-----------|--------------------------------|
| Usage     | `Hook & Call`                  |
| Params    | `pointer, pointer, int`        |
| Return    | `void`                         |

### Parameters

| #   | Type      | Description                                                  |
|-----|-----------|--------------------------------------------------------------|
| 0   | `pointer` | Pointer to the entity                                        |
| 1   | `pointer` | Pointer to `SenseLara` output (`AI_TRACKING_SIZE` bytes)     |
| 2   | `int`     | Aggressive flag — 0 for passive mood logic, 1 for aggressive |

## Usage
### Hooking
```javascript
// Force all enemies into attack mode
mod.hook('UpdateEnemyMood')
    .onLeave(function(returnValue, entityPtr, trackDataPtr, aggressive) {
        const behaviour = entityPtr.add(ENTITY_BEHAVIOUR).readPointer();
        if (!behaviour.isNull()) {
            behaviour.add(0x14).writeS32(1);  // force attack mood
        }
    });
```

### Calling from mod code
```javascript
// Manually update mood for an entity with tracking data
const aiData = game.alloc(AI_TRACKING_SIZE);
game.callFunction(game.module, 'SenseLara', entityPtr, aiData);
game.callFunction(game.module, 'UpdateEnemyMood', entityPtr, aiData, 1);
```

## Pseudocode
```
function UpdateEnemyMood(entity, trackData, aggressive):
    behaviour = entity[ENTITY_BEHAVIOUR]
    if behaviour == null: return

    // Check if entity's current box is blocked
    if entity's box marked blocked in overlap data:
        reset pathBox to 0x7FF (none)

    // Validate existing path
    if mood != attack AND pathBox is valid:
        if cannot reach pathBox from entity zone:
            if same zone as Lara: mood = bored
            reset pathBox

    // Lara dead → bored
    if Lara health <= 0:
        mood = bored
        skip to target calculation

    // Mood transitions
    if aggressive:
        switch mood:
            bored:  if same zone → attack; if hit → escape
            attack: if different zone → bored
            escape: if same zone → attack
            stalk:  if same zone → attack; if hit → escape
    else (passive):
        switch mood:
            bored:
                if hit: random → escape, or if different zone: escape
                if same zone + close: attack
                if same zone + far: stalk
            attack:
                if hit: random → escape
                if different zone: bored
            escape:
                if same zone: random → stalk
            stalk:
                same as bored logic

    // On mood change: cleanup old path, reset pathBox
    if mood changed:
        if was attack: cleanup overlap data
        pathBox = 0x7FF

    // Calculate new pathfinding target
    switch mood:
        bored:
            pick random box from zone, validate path

        attack:
            random chance → target Lara's X/Y/Z directly
            for flying entities: adjust Y by Lara's bounding box

        escape:
            pick random box, validate reachable
            reject if box center is between entity and Lara

        stalk:
            if pathBox valid: try to reach it
            else: pick random box, validate zone path

    // Finalize
    if target box unset: use entity's current ENTITY_BOX_INDEX
    update pathfinding route to target
```
