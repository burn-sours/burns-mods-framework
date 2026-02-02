/**
 * @callback Callback
 */

/**
 * @callback HookEnterCallback
 * @param {...*} params - typed params matching hook's parameter list
 */

/**
 * @callback HookLeaveCallback
 * @param {*} returnValue - typed return value (omitted for void hooks)
 * @param {...*} params - original params captured from entry
 * @returns {*} [optional] return a value to replace the original return value
 */

/**
 * @callback HookReplaceCallback
 * @param {...*} params - typed params matching hook's parameter list
 */

/**
 * @callback ReceiveCallback
 * @param {*} data
 */

class VariableBuilder {
    constructor(name) {
        if (!name || typeof name !== 'string') throw new Error('Variable name must be a non-empty string');
        this.name = name;
        this._module = null;
        this._offset = null;
        this._type = null;
        this._pointer = null;
        this._size = null;
    }

    at(module, offset) {
        if (!module || typeof module !== 'string') throw new Error('Module must be a non-empty string');
        if (offset === undefined || offset === null) throw new Error('Offset is required');
        this._module = module;
        this._offset = offset;
        return this;
    }

    type(typeName) {
        if (!typeName || typeof typeName !== 'string') throw new Error('Type must be a non-empty string');
        this._type = typeName;
        return this;
    }

    pointer(offset) {
        this._pointer = offset;
        return this;
    }

    size(n) {
        if (typeof n !== 'number' || n <= 0) throw new Error('Size must be a positive number');
        this._size = n;
        return this;
    }
}

class HookBuilder {
    constructor(name) {
        if (!name || typeof name !== 'string') throw new Error('Hook name must be a non-empty string');
        this.name = name;
        this._module = null;
        this._offset = null;
        this._params = null;
        this._return = null;
        this._onEnter = null;
        this._onLeave = null;
        this._replace = null;
    }

    at(module, offset) {
        if (!module || typeof module !== 'string') throw new Error('Module must be a non-empty string');
        if (offset === undefined || offset === null) throw new Error('Offset is required');
        this._module = module;
        this._offset = offset;
        return this;
    }

    params(paramTypes) {
        if (!Array.isArray(paramTypes)) throw new Error('Params must be an array');
        this._params = paramTypes;
        return this;
    }

    returns(returnType) {
        if (!returnType || typeof returnType !== 'string') throw new Error('Return type must be a non-empty string');
        this._return = returnType;
        return this;
    }

    /** @param {HookEnterCallback} fn */
    onEnter(fn) {
        if (typeof fn !== 'function') throw new Error('onEnter callback must be a function');
        if (this._replace) throw new Error('Cannot use onEnter with replace — pick one');
        this._onEnter = fn;
        return this;
    }

    /** @param {HookLeaveCallback} fn */
    onLeave(fn) {
        if (typeof fn !== 'function') throw new Error('onLeave callback must be a function');
        if (this._replace) throw new Error('Cannot use onLeave with replace — pick one');
        this._onLeave = fn;
        return this;
    }

    /** @param {HookReplaceCallback} fn */
    replace(fn) {
        if (typeof fn !== 'function') throw new Error('replace callback must be a function');
        if (this._onEnter || this._onLeave) throw new Error('Cannot use replace with onEnter/onLeave — pick one');
        this._replace = fn;
        return this;
    }
}

class LoopBuilder {
    constructor(name) {
        if (!name || typeof name !== 'string') throw new Error('Loop name must be a non-empty string');
        this.name = name;
        this._interval = null;
        this._handler = null;
    }

    every(ms) {
        if (typeof ms !== 'number' || ms <= 0) throw new Error('Interval must be a positive number');
        this._interval = ms;
        return this;
    }

    /** @param {Callback} fn */
    run(fn) {
        if (typeof fn !== 'function') throw new Error('Loop handler must be a function');
        this._handler = fn;
        return this;
    }
}

class Mod {
    constructor(name, game, modules) {
        this.name = name;
        this.game = game;
        this.modules = modules;
        this._variables = [];
        this._hooks = [];
        this._events = {};
        this._loops = [];
        this._nops = [];
        this._receivers = {};
        this._init = null;
        this._exit = null;
    }

    variable(name) {
        const builder = new VariableBuilder(name);
        this._variables.push(builder);
        return builder;
    }

    hook(name) {
        const builder = new HookBuilder(name);
        this._hooks.push(builder);
        return builder;
    }

    on(event, fn) {
        this._events[event] = fn;
        return this;
    }

    loop(name) {
        const builder = new LoopBuilder(name);
        this._loops.push(builder);
        return builder;
    }

    nop(module, address, size) {
        if (!module || typeof module !== 'string') throw new Error('Nop module must be a non-empty string');
        if (address === undefined || address === null) throw new Error('Nop address is required');
        if (typeof size !== 'number' || size <= 0) throw new Error('Nop size must be a positive number');
        this._nops.push({ module, address, size });
        return this;
    }

    /**
     * @param {string} name
     * @param {ReceiveCallback} fn
     */
    receive(name, fn) {
        if (!name || typeof name !== 'string') throw new Error('Receiver name must be a non-empty string');
        if (typeof fn !== 'function') throw new Error('Receiver callback must be a function');
        this._receivers[name] = fn;
        return this;
    }

    /** @param {Callback} fn */
    init(fn) {
        if (typeof fn !== 'function') throw new Error('Init callback must be a function');
        this._init = fn;
        return this;
    }

    /** @param {Callback} fn */
    exit(fn) {
        if (typeof fn !== 'function') throw new Error('Exit callback must be a function');
        this._exit = fn;
        return this;
    }
}

function createMod(name, game, modules) {
    if (!name || typeof name !== 'string') throw new Error('Mod name must be a non-empty string');
    if (!game || typeof game !== 'string') throw new Error('Game must be a non-empty string');
    if (!Array.isArray(modules) || modules.length === 0) throw new Error('Modules must be a non-empty array');
    return new Mod(name, game, modules);
}

module.exports = { createMod };
