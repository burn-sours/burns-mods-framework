# Function: WorldStateRecordReplay

## Description
Per-frame state machine that handles demo recording and playback. During recording, snapshots the world state then writes player input keys into the demo buffer each frame. During playback, restores the world state then reads input keys back from the buffer each frame, driving the game as if the player were providing input.

## Notes
- Operates as a state machine driven by an internal demo mode flag (states: idle, start recording, recording, stop recording, start playback, playing back)
- The demo buffer is shared — the world state snapshot occupies the beginning, and per-frame input data follows sequentially after it
- RecordWorldState(1) and RestoreWorldState(1) are called at the start of recording and playback respectively to establish the world state baseline
- The input stream is terminated by a sentinel value (-1) when recording ends
- The buffer has a maximum frame capacity; recording or playback stops automatically if the limit is reached
- When playback finishes (sentinel hit or buffer exhausted), input keys are cleared and the demo mode is reset to idle

## Details

| Field     | Value                          |
|-----------|--------------------------------|
| Usage     | `Hook`                         |
| Params    | *(none)*                       |
| Return    | `void`                         |

## Usage
### Hooking
```javascript
mod.hook('WorldStateRecordReplay')
    .onEnter(function() {
        // Called every frame — demo state machine tick
    })
    .onLeave(function(returnValue) {
        // returnValue: null (void)
    });
```

## Pseudocode
```
function WorldStateRecordReplay():
    demoMode = current demo state

    switch demoMode:
        case START_RECORDING:
            set demoMode = RECORDING
            reset frame counter to start of input region
            RecordWorldState(1)  // snapshot world for demo

        case RECORDING:
            if frame counter within buffer limit:
                write current actionKeys to demo buffer at frame counter
                advance frame counter
            else:
                set demoMode = IDLE  // buffer full

        case STOP_RECORDING:
            if frame counter exceeds buffer limit:
                clamp to limit
            write sentinel (-1) at current frame position
            advance frame counter
            set demoMode = IDLE

        case START_PLAYBACK:
            set demoMode = PLAYING
            RestoreWorldState(1)  // restore world from demo snapshot
            reset frame counter to start of input region

        case PLAYING:
            if frame counter exceeds buffer limit:
                clear actionKeys
                set demoMode = IDLE
                return
            read actionKeys from demo buffer at frame counter
            if actionKeys == sentinel (-1):
                clear actionKeys
                set demoMode = IDLE
                return
            advance frame counter

        default:
            return  // idle or unknown state
```
