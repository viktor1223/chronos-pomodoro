# Chronos Pomodoro Timer

A macOS desktop Pomodoro timer built with Electron. Chronos pairs the Pomodoro technique with Greek philosophy — an animated SVG hourglass tracks your session while Stoic quotes and virtue check-ins encourage deliberate work.

## Features

* **Animated SVG hourglass** — Bezier-curved sand surfaces with concave funneling (top bulb) and convex mounding (bottom bulb), driven by a monotonic timer and critically-damped interpolation at 60 fps
* **Six-screen workflow** — Setup → Work → Alert → Rest → Reflect → Complete, each with dedicated window sizing and macOS-native transitions
* **Floating work widget** — 140×180 px always-on-top companion with a fully transparent background; the hourglass floats directly on your desktop with no visible window chrome
* **Fullscreen rest mode** — Immersive contemplation screen with ambient gold particles, philosophy quotes, and countdown timer
* **Reflective journaling** — Post-session form with free-text task notes and a five-virtue Likert scale (Areté, Sophrosyne, Andreia, Dikaiosyne, Phronesis)
* **Dual-format logging** — Sessions are saved as structured JSONL and human-readable Markdown to a user-specified directory
* **Pause and resume** — Press `Space` or click the hourglass to pause either work or rest sessions; the sand stream fades, a pulsing pause indicator appears, and paused time is excluded from the countdown
* **Liquid glass aesthetic** — Apple-inspired translucent surfaces with backdrop blur, vibrancy, and gold-on-dark typography using Cormorant Garamond
* **Web Audio synthesis** — Chime and rest-complete sounds generated programmatically; no audio files required
* **Debug overlay** — Press `Ctrl+D` / `Cmd+D` to display real-time phase, elapsed time, progress, and FPS

## Screenshots

> Screenshots can be added to a `docs/screenshots/` directory and referenced here.

## Quick start

### Prerequisites

* **Node.js** v18 or later
* **npm** v9 or later
* **macOS** — Chronos uses native vibrancy and visual effects that require macOS

### Install and run

```bash
git clone https://github.com/viktor1223/chronos-pomodoro.git
cd chronos-pomodoro
npm install
npm start
```

### Run tests

```bash
npm test
```

For development with DevTools:

```bash
npm run dev
```

Tests run across two Jest projects (renderer via jsdom, main via Node) with HTML reporting and Istanbul coverage. The report is written to `test-report/index.html`.

```bash
npm run test:report   # run tests and print report paths
```

### Build as a native macOS app

```bash
npm run build         # produces dist/mac-arm64/Chronos.app and a DMG installer
npm run build:dir     # produces only the .app (faster, skips DMG)
```

After building, drag `Chronos.app` from `dist/mac-arm64/` into `/Applications` (or open the DMG and drag from there). The app appears in your Dock with a custom hourglass icon.

## Architecture

Chronos follows a modular Electron architecture with clear separation between main process, preload bridge, and renderer.

### Directory structure

```text
chronos-pomodoro/
├── build/                       # App packaging assets
│   ├── icon.svg                 # Source hourglass icon (1024×1024 SVG)
│   └── icon.icns                # macOS app icon (all required sizes)
├── main/                        # Main process (Node.js)
│   ├── index.js                 # App lifecycle: whenReady, quit, activate
│   ├── window-manager.js        # Window state machine: sizes, positions, modes
│   ├── ipc-handlers.js          # IPC routing layer (ipcMain.on / .handle)
│   └── reflection-io.js         # JSONL + Markdown file I/O for journals
├── preload.js                   # contextBridge — 9 IPC methods exposed to renderer
├── renderer/                    # Renderer process (browser context)
│   ├── index.html               # Shell with six screen sections
│   ├── app.js                   # Wiring entry point + pause/resume logic
│   ├── hourglass.js             # Reusable SVG hourglass component class
│   ├── data/                    # Pure data modules
│   │   ├── quotes.js            # 15 philosophy quotes
│   │   └── whispers.js          # 10 wisdom whisper strings
│   ├── js/                      # Logic modules
│   │   ├── state.js             # Phase enum, mutable state, debug overlay
│   │   ├── timer.js             # Monotonic timer engine + rAF animation loop
│   │   ├── audio.js             # Web Audio synthesis (chime, rest-complete)
│   │   ├── screens.js           # Screen transition orchestration
│   │   ├── settings.js          # Settings drawer toggle and time inputs
│   │   ├── particles.js         # Ambient floating particles for rest screen
│   │   ├── virtue.js            # Virtue check-in widget
│   │   ├── reflection.js        # Reflection form handling
│   │   └── wisdom.js            # Wisdom whisper display
│   └── styles/                  # Per-screen and component CSS
│       ├── base.css             # Variables, reset, body, animations
│       ├── layout.css           # Window controls, drag regions
│       ├── controls.css         # Buttons, input wrappers, spin buttons
│       ├── setup.css            # Setup screen, settings drawer, title, logo
│       ├── work.css             # Work screen, hourglass glow
│       ├── alert.css            # Alert screen, columns, laurel wreath, quotes
│       ├── rest.css             # Rest screen, particles, timer, quote
│       ├── reflect.css          # Reflect screen, form, virtue selector
│       ├── complete.css         # Complete screen, laurel, title
│       └── components/
│           ├── hourglass.css    # Size variants (sm/md/lg), breathe animation
│           └── debug.css        # Debug overlay styling
├── tests/                       # Jest test suites
│   ├── renderer/                # jsdom environment
│   │   ├── app-logic.test.js    # 51 tests — core app logic + pause/resume
│   │   └── hourglass.test.js    # 45 tests — hourglass component
│   └── main/                    # Node environment
│       ├── main-process.test.js # 40 tests — main process modules
│       └── preload.test.js      # 11 tests — preload bridge
├── jest.config.js               # Multi-project Jest configuration
└── package.json
```

