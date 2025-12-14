
// API endpoints
const TASK_API = {
    getTasks: '/api/tasks',
    createTask: '/api/tasks',
    updateTask: (id) => `/api/tasks/${id}`,
    deleteTask: (id) => `/api/tasks/${id}`,
    toggleTask: (id) => `/api/tasks/${id}/toggle`,
    getTaskStats: '/api/tasks/stats'
};

// Task categories with icons
const taskCategories = {
    work: { icon: '💼', color: '#4ECDC4' },
    personal: { icon: '👤', color: '#FF6B6B' },
    health: { icon: '💪', color: '#45B7D1' },
    study: { icon: '📚', color: '#96CEB4' },
    home: { icon: '🏠', color: '#FFEAA7' },
    social: { icon: '👥', color: '#DDA0DD' },
    urgent: { icon: '🚨', color: '#FF4757' }
};

// Timer functionality
let taskTimers = {};

// Initialize task tracker
async function initializeTaskTracker() {
    console.log("📝 Initializing Farm Tasks...");
    
    // Set current date
    updateTaskDate();
    
    // Setup event listeners
    setupTaskEventListeners();
    
    // Setup quick add
    setupQuickAdd();
    
    // Setup keyboard shortcuts
    setupKeyboardShortcuts();
    
    // Load tasks from database
    await loadTasks();
    
    // Load statistics
    await loadTaskStats();
    
    console.log("✅ Farm Tasks Initialized!");
}

// Update task date display
function updateTaskDate() {
    const now = new Date();
    const dateElement = document.getElementById('task-date');
    if (dateElement) {
        dateElement.textContent = now.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric'
        });
    }
}

// Setup event listeners
function setupTaskEventListeners() {
    // Add task button
    const addBtn = document.getElementById('addTaskBtn');
    if (addBtn) {
        addBtn.addEventListener('click', showAddTaskModal);
    }
    
    // Modal close buttons
    const closeButtons = document.querySelectorAll('.close-modal, #closeTaskModal');
    closeButtons.forEach(btn => {
        if (btn) {
            btn.addEventListener('click', () => closeModal('taskModal'));
        }
    });
    
    // Save task button
    const saveBtn = document.getElementById('saveTask');
    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            await saveTask();
        });
    }
    
    // Task filter buttons
    document.querySelectorAll('.task-filter').forEach(btn => {
        btn.addEventListener('click', function() {
            const filter = this.getAttribute('data-filter');
            filterTasks(filter);
        });
    });
    
    // Timer toggle
    const timerToggle = document.getElementById('timerToggle');
    if (timerToggle) {
        timerToggle.addEventListener('change', function() {
            document.getElementById('timerFields').style.display = 
                this.checked ? 'block' : 'none';
        });
    }
    
    // Back to farm button
    const backBtn = document.querySelector('.back-to-farm');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.location.href = '/';
        });
    }
    
    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
        const modal = document.getElementById('taskModal');
        if (event.target === modal) {
            closeModal('taskModal');
        }
    });
}

// Quick add task from input
function setupQuickAdd() {
    const quickAddInput = document.getElementById('quickAddTask');
    if (quickAddInput) {
        quickAddInput.addEventListener('keypress', async function(e) {
            if (e.key === 'Enter' && this.value.trim()) {
                const taskName = this.value.trim();
                
                try {
                    const response = await fetch(TASK_API.createTask, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            name: taskName,
                            date: new Date().toISOString().split('T')[0] // Today
                        })
                    });
                    
                    const data = await response.json();
                    
                    if (data.error) {
                        throw new Error(data.error);
                    }
                    
                    // Clear input
                    this.value = '';
                    
                    // Reload tasks
                    await loadTasks();
                    await loadTaskStats();
                    
                    showSuccess('Task added! 🌱');
                    
                } catch (error) {
                    console.error('Error adding quick task:', error);
                    showError('Failed to add task');
                }
            }
        });
    }
}

// Keyboard shortcuts
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'A') {
            e.preventDefault();
            showAddTaskModal();
        }
        
        // Escape to close modal
        if (e.key === 'Escape') {
            closeModal('taskModal');
        }
        
        // Ctrl+Enter to save task when modal is open
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && 
            document.getElementById('taskModal').style.display === 'block') {
            e.preventDefault();
            document.getElementById('saveTask').click();
        }
    });
}

