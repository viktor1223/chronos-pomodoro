/* ═══════════════════════════════════════════════════════
   CHRONOS — Settings Drawer
   Toggle, time preview, and input adjustment controls.
   ═══════════════════════════════════════════════════════ */

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

function adjustTime(inputId, delta) {
    const input = document.getElementById(inputId);
    let val = parseFloat(input.value) || 0;
    const max = inputId === 'work-time' ? 120 : 60;
    val = Math.max(0.1, Math.min(max, val + delta));
    val = Math.round(val * 10) / 10; // keep 1 decimal
    input.value = val;
    updateTimePreview();
}
