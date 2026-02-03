const fs = require('fs');
const path = require('path');

const platform = process.argv[2];
if (!platform) {
    console.error('Usage: node scripts/copy-binding.js <win32|linux>');
    process.exit(1);
}

const bindings = {
    win32: 'frida_binding_win32.node',
    linux: 'frida_binding_linux.node',
};

const source = bindings[platform];
if (!source) {
    console.error(`Unknown platform: ${platform}`);
    process.exit(1);
}

if (!fs.existsSync(source)) {
    console.error(`Binding not found: ${source}`);
    process.exit(1);
}

const target = path.join('node_modules', 'frida', 'build', 'frida_binding.node');
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.copyFileSync(source, target);
console.log(`[copy-binding] ${source} → ${target}`);
