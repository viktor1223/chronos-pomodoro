# Chronos Refactoring Plan

Professional code review focused on structure, readability, and modular component reuse.
Zero changes to design or functionality.

---

## Current State

```
pomodoro_timer/
├── main.js               228 lines — Electron lifecycle + window mgmt + IPC + file I/O
├── preload.js             14 lines — contextBridge (clean, no changes needed)
├── package.json
└── renderer/
    ├── index.html         306 lines — All 6 screens in one file
    ├── app.js             509 lines — All renderer logic in one monolithic script
    ├── hourglass.js       201 lines — Reusable component (good precedent)
    └── styles.css        1124 lines — All styles for all screens in one file
```

**Total renderer logic**: 1 HTML + 2 JS + 1 CSS = 4 files, ~2,140 lines.

---

## Key Problems

### 1. `app.js` is a monolith (509 lines, 12+ concerns)

A single file handles timer engine, animation loop, audio synthesis, screen transitions,
settings drawer, input controls, quote management, particle effects, virtue check-in,
reflection form, debug overlay, and app initialization. Any change to one concern risks
breaking another.

**Specific mixing examples**:

- Timer math (`getTimerState`, `animationLoop`) lives next to DOM particle creation
- Audio synthesis functions sit between screen transition logic
- Quote data arrays are inline with business logic
- Virtue check-in state management shares scope with timer state

### 2. `styles.css` is a monolith (1,124 lines)

Six screens plus shared components, variables, animations, and responsive breakpoints
all in one file. Finding the styles for a specific screen requires scrolling through
unrelated rules. Comment headers help but don't solve the maintenance problem.

### 3. `index.html` contains all screens (306 lines)

All six screens are defined inline. Each screen's markup is tightly bound to the
others, making it hard to reason about one screen in isolation. SVG assets like the
laurel wreath are embedded directly (~40 lines of SVG path data).

### 4. `main.js` mixes three distinct concerns

- **App lifecycle** (window creation, `app.whenReady`, quit handling)
- **Window state machine** (7 different IPC handlers mutating window size/position/mode)
- **File I/O** (reflection saving: directory creation, JSONL logging, Markdown generation)

The `save-reflection` handler alone is 60+ lines of file system logic that has nothing
to do with window management.

### 5. No module system

All renderer code uses vanilla `<script>` tags and communicates through globals.
`Hourglass` is a class on `window`, `app.js` functions are all global. This works
but prevents tree-shaking, namespace isolation, and IDE-assisted refactoring.

### 6. Data mixed with logic

The `quotes` array (15 items), `whispers` array (10 items), and `virtueKeys` array
are declared inline in `app.js`. Adding or editing content means editing the logic file.

---

## Proposed Structure

```
pomodoro_timer/
├── main/
│   ├── index.js                — App lifecycle only (whenReady, quit, activate)
│   ├── window-manager.js       — Window state machine (sizes, positions, modes)
│   ├── ipc-handlers.js         — IPC handler registration (routing layer)
│   └── reflection-io.js        — Markdown + JSONL file I/O for reflections
│
├── preload.js                  — Unchanged (already clean)
├── package.json                — Update "main" to "main/index.js"
│
└── renderer/
    ├── index.html              — Lean shell: head, script tags, screen containers
    │
    ├── screens/                — One HTML partial per screen (loaded or inlined at build)
    │   ├── setup.html
    │   ├── work.html
    │   ├── alert.html
    │   ├── rest.html
    │   ├── reflect.html
    │   └── complete.html
    │
    ├── js/
    │   ├── app.js              — Entry point: imports, wiring, DOMContentLoaded init
    │   ├── state.js            — Phase enum, app state object, transition guards
    │   ├── timer.js            — Monotonic timer engine + rAF loop (pure logic)
    │   ├── audio.js            — playChime() + playRestComplete() (Web Audio)
    │   ├── screens.js          — showScreen() + transition animations
    │   ├── settings.js         — Settings drawer toggle, adjustTime, updateTimePreview
    │   ├── particles.js        — createParticles() for rest screen
    │   ├── virtue.js           — Virtue selector init + ratings state
    │   ├── reflection.js       — Form handling, save/skip, clear form
    │   ├── debug.js            — Debug overlay toggle + updateDebugOverlay
    │   └── wisdom.js           — showWisdomWhisper() display logic
    │
    ├── components/
    │   ├── hourglass.js        — Existing component (already good)
    │   └── laurel.js           — Laurel wreath SVG component (extracted from HTML)
    │
    ├── data/
    │   ├── quotes.js           — Philosophy quotes array
    │   └── whispers.js         — Wisdom whisper strings
    │
    └── styles/
        ├── base.css            — Reset, CSS variables, typography, scrollbar, animations
        ├── layout.css          — Screen positioning, .screen base, drag regions
        ├── controls.css        — Window controls, buttons (.btn-primary, .btn-rest, .spin-btn)
        ├── setup.css           — #setup-screen, .setup-content, inputs, settings drawer
        ├── work.css            — #work-screen, .work-content, hourglass sizing
        ├── alert.css           — #alert-screen, columns, alert content, laurel
        ├── rest.css            — #rest-screen, particles, timer display, quote
        ├── reflect.css         — #reflect-screen, form, virtue selector, textareas
        ├── complete.css        — #complete-screen, laurel, title
        └── components/
            └── hourglass.css   — .hourglass--sm/md/lg, .hourglass-glow, .hourglass-wrap
```