### Process model

```text
┌──────────────────────────────────────────────────────────┐
│  Main Process (Node.js)                                  │
│                                                          │
│  index.js ──► window-manager.js ──► BrowserWindow        │
│                  │                                       │
│  ipc-handlers.js ◄──── ipcMain.on / .handle ────►       │
│                  │                                       │
│  reflection-io.js ──► fs (JSONL + Markdown)              │
└──────────────────┬───────────────────────────────────────┘
                   │ contextBridge (preload.js)
                   │ 9 methods: enterWorkMode, enterRestMode,
                   │ workComplete, restComplete, minimizeWindow,
                   │ closeWindow, returnToSetup, selectLogDir,
                   │ saveReflection
┌──────────────────┴───────────────────────────────────────┐
│  Renderer Process (Chromium)                             │
│                                                          │
│  state.js ──► Phase enum + shared mutable state          │
│  timer.js ──► Monotonic timer + rAF loop                 │
│  hourglass.js ──► SVG component (3 instances)            │
│  app.js ──► Wiring: phases, sand, pause/resume           │
│  screens / settings / particles / virtue / reflection    │
└──────────────────────────────────────────────────────────┘
```

### Window state machine

Chronos manages a single `BrowserWindow` that transitions between modes:

| Screen   | Size        | Position              | Behavior                      |
|----------|-------------|-----------------------|-------------------------------|
| Setup    | 320 × 460   | Bottom-right          | Draggable, resizable          |
| Work     | 140 × 180   | Bottom-right          | Always-on-top, transparent, no shadow |
| Alert    | Fullscreen   | Centered              | Screen-saver level, focused   |
| Rest     | Fullscreen   | All workspaces        | Immersive countdown           |
| Reflect  | 560 × 700   | Centered              | Resizable journal form        |
| Complete | 560 × 700   | Centered              | Return-to-setup prompt        |

## Key components

### Hourglass (`renderer/hourglass.js`)

A reusable SVG component class instantiated three times:

```javascript
new Hourglass('setup-hourglass', { size: 'sm' });                    // decorative
new Hourglass('work-hourglass',  { size: 'md', flow: true, glow: true }); // work timer
new Hourglass('rest-hourglass',  { size: 'lg', flow: true });        // rest timer
```

**Sand geometry:** The hourglass uses an 80×120 SVG viewBox with two clip-path regions traced by glass bulb curves. Sand surfaces are quadratic Bezier paths:

* **Top bulb** — Concave funnel. As `progress` increases from 0 to 1, the center drops faster than the edges, creating a crater. The curve depth ramps with `min(p * 2.5, 1) * min((1 - p) * 4, 1)`.
* **Bottom bulb** — Convex mound. Sand accumulates in the center first, with the dome flattening as the bulb fills. Curve depth follows `min(p * 4, 1) * min((1 - p) * 2.5, 1)`.

A dashed-line sand stream animates between the bulbs via SVG `<animate>`.

### Timer engine (`renderer/js/timer.js`)

The timer uses `performance.now()` for monotonic timing (immune to wall-clock drift). The animation loop:

1. Computes `frameDt` from the previous `requestAnimationFrame` timestamp
2. Calculates raw `progress` (0 → 1) from elapsed time, excluding `pausedAccumulatedMs`
3. Applies critically-damped exponential interpolation with a ~200 ms response time: `alpha = 1 - exp(-frameDt / 200)`
4. Feeds `animatedProgress` into the hourglass `updateSand()` method
5. Updates the rest-screen countdown display and debug overlay

### Pause / resume (`renderer/app.js`)

Pause is triggered by pressing `Space` or clicking the hourglass during a work or rest session. The implementation:

