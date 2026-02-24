/* ═══════════════════════════════════════════════════════
   CHRONOS — System Tray
   macOS tray icon with timer display and controls.
   ═══════════════════════════════════════════════════════ */

const { Tray, Menu, nativeImage, app } = require('electron');
const path = require('path');

let tray = null;
let timerInterval = null;
let currentTitle = '';

function createTray(windowManager) {
    // Create a 16x16 template image for macOS tray
    const iconPath = path.join(__dirname, '..', 'icon.png');
    let trayIcon;
    try {
        trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
        trayIcon.setTemplateImage(true);
    } catch (e) {
        // Fallback: create a tiny empty image
        trayIcon = nativeImage.createEmpty();
    }

    tray = new Tray(trayIcon);
    tray.setToolTip('Chronos — Pomodoro Timer');
    updateTrayMenu(windowManager, 'idle');

    return tray;
}

function updateTrayMenu(windowManager, phase) {
    if (!tray) return;

    const menuItems = [];

    if (phase === 'work' || phase === 'rest') {
        menuItems.push(
            { label: currentTitle || 'Timer Running…', enabled: false },
            { type: 'separator' },
            {
                label: 'Stop Timer',
                click: () => {
                    const win = windowManager.getMainWindow();
                    if (win) win.webContents.send('tray-stop');
                },
            },
        );
    } else {
        menuItems.push(
            { label: 'Chronos', enabled: false },
            { type: 'separator' },
            {
                label: 'Show Window',
                click: () => {
                    const win = windowManager.getMainWindow();
                    if (win) {
                        win.show();
                        win.focus();
                    }
                },
            },
        );
    }

    menuItems.push(
        { type: 'separator' },
        {
            label: 'Quit Chronos',
            click: () => app.quit(),
        },
    );

    tray.setContextMenu(Menu.buildFromTemplate(menuItems));
}

function updateTrayTimer(remainingMs, phase) {
    if (!tray) return;

    const totalSec = Math.ceil(remainingMs / 1000);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    const label = phase === 'work' ? '⏱' : '☽';
    currentTitle = label + ' ' + mins + ':' + secs.toString().padStart(2, '0');
    tray.setTitle(currentTitle);
}

function clearTrayTimer() {
    if (tray) {
        tray.setTitle('');
        currentTitle = '';
    }
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function destroyTray() {
    clearTrayTimer();
    if (tray) {
        tray.destroy();
        tray = null;
    }
}

module.exports = {
    createTray,
    updateTrayMenu,
    updateTrayTimer,
    clearTrayTimer,
    destroyTray,
};
