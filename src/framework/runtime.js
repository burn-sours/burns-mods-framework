function getRuntimeSource() {
    return `
'use strict';

const moduleBaseAddresses = {};
const functions = {};
const _attachedHooks = [];
const _replacedFunctions = [];
const _deletedInstructions = {};
const _loopTimers = [];

const TYPE_MAP = {
    'Int8': { read: 'readS8', write: 'writeS8', size: 1 },
    'UInt8': { read: 'readU8', write: 'writeU8', size: 1 },
    'Int16': { read: 'readS16', write: 'writeS16', size: 2 },
    'UInt16': { read: 'readU16', write: 'writeU16', size: 2 },
    'Int32': { read: 'readS32', write: 'writeS32', size: 4 },
    'UInt32': { read: 'readU32', write: 'writeU32', size: 4 },
    'Int64': { read: 'readS64', write: 'writeS64', size: 8 },
    'UInt64': { read: 'readU64', write: 'writeU64', size: 8 },
    'Float': { read: 'readFloat', write: 'writeFloat', size: 4 },
    'Double': { read: 'readDouble', write: 'writeDouble', size: 8 },
    'Pointer': { read: 'readPointer', write: 'writePointer', size: Process.pointerSize },
    'Utf8String': { read: 'readUtf8String', write: 'writeUtf8String', size: 0 },
    'Utf16String': { read: 'readUtf16String', write: 'writeUtf16String', size: 0 },
    'AnsiString': { read: 'readAnsiString', write: 'writeAnsiString', size: 0 },
    'Block': { read: null, write: null, size: 0 },
};


const game = {
    resolveAddress(moduleName, offset, pointer) {
        const base = moduleBaseAddresses[moduleName];
        if (!base) return null;
        let addr = base.add(offset);
        if (pointer !== undefined && pointer !== null) {
            addr = addr.readPointer().add(pointer);
        }
        return addr;
    },

    _resolveVar(moduleName, name) {
        const mod = memoryAddresses[moduleName];
        if (!mod || !mod.variables || !mod.variables[name]) {
            throw new Error('Variable not found: ' + moduleName + '.' + name);
        }
        const def = mod.variables[name];
        const offset = typeof def.Address === 'string' ? parseInt(def.Address, 16) : def.Address;
        const pointer = def.Pointer !== undefined ? (typeof def.Pointer === 'string' ? parseInt(def.Pointer, 16) : def.Pointer) : null;
        const addr = game.resolveAddress(moduleName, offset, pointer);
        if (!addr) throw new Error('Module not loaded: ' + moduleName);
        return { def, addr };
    },

    readVar(moduleName, name) {
        const { def, addr } = game._resolveVar(moduleName, name);
        if (def.Type === 'Block') {
            const size = typeof def.Size === 'string' ? parseInt(def.Size, 16) : def.Size;
            return addr.readByteArray(size);
        }
        const typeInfo = TYPE_MAP[def.Type];
        if (!typeInfo) throw new Error('Unknown type: ' + def.Type);
        return addr[typeInfo.read]();
    },

    writeVar(moduleName, name, value) {
        const { def, addr } = game._resolveVar(moduleName, name);
        if (def.Type === 'Block') {
            addr.writeByteArray(value);
            return;
        }
        const typeInfo = TYPE_MAP[def.Type];
        if (!typeInfo) throw new Error('Unknown type: ' + def.Type);
        addr[typeInfo.write](value);
    },

    getVarPtr(moduleName, name) {
        return game._resolveVar(moduleName, name).addr;
    },

    readBlock(moduleName, name) {
        return game.readVar(moduleName, name);
    },

    readMemory(address, type) {
        const typeInfo = TYPE_MAP[type];
        if (!typeInfo) throw new Error('Unknown type: ' + type);
        return ptr(address)[typeInfo.read]();
    },

    writeMemory(address, type, value) {
        const typeInfo = TYPE_MAP[type];
        if (!typeInfo) throw new Error('Unknown type: ' + type);
        ptr(address)[typeInfo.write](value);
    },

    readPointer(address) {
        return ptr(address).readPointer();
    },

    alloc(size) {
        return Memory.alloc(size);
    },

    allocString(str) {
        return Memory.allocUtf8String(str);
    },

    registerFunction(moduleName, name, offset, returnType, paramTypes) {
        if (!functions[moduleName]) functions[moduleName] = {};
        const base = moduleBaseAddresses[moduleName];
        if (!base) throw new Error('Module not loaded: ' + moduleName);
        const addr = base.add(typeof offset === 'string' ? parseInt(offset, 16) : offset);
        functions[moduleName][name] = new NativeFunction(addr, returnType, paramTypes);
    },

    callFunction(moduleName, name, ...args) {
        if (!functions[moduleName] || !functions[moduleName][name]) {
            throw new Error('Function not registered: ' + moduleName + '.' + name);
        }
        return functions[moduleName][name](...args);
    },

    hasFunction(moduleName, name) {
        return !!(functions[moduleName] && functions[moduleName][name]);
    },

    get executable() {
        return manifest.executable;
    },

    isModuleSupported(moduleName) {
        return _supportedModules.indexOf(moduleName) !== -1;
    },

    get module() {
        const version = game.readVar(game.executable, 'GameVersion');
        const modules = Object.entries(manifest.modules);
        if (version >= 0 && version < modules.length) {
            return modules[version][0];
        }
        return null;
    },

    deleteInstruction(moduleName, address, size) {
        const base = moduleBaseAddresses[moduleName];
        if (!base) throw new Error('Module not loaded: ' + moduleName);
        const addr = base.add(typeof address === 'string' ? parseInt(address, 16) : address);
        const key = addr.toString();
        if (_deletedInstructions[key]) return;
        const backup = addr.readByteArray(size);
        Memory.protect(addr, size, 'rwx');
        const nops = new Uint8Array(size);
        nops.fill(0x90);
        addr.writeByteArray(nops.buffer);
        _deletedInstructions[key] = { addr, size, backup };
    },

    restoreInstructions() {
        for (const key of Object.keys(_deletedInstructions)) {
            const { addr, size, backup } = _deletedInstructions[key];
            Memory.protect(addr, size, 'rwx');
            addr.writeByteArray(backup);
            delete _deletedInstructions[key];
        }
    },

    cleanupHooks() {
        for (const hook of _attachedHooks) {
            hook.detach();
        }
        _attachedHooks.length = 0;
        for (const addr of _replacedFunctions) {
            Interceptor.revert(addr);
        }
        _replacedFunctions.length = 0;
    },

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },
};

function log(...args) {
    const msg = args.join(' ');
    console.log(msg);
    send({ event: '__log', data: { level: 'info', message: msg } });
}

function warn(...args) {
    const msg = args.join(' ');
    console.warn(msg);
    send({ event: '__log', data: { level: 'warning', message: msg } });
}

function error(...args) {
    const msg = args.join(' ');
    console.error(msg);
    send({ event: '__log', data: { level: 'error', message: msg } });
}

recv('cleanup', function() {
    if (typeof __modExit === 'function') {
        try { __modExit(); } catch(e) { error('Exit error:', e.stack); }
    }
    for (const id of _loopTimers) clearTimeout(id);
    _loopTimers.length = 0;
    game.cleanupHooks();
    game.restoreInstructions();
    send({ event: '__cleanupDone' });
});
`;
}

module.exports = { getRuntimeSource };
