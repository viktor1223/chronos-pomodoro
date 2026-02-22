/* ═══════════════════════════════════════════════════════
   Hourglass — Reusable SVG Component
   Single source of truth for all hourglass rendering.

   Usage:
     new Hourglass('container-id', { size: 'md', flow: true, glow: true })

   Options:
     size  — 'sm' | 'md' | 'lg'  (controls CSS dimensions)
     flow  — boolean             (enables animated sand system)
     glow  — boolean             (adds radial glow behind glass)

   API:
     .updateSand(progress)  — progress 0..1, animates sand falling
     .resetSand()           — resets sand to full-top, empty-bottom
   ═══════════════════════════════════════════════════════ */

class Hourglass {
    constructor(containerId, options) {
        options = options || {};
        this.containerId = containerId;
        this.size = options.size || 'md';
        this.flow = !!options.flow;
        this.glow = !!options.glow;

        // Unique prefix for clip-path IDs (avoids SVG ID collisions)
        this.uid = containerId.replace(/[^a-zA-Z0-9]/g, '');

        // DOM references (populated after render)
        this.topSand = null;
        this.bottomSand = null;
        this.sandStream = null;

        this.container = document.getElementById(containerId);
        if (this.container) this._render();
    }

    /* ── Sand geometry constants ───────────────────── */
    // Top bulb: sand from y=14 to y=58 (height 44)
    // Bottom bulb: sand from y=62 to y=106 (height 44)
    // Sand rect x: 22 to 58 (width 36)
    // Max funnel/mound curvature depth in px
    static SAND_TOP = 14;
    static SAND_NECK = 58;
    static SAND_BOTTOM = 106;
    static SAND_HEIGHT = 44;   // 58 - 14 or 106 - 62
    static SAND_LEFT = 22;
    static SAND_RIGHT = 58;
    static SAND_CX = 40;   // center x
    static MAX_CURVE = 12;   // max bezier depth for funnel/mound

    /* ── Internal: Top sand path (concave funnel) ──── */
    // As sand drains, center drops first through the neck,
    // edges retain sand longer — creates a funnel / crater shape.
    _topSandPath(p) {
        var remaining = Hourglass.SAND_HEIGHT * (1 - p);
        if (remaining < 0.5) return 'M22 58 L58 58 Z'; // empty — degenerate line

        var edgeY = Hourglass.SAND_TOP + p * Hourglass.SAND_HEIGHT;

        // Funnel curvature: ramps up quickly, fades near empty
        var curve = Hourglass.MAX_CURVE
            * Math.min(p * 2.5, 1)
            * Math.min((1 - p) * 4, 1);

        // Clamp so the curve never dips below the neck
        curve = Math.min(curve, Math.max(0, Hourglass.SAND_NECK - 1 - edgeY));

        var centerY = edgeY + curve;

        return 'M22 ' + edgeY.toFixed(1) +
            ' Q40 ' + centerY.toFixed(1) + ' 58 ' + edgeY.toFixed(1) +
            ' L58 58 L22 58 Z';
    }

    /* ── Internal: Bottom sand path (convex mound) ─── */
    // Sand piles up in the center before spreading to edges —
    // creates a dome / mound that flattens as the bulb fills.
    _bottomSandPath(p) {
        if (p < 0.01) return 'M22 106 L58 106 Z'; // empty — degenerate line

        var sandHeight = Hourglass.SAND_HEIGHT * p;
        var edgeY = Hourglass.SAND_BOTTOM - sandHeight;

        // Mound curvature: builds quickly, flattens as bulb fills
        var curve = Hourglass.MAX_CURVE
            * Math.min(p * 4, 1)
            * Math.min((1 - p) * 2.5, 1);

        // Clamp so the mound never rises above the bulb neck
        curve = Math.min(curve, Math.max(0, edgeY - 63));

        var centerY = edgeY - curve;

        return 'M22 ' + edgeY.toFixed(1) +
            ' Q40 ' + centerY.toFixed(1) + ' 58 ' + edgeY.toFixed(1) +
            ' L58 106 L22 106 Z';
    }

