/**
 * Hourglass Component — Unit Tests
 *
 * Tests the reusable SVG hourglass component:
 *   - Construction and rendering
 *   - Sand path geometry (top funnel + bottom mound)
 *   - Sand animation (updateSand / resetSand)
 *   - Edge cases and boundary conditions
 */

// Load the Hourglass class into jsdom
const fs = require('fs');
const path = require('path');
const hourglassSource = fs.readFileSync(
    path.join(__dirname, '../../renderer/hourglass.js'),
    'utf8',
);

let Hourglass;

beforeAll(() => {
    // Execute in jsdom global scope so `document` is available
    const script = new Function(hourglassSource + '\nreturn Hourglass;');
    Hourglass = script();
});

beforeEach(() => {
    document.body.innerHTML = '';
});

// ── Helper ────────────────────────────────────────────
function createContainer(id = 'test-hg') {
    const div = document.createElement('div');
    div.id = id;
    document.body.appendChild(div);
    return div;
}

// ═══════════════════════════════════════════════════════
//  1. CONSTRUCTION & RENDERING
// ═══════════════════════════════════════════════════════

describe('Hourglass — Construction', () => {
    test('creates instance with default options', () => {
        createContainer('hg-default');
        const hg = new Hourglass('hg-default');
        expect(hg).toBeDefined();
        expect(hg.size).toBe('md');
        expect(hg.flow).toBe(false);
        expect(hg.glow).toBe(false);
    });

    test('creates instance with custom options', () => {
        createContainer('hg-custom');
        const hg = new Hourglass('hg-custom', { size: 'lg', flow: true, glow: true });
        expect(hg.size).toBe('lg');
        expect(hg.flow).toBe(true);
        expect(hg.glow).toBe(true);
    });

    test('handles missing container gracefully', () => {
        // No container in DOM — should not throw
        const hg = new Hourglass('nonexistent', { flow: true });
        expect(hg).toBeDefined();
        expect(hg.topSand).toBeNull();
        expect(hg.bottomSand).toBeNull();
    });

    test('generates unique uid from container ID', () => {
        createContainer('my-hourglass-1');
        const hg = new Hourglass('my-hourglass-1');
        expect(hg.uid).toBe('myhourglass1');
    });

    test('strips special characters from uid', () => {
        createContainer('hg_test.2');
        const hg = new Hourglass('hg_test.2');
        expect(hg.uid).toBe('hgtest2');
    });
});

describe('Hourglass — SVG Rendering', () => {
    test('renders SVG element inside container', () => {
        createContainer('hg-svg');
        new Hourglass('hg-svg', { flow: true });
        const svg = document.querySelector('#hg-svg svg');
        expect(svg).not.toBeNull();
        expect(svg.getAttribute('viewBox')).toBe('0 0 80 120');
    });

    test('renders cap bars (top and bottom)', () => {
        createContainer('hg-caps');
        new Hourglass('hg-caps');
        const rects = document.querySelectorAll('#hg-caps rect');
        expect(rects.length).toBeGreaterThanOrEqual(2);
    });

    test('renders glass bulb paths', () => {
        createContainer('hg-glass');
        new Hourglass('hg-glass');
        const paths = document.querySelectorAll('#hg-glass path');
        // At minimum: top glass bulb + bottom glass bulb
        expect(paths.length).toBeGreaterThanOrEqual(2);
    });

    test('renders sand elements when flow=true', () => {
        createContainer('hg-sand');
        const hg = new Hourglass('hg-sand', { flow: true });
        expect(hg.topSand).not.toBeNull();
        expect(hg.bottomSand).not.toBeNull();
        expect(hg.sandStream).not.toBeNull();
    });

    test('does NOT render sand elements when flow=false', () => {
        createContainer('hg-nosand');
        const hg = new Hourglass('hg-nosand', { flow: false });
        expect(hg.topSand).toBeNull();
        expect(hg.bottomSand).toBeNull();
        expect(hg.sandStream).toBeNull();
    });

    test('renders glow element when glow=true', () => {
        createContainer('hg-glow');
        new Hourglass('hg-glow', { glow: true });
        const glow = document.querySelector('#hg-glow .hourglass-glow');
        expect(glow).not.toBeNull();
    });

    test('does NOT render glow element when glow=false', () => {
        createContainer('hg-noglow');
        new Hourglass('hg-noglow', { glow: false });
        const glow = document.querySelector('#hg-noglow .hourglass-glow');
        expect(glow).toBeNull();
    });

    test('renders clip-path defs when flow=true', () => {
        createContainer('hg-clips');
        const hg = new Hourglass('hg-clips', { flow: true });
        const topClip = document.getElementById(hg.uid + '-topClip');
        const btmClip = document.getElementById(hg.uid + '-btmClip');
        expect(topClip).not.toBeNull();
        expect(btmClip).not.toBeNull();
    });

    test('applies correct CSS class for size variant', () => {
        createContainer('hg-sm');
        new Hourglass('hg-sm', { size: 'sm' });
        const wrap = document.querySelector('#hg-sm .hourglass-wrap');
        expect(wrap.classList.contains('hourglass--sm')).toBe(true);
    });

    test('renders animated sand stream line', () => {
        createContainer('hg-stream');
        const hg = new Hourglass('hg-stream', { flow: true });
        expect(hg.sandStream.tagName.toLowerCase()).toBe('line');
        const animate = hg.sandStream.querySelector('animate');
        expect(animate).not.toBeNull();
    });
});

