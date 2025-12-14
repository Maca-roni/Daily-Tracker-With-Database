
// API endpoints
const HABIT_API = {
    getHabits: '/api/habits',
    createHabit: '/api/habits',
    updateHabit: (id) => `/api/habits/${id}`,
    deleteHabit: (id) => `/api/habits/${id}`,
    logHabit: (id) => `/api/habits/${id}/log`,
    getHabitStats: '/api/habits/stats'
};

// Habit categories with icons
const habitCategories = {
    health: { icon: '💪', color: '#FF6B6B' },
    productivity: { icon: '📈', color: '#4ECDC4' },
    mindfulness: { icon: '🧘', color: '#45B7D1' },
    learning: { icon: '📚', color: '#96CEB4' },
    creativity: { icon: '🎨', color: '#FFEAA7' },
    social: { icon: '👥', color: '#DDA0DD' },
    routine: { icon: '🔄', color: '#98D8C8' }
};

// Initialize habit tracker
async function initializeHabitTracker() {
    console.log("🌱 Initializing Habit Garden...");
    
    // Setup event listeners
    setupEventListeners();
    
    // Load habits from database
    await loadHabits();
    
    // Load statistics
    await loadHabitStats();
    
    console.log("✅ Habit Garden Initialized!");
}

// Setup event listeners
function setupEventListeners() {
    // Add habit button
    const addBtn = document.getElementById('addHabitBtn');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            showAddHabitModal();
        });
    }
    
    // Modal close buttons
    const closeButtons = document.querySelectorAll('.close-modal, #closeHabitModal');
    closeButtons.forEach(btn => {
        if (btn) {
            btn.addEventListener('click', () => {
                closeModal('habitModal');
            });
        }
    });
    
    // Save habit button
    const saveBtn = document.getElementById('saveHabit');
    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            await saveHabit();
        });
    }
    
    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
        const modal = document.getElementById('habitModal');
        if (event.target === modal) {
            closeModal('habitModal');
        }
    });
    
    // Back to farm button
    const backBtn = document.querySelector('.back-to-farm');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.location.href = '/';
        });
    }
}

// Load habits from database
async function loadHabits() {
    try {
        const response = await fetch(HABIT_API.getHabits);
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        updateHabitGrid(data.habits);
        
    } catch (error) {
        console.error('Error loading habits:', error);
        showError('Failed to load habits. Please refresh the page.');
    }
}

// Update habit grid display
function updateHabitGrid(habits) {
    const grid = document.getElementById('habitGrid');
    const emptyState = document.getElementById('emptyState');
    
    if (!grid) return;
    
    if (!habits || habits.length === 0) {
        if (emptyState) {
            emptyState.style.display = 'block';
        }
        grid.innerHTML = '';
        return;
    }
    
    if (emptyState) {
        emptyState.style.display = 'none';
    }
    
    // Sort habits by streak (highest first)
    habits.sort((a, b) => b.streak - a.streak);
    
    grid.innerHTML = habits.map(habit => createHabitCard(habit)).join('');
    
    // Add event listeners to new cards
    attachHabitCardListeners();
}

