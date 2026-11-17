/**
 * Nexus Matchmaker - Creator Dashboard
 * Connects to Node.js backend with AI-powered matching via Gemini API
 */

const API_URL = 'http://localhost:5000/api';
let socket;

// Initialize Socket.io connection for real-time updates
function initSocket() {
  socket = io('http://localhost:5000');

  socket.on('connect', () => {
    console.log('🔌 Connected to server via Socket.io');
  });

  /**
   * DSA Concept: Doubly Linked List (Kanban Board)
   * Listen for real-time task updates from other clients
   */
  socket.on('taskUpdate', (data) => {
    console.log('📋 Received task update:', data);
    // Update UI without page reload
  });

  socket.on('disconnect', () => {
    console.log('🔌 Disconnected from server');
  });
}

// Initialize on page load
initSocket();

/**
 * AI Smart Match - Search for freelancers using natural language
 * Sends prompt to backend which uses Gemini API for intent extraction
 *
 * DSA Concepts Applied:
 * - Backend uses Max-Heap (Priority Queue) to rank matches by score
 * - MongoDB hash indexes provide O(1) lookups
 * - Sorting algorithm: TimSort O(n log n)
 */
document.getElementById('searchBtn').addEventListener('click', async () => {
  const prompt = document.getElementById('aiPrompt').value.trim();

  if (!prompt) {
    return alert("Please enter a project description.");
  }

  const loading = document.getElementById('loading');
  const results = document.getElementById('results');

  results.innerHTML = '';
  loading.style.display = 'block';

  try {
    // Call backend AI match endpoint
    const response = await fetch(`${API_URL}/ai-match/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prompt })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    loading.style.display = 'none';

    const { matches, totalCount, query, lowRelevance, suggestion } = data;

    if (!matches || matches.length === 0) {
      results.innerHTML = '<p style="color: var(--text-muted);">No matches found. Try a different search.</p>';
      return;
    }

    /**
     * DSA Implementation: Results are pre-sorted by backend using Max-Heap logic
     * The backend calculates matchScore for each freelancer and sorts in descending order
     * Time Complexity: O(n log n) on server, O(n) rendering here
     */
    let htmlContent = '';

    if (lowRelevance) {
      // ── NO MATCH FOUND block ─────────────────────────────────────────
      htmlContent += `
        <div style="grid-column: 1 / -1; margin-bottom: 24px; padding: 20px 24px;
          background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.35);
          border-radius: 12px; text-align: center;">
          <div style="font-size: 2rem; margin-bottom: 8px;">🔍</div>
          <strong style="color: #f87171; font-size: 1.1rem; display: block; margin-bottom: 6px;">
            No Match Found
          </strong>
          <p style="color: var(--text-muted); font-size: 0.9rem; margin: 0;">
            We couldn't find a freelancer matching <em style="color: var(--text);">"${prompt}"</em>.
            This search doesn't appear to be related to content creation.
          </p>
        </div>

        <div style="grid-column: 1 / -1; margin-bottom: 14px; padding: 10px 16px;
          background: rgba(139,92,246,0.1); border-left: 3px solid var(--primary);
          border-radius: 6px;">
          <strong style="color: var(--primary);">💡 Here are some other freelancers you might need:</strong>
        </div>
      `;
    } else {
      // ── NORMAL MATCH header ──────────────────────────────────────────
      htmlContent += `
        <div style="grid-column: 1 / -1; margin-bottom: 10px;">
          <span style="color: var(--success);">&#x2713; Algorithm Found ${totalCount} Match(es)</span>
          ${query.role ? `<span style="color: var(--text-muted); margin-left: 15px;">Role: ${query.role}</span>` : ''}
        </div>
      `;
    }

    matches.forEach(freelancer => {
      const tags = freelancer.skills.map(s => `<span class="skill-tag">${s}</span>`).join('');
      const availability = freelancer.isAvailable
        ? '<span style="color: var(--success); font-size: 0.8rem;">● Available</span>'
        : '<span style="color: var(--text-muted); font-size: 0.8rem;">● Booked</span>';

      htmlContent += `
        <div class="talent-card">
          <h4>${freelancer.name}</h4>
          <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 5px;">
            ${freelancer.experience} | ⭐ ${freelancer.rating} (${freelancer.completedProjects} projects)
          </p>
          <p style="color: var(--primary); font-size: 0.9rem; margin-bottom: 10px;">
            ${freelancer.role} • ${freelancer.matchScore}% Match
          </p>
          ${availability}
          <div style="margin-top: 10px;">${tags}</div>
          <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 10px;">
            ${freelancer.bio || 'No bio available'}
          </p>
          <button style="width: 100%; margin-top: 15px; padding: 8px;" onclick="hireFreelancer('${freelancer._id}', '${freelancer.name}')">
            Hire ${freelancer.name.split(' ')[0]}
          </button>
        </div>
      `;
    });

    results.innerHTML = htmlContent;

  } catch (error) {
    loading.style.display = 'none';
    console.error('❌ Search error:', error);
    results.innerHTML = `
      <p style="color: #ef4444; grid-column: 1 / -1;">
        ⚠️ Error: ${error.message}. Make sure the backend server is running on port 5000.
      </p>
    `;
  }
});

/**
 * Hire Freelancer - Create a job posting (placeholder)
 */
function hireFreelancer(freelancerId, freelancerName) {
  if (!confirm(`Send a hire offer to ${freelancerName}? They will need to accept it in their dashboard.`)) return;
  // Redirect to creator dashboard where hire is handled
  window.location.href = `creator-dashboard.html`;
}

/**
 * Kanban Board - Drag and Drop Task Management
 *
 * DSA Concept: Doubly Linked List
 * Each column (To-Do, In Progress, Done) acts as a linked list node
 * Tasks can move bidirectionally between columns in O(1) time
 *
 * The DOM provides the doubly-linked structure:
 * - previousSibling / nextSibling pointers
 * - parentNode allows traversal
 *
 * Socket.io broadcasts changes to all connected clients in real-time
 */

function allowDrop(ev) {
  ev.preventDefault();
}

function drag(ev) {
  ev.dataTransfer.setData("text", ev.target.id);
  ev.target.style.opacity = "0.5";
}

function drop(ev) {
  ev.preventDefault();
  const taskId = ev.dataTransfer.getData("text");
  const taskElement = document.getElementById(taskId);

  if (!taskElement) return;

  taskElement.style.opacity = "1";

  let dropTarget = ev.target;

  // Find the column container if we didn't drop directly on it
  while (dropTarget && !dropTarget.classList.contains('k-column')) {
    dropTarget = dropTarget.parentElement;
  }

  if (dropTarget && dropTarget.classList.contains('k-column')) {
    const fromColumn = taskElement.parentElement.querySelector('h3')?.textContent || 'Unknown';
    const toColumn = dropTarget.querySelector('h3')?.textContent || 'Unknown';

    /**
     * DSA Implementation: O(1) operation
     * DOM appendChild() removes the element from its current position
     * and inserts it at the new position without traversing the entire tree
     */
    dropTarget.appendChild(taskElement);

    // Emit real-time update via Socket.io
    if (socket && socket.connected) {
      socket.emit('taskMoved', {
        taskId,
        fromColumn,
        toColumn,
        timestamp: new Date().toISOString()
      });
    }

    console.log(`📋 Moved task from "${fromColumn}" to "${toColumn}"`);
  }
}

// Reset opacity on drag end
document.addEventListener('dragend', (ev) => {
  if (ev.target.classList.contains('k-task')) {
    ev.target.style.opacity = "1";
  }
});
