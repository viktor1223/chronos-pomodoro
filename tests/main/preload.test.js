/**
 * Preload Script — Unit Tests
 *
 * Tests the contextBridge API surface:
 *   - All 9 IPC methods are exposed
 *   - Methods delegate to correct ipcRenderer channels
 */

const mockSend = jest.fn();
const mockInvoke = jest.fn();

jest.mock('electron', () => ({
    contextBridge: {
        exposeInMainWorld: jest.fn(),
    },
    ipcRenderer: {
        send: mockSend,
        invoke: mockInvoke,
    },
}));

const { contextBridge } = require('electron');

// Load preload to trigger registration
require('../../preload.js');

// Extract the registered API
const registeredAPI = contextBridge.exposeInMainWorld.mock.calls[0];
const apiName = registeredAPI[0];
const api = registeredAPI[1];

// ═══════════════════════════════════════════════════════
//  1. API REGISTRATION
// ═══════════════════════════════════════════════════════

describe('Preload — API Registration', () => {
    test('exposes API under "electronAPI" namespace', () => {
        expect(apiName).toBe('electronAPI');
    });

    test('API object has exactly 14 methods', () => {
        const methods = Object.keys(api);
        expect(methods.length).toBe(14);
    });
});

// ═══════════════════════════════════════════════════════
//  2. SEND METHODS (fire-and-forget)
// ═══════════════════════════════════════════════════════

describe('Preload — Send Methods', () => {
    beforeEach(() => {
        mockSend.mockClear();
    });

    test('enterWorkMode sends enter-work-mode', () => {
        api.enterWorkMode();
        expect(mockSend).toHaveBeenCalledWith('enter-work-mode');
    });

    test('enterRestMode sends enter-rest-mode', () => {
        api.enterRestMode();
        expect(mockSend).toHaveBeenCalledWith('enter-rest-mode');
    });

    test('workComplete sends work-complete', () => {
        api.workComplete();
        expect(mockSend).toHaveBeenCalledWith('work-complete');
    });

    test('restComplete sends rest-complete', () => {
        api.restComplete();
        expect(mockSend).toHaveBeenCalledWith('rest-complete');
    });

    test('minimizeWindow sends minimize-window', () => {
        api.minimizeWindow();
        expect(mockSend).toHaveBeenCalledWith('minimize-window');
    });

    test('closeWindow sends close-window', () => {
        api.closeWindow();
        expect(mockSend).toHaveBeenCalledWith('close-window');
    });

    test('returnToSetup sends return-to-setup', () => {
        api.returnToSetup();
        expect(mockSend).toHaveBeenCalledWith('return-to-setup');
    });
});

// ═══════════════════════════════════════════════════════
//  3. INVOKE METHODS (request-response)
// ═══════════════════════════════════════════════════════

describe('Preload — Invoke Methods', () => {
    beforeEach(() => {
        mockInvoke.mockClear();
    });

    test('selectLogDir invokes select-log-dir', () => {
        api.selectLogDir();
        expect(mockInvoke).toHaveBeenCalledWith('select-log-dir');
    });

    test('saveReflection invokes save-reflection with data', () => {
        const data = { task: 'test', notes: 'notes' };
        api.saveReflection(data);
        expect(mockInvoke).toHaveBeenCalledWith('save-reflection', data);
    });
});
