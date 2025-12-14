// Journal page state
let entries = [];
let entriesPerPage = 1;
let currentPage = 0;
let totalPages = 1;
let editingId = null;

function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderPages() {
    const entriesContainer = document.getElementById('entries-container');
    entriesContainer.innerHTML = '';
    
    // Recalculate pages
    totalPages = Math.max(1, Math.ceil(entries.length / entriesPerPage));
    if (currentPage >= totalPages) currentPage = totalPages - 1;
    const start = currentPage * entriesPerPage;
    const pageItems = entries.slice(start, start + entriesPerPage);
    
    if (!pageItems.length) {
        entriesContainer.innerHTML = `
            <div class="journal-entry" style="text-align: center; padding: 40px;">
                <div style="font-size: 48px; margin-bottom: 20px;">📓</div>
                <h3 style="color: #5a3e28;">No journal entries yet</h3>
                <p style="color: #8b5a2b;">Write your first entry in the notebook above!</p>
            </div>
        `;
    } else {
        pageItems.forEach(entry => {
            const entryDiv = document.createElement('div');
            entryDiv.className = 'journal-entry';
            
            const date = entry.entry_date || entry.created_at?.split('T')[0] || 'Unknown date';
            
            let stickersHTML = '';
            if (entry.stickers && entry.stickers.length > 0) {
                stickersHTML = `
                    <div class="entry-stickers">
                        ${entry.stickers.map(sticker => 
                            `<img src="${sticker}" class="entry-sticker" alt="Sticker">`
                        ).join('')}
                    </div>
                `;
            }
            
            entryDiv.innerHTML = `
                <div class="entry-header">
                    <div class="entry-date">📅 ${date}</div>
                    <div class="entry-actions">
                        <button class="farm-btn" onclick="startEdit(${entry.journal_id})">
                            <span>✏️</span> Edit
                        </button>
                        <button class="farm-btn harvest-btn" onclick="deleteEntry(${entry.journal_id})">
                            <span>🗑️</span> Delete
                        </button>
                    </div>
                </div>
                <div class="entry-content">${escapeHtml(entry.content)}</div>
                ${stickersHTML}
            `;
            
            entriesContainer.appendChild(entryDiv);
        });
    }
    
    // Update pagination
    updateNav();
}

function updateNav() {
    const indicator = document.getElementById('page-indicator');
    const indicatorBottom = document.getElementById('page-indicator-bottom');
    const pageText = `Page ${currentPage + 1} of ${totalPages}`;
    
    if (indicator) indicator.textContent = pageText;
    if (indicatorBottom) indicatorBottom.textContent = pageText;
    
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    const prevBtnBottom = document.getElementById('prev-page-bottom');
    const nextBtnBottom = document.getElementById('next-page-bottom');
    
    if (prevBtn) prevBtn.disabled = currentPage === 0;
    if (nextBtn) nextBtn.disabled = currentPage >= totalPages - 1;
    if (prevBtnBottom) prevBtnBottom.disabled = currentPage === 0;
    if (nextBtnBottom) nextBtnBottom.disabled = currentPage >= totalPages - 1;
}

// Update form submission to include stickers from new interface
document.getElementById('journal-form')?.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    
    const content = document.getElementById('journal-content').value;
    const date = document.getElementById('journal-date').value;
    const imageInput = document.getElementById('image-upload');
    
    if (!content.trim()) {
        alert('Please write something in your journal entry!');
        return;
    }
    
    const payload = {
        content: content,
        entry_date: date || null,
        stickers: []
    };
    
    // Handle image upload if present
    if (imageInput.files && imageInput.files[0]) {
        try {
            const formData = new FormData();
            formData.append('image', imageInput.files[0]);
            
            const uploadResponse = await fetch('/api/journal/upload', {
                method: 'POST',
                body: formData
            });
            
            const uploadData = await uploadResponse.json();
            
            if (uploadData.success && uploadData.url) {
                payload.stickers.push(uploadData.url);
            }
        } catch (error) {
            console.error('Image upload failed:', error);
        }
    }
    
    // Send to server
    try {
        const response = await fetch(editingId ? `/api/journal/${editingId}` : '/api/journal', {
            method: editingId ? 'PUT' : 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Clear form
            document.getElementById('journal-content').value = '';
            document.getElementById('journal-date').value = '';
            imageInput.value = '';
                // image/sticker selection removed; uploaded image already sent to server
            editingId = null;
            
            // Refresh entries
            await fetchEntries();
            
            // Show success
            alert('Journal entry saved successfully! 📓');
        } else {
            alert(data.error || 'Failed to save entry');
        }
    } catch (error) {
        console.error('Error saving entry:', error);
        alert('Error saving entry. Please try again.');
    }
});

// Fetch entries for the journal page list
async function fetchEntries() {
    try {
        const res = await fetch('/api/journal');
        const data = await res.json();
        if (data.success) {
            entries = data.entries || [];
            currentPage = 0;
            renderPages();
        }
    } catch (e) { console.error('fetchEntries error', e); }
}

// Start editing an entry from the journal page (fills the add-entry form)
function startEdit(id) {
    const entry = entries.find(e => e.journal_id === id);
    if (!entry) return;
    editingId = id;
    const contentEl = document.getElementById('journal-content');
    const dateEl = document.getElementById('journal-date');
    if (contentEl) contentEl.value = entry.content || '';
    if (dateEl) dateEl.value = entry.entry_date || (entry.created_at && entry.created_at.split('T')[0]) || '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Delete entry (used on journal page)
async function deleteEntry(id) {
    if (!confirm('Delete this entry?')) return;
    try {
        const res = await fetch(`/api/journal/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
            await fetchEntries();
        } else {
            alert(data.error || 'Failed to delete');
        }
    } catch (e) { console.error(e); }
}

// Pagination buttons
document.getElementById('prev-page')?.addEventListener('click', () => { if (currentPage>0) { currentPage--; renderPages(); } });
document.getElementById('next-page')?.addEventListener('click', () => { if (currentPage<totalPages-1) { currentPage++; renderPages(); } });
document.getElementById('prev-page-bottom')?.addEventListener('click', () => { if (currentPage>0) { currentPage--; renderPages(); } });
document.getElementById('next-page-bottom')?.addEventListener('click', () => { if (currentPage<totalPages-1) { currentPage++; renderPages(); } });

// Auto-initialize if on the journal page
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('entries-container')) fetchEntries();
});