    /* ── Internal: Build and inject SVG ────────────── */
    _render() {
        var wrap = document.createElement('div');
        wrap.className = 'hourglass-wrap hourglass--' + this.size;

        var svg = '<svg viewBox="0 0 80 120" fill="none" xmlns="http://www.w3.org/2000/svg">';

        // Defs — clip paths for sand (only when flow enabled)
        if (this.flow) {
            svg += '<defs>';
            svg += '<clipPath id="' + this.uid + '-topClip">';
            svg += '<path d="M23 15 C23 15 23 47 40 57 C57 47 57 15 57 15 Z"/>';
            svg += '</clipPath>';
            svg += '<clipPath id="' + this.uid + '-btmClip">';
            svg += '<path d="M23 105 C23 105 23 73 40 63 C57 73 57 105 57 105 Z"/>';
            svg += '</clipPath>';
            svg += '</defs>';
        }

        // Caps — thin horizontal bars
        svg += '<rect x="18" y="10" width="44" height="2" rx="1" fill="rgba(198,168,107,0.45)"/>';
        svg += '<rect x="18" y="108" width="44" height="2" rx="1" fill="rgba(198,168,107,0.45)"/>';

        // Glass bulbs — delicate bezier curves
        svg += '<path d="M22 14 C22 14 22 48 40 58 C58 48 58 14 58 14" ';
        svg += 'fill="none" stroke="rgba(198,168,107,0.30)" ';
        svg += 'stroke-width="0.8" stroke-linecap="round"/>';

        svg += '<path d="M22 106 C22 106 22 72 40 62 C58 72 58 106 58 106" ';
        svg += 'fill="none" stroke="rgba(198,168,107,0.30)" ';
        svg += 'stroke-width="0.8" stroke-linecap="round"/>';

        // Sand system — only rendered when flow=true
        if (this.flow) {
            // Top sand — path with concave funnel surface
            svg += '<path data-role="topSand" d="' + this._topSandPath(0) + '" ';
            svg += 'fill="rgba(198,168,107,0.40)" clip-path="url(#' + this.uid + '-topClip)"/>';

            // Sand stream (animated dashed line between bulbs)
            svg += '<line data-role="stream" x1="40" y1="58" x2="40" y2="62" ';
            svg += 'stroke="rgba(198,168,107,0.30)" stroke-width="0.8" ';
            svg += 'stroke-dasharray="1.5,3" stroke-linecap="round">';
            svg += '<animate attributeName="stroke-dashoffset" values="0;4.5" dur="0.8s" repeatCount="indefinite"/>';
            svg += '</line>';

            // Bottom sand — path with convex mound surface
            svg += '<path data-role="bottomSand" d="' + this._bottomSandPath(0) + '" ';
            svg += 'fill="rgba(198,168,107,0.40)" clip-path="url(#' + this.uid + '-btmClip)"/>';
        }

        svg += '</svg>';

        wrap.innerHTML = svg;

        // Glow — radial ambient light behind the hourglass
        if (this.glow) {
            var glowEl = document.createElement('div');
            glowEl.className = 'hourglass-glow';
            wrap.appendChild(glowEl);
        }

        this.container.appendChild(wrap);

        // Cache sand element references for animation
        if (this.flow) {
            this.topSand = wrap.querySelector('[data-role="topSand"]');
            this.bottomSand = wrap.querySelector('[data-role="bottomSand"]');
            this.sandStream = wrap.querySelector('[data-role="stream"]');
        }
    }

    /* ── Public: Update sand position ──────────────── */
    updateSand(progress) {
        if (!this.flow) return;
        var p = Math.max(0, Math.min(1, progress));

        if (this.topSand) {
            this.topSand.setAttribute('d', this._topSandPath(p));
        }
        if (this.bottomSand) {
            this.bottomSand.setAttribute('d', this._bottomSandPath(p));
        }
        if (this.sandStream) {
            this.sandStream.style.opacity = p >= 0.98 ? '0' : '0.4';
        }
    }

    /* ── Public: Reset to initial state ───────────── */
    resetSand() {
        if (!this.flow) return;
        if (this.topSand) {
            this.topSand.setAttribute('d', this._topSandPath(0));
        }
        if (this.bottomSand) {
            this.bottomSand.setAttribute('d', this._bottomSandPath(0));
        }
        if (this.sandStream) {
            this.sandStream.style.opacity = '0.4';
        }
    }
}
