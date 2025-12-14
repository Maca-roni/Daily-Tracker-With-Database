// ...existing code...
const API = {
    saveMood: '/api/mood',
    getRecent: '/api/mood/recent',
    getHistory: '/api/mood/history',
    getStreak: '/api/mood/streak'
};

document.addEventListener('DOMContentLoaded', () => {
    const energy = document.getElementById('energy');
    const energyValue = document.getElementById('energyValue');
    energy.addEventListener('input', () => energyValue.textContent = energy.value);

    // load initial recent and streak
    loadMoodRecent();
    loadMoodStreak();
});

// Make mood option selection visually obvious: toggle .active on label click
document.addEventListener('DOMContentLoaded', () => {
    const options = document.querySelectorAll('.mood-option');
    if (!options || !options.length) return;

    options.forEach(opt => {
        opt.addEventListener('click', (e) => {
            // mark radio as checked and update classes
            options.forEach(o=>o.classList.remove('active'));
            opt.classList.add('active');
            const rd = opt.querySelector('input[type="radio"]');
            if (rd) rd.checked = true;
        });
    });

    // Initialize active state from checked radio (on page load)
    const checked = document.querySelector('.mood-option input[type="radio"]:checked');
    if (checked) {
        const parent = checked.closest('.mood-option');
        if (parent) parent.classList.add('active');
    }
});

async function saveMoodToDatabase(mood, energy, notes) {
    const payload = { mood: mood, energy_level: Number(energy), notes: notes };
    const res = await fetch(API.saveMood, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || 'Save failed');
    return data.entry;
}

async function loadMoodRecent(limit = 7) {
    try {
        const r = await fetch(API.getRecent + '?limit=' + limit);
        const j = await r.json();
        const recent = j.recent || j.entries || [];
        renderRecent(recent);
    } catch (e) {
        console.error('loadMoodRecent', e);
    }
}

async function loadMoodHistory(days = 30) {
    try {
        const r = await fetch(API.getHistory + '?days=' + days);
        const j = await r.json();
        const entries = j.entries || [];
        document.getElementById('moodHistory').style.display = 'block';
        updateHistoryDisplay(entries);
    } catch (e) {
        console.error('loadMoodHistory', e);
    }
}

async function loadMoodStreak() {
    try {
        const r = await fetch(API.getStreak);
        const j = await r.json();
        const s = j.streak || 0;
        document.getElementById('streak').textContent = s;
        return s;
    } catch (e) {
        console.error('loadMoodStreak', e);
        return 0;
    }
}

function renderRecent(items) {
    const container = document.getElementById('recentHarvest');
    if (!items.length) {
        container.innerHTML = `<div class="empty-state"><span class="empty-state-icon">🌱</span><div>No mood history yet<br><strong>Start your journey!</strong></div></div>`;
        return;
    }
    container.innerHTML = '';
    items.forEach(it => {
        const el = document.createElement('div');
        el.className = 'history-item';
        el.innerHTML = `
            <div class="history-emoji">${moodEmojiFor(it.mood)}</div>
            <div class="history-date">${it.log_date ? it.log_date.split('T')[0] : ''}</div>
            <div class="history-mood">${labelFor(it.mood)}</div>
            <div class="history-energy">Energy: ${it.energy_level ?? 'N/A'}</div>
            <div class="history-notes">${it.notes ? escapeHtml(it.notes) : ''}</div>
        `;
        container.appendChild(el);
    });
}

function updateHistoryDisplay(entries) {
    const list = document.getElementById('historyList');
    list.innerHTML = '';
    if (!entries.length) {
        list.innerHTML = `<div class="empty-state"><div>No entries found</div></div>`;
        return;
    }
    entries.forEach(it => {
        const el = document.createElement('div');
        el.className = 'history-item';
        el.innerHTML = `
            <div class="history-emoji">${moodEmojiFor(it.mood)}</div>
            <div class="history-date">${it.log_date ? it.log_date.split('T')[0] : ''}</div>
            <div class="history-mood">${labelFor(it.mood)}</div>
            <div class="history-energy">Energy: ${it.energy_level ?? 'N/A'}</div>
            <div class="history-notes">${it.notes ? escapeHtml(it.notes) : ''}</div>
        `;
        list.appendChild(el);
    });
}


function labelFor(mood) {
    // incoming may be numeric string or label
    const map = {'1':'Very Bad','2':'Bad','3':'Neutral','4':'Good','5':'Very Good'};
    return map[mood] || mood || 'Neutral';
}
function moodEmojiFor(mood) {
    const map = {'1':'😞','2':'🙁','3':'😐','4':'🙂','5':'😀'};
    return map[mood] || '🌱';
}
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]); }


window.MoodTracker = {
    saveMood: async function () {
        try {
            const sel = document.querySelector('input[name="mood"]:checked');
            const moodVal = sel ? sel.value : '3';
            const energy = document.getElementById('energy').value;
            const notes = document.getElementById('notes').value;
            const entry = await saveMoodToDatabase(moodVal, energy, notes);
            if (entry) {
                loadMoodRecent();
                loadMoodStreak();
                showResultModal(entry);
            } else {
                alert('Saved but server did not return entry. Refresh to confirm.');
            }
        } catch (e) {
            console.error('Error saving mood', e);
            alert('Failed to save mood. See console.');
        }
    },
    viewMoodHistory: function () { loadMoodHistory(); }
};

// Hide history and return to the tracker UI
MoodTracker.hideHistory = function() {
    const historyEl = document.getElementById('moodHistory');
    if (historyEl) historyEl.style.display = 'none';
    // ensure recent harvest is visible again
    const recent = document.getElementById('recentHarvest');
    if (recent) recent.style.display = '';
    // scroll to top of the form for user convenience
    const form = document.getElementById('mood-form');
    if (form) form.scrollIntoView({behavior: 'smooth', block: 'start'});
};


function showResultModal(entry) {
    const existing = document.getElementById('moodResultModal');
    if (existing) existing.remove();
    const modal = document.createElement('div');
    modal.id = 'moodResultModal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="result-header">
                <div class="result-emoji">${moodEmojiFor(entry.mood)}</div>
                <h3 class="result-message">Mood saved: ${labelFor(entry.mood)}</h3>
            </div>
            <div class="modal-actions">
                <button class="farm-btn" onclick="document.getElementById('moodResultModal')?.remove()">Close</button>
            </div>
        </div>`;
    document.body.appendChild(modal);
    modal.style.display = 'flex';
}
// ...existing code...
