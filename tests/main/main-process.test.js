/**
 * Main Process — Unit Tests
 *
 * Tests Electron main process logic from main.js:
 *   - IPC handler registration
 *   - Window management (sizing, positioning)
 *   - save-reflection file I/O (JSONL + Markdown)
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// ── Mock Electron modules ─────────────────────────────
const mockWindow = {
    setFullScreen: jest.fn(),
    setAlwaysOnTop: jest.fn(),
    setSize: jest.fn(),
    setPosition: jest.fn(),
    setResizable: jest.fn(),
    setMinimizable: jest.fn(),
    setMinimumSize: jest.fn(),
    setVisibleOnAllWorkspaces: jest.fn(),
    minimize: jest.fn(),
    close: jest.fn(),
    center: jest.fn(),
    focus: jest.fn(),
    show: jest.fn(),
    loadFile: jest.fn(),
    on: jest.fn(),
    setVibrancy: jest.fn(),
    setHasShadow: jest.fn(),
    setBackgroundColor: jest.fn(),
};

const ipcHandlers = {};
const ipcInvokeHandlers = {};

const mockDialog = {
    showOpenDialog: jest.fn(),
};

const mockNotification = jest.fn().mockImplementation(() => ({
    show: jest.fn(),
}));

jest.mock('electron', () => ({
    app: {
        whenReady: jest.fn().mockReturnValue(Promise.resolve()),
        on: jest.fn(),
        quit: jest.fn(),
    },
    BrowserWindow: jest.fn().mockImplementation(() => mockWindow),
    ipcMain: {
        on: jest.fn((channel, handler) => {
            ipcHandlers[channel] = handler;
        }),
        handle: jest.fn((channel, handler) => {
            ipcInvokeHandlers[channel] = handler;
        }),
    },
    screen: {
        getPrimaryDisplay: jest.fn().mockReturnValue({
            workAreaSize: { width: 1920, height: 1080 },
        }),
    },
    Notification: Object.assign(mockNotification, {
        isSupported: jest.fn().mockReturnValue(true),
    }),
    dialog: mockDialog,
}));

// ── Load main/index.js to register handlers ──────────
beforeAll(() => {
    require('../../main/index.js');
});

// ═══════════════════════════════════════════════════════
//  1. IPC HANDLER REGISTRATION
// ═══════════════════════════════════════════════════════

describe('IPC Handler Registration', () => {
    test('registers enter-work-mode handler', () => {
        expect(ipcHandlers['enter-work-mode']).toBeDefined();
    });

    test('registers enter-rest-mode handler', () => {
        expect(ipcHandlers['enter-rest-mode']).toBeDefined();
    });

    test('registers work-complete handler', () => {
        expect(ipcHandlers['work-complete']).toBeDefined();
    });

    test('registers rest-complete handler', () => {
        expect(ipcHandlers['rest-complete']).toBeDefined();
    });

    test('registers minimize-window handler', () => {
        expect(ipcHandlers['minimize-window']).toBeDefined();
    });

    test('registers close-window handler', () => {
        expect(ipcHandlers['close-window']).toBeDefined();
    });

    test('registers return-to-setup handler', () => {
        expect(ipcHandlers['return-to-setup']).toBeDefined();
    });

    test('registers select-log-dir invoke handler', () => {
        expect(ipcInvokeHandlers['select-log-dir']).toBeDefined();
    });

    test('registers save-reflection invoke handler', () => {
        expect(ipcInvokeHandlers['save-reflection']).toBeDefined();
    });
});

// ═══════════════════════════════════════════════════════
//  2. WINDOW MANAGEMENT — WORK MODE
// ═══════════════════════════════════════════════════════

describe('Window Management — Work Mode', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('enter-work-mode sets compact widget size', () => {
        ipcHandlers['enter-work-mode']();
        expect(mockWindow.setSize).toHaveBeenCalledWith(140, 180);
    });

    test('enter-work-mode sets alwaysOnTop floating', () => {
        ipcHandlers['enter-work-mode']();
        expect(mockWindow.setAlwaysOnTop).toHaveBeenCalledWith(true, 'floating');
    });

    test('enter-work-mode disables resizing', () => {
        ipcHandlers['enter-work-mode']();
        expect(mockWindow.setResizable).toHaveBeenCalledWith(false);
    });

    test('enter-work-mode exits fullscreen', () => {
        ipcHandlers['enter-work-mode']();
        expect(mockWindow.setFullScreen).toHaveBeenCalledWith(false);
    });

    test('enter-work-mode positions bottom-right', () => {
        ipcHandlers['enter-work-mode']();
        // Screen is 1920x1080
        expect(mockWindow.setPosition).toHaveBeenCalledWith(
            1920 - 160,
            1080 - 200
        );
    });
});

// ═══════════════════════════════════════════════════════
//  3. WINDOW MANAGEMENT — REST/ALERT MODE
// ═══════════════════════════════════════════════════════

describe('Window Management — Rest Mode', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('enter-rest-mode sets fullscreen', () => {
        ipcHandlers['enter-rest-mode']();
        expect(mockWindow.setFullScreen).toHaveBeenCalledWith(true);
    });

    test('enter-rest-mode sets alwaysOnTop screen-saver level', () => {
        ipcHandlers['enter-rest-mode']();
        expect(mockWindow.setAlwaysOnTop).toHaveBeenCalledWith(true, 'screen-saver');
    });

    test('enter-rest-mode disables resizing', () => {
        ipcHandlers['enter-rest-mode']();
        expect(mockWindow.setResizable).toHaveBeenCalledWith(false);
    });

    test('enter-rest-mode sets visible on all workspaces', () => {
        ipcHandlers['enter-rest-mode']();
        expect(mockWindow.setVisibleOnAllWorkspaces).toHaveBeenCalledWith(true);
    });
});

describe('Window Management — Work Complete Alert', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('work-complete sets fullscreen takeover', () => {
        ipcHandlers['work-complete']();
        expect(mockWindow.setFullScreen).toHaveBeenCalledWith(true);
    });

    test('work-complete shows system notification', () => {
        ipcHandlers['work-complete']();
        expect(mockNotification).toHaveBeenCalledWith({
            title: 'Time to Rest',
            body: 'Your work session is complete. Time to rest, philosopher.',
            silent: false,
        });
    });

    test('work-complete focuses window', () => {
        ipcHandlers['work-complete']();
        expect(mockWindow.focus).toHaveBeenCalled();
    });
});

describe('Window Management — Rest Complete → Reflect', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test('rest-complete exits fullscreen', () => {
        ipcHandlers['rest-complete']();
        expect(mockWindow.setFullScreen).toHaveBeenCalledWith(false);
    });

    test('rest-complete disables alwaysOnTop', () => {
        ipcHandlers['rest-complete']();
        expect(mockWindow.setAlwaysOnTop).toHaveBeenCalledWith(false);
    });

    test('rest-complete sets reflect size after delay', () => {
        ipcHandlers['rest-complete']();
        jest.advanceTimersByTime(700);
        expect(mockWindow.setSize).toHaveBeenCalledWith(560, 700);
    });

    test('rest-complete centers window after delay', () => {
        ipcHandlers['rest-complete']();
        jest.advanceTimersByTime(700);
        expect(mockWindow.center).toHaveBeenCalled();
    });

    test('rest-complete sets minimum size for reflect', () => {
        ipcHandlers['rest-complete']();
        jest.advanceTimersByTime(700);
        expect(mockWindow.setMinimumSize).toHaveBeenCalledWith(400, 500);
    });
});

// ═══════════════════════════════════════════════════════
//  4. WINDOW CONTROLS
// ═══════════════════════════════════════════════════════

describe('Window Controls', () => {
    beforeEach(() => jest.clearAllMocks());

    test('minimize-window minimizes', () => {
        ipcHandlers['minimize-window']();
        expect(mockWindow.minimize).toHaveBeenCalled();
    });

    test('close-window closes', () => {
        ipcHandlers['close-window']();
        expect(mockWindow.close).toHaveBeenCalled();
    });

    test('return-to-setup restores setup size', () => {
        ipcHandlers['return-to-setup']();
        expect(mockWindow.setSize).toHaveBeenCalledWith(320, 460);
    });

    test('return-to-setup disables alwaysOnTop', () => {
        ipcHandlers['return-to-setup']();
        expect(mockWindow.setAlwaysOnTop).toHaveBeenCalledWith(false);
    });

    test('return-to-setup enables resizing', () => {
        ipcHandlers['return-to-setup']();
        expect(mockWindow.setResizable).toHaveBeenCalledWith(true);
    });
});

// ═══════════════════════════════════════════════════════
//  5. SAVE REFLECTION — FILE I/O
// ═══════════════════════════════════════════════════════

describe('Save Reflection — File I/O', () => {
    let tempDir;

    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chronos-test-'));
    });

    afterEach(() => {
        // Clean up temp files
        fs.rmSync(tempDir, { recursive: true, force: true });
    });

    test('returns error when no log directory set', async () => {
        const result = await ipcInvokeHandlers['save-reflection']({}, {
            logDir: '',
            task: 'test',
            notes: 'notes',
            workMinutes: 25,
            restMinutes: 5,
        });
        expect(result.success).toBe(false);
        expect(result.error).toContain('No log directory');
    });

    test('creates JSONL file with structured log', async () => {
        const result = await ipcInvokeHandlers['save-reflection']({}, {
            logDir: tempDir,
            task: 'Coding',
            notes: 'Good session',
            virtueRatings: { arete: 4 },
            workMinutes: 25,
            restMinutes: 5,
        });

        expect(result.success).toBe(true);

        const today = new Date().toISOString().split('T')[0];
        const jsonlPath = path.join(tempDir, `${today}.jsonl`);
        expect(fs.existsSync(jsonlPath)).toBe(true);

        const lines = fs.readFileSync(jsonlPath, 'utf8').trim().split('\n');
        const entry = JSON.parse(lines[0]);
        expect(entry.phase).toBe('reflect');
        expect(entry.task).toBe('Coding');
        expect(entry.notes).toBe('Good session');
        expect(entry.durationMin.work).toBe(25);
        expect(entry.durationMin.rest).toBe(5);
        expect(entry.virtueRatings.arete).toBe(4);
    });

    test('creates Markdown file with human-readable entry', async () => {
        await ipcInvokeHandlers['save-reflection']({}, {
            logDir: tempDir,
            task: 'Writing tests',
            notes: 'Comprehensive',
            virtueRatings: { arete: 5, phronesis: 3 },
            workMinutes: 30,
            restMinutes: 10,
        });

        const today = new Date().toISOString().split('T')[0];
        const mdPath = path.join(tempDir, `${today}.md`);
        expect(fs.existsSync(mdPath)).toBe(true);

        const content = fs.readFileSync(mdPath, 'utf8');
        expect(content).toContain(`# Reflections — ${today}`);
        expect(content).toContain('30 min work');
        expect(content).toContain('10 min rest');
        expect(content).toContain('Writing tests');
        expect(content).toContain('Comprehensive');
        expect(content).toContain('Areté: 5/5');
        expect(content).toContain('Phronesis: 3/5');
    });

    test('appends to existing files (does not overwrite)', async () => {
        const data = {
            logDir: tempDir,
            task: 'Session 1',
            notes: '',
            workMinutes: 25,
            restMinutes: 5,
        };

        await ipcInvokeHandlers['save-reflection']({}, data);
        await ipcInvokeHandlers['save-reflection']({}, { ...data, task: 'Session 2' });

        const today = new Date().toISOString().split('T')[0];
        const jsonlPath = path.join(tempDir, `${today}.jsonl`);
        const lines = fs.readFileSync(jsonlPath, 'utf8').trim().split('\n');
        expect(lines.length).toBe(2);
        expect(JSON.parse(lines[0]).task).toBe('Session 1');
        expect(JSON.parse(lines[1]).task).toBe('Session 2');
    });

    test('creates directory if it does not exist', async () => {
        const nestedDir = path.join(tempDir, 'logs', 'chronos');
        await ipcInvokeHandlers['save-reflection']({}, {
            logDir: nestedDir,
            task: 'test',
            notes: '',
            workMinutes: 25,
            restMinutes: 5,
        });
        expect(fs.existsSync(nestedDir)).toBe(true);
    });

    test('handles empty task and notes gracefully', async () => {
        const result = await ipcInvokeHandlers['save-reflection']({}, {
            logDir: tempDir,
            task: '',
            notes: '',
            workMinutes: 25,
            restMinutes: 5,
        });
        expect(result.success).toBe(true);

        const today = new Date().toISOString().split('T')[0];
        const content = fs.readFileSync(path.join(tempDir, `${today}.md`), 'utf8');
        // Should NOT contain "What I worked on" section when task is empty
        expect(content).not.toContain('### What I worked on');
    });

    test('returns filePath on success', async () => {
        const result = await ipcInvokeHandlers['save-reflection']({}, {
            logDir: tempDir,
            task: 'test',
            notes: '',
            workMinutes: 25,
            restMinutes: 5,
        });
        expect(result.success).toBe(true);
        expect(result.filePath).toBeTruthy();
        expect(result.filePath).toContain(tempDir);
    });
});

// ═══════════════════════════════════════════════════════
//  6. SELECT LOG DIRECTORY
// ═══════════════════════════════════════════════════════

describe('Select Log Directory', () => {
    test('returns null when dialog is canceled', async () => {
        mockDialog.showOpenDialog.mockResolvedValue({ canceled: true, filePaths: [] });
        const result = await ipcInvokeHandlers['select-log-dir']();
        expect(result).toBeNull();
    });

    test('returns selected path', async () => {
        mockDialog.showOpenDialog.mockResolvedValue({
            canceled: false,
            filePaths: ['/Users/test/logs'],
        });
        const result = await ipcInvokeHandlers['select-log-dir']();
        expect(result).toBe('/Users/test/logs');
    });
});
