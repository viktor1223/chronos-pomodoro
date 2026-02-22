/* ═══════════════════════════════════════════════════════
   CHRONOS — Window Manager
   Window state machine: sizes, positions, modes.
   ═══════════════════════════════════════════════════════ */

const { BrowserWindow, screen, Notification } = require('electron');
const path = require('path');

let mainWindow;
let isWorkMode = true;

function getMainWindow() {
    return mainWindow;
}

function createWindow() {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

    mainWindow = new BrowserWindow({
        width: 320,
        height: 460,
        minWidth: 200,
        minHeight: 320,
        frame: false,
        transparent: true,
        vibrancy: 'under-window',
        visualEffectState: 'active',
        titleBarStyle: 'hidden',
        hasShadow: true,
        resizable: true,
        alwaysOnTop: false,
        skipTaskbar: false,
        webPreferences: {
            preload: path.join(__dirname, '..', 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
        icon: path.join(__dirname, '..', 'icon.png'),
    });

    mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

    // Position bottom-right for work mode
    mainWindow.setPosition(
        screenWidth - 340,
        screenHeight - 440
    );

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

function enterWorkMode() {
    if (!mainWindow) return;
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

    mainWindow.setFullScreen(false);
    mainWindow.setAlwaysOnTop(true, 'floating');
    mainWindow.setSize(140, 180);
    mainWindow.setPosition(screenWidth - 160, screenHeight - 200);
    mainWindow.setResizable(false);
    mainWindow.setMinimizable(true);
    isWorkMode = true;
}

function enterRestMode() {
    if (!mainWindow) return;
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
    mainWindow.setResizable(false);
    mainWindow.setFullScreen(true);
    mainWindow.focus();
    mainWindow.setVisibleOnAllWorkspaces(true);
    isWorkMode = false;
}

function workComplete() {
    if (!mainWindow) return;

    // Show system notification
    if (Notification.isSupported()) {
        const notification = new Notification({
            title: 'Time to Rest',
            body: 'Your work session is complete. Time to rest, philosopher.',
            silent: false,
        });
        notification.show();
    }

    // Take over screen
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
    mainWindow.setFullScreen(true);
    mainWindow.focus();
    mainWindow.show();
    mainWindow.setVisibleOnAllWorkspaces(true);
}

function restComplete() {
    if (!mainWindow) return;
    mainWindow.setVisibleOnAllWorkspaces(false);
    mainWindow.setAlwaysOnTop(false);
    mainWindow.setFullScreen(false);

    // Delay to let macOS fullscreen exit animation complete
    setTimeout(() => {
        if (!mainWindow) return;
        mainWindow.setResizable(true);
        mainWindow.setMinimumSize(400, 500);
        mainWindow.setSize(560, 700);
        mainWindow.center();
    }, 600);
}

function minimizeWindow() {
    if (mainWindow) mainWindow.minimize();
}

function closeWindow() {
    if (mainWindow) mainWindow.close();
}

function returnToSetup() {
    if (!mainWindow) return;
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

    mainWindow.setVisibleOnAllWorkspaces(false);
    mainWindow.setAlwaysOnTop(false);
    mainWindow.setFullScreen(false);
    mainWindow.setResizable(true);
    mainWindow.setSize(320, 460);
    mainWindow.setPosition(screenWidth - 340, screenHeight - 480);
}

module.exports = {
    getMainWindow,
    createWindow,
    enterWorkMode,
    enterRestMode,
    workComplete,
    restComplete,
    minimizeWindow,
    closeWindow,
    returnToSetup,
};
