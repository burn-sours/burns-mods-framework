const frida = require('frida');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { ScriptGenerator } = require('./generator');

class Client {
    constructor(mod) {
        this.mod = mod;
        this.gameConfig = require(`./games/${mod.game}/${mod.game}.js`);
        this.device = null;
        this.session = null;
        this.script = null;
        this.status = 'idle';
        this._cancelled = false;
        this._onStatusChange = null;
        this._onGameEvent = null;
    }

    async start(exePath) {
        this._cancelled = false;
        try {
            const processName = exePath ? path.basename(exePath) : this.gameConfig.executable;
            this._setStatus('waiting for ' + processName);

            this.device = await frida.getLocalDevice();

            if (exePath) {
                const processes = await this.device.enumerateProcesses();
                const already = processes.find(p => p.name === processName);
                if (!already) {
                    spawn(exePath, [], { detached: false, stdio: 'ignore', cwd: path.dirname(exePath) });
                    await this._delay(2000);
                }
            }

            let pid = null;
            while (!pid) {
                if (this._cancelled) return;
                try {
                    const processes = await this.device.enumerateProcesses();
                    const proc = processes.find(p => p.name === processName);
                    if (proc) pid = proc.pid;
                } catch (e) { /* ignore */ }
                if (!pid) await this._delay(1000);
            }

            this._setStatus('attaching');

            this.session = await this.device.attach(pid);
            this.session.detached.connect((reason) => this._onDetached(reason));

            const patchData = await this._detectPatch();

            this._setStatus('injecting');

            const generator = new ScriptGenerator(this.mod, this.gameConfig, patchData);
            const source = generator.generate();

            this.script = await this.session.createScript(source);
            this.script.message.connect((message) => this._handleMessage(message));

            const ready = new Promise((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error('Script init timeout')), 30000);
                const handler = (message) => {
                    if (message.type === 'send' && message.payload && message.payload.event === '__ready') {
                        clearTimeout(timeout);
                        this.script.message.disconnect(handler);
                        resolve();
                    }
                };
                this.script.message.connect(handler);
            });

            await this.script.load();
            await ready;

            this._setStatus('active');
        } catch (err) {
            if (this.script) {
                try { await this.script.unload(); } catch (e) { /* ignore */ }
                this.script = null;
            }
            if (this.session) {
                try { await this.session.detach(); } catch (e) { /* ignore */ }
                this.session = null;
            }
            this._setStatus('error');
            throw err;
        }
    }

    send(name, data) {
        if (this.script) {
            this.script.post({ type: 'command', name, data });
        }
    }

    async stop() {
        this._cancelled = true;
        if (this.script) {
            try {
                this.script.post({ type: 'cleanup' });
                await new Promise((resolve) => {
                    const timeout = setTimeout(resolve, 3000);
                    const handler = (message) => {
                        if (message.type === 'send' && message.payload && message.payload.event === '__cleanupDone') {
                            clearTimeout(timeout);
                            this.script.message.disconnect(handler);
                            resolve();
                        }
                    };
                    this.script.message.connect(handler);
                });
            } catch (e) { /* ignore cleanup errors */ }

            try { await this.script.unload(); } catch (e) { /* ignore */ }
            this.script = null;
        }

        this._setStatus('idle');

        if (this.session) {
            try { await this.session.detach(); } catch (e) { /* ignore */ }
            this.session = null;
        }
    }

    async _detectPatch() {
        try {
            // Frida runs in-process, so we need a helper script to resolve the exe path
            const pathScript = await this.session.createScript(`
                rpc.exports = {
                    getExePath: function() {
                        return Process.enumerateModules()[0].path;
                    }
                };
            `);
            await pathScript.load();
            const exePath = await pathScript.exports.getExePath();
            await pathScript.unload();

            const exeBuffer = fs.readFileSync(exePath);
            const hash = crypto.createHash('sha256').update(exeBuffer).digest('hex');

            for (const [patchKey, patchInfo] of Object.entries(this.gameConfig.patches)) {
                if (patchInfo.patch === hash) {
                    console.log(`[Client] Detected patch: ${patchInfo.name}`);
                    return patchInfo;
                }
            }

            console.warn(`[Client] Unknown patch (hash: ${hash}), falling back to default`);
        } catch (err) {
            console.warn('[Client] Patch detection failed, falling back to default:', err.message);
        }

        const defaultPatch = this.gameConfig.patches[this.gameConfig.defaultPatch];
        console.log(`[Client] Using default patch: ${defaultPatch.name}`);
        return defaultPatch;
    }

    _onDetached(reason) {
        this.session = null;
        this.script = null;
        if (this.status !== 'idle') {
            this._setStatus('idle');
            console.log('[Client] Detached:', reason);
            if (this._onGameEvent) {
                this._onGameEvent({ event: '__detached', data: { reason } });
            }
        }
    }

    _handleMessage(message) {
        if (message.type === 'send' && message.payload) {
            const { event, data } = message.payload;

            if (this.mod._events[event]) {
                try {
                    this.mod._events[event](data);
                } catch (e) {
                    console.error(`[Client] Event handler error (${event}):`, e);
                }
            }

            if (this._onGameEvent) {
                this._onGameEvent(message.payload);
            }
        } else if (message.type === 'error') {
            console.error('[Client] Script error:', message.stack || message.description);
            if (this._onGameEvent) {
                this._onGameEvent({ event: '__error', data: { message: message.stack || message.description } });
            }
        } else if (message.type === 'log') {
            const level = message.level || 'info';
            const text = message.payload;
            console[level === 'warning' ? 'warn' : level]('[Script]', text);
            if (this._onGameEvent) {
                this._onGameEvent({ event: '__log', data: { level, message: text } });
            }
        }
    }

    _setStatus(status) {
        this.status = status;
        if (this._onStatusChange) {
            this._onStatusChange(status);
        }
    }

    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = { Client };
