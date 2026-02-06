const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { createMod } = require('../src/framework/framework');
const { ScriptGenerator } = require('../src/framework/generator');

const mockGameConfig = {
    executable: 'tomb123.exe',
    modules: {
        'tomb1.dll': { id: 'tr1', name: 'Tomb Raider I' },
    },
    constants: {
        ENTITY_Y_SPEED: 0x24,
        ENTITY_HEALTH: 0x26,
        ENTITY_SIZE: 0xE50,
    },
    patches: {},
};

const mockPatchData = {
    name: 'Test Patch',
    memory: {
        'tomb123.exe': {
            constants: {
                UI_RENDER_LAYER: 0x39,
            },
            variables: {
                GameVersion: { Address: '0xe4bd8', Type: 'Int32' },
            },
            hooks: {
                TickFunction: { Address: '0x7dc0', Params: ['pointer'], Return: 'void' },
            },
        },
        'tomb1.dll': {
            variables: {
                LevelId: { Address: '0xe2ab8', Type: 'Int32' },
                LaraBase: { Address: '0x311030', Type: 'Int64' },
                RoomType: { Address: '0x310e8c', Type: 'Int16' },
            },
            hooks: {
                LaraInLevel: { Address: '0x2d1c0', Params: [], Return: 'void' },
                SoundEffect: { Address: '0x7b6c0', Params: ['int', 'pointer', 'int'], Return: 'int' },
            },
        },
    },
};

describe('ScriptGenerator: generate', () => {
    it('produces a non-empty script string', () => {
        const mod = createMod('Test', 'tomb123', ['tomb1.dll']);
        mod.init(function() {});
        mod.exit(function() {});
        const gen = new ScriptGenerator(mod, mockGameConfig, mockPatchData);
        const script = gen.generate();
        assert.equal(typeof script, 'string');
        assert.ok(script.length > 0);
    });

    it('includes manifest with executable and modules', () => {
        const mod = createMod('Test', 'tomb123', ['tomb1.dll']);
        const gen = new ScriptGenerator(mod, mockGameConfig, mockPatchData);
        const script = gen.generate();
        assert.ok(script.includes('tomb123.exe'));
        assert.ok(script.includes('tomb1.dll'));
        assert.ok(script.includes('const manifest'));
        assert.ok(script.includes('_supportedModules'));
    });

    it('emits game constants', () => {
        const mod = createMod('Test', 'tomb123', ['tomb1.dll']);
        const gen = new ScriptGenerator(mod, mockGameConfig, mockPatchData);
        const script = gen.generate();
        assert.ok(script.includes('const ENTITY_Y_SPEED = 0x24'));
        assert.ok(script.includes('const ENTITY_HEALTH = 0x26'));
        assert.ok(script.includes('const ENTITY_SIZE = 0xe50'));
    });

    it('emits patch-level constants from executable module', () => {
        const mod = createMod('Test', 'tomb123', ['tomb1.dll']);
        const gen = new ScriptGenerator(mod, mockGameConfig, mockPatchData);
        const script = gen.generate();
        assert.ok(script.includes('const UI_RENDER_LAYER = 0x39'));
    });

    it('patch constants override game constants with same name', () => {
        const configWithOverlap = {
            ...mockGameConfig,
            constants: { ...mockGameConfig.constants, UI_RENDER_LAYER: 0x10 },
        };
        const mod = createMod('Test', 'tomb123', ['tomb1.dll']);
        const gen = new ScriptGenerator(mod, configWithOverlap, mockPatchData);
        const script = gen.generate();
        // Patch value (0x39) should win over game value (0x10)
        assert.ok(script.includes('const UI_RENDER_LAYER = 0x39'));
        assert.ok(!script.includes('const UI_RENDER_LAYER = 0x10'));
    });

    it('emits address table with variables and hooks', () => {
        const mod = createMod('Test', 'tomb123', ['tomb1.dll']);
        const gen = new ScriptGenerator(mod, mockGameConfig, mockPatchData);
        const script = gen.generate();
        assert.ok(script.includes('memoryAddresses'));
        assert.ok(script.includes('LevelId'));
        assert.ok(script.includes('LaraBase'));
        assert.ok(script.includes('GameVersion'));
    });

    it('emits function registrations from patch data', () => {
        const mod = createMod('Test', 'tomb123', ['tomb1.dll']);
        const gen = new ScriptGenerator(mod, mockGameConfig, mockPatchData);
        const script = gen.generate();
        assert.ok(script.includes('registerFunction'));
        assert.ok(script.includes('LaraInLevel'));
        assert.ok(script.includes('SoundEffect'));
        assert.ok(script.includes('TickFunction'));
    });

    it('emits __init call at the end', () => {
        const mod = createMod('Test', 'tomb123', ['tomb1.dll']);
        const gen = new ScriptGenerator(mod, mockGameConfig, mockPatchData);
        const script = gen.generate();
        assert.ok(script.trimEnd().endsWith('__init();'));
    });
});

