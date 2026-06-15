const { app, BrowserWindow } = require('electron');
const path = require('path');

// Import and start the Express server
const { loadCityMapping } = require('../utils');
const createApp = require('../server').createApp;

const PORT = process.env.PORT || 3100;
let mainWindow = null;
let serverInstance = null;

async function startServer() {
    await loadCityMapping();
    const expressApp = createApp();

    return new Promise((resolve, reject) => {
        const server = expressApp.listen(PORT, '127.0.0.1', () => {
            console.log(`Doctor server running at http://localhost:${PORT}`);
            resolve(server);
        });
        server.on('error', reject);
    });
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 700,
        title: '联程航班方案对比诊断工具',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    mainWindow.loadURL(`http://127.0.0.1:${PORT}`);

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Open external links in system browser (not in Electron window)
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        require('electron/shell').openExternal(url);
        return { action: 'deny' };
    });
}

app.on('window-all-closed', () => {
    app.quit();
});

app.on('before-quit', () => {
    if (serverInstance) {
        serverInstance.close();
        serverInstance = null;
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});

app.whenReady().then(async () => {
    try {
        serverInstance = await startServer();
        createWindow();
    } catch (err) {
        console.error('Failed to start server:', err);
        app.quit();
    }
});
