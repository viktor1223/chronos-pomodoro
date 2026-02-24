/* ═══════════════════════════════════════════════════════
   CHRONOS — Main Entry Point
   App lifecycle: whenReady, quit, activate.
   ═══════════════════════════════════════════════════════ */

const { app, BrowserWindow } = require('electron');
const windowManager = require('./window-manager');
const ipcHandlers = require('./ipc-handlers');
const { createAppMenu } = require('./app-menu');
const tray = require('./tray');

ipcHandlers.registerIpcHandlers();

app.whenReady().then(() => {
    createAppMenu();
    windowManager.createWindow();
    tray.createTray(windowManager);

    // Handle --dev flag to open DevTools
    if (process.argv.includes('--dev')) {
        const win = windowManager.getMainWindow();
        if (win) win.webContents.openDevTools({ mode: 'detach' });
    }
});

app.on('window-all-closed', () => {
    app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        windowManager.createWindow();
    }
});
