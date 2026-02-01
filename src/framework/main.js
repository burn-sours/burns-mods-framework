const { app, BrowserWindow, ipcMain, Menu, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { Client } = require('./client');

let mainWindow;
let client;
let currentMod = null;

const MOD_DIR = path.join(__dirname, '../mod');

function scanMods() {
    const files = fs.readdirSync(MOD_DIR).filter(f =>
        f === 'mod.js' || (/^mod\..+\.js$/.test(f) && f !== 'mod.js')
    );
    return files.map(file => {
        const match = file.match(/^mod\.(.+)\.js$/);
        const id = match ? match[1] : 'default';
        return { id, file, filePath: path.join(MOD_DIR, file) };
    });
}

function loadMod(entry) {
    delete require.cache[require.resolve(entry.filePath)];
    const mod = require(entry.filePath);
    currentMod = { entry, mod };

    client = new Client(mod);

    client._onStatusChange = (status) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('status-change', status);
        }
    };

    client._onGameEvent = (payload) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('game-event', payload);
        }
    };

    mainWindow.setTitle(mod.name);
    return { id: entry.id, name: mod.name };
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 580,
        height: 580,
        resizable: false,
        icon: path.join(__dirname, '../../media/burn.ico'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    Menu.setApplicationMenu(Menu.buildFromTemplate([
        {
            label: 'Links',
            submenu: [
                {
                    label: "Join us on Burn's Discord",
                    click: () => shell.openExternal('https://discord.gg/DJrkR77HJD'),
                },
                {
                    label: 'Support Burn',
                    click: () => shell.openExternal('https://ko-fi.com/burn_sours'),
                },
                {
                    label: 'Contribute on GitHub',
                    click: () => shell.openExternal('https://github.com/burn-sours/burns-mods-framework'),
                },
            ]
        }
    ]));

    mainWindow.loadFile(path.join(__dirname, 'shell.html'));

    const mods = scanMods();
    const defaultEntry = mods.find(m => m.id === 'default') || mods[0];
    if (defaultEntry) {
        loadMod(defaultEntry);
    }
}

app.whenReady().then(createWindow);

async function cleanup() {
    if (client) {
        try { await client.stop(); } catch (e) { /* ignore */ }
        client = null;
    }
}

app.on('window-all-closed', async () => {
    await cleanup();
    app.quit();
});

app.on('before-quit', async (e) => {
    if (client) {
        e.preventDefault();
        await cleanup();
        app.quit();
    }
});

process.on('SIGINT', async () => {
    await cleanup();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await cleanup();
    process.exit(0);
});

process.on('uncaughtException', async (err) => {
    console.error('[Main] Uncaught exception:', err);
    await cleanup();
    process.exit(1);
});

process.on('unhandledRejection', async (err) => {
    console.error('[Main] Unhandled rejection:', err);
    await cleanup();
    process.exit(1);
});

ipcMain.handle('launch', async () => {
    await client.start();
});

ipcMain.handle('launch-with', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
        title: 'Select game executable',
        filters: [{ name: 'Executables', extensions: ['exe'] }],
        properties: ['openFile'],
    });
    if (canceled || !filePaths.length) return;
    await client.start(filePaths[0]);
});

ipcMain.handle('stop', async () => {
    await client.stop();
});

ipcMain.handle('send-command', (_, name, data) => {
    client.send(name, data);
});

ipcMain.handle('export-logs', async (_, content) => {
    const name = currentMod ? currentMod.mod.name : 'mod';
    const date = new Date().toISOString().slice(0, 10);
    const filename = `${name}-${date}-logs.txt`;
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
        defaultPath: filename,
        filters: [{ name: 'Text Files', extensions: ['txt'] }],
    });
    if (!canceled && filePath) {
        fs.writeFileSync(filePath, content, 'utf-8');
    }
});

ipcMain.handle('get-mods', () => {
    const entries = scanMods();
    const results = [];
    for (const entry of entries) {
        try {
            delete require.cache[require.resolve(entry.filePath)];
            const mod = require(entry.filePath);
            const gameConfig = require(path.join(__dirname, 'games', mod.game, `${mod.game}.js`));
            results.push({ id: entry.id, name: mod.name, game: gameConfig.executable });
        } catch (e) {
            console.error(`[Main] Failed to load mod ${entry.file}:`, e.message);
        }
    }
    return results;
});

ipcMain.handle('select-mod', async (_, modId) => {
    if (client && client.status !== 'idle') {
        await client.stop();
    }

    const entries = scanMods();
    const entry = entries.find(m => m.id === modId);
    if (!entry) throw new Error(`Mod not found: ${modId}`);

    return loadMod(entry);
});
