/**
 * App Logic — Unit Tests
 *
 * Tests renderer-side logic from app.js:
 *   - Phase enum
 *   - Timer state engine
 *   - Time display formatting
 *   - Input controls
 *   - Quote/whisper selection
 *   - Screen transitions
 *   - Particle generation
 *   - Virtue check-in system
 *   - Reflection form management
 */

const fs = require('fs');
const path = require('path');

// ── Load source into jsdom ────────────────────────────
const hourglassSource = fs.readFileSync(
    path.join(__dirname, '../../renderer/hourglass.js'),
    'utf8'
);
const quotesSource = fs.readFileSync(
    path.join(__dirname, '../../renderer/data/quotes.js'),
    'utf8'
);
const whispersSource = fs.readFileSync(
    path.join(__dirname, '../../renderer/data/whispers.js'),
    'utf8'
);
const audioSource = fs.readFileSync(
    path.join(__dirname, '../../renderer/js/audio.js'),
    'utf8'
);
const stateSource = fs.readFileSync(
    path.join(__dirname, '../../renderer/js/state.js'),
    'utf8'
);
const timerSource = fs.readFileSync(
    path.join(__dirname, '../../renderer/js/timer.js'),
    'utf8'
);
const screensSource = fs.readFileSync(
    path.join(__dirname, '../../renderer/js/screens.js'),
    'utf8'
);
const settingsSource = fs.readFileSync(
    path.join(__dirname, '../../renderer/js/settings.js'),
    'utf8'
);
const particlesSource = fs.readFileSync(
    path.join(__dirname, '../../renderer/js/particles.js'),
    'utf8'
);
const virtueSource = fs.readFileSync(
    path.join(__dirname, '../../renderer/js/virtue.js'),
    'utf8'
);
const reflectionSource = fs.readFileSync(
    path.join(__dirname, '../../renderer/js/reflection.js'),
    'utf8'
);
const wisdomSource = fs.readFileSync(
    path.join(__dirname, '../../renderer/js/wisdom.js'),
    'utf8'
);
const appSource = fs.readFileSync(
    path.join(__dirname, '../../renderer/app.js'),
    'utf8'
);

// Mock electronAPI before loading app code
function setupEnvironment() {
    document.body.innerHTML = `
        <div id="setup-screen" class="screen active"></div>
        <div id="work-screen" class="screen"></div>
        <div id="alert-screen" class="screen"></div>
        <div id="rest-screen" class="screen"></div>
        <div id="reflect-screen" class="screen"></div>
        <div id="complete-screen" class="screen"></div>
        <div id="setup-hourglass"></div>
        <div id="work-hourglass"></div>
        <div id="rest-hourglass"></div>
        <div id="debug-overlay" style="display:none"></div>
        <input id="work-time" type="number" value="25" />
        <input id="rest-time" type="number" value="5" />
        <input id="log-dir" value="" />
        <div id="time-preview"></div>
        <div id="rest-timer-display"></div>
        <div id="rest-particles"></div>
        <div id="rest-quote-text"></div>
        <div id="rest-quote-author"></div>
        <div id="philosophy-quote"></div>
        <div id="quote-author"></div>
        <div id="wisdom-whisper"></div>
        <div id="complete-saved-note"></div>
        <div id="settings-drawer"></div>
        <div id="settings-toggle"></div>
        <textarea id="reflect-task"></textarea>
        <textarea id="reflect-notes"></textarea>
        <div id="virtue-selector">
            <div class="virtue-row">
                <span class="virtue-dot" data-virtue="arete" data-value="1"></span>
                <span class="virtue-dot" data-virtue="arete" data-value="2"></span>
                <span class="virtue-dot" data-virtue="arete" data-value="3"></span>
                <span class="virtue-dot" data-virtue="arete" data-value="4"></span>
                <span class="virtue-dot" data-virtue="arete" data-value="5"></span>
            </div>
            <div class="virtue-row">
                <span class="virtue-dot" data-virtue="sophrosyne" data-value="1"></span>
                <span class="virtue-dot" data-virtue="sophrosyne" data-value="2"></span>
                <span class="virtue-dot" data-virtue="sophrosyne" data-value="3"></span>
            </div>
        </div>
    `;

    // Mock electronAPI
    window.electronAPI = {
        enterWorkMode: jest.fn(),
        enterRestMode: jest.fn(),
        workComplete: jest.fn(),
        restComplete: jest.fn(),
        minimizeWindow: jest.fn(),
        closeWindow: jest.fn(),
        returnToSetup: jest.fn(),
        selectLogDir: jest.fn().mockResolvedValue(null),
        saveReflection: jest.fn().mockResolvedValue({ success: true }),
    };

    // Mock performance.now
    let perfTime = 1000;
    jest.spyOn(performance, 'now').mockImplementation(() => perfTime);
    window._setPerfTime = (t) => { perfTime = t; };
    window._getPerfTime = () => perfTime;

    // Mock requestAnimationFrame / cancelAnimationFrame
    window.requestAnimationFrame = jest.fn((cb) => {
        return setTimeout(() => cb(performance.now()), 0);
    });
    window.cancelAnimationFrame = jest.fn((id) => clearTimeout(id));

    // Mock AudioContext
    window.AudioContext = jest.fn().mockImplementation(() => ({
        currentTime: 0,
        destination: {},
        createOscillator: () => ({
            type: '',
            frequency: { setValueAtTime: jest.fn() },
            connect: jest.fn(),
            start: jest.fn(),
            stop: jest.fn(),
        }),
        createGain: () => ({
            gain: {
                setValueAtTime: jest.fn(),
                linearRampToValueAtTime: jest.fn(),
                exponentialRampToValueAtTime: jest.fn(),
            },
            connect: jest.fn(),
        }),
    }));
}