// Create habit card HTML
function createHabitCard(habit) {
    // Determine streak display
    let streakDisplay;
    if (habit.streak === 0) {
        streakDisplay = '<span class="streak-new">🌱 New</span>';
    } else if (habit.streak < 7) {
        streakDisplay = `<span class="streak-low">${habit.streak} 🔥</span>`;
    } else if (habit.streak < 30) {
        streakDisplay = `<span class="streak-medium">${habit.streak} 🌟</span>`;
    } else {
        streakDisplay = `<span class="streak-high">${habit.streak} ⚡</span>`;
    }
    
    // Determine category icon (based on habit name or category)
    const category = determineHabitCategory(habit.name);
    const categoryIcon = habitCategories[category]?.icon || '🌿';
    const categoryColor = habitCategories[category]?.color || '#8bac78';
    
    return `
        <div class="habit-card" data-habit-id="${habit.habit_id}">
            <div class="habit-card-header" style="border-left-color: ${categoryColor}">
                <div class="habit-title">
                    <span class="habit-icon">${categoryIcon}</span>
                    <h3>${habit.name}</h3>
                </div>
                <div class="habit-actions">
                    <button class="habit-action-btn edit-habit" title="Edit habit">
                        <span>✏️</span>
                    </button>
                    <button class="habit-action-btn delete-habit" title="Delete habit">
                        <span>🗑️</span>
                    </button>
                </div>
            </div>
            
            <div class="habit-card-body">
                <div class="habit-streak-display">
                    <div class="streak-info">
                        <span class="streak-label">Current Streak:</span>
                        ${streakDisplay}
                    </div>
                    <div class="streak-progress">
                        <div class="streak-bar">
                            <div class="streak-fill" style="width: ${Math.min((habit.streak / 30) * 100, 100)}%; background: ${categoryColor}"></div>
                        </div>
                        <span class="streak-goal">Goal: 30 days</span>
                    </div>
                </div>
                
                ${habit.description ? `
                <div class="habit-description">
                    <p>${habit.description}</p>
                </div>
                ` : ''}
                
                <div class="habit-frequency">
                    <span class="frequency-badge">${getFrequencyIcon(habit.frequency)} ${habit.frequency}</span>
                </div>
            </div>
            
            <div class="habit-card-footer">
                <button class="check-habit-btn ${habit.completed_today ? 'checked' : ''}" 
                        data-habit-id="${habit.habit_id}">
                    ${habit.completed_today ? 
                        '<span>✅</span> Completed Today' : 
                        '<span>⬜</span> Mark as Done'}
                </button>
            </div>
        </div>
    `;
}

// Determine habit category based on name
function determineHabitCategory(habitName) {
    const name = habitName.toLowerCase();
    
    if (name.includes('exercise') || name.includes('workout') || name.includes('yoga') || name.includes('meditation')) {
        return 'health';
    } else if (name.includes('read') || name.includes('study') || name.includes('learn')) {
        return 'learning';
    } else if (name.includes('write') || name.includes('journal') || name.includes('draw')) {
        return 'creativity';
    } else if (name.includes('call') || name.includes('message') || name.includes('meet')) {
        return 'social';
    } else {
        return 'routine';
    }
}

// Get frequency icon
function getFrequencyIcon(frequency) {
    const icons = {
        'daily': '📅',
        'weekly': '📆',
        'monthly': '🗓️',
        'custom': '⚙️'
    };
    return icons[frequency] || '📅';
}

// Attach event listeners to habit cards
function attachHabitCardListeners() {
    // Check/uncheck buttons
    document.querySelectorAll('.check-habit-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            const habitId = this.getAttribute('data-habit-id');
            await toggleHabitCompletion(habitId, this);
        });
    });
    
    // Edit buttons
    document.querySelectorAll('.edit-habit').forEach(btn => {
        btn.addEventListener('click', function() {
            const habitCard = this.closest('.habit-card');
            const habitId = habitCard.getAttribute('data-habit-id');
            showEditHabitModal(habitId);
        });
    });
    
    // Delete buttons
    document.querySelectorAll('.delete-habit').forEach(btn => {
        btn.addEventListener('click', function() {
            const habitCard = this.closest('.habit-card');
            const habitId = habitCard.getAttribute('data-habit-id');
            const habitName = habitCard.querySelector('h3').textContent;
            deleteHabit(habitId, habitName);
        });
    });
}

// Toggle habit completion
async function toggleHabitCompletion(habitId, button) {
    try {
        // Show loading state
        const originalText = button.innerHTML;
        button.innerHTML = '<span>⏳</span> Saving...';
        button.disabled = true;
        
        const response = await fetch(HABIT_API.logHabit(habitId), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({})
        });
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        // Update button state
        if (data.habit.completed_today) {
            button.innerHTML = '<span>✅</span> Completed Today';
            button.classList.add('checked');
            
            // Show celebration for streaks
            if (data.habit.streak % 7 === 0 && data.habit.streak > 0) {
                showCelebration(`🎉 ${data.habit.streak}-day streak! Keep it up!`);
            }
        } else {
            button.innerHTML = '<span>⬜</span> Mark as Done';
            button.classList.remove('checked');
        }
        
        // Update the specific habit card
        updateHabitCard(data.habit);
        
        // Reload stats
        await loadHabitStats();
        
    } catch (error) {
        console.error('Error toggling habit:', error);
        showError('Failed to update habit. Please try again.');
        
        // Restore button state
        button.innerHTML = originalText;
        button.disabled = false;
    }
}

