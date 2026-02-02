const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { createMod } = require('../src/framework/framework');

describe('createMod', () => {
    it('returns a Mod with correct properties', () => {
        const mod = createMod('Test Mod', 'tomb123', ['tomb1.dll']);
        assert.equal(mod.name, 'Test Mod');
        assert.equal(mod.game, 'tomb123');
        assert.deepEqual(mod.modules, ['tomb1.dll']);
    });

    it('initializes empty collections', () => {
        const mod = createMod('Test', 'tomb123', ['tomb1.dll']);
        assert.deepEqual(mod._variables, []);
        assert.deepEqual(mod._hooks, []);
        assert.deepEqual(mod._loops, []);
        assert.deepEqual(mod._nops, []);
        assert.deepEqual(mod._receivers, {});
        assert.deepEqual(mod._events, {});
        assert.equal(mod._init, null);
        assert.equal(mod._exit, null);
    });
});

describe('Builder: init/exit', () => {
    it('stores init callback', () => {
        const mod = createMod('Test', 'tomb123', ['tomb1.dll']);
        const fn = function() { return 1; };
        mod.init(fn);
        assert.equal(mod._init, fn);
    });

    it('stores exit callback', () => {
        const mod = createMod('Test', 'tomb123', ['tomb1.dll']);
        const fn = function() { return 2; };
        mod.exit(fn);
        assert.equal(mod._exit, fn);
    });
});

describe('Builder: hook', () => {
    it('creates a hook builder and adds to list', () => {
        const mod = createMod('Test', 'tomb123', ['tomb1.dll']);
        const hook = mod.hook('SoundEffect');
        assert.equal(mod._hooks.length, 1);
        assert.equal(hook.name, 'SoundEffect');
    });

    it('supports chaining .at().params().returns()', () => {
        const mod = createMod('Test', 'tomb123', ['tomb1.dll']);
        const hook = mod.hook('Custom')
            .at('tomb1.dll', 0x12345)
            .params(['int', 'pointer'])
            .returns('int');
        assert.equal(hook._module, 'tomb1.dll');
        assert.equal(hook._offset, 0x12345);
        assert.deepEqual(hook._params, ['int', 'pointer']);
        assert.equal(hook._return, 'int');
    });

    it('stores onEnter callback', () => {
        const mod = createMod('Test', 'tomb123', ['tomb1.dll']);
        const fn = function(a) {};
        const hook = mod.hook('Test').onEnter(fn);
        assert.equal(hook._onEnter, fn);
        assert.equal(hook._onLeave, null);
        assert.equal(hook._replace, null);
    });

    it('stores onLeave callback', () => {
        const mod = createMod('Test', 'tomb123', ['tomb1.dll']);
        const fn = function(ret) {};
        const hook = mod.hook('Test').onLeave(fn);
        assert.equal(hook._onLeave, fn);
    });

    it('stores replace callback', () => {
        const mod = createMod('Test', 'tomb123', ['tomb1.dll']);
        const fn = function() {};
        const hook = mod.hook('Test').replace(fn);
        assert.equal(hook._replace, fn);
    });

    it('supports multiple hooks', () => {
        const mod = createMod('Test', 'tomb123', ['tomb1.dll']);
        mod.hook('A').onEnter(function() {});
        mod.hook('B').onLeave(function() {});
        assert.equal(mod._hooks.length, 2);
        assert.equal(mod._hooks[0].name, 'A');
        assert.equal(mod._hooks[1].name, 'B');
    });
});

describe('Builder: loop', () => {
    it('creates a loop builder with interval and handler', () => {
        const mod = createMod('Test', 'tomb123', ['tomb1.dll']);
        const fn = function() {};
        const loop = mod.loop('myLoop').every(50).run(fn);
        assert.equal(mod._loops.length, 1);
        assert.equal(loop.name, 'myLoop');
        assert.equal(loop._interval, 50);
        assert.equal(loop._handler, fn);
    });
});

describe('Builder: variable', () => {
    it('creates a variable builder with all fields', () => {
        const mod = createMod('Test', 'tomb123', ['tomb1.dll']);
        const v = mod.variable('MyVar')
            .at('tomb1.dll', 0x12345)
            .type('Int32');
        assert.equal(mod._variables.length, 1);
        assert.equal(v.name, 'MyVar');
        assert.equal(v._module, 'tomb1.dll');
        assert.equal(v._offset, 0x12345);
        assert.equal(v._type, 'Int32');
    });

    it('supports pointer and size for Block type', () => {
        const mod = createMod('Test', 'tomb123', ['tomb1.dll']);
        const v = mod.variable('MyBlock')
            .at('tomb1.dll', 0xABC)
            .type('Block')
            .pointer(0x10)
            .size(0x28);
        assert.equal(v._type, 'Block');
        assert.equal(v._pointer, 0x10);
        assert.equal(v._size, 0x28);
    });
});

describe('Builder: nop', () => {
    it('adds nop entry with module, address, size', () => {
        const mod = createMod('Test', 'tomb123', ['tomb1.dll']);
        mod.nop('tomb1.dll', 0x1A2B3, 6);
        assert.equal(mod._nops.length, 1);
        assert.deepEqual(mod._nops[0], { module: 'tomb1.dll', address: 0x1A2B3, size: 6 });
    });
});

describe('Builder: receive', () => {
    it('stores receiver callbacks by name', () => {
        const mod = createMod('Test', 'tomb123', ['tomb1.dll']);
        const fn = function(data) {};
        mod.receive('toggle', fn);
        assert.equal(mod._receivers['toggle'], fn);
    });
});

describe('Builder: on (launcher-side events)', () => {
    it('stores event handlers', () => {
        const mod = createMod('Test', 'tomb123', ['tomb1.dll']);
        const fn = function(data) {};
        mod.on('stateUpdate', fn);
        assert.equal(mod._events['stateUpdate'], fn);
    });
});

describe('Builder: chaining', () => {
    it('init returns this for chaining', () => {
        const mod = createMod('Test', 'tomb123', ['tomb1.dll']);
        const fn = function() {};
        const result = mod.init(fn);
        assert.equal(result, mod);
    });

    it('nop returns this for chaining', () => {
        const mod = createMod('Test', 'tomb123', ['tomb1.dll']);
        const result = mod.nop('tomb1.dll', 0x100, 2);
        assert.equal(result, mod);
    });
});
