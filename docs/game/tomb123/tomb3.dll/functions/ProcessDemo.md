# Function: ProcessDemo

## Description
State machine that handles demo recording and playback. Called every game loop iteration; does nothing when idle. During recording, snapshots the world state then writes player input keys into the demo buffer each game loop iteration. During playback, restores the world state then reads input keys back from the buffer each iteration, driving the game as if the player were providing input.

## Notes
- Operates as a state machine driven by an internal demo mode flag (states: idle, start recording, recording, stop recording, start playback, playing back)
- The demo buffer is shared — the world state snapshot occupies the beginning, and per-frame input data follows sequentially after it
- RecordWorldState(1) and RestoreWorldState(1) are called at the start of recording and playback respectively to establish the world state baseline
- The input stream is terminated by a sentinel value (-1) when recording ends
- The buffer has a maximum frame capacity (23336 frames / 0x5b28); recording or playback stops automatically if the limit is reached
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
mod.hook('ProcessDemo')
    .onEnter(function() {
        // Called every game loop iteration — demo state machine
    })
    .onLeave(function(returnValue) {
        // returnValue: null (void)
    });
```

## Pseudocode
```
function ProcessDemo():
    demoMode = current demo state

    switch demoMode:
        case 1 (START_RECORDING):
            set demoMode = 2 (RECORDING)
            reset frame counter to 0xe03 (start of input region)
            RecordWorldState(1)  // snapshot world for demo

        case 2 (RECORDING):
            if frame counter < 0x5b28:
                write current actionKeys to demo buffer at frame counter
                advance frame counter
            else:
                set demoMode = 0 (IDLE)  // buffer full

        case 3 (STOP_RECORDING):
            if frame counter > 0x5b27:
                clamp to 0x5b27
            write sentinel (-1) at current frame position
            advance frame counter
            set demoMode = 0 (IDLE)

        case 4 (START_PLAYBACK):
            set demoMode = 5 (PLAYING)
            RestoreWorldState(1)  // restore world from demo snapshot
            reset frame counter to 0xe03 (start of input region)

        case 5 (PLAYING):
            if frame counter > 0x5b27:
                clear actionKeys
                set demoMode = 0 (IDLE)
                return
            read actionKeys from demo buffer at frame counter
            if actionKeys == -1:
                clear actionKeys
                set demoMode = 0 (IDLE)
                return
            advance frame counter

        default:
            return  // idle or unknown state
```
