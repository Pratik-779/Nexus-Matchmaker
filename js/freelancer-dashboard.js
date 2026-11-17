/**
 * Nexus Matchmaker - Freelancer Dashboard
 * Open creator hirings, applications, creators directory, chat and tasks.
 */

const API_URL = 'http://localhost:5000/api';

let socket = null;
let currentUser = null;
let activeGigs = [];
let currentGig = null;
let allJobs = [];
let allCreators = [];

// ------------------------------------------------------------
// Auth & boot
// ------------------------------------------------------------
function checkAuth() {
    const userStr = localStorage.getItem('nexus_user');
    if (!userStr) {
        window.location.href = 'index.html';
        return;
    }

    currentUser = JSON.parse(userStr);

    if (currentUser.userType !== 'freelancer') {
        window.location.href = 'creator-dashboard.html';
        return;
    }

    document.getElementById('userName').textContent = `Welcome, ${currentUser.name}`;

    loadProfile();
    setupProfileEditing();
    initSocket();
    loadActiveGigs();
    loadPendingOffers();
    loadCreators();
    fetchJobs();
}

function loadProfile() {
    document.getElementById('profileName').textContent = currentUser.name || 'Freelancer';
    document.getElementById('profileRole').textContent = currentUser.role || 'Add your role';
    document.getElementById('profileExp').textContent = `Experience: ${currentUser.experience || 'Add experience'}`;

    const skillsDiv = document.getElementById('profileSkills');
    skillsDiv.innerHTML = (currentUser.skills || [])
        .map(skill => `<span class="skill-tag">${escapeHtml(skill)}</span>`)
        .join('') || '<span style="color: var(--text-muted); font-size: 0.8rem;">Add skills to your profile</span>';

    const isAvailable = currentUser.isAvailable !== false;
    document.getElementById('statusSwitch').checked = isAvailable;
    updateStatusText(isAvailable);
}

function setupProfileEditing() {
    const fields = [
        { elementId: 'profileName', field: 'name', fallback: 'Freelancer' },
        { elementId: 'profileRole', field: 'role', fallback: 'Add your role' },
        { elementId: 'profileExp', field: 'experience', fallback: 'Add experience', prefix: 'Experience: ' }
    ];

    fields.forEach(({ elementId, field, fallback, prefix = '' }) => {
        const element = document.getElementById(elementId);

        element.addEventListener('blur', async () => {
            const rawValue = String(element.textContent || '').trim();
            const value = prefix && rawValue.toLowerCase().startsWith(prefix.toLowerCase())
                ? rawValue.slice(prefix.length).trim()
                : rawValue;

            if (!value || value === fallback || value === currentUser[field]) {
                element.textContent = `${prefix}${currentUser[field] || fallback}`;
                return;
            }

            try {
                const response = await fetch(`${API_URL}/users/${currentUser._id}/profile`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ [field]: value })
                });

                if (!response.ok) throw new Error('Could not update profile');

                currentUser[field] = value;
                localStorage.setItem('nexus_user', JSON.stringify(currentUser));

                if (field === 'name') {
                    document.getElementById('userName').textContent = `Welcome, ${currentUser.name}`;
                }

                element.textContent = `${prefix}${value}`;
                showToast('Profile updated');
            } catch (error) {
                console.error('Error updating profile:', error);
                element.textContent = `${prefix}${currentUser[field] || fallback}`;
                showToast('Profile could not be saved');
            }
        });
    });
}

