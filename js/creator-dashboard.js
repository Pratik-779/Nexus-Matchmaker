/**
 * Nexus Matchmaker - Creator Dashboard
 * Hired freelancers, applications, discovery, chat and task management.
 */

const API_URL = 'http://localhost:5000/api';

let socket = null;
let currentUser = null;
let hiredFreelancers = [];
let allFreelancers = [];
let applications = [];
let myJobs = [];
let currentCollab = null;

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

    if (currentUser.userType !== 'creator') {
        window.location.href = 'freelancer-dashboard.html';
        return;
    }

    document.getElementById('userName').textContent = `Welcome, ${currentUser.name}`;

    initSocket();
    loadHiredFreelancers();
    loadApplications();
    loadAllFreelancers();
    loadMyJobs();
}

function initSocket() {
    socket = io('http://localhost:5000');

    socket.on('connect', () => {
        console.log('🔌 Connected to server');
        socket.emit('joinCreatorRoom', currentUser._id);
    });

    socket.on('taskUpdate', async (data) => {
        if (!currentCollab || data.freelancerId !== currentCollab.freelancer._id) return;

        await loadHiredFreelancers();
        const updated = hiredFreelancers.find(c => c._id === currentCollab._id);

        if (updated && document.getElementById('kanbanModal').style.display === 'block') {
            currentCollab = updated;
            loadFreelancerTasks(updated);
        }
    });

    socket.on('newApplication', () => {
        loadApplications();
        loadMyJobs();
    });

    socket.on('newUser', (payload) => {
        if (payload?.userType === 'freelancer') {
            loadAllFreelancers();
        }
    });

    socket.on('newMessage', (messageData) => {
        // A small live hint while the creator is on the dashboard.
        if (messageData?.senderId !== currentUser._id) {
            showToast(`💬 New message from ${messageData.senderName || 'a freelancer'}`);
        }
    });

    socket.on('hireAccepted', () => {
        showToast('🎉 A freelancer accepted your hire offer!');
        loadHiredFreelancers();
    });

    socket.on('hireDeclined', () => {
        showToast('❌ A freelancer declined your hire offer.');
        loadHiredFreelancers();
    });

    socket.on('hireLeft', () => {
        showToast('⚠️ A freelancer has left a collaboration.');
        loadHiredFreelancers();
    });

    socket.on('freelancerUnhired', () => {
        loadHiredFreelancers();
    });
}

// ------------------------------------------------------------
// Hired freelancers
// ------------------------------------------------------------
async function loadHiredFreelancers() {
    try {
        const response = await fetch(`${API_URL}/collaborations/creator/${currentUser._id}`);
        const data = await response.json();
        hiredFreelancers = data.collaborations || [];

        renderHiredFreelancers();
        updateStats();

        // Keep the "Hired ✓" state in the directory in sync.
        if (allFreelancers.length > 0) filterFreelancers();
    } catch (error) {
        console.error('Error loading hired freelancers:', error);
    }
}

function renderHiredFreelancers() {
    const container = document.getElementById('hiredFreelancers');

    if (hiredFreelancers.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted); grid-column: 1 / -1;">No freelancers hired yet. Browse freelancers or review applications below to get started!</p>';
        return;
    }

    container.innerHTML = '';

    hiredFreelancers.forEach(collab => {
        const freelancer = collab.freelancer || {};
        const tasks = collab.tasks || { todo: [], inprogress: [], done: [] };
        const todoCount = tasks.todo?.length || 0;
        const inProgressCount = tasks.inprogress?.length || 0;
        const doneCount = tasks.done?.length || 0;
        const isPending = collab.status === 'pending';

        const card = document.createElement('div');
        card.className = 'freelancer-card';

        card.innerHTML = `
            <h4 style="color: var(--text); margin-bottom: 5px;">${escapeHtml(freelancer.name)}
                ${isPending ? '<span style="display:inline-block;margin-left:6px;padding:2px 8px;border-radius:20px;background:rgba(250,204,21,0.18);color:#facc15;font-size:0.65rem;font-weight:800;">⏳ PENDING</span>' : ''}
            </h4>
            <p style="color: var(--primary); font-size: 0.9rem; margin-bottom: 5px;">${escapeHtml(freelancer.role || 'Freelancer')}</p>
            <p style="color: var(--text-muted); font-size: 0.8rem; margin-bottom: 10px;">⭐ ${Number(freelancer.rating) || 0} • ${escapeHtml(freelancer.experience || '')}</p>

            ${isPending ? `
            <p style="color: #facc15; font-size: 0.82rem; margin-bottom: 10px;">⏳ Waiting for ${escapeHtml(freelancer.name?.split(' ')[0] || 'freelancer')} to accept your hire offer.</p>
            ` : `
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
            </div>`}

            <div class="action-buttons">
                ${isPending ? '' : `<button onclick="openKanbanById('${collab._id}')">📋 Tasks</button>`}
                ${isPending ? '' : `<button onclick="openChat('${collab.chatId}')" style="background: var(--success);">💬 Chat</button>`}
                <button onclick="unhireFreelancer('${collab._id}', '${escapeHtml(freelancer.name || '')}')" style="background: #ef4444;">
                    ${isPending ? '✖ Cancel Offer' : '🔴 Unhire'}
                </button>
            </div>
        `;

        container.appendChild(card);
    });
}

