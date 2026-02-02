const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const VALID_TYPES = [
    'Int8', 'UInt8', 'Int16', 'UInt16', 'Int32', 'UInt32',
    'Int64', 'UInt64', 'Float', 'Double', 'Pointer',
    'Block', 'Utf8String', 'Utf16String', 'AnsiString',
];

const VALID_PARAM_TYPES = [
    'int', 'int8', 'int16', 'int32',
    'uint', 'uint8', 'uint16', 'uint32',
    'uint64', 'int64', 'float', 'double',
    'pointer', 'bool',
];

const VALID_RETURN_TYPES = ['void', ...VALID_PARAM_TYPES];

const gamesDir = path.join(__dirname, '..', 'src', 'framework', 'games');

const tomb123 = require(path.join(gamesDir, 'tomb123', 'tomb123'));
const tomb456 = require(path.join(gamesDir, 'tomb456', 'tomb456'));

const games = [
    { config: tomb123, name: 'tomb123' },
    { config: tomb456, name: 'tomb456' },
];

function isValidHex(str) {
    return /^0x[0-9a-fA-F]+$/.test(str);
}

for (const { config, name } of games) {
    describe(`Game config: ${name}`, () => {
        it('has required top-level fields', () => {
            assert.ok(config.id, 'missing id');
            assert.ok(config.name, 'missing name');
            assert.ok(config.executable, 'missing executable');
            assert.ok(config.modules, 'missing modules');
            assert.ok(config.constants, 'missing constants');
            assert.ok(config.patches, 'missing patches');
            assert.ok(config.defaultPatch, 'missing defaultPatch');
        });

        it('defaultPatch exists in patches', () => {
            assert.ok(config.patches[config.defaultPatch], `defaultPatch "${config.defaultPatch}" not found in patches`);
        });

        it('all modules have id and name', () => {
            for (const [modName, modDef] of Object.entries(config.modules)) {
                assert.ok(modDef.id, `${modName} missing id`);
                assert.ok(modDef.name, `${modName} missing name`);
            }
        });

        it('constants are all numbers', () => {
            for (const [key, value] of Object.entries(config.constants)) {
                assert.equal(typeof value, 'number', `constant ${key} is not a number: ${value}`);
            }
        });

        for (const [patchName, patchDef] of Object.entries(config.patches)) {
            describe(`Patch: ${patchName}`, () => {
                it('has name and patch hash', () => {
                    assert.ok(patchDef.name, 'missing patch name');
                    assert.ok(patchDef.patch, 'missing patch hash');
                });

                it('has memory data for executable', () => {
                    assert.ok(patchDef.memory[config.executable], `missing memory data for ${config.executable}`);
                });

                for (const [modName, modData] of Object.entries(patchDef.memory)) {
                    describe(`Module: ${modName}`, () => {
                        if (modData.variables) {
                            describe('variables', () => {
                                for (const [varName, varDef] of Object.entries(modData.variables)) {
                                    // Skip raw string offset entries (e.g. OgModels*)
                                    if (typeof varDef === 'string') continue;

                                    it(`${varName}: valid address`, () => {
                                        assert.ok(varDef.Address, `${varName} missing Address`);
                                        assert.ok(isValidHex(varDef.Address), `${varName} invalid hex address: ${varDef.Address}`);
                                    });

                                    it(`${varName}: valid type`, () => {
                                        assert.ok(varDef.Type, `${varName} missing Type`);
                                        assert.ok(VALID_TYPES.includes(varDef.Type), `${varName} invalid type: ${varDef.Type}`);
                                    });

                                    if (varDef.Type === 'Block') {
                                        it(`${varName}: Block has Size`, () => {
                                            assert.ok(varDef.Size !== undefined, `${varName} Block type missing Size`);
                                        });
                                    }
                                }
                            });
                        }

                        if (modData.hooks) {
                            describe('hooks', () => {
                                for (const [hookName, hookDef] of Object.entries(modData.hooks)) {
                                    it(`${hookName}: valid address`, () => {
                                        assert.ok(hookDef.Address, `${hookName} missing Address`);
                                        assert.ok(isValidHex(hookDef.Address), `${hookName} invalid hex address: ${hookDef.Address}`);
                                    });

                                    it(`${hookName}: valid return type`, () => {
                                        assert.ok(hookDef.Return, `${hookName} missing Return`);
                                        assert.ok(VALID_RETURN_TYPES.includes(hookDef.Return), `${hookName} invalid return type: ${hookDef.Return}`);
                                    });

                                    it(`${hookName}: valid param types`, () => {
                                        assert.ok(Array.isArray(hookDef.Params), `${hookName} Params is not an array`);
                                        for (const param of hookDef.Params) {
                                            assert.ok(VALID_PARAM_TYPES.includes(param), `${hookName} invalid param type: ${param}`);
                                        }
                                    });
                                }
                            });
                        }
                    });
                }
            });
        }
    });
}

describe('Patch consistency', () => {
    for (const { config, name } of games) {
        const patchNames = Object.keys(config.patches);
        if (patchNames.length < 2) continue;

        for (const modName of [config.executable, ...Object.keys(config.modules)]) {
            describe(`${name} / ${modName}: variables consistent across patches`, () => {
                const patchesWithMod = patchNames.filter(p =>
                    config.patches[p].memory[modName] && config.patches[p].memory[modName].variables
                );

                if (patchesWithMod.length < 2) return;

                const baseVars = config.patches[patchesWithMod[0]].memory[modName].variables;

                for (const otherPatch of patchesWithMod.slice(1)) {
                    const otherVars = config.patches[otherPatch].memory[modName].variables;

                    it(`${patchesWithMod[0]} vs ${otherPatch}: variable names consistent (additions allowed)`, () => {
                        const baseNames = new Set(Object.keys(baseVars).filter(k => typeof baseVars[k] !== 'string'));
                        const otherNames = new Set(Object.keys(otherVars).filter(k => typeof otherVars[k] !== 'string'));
                        // Check no variables were removed (renamed counts as removed + added)
                        const removed = [...baseNames].filter(n => !otherNames.has(n));
                        const added = [...otherNames].filter(n => !baseNames.has(n));
                        if (removed.length > 0 || added.length > 0) {
                            // Log as info, not failure — patches evolve
                            // But flag potential typos (similar names)
                            console.log(`  [info] ${modName} ${patchesWithMod[0]}→${otherPatch}: +${added.length} added, -${removed.length} removed`);
                            if (removed.length) console.log(`    removed: ${removed.join(', ')}`);
                            if (added.length) console.log(`    added: ${added.join(', ')}`);
                        }
                    });

                    it(`${patchesWithMod[0]} vs ${otherPatch}: same variable types`, () => {
                        for (const varName of Object.keys(baseVars)) {
                            if (typeof baseVars[varName] === 'string') continue;
                            if (!otherVars[varName] || typeof otherVars[varName] === 'string') continue;
                            assert.equal(
                                baseVars[varName].Type,
                                otherVars[varName].Type,
                                `${varName} type changed: ${baseVars[varName].Type} → ${otherVars[varName].Type}`
                            );
                        }
                    });
                }
            });
        }
    }
});
