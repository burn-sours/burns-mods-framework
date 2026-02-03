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
                        if (modData.constants) {
                            describe('constants', () => {
                                for (const [constName, constValue] of Object.entries(modData.constants)) {
                                    it(`${constName}: is a number`, () => {
                                        assert.equal(typeof constValue, 'number', `${constName} is not a number: ${constValue}`);
                                    });
                                }
                            });
                        }

                        if (modData.variables) {
                            describe('variables', () => {
                                for (const [varName, varDef] of Object.entries(modData.variables)) {
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

        // Build the full set of module names across ALL patches
        const allModuleNames = new Set();
        for (const patchName of patchNames) {
            for (const modName of Object.keys(config.patches[patchName].memory)) {
                allModuleNames.add(modName);
            }
        }

        describe(`${name}: module presence across patches`, () => {
            for (const modName of allModuleNames) {
                it(`${modName} exists in all patches`, () => {
                    const missing = patchNames.filter(p => !config.patches[p].memory[modName]);
                    assert.equal(missing.length, 0,
                        `${modName} missing from patches: ${missing.join(', ')}`);
                });
            }
        });

        for (const modName of allModuleNames) {
            // Collect all constant names across all patches for this module
            const allConstNames = new Set();
            // Collect all variable names across all patches for this module
            const allVarNames = new Set();
            const allHookNames = new Set();

            for (const patchName of patchNames) {
                const modData = config.patches[patchName].memory[modName];
                if (!modData) continue;
                if (modData.constants) {
                    for (const k of Object.keys(modData.constants)) {
                        allConstNames.add(k);
                    }
                }
                if (modData.variables) {
                    for (const [k, v] of Object.entries(modData.variables)) {
                        allVarNames.add(k);
                    }
                }
                if (modData.hooks) {
                    for (const k of Object.keys(modData.hooks)) {
                        allHookNames.add(k);
                    }
                }
            }

            if (allConstNames.size > 0) {
                describe(`${name} / ${modName}: constant consistency`, () => {
                    for (const constName of allConstNames) {
                        it(`${constName} exists in all patches`, () => {
                            const missing = patchNames.filter(p => {
                                const modData = config.patches[p].memory[modName];
                                return !modData || !modData.constants || !(constName in modData.constants);
                            });
                            assert.equal(missing.length, 0,
                                `constant "${constName}" missing from patches: ${missing.join(', ')}`);
                        });
                    }
                });
            }

            if (allVarNames.size > 0) {
                describe(`${name} / ${modName}: variable consistency`, () => {
                    for (const varName of allVarNames) {
                        it(`${varName} exists in all patches`, () => {
                            const missing = patchNames.filter(p => {
                                const modData = config.patches[p].memory[modName];
                                return !modData || !modData.variables || !(varName in modData.variables);
                            });
                            assert.equal(missing.length, 0,
                                `variable "${varName}" missing from patches: ${missing.join(', ')}`);
                        });
                    }

                    // Type consistency — compare all patches against the first
                    const basePatch = patchNames[0];
                    const baseVars = config.patches[basePatch].memory[modName]?.variables || {};

                    for (const otherPatch of patchNames.slice(1)) {
                        const otherVars = config.patches[otherPatch].memory[modName]?.variables || {};

                        for (const varName of allVarNames) {
                            const baseVar = baseVars[varName];
                            const otherVar = otherVars[varName];
                            if (!baseVar || !otherVar) continue;

                            it(`${varName}: same type in ${basePatch} and ${otherPatch}`, () => {
                                assert.equal(baseVar.Type, otherVar.Type,
                                    `${varName} type mismatch: ${basePatch} has ${baseVar.Type}, ${otherPatch} has ${otherVar.Type}`);
                            });
                        }
                    }
                });
            }

            if (allHookNames.size > 0) {
                describe(`${name} / ${modName}: hook consistency`, () => {
                    for (const hookName of allHookNames) {
                        it(`${hookName} exists in all patches`, () => {
                            const missing = patchNames.filter(p => {
                                const modData = config.patches[p].memory[modName];
                                return !modData || !modData.hooks || !(hookName in modData.hooks);
                            });
                            assert.equal(missing.length, 0,
                                `hook "${hookName}" missing from patches: ${missing.join(', ')}`);
                        });
                    }

                    // Signature consistency — params and return type must match across patches
                    const basePatch = patchNames[0];
                    const baseHooks = config.patches[basePatch].memory[modName]?.hooks || {};

                    for (const otherPatch of patchNames.slice(1)) {
                        const otherHooks = config.patches[otherPatch].memory[modName]?.hooks || {};

                        for (const hookName of allHookNames) {
                            const baseHook = baseHooks[hookName];
                            const otherHook = otherHooks[hookName];
                            if (!baseHook || !otherHook) continue;

                            it(`${hookName}: same return type in ${basePatch} and ${otherPatch}`, () => {
                                assert.equal(baseHook.Return, otherHook.Return,
                                    `${hookName} return type mismatch: ${basePatch} has ${baseHook.Return}, ${otherPatch} has ${otherHook.Return}`);
                            });

                            it(`${hookName}: same params in ${basePatch} and ${otherPatch}`, () => {
                                assert.deepEqual(baseHook.Params, otherHook.Params,
                                    `${hookName} params mismatch: ${basePatch} has [${baseHook.Params}], ${otherPatch} has [${otherHook.Params}]`);
                            });
                        }
                    }
                });
            }
        }
    }
});