// ------------------------------------------------------------
// Applications received on my jobs
// ------------------------------------------------------------
async function loadApplications() {
    try {
        const response = await fetch(`${API_URL}/applications/creator/${currentUser._id}`);
        const data = await response.json();
        applications = data.applications || [];

        renderApplications();
        updateStats();
    } catch (error) {
        console.error('Error loading applications:', error);
    }
}

function renderApplications() {
    const container = document.getElementById('applicationsList');

    if (applications.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted); grid-column: 1 / -1;">No applications yet. Post a job so freelancers can apply.</p>';
        return;
    }

    container.innerHTML = '';

    const hiredIds = new Set(hiredFreelancers.map(c => c.freelancer?._id));

    applications.forEach(application => {
        const freelancer = application.freelancer || {};
        const isHired = application.status === 'hired' || hiredIds.has(freelancer._id);

        const card = document.createElement('div');
        card.className = 'freelancer-card';

        card.innerHTML = `
            <h4 style="color: var(--text); margin-bottom: 5px;">
                ${escapeHtml(freelancer.name)}
                ${isRecentlyCreated(freelancer) ? '<span class="new-badge">NEW</span>' : ''}
            </h4>
            <p style="color: var(--primary); font-size: 0.9rem; margin-bottom: 5px;">${escapeHtml(freelancer.role || 'Freelancer')}</p>
            <p class="meta-line">⭐ ${Number(freelancer.rating) || 0} • ${escapeHtml(freelancer.experience || '')} • $${Number(freelancer.hourlyRate) || 0}/hr</p>
            <p style="color: var(--text-muted); font-size: 0.82rem; margin-top: 10px;">
                Applied to <strong style="color: var(--text);">${escapeHtml(application.jobTitle)}</strong><br>
                Budget: <span style="color: var(--success); font-weight: 700;">$${Number(application.budget) || 0}</span>
                • ${formatDate(application.appliedAt)}
            </p>
            <div style="margin-top: 10px;">
                <span class="applied-badge">${isHired ? '✓ Hired' : '● Pending review'}</span>
            </div>
            <div class="card-actions">
                <button ${isHired ? 'disabled' : ''} onclick="hireApplicant('${freelancer._id}', '${application.jobId}')">
                    ${isHired ? 'Hired ✓' : 'Hire'}
                </button>
                <button class="secondary" onclick="messageFreelancer('${freelancer._id}')">💬 Message</button>
            </div>
        `;

        container.appendChild(card);
    });
}

async function hireApplicant(freelancerId, jobId) {
    const freelancer = allFreelancers.find(f => f._id === freelancerId);
    const name = freelancer?.name || 'this freelancer';

    if (!confirm(`Send a hire offer to ${name}? They will need to accept it.`)) return;

    try {
        const response = await fetch(`${API_URL}/collaborations/hire`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                creatorId: currentUser._id,
                freelancerId,
                jobId
            })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.error || 'Could not send hire offer');
            return;
        }

        alert(`✅ Hire offer sent to ${name}! They will appear in your team once they accept.`);

        await Promise.all([loadHiredFreelancers(), loadApplications(), loadAllFreelancers(), loadMyJobs()]);
    } catch (error) {
        console.error('Error sending hire offer:', error);
        alert('Server error. Please try again.');
    }
}

