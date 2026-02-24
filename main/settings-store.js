/* ═══════════════════════════════════════════════════════
   CHRONOS — Settings Store
   Persistent settings via electron-store.
   ═══════════════════════════════════════════════════════ */

const Store = require('electron-store');

const store = new Store({
    name: 'chronos-settings',
    defaults: {
        workMinutes: 25,
        restMinutes: 5,
        logDir: '',
        audioMuted: false,
        totalSessions: 0,
        todaySessions: 0,
        todayDate: '',
    },
});

function getSettings() {
    // Reset daily counter if date changed
    const today = new Date().toISOString().split('T')[0];
    if (store.get('todayDate') !== today) {
        store.set('todaySessions', 0);
        store.set('todayDate', today);
    }

    return {
        workMinutes: store.get('workMinutes'),
        restMinutes: store.get('restMinutes'),
        logDir: store.get('logDir'),
        audioMuted: store.get('audioMuted'),
        totalSessions: store.get('totalSessions'),
        todaySessions: store.get('todaySessions'),
    };
}

function saveSettings(settings) {
    if (settings.workMinutes !== undefined) store.set('workMinutes', settings.workMinutes);
    if (settings.restMinutes !== undefined) store.set('restMinutes', settings.restMinutes);
    if (settings.logDir !== undefined) store.set('logDir', settings.logDir);
    if (settings.audioMuted !== undefined) store.set('audioMuted', settings.audioMuted);
}

function incrementSessionCount() {
    const today = new Date().toISOString().split('T')[0];
    if (store.get('todayDate') !== today) {
        store.set('todaySessions', 0);
        store.set('todayDate', today);
    }
    store.set('totalSessions', store.get('totalSessions') + 1);
    store.set('todaySessions', store.get('todaySessions') + 1);

    return {
        totalSessions: store.get('totalSessions'),
        todaySessions: store.get('todaySessions'),
    };
}

module.exports = { getSettings, saveSettings, incrementSessionCount };
