const { getRuntimeSource } = require('./runtime');

class ScriptGenerator {
    constructor(mod, gameConfig, patchData) {
        this.mod = mod;
        this.gameConfig = gameConfig;
        this.patchData = patchData;
    }

    generate() {
        const parts = [];

        parts.push(getRuntimeSource());
        parts.push(this._emitManifest());
        parts.push(this._emitConstants());
        parts.push(this._emitAddressTable());
        parts.push(this._emitCustomVariables());
        parts.push(this._emitInit());
        parts.push(this._emitFunctionRegistrations());
        parts.push(this._emitHooks());
        parts.push(this._emitLoops());
        parts.push(this._emitNops());
        parts.push(this._emitExit());
        parts.push(this._emitReceivers());
        parts.push(this._emitStartup());

        return parts.join('\n\n');
    }

    _emitManifest() {
        const manifest = {
            executable: this.gameConfig.executable,
            modules: this.gameConfig.modules,
        };
        const supported = this.mod.modules;
        return `const manifest = ${JSON.stringify(manifest, null, 2)};\nconst _supportedModules = ${JSON.stringify(supported)};`;
    }

    _emitConstants() {
        const constants = this.gameConfig.constants;
        if (!constants || Object.keys(constants).length === 0) return '';
        const lines = [];
        for (const [name, value] of Object.entries(constants)) {
            lines.push(`const ${name} = ${typeof value === 'number' ? '0x' + value.toString(16) : JSON.stringify(value)};`);
        }
        return lines.join('\n');
    }

    _emitAddressTable() {
        const addresses = {};
        const allModules = [this.gameConfig.executable, ...this.mod.modules];
        for (const modName of allModules) {
            if (this.patchData.memory[modName]) {
                addresses[modName] = this.patchData.memory[modName];
            }
        }
        return `const memoryAddresses = ${JSON.stringify(addresses, null, 2)};`;
    }

    _emitCustomVariables() {
        const lines = [];
        for (const v of this.mod._variables) {
            if (v._module && v._offset !== null) {
                const def = {};
                if (v._offset !== null) def.Address = v._offset;
                if (v._type) def.Type = v._type;
                if (v._pointer !== null) def.Pointer = v._pointer;
                if (v._size !== null) def.Size = v._size;
                lines.push(`if (!memoryAddresses[${JSON.stringify(v._module)}]) memoryAddresses[${JSON.stringify(v._module)}] = { variables: {}, hooks: {} };`);
                lines.push(`if (!memoryAddresses[${JSON.stringify(v._module)}].variables) memoryAddresses[${JSON.stringify(v._module)}].variables = {};`);
                lines.push(`memoryAddresses[${JSON.stringify(v._module)}].variables[${JSON.stringify(v.name)}] = ${JSON.stringify(def)};`);
            }
        }
        if (lines.length === 0) return '';
        return lines.join('\n');
    }

    _emitInit() {
        const allModules = [this.gameConfig.executable, ...this.mod.modules];
        return `
async function __init() {
    const modulesToResolve = ${JSON.stringify(allModules)};
    for (const modName of modulesToResolve) {
        let base = Module.findBaseAddress(modName);
        while (!base) {
            await game.delay(100);
            base = Module.findBaseAddress(modName);
        }
        moduleBaseAddresses[modName] = base;
    }

    __registerFunctions();
    __installHooks();
    __installLoops();
    __installNops();
${this.mod._init ? `
    while (!game.isModuleSupported(game.module)) {
        await game.delay(100);
    }
    try {
        (${this.mod._init.toString()})();
    } catch(e) { error('Init error:', e.stack); }
` : ''}
    send({ event: '__ready' });
}`;
    }

