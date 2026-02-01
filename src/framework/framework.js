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
        this.name = name;
        this._module = null;
        this._offset = null;
        this._type = null;
        this._pointer = null;
        this._size = null;
    }

    at(module, offset) {
        this._module = module;
        this._offset = offset;
        return this;
    }

    type(typeName) {
        this._type = typeName;
        return this;
    }

    pointer(offset) {
        this._pointer = offset;
        return this;
    }

    size(n) {
        this._size = n;
        return this;
    }
}

class HookBuilder {
    constructor(name) {
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
        this._module = module;
        this._offset = offset;
        return this;
    }

    params(paramTypes) {
        this._params = paramTypes;
        return this;
    }

    returns(returnType) {
        this._return = returnType;
        return this;
    }

    /** @param {HookEnterCallback} fn */
    onEnter(fn) {
        this._onEnter = fn;
        return this;
    }

    /** @param {HookLeaveCallback} fn */
    onLeave(fn) {
        this._onLeave = fn;
        return this;
    }

    /** @param {HookReplaceCallback} fn */
    replace(fn) {
        this._replace = fn;
        return this;
    }
}

class LoopBuilder {
    constructor(name) {
        this.name = name;
        this._interval = null;
        this._handler = null;
    }

    every(ms) {
        this._interval = ms;
        return this;
    }

    /** @param {Callback} fn */
    run(fn) {
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
        this._nops.push({ module, address, size });
        return this;
    }

    /**
     * @param {string} name
     * @param {ReceiveCallback} fn
     */
    receive(name, fn) {
        this._receivers[name] = fn;
        return this;
    }

    /** @param {Callback} fn */
    init(fn) {
        this._init = fn;
        return this;
    }

    /** @param {Callback} fn */
    exit(fn) {
        this._exit = fn;
        return this;
    }
}

function createMod(name, game, modules) {
    return new Mod(name, game, modules);
}

module.exports = { createMod };
