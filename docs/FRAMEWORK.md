# Burn's Mods Framework

A builder API for creating game mods that run via Frida injection. Mods are defined declaratively in `src/mod/` and paired with a UI panel.

## Getting Started

A mod is a single file that declares what it does using the builder API. The framework compiles your declarations into a Frida script, injects it into the game process, and manages the lifecycle.

Mod files follow the naming convention `mod.js` (default) or `mod.{name}.js` (named mods, e.g. `mod.no-fall-damage.js`). Each mod can have a matching UI file: `ui.html` or `ui.{name}.html`.

```javascript
const { createMod } = require('../framework/framework');

const mod = createMod('my-mod', 'tomb123', ['tomb1.dll', 'tomb2.dll']);

// ... declarations ...

module.exports = mod;
```

### `createMod(name, game, modules)`

| Param | Description |
|---|---|
| `name` | Display name shown in the shell title bar |
| `game` | Game config ID: `'tomb123'` or `'tomb456'` |
| `modules` | Array of game DLLs this mod supports (e.g. `['tomb1.dll']`) |

The `modules` array determines which game DLLs your mod is compatible with. Loops are automatically skipped when the player is in an unsupported module.

## Runtime Scope
A mod file is a **declaration**, not a script. You're using a builder API to describe what should happen — the framework then generates and injects the actual runtime script into the game process.

Only the **bodies of your callbacks** make it into the final script. Everything else in your mod file (constants, variables, functions, imports) exists only during the build step and is discarded. Use `game.*` to store any runtime state or constants. The `game` object persists across all callbacks.


```javascript
const MY_CONST = 100;                    // ❌ Build-time only, discarded
function myHelper() { ... }              // ❌ Build-time only, discarded

mod.init(function() {                    // ✅ This function body is serialized into the game
    game.MY_CONST = 100;                 // ✅ Exists at runtime
    game.myHelper = function() { ... };  // ✅ Exists at runtime
});

mod.hook('SomeFunction')
    .onEnter(function() {                // ✅ This function body is serialized into the game
        log(MY_CONST);                   // ❌ ReferenceError — MY_CONST doesn't exist here
        log(game.MY_CONST);              // ✅ Works
    });
```

## Builder API

All builder methods return `this` for chaining.


### `mod.init(fn)`

Called once after injection, when all modules are loaded and hooks are installed. Use this for initial state setup.

```javascript
mod.init(function() {
    game._lara = game.getVarPtr(game.module, 'Lara').readPointer();
});
```

### `mod.exit(fn)`

Called before the script is unloaded. Use this to clean up any mod state.

```javascript
mod.exit(function() {
    game._lara = null;
});
```

### `mod.hook(name)`

Intercept a game function. The `name` must match a hook defined in the patch data, or you can specify a custom address with `.at()`.

Parameters are spread into the callback signature, typed automatically — `int` params arrive as JS numbers, `pointer` params as `NativePointer`.

```javascript
// SoundEffect has params: ['int', 'pointer', 'int']
mod.hook('SoundEffect')
    .onEnter(function(soundId, pos, flags) {
        log('Sound:', soundId); // soundId is a number
    });

// onLeave receives the return value (typed) and original params
// return a value to override the original return value
mod.hook('SoundEffect')
    .onLeave(function(returnValue, soundId, pos, flags) {
        log('SoundEffect:', soundId);
        if (soundId === 0) return 1; // override return value
    });

// replace works the same way
mod.hook('SoundEffect')
    .replace(function(soundId, pos, flags) {
        // completely replaces the game function with our callback
        if (soundId === 42) return 0;

        // run the original function we replaced
        return game.callFunction(game.module, 'SoundEffect', soundId, pos, flags);
    });
```

#### Hook builder methods

| Method | Description |
|---|---|
| `.at(module, offset)` | Override with a custom address instead of using patch data |
| `.params(types)` | Override parameter types (e.g. `['int', 'pointer']`) |
| `.returns(type)` | Override return type (e.g. `'int'`) |
| `.onEnter(fn)` | `fn(...params)` |
| `.onLeave(fn)` | `fn(returnValue, ...params)` — return a value to override (`returnValue` is `null` for void hooks) |
| `.replace(fn)` | `fn(...params)` |

Use either `.onEnter()`/`.onLeave()` or `.replace()`, not both.

You should use `.replace()` if you want to completely replace the function, or conditionally prevent it from running.

> ⚠️ **Warning:** Using `.replace()` can make your mod incompatible with other mods running at the same time. If a second mod hooks the same function after a replace, and the replacing mod is removed first, it can break the game or the other mod. **Only use `.replace()` when you absolutely cannot achieve the result with `.onEnter()`/`.onLeave()`.**

### `mod.loop(name)`

Register a recurring game-side loop. Runs via recursive `setTimeout` to prevent callback stacking.

Loops are automatically skipped when `game.module` is not in the mod's supported modules list.