async function unhireFreelancer(collabId, name) {
    const displayName = name || 'this freelancer';
    if (!confirm(`Are you sure you want to unhire ${displayName}? This will remove them from your team.`)) return;

    try {
        const response = await fetch(`${API_URL}/collaborations/${collabId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.error || 'Could not unhire freelancer');
            return;
        }

        showToast(`🔴 ${displayName} has been removed from your team.`);
        await Promise.all([loadHiredFreelancers(), loadApplications(), loadAllFreelancers(), loadMyJobs()]);
    } catch (error) {
        console.error('Error unhiring freelancer:', error);
        alert('Server error. Please try again.');
    }
}

// ------------------------------------------------------------
// Freelancer directory
// ------------------------------------------------------------
async function loadAllFreelancers() {
    try {
        const response = await fetch(`${API_URL}/freelancers`);
        const data = await response.json();
        allFreelancers = data.freelancers || [];
        filterFreelancers();
    } catch (error) {
        console.error('Error loading freelancers:', error);
        document.getElementById('allFreelancers').innerHTML =
            '<p style="color: #ef4444; grid-column: 1 / -1;">Could not load freelancers. Is the server running?</p>';
    }
}

function filterFreelancers() {
    const input = document.getElementById('freelancerSearch');
    const term = (input?.value || '').trim().toLowerCase();
    renderAllFreelancers(term);
}

function renderAllFreelancers(term = '') {
    const container = document.getElementById('allFreelancers');
    const hiredIds = new Set(hiredFreelancers.map(c => c.freelancer?._id));

    const filtered = allFreelancers.filter(freelancer => {
        if (!term) return true;
        return String(freelancer.name || '').toLowerCase().includes(term) ||
            String(freelancer.role || '').toLowerCase().includes(term) ||
            (freelancer.skills || []).some(skill => String(skill).toLowerCase().includes(term));
    });

    if (filtered.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted); grid-column: 1 / -1;">No freelancers match your search.</p>';
        return;
    }

    container.innerHTML = '';

    filtered.forEach(freelancer => {
        const isHired = hiredIds.has(freelancer._id);
        const availability = freelancer.isAvailable
            ? '<span style="color: var(--success); font-size: 0.75rem;">● Available</span>'
            : '<span style="color: var(--text-muted); font-size: 0.75rem;">● Booked</span>';

        const skills = (freelancer.skills || [])
            .slice(0, 4)
            .map(skill => `<span class="skill-tag">${escapeHtml(skill)}</span>`)
            .join('');

        const card = document.createElement('div');
        card.className = 'freelancer-card';

        card.innerHTML = `
            <h4 style="color: var(--text); margin-bottom: 5px;">
                ${escapeHtml(freelancer.name)}
                ${isRecentlyCreated(freelancer) ? '<span class="new-badge">NEW</span>' : ''}
            </h4>
            <p style="color: var(--primary); font-size: 0.9rem; margin-bottom: 5px;">${escapeHtml(freelancer.role || 'Freelancer')}</p>
            <p class="meta-line">⭐ ${Number(freelancer.rating) || 0} • ${escapeHtml(freelancer.experience || '')} • $${Number(freelancer.hourlyRate) || 0}/hr</p>
            <div style="margin: 8px 0;">${availability}</div>
            <div>${skills}</div>
            <p style="color: var(--text-muted); font-size: 0.8rem; margin-top: 10px; line-height: 1.45;">
                ${escapeHtml(freelancer.bio || 'No bio provided yet.')}
            </p>
            <div class="card-actions">
                <button ${isHired ? 'disabled' : ''} onclick="hireFreelancer('${freelancer._id}')">
                    ${isHired ? 'Hired ✓' : 'Hire'}
                </button>
                <button class="secondary" onclick="messageFreelancer('${freelancer._id}')">💬 Message</button>
            </div>
        `;

        container.appendChild(card);
    });
}

async function hireFreelancer(freelancerId) {
    const freelancer = allFreelancers.find(f => f._id === freelancerId);
    const name = freelancer?.name || 'this freelancer';

    if (!confirm(`Send a hire offer to ${name}? They will need to accept it before becoming active.`)) return;

    try {
        const response = await fetch(`${API_URL}/collaborations/hire`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                creatorId: currentUser._id,
                freelancerId
            })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.error || 'Could not send hire offer');
            return;
        }

        showToast(`✅ Hire offer sent to ${name}! Waiting for them to accept.`);
        await Promise.all([loadHiredFreelancers(), loadAllFreelancers(), loadApplications()]);
    } catch (error) {
        console.error('Error sending hire offer:', error);
        alert('Server error. Please try again.');
    }
}

function messageFreelancer(freelancerId) {
    window.location.href = `chat.html?with=${encodeURIComponent(freelancerId)}`;
}

function openChat(chatId) {
    if (!chatId) return;
    window.location.href = `chat.html?chat=${encodeURIComponent(chatId)}`;
}

// ------------------------------------------------------------
// My job postings
// ------------------------------------------------------------
async function loadMyJobs() {
    try {
        const response = await fetch(`${API_URL}/jobs?creatorId=${encodeURIComponent(currentUser._id)}`);
        const data = await response.json();
        myJobs = data.jobs || [];
        renderMyJobs();
    } catch (error) {
        console.error('Error loading jobs:', error);
    }
}

function renderMyJobs() {
    const container = document.getElementById('myJobs');

    if (myJobs.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted); grid-column: 1 / -1;">No jobs posted yet. Use “Post Job Opportunity” above.</p>';
        return;
    }

    container.innerHTML = '';

    myJobs.forEach(job => {
        const card = document.createElement('div');
        card.className = 'freelancer-card';

        const statusColor = job.status === 'open'
            ? 'var(--success)'
            : job.status === 'in-progress'
                ? '#60a5fa'
                : 'var(--text-muted)';

        card.innerHTML = `
            <h4 style="color: var(--text); margin-bottom: 5px;">${escapeHtml(job.title)}</h4>
            <p class="meta-line">
                <span style="color: ${statusColor}; font-weight: 700; text-transform: uppercase; font-size: 0.7rem;">${escapeHtml(job.status)}</span>
                • $${Number(job.budget) || 0}
                • ${job.applicantCount || 0} applicant${(job.applicantCount || 0) === 1 ? '' : 's'}
            </p>
            <p style="color: var(--text-muted); font-size: 0.82rem; margin-top: 8px;">${escapeHtml(job.description)}</p>
            <div style="margin-top: 10px;">
                ${(job.requiredSkills || []).map(skill => `<span class="skill-tag">${escapeHtml(skill)}</span>`).join('')}
            </div>
            <div class="card-actions">
                <button class="secondary" onclick="scrollToApplications()">👥 View Applicants</button>
            </div>
        `;

        container.appendChild(card);
    });
}

function scrollToApplications() {
    document.getElementById('applicationsList').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ------------------------------------------------------------
// Stats
// ------------------------------------------------------------
function updateStats() {
    let totalTasks = 0;
    let completedTasks = 0;
    let inProgressTasks = 0;

    hiredFreelancers.forEach(collab => {
        const tasks = collab.tasks || { todo: [], inprogress: [], done: [] };
        totalTasks += (tasks.todo?.length || 0) + (tasks.inprogress?.length || 0) + (tasks.done?.length || 0);
        completedTasks += tasks.done?.length || 0;
        inProgressTasks += tasks.inprogress?.length || 0;
    });

    document.getElementById('totalHired').textContent = hiredFreelancers.length;
    document.getElementById('totalTasks').textContent = totalTasks;
    document.getElementById('completedTasks').textContent = completedTasks;
    document.getElementById('inProgressTasks').textContent = inProgressTasks;
    document.getElementById('totalApplications').textContent = applications.length;
}

// ------------------------------------------------------------
// Kanban board
// ------------------------------------------------------------
function openKanbanById(collabId) {
    const collab = hiredFreelancers.find(c => c._id === collabId);
    if (!collab) return;

    currentCollab = collab;

    document.getElementById('modalFreelancerName').textContent = collab.freelancer?.name || 'Freelancer';
    document.getElementById('modalFreelancerRole').textContent = collab.freelancer?.role || '';

    loadFreelancerTasks(collab);
    document.getElementById('kanbanModal').style.display = 'block';
}

function loadFreelancerTasks(collab) {
    const tasks = collab.tasks || { todo: [], inprogress: [], done: [] };

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
            <button onclick="deleteTask('${columnId}', ${index})" style="width: 100%; margin-top: 10px; padding: 6px; font-size: 0.8rem; background: #ef4444;">Delete</button>
        `;

        column.appendChild(taskEl);
    });
}