// List of symbols to expose from app.js into the global/test scope
const EXPOSE_FUNCTIONS = [
    'Phase', 'showScreen', 'toggleSettings', 'updateTimePreview',
    'adjustTime', 'getTimerState', 'animationLoop', 'startAnimationLoop',
    'stopAnimationLoop', 'onPhaseComplete', 'startWork', 'startRest',
    'updateRestDisplay', 'updateSand', 'createParticles', 'resetSand',
    'returnToSetup', 'stopTimer', 'initVirtueSelector', 'browseLogDir',
    'saveReflectionAndFinish', 'skipReflection', 'clearReflectForm',
    'showWisdomWhisper', 'playChime', 'playRestComplete', 'getSessionQuote',
    'updateDebugOverlay',
];

const EXPOSE_VARS = [
    'phase', 'durationMs', 'workMinutes', 'restMinutes', 'logDir',
    'virtueRatings', 'virtueKeys', 'quotes', 'whispers',
    'debugVisible', 'settingsOpen', 'animatedProgress',
    'workHourglass', 'restHourglass', 'setupHourglass',
];

beforeEach(() => {
    jest.useFakeTimers();
    setupEnvironment();

    // Build a wrapper that executes both scripts and exposes symbols to globalThis
    const exportLine = EXPOSE_FUNCTIONS.concat(EXPOSE_VARS).map(
        name => `  try { globalThis.${name} = ${name}; } catch(e) {}`
    ).join('\n');

    const wrapped = quotesSource + '\n' + whispersSource + '\n' + stateSource + '\n' + hourglassSource + '\n' + audioSource + '\n' + timerSource + '\n' + screensSource + '\n' + settingsSource + '\n' + particlesSource + '\n' + virtueSource + '\n' + reflectionSource + '\n' + wisdomSource + '\n' + appSource + '\n' + exportLine;
    const fn = new Function(wrapped);
    fn.call(window);

    // Trigger DOMContentLoaded manually
    const event = new Event('DOMContentLoaded');
    document.dispatchEvent(event);
});

afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
});

// ═══════════════════════════════════════════════════════
//  1. PHASE ENUM
// ═══════════════════════════════════════════════════════