describe('ScriptGenerator: hooks', () => {
    it('emits onEnter hook with typed args', () => {
        const mod = createMod('Test', 'tomb123', ['tomb1.dll']);
        mod.hook('SoundEffect').onEnter(function(soundId, pos, flags) {});
        const gen = new ScriptGenerator(mod, mockGameConfig, mockPatchData);
        const script = gen.generate();
        assert.ok(script.includes('Interceptor.attach'));
        assert.ok(script.includes('onEnter'));
        assert.ok(script.includes('0x7b6c0'));
    });

    it('emits onLeave hook with return value handling', () => {
        const mod = createMod('Test', 'tomb123', ['tomb1.dll']);
        mod.hook('SoundEffect').onLeave(function(ret, soundId, pos, flags) { return 1; });
        const gen = new ScriptGenerator(mod, mockGameConfig, mockPatchData);
        const script = gen.generate();
        assert.ok(script.includes('onLeave'));
        assert.ok(script.includes('retval'));
        assert.ok(script.includes('_args'));
    });

    it('emits replace hook with NativeCallback', () => {
        const mod = createMod('Test', 'tomb123', ['tomb1.dll']);
        mod.hook('SoundEffect').replace(function(soundId, pos, flags) { return 0; });
        const gen = new ScriptGenerator(mod, mockGameConfig, mockPatchData);
        const script = gen.generate();
        assert.ok(script.includes('Interceptor.replace'));
        assert.ok(script.includes('NativeCallback'));
        assert.ok(script.includes('_replacedFunctions'));
    });

    it('emits custom address hook via .at()', () => {
        const mod = createMod('Test', 'tomb123', ['tomb1.dll']);
        mod.hook('Custom')
            .at('tomb1.dll', '0xABCDE')
            .params(['int'])
            .returns('int')
            .onEnter(function(val) {});
        const gen = new ScriptGenerator(mod, mockGameConfig, mockPatchData);
        const script = gen.generate();
        assert.ok(script.includes('0xABCDE'));
    });

    it('reports error for unknown hook name', () => {
        const mod = createMod('Test', 'tomb123', ['tomb1.dll']);
        mod.hook('NonExistentHook').onEnter(function() {});
        const gen = new ScriptGenerator(mod, mockGameConfig, mockPatchData);
        const script = gen.generate();
        assert.ok(script.includes("Hook not found in patch data: NonExistentHook"));
    });
});

describe('ScriptGenerator: loops', () => {
    it('emits loop with interval and recursive setTimeout', () => {
        const mod = createMod('Test', 'tomb123', ['tomb1.dll']);
        mod.loop('myLoop').every(50).run(function() {});
        const gen = new ScriptGenerator(mod, mockGameConfig, mockPatchData);
        const script = gen.generate();
        assert.ok(script.includes('_loop_myLoop'));
        assert.ok(script.includes('setTimeout'));
        assert.ok(script.includes('50'));
    });

    it('emits module support check in loop', () => {
        const mod = createMod('Test', 'tomb123', ['tomb1.dll']);
        mod.loop('test').every(100).run(function() {});
        const gen = new ScriptGenerator(mod, mockGameConfig, mockPatchData);
        const script = gen.generate();
        assert.ok(script.includes('isModuleSupported'));
    });
});

describe('ScriptGenerator: custom variables', () => {
    it('emits custom variable injection into address table', () => {
        const mod = createMod('Test', 'tomb123', ['tomb1.dll']);
        mod.variable('MyVar').at('tomb1.dll', 0x12345).type('Int32');
        const gen = new ScriptGenerator(mod, mockGameConfig, mockPatchData);
        const script = gen.generate();
        assert.ok(script.includes('MyVar'));
        assert.ok(script.includes('memoryAddresses'));
    });
});

describe('ScriptGenerator: nops', () => {
    it('emits deleteInstruction calls', () => {
        const mod = createMod('Test', 'tomb123', ['tomb1.dll']);
        mod.nop('tomb1.dll', 0x1A2B3, 6);
        const gen = new ScriptGenerator(mod, mockGameConfig, mockPatchData);
        const script = gen.generate();
        assert.ok(script.includes('deleteInstruction'));
        assert.ok(script.includes('tomb1.dll'));
    });
});

describe('ScriptGenerator: receivers', () => {
    it('emits recv handler for commands', () => {
        const mod = createMod('Test', 'tomb123', ['tomb1.dll']);
        mod.receive('toggle', function(data) {});
        const gen = new ScriptGenerator(mod, mockGameConfig, mockPatchData);
        const script = gen.generate();
        assert.ok(script.includes("recv('command'"));
        assert.ok(script.includes('toggle'));
    });

    it('skips receivers section when none registered', () => {
        const mod = createMod('Test', 'tomb123', ['tomb1.dll']);
        const gen = new ScriptGenerator(mod, mockGameConfig, mockPatchData);
        const script = gen.generate();
        assert.ok(!script.includes("recv('command'"));
    });
});

describe('ScriptGenerator: init/exit', () => {
    it('emits init function body', () => {
        const mod = createMod('Test', 'tomb123', ['tomb1.dll']);
        mod.init(function() { game._lara = null; });
        const gen = new ScriptGenerator(mod, mockGameConfig, mockPatchData);
        const script = gen.generate();
        assert.ok(script.includes('game._lara = null'));
    });

    it('emits __modExit when exit is defined', () => {
        const mod = createMod('Test', 'tomb123', ['tomb1.dll']);
        mod.exit(function() { game._lara = null; });
        const gen = new ScriptGenerator(mod, mockGameConfig, mockPatchData);
        const script = gen.generate();
        assert.ok(script.includes('__modExit'));
    });

    it('does not define __modExit function when no exit defined', () => {
        const mod = createMod('Test', 'tomb123', ['tomb1.dll']);
        const gen = new ScriptGenerator(mod, mockGameConfig, mockPatchData);
        const script = gen.generate();
        assert.ok(!script.includes('function __modExit'));
    });
});