// Update a single habit card
function updateHabitCard(habit) {
    const habitCard = document.querySelector(`.habit-card[data-habit-id="${habit.habit_id}"]`);
    if (!habitCard) return;
    
    // Update streak display
    const streakElement = habitCard.querySelector('.streak-info');
    if (streakElement) {
        let streakDisplay;
        if (habit.streak === 0) {
            streakDisplay = '<span class="streak-new">🌱 New</span>';
        } else if (habit.streak < 7) {
            streakDisplay = `<span class="streak-low">${habit.streak} 🔥</span>`;
        } else if (habit.streak < 30) {
            streakDisplay = `<span class="streak-medium">${habit.streak} 🌟</span>`;
        } else {
            streakDisplay = `<span class="streak-high">${habit.streak} ⚡</span>`;
        }
        
        streakElement.innerHTML = `
            <span class="streak-label">Current Streak:</span>
            ${streakDisplay}
        `;
    }
    
    // Update progress bar
    const progressFill = habitCard.querySelector('.streak-fill');
    if (progressFill) {
        const category = determineHabitCategory(habit.name);
        const categoryColor = habitCategories[category]?.color || '#8bac78';
        progressFill.style.width = `${Math.min((habit.streak / 30) * 100, 100)}%`;
        progressFill.style.background = categoryColor;
    }
    
    // Update button
    const button = habitCard.querySelector('.check-habit-btn');
    if (button) {
        if (habit.completed_today) {
            button.innerHTML = '<span>✅</span> Completed Today';
            button.classList.add('checked');
        } else {
            button.innerHTML = '<span>⬜</span> Mark as Done';
            button.classList.remove('checked');
        }
    }
}

// Show add habit modal
function showAddHabitModal() {
    const modal = document.getElementById('habitModal');
    const modalTitle = document.getElementById('modalTitle');
    const habitForm = document.getElementById('habitForm');
    
    if (modalTitle) modalTitle.textContent = '🌱 Plant New Habit';
    if (habitForm) {
        habitForm.reset();
        habitForm.setAttribute('data-mode', 'add');
        habitForm.removeAttribute('data-habit-id');
    }
    
    // Reset category selection
    const categoryOptions = document.querySelectorAll('.category-option');
    categoryOptions.forEach(opt => opt.classList.remove('selected'));
    
    openModal('habitModal');
}

// Show edit habit modal
async function showEditHabitModal(habitId) {
    try {
        // Fetch habit data
        const response = await fetch(HABIT_API.getHabits);
        const data = await response.json();
        
        if (data.error) throw new Error(data.error);
        
        const habit = data.habits.find(h => h.habit_id == habitId);
        if (!habit) throw new Error('Habit not found');
        
        const modal = document.getElementById('habitModal');
        const modalTitle = document.getElementById('modalTitle');
        const habitForm = document.getElementById('habitForm');
        
        if (modalTitle) modalTitle.textContent = '✏️ Edit Habit';
        if (habitForm) {
            // Populate form
            document.getElementById('habitName').value = habit.name;
            document.getElementById('habitDescription').value = habit.description || '';
            document.getElementById('habitFrequency').value = habit.frequency;
            
            habitForm.setAttribute('data-mode', 'edit');
            habitForm.setAttribute('data-habit-id', habitId);
        }
        
        openModal('habitModal');
        
    } catch (error) {
        console.error('Error loading habit for edit:', error);
        showError('Failed to load habit details.');
    }
}