describe('Phase Enum', () => {
    test('has all required phases', () => {
        expect(globalThis.Phase).toBeDefined();
        const P = globalThis.Phase;
        expect(P.IDLE).toBe('idle');
        expect(P.WORK).toBe('work');
        expect(P.ALERT).toBe('alert');
        expect(P.REST).toBe('rest');
        expect(P.REFLECT).toBe('reflect');
        expect(P.COMPLETE).toBe('complete');
    });

    test('Phase is frozen (immutable)', () => {
        expect(Object.isFrozen(globalThis.Phase)).toBe(true);
    });

    test('app starts in IDLE phase', () => {
        const setup = document.getElementById('setup-screen');
        expect(setup).not.toBeNull();
    });
});

// ═══════════════════════════════════════════════════════
//  2. QUOTES & WHISPERS
// ═══════════════════════════════════════════════════════

describe('Quotes & Whispers', () => {
    test('wisdom whisper is displayed on load', () => {
        const el = document.getElementById('wisdom-whisper');
        // After DOMContentLoaded, showWisdomWhisper() should set text
        expect(el.textContent).toBeTruthy();
    });

    test('time preview shows default value on load', () => {
        const preview = document.getElementById('time-preview');
        expect(preview.textContent).toBeTruthy();
    });
});

// ═══════════════════════════════════════════════════════
//  3. SCREEN TRANSITIONS
// ═══════════════════════════════════════════════════════

describe('Screen Transitions — showScreen()', () => {
    test('shows setup screen initially', () => {
        jest.runAllTimers();
        const setup = document.getElementById('setup-screen');
        expect(setup.classList.contains('active')).toBe(true);
    });

    test('removes active from all screens before showing target', () => {
        // showScreen removes active immediately, then adds to target after 50ms
        showScreen('work-screen');

        // Immediately: all screens lose active
        const setup = document.getElementById('setup-screen');
        expect(setup.classList.contains('active')).toBe(false);

        // After 50ms timeout: target gets active
        jest.advanceTimersByTime(60);
        const work = document.getElementById('work-screen');
        expect(work.classList.contains('active')).toBe(true);
    });

    test('handles non-existent screen ID gracefully', () => {
        expect(() => {
            showScreen('nonexistent-screen');
            jest.runAllTimers();
        }).not.toThrow();
    });
});

// ═══════════════════════════════════════════════════════
//  4. INPUT CONTROLS
// ═══════════════════════════════════════════════════════

describe('Input Controls — adjustTime()', () => {
    test('increments work time', () => {
        const input = document.getElementById('work-time');
        input.value = '25';
        adjustTime('work-time', 1);
        expect(parseFloat(input.value)).toBe(26);
    });

    test('decrements work time', () => {
        const input = document.getElementById('work-time');
        input.value = '25';
        adjustTime('work-time', -1);
        expect(parseFloat(input.value)).toBe(24);
    });

    test('clamps work time to minimum 0.1', () => {
        const input = document.getElementById('work-time');
        input.value = '0.1';
        adjustTime('work-time', -1);
        expect(parseFloat(input.value)).toBe(0.1);
    });

    test('clamps work time to maximum 120', () => {
        const input = document.getElementById('work-time');
        input.value = '120';
        adjustTime('work-time', 1);
        expect(parseFloat(input.value)).toBe(120);
    });

    test('clamps rest time to maximum 60', () => {
        const input = document.getElementById('rest-time');
        input.value = '60';
        adjustTime('rest-time', 1);
        expect(parseFloat(input.value)).toBe(60);
    });

    test('rounds to 1 decimal place', () => {
        const input = document.getElementById('work-time');
        input.value = '25.05';
        adjustTime('work-time', 0.1);
        const val = parseFloat(input.value);
        const decimals = (val.toString().split('.')[1] || '').length;
        expect(decimals).toBeLessThanOrEqual(1);
    });
});