---

## Module Breakdown

### `renderer/js/state.js`

Owns the single source of truth for application state.

```
Exports:
  Phase           — frozen enum { IDLE, WORK, ALERT, REST, REFLECT, COMPLETE }
  state           — mutable state object (phase, durationMs, startTimestamp, etc.)
  getPhase()      — getter
  setPhase(p)     — setter with validation
```

Currently these are 15+ scattered `let` declarations at the top of `app.js`.
Centralizing them makes every other module a consumer of state rather than an owner.

### `renderer/js/timer.js`

Pure timer logic with no DOM dependencies.

```
Exports:
  getTimerState()       — returns { elapsedMs, remainingMs, progress }
  startAnimationLoop()  — begins rAF, accepts callbacks for sand/display updates
  stopAnimationLoop()   — cancels rAF
```

Currently `animationLoop()` directly calls `updateSand()`, `updateRestDisplay()`,
and `updateDebugOverlay()`. Instead, it should accept callback functions so the timer
has no knowledge of what renders its output. This is the biggest single-responsibility
win.

### `renderer/js/audio.js`

Self-contained Web Audio synthesis.

```
Exports:
  playChime()           — work-complete ascending tones
  playRestComplete()    — rest-complete resolution chord
```

These two functions have zero dependencies on app state. They are already isolated
in logic; they just need to be in their own file.

### `renderer/js/screens.js`

Screen transition orchestration.

```
Exports:
  showScreen(screenId)  — hides all .screen, activates target with delay
```

Currently 6 lines in `app.js`. Extracting it creates a clear seam: the screen
module controls visibility, other modules decide *when* to transition.

### `renderer/js/virtue.js`

Virtue check-in widget.

```
Exports:
  initVirtueSelector()  — binds dot click handlers
  getVirtueRatings()    — returns current ratings object
  clearVirtueRatings()  — resets all to 0
```

Currently the `virtueKeys` array, `virtueRatings` object, `initVirtueSelector()`,
and the clear logic inside `clearReflectForm()` are all tangled together in `app.js`.

### `renderer/data/quotes.js` and `renderer/data/whispers.js`

Pure data arrays, no logic.

```
// quotes.js
const quotes = [ { text: '...', author: '...' }, ... ];

// whispers.js
const whispers = [ 'Begin with intention.', ... ];
```

Separating content from logic means a designer or content editor can modify quotes
without touching any application code.

### `main/window-manager.js`

Window state machine extracted from `main.js`.

```
Exports:
  createWindow()        — initial window creation
  enterWorkMode()       — compact 140x180 floating widget
  enterRestMode()       — fullscreen takeover
  enterAlertMode()      — fullscreen + notification
  enterReflectMode()    — windowed 560x700, resizable
  returnToSetup()       — 320x460, bottom-right
```

Currently these are 7 separate `ipcMain.on` handlers each directly mutating
`mainWindow`. A state-machine approach makes transitions explicit and testable.

### `main/reflection-io.js`

File I/O for reflection journaling.

```
Exports:
  saveReflection(data)  — writes JSONL + Markdown entries
  selectLogDir()        — shows native folder picker
```

The `save-reflection` IPC handler is 60+ lines of fs operations that have nothing
to do with Electron window management. Extracting it makes `main.js` a thin
routing layer.

---