function initSocket() {
    socket = io('http://localhost:5000');

    socket.on('connect', () => {
        console.log('🔌 Connected to server');
        socket.emit('joinFreelancerRoom', currentUser._id);
    });

    socket.on('taskUpdate', async (data) => {
        if (!currentGig || data.freelancerId !== currentUser._id) return;

        await loadActiveGigs();
        const updated = activeGigs.find(g => g._id === currentGig._id);

        if (updated && document.getElementById('kanbanModal').style.display === 'block') {
            currentGig = updated;
            loadGigTasks(updated);
        }
    });

    socket.on('newHireOffer', async () => {
        await loadPendingOffers();
        showToast('🎉 You have a new hire offer! Check Hire Offers below.');
    });

    socket.on('hireAccepted', async () => {
        await loadActiveGigs();
        showToast('🎉 Collaboration is now active!');
    });

    socket.on('freelancerUnhired', async () => {
        await Promise.all([loadActiveGigs(), loadPendingOffers()]);
        showToast('⚠️ You have been removed from a collaboration.');
    });

    socket.on('newJob', () => {
        fetchJobs();
    });

    socket.on('newUser', (payload) => {
        if (payload?.userType === 'creator') {
            loadCreators();
        }
    });

    socket.on('newMessage', (messageData) => {
        if (messageData?.senderId !== currentUser._id) {
            showToast(`💬 New message from ${messageData.senderName || 'a creator'}`);
        }
    });
}

// ------------------------------------------------------------
// Active gigs (hired collaborations)
// ------------------------------------------------------------
async function loadActiveGigs() {
    try {
        const response = await fetch(`${API_URL}/collaborations/freelancer/${currentUser._id}`);
        const data = await response.json();
        // Only active collaborations go in the gigs section
        activeGigs = (data.collaborations || []).filter(c => c.status === 'active');

        renderActiveGigs();
        updateStats();
    } catch (error) {
        console.error('Error loading active gigs:', error);
    }
}

let pendingOffers = [];

async function loadPendingOffers() {
    try {
        const response = await fetch(`${API_URL}/collaborations/pending/freelancer/${currentUser._id}`);
        const data = await response.json();
        pendingOffers = data.offers || [];
        renderPendingOffers();
    } catch (error) {
        console.error('Error loading pending offers:', error);
    }
}

function renderPendingOffers() {
    const container = document.getElementById('pendingOffers');
    if (!container) return;

    if (pendingOffers.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted);">No pending hire offers right now.</p>';
        return;
    }

    container.innerHTML = '';

    pendingOffers.forEach(offer => {
        const creator = offer.creator || {};
        const card = document.createElement('div');
        card.className = 'gig-card';
        card.style.borderColor = '#facc15';

        card.innerHTML = `
            <h4 style="color: var(--text); margin-bottom: 5px;">
                ${escapeHtml(creator.name || 'Creator')}
                <span style="display:inline-block;margin-left:6px;padding:2px 8px;border-radius:20px;background:rgba(250,204,21,0.18);color:#facc15;font-size:0.65rem;font-weight:800;">⏳ OFFER</span>
            </h4>
            <p style="color: var(--primary); font-size: 0.9rem; margin-bottom: 4px;">${escapeHtml(creator.channelName || 'Content Creator')}</p>
            <p class="meta-line">${escapeHtml(offer.jobTitle || 'Direct hire offer')}</p>
            <p style="color: var(--text-muted); font-size: 0.8rem; margin-top: 8px;">
                Offered on ${formatDate(offer.offeredAt)}
            </p>
            <div class="card-actions" style="margin-top: 14px;">
                <button onclick="respondToOffer('${offer._id}', true)" style="background: var(--success);">✔ Accept</button>
                <button onclick="respondToOffer('${offer._id}', false)" style="background: #ef4444;">✖ Decline</button>
            </div>
        `;

        container.appendChild(card);
    });
}

async function respondToOffer(collabId, accept) {
    const action = accept ? 'accept' : 'decline';
    if (!confirm(`Are you sure you want to ${action} this hire offer?`)) return;

    try {
        const response = await fetch(`${API_URL}/collaborations/${collabId}/respond`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accept, freelancerId: currentUser._id })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.error || 'Could not respond to offer');
            return;
        }

        showToast(accept ? '🎉 Hire accepted! You are now active on this collaboration.' : '❌ Hire offer declined.');
        await Promise.all([loadActiveGigs(), loadPendingOffers()]);
    } catch (error) {
        console.error('Error responding to offer:', error);
        alert('Server error. Please try again.');
    }
}

async function leaveCollaboration(collabId) {
    if (!confirm('Are you sure you want to leave this collaboration? The creator will be notified.')) return;

    try {
        const response = await fetch(`${API_URL}/collaborations/${collabId}/respond`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accept: false, freelancerId: currentUser._id })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.error || 'Could not leave collaboration');
            return;
        }

        showToast('⚠️ You have left the collaboration. The creator has been notified.');
        await loadActiveGigs();
    } catch (error) {
        console.error('Error leaving collaboration:', error);
        alert('Server error. Please try again.');
    }
}