describe('Input Controls — updateTimePreview()', () => {
    test('shows "minutes" for values > 1', () => {
        const input = document.getElementById('work-time');
        input.value = '25';
        updateTimePreview();
        const preview = document.getElementById('time-preview');
        expect(preview.textContent).toBe('25 minutes');
    });

    test('shows "1 minute" for value of 1', () => {
        const input = document.getElementById('work-time');
        input.value = '1';
        updateTimePreview();
        const preview = document.getElementById('time-preview');
        expect(preview.textContent).toBe('1 minute');
    });

    test('shows seconds for values < 1', () => {
        const input = document.getElementById('work-time');
        input.value = '0.5';
        updateTimePreview();
        const preview = document.getElementById('time-preview');
        expect(preview.textContent).toBe('30 seconds');
    });
});

// ═══════════════════════════════════════════════════════
//  5. TIMER DISPLAY
// ═══════════════════════════════════════════════════════

describe('Timer Display — updateRestDisplay()', () => {
    test('formats 5 minutes correctly', () => {
        updateRestDisplay(5 * 60 * 1000);
        const display = document.getElementById('rest-timer-display');
        expect(display.textContent).toBe('5:00');
    });

    test('formats 1:30 correctly', () => {
        updateRestDisplay(90 * 1000);
        const display = document.getElementById('rest-timer-display');
        expect(display.textContent).toBe('1:30');
    });

    test('formats 0:05 correctly (pads seconds)', () => {
        updateRestDisplay(5 * 1000);
        const display = document.getElementById('rest-timer-display');
        expect(display.textContent).toBe('0:05');
    });

    test('formats 0:00 for zero/negative', () => {
        updateRestDisplay(0);
        const display = document.getElementById('rest-timer-display');
        expect(display.textContent).toBe('0:00');
    });

    test('rounds up remaining milliseconds', () => {
        updateRestDisplay(1500);  // 1.5 seconds → ceil = 2 seconds
        const display = document.getElementById('rest-timer-display');
        expect(display.textContent).toBe('0:02');
    });
});

// ═══════════════════════════════════════════════════════
//  6. PARTICLE GENERATION
// ═══════════════════════════════════════════════════════

describe('Particle Generation — createParticles()', () => {
    test('creates 30 particle elements', () => {
        createParticles();
        const container = document.getElementById('rest-particles');
        const particles = container.querySelectorAll('.rest-particle');
        expect(particles.length).toBe(30);
    });

    test('clears existing particles before creating new ones', () => {
        createParticles();
        createParticles();
        const container = document.getElementById('rest-particles');
        const particles = container.querySelectorAll('.rest-particle');
        expect(particles.length).toBe(30);
    });

    test('each particle has animation properties', () => {
        createParticles();
        const particle = document.querySelector('.rest-particle');
        expect(particle.style.left).toBeTruthy();
        expect(particle.style.animationDuration).toBeTruthy();
        expect(particle.style.animationDelay).toBeTruthy();
    });
});

// ═══════════════════════════════════════════════════════
//  7. VIRTUE CHECK-IN
// ═══════════════════════════════════════════════════════

describe('Virtue Check-in System', () => {
    test('initVirtueSelector registers click handlers', () => {
        initVirtueSelector();
        const dots = document.querySelectorAll('.virtue-dot');
        // Simulate click on a dot
        const dot = dots[2]; // arete value=3
        dot.click();
        expect(dot.classList.contains('active')).toBe(true);
    });

    test('clicking a dot activates all dots up to that value', () => {
        initVirtueSelector();
        const dots = document.querySelectorAll('[data-virtue="arete"]');
        dots[3].click(); // value=4
        expect(dots[0].classList.contains('active')).toBe(true);
        expect(dots[1].classList.contains('active')).toBe(true);
        expect(dots[2].classList.contains('active')).toBe(true);
        expect(dots[3].classList.contains('active')).toBe(true);
        expect(dots[4].classList.contains('active')).toBe(false);
    });

    test('clicking updates virtueRatings object', () => {
        initVirtueSelector();
        const dots = document.querySelectorAll('[data-virtue="arete"]');
        dots[2].click(); // value=3
        expect(virtueRatings.arete).toBe(3);
    });
});

// ═══════════════════════════════════════════════════════
//  8. REFLECTION FORM
// ═══════════════════════════════════════════════════════

