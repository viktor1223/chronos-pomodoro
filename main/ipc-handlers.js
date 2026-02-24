/* ═══════════════════════════════════════════════════════
   CHRONOS — IPC Handlers
   Routes IPC channels to window manager and reflection I/O.
   ═══════════════════════════════════════════════════════ */

const { ipcMain, dialog } = require('electron');
const windowManager = require('./window-manager');
const reflectionIO = require('./reflection-io');
const settingsStore = require('./settings-store');
const tray = require('./tray');

function registerIpcHandlers() {
    ipcMain.on('enter-work-mode', () => {
        windowManager.enterWorkMode();
        tray.updateTrayMenu(windowManager, 'work');
    });
    ipcMain.on('enter-rest-mode', () => {
        windowManager.enterRestMode();
        tray.updateTrayMenu(windowManager, 'rest');
    });
    ipcMain.on('work-complete', () => {
        windowManager.workComplete();
        tray.clearTrayTimer();
        tray.updateTrayMenu(windowManager, 'alert');
    });
    ipcMain.on('rest-complete', () => {
        windowManager.restComplete();
        tray.clearTrayTimer();
        tray.updateTrayMenu(windowManager, 'idle');
    });
    ipcMain.on('minimize-window', () => windowManager.minimizeWindow());
    ipcMain.on('close-window', () => windowManager.closeWindow());
    ipcMain.on('return-to-setup', () => {
        windowManager.returnToSetup();
        tray.clearTrayTimer();
        tray.updateTrayMenu(windowManager, 'idle');
    });

    // Tray timer updates from renderer
    ipcMain.on('tray-timer-update', (_event, data) => {
        tray.updateTrayTimer(data.remainingMs, data.phase);
    });

    // Settings persistence
    ipcMain.handle('get-settings', async () => {
        return settingsStore.getSettings();
    });

    ipcMain.on('save-settings', (_event, settings) => {
        settingsStore.saveSettings(settings);
    });

    ipcMain.handle('increment-session', async () => {
        return settingsStore.incrementSessionCount();
    });

    ipcMain.handle('select-log-dir', async () => {
        const mainWindow = windowManager.getMainWindow();
        const result = await dialog.showOpenDialog(mainWindow, {
            properties: ['openDirectory', 'createDirectory'],
            title: 'Choose Reflection Log Directory',
            buttonLabel: 'Select Folder',
        });
        if (result.canceled || result.filePaths.length === 0) return null;
        return result.filePaths[0];
    });

    ipcMain.handle('save-reflection', reflectionIO.saveReflection);
}

module.exports = { registerIpcHandlers };
