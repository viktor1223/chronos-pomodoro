const { app, BrowserWindow, ipcMain, screen, Notification, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let isWorkMode = true;

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
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
        icon: path.join(__dirname, 'icon.png'),
    });

    mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

    // Position bottom-right for work mode
    mainWindow.setPosition(
        screenWidth - 340,
        screenHeight - 440
    );

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// Switch to compact widget mode
ipcMain.on('enter-work-mode', () => {
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
});

// Switch to fullscreen rest/alert mode
ipcMain.on('enter-rest-mode', () => {
    if (!mainWindow) return;
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
    mainWindow.setResizable(false);
    mainWindow.setFullScreen(true);
    mainWindow.focus();
    mainWindow.setVisibleOnAllWorkspaces(true);
    isWorkMode = false;
});

// Work complete alert - take over screen
ipcMain.on('work-complete', () => {
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
});

// Rest complete - resize for reflection
ipcMain.on('rest-complete', () => {
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
});

// Window controls
ipcMain.on('minimize-window', () => {
    if (mainWindow) mainWindow.minimize();
});

ipcMain.on('close-window', () => {
    if (mainWindow) mainWindow.close();
});

// Return to setup screen (resize window)
ipcMain.on('return-to-setup', () => {
    if (!mainWindow) return;
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

    mainWindow.setVisibleOnAllWorkspaces(false);
    mainWindow.setAlwaysOnTop(false);
    mainWindow.setFullScreen(false);
    mainWindow.setResizable(true);
    mainWindow.setSize(320, 460);
    mainWindow.setPosition(screenWidth - 340, screenHeight - 480);
});

// Select log directory via native folder picker
ipcMain.handle('select-log-dir', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory', 'createDirectory'],
        title: 'Choose Reflection Log Directory',
        buttonLabel: 'Select Folder',
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
});

// Save reflection entry as markdown
ipcMain.handle('save-reflection', async (_event, data) => {
    try {
        const dir = data.logDir;
        if (!dir) return { success: false, error: 'No log directory set' };

        // Ensure directory exists
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // Daily file: YYYY-MM-DD.md
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const filePath = path.join(dir, `${dateStr}.md`);
        const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

        // ── JSONL structured log ──────────────────────
        const jsonlPath = path.join(dir, `${dateStr}.jsonl`);
        const jsonlEntry = JSON.stringify({
            timestamp: now.toISOString(),
            phase: 'reflect',
            durationMin: { work: data.workMinutes, rest: data.restMinutes },
            virtueRatings: data.virtueRatings || {},
            task: (data.task || '').trim(),
            notes: (data.notes || '').trim(),
        });
        fs.appendFileSync(jsonlPath, jsonlEntry + '\n', 'utf8');

        // ── Markdown entry (human-readable) ──────────
        let entry = '';

        if (!fs.existsSync(filePath)) {
            entry += `# Reflections — ${dateStr}\n\n`;
        }

        entry += `## Session at ${timeStr}\n\n`;
        entry += `| Field | Value |\n|-------|-------|\n`;
        entry += `| Duration | ${data.workMinutes} min work · ${data.restMinutes} min rest |\n`;

        // Virtue ratings
        if (data.virtueRatings) {
            const vr = data.virtueRatings;
            const virtueNames = { arete: 'Areté', sophrosyne: 'Sophrosyne', andreia: 'Andreia', dikaiosyne: 'Dikaiosyne', phronesis: 'Phronesis' };
            const rated = Object.entries(vr).filter(([, v]) => v > 0);
            if (rated.length > 0) {
                const virtueStr = rated.map(([k, v]) => `${virtueNames[k] || k}: ${v}/5`).join(', ');
                entry += `| Virtues | ${virtueStr} |\n`;
            }
        }
        entry += `\n`;

        if (data.task && data.task.trim()) {
            entry += `### What I worked on\n\n${data.task.trim()}\n\n`;
        }

        if (data.notes && data.notes.trim()) {
            entry += `### Notes & reflections\n\n${data.notes.trim()}\n\n`;
        }

        entry += `---\n\n`;

        fs.appendFileSync(filePath, entry, 'utf8');

        return { success: true, filePath };
    } catch (err) {
        console.error('Failed to save reflection:', err);
        return { success: false, error: err.message };
    }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