// ═══════════════════════════════════════════════════════
//  2. SAND PATH GEOMETRY
// ═══════════════════════════════════════════════════════

describe('Hourglass — Top Sand Path (_topSandPath)', () => {
    let hg;

    beforeEach(() => {
        createContainer('hg-top');
        hg = new Hourglass('hg-top', { flow: true });
    });

    test('at p=0 starts at y=14 (full sand)', () => {
        const d = hg._topSandPath(0);
        expect(d).toContain('M22 14'); // top edge at SAND_TOP
        expect(d).toContain('L58 58'); // extends to neck
        expect(d).toContain('L22 58 Z'); // closes path
    });

    test('at p=1 returns degenerate empty path', () => {
        const d = hg._topSandPath(1);
        expect(d).toBe('M22 58 L58 58 Z');
    });

    test('at p=0.5 edge is halfway between top and neck', () => {
        const d = hg._topSandPath(0.5);
        // edgeY = 14 + 0.5 * 44 = 36
        expect(d).toMatch(/M22 36/);
    });

    test('contains Q40 bezier control point (funnel curve)', () => {
        const d = hg._topSandPath(0.3);
        expect(d).toMatch(/Q40/);
    });

    test('produces valid SVG path at all progress values', () => {
        for (let p = 0; p <= 1; p += 0.1) {
            const d = hg._topSandPath(p);
            expect(d).toBeTruthy();
            expect(d.startsWith('M22')).toBe(true);
        }
    });
});

describe('Hourglass — Bottom Sand Path (_bottomSandPath)', () => {
    let hg;

    beforeEach(() => {
        createContainer('hg-btm');
        hg = new Hourglass('hg-btm', { flow: true });
    });

    test('at p=0 returns degenerate empty path', () => {
        const d = hg._bottomSandPath(0);
        expect(d).toBe('M22 106 L58 106 Z');
    });

    test('at p=1 edge is at y=62 (full bottom)', () => {
        const d = hg._bottomSandPath(1);
        // edgeY = 106 - 44 * 1 = 62
        expect(d).toMatch(/M22 62/);
    });

    test('at p=0.5 edge is halfway', () => {
        const d = hg._bottomSandPath(0.5);
        // edgeY = 106 - 44 * 0.5 = 84
        expect(d).toMatch(/M22 84/);
    });

    test('contains Q40 bezier control point (mound curve)', () => {
        const d = hg._bottomSandPath(0.5);
        expect(d).toMatch(/Q40/);
    });

    test('path always ends at y=106 (bottom of bulb)', () => {
        for (let p = 0.1; p <= 1; p += 0.1) {
            const d = hg._bottomSandPath(p);
            expect(d).toContain('L58 106');
            expect(d).toContain('L22 106 Z');
        }
    });

    test('produces valid SVG path at all progress values', () => {
        for (let p = 0; p <= 1; p += 0.1) {
            const d = hg._bottomSandPath(p);
            expect(d).toBeTruthy();
            expect(d.startsWith('M22')).toBe(true);
        }
    });
});

// ═══════════════════════════════════════════════════════
//  3. SAND ANIMATION API
// ═══════════════════════════════════════════════════════

