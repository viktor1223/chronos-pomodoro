/* ═══════════════════════════════════════════════════════
   CHRONOS — V6 App Entry Point
   Wiring, phase handlers, sand delegation, initialization.
   All modules loaded via separate <script> tags before this file.
   ═══════════════════════════════════════════════════════ */

function getSessionQuote() {
    if (!sessionQuote) {
        sessionQuote = quotes[Math.floor(Math.random() * quotes.length)];
    }
    return sessionQuote;
}

// ── Phase Complete Handler ────────────────────────────
function onPhaseComplete() {
    stopAnimationLoop();
    if (phase === Phase.WORK) {
        phase = Phase.ALERT;
        playChime();
        const quote = getSessionQuote();
        const qEl = document.getElementById('philosophy-quote');
        const aEl = document.getElementById('quote-author');
        if (qEl) qEl.textContent = quote.text;
        if (aEl) aEl.textContent = quote.author;
        window.electronAPI.workComplete();
        showScreen('alert-screen');
    } else if (phase === Phase.REST) {
        phase = Phase.REFLECT;
        playRestComplete();
        showScreen('reflect-screen');
        setTimeout(() => window.electronAPI.restComplete(), 500);
    }
}

// ── Start Work ────────────────────────────────────────
function startWork() {
    const workInput = document.getElementById('work-time');
    const restInput = document.getElementById('rest-time');
    const logDirInput = document.getElementById('log-dir');

    workMinutes = Math.max(0.1, parseFloat(workInput.value) || 25);
    restMinutes = Math.max(0.1, parseFloat(restInput.value) || 5);
    logDir = logDirInput ? logDirInput.value.trim() : '';
    sessionStartTime = new Date();
    sessionQuote = null;
    document.body.classList.remove('paused');

    durationMs = workMinutes * 60 * 1000;
    startTimestamp = performance.now();
    pausedAccumulatedMs = 0;
    pauseStartedAt = 0;
    phase = Phase.WORK;

    resetSand();
    window.electronAPI.enterWorkMode();
    showScreen('work-screen');
    startAnimationLoop();
}

// ── Start Rest ────────────────────────────────────────
function startRest() {
    durationMs = restMinutes * 60 * 1000;
    startTimestamp = performance.now();
    pausedAccumulatedMs = 0;
    pauseStartedAt = 0;
    phase = Phase.REST;
    document.body.classList.remove('paused');

    const quote = getSessionQuote();
    const qEl = document.getElementById('rest-quote-text');
    const aEl = document.getElementById('rest-quote-author');
    if (qEl) qEl.textContent = quote.text;
    if (aEl) aEl.textContent = quote.author;

    window.electronAPI.enterRestMode();
    showScreen('rest-screen');
    createParticles();
    resetSand();
    startAnimationLoop();
}

// ── Timer Display ─────────────────────────────────────
function updateRestDisplay(remainingMs) {
    const totalSec = Math.ceil(remainingMs / 1000);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    const display = document.getElementById('rest-timer-display');
    if (display) {
        display.textContent = mins + ':' + secs.toString().padStart(2, '0');
    }
}

// ── Sand Animation (delegated to Hourglass component) ─
function updateSand(progress) {
    if (phase === Phase.WORK && workHourglass) workHourglass.updateSand(progress);
    if (phase === Phase.REST && restHourglass) restHourglass.updateSand(progress);
}

// ── Sand Reset (delegated to Hourglass component) ─────
function resetSand() {
    if (workHourglass) workHourglass.resetSand();
    if (restHourglass) restHourglass.resetSand();
}

// ── Return to Setup ───────────────────────────────────
function returnToSetup() {
    stopAnimationLoop();
    resetSand();
    phase = Phase.IDLE;
    window.electronAPI.returnToSetup();
    showScreen('setup-screen');
}

function stopTimer() {
    returnToSetup();
}

// ── Pause / Resume ─────────────────────────────────────
function togglePause() {
    if (phase !== Phase.WORK && phase !== Phase.REST) return;
    if (pauseStartedAt > 0) {
        resumeTimer();
    } else {
        pauseTimer();
    }
}

function pauseTimer() {
    pauseStartedAt = performance.now();
    stopAnimationLoop();
    // Visual feedback
    document.body.classList.add('paused');
    if (phase === Phase.WORK && workHourglass && workHourglass.sandStream) {
        workHourglass.sandStream.style.opacity = '0';
    }
    if (phase === Phase.REST && restHourglass && restHourglass.sandStream) {
        restHourglass.sandStream.style.opacity = '0';
    }
}

function resumeTimer() {
    if (pauseStartedAt > 0) {
        pausedAccumulatedMs += performance.now() - pauseStartedAt;
        pauseStartedAt = 0;
    }
    document.body.classList.remove('paused');
    if (phase === Phase.WORK && workHourglass && workHourglass.sandStream) {
        workHourglass.sandStream.style.opacity = '0.4';
    }
    if (phase === Phase.REST && restHourglass && restHourglass.sandStream) {
        restHourglass.sandStream.style.opacity = '0.4';
    }
    startAnimationLoop();
}

// ── Initialize ────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
    // Initialize hourglass components — single source for all screens
    setupHourglass = new Hourglass('setup-hourglass', { size: 'sm' });
    workHourglass = new Hourglass('work-hourglass', { size: 'md', flow: true, glow: true });
    restHourglass = new Hourglass('rest-hourglass', { size: 'lg', flow: true });
    showScreen('setup-screen');
    resetSand();
    showWisdomWhisper();
    updateTimePreview();
    initVirtueSelector();

    const workInput = document.getElementById('work-time');
    if (workInput) {
        workInput.addEventListener('input', updateTimePreview);
    }

    // Pause/resume — Space key
    document.addEventListener('keydown', function (e) {
        if (e.code === 'Space' && (phase === Phase.WORK || phase === Phase.REST)) {
            e.preventDefault();
            togglePause();
        }
    });

    // Pause/resume — click hourglass
    var workHg = document.getElementById('work-hourglass');
    if (workHg) workHg.addEventListener('click', togglePause);
    var restHg = document.getElementById('rest-hourglass');
    if (restHg) restHg.addEventListener('click', togglePause);
});
