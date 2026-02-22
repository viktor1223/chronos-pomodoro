/* ═══════════════════════════════════════════════════════
   CHRONOS — Rest Particles
   Creates ambient floating particles for the rest screen.
   ═══════════════════════════════════════════════════════ */

function createParticles() {
    const container = document.getElementById('rest-particles');
    if (!container) return;
    container.innerHTML = '';
    for (let i = 0; i < 30; i++) {
        const el = document.createElement('div');
        el.className = 'rest-particle';
        el.style.left = Math.random() * 100 + '%';
        el.style.animationDuration = (8 + Math.random() * 12) + 's';
        el.style.animationDelay = (Math.random() * 10) + 's';
        const size = (1 + Math.random()) + 'px';
        el.style.width = size;
        el.style.height = size;
        el.style.opacity = String(0.08 + Math.random() * 0.14);
        container.appendChild(el);
    }
}