function renderActiveGigs() {
    const container = document.getElementById('activeGigs');

    if (activeGigs.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted); grid-column: 1 / -1;">No active gigs yet. Apply to an open creator hiring below!</p>';
        return;
    }

    container.innerHTML = '';

    activeGigs.forEach(gig => {
        const creator = gig.creator || {};
        const tasks = gig.tasks || { todo: [], inprogress: [], done: [] };
        const todoCount = tasks.todo?.length || 0;
        const inProgressCount = tasks.inprogress?.length || 0;
        const doneCount = tasks.done?.length || 0;

        const card = document.createElement('div');
        card.className = 'gig-card';

        card.innerHTML = `
            <h4 style="color: var(--text); margin-bottom: 5px;">${escapeHtml(creator.name)}</h4>
            <p style="color: var(--primary); font-size: 0.9rem; margin-bottom: 4px;">${escapeHtml(creator.channelName || 'Content Creator')}</p>
            <p class="meta-line">${escapeHtml(gig.jobTitle || 'Hired collaboration')}</p>

            <div class="work-summary">
                <div class="work-stat" style="background: rgba(250, 204, 21, 0.2);">
                    <div class="number">${todoCount}</div>
                    <div class="label">To Do</div>
                </div>
                <div class="work-stat" style="background: rgba(96, 165, 250, 0.2);">
                    <div class="number">${inProgressCount}</div>
                    <div class="label">In Progress</div>
                </div>
                <div class="work-stat" style="background: rgba(16, 185, 129, 0.2);">
                    <div class="number">${doneCount}</div>
                    <div class="label">Done</div>
                </div>
            </div>

            <div class="card-actions">
                <button onclick="openKanbanById('${gig._id}')">📋 Tasks</button>
                <button class="secondary" onclick="openChat('${gig.chatId}')">💬 Chat</button>
                <button onclick="leaveCollaboration('${gig._id}')" style="background:#ef4444;">🚪 Leave</button>
            </div>
        `;

        container.appendChild(card);
    });
}

// ------------------------------------------------------------
// Creators directory
// ------------------------------------------------------------
async function loadCreators() {
    try {
        const response = await fetch(`${API_URL}/creators`);
        const data = await response.json();
        allCreators = data.creators || [];
        renderCreators();
    } catch (error) {
        console.error('Error loading creators:', error);
        document.getElementById('creatorsList').innerHTML =
            '<p style="color: #ef4444; grid-column: 1 / -1;">Could not load creators. Is the server running?</p>';
    }
}

function renderCreators() {
    const container = document.getElementById('creatorsList');

    if (allCreators.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted); grid-column: 1 / -1;">No creators on the platform yet.</p>';
        return;
    }

    container.innerHTML = '';

    allCreators.forEach(creator => {
        const card = document.createElement('div');
        card.className = 'gig-card';

        const subscribers = Number(creator.subscriberCount) || 0;
        const subscriberLabel = subscribers >= 1000000
            ? `${(subscribers / 1000000).toFixed(1)}M`
            : subscribers >= 1000
                ? `${Math.round(subscribers / 1000)}K`
                : String(subscribers);

        card.innerHTML = `
            <h4 style="color: var(--text); margin-bottom: 5px;">
                ${escapeHtml(creator.name)}
                ${isRecentlyCreated(creator) ? '<span class="new-badge">NEW</span>' : ''}
            </h4>
            <p style="color: var(--primary); font-size: 0.9rem; margin-bottom: 4px;">${escapeHtml(creator.channelName || 'Content Creator')}</p>
            <p class="meta-line">${escapeHtml(creator.platform || 'Creator')} • ${subscriberLabel} followers</p>
            <p style="color: var(--text-muted); font-size: 0.8rem; margin-top: 8px;">${escapeHtml(creator.contentType || 'Content creation')}</p>
            <div class="card-actions">
                <button class="secondary" onclick="scrollToJobs()">🔍 View Jobs</button>
                <button onclick="messageCreator('${creator._id}')">💬 Message</button>
            </div>
        `;

        container.appendChild(card);
    });
}