```javascript
mod.loop('myLoop')
    .every(50)
    .run(function() {
        if (!game._lara || game._lara.isNull()) return;

        const speed = game._lara.add(ENTITY_Y_SPEED).readS16();
        if (speed > 130) {
            game._lara.add(ENTITY_Y_SPEED).writeS16(130);
        }
    });
```

| Method | Description |
|---|---|
| `.every(ms)` | Delay between ticks in milliseconds |
| `.run(fn)` | Callback function |

### `mod.variable(name)`

Declare a custom variable that isn't in the patch data. Injected into the address table at runtime.

```javascript
mod.variable('MyCustomVar')
    .at('tomb1.dll', 0x12345)
    .type('Int32');

// Pointer-chased variable
mod.variable('MyPointerVar')
    .at('tomb1.dll', 0x12345)
    .type('Block')
    .pointer(0x10)
    .size(0x28);
```

| Method | Description |
|---|---|
| `.at(module, offset)` | Module name and hex offset |
| `.type(typeName)` | Data type (see [Variable Types](#variable-types)) |
| `.pointer(offset)` | Chase a pointer at the address, then add this offset |
| `.size(n)` | Size in bytes (required for `Block` type) |

### `mod.nop(module, address, size)`

NOP out instructions at a given address. Original bytes are backed up and restored on cleanup.

```javascript
mod.nop('tomb1.dll', 0x1A2B3, 6);
```

### `mod.receive(name, fn)`

Register a game-side handler for commands sent from the UI. See [Communication](#communication).

```javascript
mod.receive('toggleFeature', function(data) {
    game._featureEnabled = data.enabled;
});
```

### `mod.on(event, fn)`

Register a launcher-side handler for events sent from the game. Runs in Node.js, not in the game process.

```javascript
mod.on('stateUpdate', function(data) {
    console.log('Level:', data.level);
});
```

## Game Runtime

The `game` object is a global available in all game-side callbacks. It is the runtime API for interacting with the game process.

### Reading and Writing Variables

Variables are defined in patch data files with a name, address, type, and optional pointer offset. You access them by module name and variable name.

```javascript
// Read
const level = game.readVar(game.module, 'LevelId');
const base = game.readVar('tomb1.dll', 'Lara');

// Write
game.writeVar(game.module, 'LaraOxygen', 1800);

// Get raw pointer to a variable's address
const ptr = game.getVarPtr(game.module, 'Lara');
const lara = ptr.readPointer();

// Read a block (returns ArrayBuffer)
const data = game.readBlock(game.module, 'WorldStateBackupPointer');
```

### Raw Memory Access

For working with addresses directly, outside the named variable system.

```javascript
// Typed read/write at an absolute address
const val = game.readMemory(addr, 'Int32');
game.writeMemory(addr, 'Float', 1.5);

// Allocate memory
const buf = game.alloc(256);
const str = game.allocString('hello');
```

### Module Info

```javascript
game.executable  // e.g. "tomb123.exe"
game.module      // e.g. "tomb1.dll" (currently active game, based on GameVersion)
                 // returns null if no module is active

game.isModuleSupported(game.module)  // true if module is in this mod's supported list
```

### Calling Game Functions

All hooks from patch data are auto-registered as callable native functions. Custom hooks declared with `mod.hook().at()` are also registered as callable.

```javascript
if (game.hasFunction(game.module, 'SoundEffect')) {
    game.callFunction(game.module, 'SoundEffect', 42, ptr(0), 0);
}
```

### Pointer Arithmetic

The `game` object supports dynamic state. You can store any property on it to persist state between callbacks.

```javascript
// In a hook
game._lara = game.getVarPtr(game.module, 'Lara').readPointer();

// In a loop - use NativePointer methods for struct field access
const health = game._lara.add(ENTITY_HEALTH).readS16();
const x = game._lara.add(ENTITY_X).readS32();
game._lara.add(ENTITY_Y_SPEED).writeS16(0);
```

### Logging

Use the global `log`, `warn`, and `error` functions to send messages to the UI log panel. Do not use `console.log` — Frida routes it to stdout only.

```javascript
log('Lara entered the level', lara);
warn('Module not supported');
error('Failed to read pointer');
```

| Function | UI color |
|---|---|
| `log(...)` | Orange (default) |
| `warn(...)` | Grey |
| `error(...)` | Red |

### Utility

```javascript
await game.delay(100);  // async delay
```

## Communication

The framework provides bidirectional communication between the game process and the UI.

### Game to UI

In game-side code, use `send()` to emit events:

```javascript
// In a loop or hook (game-side)
send({ event: 'stateUpdate', data: { level: 5, health: 1000 } });
```

In `ui.html`, listen for events:

```html
<script>
    window.framework.onEvent((payload) => {
        if (payload.event === 'stateUpdate') {
            document.getElementById('level').textContent = payload.data.level;
        }
    });
</script>
```

Launcher-side handlers can also be registered in `mod.js`:

```javascript
mod.on('stateUpdate', function(data) {
    console.log('Level:', data.level);
});
```

### UI to Game

In `ui.html`, send commands to the game:

```html
<button onclick="window.framework.send('toggleGodMode', { enabled: true })">
    Enable God Mode
</button>
```

In `mod.js`, register the game-side handler:

```javascript
mod.receive('toggleGodMode', function(data) {
    game._godMode = data.enabled;
});
```

## Mod Selection

The shell displays a dropdown listing all mods found in `src/mod/`. Selecting a mod switches the active mod and loads its UI panel. The dropdown is disabled while a session is active.

## UI

Each mod can have a UI file loaded into the shell's mod panel: `ui.html` for `mod.js`, or `ui.{name}.html` for `mod.{name}.js`. If no UI file exists, the panel is cleared. This is standard HTML/CSS/JS with access to `window.framework`:

| Method | Description |
|---|---|
| `window.framework.onEvent(callback)` | Receive events from the game |
| `window.framework.send(name, data)` | Send commands to the game |
| `window.framework.onStatus(callback)` | Listen for status changes (`idle`, `active`, `error`, etc.) |

## Variable Types

These types can be used in patch data files and with `mod.variable().type()`:

| Type | Size | Description |
|---|---|---|
| `Int8` | 1 | Signed 8-bit integer |
| `UInt8` | 1 | Unsigned 8-bit integer |
| `Int16` | 2 | Signed 16-bit integer |
| `UInt16` | 2 | Unsigned 16-bit integer |
| `Int32` | 4 | Signed 32-bit integer |
| `UInt32` | 4 | Unsigned 32-bit integer |
| `Int64` | 8 | Signed 64-bit integer |
| `UInt64` | 8 | Unsigned 64-bit integer |
| `Float` | 4 | 32-bit float |
| `Double` | 8 | 64-bit double |
| `Pointer` | 4/8 | Native pointer |
| `Block` | variable | Raw byte array (requires `Size`) |
| `Utf8String` | variable | UTF-8 string |
| `Utf16String` | variable | UTF-16 string |
| `AnsiString` | variable | ANSI string (Windows) |

## Game Constants

Each game config defines struct sizes and field offsets as globals, available in all game-side callbacks.

```javascript
// Entity struct field offsets
ENTITY_X            // X position (Int32)
ENTITY_Y            // Y position (Int32)
ENTITY_Z            // Z position (Int32)
ENTITY_YAW          // Rotation (Int16)
ENTITY_HEALTH       // Health (Int16)
ENTITY_Y_SPEED      // Vertical speed (Int16)
ENTITY_XZ_SPEED     // Horizontal speed (Int16)
ENTITY_CURRENT_STATE // Current animation state (Int16)
ENTITY_ANIM_ID      // Current animation ID (Int16)
ENTITY_ANIM_FRAME   // Current animation frame (Int16)
ENTITY_FLAGS        // Entity flags (Int32)

// Struct sizes
ENTITY_SIZE         // Full entity struct size
ROOM_SIZE           // Room struct size

// Usage: read a field from an entity pointer
const ySpeed = entityPtr.add(ENTITY_Y_SPEED).readS16();
```

See the game config files in `src/framework/games/` for the full list of constants.

## File Structure

```
src/
  mod/
    mod.js              # Default mod definition
    mod.{name}.js       # Named mods (e.g. mod.no-fall-damage.js)
    ui.html             # UI for mod.js
    ui.{name}.html      # UI for mod.{name}.js
  framework/
    framework.js    # Builder API (createMod, builders)
    runtime.js      # Game-side runtime template (game object)
    generator.js    # Compiles mod declarations into Frida script
    client.js       # Frida session lifecycle
    main.js         # Electron entry point
    preload.js      # IPC bridge
    shell.html      # Shell UI (status, logs, mod panel)
    types/
      runtime.d.ts  # Type declarations for IDE support
    games/
      tomb123/      # Game config + patch data for TR I-III
      tomb456/      # Game config + patch data for TR IV-VI
```

## Example

A complete mod that caps fall speed (no fall damage):

```javascript
const { createMod } = require('../framework/framework');

const mod = createMod('no-fall-damage', 'tomb123', ['tomb1.dll']);

mod.init(function() {
    try {
        game._lara = game.readVar(game.module, 'Lara');
    } catch(e) {
        game._lara = null;
    }
});

mod.hook('InitializeLevelAI')
    .onLeave(function(returnValue) {
        try {
            game._lara = game.readVar(game.module, 'Lara');
        } catch(e) {
            game._lara = null;
        }
    });

mod.loop('noFallDamage')
    .every(50)
    .run(function() {
        if (!game._lara || game._lara.isNull()) return;

        const roomType = game.readVar(game.module, 'RoomType');
        if (roomType !== 0) return;

        const speed = game._lara.add(ENTITY_Y_SPEED).readS16();
        if (speed > 130) {
            game._lara.add(ENTITY_Y_SPEED).writeS16(130);
        }
    });

mod.exit(function() {
    game._lara = null;
});

module.exports = mod;
```
