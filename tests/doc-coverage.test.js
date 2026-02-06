const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const gamesDir = path.join(__dirname, '..', 'src', 'framework', 'games');
const docsDir = path.join(__dirname, '..', 'docs', 'game');

/** Recursively find a file by name under a directory */
function findFileRecursive(dir, filename) {
    if (!fs.existsSync(dir)) return null;
    const direct = path.join(dir, filename);
    if (fs.existsSync(direct)) return direct;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
            const found = findFileRecursive(path.join(dir, entry.name), filename);
            if (found) return found;
        }
    }
    return null;
}

/** Recursively collect all .md filenames (without extension) under a directory */
function collectMdFiles(dir) {
    const results = [];
    if (!fs.existsSync(dir)) return results;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
            results.push(...collectMdFiles(path.join(dir, entry.name)));
        } else if (entry.name.endsWith('.md')) {
            results.push(entry.name.replace('.md', ''));
        }
    }
    return results;
}

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
                        const found = findFileRecursive(funcsDocsDir, `${hookName}.md`);
                        assert.ok(found, `missing doc: docs/game/${name}/${modName}/functions/${hookName}.md (searched recursively)`);
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
                for (const hookName of collectMdFiles(funcsDocsDir)) {
                    it(`${modName}/functions/${hookName}.md is not stale`, () => {
                        assert.ok(data.hooks.has(hookName), `stale doc: docs/game/${name}/${modName}/functions/${hookName}.md — not in any patch`);
                    });
                }
            }
        }
    });

    // Check constants documentation coverage
    describe(`${name}: constants documented`, () => {
        // Collect all constants from game manifest and patches
        const allConstants = new Set();

        // Add game-level constants
        if (config.constants) {
            for (const constName of Object.keys(config.constants)) {
                allConstants.add(constName);
            }
        }

        // Add patch-level constants from executable modules
        for (const patchName of patchNames) {
            const exeData = config.patches[patchName].memory[config.executable];
            if (exeData && exeData.constants) {
                for (const constName of Object.keys(exeData.constants)) {
                    allConstants.add(constName);
                }
            }
        }

        // Read the README and check each constant is mentioned
        const readmePath = path.join(docsDir, name, 'README.md');
        const readmeContent = fs.existsSync(readmePath) ? fs.readFileSync(readmePath, 'utf-8') : '';

        for (const constName of allConstants) {
            it(`${constName} is documented in README.md`, () => {
                // Check for the constant name in a markdown table row (| `CONST_NAME` |)
                const pattern = new RegExp(`\\|\\s*\`${constName}\`\\s*\\|`);
                assert.ok(
                    pattern.test(readmeContent),
                    `missing constant: ${constName} not documented in docs/game/${name}/README.md`
                );
            });
        }
    });
}