function messageCreator(creatorId) {
    window.location.href = `chat.html?with=${encodeURIComponent(creatorId)}`;
}

function openChat(chatId) {
    if (!chatId) return;
    window.location.href = `chat.html?chat=${encodeURIComponent(chatId)}`;
}

function scrollToJobs() {
    document.getElementById('jobFeed').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ------------------------------------------------------------
// Open jobs / applications
// ------------------------------------------------------------
async function fetchJobs() {
    try {
        const response = await fetch(`${API_URL}/jobs?status=open&freelancerId=${encodeURIComponent(currentUser._id)}`);
        const data = await response.json();
        allJobs = data.jobs || [];

        renderJobs(allJobs, document.getElementById('sortJobs')?.value || 'match');
        updateStats();
    } catch (error) {
        console.error('Error fetching jobs:', error);
        document.getElementById('jobFeed').innerHTML =
            '<p style="color: #ef4444;">Could not load jobs. Is the server running?</p>';
    }
}

function renderJobs(jobs, sortType) {
    const RELEVANT_THRESHOLD = 70;

    const sorted = [...jobs].sort((a, b) => {
        return sortType === 'budget'
            ? (Number(b.budget) || 0) - (Number(a.budget) || 0)
            : (Number(b.matchScore) || 0) - (Number(a.matchScore) || 0);
    });

    const bestMatches = sorted.filter(j => (Number(j.matchScore) || 0) >= RELEVANT_THRESHOLD);
    const others = sorted.filter(j => (Number(j.matchScore) || 0) < RELEVANT_THRESHOLD);

    const container = document.getElementById('jobFeed');
    container.innerHTML = '';

    if (sorted.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted);">No open creator hirings right now. Check back soon!</p>';
        return;
    }

    function buildJobCard(job) {
        const skills = (job.requiredSkills || [])
            .map(skill => `<span class="skill-tag">${escapeHtml(skill)}</span>`)
            .join('');

        const card = document.createElement('div');
        card.className = 'job-card';

        card.innerHTML = `
            <div class="job-card-top">
                <div class="job-card-main">
                    <h4>${escapeHtml(job.title)}</h4>
                    <p style="font-size: 0.88rem; margin-top: 4px;">
                        By: ${escapeHtml(job.creatorName)}
                        ${job.channelName ? ` • ${escapeHtml(job.channelName)}` : ''}
                        • <strong style="color: var(--primary);">${Number(job.matchScore) || 0}% Match</strong>
                    </p>
                    <p class="job-description">${escapeHtml(job.description)}</p>
                    <div style="margin-top: 10px;">${skills}</div>
                </div>
                <div class="job-card-side">
                    <div class="budget-badge">$${Number(job.budget) || 0}</div>
                    ${job.hasApplied ? '<span class="applied-badge">✓ Applied</span>' : ''}
                    <div class="job-actions">
                        ${job.hasApplied
                            ? `<button onclick="messageCreator('${job.creator}')">💬 Message Creator</button>`
                            : `<button onclick="applyToJob('${job._id}')">Apply</button>`
                        }
                    </div>
                </div>
            </div>
        `;

        return card;
    }

    if (bestMatches.length > 0) {
        const header = document.createElement('div');
        header.style.cssText = 'grid-column: 1 / -1; margin: 10px 0 6px; padding: 8px 14px; background: rgba(16,185,129,0.12); border-left: 3px solid var(--success); border-radius: 6px;';
        header.innerHTML = `<strong style="color: var(--success);">⭐ Best Matches for You</strong> <span style="color: var(--text-muted); font-size: 0.8rem;">(${bestMatches.length} job${bestMatches.length !== 1 ? 's' : ''} with ≥${RELEVANT_THRESHOLD}% match)</span>`;
        container.appendChild(header);
        bestMatches.forEach(job => container.appendChild(buildJobCard(job)));
    }

    if (others.length > 0) {
        const header = document.createElement('div');
        header.style.cssText = 'grid-column: 1 / -1; margin: 18px 0 6px; padding: 8px 14px; background: rgba(139,92,246,0.1); border-left: 3px solid var(--primary); border-radius: 6px;';
        header.innerHTML = `<strong style="color: var(--primary);">📋 Other Opportunities</strong> <span style="color: var(--text-muted); font-size: 0.8rem;">(${others.length} more job${others.length !== 1 ? 's' : ''})</span>`;
        container.appendChild(header);
        others.forEach(job => container.appendChild(buildJobCard(job)));
    }
}

