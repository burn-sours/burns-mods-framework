# Variable: WorldStateBackupPointer

## Description
A memory block holding a backup/snapshot of the world state. Used by the save/restore system for recording and replaying game state.

## Notes
- Block of 14,336 bytes (0x3800)
- Used alongside `RecordWorldState` and `RestoreWorldState` hooks

## Details

| Field     | Value           |
|-----------|-----------------|
| Type      | `Block`         |
| Size      | `0x3800`        |

## Usage
### Calling from mod code
```javascript
const ptr = game.getVarPtr(game.module, 'WorldStateBackupPointer');
```
