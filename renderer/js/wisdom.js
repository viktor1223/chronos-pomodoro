/* ═══════════════════════════════════════════════════════
   CHRONOS — Wisdom Whisper
   Displays a random wisdom whisper with fade-in effect.
   Depends on: data/whispers.js (whispers array)
   ═══════════════════════════════════════════════════════ */

function showWisdomWhisper() {
    const el = document.getElementById('wisdom-whisper');
    if (!el) return;
    const whisper = whispers[Math.floor(Math.random() * whispers.length)];
    el.textContent = whisper;
    el.style.opacity = '0';
    setTimeout(function () {
        el.style.opacity = '1';
    }, 100);
}