* `pauseTimer()` — records `pauseStartedAt`, stops the animation loop, adds a `paused` class to `document.body`, and hides the sand stream
* `resumeTimer()` — accumulates paused duration into `pausedAccumulatedMs`, restarts the animation loop, removes the `paused` class, and restores the sand stream
* `getTimerState()` subtracts both committed (`pausedAccumulatedMs`) and in-flight (`now - pauseStartedAt`) paused time from elapsed time, so the countdown freezes while paused and resumes exactly where it left off

Visual cues:

* The hourglass dims and a pulsing pause indicator appears (`@keyframes pausePulse`)
* Rest-screen particles and timer text also pulse while paused
* Sand stream opacity toggles to zero during pause

### Reflection I/O (`main/reflection-io.js`)

Each saved reflection writes two files to the user-specified log directory:

* **`YYYY-MM-DD.jsonl`** — One JSON object per line with timestamp, phase, duration, virtue ratings, task, and notes
* **`YYYY-MM-DD.md`** — Markdown with a daily H1 heading, session H2 subheadings, virtue tables, and free-text sections

### Audio synthesis (`renderer/js/audio.js`)

Sounds are generated with the Web Audio API — no external audio files:

* **Work complete chime** — Four ascending tones (523 → 659 → 784 → 1047 Hz) with gain envelopes
* **Rest complete** — Four-note resolution chord with staggered attack

## Design system

### Color palette

| Token              | Value                          | Usage                    |
|--------------------|--------------------------------|--------------------------|
| `--gold`           | `#C6A86B`                      | Primary accent           |
| `--text-primary`   | `rgba(255, 255, 255, 0.90)`    | Body text                |
| `--text-secondary` | `rgba(255, 255, 255, 0.45)`    | Labels, hints            |
| `--text-gold`      | `rgba(198, 168, 107, 0.82)`    | Titles, buttons          |
| `--glass-bg`       | `rgba(255, 255, 255, 0.04)`    | Surface background       |
| `--glass-border`   | `rgba(255, 255, 255, 0.07)`    | Surface edge             |

### Typography

* **Display / titles:** Cormorant Garamond, weight 300, letter-spacing 4–8 px
* **Body / labels:** System sans-serif (SF Pro Text, SF Pro Display, Helvetica Neue fallback)
* **Debug overlay:** System monospace

### Visuals

* macOS vibrancy (`under-window`) with `visualEffectState: 'active'` on the setup screen; vibrancy is disabled during work mode and restored when returning to setup
* Work widget disables vibrancy and window shadow for a fully transparent background — the hourglass floats directly on the desktop with no visible outline
* `backdrop-filter: blur(60px) saturate(1.5) brightness(1.04)` on the setup screen; alert, reflect, and complete content panels use `blur(40px)`
* Gold radial glow behind the work hourglass, appearing on hover with a 7 s ease-in-out pulse
* Ambient gold particles (30 elements, randomized size and duration) on the rest screen

## Testing

The test suite uses Jest v30+ with two project environments:

| Project    | Environment | Tests | Coverage target                    |
|------------|-------------|-------|------------------------------------|
| `renderer` | jsdom       | 96    | Functions, state transitions, pause |
| `main`     | node        | 51    | IPC routing, window manager        |

**Test strategy:** Renderer source files are concatenated and evaluated via `new Function().call(window)` with a `globalThis` export wrapper, giving tests direct access to all 28 functions and 19 state declarations without an ES module loader.

Run with coverage:

```bash
npx jest --config jest.config.js --coverage
```

## Development

### Debug overlay

Press `Ctrl+D` (or `Cmd+D` on macOS) while the app is running to toggle a real-time overlay showing:

* Current phase and pause state
* Timer duration, elapsed, and remaining (ms)
* Paused accumulated time (ms)
* Raw and animated progress values
* Frame rate (FPS)

### Keyboard shortcuts

| Key       | Context         | Action                |
|-----------|----------------|-----------------------|
| `Space`   | Work or Rest   | Toggle pause / resume |
| `Ctrl+D`  | Any screen     | Toggle debug overlay  |

### Module loading

All renderer modules load via `<script>` tags in dependency order — no bundler or ES module imports. The load chain:

```text
quotes → whispers → state → hourglass → audio → timer →
screens → settings → particles → virtue → reflection → wisdom → app
```

### Pause / resume interaction model

```text
         Space / click hourglass
                  │
         ┌────────▼────────┐
         │  togglePause()  │
         └───┬─────────┬───┘
    paused?  │         │  running?
         ┌───▼───┐ ┌───▼────┐
         │resume │ │ pause  │
         │Timer()│ │Timer() │
         └───┬───┘ └───┬────┘
             │         │
   ┌─────────▼─┐  ┌────▼────────────┐
   │ accumulate│  │ record          │
   │ paused ms │  │ pauseStartedAt  │
   │ restart   │  │ stop anim loop  │
   │ anim loop │  │ add .paused CSS │
   └───────────┘  └─────────────────┘
```

Each module defines its exports as top-level `var`, `let`, `const`, or `function` declarations in the global scope.