function getCurrentCollab() {
    if (!currentCollab) return null;
    return hiredFreelancers.find(c => c._id === currentCollab._id) || currentCollab;
}

async function addTask(column) {
    const collab = getCurrentCollab();
    if (!collab) return;

    const title = prompt('Task title:');
    if (!title) return;

    const description = prompt('Task description (optional):') || '';

    if (!collab.tasks) collab.tasks = { todo: [], inprogress: [], done: [] };
    if (!collab.tasks[column]) collab.tasks[column] = [];

    collab.tasks[column].push({
        title: title.trim(),
        description: description.trim(),
        createdAt: new Date().toISOString()
    });

    await saveCollaboration(collab);
}

async function deleteTask(columnId, taskIndex) {
    if (!confirm('Delete this task?')) return;

    const collab = getCurrentCollab();
    if (!collab) return;

    const column = columnId.replace('modal-', '');
    collab.tasks[column].splice(taskIndex, 1);
    await saveCollaboration(collab);
}

function closeKanban() {
    document.getElementById('kanbanModal').style.display = 'none';
    currentCollab = null;
    loadHiredFreelancers();
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

    const collab = getCurrentCollab();
    if (!collab) return;

    if (!collab.tasks) collab.tasks = { todo: [], inprogress: [], done: [] };
    if (!collab.tasks[fromColumn] || !collab.tasks[toColumn]) return;

    const taskIndex = Array.from(fromColumnEl.querySelectorAll('.k-task')).indexOf(taskElement);
    if (taskIndex === -1) return;

    const task = collab.tasks[fromColumn].splice(taskIndex, 1)[0];
    collab.tasks[toColumn].push(task);

    dropTarget.appendChild(taskElement);

    await saveCollaboration(collab);

    if (socket) {
        socket.emit('taskMoved', {
            freelancerId: collab.freelancer?._id,
            creatorId: currentUser._id,
            fromColumn,
            toColumn,
            task
        });
    }
}

