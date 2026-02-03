const fs = require('fs');
const path = require('path');

const target = path.join('node_modules', 'frida', 'build', 'frida_binding.node');

// Platform-specific binding overrides (for compatibility — e.g. Win10 support)
const bindings = {
    win32: 'frida_binding_win32.node',
    linux: 'frida_binding_linux.node',
};

const source = bindings[process.platform];
if (source && fs.existsSync(source)) {
    fs.copyFileSync(source, target);
    console.log(`[postinstall] Copied ${source} → ${target}`);
} else if (source) {
    console.log(`[postinstall] No override binding found (${source}), using prebuild-install default`);
}