## CSS Splitting Strategy

The 1,124-line stylesheet splits naturally along screen boundaries that are already
marked with comment headers:

| File | Lines (approx) | Content |
|---|---|---|
| `base.css` | ~80 | Reset, `:root` variables, typography, `@keyframes fadeIn` |
| `layout.css` | ~40 | `.screen`, drag regions, window controls |
| `controls.css` | ~90 | `.btn-primary`, `.btn-rest`, `.spin-btn`, `.input-wrapper` |
| `setup.css` | ~140 | `#setup-screen`, `.setup-content`, settings drawer |
| `work.css` | ~60 | `#work-screen`, `.work-content`, glow pulse |
| `alert.css` | ~180 | `#alert-screen`, columns, alert card, laurel wreath |
| `rest.css` | ~140 | `#rest-screen`, particles, timer, meander |
| `reflect.css` | ~120 | `#reflect-screen`, form, virtue selector |
| `complete.css` | ~60 | `#complete-screen`, laurel, title |
| `components/hourglass.css` | ~30 | `.hourglass--sm/md/lg`, `.hourglass-glow` |

The `index.html` `<head>` would import them in order:

```html
<link rel="stylesheet" href="styles/base.css">
<link rel="stylesheet" href="styles/layout.css">
<link rel="stylesheet" href="styles/controls.css">
<link rel="stylesheet" href="styles/setup.css">
<link rel="stylesheet" href="styles/work.css">
<link rel="stylesheet" href="styles/alert.css">
<link rel="stylesheet" href="styles/rest.css">
<link rel="stylesheet" href="styles/reflect.css">
<link rel="stylesheet" href="styles/complete.css">
<link rel="stylesheet" href="styles/components/hourglass.css">
```

Since this is an Electron app (local files, no network), multiple CSS files have
zero performance impact.

---

## Migration Strategy

Phased approach, each step leaving the app fully functional:

### Phase 1: Extract data files

Move `quotes` and `whispers` arrays out of `app.js` into `renderer/data/`.
Add `<script>` tags before `app.js`. Zero logic changes.

**Risk**: None. Pure data extraction.

### Phase 2: Extract audio module

Move `playChime()` and `playRestComplete()` to `renderer/js/audio.js`.
They have zero dependencies on app state.

**Risk**: None. Self-contained functions.

### Phase 3: Extract state and timer

Create `state.js` (Phase enum + state object) and `timer.js` (engine + rAF).
Update `app.js` to reference the shared state object instead of loose variables.

**Risk**: Medium. Timer is the core loop; needs careful wiring of callbacks.

### Phase 4: Extract UI modules

Move `screens.js`, `settings.js`, `particles.js`, `virtue.js`, `reflection.js`,
`debug.js`, and `wisdom.js` out of `app.js`. Each is a small, self-contained
concern.

**Risk**: Low per module, but many moves. Test after each extraction.

### Phase 5: Split CSS

Create `renderer/styles/` directory. Move each screen's styles into its own file.
Update `index.html` link tags.

**Risk**: Low. Purely organizational.

### Phase 6: Split main process

Create `main/` directory. Extract `window-manager.js` and `reflection-io.js`.
Update `package.json` main entry.

**Risk**: Low. Clear seams already exist.

### Phase 7: Extract HTML partials (optional)

Move per-screen markup into separate files. Either load them via JS at startup
or use a simple build step to inline them.

**Risk**: Medium. Adds a load/build step. May not be worth the complexity for 6
screens in a desktop app.

---

## What's Already Good

- **`hourglass.js`** is a solid reusable component with clean API, proper encapsulation,
  unique IDs via `uid` prefix, and documented options. It's the model for future
  components.

- **`preload.js`** is minimal and correct. No changes needed.

- **Phase enum** (`Object.freeze`) is the right pattern. Just needs to move to its
  own module.

- **Monotonic timer** using `performance.now()` with `rAF` is the correct approach.
  It just needs to be decoupled from rendering.

- **Comment section headers** throughout the codebase show clear intent to organize.
  The refactoring makes that organization structural rather than cosmetic.

---

## What This Refactoring Does NOT Change

- Visual design (same CSS values, same layout)
- Functionality (same timer, same screens, same transitions)
- User experience (identical behavior)
- Electron version or dependencies
- IPC channel names or contracts
- File formats for reflection logs

The goal is purely structural: make the code match the mental model it already has.
