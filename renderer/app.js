/* ═══════════════════════════════════════════════════════
   CHRONOS — V6 App Logic
   Monotonic timer · rAF animation · Virtue check-in
   ═══════════════════════════════════════════════════════ */

// ── Phase Enum ────────────────────────────────────────
const Phase = Object.freeze({ IDLE: 'idle', WORK: 'work', ALERT: 'alert', REST: 'rest', REFLECT: 'reflect', COMPLETE: 'complete' });

// ── State ─────────────────────────────────────────────
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
        'durationMs: ' + durationMs.toFixed(0) + '\n' +
        'elapsedMs: ' + elapsedMs.toFixed(0) + '\n' +
        'remainingMs: ' + remainingMs.toFixed(0) + '\n' +
        'progress: ' + progress.toFixed(6) + '\n' +
        'animProgress: ' + animatedProgress.toFixed(6) + '\n' +
        'fps: ' + currentFps.toFixed(1);
}

// ── Philosophy Quotes ─────────────────────────────────
const quotes = [
    { text: '\u201CThe only true wisdom is in knowing you know nothing.\u201D', author: '\u2014 Socrates' },
    { text: '\u201CKnowing yourself is the beginning of all wisdom.\u201D', author: '\u2014 Aristotle' },
    { text: '\u201CIt is not length of life, but depth of life.\u201D', author: '\u2014 Ralph Waldo Emerson' },
    { text: '\u201CWe are what we repeatedly do. Excellence, then, is not an act, but a habit.\u201D', author: '\u2014 Aristotle' },
    { text: '\u201CThe soul becomes dyed with the colour of its thoughts.\u201D', author: '\u2014 Marcus Aurelius' },
    { text: '\u201CNo man is free who is not master of himself.\u201D', author: '\u2014 Epictetus' },
    { text: '\u201CHe who is not a good servant will not be a good master.\u201D', author: '\u2014 Plato' },
    { text: '\u201CWaste no more time arguing about what a good man should be. Be one.\u201D', author: '\u2014 Marcus Aurelius' },
    { text: '\u201CThe happiness of your life depends upon the quality of your thoughts.\u201D', author: '\u2014 Marcus Aurelius' },
    { text: '\u201CTime is the most valuable thing a man can spend.\u201D', author: '\u2014 Theophrastus' },
    { text: '\u201CRest is not idleness.\u201D', author: '\u2014 John Lubbock' },
    { text: '\u201CThe mind is everything. What you think you become.\u201D', author: '\u2014 Buddha' },
    { text: '\u201CHe who has a why to live can bear almost any how.\u201D', author: '\u2014 Nietzsche' },
    { text: '\u201CTo live is to suffer, to survive is to find some meaning in the suffering.\u201D', author: '\u2014 Nietzsche' },
    { text: '\u201CMan is condemned to be free.\u201D', author: '\u2014 Sartre' },
];

const whispers = [
    'Begin with intention.',
    'The present is all we possess.',
    'Discipline is freedom.',
    'Small steps, great journeys.',
    'Be here now.',
    'Today is enough.',
    'Act, don\u2019t wish.',
    'Attention is prayer.',
    'Start before you\u2019re ready.',
    'Less, but better.',
];

function getSessionQuote() {
    if (!sessionQuote) {
        sessionQuote = quotes[Math.floor(Math.random() * quotes.length)];
    }
    return sessionQuote;
}

// ── Audio ─────────────────────────────────────────────
function playChime() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const freqs = [523.25, 659.25, 783.99, 1046.5];
        freqs.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const d = i * 0.3;
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, ctx.currentTime + d);
            gain.gain.setValueAtTime(0, ctx.currentTime + d);
            gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + d + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + d + 2.5);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime + d);
            osc.stop(ctx.currentTime + d + 2.5);
        });
        setTimeout(() => {
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(1046.5, ctx.currentTime);
            gain2.gain.setValueAtTime(0, ctx.currentTime);
            gain2.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.1);
            gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 3);
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.start(ctx.currentTime);
            osc2.stop(ctx.currentTime + 3);
        }, 1200);
    } catch (e) { console.log('Audio not available:', e); }
}