    _emitFunctionRegistrations() {
        const lines = ['function __registerFunctions() {'];

        for (const modName of [this.gameConfig.executable, ...this.mod.modules]) {
            const modData = this.patchData.memory[modName];
            if (!modData || !modData.hooks) continue;

            for (const [hookName, hookDef] of Object.entries(modData.hooks)) {
                const returnType = hookDef.Return || 'void';
                const paramTypes = hookDef.Params || [];
                lines.push(`    try {`);
                lines.push(`        game.registerFunction(${JSON.stringify(modName)}, ${JSON.stringify(hookName)}, ${JSON.stringify(hookDef.Address)}, ${JSON.stringify(returnType)}, ${JSON.stringify(paramTypes)});`);
                lines.push(`    } catch(e) { error('Failed to register ${hookName}:', e.message); }`);
            }
        }

        lines.push('}');
        return lines.join('\n');
    }

    _emitHooks() {
        const lines = ['function __installHooks() {'];

        for (const hook of this.mod._hooks) {
            const hookInfos = this._resolveHooks(hook);
            if (hookInfos.length === 0) {
                lines.push(`    error('Hook not found in patch data: ${hook.name}');`);
                continue;
            }

            for (const hookInfo of hookInfos) {
                const { moduleName, address, params, returnType } = hookInfo;

                const paramTypes = params || [];
                const paramCount = paramTypes.length;
                const paramNames = Array.from({length: paramCount}, (_, i) => `arg${i}`);
                const spreadParams = paramNames.length ? ', ' + paramNames.join(', ') : '';

                if (hook._replace) {
                    const fridaReturn = returnType || 'void';
                    const fridaParams = paramTypes.map(p => `'${p}'`).join(', ');
                    lines.push(`    {`);
                    lines.push(`        const _hookAddr = moduleBaseAddresses[${JSON.stringify(moduleName)}].add(${address});`);
                    lines.push(`        Interceptor.replace(_hookAddr, new NativeCallback(`);
                    lines.push(`            function(${paramNames.join(', ')}) {`);
                    lines.push(`                try {`);
                    lines.push(`                    return (${hook._replace.toString()}).call(null${spreadParams});`);
                    lines.push(`                } catch(e) { error('Hook ${hook.name} replace error:', e.stack); return ${fridaReturn === 'void' ? 'undefined' : 'ptr(0x0)'}; }`);
                    lines.push(`            },`);
                    lines.push(`            '${fridaReturn}', [${fridaParams}]`);
                    lines.push(`        ));`);
                    lines.push(`        _replacedFunctions.push(_hookAddr);`);
                    lines.push(`    }`);
                } else if (hook._onEnter || hook._onLeave) {
                    const convertedArgs = paramTypes.map((type, i) => {
                        if (['int', 'int8', 'int16', 'int32', 'bool'].includes(type)) return `args[${i}].toInt32()`;
                        if (['uint', 'uint8', 'uint16', 'uint32'].includes(type)) return `args[${i}].toUInt32()`;
                        return `args[${i}]`;
                    });
                    const spreadArgs = convertedArgs.length ? ', ' + convertedArgs.join(', ') : '';
                    const needsArgCapture = hook._onLeave && paramCount > 0;
                    lines.push(`    {`);
                    lines.push(`        const _hookAddr = moduleBaseAddresses[${JSON.stringify(moduleName)}].add(${address});`);
                    lines.push(`        const _hook = Interceptor.attach(_hookAddr, {`);
                    if (hook._onEnter || needsArgCapture) {
                        lines.push(`            onEnter: function(args) {`);
                        if (needsArgCapture) {
                            lines.push(`                this._args = [${convertedArgs.join(', ')}];`);
                        }
                        if (hook._onEnter) {
                            lines.push(`                try {`);
                            lines.push(`                    (${hook._onEnter.toString()}).call(this${spreadArgs});`);
                            lines.push(`                } catch(e) { error('Hook ${hook.name} onEnter error:', e.stack); }`);
                        }
                        lines.push(`            },`);
                    }
                    if (hook._onLeave) {
                        const capturedArgs = paramCount > 0
                            ? paramNames.map((_, i) => `this._args[${i}]`).join(', ')
                            : '';
                        const isVoid = !returnType || returnType === 'void';
                        let convertedRetval;
                        if (isVoid) convertedRetval = 'null';
                        else if (['int', 'int8', 'int16', 'int32', 'bool'].includes(returnType)) convertedRetval = 'retval.toInt32()';
                        else if (['uint', 'uint8', 'uint16', 'uint32'].includes(returnType)) convertedRetval = 'retval.toUInt32()';
                        else convertedRetval = 'retval';
                        const allLeaveArgs = [convertedRetval, capturedArgs].filter(Boolean).join(', ');
                        const callArgs = ', ' + allLeaveArgs;
                        lines.push(`            onLeave: function(retval) {`);
                        lines.push(`                try {`);
                        lines.push(`                    const _r = (${hook._onLeave.toString()}).call(this${callArgs});`);
                        if (!isVoid) {
                            lines.push(`                    if (_r !== undefined) retval.replace(ptr(_r));`);
                        }
                        lines.push(`                } catch(e) { error('Hook ${hook.name} onLeave error:', e.stack); }`);
                        lines.push(`            },`);
                    }
                    lines.push(`        });`);
                    lines.push(`        _attachedHooks.push(_hook);`);
                    lines.push(`    }`);
                }
            }
        }

        lines.push('}');
        return lines.join('\n');
    }