// Load tasks from database
async function loadTasks() {
    try {
        const response = await fetch(TASK_API.getTasks);
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        updateTaskList(data.tasks);
        
    } catch (error) {
        console.error('Error loading tasks:', error);
        showError('Failed to load tasks. Please refresh the page.');
    }
}

// Update task list display
function updateTaskList(tasks) {
    const taskList = document.getElementById('taskList');
    const emptyState = document.getElementById('emptyState');
    
    if (!taskList) return;
    
    if (!tasks || tasks.length === 0) {
        if (emptyState) {
            emptyState.style.display = 'block';
        }
        taskList.innerHTML = '';
        return;
    }
    
    if (emptyState) {
        emptyState.style.display = 'none';
    }
    
    // Group tasks by date
    const tasksByDate = groupTasksByDate(tasks);
    
    taskList.innerHTML = Object.entries(tasksByDate).map(([dateStr, dateTasks]) => {
        const date = new Date(dateStr);
        const today = new Date();
        const tomorrow = new Date();
        tomorrow.setDate(today.getDate() + 1);
        
        let dateLabel;
        if (date.toDateString() === today.toDateString()) {
            dateLabel = 'Today 🎯';
        } else if (date.toDateString() === tomorrow.toDateString()) {
            dateLabel = 'Tomorrow ⏳';
        } else if (date < today) {
            dateLabel = `${date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} ⚠️`;
        } else {
            dateLabel = date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
        }
        
        return `
            <div class="task-date-group">
                <h3 class="date-header">${dateLabel}</h3>
                <div class="task-items">
                    ${dateTasks.map(task => createTaskItem(task)).join('')}
                </div>
            </div>
        `;
    }).join('');
    
    // Add event listeners to new task items
    attachTaskItemListeners();
}

// Group tasks by date
function groupTasksByDate(tasks) {
    const grouped = {};
    
    tasks.forEach(task => {
        const dateKey = task.date || 'no-date';
        if (!grouped[dateKey]) {
            grouped[dateKey] = [];
        }
        grouped[dateKey].push(task);
    });
    
    // Sort dates
    return Object.fromEntries(
        Object.entries(grouped).sort(([dateA], [dateB]) => {
            if (dateA === 'no-date') return 1;
            if (dateB === 'no-date') return -1;
            return new Date(dateA) - new Date(dateB);
        })
    );
}

// Create task item HTML
function createTaskItem(task) {
    const category = determineTaskCategory(task.name);
    const categoryIcon = taskCategories[category]?.icon || '📝';
    const categoryColor = taskCategories[category]?.color || '#8b6f47';
    
    // Check if overdue
    const today = new Date().toISOString().split('T')[0];
    const isOverdue = task.date && task.date < today && !task.completed;
    
    // Format time if timer exists
    let timerDisplay = '';
    if (taskTimers[task.task_id]) {
        const timer = taskTimers[task.task_id];
        if (timer.endTime) {
            const timeLeft = timer.endTime - Date.now();
            if (timeLeft > 0) {
                const hours = Math.floor(timeLeft / (1000 * 60 * 60));
                const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
                timerDisplay = `<span class="task-timer">⏰ ${hours}h ${minutes}m</span>`;
            } else {
                timerDisplay = '<span class="task-timer overdue">⏰ Time\'s up!</span>';
            }
        }
    }
    
    return `
        <div class="task-item ${task.completed ? 'completed' : ''} ${isOverdue ? 'overdue' : ''}" 
             data-task-id="${task.task_id}"
             style="border-left-color: ${categoryColor}">
            <div class="task-checkbox">
                <input type="checkbox" 
                       class="task-complete" 
                       data-task-id="${task.task_id}"
                       ${task.completed ? 'checked' : ''}>
                <span class="checkmark"></span>
            </div>
            
            <div class="task-content">
                <div class="task-header">
                    <span class="task-category-icon">${categoryIcon}</span>
                    <h4 class="task-name">${task.name}</h4>
                    <div class="task-actions">
                        ${timerDisplay}
                        <button class="task-action-btn edit-task" title="Edit task">
                            <span>✏️</span>
                        </button>
                        <button class="task-action-btn delete-task" title="Delete task">
                            <span>🗑️</span>
                        </button>
                    </div>
                </div>
                
                ${task.description ? `
                <div class="task-description">
                    <p>${task.description}</p>
                </div>
                ` : ''}
                
                ${task.date ? `
                <div class="task-meta">
                    <span class="task-date">📅 ${formatTaskDate(task.date)}</span>
                    ${isOverdue ? '<span class="overdue-badge">⚠️ Overdue</span>' : ''}
                </div>
                ` : ''}
            </div>
        </div>
    `;
}

