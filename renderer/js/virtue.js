/* ═══════════════════════════════════════════════════════
   CHRONOS — Virtue Check-in
   Selector initialization, ratings state, and clear logic.
   ═══════════════════════════════════════════════════════ */

const virtueKeys = ['arete', 'sophrosyne', 'andreia', 'dikaiosyne', 'phronesis'];
const virtueRatings = {};

function initVirtueSelector() {
    const container = document.getElementById('virtue-selector');
    if (!container) return;
    virtueKeys.forEach(function (k) {
        virtueRatings[k] = 0;
    });
    container.querySelectorAll('.virtue-dot').forEach(function (dot) {
        dot.addEventListener('click', function () {
            const virtue = dot.dataset.virtue;
            const value = parseInt(dot.dataset.value);
            virtueRatings[virtue] = value;
            const row = dot.closest('.virtue-row');
            if (row) {
                row.querySelectorAll('.virtue-dot').forEach(function (d) {
                    const v = parseInt(d.dataset.value);
                    d.classList.toggle('active', v <= value);
                });
            }
        });
    });
}