function playRestComplete() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const notes = [783.99, 659.25, 783.99, 1046.5];
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const d = i * 0.25;
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, ctx.currentTime + d);
            gain.gain.setValueAtTime(0, ctx.currentTime + d);
            gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + d + 0.04);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + d + 1.5);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime + d);
            osc.stop(ctx.currentTime + d + 1.5);
        });
    } catch (e) { console.log('Audio not available:', e); }
}

// ── Screen Transitions ────────────────────────────────
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    setTimeout(() => {
        const target = document.getElementById(screenId);
        if (target) target.classList.add('active');
    }, 50);
}

// ── Settings Toggle ───────────────────────────────────
let settingsOpen = false;

function toggleSettings() {
    settingsOpen = !settingsOpen;
    const drawer = document.getElementById('settings-drawer');
    const toggle = document.getElementById('settings-toggle');
    if (drawer) drawer.classList.toggle('open', settingsOpen);
    if (toggle) toggle.classList.toggle('active', settingsOpen);
}

function updateTimePreview() {
    const input = document.getElementById('work-time');
    const preview = document.getElementById('time-preview');
    if (input && preview) {
        const val = parseFloat(input.value) || 25;
        if (val === 1) {
            preview.textContent = '1 minute';
        } else if (val < 1) {
            preview.textContent = (val * 60).toFixed(0) + ' seconds';
        } else {
            preview.textContent = val + ' minutes';
        }
    }
}

// ── Input Controls ────────────────────────────────────
function adjustTime(inputId, delta) {
    const input = document.getElementById(inputId);
    let val = parseFloat(input.value) || 0;
    const max = inputId === 'work-time' ? 120 : 60;
    val = Math.max(0.1, Math.min(max, val + delta));
    val = Math.round(val * 10) / 10; // keep 1 decimal
    input.value = val;
    updateTimePreview();
}

// ── Monotonic Timer Engine ────────────────────────────
function getTimerState() {
    if (phase !== Phase.WORK && phase !== Phase.REST) {
        return { elapsedMs: 0, remainingMs: durationMs, progress: 0 };
    }
    const now = performance.now();
    const paused = pauseStartedAt > 0 ? (now - pauseStartedAt) : 0;
    const elapsed = now - startTimestamp - pausedAccumulatedMs - paused;
    const remaining = Math.max(0, durationMs - elapsed);
    const progress = durationMs > 0 ? Math.min(1, elapsed / durationMs) : 0;
    return { elapsedMs: elapsed, remainingMs: remaining, progress };
}

// ── rAF Animation Loop ───────────────────────────────
function animationLoop(timestamp) {
    if (phase !== Phase.WORK && phase !== Phase.REST) {
        animFrameId = null;
        return;
    }

    // FPS calculation
    if (lastFrameTime > 0) {
        const frameDelta = timestamp - lastFrameTime;
        fpsAccum += frameDelta;
        frameCount++;
        if (fpsAccum > 500) {
            currentFps = (frameCount / fpsAccum) * 1000;
            frameCount = 0;
            fpsAccum = 0;
        }
    }
    lastFrameTime = timestamp;

    const { elapsedMs, remainingMs, progress } = getTimerState();

    // Critically-damped interpolation (~200ms response time)
    const frameDt = lastFrameTime > 0 ? Math.min(timestamp - lastFrameTime, 50) : 16;
    const alpha = 1 - Math.exp(-frameDt / 200);
    if (animatedProgress === 0 && progress > 0) {
        animatedProgress = progress;
    } else {
        animatedProgress += (progress - animatedProgress) * alpha;
    }
    if (Math.abs(progress - animatedProgress) < 0.0005) {
        animatedProgress = progress;
    }

    updateSand(animatedProgress);

    if (phase === Phase.REST) {
        updateRestDisplay(remainingMs);
    }

    updateDebugOverlay(elapsedMs, remainingMs, progress);

    if (remainingMs <= 0) {
        animatedProgress = 1;
        updateSand(1);
        onPhaseComplete();
        return;
    }

    animFrameId = requestAnimationFrame(animationLoop);
}