// Determine task category based on name
function determineTaskCategory(taskName) {
    const name = taskName.toLowerCase();
    
    if (name.includes('work') || name.includes('meeting') || name.includes('project')) {
        return 'work';
    } else if (name.includes('exercise') || name.includes('workout') || name.includes('health')) {
        return 'health';
    } else if (name.includes('study') || name.includes('read') || name.includes('learn')) {
        return 'study';
    } else if (name.includes('urgent') || name.includes('important') || name.includes('asap')) {
        return 'urgent';
    } else if (name.includes('clean') || name.includes('home') || name.includes('house')) {
        return 'home';
    } else {
        return 'personal';
    }
}

// Format task date
function formatTaskDate(dateStr) {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
        return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
        return 'Tomorrow';
    } else {
        return date.toLocaleDateString('en-US', { 
            weekday: 'short',
            month: 'short', 
            day: 'numeric' 
        });
    }
}

// Attach event listeners to task items
function attachTaskItemListeners() {
    // Check/uncheck buttons
    document.querySelectorAll('.task-complete').forEach(checkbox => {
        checkbox.addEventListener('change', async function() {
            const taskId = this.getAttribute('data-task-id');
            await toggleTaskCompletion(taskId, this.checked);
        });
    });
    
    // Edit buttons
    document.querySelectorAll('.edit-task').forEach(btn => {
        btn.addEventListener('click', function() {
            const taskItem = this.closest('.task-item');
            const taskId = taskItem.getAttribute('data-task-id');
            showEditTaskModal(taskId);
        });
    });
    
    // Delete buttons
    document.querySelectorAll('.delete-task').forEach(btn => {
        btn.addEventListener('click', function() {
            const taskItem = this.closest('.task-item');
            const taskId = taskItem.getAttribute('data-task-id');
            const taskName = taskItem.querySelector('.task-name').textContent;
            deleteTask(taskId, taskName);
        });
    });
}