    _emitLoops() {
        const lines = ['function __installLoops() {'];
        for (const loop of this.mod._loops) {
            lines.push(`    {`);
            lines.push(`        const _idx = _loopTimers.length;`);
            lines.push(`        _loopTimers.push(null);`);
            lines.push(`        function _loop_${loop.name}() {`);
            lines.push(`            const _module = game.module;`);
            lines.push(`            if (!game.isModuleSupported(_module)) {`);
            lines.push(`                _loopTimers[_idx] = setTimeout(_loop_${loop.name}, ${loop._interval});`);
            lines.push(`                return;`);
            lines.push(`            }`);
            lines.push(`            try {`);
            lines.push(`                (${loop._handler.toString()})();`);
            lines.push(`            } catch(e) { error('Loop ${loop.name} error:', e.stack); }`);
            lines.push(`            _loopTimers[_idx] = setTimeout(_loop_${loop.name}, ${loop._interval});`);
            lines.push(`        }`);
            lines.push(`        _loop_${loop.name}();`);
            lines.push(`    }`);
        }
        lines.push('}');
        return lines.join('\n');
    }

    _emitNops() {
        const lines = ['function __installNops() {'];
        for (const nop of this.mod._nops) {
            const addr = typeof nop.address === 'string' ? nop.address : '0x' + nop.address.toString(16);
            lines.push(`    game.deleteInstruction(${JSON.stringify(nop.module)}, ${JSON.stringify(addr)}, ${nop.size});`);
        }
        lines.push('}');
        return lines.join('\n');
    }

    _emitExit() {
        if (!this.mod._exit) return '';
        return `function __modExit() {\n    (${this.mod._exit.toString()})();\n}`;
    }

    _emitReceivers() {
        const receivers = Object.entries(this.mod._receivers);
        if (receivers.length === 0) return '';
        const lines = [];
        lines.push(`recv('command', function _onCommand(msg) {`);
        lines.push(`    recv('command', _onCommand);`);
        for (const [name, fn] of receivers) {
            lines.push(`    if (msg.name === ${JSON.stringify(name)}) {`);
            lines.push(`        try { (${fn.toString()})(msg.data); } catch(e) { error('Receiver ${name} error:', e.stack); }`);
            lines.push(`    }`);
        }
        lines.push(`});`);
        return lines.join('\n');
    }

    _emitStartup() {
        return `__init();`;
    }

    _resolveHooks(hook) {
        if (hook._module && hook._offset !== null) {
            return [{
                moduleName: hook._module,
                address: hook._offset,
                params: hook._params,
                returnType: hook._return,
            }];
        }

        const results = [];
        const searchOrder = [...this.mod.modules, this.gameConfig.executable];
        for (const modName of searchOrder) {
            const modData = this.patchData.memory[modName];
            if (!modData || !modData.hooks || !modData.hooks[hook.name]) continue;

            const hookDef = modData.hooks[hook.name];
            results.push({
                moduleName: modName,
                address: hookDef.Address,
                params: hook._params || hookDef.Params || [],
                returnType: hook._return || hookDef.Return || 'void',
            });
        }

        return results;
    }
}

module.exports = { ScriptGenerator };
