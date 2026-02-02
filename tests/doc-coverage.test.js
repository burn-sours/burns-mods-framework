const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const gamesDir = path.join(__dirname, '..', 'src', 'framework', 'games');
const docsDir = path.join(__dirname, '..', 'docs', 'game');

const tomb123 = require(path.join(gamesDir, 'tomb123', 'tomb123'));
const tomb456 = require(path.join(gamesDir, 'tomb456', 'tomb456'));

const games = [
    { config: tomb123, name: 'tomb123' },
    { config: tomb456, name: 'tomb456' },
];

for (const { config, name } of games) {
    const patchNames = Object.keys(config.patches);

    // Collect all unique variables and hooks per module across all patches
    const moduleData = {};
    for (const patchName of patchNames) {
        for (const [modName, modData] of Object.entries(config.patches[patchName].memory)) {
            if (!moduleData[modName]) moduleData[modName] = { variables: new Set(), hooks: new Set() };
            if (modData.variables) {
                for (const varName of Object.keys(modData.variables)) {
                    moduleData[modName].variables.add(varName);
                }
            }
            if (modData.hooks) {
                for (const hookName of Object.keys(modData.hooks)) {
                    moduleData[modName].hooks.add(hookName);
                }
            }
        }
    }

    for (const [modName, data] of Object.entries(moduleData)) {
        const modDocsBase = path.join(docsDir, name, modName);

        if (data.variables.size > 0) {
            describe(`${name} / ${modName}: variable docs`, () => {
                const varsDocsDir = path.join(modDocsBase, 'variables');
                for (const varName of data.variables) {
                    it(`${varName}.md exists`, () => {
                        const docPath = path.join(varsDocsDir, `${varName}.md`);
                        assert.ok(fs.existsSync(docPath), `missing doc: docs/game/${name}/${modName}/variables/${varName}.md`);
                    });
                }
            });
        }

        if (data.hooks.size > 0) {
            describe(`${name} / ${modName}: function docs`, () => {
                const funcsDocsDir = path.join(modDocsBase, 'functions');
                for (const hookName of data.hooks) {
                    it(`${hookName}.md exists`, () => {
                        const docPath = path.join(funcsDocsDir, `${hookName}.md`);
                        assert.ok(fs.existsSync(docPath), `missing doc: docs/game/${name}/${modName}/functions/${hookName}.md`);
                    });
                }
            });
        }
    }

    // Check for stale docs that don't match any patch data
    describe(`${name}: no stale docs`, () => {
        for (const [modName, data] of Object.entries(moduleData)) {
            const modDocsBase = path.join(docsDir, name, modName);

            const varsDocsDir = path.join(modDocsBase, 'variables');
            if (fs.existsSync(varsDocsDir)) {
                for (const file of fs.readdirSync(varsDocsDir)) {
                    if (!file.endsWith('.md')) continue;
                    const varName = file.replace('.md', '');
                    it(`${modName}/variables/${varName}.md is not stale`, () => {
                        assert.ok(data.variables.has(varName), `stale doc: docs/game/${name}/${modName}/variables/${varName}.md — not in any patch`);
                    });
                }
            }

            const funcsDocsDir = path.join(modDocsBase, 'functions');
            if (fs.existsSync(funcsDocsDir)) {
                for (const file of fs.readdirSync(funcsDocsDir)) {
                    if (!file.endsWith('.md')) continue;
                    const hookName = file.replace('.md', '');
                    it(`${modName}/functions/${hookName}.md is not stale`, () => {
                        assert.ok(data.hooks.has(hookName), `stale doc: docs/game/${name}/${modName}/functions/${hookName}.md — not in any patch`);
                    });
                }
            }
        }
    });
}