// Save habit (create or update)
async function saveHabit() {
    const form = document.getElementById('habitForm');
    const mode = form.getAttribute('data-mode');
    const habitId = form.getAttribute('data-habit-id');
    
    const habitData = {
        name: document.getElementById('habitName').value.trim(),
        description: document.getElementById('habitDescription').value.trim(),
        frequency: document.getElementById('habitFrequency').value
    };
    
    // Validate
    if (!habitData.name) {
        showError('Please enter a habit name!');
        return;
    }
    
    try {
        let response;
        
        if (mode === 'edit') {
            // Update existing habit
            response = await fetch(HABIT_API.updateHabit(habitId), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(habitData)
            });
        } else {
            // Create new habit
            response = await fetch(HABIT_API.createHabit, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(habitData)
            });
        }
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        // Close modal and refresh habits
        closeModal('habitModal');
        await loadHabits();
        
        // Show success message
        showSuccess(`Habit ${mode === 'edit' ? 'updated' : 'created'} successfully!`);
        
    } catch (error) {
        console.error('Error saving habit:', error);
        showError(`Failed to ${mode} habit. Please try again.`);
    }
}

// Delete habit with confirmation
async function deleteHabit(habitId, habitName) {
    if (!confirm(`Are you sure you want to delete "${habitName}"? This will remove all associated data.`)) {
        return;
    }
    
    try {
        const response = await fetch(HABIT_API.deleteHabit(habitId), {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        // Remove habit card from UI
        const habitCard = document.querySelector(`.habit-card[data-habit-id="${habitId}"]`);
        if (habitCard) {
            habitCard.remove();
        }
        
        // Check if grid is empty
        const grid = document.getElementById('habitGrid');
        if (grid && grid.children.length === 0) {
            const emptyState = document.getElementById('emptyState');
            if (emptyState) {
                emptyState.style.display = 'block';
            }
        }
        
        // Reload stats
        await loadHabitStats();
        
        showSuccess('Habit deleted successfully!');
        
    } catch (error) {
        console.error('Error deleting habit:', error);
        showError('Failed to delete habit. Please try again.');
    }
}

// Load habit statistics
async function loadHabitStats() {
    try {
        const response = await fetch(HABIT_API.getHabitStats);
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        updateStatsDisplay(data.stats);
        
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Update statistics display
function updateStatsDisplay(stats) {
    // Update stats cards
    const totalHabitsElement = document.getElementById('totalHabits');
    const completedTodayElement = document.getElementById('completedToday');
    const completionRateElement = document.getElementById('completionRate');
    const bestStreakElement = document.getElementById('bestStreak');
    
    if (totalHabitsElement) {
        totalHabitsElement.textContent = stats.total_habits;
    }
    
    if (completedTodayElement) {
        completedTodayElement.textContent = `${stats.completed_today}/${stats.total_habits}`;
    }
    
    if (completionRateElement) {
        completionRateElement.textContent = `${stats.completion_rate}%`;
        // Update progress bar
        const rateFill = document.getElementById('completionRateFill');
        if (rateFill) {
            rateFill.style.width = `${stats.completion_rate}%`;
        }
    }
    
    if (bestStreakElement) {
        bestStreakElement.textContent = stats.best_streak;
    }
}

// Modal functions
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// Show error message
function showError(message) {
    // Create or show error element
    let errorElement = document.getElementById('habitError');
    if (!errorElement) {
        errorElement = document.createElement('div');
        errorElement.id = 'habitError';
        errorElement.className = 'error-message';
        document.querySelector('.panel-content').prepend(errorElement);
    }
    
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    
    // Hide after 5 seconds
    setTimeout(() => {
        errorElement.style.display = 'none';
    }, 5000);
}

// Show success message
function showSuccess(message) {
    // Create success notification
    const notification = document.createElement('div');
    notification.className = 'success-notification';
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">✅</span>
            <span class="notification-text">${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Show animation
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Show celebration
function showCelebration(message) {
    const celebration = document.createElement('div');
    celebration.className = 'celebration-notification';
    celebration.innerHTML = `
        <div class="celebration-content">
            <span class="celebration-icon">🎉</span>
            <span class="celebration-text">${message}</span>
        </div>
    `;
    
    document.body.appendChild(celebration);
    
    // Show animation
    setTimeout(() => {
        celebration.classList.add('show');
    }, 10);
    
    // Remove after 5 seconds
    setTimeout(() => {
        celebration.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(celebration);
        }, 300);
    }, 5000);
}

// Export functions
window.HabitTracker = {
    initialize: initializeHabitTracker,
    openModal: openModal,
    closeModal: closeModal
};

// Auto-initialize
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('habitGrid')) {
        initializeHabitTracker();
    }
});