document.getElementById('sortJobs').addEventListener('change', (event) => {
    renderJobs(allJobs, event.target.value);
});

async function applyToJob(jobId) {
    try {
        const response = await fetch(`${API_URL}/jobs/${jobId}/apply`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ freelancerId: currentUser._id })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.error || 'Could not apply to this job');
            await fetchJobs();
            return;
        }

        alert('✅ Application submitted! You can now message the creator.');

        await fetchJobs();

        if (data.chatId && confirm('Message the creator now?')) {
            openChat(data.chatId);
        }
    } catch (error) {
        console.error('Error applying to job:', error);
        alert('Server error. Please try again.');
    }
}

// ------------------------------------------------------------
// Stats
// ------------------------------------------------------------
function updateStats() {
    let totalTasks = 0;
    let completedTasks = 0;
    let inProgressTasks = 0;

    activeGigs.forEach(gig => {
        const tasks = gig.tasks || { todo: [], inprogress: [], done: [] };
        totalTasks += (tasks.todo?.length || 0) + (tasks.inprogress?.length || 0) + (tasks.done?.length || 0);
        completedTasks += tasks.done?.length || 0;
        inProgressTasks += tasks.inprogress?.length || 0;
    });

    const totalApplications = allJobs.filter(job => job.hasApplied).length;

    document.getElementById('totalGigs').textContent = activeGigs.length;
    document.getElementById('totalApplications').textContent = totalApplications;
    document.getElementById('totalTasks').textContent = totalTasks;
    document.getElementById('completedTasks').textContent = completedTasks;
    document.getElementById('inProgressTasks').textContent = inProgressTasks;
}

// ------------------------------------------------------------
// Kanban board
// ------------------------------------------------------------
function openKanbanById(gigId) {
    const gig = activeGigs.find(g => g._id === gigId);
    if (!gig) return;

    currentGig = gig;

    document.getElementById('modalGigTitle').textContent = `Working for ${gig.creator?.name || 'Creator'}`;
    document.getElementById('modalCreatorName').textContent = gig.creator?.channelName || 'Content Creator';

    loadGigTasks(gig);
    document.getElementById('kanbanModal').style.display = 'block';
}

function loadGigTasks(gig) {
    const tasks = gig.tasks || { todo: [], inprogress: [], done: [] };

    ['modal-todo', 'modal-inprogress', 'modal-done'].forEach(colId => {
        const col = document.getElementById(colId);
        Array.from(col.children).forEach(child => {
            if (child.classList.contains('k-task')) col.removeChild(child);
        });
    });

    renderTasksInColumn('modal-todo', tasks.todo || []);
    renderTasksInColumn('modal-inprogress', tasks.inprogress || []);
    renderTasksInColumn('modal-done', tasks.done || []);
}

function renderTasksInColumn(columnId, tasks) {
    const column = document.getElementById(columnId);

    tasks.forEach((task, index) => {
        const taskEl = document.createElement('div');
        taskEl.className = 'k-task';
        taskEl.id = `task_${columnId}_${index}`;
        taskEl.draggable = true;
        taskEl.ondragstart = drag;

        taskEl.innerHTML = `
            <strong>${escapeHtml(task.title)}</strong>
            ${task.description ? `<p style="font-size: 0.85rem; margin-top: 5px; color: var(--text-muted);">${escapeHtml(task.description)}</p>` : ''}
            <p style="font-size: 0.75rem; margin-top: 5px; color: var(--text-muted);">Due: ${formatDate(task.createdAt)}</p>
        `;

        column.appendChild(taskEl);
    });
}

