/* ═══════════════════════════════════════════════════════
   State — Single Source of Truth
   Phase enum and mutable application state.
   ═══════════════════════════════════════════════════════ */

// ── Phase Enum ────────────────────────────────────────
const Phase = Object.freeze({ IDLE: 'idle', WORK: 'work', ALERT: 'alert', REST: 'rest', REFLECT: 'reflect', COMPLETE: 'complete' });

// ── Mutable State ─────────────────────────────────────
let phase = Phase.IDLE;
let durationMs = 0;
let startTimestamp = 0;
let pausedAccumulatedMs = 0;
let pauseStartedAt = 0;
let animFrameId = null;

// Smooth animation state
let animatedProgress = 0;
let lastFrameTime = 0;
let frameCount = 0;
let fpsAccum = 0;
let currentFps = 60;

// Settings
let workMinutes = 25;
let restMinutes = 5;
let logDir = '';

// Session tracking
let sessionStartTime = null;
let sessionQuote = null;

// Hourglass instances (initialized in DOMContentLoaded)
let setupHourglass, workHourglass, restHourglass;

// ── Debug Overlay ─────────────────────────────────────
let debugVisible = false;

document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        e.preventDefault();
        debugVisible = !debugVisible;
        const overlay = document.getElementById('debug-overlay');
        if (overlay) overlay.style.display = debugVisible ? 'block' : 'none';
    }
});

function updateDebugOverlay(elapsedMs, remainingMs, progress) {
    if (!debugVisible) return;
    const overlay = document.getElementById('debug-overlay');
    if (!overlay) return;
    overlay.textContent =
        'phase: ' + phase + '\n' +
        'paused: ' + (pauseStartedAt > 0) + '\n' +
        'durationMs: ' + durationMs.toFixed(0) + '\n' +
        'elapsedMs: ' + elapsedMs.toFixed(0) + '\n' +
        'remainingMs: ' + remainingMs.toFixed(0) + '\n' +
        'progress: ' + progress.toFixed(6) + '\n' +
        'animProgress: ' + animatedProgress.toFixed(6) + '\n' +
        'fps: ' + currentFps.toFixed(1);
}