// Toggle task completion
async function toggleTaskCompletion(taskId, completed) {
    try {
        const response = await fetch(TASK_API.toggleTask(taskId), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        // Update task item appearance
        const taskItem = document.querySelector(`.task-item[data-task-id="${taskId}"]`);
        if (taskItem) {
            if (completed) {
                taskItem.classList.add('completed');
                // Stop timer if task is completed
                if (taskTimers[taskId]) {
                    clearInterval(taskTimers[taskId].interval);
                    delete taskTimers[taskId];
                }
            } else {
                taskItem.classList.remove('completed');
            }
        }
        
        // Reload stats
        await loadTaskStats();
        
        // Show celebration for completion
        if (completed) {
            showSuccess('Task completed! 🎉');
        }
        
    } catch (error) {
        console.error('Error toggling task:', error);
        showError('Failed to update task. Please try again.');
        
        // Revert checkbox state
        const checkbox = document.querySelector(`.task-complete[data-task-id="${taskId}"]`);
        if (checkbox) {
            checkbox.checked = !completed;
        }
    }
}

// Show add task modal
function showAddTaskModal() {
    const modal = document.getElementById('taskModal');
    const modalTitle = document.getElementById('modalTitle');
    const taskForm = document.getElementById('taskForm');
    
    if (modalTitle) modalTitle.textContent = '📝 Plant New Task';
    if (taskForm) {
        taskForm.reset();
        taskForm.setAttribute('data-mode', 'add');
        taskForm.removeAttribute('data-task-id');
        
        // Set default date to today
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('taskDate').value = today;
        
        // Hide timer fields by default
        document.getElementById('timerFields').style.display = 'none';
        document.getElementById('timerToggle').checked = false;
    }
    
    openModal('taskModal');
}

// Show edit task modal
async function showEditTaskModal(taskId) {
    try {
        // Fetch all tasks
        const response = await fetch(TASK_API.getTasks);
        const data = await response.json();
        
        if (data.error) throw new Error(data.error);
        
        const task = data.tasks.find(t => t.task_id == taskId);
        if (!task) throw new Error('Task not found');
        
        const modal = document.getElementById('taskModal');
        const modalTitle = document.getElementById('modalTitle');
        const taskForm = document.getElementById('taskForm');
        
        if (modalTitle) modalTitle.textContent = '✏️ Edit Task';
        if (taskForm) {
            // Populate form
            document.getElementById('taskName').value = task.name;
            document.getElementById('taskDescription').value = task.description || '';
            document.getElementById('taskDate').value = task.date || '';
            
            taskForm.setAttribute('data-mode', 'edit');
            taskForm.setAttribute('data-task-id', taskId);
        }
        
        openModal('taskModal');
        
    } catch (error) {
        console.error('Error loading task for edit:', error);
        showError('Failed to load task details.');
    }
}

// Save task (create or update)
async function saveTask() {
    const form = document.getElementById('taskForm');
    const mode = form.getAttribute('data-mode');
    const taskId = form.getAttribute('data-task-id');
    
    const taskData = {
        name: document.getElementById('taskName').value.trim(),
        description: document.getElementById('taskDescription').value.trim(),
        date: document.getElementById('taskDate').value
    };
    
    // Validate
    if (!taskData.name) {
        showError('Please enter a task name!');
        return;
    }
    
    // Check if timer is enabled
    const hasTimer = document.getElementById('timerToggle').checked;
    let timerData = null;
    
    if (hasTimer) {
        const hours = parseInt(document.getElementById('timerHours').value) || 0;
        const minutes = parseInt(document.getElementById('timerMinutes').value) || 0;
        
        if (hours > 0 || minutes > 0) {
            timerData = {
                hours: hours,
                minutes: minutes
            };
        }
    }
    
    try {
        let response;
        
        if (mode === 'edit') {
            // Update existing task
            response = await fetch(TASK_API.updateTask(taskId), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(taskData)
            });
        } else {
            // Create new task
            response = await fetch(TASK_API.createTask, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...taskData,
                    due_time: timerData
                })
            });
        }
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        // Start timer if provided
        if (timerData && mode === 'add') {
            startTaskTimer(data.task.task_id, timerData.hours, timerData.minutes);
        }
        
        // Close modal and refresh tasks
        closeModal('taskModal');
        await loadTasks();
        await loadTaskStats();
        
        // Show success message
        showSuccess(`Task ${mode === 'edit' ? 'updated' : 'created'} successfully!`);
        
    } catch (error) {
        console.error('Error saving task:', error);
        showError(`Failed to ${mode} task. Please try again.`);
    }
}

// Start timer for a task
function startTaskTimer(taskId, hours, minutes) {
    const totalMinutes = (hours * 60) + minutes;
    const endTime = Date.now() + (totalMinutes * 60 * 1000);
    
    // Clear existing timer
    if (taskTimers[taskId]) {
        clearInterval(taskTimers[taskId].interval);
    }
    
    taskTimers[taskId] = {
        endTime: endTime,
        interval: setInterval(() => {
            updateTimerDisplay(taskId);
        }, 60000) // Update every minute
    };
    
    // Update display immediately
    updateTimerDisplay(taskId);
}

// Update timer display
function updateTimerDisplay(taskId) {
    const timer = taskTimers[taskId];
    if (!timer) return;
    
    const taskItem = document.querySelector(`.task-item[data-task-id="${taskId}"]`);
    if (!taskItem) return;
    
    const timeLeft = timer.endTime - Date.now();
    
    if (timeLeft <= 0) {
        // Timer expired
        const timerDisplay = taskItem.querySelector('.task-timer');
        if (timerDisplay) {
            timerDisplay.innerHTML = '<span class="overdue">⏰ Time\'s up!</span>';
            timerDisplay.classList.add('overdue');
        }
        
        // Show notification
        showNotification('Task timer expired! ⏰', 'warning');
        clearInterval(timer.interval);
        delete taskTimers[taskId];
    } else {
        // Update time display
        const hours = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        
        const timerDisplay = taskItem.querySelector('.task-timer');
        if (timerDisplay) {
            timerDisplay.textContent = `⏰ ${hours}h ${minutes}m`;
        }
    }
}

