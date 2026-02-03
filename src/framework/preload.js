const { contextBridge, ipcRenderer } = require('electron');

const _eventHandlers = [];
const _statusHandlers = [];

ipcRenderer.on('game-event', (_, payload) => {
    for (const cb of _eventHandlers) cb(payload);
});

ipcRenderer.on('status-change', (_, status) => {
    for (const cb of _statusHandlers) cb(status);
});

contextBridge.exposeInMainWorld('framework', {
    getPlatform: () => ipcRenderer.invoke('get-platform'),
    launch: () => ipcRenderer.invoke('launch'),
    launchWith: () => ipcRenderer.invoke('launch-with'),
    stop: () => ipcRenderer.invoke('stop'),
    send: (name, data) => ipcRenderer.invoke('send-command', name, data),
    onEvent: (cb) => { _eventHandlers.push(cb); },
    onStatus: (cb) => { _statusHandlers.push(cb); },
    clearModListeners: () => {
        _eventHandlers.length = 1;
        _statusHandlers.length = 1;
    },
    exportLogs: (content) => ipcRenderer.invoke('export-logs', content),
    getMods: () => ipcRenderer.invoke('get-mods'),
    selectMod: (modId) => ipcRenderer.invoke('select-mod', modId),
});
