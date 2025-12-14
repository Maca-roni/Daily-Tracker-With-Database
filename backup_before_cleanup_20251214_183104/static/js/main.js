// ...existing code...

document.addEventListener('DOMContentLoaded', () => {
    initNavToggle();
    setTodayForTaskDate('#task_date');
    initFormValidation();
    initTaskToggles();
});

function initNavToggle() {
    const btn = document.querySelector('.toggle-nav');
    if (!btn) return;
    btn.addEventListener('click', () => {
        document.body.classList.toggle('nav-open');
    });
}

function setTodayForTaskDate(selector) {
    const input = document.querySelector(selector);
    if (!input) return;
    if (!input.value) {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        input.value = `${yyyy}-${mm}-${dd}`;
    }
}

function initFormValidation() {
    // Add simple required-field validation for forms using class "needs-validation"
    const forms = document.querySelectorAll('form.needs-validation');
    forms.forEach(form => {
        form.addEventListener('submit', event => {
            let valid = true;
            form.querySelectorAll('[required]').forEach(el => {
                if (!el.value.trim()) {
                    el.classList.add('invalid');
                    valid = false;
                } else {
                    el.classList.remove('invalid');
                }
            });
            if (!valid) {
                event.preventDefault();
                event.stopPropagation();
            }
        });
    });
}

function initTaskToggles() {
    document.querySelectorAll('.task-complete').forEach(checkbox => {
        const id = checkbox.dataset.taskId;
        if (id && getCompletedState(id)) {
            checkbox.checked = true;
            markTaskUI(checkbox, true);
        }
        checkbox.addEventListener('change', () => {
            const checked = checkbox.checked;
            markTaskUI(checkbox, checked);
            if (checkbox.dataset.taskId) saveCompletedState(checkbox.dataset.taskId, checked);
        });
    });
}

function markTaskUI(checkbox, completed) {
    const item = checkbox.closest('.task-item') || checkbox.parentElement;
    if (!item) return;
    item.classList.toggle('completed', completed);
}


function saveCompletedState(taskId, completed) {
    try {
        const key = 'daily_tracker_task_completed';
        const map = JSON.parse(localStorage.getItem(key) || '{}');
        map[taskId] = completed ? 1 : 0;
        localStorage.setItem(key, JSON.stringify(map));
    } catch (e) {
        console.warn('Could not save task state', e);
    }
}

function getCompletedState(taskId) {
    try {
        const map = JSON.parse(localStorage.getItem('daily_tracker_task_completed') || '{}');
        return !!map[taskId];
    } catch (e) {
        return false;
    }
}

// API endpoints used by this script
const API = {
    saveMood: '/api/mood',
    getHistory: '/api/mood/history',
    getStreak: '/api/mood/streak',
    getRecent: '/api/mood/recent'
};

// --- ensure save function uses API.saveMood and returns entry object ---
async function saveMoodToDatabase(mood, energy, notes) {
    const payload = { mood: mood, energy_level: energy, notes: notes };
    const res = await fetch(API.saveMood, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || 'Save failed');
    // prefer returned entry
    return data.entry || data;
}

// --- make sure load functions use the matching endpoints ---
async function loadMoodHistory() {
    try {
        const r = await fetch(API.getHistory);
        const j = await r.json();
        const entries = j.entries || j.recent || [];
        updateHistoryDisplay(entries); // your existing UI updater
    } catch (e) {
        console.error('Error loading history', e);
        updateHistoryDisplay([]);
    }
}

async function loadMoodStreak() {
    try {
        const r = await fetch(API.getStreak);
        const j = await r.json();
        return j.streak || 0;
    } catch (e) {
        console.error('Error loading streak', e);
        return 0;
    }
}

// Expose minimal global API used by inline onclicks in templates
window.MoodTracker = {
    saveMood: async function () {
        try {
            const moodInput = document.querySelector('input[name="mood"]:checked');
            const moodVal = moodInput ? moodInput.value : null;
            const energy = document.getElementById('energy') ? document.getElementById('energy').value : null;
            const notes = document.getElementById('notes') ? document.getElementById('notes').value : '';
            const entry = await saveMoodToDatabase(moodVal, energy, notes);
            if (typeof showResultModal === 'function') showResultModal(entry);
            else window.location.reload();
        } catch (err) {
            console.error('saveMood error', err);
            alert(err.message || 'Failed to save mood');
        }
    },
    viewMoodHistory: function () {
        if (typeof loadMoodHistory === 'function') loadMoodHistory();
    },
    init: function () {
        if (typeof loadMoodHistory === 'function') loadMoodHistory();
    }
};
