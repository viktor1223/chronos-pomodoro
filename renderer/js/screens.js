/* ═══════════════════════════════════════════════════════
   CHRONOS — Screen Transitions
   Controls screen visibility with fade-in delay.
   ═══════════════════════════════════════════════════════ */

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
    setTimeout(() => {
        const target = document.getElementById(screenId);
        if (target) target.classList.add('active');
    }, 50);
}