async function saveCollaboration(collab) {
    try {
        const response = await fetch(`${API_URL}/collaborations/${collab._id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tasks: collab.tasks })
        });

        if (!response.ok) throw new Error('Could not save tasks');

        await loadHiredFreelancers();

        const updated = hiredFreelancers.find(c => c._id === collab._id);
        if (updated) {
            currentCollab = updated;
            loadFreelancerTasks(updated);
        }
        updateStats();
    } catch (error) {
        console.error('Error saving tasks:', error);
        alert('Tasks could not be saved. Please try again.');
    }
}

// ------------------------------------------------------------
// Job posting
// ------------------------------------------------------------
function showJobPostModal() {
    document.getElementById('jobPostModal').style.display = 'block';
}

function closeJobPostModal() {
    document.getElementById('jobPostModal').style.display = 'none';
    document.getElementById('jobTitle').value = '';
    document.getElementById('jobDescription').value = '';
    document.getElementById('jobBudget').value = '';
    document.getElementById('jobSkills').value = '';
    document.getElementById('jobPostError').style.display = 'none';
}

async function postJob() {
    const title = document.getElementById('jobTitle').value.trim();
    const description = document.getElementById('jobDescription').value.trim();
    const budgetRaw = document.getElementById('jobBudget').value.trim();
    const skills = document.getElementById('jobSkills').value.trim();
    const errorDiv = document.getElementById('jobPostError');

    if (!title || !description) {
        errorDiv.textContent = 'Please fill in title and description';
        errorDiv.style.display = 'block';
        return;
    }

    const budget = parseInt(budgetRaw, 10);
    if (budgetRaw !== '' && (isNaN(budget) || budget <= 0)) {
        errorDiv.textContent = 'Budget must be a positive number (greater than 0)';
        errorDiv.style.display = 'block';
        return;
    }

    try {
        const response = await fetch(`${API_URL}/jobs/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                creatorId: currentUser._id,
                title,
                description,
                budget: budget || 0,
                requiredSkills: skills ? skills.split(',').map(s => s.trim()).filter(Boolean) : []
            })
        });

        const data = await response.json();

        if (response.ok) {
            alert('✅ Job posted successfully! Freelancers can now see and apply to your job.');
            closeJobPostModal();
            loadMyJobs();
        } else {
            errorDiv.textContent = data.error || 'Failed to post job';
            errorDiv.style.display = 'block';
        }
    } catch (error) {
        errorDiv.textContent = 'Server error. Please try again.';
        errorDiv.style.display = 'block';
    }
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
    if (Number.isNaN(date.getTime())) return 'recently';
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