// Delete task with confirmation
async function deleteTask(taskId, taskName) {
    if (!confirm(`Are you sure you want to delete "${taskName}"?`)) {
        return;
    }
    
    try {
        const response = await fetch(TASK_API.deleteTask(taskId), {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        // Remove task from UI
        const taskItem = document.querySelector(`.task-item[data-task-id="${taskId}"]`);
        if (taskItem) {
            taskItem.remove();
        }
        
        // Remove timer if exists
        if (taskTimers[taskId]) {
            clearInterval(taskTimers[taskId].interval);
            delete taskTimers[taskId];
        }
        
        // Check if list is empty
        const taskList = document.getElementById('taskList');
        const emptyState = document.getElementById('emptyState');
        if (taskList && taskList.children.length === 0 && emptyState) {
            emptyState.style.display = 'block';
        }
        
        // Reload stats
        await loadTaskStats();
        
        showSuccess('Task deleted successfully!');
        
    } catch (error) {
        console.error('Error deleting task:', error);
        showError('Failed to delete task. Please try again.');
    }
}

// Filter tasks
function filterTasks(filter) {
    const taskItems = document.querySelectorAll('.task-item');
    const filterButtons = document.querySelectorAll('.task-filter');
    
    // Update active filter button
    filterButtons.forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-filter') === filter);
    });
    
    taskItems.forEach(item => {
        const completed = item.classList.contains('completed');
        const overdue = item.classList.contains('overdue');
        
        let showItem = true;
        
        switch(filter) {
            case 'all':
                showItem = true;
                break;
            case 'active':
                showItem = !completed;
                break;
            case 'completed':
                showItem = completed;
                break;
            case 'overdue':
                showItem = overdue;
                break;
        }
        
        item.style.display = showItem ? 'flex' : 'none';
    });
    
    // Update date group visibility
    document.querySelectorAll('.task-date-group').forEach(group => {
        const hasVisibleItems = Array.from(group.querySelectorAll('.task-item'))
            .some(item => item.style.display !== 'none');
        group.style.display = hasVisibleItems ? 'block' : 'none';
    });
}

// Load task statistics
async function loadTaskStats() {
    try {
        const response = await fetch(TASK_API.getTaskStats);
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        updateTaskStatsDisplay(data.stats);
        
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Update task statistics display
function updateTaskStatsDisplay(stats) {
    // Update stats cards
    const totalTasksElement = document.getElementById('totalTasks');
    const completedTasksElement = document.getElementById('completedTasks');
    const pendingTasksElement = document.getElementById('pendingTasks');
    const completionRateElement = document.getElementById('completionRate');
    const todayTasksElement = document.getElementById('todayTasks');
    const overdueTasksElement = document.getElementById('overdueTasks');
    
    if (totalTasksElement) totalTasksElement.textContent = stats.total_tasks;
    if (completedTasksElement) completedTasksElement.textContent = stats.completed_tasks;
    if (pendingTasksElement) pendingTasksElement.textContent = stats.pending_tasks;
    if (completionRateElement) {
        completionRateElement.textContent = `${stats.completion_rate}%`;
        // Update progress bar
        const rateFill = document.getElementById('completionRateFill');
        if (rateFill) rateFill.style.width = `${stats.completion_rate}%`;
    }
    if (todayTasksElement) todayTasksElement.textContent = stats.today_tasks;
    if (overdueTasksElement) overdueTasksElement.textContent = stats.overdue_tasks;
}

// Modal functions
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
        // Focus on first input
        const firstInput = modal.querySelector('input');
        if (firstInput) firstInput.focus();
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
    let errorElement = document.getElementById('taskError');
    if (!errorElement) {
        errorElement = document.createElement('div');
        errorElement.id = 'taskError';
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

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}-notification`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">${type === 'warning' ? '⚠️' : 'ℹ️'}</span>
            <span class="notification-text">${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 5000);
}

// Clear all completed tasks
async function clearCompletedTasks() {
    try {
        const response = await fetch(TASK_API.getTasks);
        const data = await response.json();
        
        if (data.error) throw new Error(data.error);
        
        const completedTasks = data.tasks.filter(task => task.completed);
        
        if (completedTasks.length === 0) {
            showNotification('No completed tasks to clear!', 'info');
            return;
        }
        
        if (!confirm(`Clear ${completedTasks.length} completed task(s)?`)) {
            return;
        }
        
        // Delete all completed tasks
        for (const task of completedTasks) {
            await fetch(TASK_API.deleteTask(task.task_id), {
                method: 'DELETE'
            });
        }
        
        // Reload tasks
        await loadTasks();
        await loadTaskStats();
        
        showSuccess(`Cleared ${completedTasks.length} completed task(s)!`);
        
    } catch (error) {
        console.error('Error clearing completed tasks:', error);
        showError('Failed to clear completed tasks');
    }
}

// Export functions for global access
window.TaskTracker = {
    initialize: initializeTaskTracker,
    openModal: openModal,
    closeModal: closeModal,
    clearCompletedTasks: clearCompletedTasks,
    showAddTaskModal: showAddTaskModal
};

// Auto-initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('taskList')) {
        initializeTaskTracker();
    }
    
    
});


// Format time for display
function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
        return `${minutes}m ${secs}s`;
    } else {
        return `${secs}s`;
    }
}

// Debounce function for performance
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Throttle function for performance
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}


// Save task order (for drag and drop if implemented later)
function saveTaskOrder(tasks) {
    try {
        const taskIds = tasks.map(task => task.task_id);
        localStorage.setItem('taskOrder', JSON.stringify(taskIds));
    } catch (e) {
        console.warn('Could not save task order to localStorage:', e);
    }
}

// Load task order
function loadTaskOrder() {
    try {
        const order = localStorage.getItem('taskOrder');
        return order ? JSON.parse(order) : null;
    } catch (e) {
        console.warn('Could not load task order from localStorage:', e);
        return null;
    }
}

// Export data as JSON
function exportTasks() {
    fetch(TASK_API.getTasks)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const blob = new Blob([JSON.stringify(data.tasks, null, 2)], {
                    type: 'application/json'
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `tasks_export_${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                showSuccess('Tasks exported successfully!');
            }
        })
        .catch(error => {
            console.error('Export failed:', error);
            showError('Failed to export tasks');
        });
}

