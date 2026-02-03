const fs = require('fs');
const path = require('path');

// On npm install, copy the binding for the current platform (for local dev).
// Builds use scripts/copy-binding.js to explicitly pick the target platform.

const target = path.join('node_modules', 'frida', 'build', 'frida_binding.node');

const bindings = {
    win32: 'frida_binding_win32.node',
    linux: 'frida_binding_linux.node',
};

const source = bindings[process.platform];
if (source && fs.existsSync(source)) {
    fs.copyFileSync(source, target);
    console.log(`[postinstall] Copied ${source} → ${target}`);
}
