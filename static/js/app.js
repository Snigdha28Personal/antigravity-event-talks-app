/**
 * BigQuery Release Radar - Client Application Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // Application State
    const state = {
        allNotes: [],
        visibleNotes: [],
        activeTag: 'ALL',
        searchTerm: '',
        sortBy: 'newest',
        selectedNote: null,
        activeHashtags: new Set(['#BigQuery', '#GoogleCloud']),
        isRefreshing: false
    };

    // DOM Elements
    const elements = {
        refreshBtn: document.getElementById('refreshBtn'),
        refreshIcon: document.getElementById('refreshIcon'),
        refreshSpinner: document.getElementById('refreshSpinner'),
        lastUpdatedText: document.getElementById('lastUpdatedText'),
        searchInput: document.getElementById('searchInput'),
        clearSearchBtn: document.getElementById('clearSearchBtn'),
        tagFilters: document.getElementById('tagFilters'),
        sortSelect: document.getElementById('sortSelect'),
        notesContainer: document.getElementById('notesContainer'),
        visibleCount: document.getElementById('visibleCount'),
        totalCount: document.getElementById('totalCount'),
        exportCsvBtn: document.getElementById('exportCsvBtn'),
        
        // Modal Elements
        tweetModal: document.getElementById('tweetModal'),
        closeModalBtn: document.getElementById('closeModalBtn'),
        modalNoteTitle: document.getElementById('modalNoteTitle'),
        modalNoteDate: document.getElementById('modalNoteDate'),
        tweetTextarea: document.getElementById('tweetTextarea'),
        charCount: document.getElementById('charCount'),
        charCounter: document.getElementById('charCounter'),
        copyTweetBtn: document.getElementById('copyTweetBtn'),
        postTweetBtn: document.getElementById('postTweetBtn'),
        toastContainer: document.getElementById('toastContainer')
    };

    // Initialize Application
    init();

    function init() {
        bindEvents();
        fetchNotes();
    }

    function bindEvents() {
        // Refresh Button
        elements.refreshBtn.addEventListener('click', () => {
            if (!state.isRefreshing) {
                fetchNotes();
            }
        });

        // Search Input
        elements.searchInput.addEventListener('input', (e) => {
            state.searchTerm = e.target.value.trim().toLowerCase();
            if (state.searchTerm.length > 0) {
                elements.clearSearchBtn.classList.remove('hidden');
            } else {
                elements.clearSearchBtn.classList.add('hidden');
            }
            renderNotes();
        });

        elements.clearSearchBtn.addEventListener('click', () => {
            elements.searchInput.value = '';
            state.searchTerm = '';
            elements.clearSearchBtn.classList.add('hidden');
            renderNotes();
        });

        // Tag Filter Pills
        elements.tagFilters.addEventListener('click', (e) => {
            const pill = e.target.closest('.filter-pill');
            if (!pill) return;

            document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            state.activeTag = pill.getAttribute('data-tag');
            renderNotes();
        });

        // Sort Select
        elements.sortSelect.addEventListener('change', (e) => {
            state.sortBy = e.target.value;
            renderNotes();
        });

        // Export CSV Button
        if (elements.exportCsvBtn) {
            elements.exportCsvBtn.addEventListener('click', exportToCSV);
        }

        // Tweet Modal Actions
        elements.closeModalBtn.addEventListener('click', closeModal);
        elements.tweetModal.addEventListener('click', (e) => {
            if (e.target === elements.tweetModal) closeModal();
        });

        elements.tweetTextarea.addEventListener('input', updateCharCount);

        // Hashtag Toggles
        document.querySelectorAll('.hashtag-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tag = btn.getAttribute('data-tag');
                if (state.activeHashtags.has(tag)) {
                    state.activeHashtags.delete(tag);
                    btn.classList.remove('active');
                } else {
                    state.activeHashtags.add(tag);
                    btn.classList.add('active');
                }
                rebuildTweetText();
            });
        });

        // Copy Tweet
        elements.copyTweetBtn.addEventListener('click', () => {
            const text = elements.tweetTextarea.value;
            navigator.clipboard.writeText(text).then(() => {
                showToast('Copied Tweet to clipboard!', 'success');
            }).catch(() => {
                showToast('Failed to copy text', 'error');
            });
        });

        // Post Tweet to X
        elements.postTweetBtn.addEventListener('click', () => {
            const tweetText = elements.tweetTextarea.value;
            const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
            window.open(intentUrl, '_blank', 'width=600,height=450,resizable=yes,scrollbars=yes');
            showToast('Opened X / Twitter composer window!', 'info');
            closeModal();
        });
    }

    async function fetchNotes() {
        setLoadingState(true);
        try {
            const response = await fetch('/api/release-notes');
            const data = await response.json();

            if (data.status === 'success' || data.notes) {
                state.allNotes = data.notes || [];
                const updatedTime = data.timestamp || new Date().toLocaleTimeString();
                elements.lastUpdatedText.textContent = `Updated: ${updatedTime}`;
                showToast(`Loaded ${state.allNotes.length} release updates`, 'success');
            } else {
                showToast('Could not sync RSS feed, displaying saved updates.', 'warning');
            }
        } catch (err) {
            console.error('API Error:', err);
            showToast('Error connecting to backend API', 'error');
        } finally {
            setLoadingState(false);
            renderNotes();
        }
    }

    function setLoadingState(isLoading) {
        state.isRefreshing = isLoading;
        if (isLoading) {
            elements.refreshIcon.classList.add('hidden');
            elements.refreshSpinner.classList.remove('hidden');
            elements.refreshBtn.classList.add('disabled');
            
            // Show Skeleton Loader
            elements.notesContainer.innerHTML = `
                <div class="skeleton-card">
                    <div class="skeleton-header"></div>
                    <div class="skeleton-title"></div>
                    <div class="skeleton-body"></div>
                </div>
                <div class="skeleton-card">
                    <div class="skeleton-header"></div>
                    <div class="skeleton-title"></div>
                    <div class="skeleton-body"></div>
                </div>
            `;
        } else {
            elements.refreshIcon.classList.remove('hidden');
            elements.refreshSpinner.classList.add('hidden');
            elements.refreshBtn.classList.remove('disabled');
        }
    }

    function renderNotes() {
        // Filter Notes
        let filtered = state.allNotes.filter(note => {
            // Tag filter
            const matchesTag = state.activeTag === 'ALL' || (note.tags && note.tags.includes(state.activeTag));
            
            // Search filter
            const query = state.searchTerm;
            const matchesSearch = !query || 
                note.title.toLowerCase().includes(query) || 
                note.text_content.toLowerCase().includes(query) ||
                note.date.toLowerCase().includes(query);

            return matchesTag && matchesSearch;
        });

        // Sort Notes
        filtered.sort((a, b) => {
            const dateA = new Date(a.raw_date || a.date);
            const dateB = new Date(b.raw_date || b.date);
            if (isNaN(dateA) || isNaN(dateB)) return 0;
            return state.sortBy === 'newest' ? dateB - dateA : dateA - dateB;
        });

        state.visibleNotes = filtered;

        // Update counts
        elements.visibleCount.textContent = filtered.length;
        elements.totalCount.textContent = state.allNotes.length;

        // Render Cards
        if (filtered.length === 0) {
            elements.notesContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-filter-circle-xmark"></i>
                    <h3>No Release Notes Found</h3>
                    <p>Try adjusting your search terms or selecting a different filter pill.</p>
                </div>
            `;
            return;
        }

        elements.notesContainer.innerHTML = filtered.map(note => createNoteCardHTML(note)).join('');

        // Attach Card Action Listeners
        elements.notesContainer.querySelectorAll('.btn-tweet-action').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const noteId = e.currentTarget.getAttribute('data-id');
                const targetNote = state.allNotes.find(n => n.id === noteId);
                if (targetNote) openTweetModal(targetNote);
            });
        });

        elements.notesContainer.querySelectorAll('.btn-copy-action').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const noteId = e.currentTarget.getAttribute('data-id');
                const targetNote = state.allNotes.find(n => n.id === noteId);
                if (targetNote) {
                    const textToCopy = `📌 ${targetNote.title} (${targetNote.date})\n\n${targetNote.text_content}\n\n🔗 ${targetNote.link}`;
                    navigator.clipboard.writeText(textToCopy).then(() => {
                        showToast('Copied update details & link to clipboard!', 'success');
                    }).catch(() => {
                        showToast('Failed to copy text', 'error');
                    });
                }
            });
        });
    }

    function exportToCSV() {
        const notesToExport = state.visibleNotes.length > 0 ? state.visibleNotes : state.allNotes;
        if (notesToExport.length === 0) {
            showToast('No release notes available to export.', 'warning');
            return;
        }

        const headers = ['Date', 'Title', 'Categories', 'Link', 'Summary'];
        const csvRows = [headers.join(',')];

        notesToExport.forEach(note => {
            const dateStr = `"${(note.date || '').replace(/"/g, '""')}"`;
            const titleStr = `"${(note.title || '').replace(/"/g, '""')}"`;
            const tagsStr = `"${((note.tags || []).join('; ')).replace(/"/g, '""')}"`;
            const linkStr = `"${(note.link || '').replace(/"/g, '""')}"`;
            const summaryStr = `"${(note.text_content || '').replace(/\r?\n|\r/g, ' ').replace(/"/g, '""')}"`;

            csvRows.push([dateStr, titleStr, tagsStr, linkStr, summaryStr].join(','));
        });

        const csvContent = '\uFEFF' + csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        const filenameDate = new Date().toISOString().split('T')[0];
        link.setAttribute('download', `bigquery_release_notes_${filenameDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        showToast(`Exported ${notesToExport.length} updates to CSV file!`, 'success');
    }

    function createNoteCardHTML(note) {
        const primaryTag = note.tags && note.tags.length > 0 ? note.tags[0] : 'UPDATE';
        const tagBadgesHTML = (note.tags || []).map(t => `<span class="tag-badge ${t}">${t}</span>`).join(' ');

        return `
            <article class="note-card" id="${note.id}">
                <div class="note-header">
                    <div class="note-meta">
                        <span class="note-date"><i class="fa-regular fa-calendar-check"></i> ${note.date}</span>
                        ${tagBadgesHTML}
                    </div>
                </div>

                <h2 class="note-title">
                    <a href="${note.link}" target="_blank" rel="noopener">${escapeHTML(note.title)}</a>
                </h2>

                <div class="note-body">
                    ${note.html_content}
                </div>

                <div class="note-actions">
                    <div class="action-left">
                        <button class="btn btn-x btn-sm btn-tweet-action" data-id="${note.id}">
                            <i class="fa-brands fa-x-twitter"></i> Tweet about this
                        </button>
                        <button class="btn btn-secondary btn-sm btn-copy-action" data-id="${note.id}">
                            <i class="fa-regular fa-copy"></i> Copy Link
                        </button>
                    </div>

                    <a href="${note.link}" target="_blank" rel="noopener" class="btn btn-secondary btn-sm">
                        <span>Read on GCP</span> <i class="fa-solid fa-arrow-up-right-from-square"></i>
                    </a>
                </div>
            </article>
        `;
    }

    function openTweetModal(note) {
        state.selectedNote = note;
        elements.modalNoteTitle.textContent = note.title;
        elements.modalNoteDate.textContent = note.date;
        
        rebuildTweetText();
        
        elements.tweetModal.classList.remove('hidden');
    }

    function rebuildTweetText() {
        if (!state.selectedNote) return;

        const note = state.selectedNote;
        let textSummary = note.text_content || note.title;
        if (textSummary.length > 140) {
            textSummary = textSummary.substring(0, 137) + '...';
        }

        const tagsArray = Array.from(state.activeHashtags).join(' ');
        const tweetMessage = `🚀 BigQuery Update (${note.date}):\n${note.title}\n\n${textSummary}\n\n🔗 ${note.link}\n\n${tagsArray}`;

        elements.tweetTextarea.value = tweetMessage;
        updateCharCount();
    }

    function updateCharCount() {
        const len = elements.tweetTextarea.value.length;
        elements.charCount.textContent = len;

        elements.charCounter.className = 'char-count';
        if (len > 250 && len <= 280) {
            elements.charCounter.classList.add('warning');
        } else if (len > 280) {
            elements.charCounter.classList.add('exceeded');
        }
    }

    function closeModal() {
        elements.tweetModal.classList.add('hidden');
        state.selectedNote = null;
    }

    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        let icon = 'fa-circle-info';
        if (type === 'success') icon = 'fa-circle-check';
        if (type === 'error') icon = 'fa-circle-exclamation';
        if (type === 'warning') icon = 'fa-triangle-exclamation';

        toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${escapeHTML(message)}</span>`;
        elements.toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(50px)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }

    function escapeHTML(str) {
        if (!str) return '';
        return str.replace(/[&<>'"]/g, 
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag] || tag)
        );
    }
});
