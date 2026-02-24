/* ═══════════════════════════════════════════════════════
   CHRONOS — Reflection Form
   Browse log directory, save/skip reflection, clear form.
   Depends on: virtue.js (virtueKeys, virtueRatings),
               state.js (Phase, phase, logDir, workMinutes, restMinutes),
               screens.js (showScreen)
   ═══════════════════════════════════════════════════════ */

async function browseLogDir() {
    const dir = await window.electronAPI.selectLogDir();
    if (dir) {
        const input = document.getElementById('log-dir');
        if (input) input.value = dir;
        logDir = dir;
    }
}

async function saveReflectionAndFinish() {
    const task = document.getElementById('reflect-task')
        ? document.getElementById('reflect-task').value
        : '';
    const notes = document.getElementById('reflect-notes')
        ? document.getElementById('reflect-notes').value
        : '';

    if (logDir) {
        const result = await window.electronAPI.saveReflection({
            logDir: logDir,
            task: task,
            notes: notes,
            virtueRatings: Object.assign({}, virtueRatings),
            workMinutes: workMinutes,
            restMinutes: restMinutes,
        });

        const savedNote = document.getElementById('complete-saved-note');
        if (result && result.success && savedNote) {
            savedNote.textContent = 'Reflection saved';
        } else if (savedNote) {
            savedNote.textContent = '';
        }
    }

    clearReflectForm();
    phase = Phase.COMPLETE;
    showScreen('complete-screen');

    // Track session completion
    window.electronAPI.incrementSession().then(function (stats) {
        if (stats) updateSessionStats(stats.total, stats.today);
    });
}

function skipReflection() {
    clearReflectForm();
    const savedNote = document.getElementById('complete-saved-note');
    if (savedNote) savedNote.textContent = '';
    phase = Phase.COMPLETE;
    showScreen('complete-screen');

    // Track session completion
    window.electronAPI.incrementSession().then(function (stats) {
        if (stats) updateSessionStats(stats.total, stats.today);
    });
}

function clearReflectForm() {
    const task = document.getElementById('reflect-task');
    const notes = document.getElementById('reflect-notes');
    if (task) task.value = '';
    if (notes) notes.value = '';
    document.querySelectorAll('.virtue-dot').forEach(function (d) {
        d.classList.remove('active');
    });
    virtueKeys.forEach(function (k) {
        virtueRatings[k] = 0;
    });
}