function startAnimationLoop() {
    lastFrameTime = 0;
    frameCount = 0;
    fpsAccum = 0;
    animatedProgress = 0;
    if (animFrameId) cancelAnimationFrame(animFrameId);
    animFrameId = requestAnimationFrame(animationLoop);
}

function stopAnimationLoop() {
    if (animFrameId) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
    }
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

// ── Particles ─────────────────────────────────────────
function createParticles() {
    const container = document.getElementById('rest-particles');
    if (!container) return;
    container.innerHTML = '';
    for (let i = 0; i < 30; i++) {
        const el = document.createElement('div');
        el.className = 'rest-particle';
        el.style.left = Math.random() * 100 + '%';
        el.style.animationDuration = (8 + Math.random() * 12) + 's';
        el.style.animationDelay = (Math.random() * 10) + 's';
        const size = (1 + Math.random()) + 'px';
        el.style.width = size;
        el.style.height = size;
        el.style.opacity = String(0.08 + Math.random() * 0.14);
        container.appendChild(el);
    }
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

// ── Virtue Check-in ───────────────────────────────────
const virtueKeys = ['arete', 'sophrosyne', 'andreia', 'dikaiosyne', 'phronesis'];
const virtueRatings = {};

function initVirtueSelector() {
    const container = document.getElementById('virtue-selector');
    if (!container) return;
    virtueKeys.forEach(function (k) { virtueRatings[k] = 0; });
    container.querySelectorAll('.virtue-dot').forEach(function (dot) {
        dot.addEventListener('click', function () {
            const virtue = dot.dataset.virtue;
            const value = parseInt(dot.dataset.value);
            virtueRatings[virtue] = value;
            const row = dot.closest('.virtue-row');
            if (row) {
                row.querySelectorAll('.virtue-dot').forEach(function (d) {
                    const v = parseInt(d.dataset.value);
                    d.classList.toggle('active', v <= value);
                });
            }
        });
    });
}

// ── Reflection Functions ──────────────────────────────
async function browseLogDir() {
    const dir = await window.electronAPI.selectLogDir();
    if (dir) {
        const input = document.getElementById('log-dir');
        if (input) input.value = dir;
        logDir = dir;
    }
}

async function saveReflectionAndFinish() {
    const task = document.getElementById('reflect-task') ? document.getElementById('reflect-task').value : '';
    const notes = document.getElementById('reflect-notes') ? document.getElementById('reflect-notes').value : '';

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
}

function skipReflection() {
    clearReflectForm();
    const savedNote = document.getElementById('complete-saved-note');
    if (savedNote) savedNote.textContent = '';
    phase = Phase.COMPLETE;
    showScreen('complete-screen');
}

function clearReflectForm() {
    const task = document.getElementById('reflect-task');
    const notes = document.getElementById('reflect-notes');
    if (task) task.value = '';
    if (notes) notes.value = '';
    document.querySelectorAll('.virtue-dot').forEach(function (d) { d.classList.remove('active'); });
    virtueKeys.forEach(function (k) { virtueRatings[k] = 0; });
}

// ── Wisdom Whisper ────────────────────────────────────
function showWisdomWhisper() {
    const el = document.getElementById('wisdom-whisper');
    if (!el) return;
    const whisper = whispers[Math.floor(Math.random() * whispers.length)];
    el.textContent = whisper;
    el.style.opacity = '0';
    setTimeout(function () { el.style.opacity = '1'; }, 100);
}

// ── Initialize ────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {    // Initialize hourglass components — single source for all screens
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
});