describe('Hourglass — updateSand()', () => {
    let hg;

    beforeEach(() => {
        createContainer('hg-update');
        hg = new Hourglass('hg-update', { flow: true });
    });

    test('updates top sand path attribute', () => {
        const before = hg.topSand.getAttribute('d');
        hg.updateSand(0.5);
        const after = hg.topSand.getAttribute('d');
        expect(after).not.toBe(before);
    });

    test('updates bottom sand path attribute', () => {
        const before = hg.bottomSand.getAttribute('d');
        hg.updateSand(0.5);
        const after = hg.bottomSand.getAttribute('d');
        expect(after).not.toBe(before);
    });

    test('clamps progress below 0 to 0', () => {
        hg.updateSand(-0.5);
        const d = hg.topSand.getAttribute('d');
        expect(d).toContain('M22 14'); // same as p=0
    });

    test('clamps progress above 1 to 1', () => {
        hg.updateSand(1.5);
        const d = hg.topSand.getAttribute('d');
        expect(d).toBe('M22 58 L58 58 Z'); // same as p=1
    });

    test('hides sand stream when progress >= 0.98', () => {
        hg.updateSand(0.99);
        expect(hg.sandStream.style.opacity).toBe('0');
    });

    test('shows sand stream when progress < 0.98', () => {
        hg.updateSand(0.5);
        expect(hg.sandStream.style.opacity).toBe('0.4');
    });

    test('does nothing when flow=false', () => {
        createContainer('hg-noflow');
        const hgStatic = new Hourglass('hg-noflow', { flow: false });
        // Should not throw
        expect(() => hgStatic.updateSand(0.5)).not.toThrow();
    });
});

describe('Hourglass — resetSand()', () => {
    let hg;

    beforeEach(() => {
        createContainer('hg-reset');
        hg = new Hourglass('hg-reset', { flow: true });
    });

    test('resets top sand to full (p=0)', () => {
        hg.updateSand(0.5);
        hg.resetSand();
        const d = hg.topSand.getAttribute('d');
        expect(d).toContain('M22 14');
    });

    test('resets bottom sand to empty (p=0)', () => {
        hg.updateSand(0.5);
        hg.resetSand();
        const d = hg.bottomSand.getAttribute('d');
        expect(d).toBe('M22 106 L58 106 Z');
    });

    test('restores sand stream opacity', () => {
        hg.updateSand(0.99);
        expect(hg.sandStream.style.opacity).toBe('0');
        hg.resetSand();
        expect(hg.sandStream.style.opacity).toBe('0.4');
    });

    test('does nothing when flow=false', () => {
        createContainer('hg-reset-noflow');
        const hgStatic = new Hourglass('hg-reset-noflow', { flow: false });
        expect(() => hgStatic.resetSand()).not.toThrow();
    });
});

// ═══════════════════════════════════════════════════════
//  4. STATIC CONSTANTS
// ═══════════════════════════════════════════════════════

describe('Hourglass — Static Constants', () => {
    test('SAND_TOP is 14', () => {
        expect(Hourglass.SAND_TOP).toBe(14);
    });

    test('SAND_NECK is 58', () => {
        expect(Hourglass.SAND_NECK).toBe(58);
    });

    test('SAND_BOTTOM is 106', () => {
        expect(Hourglass.SAND_BOTTOM).toBe(106);
    });

    test('SAND_HEIGHT is 44', () => {
        expect(Hourglass.SAND_HEIGHT).toBe(44);
    });

    test('MAX_CURVE is 12', () => {
        expect(Hourglass.MAX_CURVE).toBe(12);
    });

    test('sand geometry is internally consistent', () => {
        expect(Hourglass.SAND_NECK - Hourglass.SAND_TOP).toBe(Hourglass.SAND_HEIGHT);
    });
});

// ═══════════════════════════════════════════════════════
//  5. MULTIPLE INSTANCES
// ═══════════════════════════════════════════════════════

describe('Hourglass — Multiple Instances', () => {
    test('two instances have unique clip-path IDs', () => {
        createContainer('hg-a');
        createContainer('hg-b');
        const a = new Hourglass('hg-a', { flow: true });
        const b = new Hourglass('hg-b', { flow: true });
        expect(a.uid).not.toBe(b.uid);
        expect(document.getElementById(a.uid + '-topClip')).not.toBeNull();
        expect(document.getElementById(b.uid + '-topClip')).not.toBeNull();
    });

    test('updating one instance does not affect another', () => {
        createContainer('hg-x');
        createContainer('hg-y');
        const x = new Hourglass('hg-x', { flow: true });
        const y = new Hourglass('hg-y', { flow: true });

        x.updateSand(0.8);
        const xTop = x.topSand.getAttribute('d');
        const yTop = y.topSand.getAttribute('d');
        expect(xTop).not.toBe(yTop);
    });
});
