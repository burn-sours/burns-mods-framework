const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { createMod } = require('../src/framework/framework');

// Helper — valid mod for testing builder methods
function validMod() {
    return createMod('Test', 'tomb123', ['tomb1.dll']);
}

describe('createMod: validation', () => {
    it('throws on missing name', () => {
        assert.throws(() => createMod(undefined, 'tomb123', ['tomb1.dll']), /Mod name/);
    });

    it('throws on empty name', () => {
        assert.throws(() => createMod('', 'tomb123', ['tomb1.dll']), /Mod name/);
    });

    it('throws on non-string name', () => {
        assert.throws(() => createMod(123, 'tomb123', ['tomb1.dll']), /Mod name/);
    });

    it('throws on missing game', () => {
        assert.throws(() => createMod('Test', undefined, ['tomb1.dll']), /Game/);
    });

    it('throws on empty game', () => {
        assert.throws(() => createMod('Test', '', ['tomb1.dll']), /Game/);
    });

    it('throws on non-array modules', () => {
        assert.throws(() => createMod('Test', 'tomb123', 'tomb1.dll'), /Modules/);
    });

    it('throws on empty modules array', () => {
        assert.throws(() => createMod('Test', 'tomb123', []), /Modules/);
    });
});

describe('HookBuilder: validation', () => {
    it('throws on empty hook name', () => {
        assert.throws(() => validMod().hook(''), /Hook name/);
    });

    it('throws on non-string hook name', () => {
        assert.throws(() => validMod().hook(null), /Hook name/);
    });

    it('throws on .at() with empty module', () => {
        assert.throws(() => validMod().hook('Test').at('', 0x100), /Module/);
    });

    it('throws on .at() with null offset', () => {
        assert.throws(() => validMod().hook('Test').at('tomb1.dll', null), /Offset/);
    });

    it('throws on .params() with non-array', () => {
        assert.throws(() => validMod().hook('Test').params('int'), /array/);
    });

    it('throws on .returns() with empty string', () => {
        assert.throws(() => validMod().hook('Test').returns(''), /Return type/);
    });

    it('throws on .onEnter() with non-function', () => {
        assert.throws(() => validMod().hook('Test').onEnter('not a fn'), /onEnter callback/);
    });

    it('throws on .onLeave() with non-function', () => {
        assert.throws(() => validMod().hook('Test').onLeave(42), /onLeave callback/);
    });

    it('throws on .replace() with non-function', () => {
        assert.throws(() => validMod().hook('Test').replace(null), /replace callback/);
    });

    it('throws on replace after onEnter', () => {
        assert.throws(() => {
            validMod().hook('Test')
                .onEnter(function() {})
                .replace(function() {});
        }, /Cannot use replace with onEnter/);
    });

    it('throws on replace after onLeave', () => {
        assert.throws(() => {
            validMod().hook('Test')
                .onLeave(function() {})
                .replace(function() {});
        }, /Cannot use replace with onEnter/);
    });

    it('throws on onEnter after replace', () => {
        assert.throws(() => {
            validMod().hook('Test')
                .replace(function() {})
                .onEnter(function() {});
        }, /Cannot use onEnter with replace/);
    });

    it('throws on onLeave after replace', () => {
        assert.throws(() => {
            validMod().hook('Test')
                .replace(function() {})
                .onLeave(function() {});
        }, /Cannot use onLeave with replace/);
    });

    it('allows onEnter + onLeave together', () => {
        assert.doesNotThrow(() => {
            validMod().hook('Test')
                .onEnter(function() {})
                .onLeave(function() {});
        });
    });
});

describe('LoopBuilder: validation', () => {
    it('throws on empty loop name', () => {
        assert.throws(() => validMod().loop(''), /Loop name/);
    });

    it('throws on non-string loop name', () => {
        assert.throws(() => validMod().loop(123), /Loop name/);
    });

    it('throws on .every() with zero', () => {
        assert.throws(() => validMod().loop('test').every(0), /positive number/);
    });

    it('throws on .every() with negative', () => {
        assert.throws(() => validMod().loop('test').every(-10), /positive number/);
    });

    it('throws on .every() with non-number', () => {
        assert.throws(() => validMod().loop('test').every('50'), /positive number/);
    });

    it('throws on .run() with non-function', () => {
        assert.throws(() => validMod().loop('test').every(50).run('handler'), /handler must be a function/);
    });
});

describe('VariableBuilder: validation', () => {
    it('throws on empty variable name', () => {
        assert.throws(() => validMod().variable(''), /Variable name/);
    });

    it('throws on non-string variable name', () => {
        assert.throws(() => validMod().variable(null), /Variable name/);
    });

    it('throws on .at() with empty module', () => {
        assert.throws(() => validMod().variable('V').at('', 0x100), /Module/);
    });

    it('throws on .at() with null offset', () => {
        assert.throws(() => validMod().variable('V').at('tomb1.dll', null), /Offset/);
    });

    it('throws on .type() with empty string', () => {
        assert.throws(() => validMod().variable('V').type(''), /Type/);
    });

    it('throws on .type() with non-string', () => {
        assert.throws(() => validMod().variable('V').type(42), /Type/);
    });

    it('throws on .size() with zero', () => {
        assert.throws(() => validMod().variable('V').size(0), /positive number/);
    });

    it('throws on .size() with negative', () => {
        assert.throws(() => validMod().variable('V').size(-1), /positive number/);
    });

    it('throws on .size() with non-number', () => {
        assert.throws(() => validMod().variable('V').size('big'), /positive number/);
    });
});

describe('Mod methods: validation', () => {
    it('throws on .init() with non-function', () => {
        assert.throws(() => validMod().init('not a fn'), /Init callback/);
    });

    it('throws on .exit() with non-function', () => {
        assert.throws(() => validMod().exit(null), /Exit callback/);
    });

    it('throws on .nop() with empty module', () => {
        assert.throws(() => validMod().nop('', 0x100, 6), /Nop module/);
    });

    it('throws on .nop() with null address', () => {
        assert.throws(() => validMod().nop('tomb1.dll', null, 6), /Nop address/);
    });

    it('throws on .nop() with zero size', () => {
        assert.throws(() => validMod().nop('tomb1.dll', 0x100, 0), /Nop size/);
    });

    it('throws on .nop() with non-number size', () => {
        assert.throws(() => validMod().nop('tomb1.dll', 0x100, '6'), /Nop size/);
    });

    it('throws on .receive() with empty name', () => {
        assert.throws(() => validMod().receive('', function() {}), /Receiver name/);
    });

    it('throws on .receive() with non-function', () => {
        assert.throws(() => validMod().receive('toggle', 'handler'), /Receiver callback/);
    });
});
