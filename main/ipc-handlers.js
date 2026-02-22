/* ═══════════════════════════════════════════════════════
   CHRONOS — IPC Handlers
   Routes IPC channels to window manager and reflection I/O.
   ═══════════════════════════════════════════════════════ */

const { ipcMain, dialog } = require('electron');
const windowManager = require('./window-manager');
const reflectionIO = require('./reflection-io');

function registerIpcHandlers() {
    ipcMain.on('enter-work-mode', () => windowManager.enterWorkMode());
    ipcMain.on('enter-rest-mode', () => windowManager.enterRestMode());
    ipcMain.on('work-complete', () => windowManager.workComplete());
    ipcMain.on('rest-complete', () => windowManager.restComplete());
    ipcMain.on('minimize-window', () => windowManager.minimizeWindow());
    ipcMain.on('close-window', () => windowManager.closeWindow());
    ipcMain.on('return-to-setup', () => windowManager.returnToSetup());

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
