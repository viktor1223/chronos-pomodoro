/* ═══════════════════════════════════════════════════════
   CHRONOS — Reflection I/O
   JSONL + Markdown file I/O for reflection journaling.
   ═══════════════════════════════════════════════════════ */

const fs = require('fs');
const path = require('path');

/**
 * Save a reflection entry as both JSONL (structured) and Markdown (human-readable).
 * @param {Object} data — { logDir, task, notes, virtueRatings, workMinutes, restMinutes }
 * @returns {{ success: boolean, filePath?: string, error?: string }}
 */
async function saveReflection(_event, data) {
    try {
        const dir = data.logDir;
        if (!dir) return { success: false, error: 'No log directory set' };

        // Ensure directory exists
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // Daily file: YYYY-MM-DD.md
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const filePath = path.join(dir, `${dateStr}.md`);
        const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

        // ── JSONL structured log ──────────────────────
        const jsonlPath = path.join(dir, `${dateStr}.jsonl`);
        const jsonlEntry = JSON.stringify({
            timestamp: now.toISOString(),
            phase: 'reflect',
            durationMin: { work: data.workMinutes, rest: data.restMinutes },
            virtueRatings: data.virtueRatings || {},
            task: (data.task || '').trim(),
            notes: (data.notes || '').trim(),
        });
        fs.appendFileSync(jsonlPath, jsonlEntry + '\n', 'utf8');

        // ── Markdown entry (human-readable) ──────────
        let entry = '';

        if (!fs.existsSync(filePath)) {
            entry += `# Reflections — ${dateStr}\n\n`;
        }

        entry += `## Session at ${timeStr}\n\n`;
        entry += `| Field | Value |\n|-------|-------|\n`;
        entry += `| Duration | ${data.workMinutes} min work · ${data.restMinutes} min rest |\n`;

        // Virtue ratings
        if (data.virtueRatings) {
            const vr = data.virtueRatings;
            const virtueNames = {
                arete: 'Areté',
                sophrosyne: 'Sophrosyne',
                andreia: 'Andreia',
                dikaiosyne: 'Dikaiosyne',
                phronesis: 'Phronesis',
            };
            const rated = Object.entries(vr).filter(([, v]) => v > 0);
            if (rated.length > 0) {
                const virtueStr = rated
                    .map(([k, v]) => `${virtueNames[k] || k}: ${v}/5`)
                    .join(', ');
                entry += `| Virtues | ${virtueStr} |\n`;
            }
        }
        entry += `\n`;

        if (data.task && data.task.trim()) {
            entry += `### What I worked on\n\n${data.task.trim()}\n\n`;
        }

        if (data.notes && data.notes.trim()) {
            entry += `### Notes & reflections\n\n${data.notes.trim()}\n\n`;
        }

        entry += `---\n\n`;

        fs.appendFileSync(filePath, entry, 'utf8');

        return { success: true, filePath };
    } catch (err) {
        console.error('Failed to save reflection:', err);
        return { success: false, error: err.message };
    }
}

module.exports = { saveReflection };
