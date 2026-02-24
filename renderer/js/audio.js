/* ═══════════════════════════════════════════════════════
   Audio — Web Audio Synthesis
   Self-contained chime and rest-complete sounds.
   Uses a shared AudioContext to prevent resource leaks.
   ═══════════════════════════════════════════════════════ */

// ── Shared AudioContext Singleton ─────────────────────
let _audioCtx = null;
let _audioMuted = false;

function getAudioContext() {
    if (!_audioCtx || _audioCtx.state === 'closed') {
        _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (_audioCtx.state === 'suspended') {
        _audioCtx.resume();
    }
    return _audioCtx;
}

function setAudioMuted(muted) {
    _audioMuted = !!muted;
}

function isAudioMuted() {
    return _audioMuted;
}

function playChime() {
    if (_audioMuted) return;
    try {
        const ctx = getAudioContext();
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
    } catch (e) {
        console.log('Audio not available:', e);
    }
}

function playRestComplete() {
    if (_audioMuted) return;
    try {
        const ctx = getAudioContext();
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
    } catch (e) {
        console.log('Audio not available:', e);
    }
}