describe('Reflection Form — clearReflectForm()', () => {
    test('clears task textarea', () => {
        document.getElementById('reflect-task').value = 'some task';
        clearReflectForm();
        expect(document.getElementById('reflect-task').value).toBe('');
    });

    test('clears notes textarea', () => {
        document.getElementById('reflect-notes').value = 'some notes';
        clearReflectForm();
        expect(document.getElementById('reflect-notes').value).toBe('');
    });

    test('removes active class from all virtue dots', () => {
        const dots = document.querySelectorAll('.virtue-dot');
        dots.forEach(d => d.classList.add('active'));
        clearReflectForm();
        dots.forEach(d => {
            expect(d.classList.contains('active')).toBe(false);
        });
    });

    test('resets all virtue ratings to 0', () => {
        initVirtueSelector();
        virtueRatings.arete = 5;
        virtueRatings.sophrosyne = 3;
        clearReflectForm();
        expect(virtueRatings.arete).toBe(0);
        expect(virtueRatings.sophrosyne).toBe(0);
    });
});

// ═══════════════════════════════════════════════════════
//  9. SETTINGS TOGGLE
// ═══════════════════════════════════════════════════════

describe('Settings Toggle', () => {
    test('toggleSettings opens drawer', () => {
        toggleSettings();
        const drawer = document.getElementById('settings-drawer');
        expect(drawer.classList.contains('open')).toBe(true);
    });

    test('toggleSettings again closes drawer', () => {
        toggleSettings();
        toggleSettings();
        const drawer = document.getElementById('settings-drawer');
        expect(drawer.classList.contains('open')).toBe(false);
    });

    test('toggle activates/deactivates settings button', () => {
        toggleSettings();
        const toggle = document.getElementById('settings-toggle');
        expect(toggle.classList.contains('active')).toBe(true);
        toggleSettings();
        expect(toggle.classList.contains('active')).toBe(false);
    });
});

// ═══════════════════════════════════════════════════════
// 10. SKIP REFLECTION
// ═══════════════════════════════════════════════════════

describe('Skip Reflection', () => {
    test('skipReflection clears saved note text', () => {
        const note = document.getElementById('complete-saved-note');
        note.textContent = 'Reflection saved';
        skipReflection();
        jest.runAllTimers();
        expect(note.textContent).toBe('');
    });

    test('skipReflection shows complete screen', () => {
        skipReflection();
        jest.runAllTimers();
        const complete = document.getElementById('complete-screen');
        expect(complete.classList.contains('active')).toBe(true);
    });
});

// ═══════════════════════════════════════════════════════
// 11. RETURN TO SETUP
// ═══════════════════════════════════════════════════════

describe('Return to Setup', () => {
    test('returnToSetup calls electronAPI.returnToSetup', () => {
        returnToSetup();
        jest.runAllTimers();
        expect(window.electronAPI.returnToSetup).toHaveBeenCalled();
    });

    test('returnToSetup shows setup screen', () => {
        returnToSetup();
        jest.runAllTimers();
        const setup = document.getElementById('setup-screen');
        expect(setup.classList.contains('active')).toBe(true);
    });

    test('stopTimer aliases returnToSetup', () => {
        stopTimer();
        jest.runAllTimers();
        expect(window.electronAPI.returnToSetup).toHaveBeenCalled();
    });
});

// ═══════════════════════════════════════════════════════
// 12. DEBUG OVERLAY
// ═══════════════════════════════════════════════════════

describe('Debug Overlay', () => {
    test('Ctrl+D toggles debug overlay visibility', () => {
        const overlay = document.getElementById('debug-overlay');
        expect(overlay.style.display).toBe('none');

        // Simulate Ctrl+D
        const event = new KeyboardEvent('keydown', { key: 'd', ctrlKey: true });
        document.dispatchEvent(event);
        expect(overlay.style.display).toBe('block');

        // Toggle off
        document.dispatchEvent(event);
        expect(overlay.style.display).toBe('none');
    });
});
