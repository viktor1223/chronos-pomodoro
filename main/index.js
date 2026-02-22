/* ═══════════════════════════════════════════════════════
   CHRONOS — Main Entry Point
   App lifecycle: whenReady, quit, activate.
   ═══════════════════════════════════════════════════════ */

const { app, BrowserWindow } = require('electron');
const windowManager = require('./window-manager');
const ipcHandlers = require('./ipc-handlers');

ipcHandlers.registerIpcHandlers();

app.whenReady().then(windowManager.createWindow);

app.on('window-all-closed', () => {
    app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        windowManager.createWindow();
    }
});
