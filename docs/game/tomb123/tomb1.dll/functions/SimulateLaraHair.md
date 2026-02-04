# Function: SimulateLaraHair

## Description
Simulates Lara's hair physics each frame. Processes a chain of 6 hair segments, applying gravity, floor collisions, body sphere collisions, and environmental effects (underwater sway, wind). On the first call, initializes all segment positions from the bone tree and resets physics state.

## Notes
- Param 0 controls physics mode: 0 = full simulation with floor collision checks, non-zero = skip floor checks (floor set to max height)
- Param 1 selects the hair variant/braid mesh data to simulate
- Hair consists of 6 linked segments, each with position (x, y, z), velocity, and rotation angles (yaw, pitch)
- Initialization path runs once on the first frame: positions all segments along the bone chain using matrix rotations, then resets sway/wind counters
- Kinematic fallback: when Lara has a cinematic flag set and the state check returns 0, physics simulation is skipped entirely. Hair segments are rigidly positioned using Lara's head/torso bone rotation matrix and the stored per-segment yaw/pitch angles — no gravity, collisions, or sway. This prevents hair from clipping or flailing during cutscenes
- Gravity is applied as 3/4 of the previous frame's velocity per axis
- Floor collision: uses GetSector + CalculateFloorHeight to prevent segments from going below the floor. If a segment penetrates the floor by less than 256 units, it's clamped; otherwise it snaps back to the previous position
- Body collision: checks each segment against collision spheres (from Lara's skeleton). If a segment is inside a sphere, it's pushed outward to the sphere surface using integer square root distance calculation
- Underwater behaviour (state 2): adds random oscillation to hair movement using the RNG seed, creating a flowing underwater sway effect
- Wind: when in rooms with specific flags (water surface or wind), a drift value is applied to segment Z positions
- Yaw and pitch between consecutive segments are computed using an ATAN2 lookup table
- References the LaraHairLeftX variable region for storing segment positions

## Details

| Field     | Value                          |
|-----------|--------------------------------|
| Usage     | `Hook`                         |
| Params    | `int, int`                     |
| Return    | `void`                         |

### Parameters

| #   | Type  | Description                                                |
|-----|-------|------------------------------------------------------------|
| 0   | `int` | Physics mode — 0 for full simulation with floor checks, non-zero to skip floor collision |
| 1   | `int` | Hair variant index — selects which hair/braid mesh data to use |

## Usage
### Hooking
```javascript
mod.hook('SimulateLaraHair')
    .onEnter(function(physicsMode, hairVariant) {
        // physicsMode: 0 = full physics, non-zero = no floor checks
        // hairVariant: which hair mesh to simulate
    })
    .onLeave(function(returnValue, physicsMode, hairVariant) {
        // returnValue: null (void function)
        // Hair segment positions have been updated
    });
```

## Pseudocode
```
function SimulateLaraHair(physicsMode, hairVariant):
    state = checkLaraState()

    if state == 0 and Lara has cinematic flag set:
        // kinematic fallback — skip physics, rigidly position hair
        copy Lara's head/torso bone rotation matrix
        for each of 6 segments:
            apply stored segment yaw/pitch rotation
            apply bone tree translation for hairVariant
            segment.position = matrix world position + Lara world position
        return

    computeCollisionSpheres()
    sphereCount = getCollisionSphereData(sphereBuffer)

    // determine hair attachment offset based on Lara's outfit
    attachOffset = getHairAttachPoint()
    getBonePosition(Lara, attachOffset, boneId)

    hairRoot = attachOffset position
    boneTree = meshTreePointer + hairVariant bone offset

    if firstFrame:
        // INITIALIZATION: position all 6 segments from bone chain
        for i = 0 to 5:
            setup identity matrix at segment position
            apply rotation from stored yaw/pitch
            apply bone tree translation
            extract world position from matrix
        reset sway counters, wind state
        return

    // SIMULATION: process each of the 6 segments
    GetSector(hairRoot.x, hairRoot.y, hairRoot.z, roomId)

    // determine wind/drift based on room type and state
    if state == 2:  // underwater
        apply random sway using RNG
    else if room has water surface flag:
        apply random drift
    else:
        drift = 0

    for segment = 1 to 6:
        previousPos = save current position

        if physicsMode == 0:
            floorHeight = GetSector + CalculateFloorHeight at segment
        else:
            floorHeight = MAX_HEIGHT  // skip floor checks

        // apply gravity (3/4 velocity damping)
        velocity.x = velocity.x * 3 / 4
        segment.x += velocity.x
        velocity.y = velocity.y * 3 / 4
        segment.y += velocity.y
        velocity.z = velocity.z * 3 / 4
        segment.z += velocity.z

        // underwater sway offset
        if state == 2 and Lara is idle and room has water flag:
            segment.x += swayX
            segment.z += swayZ

        // gravity pull (Y axis)
        if floorHeight not available or segment.y < floorHeight:
            segment.y += 10
            if floorHeight available and segment.y > floorHeight:
                segment.y = floorHeight
        else if state != 2:
            segment.z += drift

        // floor collision
        if segment.y > floorHeight:
            segment.x = previousPos.x
            if penetration < 256:
                segment.y = floorHeight
            segment.z = previousPos.z

        // body sphere collision
        for each collision sphere:
            distance = distanceTo(segment, sphere.center)
            if distance < sphere.radius:
                // push segment to sphere surface
                dist = integerSquareRoot(distanceSquared)
                segment = sphere.center + (sphere.radius / dist) * offset

        // compute angles between this segment and previous
        yaw = atan2Lookup(segment.z - prev.z, segment.x - prev.x)
        horizontalDist = integerSquareRoot(dx*dx + dz*dz)
        pitch = atan2Lookup(horizontalDist, segment.y - prev.y)

        // apply bone matrix transformation
        setupIdentityMatrix()
        setMatrixTranslation(previousSegment position)
        applyRotation(yaw, pitch)
        applyBoneTreeTranslation()
        extractWorldPosition()

        // store velocity for next frame
        segment.velocity = segment.position - previousPos
```
