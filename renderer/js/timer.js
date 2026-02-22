/* ═══════════════════════════════════════════════════════
   Timer — Monotonic Engine + rAF Animation Loop
   Pure timer logic. Callbacks for rendering are injected.
   ═══════════════════════════════════════════════════════ */

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

    // Frame delta — compute BEFORE updating lastFrameTime
    const frameDt = lastFrameTime > 0 ? Math.min(timestamp - lastFrameTime, 50) : 16;

    // FPS calculation
    if (lastFrameTime > 0) {
        fpsAccum += frameDt;
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