// Import tasks from JSON
function importTasks(file) {
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const tasks = JSON.parse(e.target.result);
            
            if (!Array.isArray(tasks)) {
                throw new Error('Invalid file format');
            }
            
            // Ask for confirmation
            if (!confirm(`Import ${tasks.length} task(s)? This will add them to your existing tasks.`)) {
                return;
            }
            
            // Import each task
            for (const task of tasks) {
                await fetch(TASK_API.createTask, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        name: task.name || 'Imported Task',
                        description: task.description || '',
                        date: task.date || new Date().toISOString().split('T')[0]
                    })
                });
            }
            
            // Reload tasks
            await loadTasks();
            await loadTaskStats();
            
            showSuccess(`Successfully imported ${tasks.length} task(s)!`);
            
        } catch (error) {
            console.error('Import error:', error);
            showError('Failed to import tasks. Invalid file format.');
        }
    };
    reader.readAsText(file);
}



// Save task timers before page unload
window.addEventListener('beforeunload', function() {
    // Save active timers to localStorage
    const activeTimers = {};
    Object.entries(taskTimers).forEach(([taskId, timer]) => {
        if (timer.endTime > Date.now()) {
            activeTimers[taskId] = {
                endTime: timer.endTime,
                taskId: taskId
            };
        }
    });
    
    try {
        localStorage.setItem('activeTaskTimers', JSON.stringify(activeTimers));
    } catch (e) {
        console.warn('Could not save timers to localStorage:', e);
    }
});

// Restore timers on page load
document.addEventListener('DOMContentLoaded', function() {
    try {
        const savedTimers = localStorage.getItem('activeTaskTimers');
        if (savedTimers) {
            const timers = JSON.parse(savedTimers);
            Object.entries(timers).forEach(([taskId, timerData]) => {
                const timeLeft = timerData.endTime - Date.now();
                if (timeLeft > 0) {
                    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
                    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
                    startTaskTimer(parseInt(taskId), hours, minutes);
                }
            });
            // Clear saved timers
            localStorage.removeItem('activeTaskTimers');
        }
    } catch (e) {
        console.warn('Could not restore timers from localStorage:', e);
    }
});