function closeKanban() {
    document.getElementById('kanbanModal').style.display = 'none';
    currentGig = null;
    loadActiveGigs();
}

function allowDrop(ev) {
    ev.preventDefault();
}

function drag(ev) {
    ev.dataTransfer.setData('text', ev.target.id);
    ev.target.style.opacity = '0.5';
}

async function drop(ev) {
    ev.preventDefault();
    const taskId = ev.dataTransfer.getData('text');
    const taskElement = document.getElementById(taskId);
    if (!taskElement) return;

    taskElement.style.opacity = '1';

    let dropTarget = ev.target;
    while (dropTarget && !dropTarget.classList.contains('k-column')) {
        dropTarget = dropTarget.parentElement;
    }
    if (!dropTarget || !dropTarget.classList.contains('k-column')) return;

    const fromColumnEl = taskElement.parentElement;
    const fromColumn = fromColumnEl.id.replace('modal-', '');
    const toColumn = dropTarget.id.replace('modal-', '');
    if (fromColumn === toColumn) return;

    if (!currentGig) return;
    if (!currentGig.tasks) currentGig.tasks = { todo: [], inprogress: [], done: [] };
    if (!currentGig.tasks[fromColumn] || !currentGig.tasks[toColumn]) return;

    const taskIndex = Array.from(fromColumnEl.querySelectorAll('.k-task')).indexOf(taskElement);
    if (taskIndex === -1) return;

    const task = currentGig.tasks[fromColumn].splice(taskIndex, 1)[0];
    currentGig.tasks[toColumn].push(task);

    dropTarget.appendChild(taskElement);

    await saveCollaboration();

    if (socket) {
        socket.emit('taskMoved', {
            freelancerId: currentUser._id,
            creatorId: currentGig.creator?._id,
            fromColumn,
            toColumn,
            task
        });
    }
}

async function saveCollaboration() {
    if (!currentGig) return;

    try {
        const response = await fetch(`${API_URL}/collaborations/${currentGig._id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tasks: currentGig.tasks })
        });

        if (!response.ok) throw new Error('Could not save tasks');

        await loadActiveGigs();

        const updated = activeGigs.find(g => g._id === currentGig._id);
        if (updated) {
            currentGig = updated;
            loadGigTasks(updated);
        }
        updateStats();
    } catch (error) {
        console.error('Error saving tasks:', error);
        alert('Tasks could not be saved. Please try again.');
    }
}

// ------------------------------------------------------------
// Availability
// ------------------------------------------------------------
document.getElementById('statusSwitch').addEventListener('change', async (event) => {
    const isAvailable = event.target.checked;
    updateStatusText(isAvailable);

    try {
        const response = await fetch(`${API_URL}/users/${currentUser._id}/availability`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isAvailable })
        });

        if (!response.ok) throw new Error('Could not update availability');

        currentUser.isAvailable = isAvailable;
        localStorage.setItem('nexus_user', JSON.stringify(currentUser));
    } catch (error) {
        console.error('Error updating availability:', error);
        event.target.checked = !isAvailable;
        updateStatusText(!isAvailable);
    }
});

function updateStatusText(isAvailable) {
    const statusText = document.getElementById('statusText');
    statusText.textContent = isAvailable ? 'Available for Hire' : 'Currently Booked';
    statusText.style.color = isAvailable ? 'var(--success)' : 'var(--text-muted)';
}

// ------------------------------------------------------------
// Utilities
// ------------------------------------------------------------
function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function isRecentlyCreated(user) {
    const created = new Date(user?.createdAt || 0).getTime();
    return Boolean(created) && (Date.now() - created) < 7 * 86400000;
}

function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'today';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

let toastTimer = null;
function showToast(message) {
    let toast = document.getElementById('nexusToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'nexusToast';
        toast.style.cssText = 'position:fixed;right:24px;bottom:24px;z-index:2000;background:var(--surface);border:1px solid var(--primary);color:var(--text);padding:12px 18px;border-radius:10px;box-shadow:0 12px 30px rgba(0,0,0,.35);font-size:.85rem;max-width:320px;';
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.style.display = 'block';

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.style.display = 'none';
    }, 3500);
}

function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}

checkAuth();
