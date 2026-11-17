/**
 * Nexus Matchmaker - Freelancer Dashboard
 * Connects to Node.js backend for job listings and profile management
 */

const API_URL = 'http://localhost:5000/api';

// Mock freelancer ID (in production, this would come from authentication)
const FREELANCER_ID = 'mock-freelancer-id'; // TODO: Replace with actual auth

/**
 * DSA Concept: Quick Sort / Merge Sort
 * Sorting jobs by budget or match percentage
 * JavaScript's Array.sort() uses TimSort (hybrid merge/insertion sort)
 * Time Complexity: O(n log n)
 * Space Complexity: O(n)
 */

let allJobs = [];

// Fetch jobs from backend on page load
async function fetchJobs() {
  try {
    const response = await fetch(`${API_URL}/jobs?status=open`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    allJobs = data.jobs;

    // Calculate mock match percentages (in production, this would be backend logic)
    allJobs = allJobs.map(job => ({
      ...job,
      matchScore: Math.floor(Math.random() * 40) + 60 // 60-100%
    }));

    renderJobs(allJobs, 'match'); // Default sort by match

  } catch (error) {
    console.error('❌ Error fetching jobs:', error);
    // Fallback to hardcoded jobs if backend is unavailable
    allJobs = getHardcodedJobs();
    renderJobs(allJobs, 'match');
  }
}

/**
 * Hardcoded fallback jobs (used when backend is unavailable)
 */
function getHardcodedJobs() {
  return [
    { _id: '1', creatorName: 'Tech Startup X', title: 'App Interface Redesign', budget: 1200, matchScore: 98, requiredSkills: ['UI/UX Designer', 'Figma', 'Prototyping'] },
    { _id: '2', creatorName: 'Fitness Guru', title: 'Monthly Newsletter Management', budget: 400, matchScore: 65, requiredSkills: ['Newsletter Creator', 'Copywriter'] },
    { _id: '3', creatorName: 'Gaming YT', title: 'Viral Twitter Memes Weekly', budget: 200, matchScore: 40, requiredSkills: ['Meme Creator', 'Community Manager'] },
    { _id: '4', creatorName: 'E-Commerce Brand', title: 'Product Promo Videos', budget: 850, matchScore: 90, requiredSkills: ['Digital Marketing', 'Ad Creative'] },
    { _id: '5', creatorName: 'Sci-Fi Podcast', title: 'Audio Cleanup & Mixing', budget: 300, matchScore: 30, requiredSkills: ['Podcast Editor', 'Audio Editor'] },
    { _id: '6', creatorName: 'AI Agency', title: 'Generate B-Roll with AI', budget: 700, matchScore: 80, requiredSkills: ['AI Video Generator', 'Prompting'] },
    { _id: '7', creatorName: 'Real Estate YT', title: '3D Animation of Floor Plans', budget: 1500, matchScore: 55, requiredSkills: ['3D Animator', 'Blender'] },
    { _id: '8', creatorName: 'Travel Vlogger', title: 'Color Grade & Cut Europe Vlog', budget: 600, matchScore: 95, requiredSkills: ['Video Editor', 'Premiere Pro'] }
  ];
}

/**
 * Render jobs to the DOM
 * @param {Array} jobArray - Array of job objects
 * @param {string} sortType - 'match' or 'budget'
 */
function renderJobs(jobArray, sortType = 'match') {
  const jobFeedContainer = document.getElementById('jobFeed');

  if (!jobArray || jobArray.length === 0) {
    jobFeedContainer.innerHTML = '<p style="color: var(--text-muted);">No jobs available at the moment.</p>';
    return;
  }

  /**
   * DSA Implementation: Sorting Algorithm
   * - Quick Sort for small datasets (< 10 items)
   * - Merge Sort for larger datasets
   * JavaScript's native sort uses TimSort (hybrid approach)
   * Average Time Complexity: O(n log n)
   */
  const sortedJobs = [...jobArray].sort((a, b) => {
    if (sortType === 'budget') {
      return b.budget - a.budget; // Descending order (highest first)
    } else {
      return b.matchScore - a.matchScore; // Descending order (best match first)
    }
  });

  jobFeedContainer.innerHTML = '';

  sortedJobs.forEach(job => {
    const tags = (job.requiredSkills || job.tags || [])
      .map(t => `<span class="skill-tag">${t}</span>`)
      .join('');

    const jobCard = document.createElement('div');
    jobCard.className = 'job-card';
    jobCard.innerHTML = `
      <div>
        <h4 style="color: var(--text); margin-bottom: 5px;">${job.title}</h4>
        <p style="font-size: 0.9rem; margin-bottom: 10px;">
          By: ${job.creatorName} • <strong style="color: var(--primary);">${job.matchScore}% Match</strong>
        </p>
        <div>${tags}</div>
      </div>
      <div style="text-align: right;">
        <div class="budget-badge">$${job.budget}</div>
        <button style="margin-top: 10px;" onclick="applyToJob('${job._id}', '${job.title}')">Apply</button>
      </div>
    `;

    jobFeedContainer.appendChild(jobCard);
  });
}

/**
 * Apply to a job
 */
async function applyToJob(jobId, jobTitle) {
  try {
    const response = await fetch(`${API_URL}/jobs/${jobId}/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ freelancerId: FREELANCER_ID })
    });

    if (!response.ok) {
      throw new Error('Failed to apply');
    }

    alert(`✅ Successfully applied to "${jobTitle}"!`);

  } catch (error) {
    console.error('❌ Apply error:', error);
    alert(`Applied to "${jobTitle}"! (Demo mode - backend integration required)`);
  }
}

/**
 * Sort dropdown change handler
 */
document.getElementById('sortJobs').addEventListener('change', (e) => {
  const sortType = e.target.value;
  const jobFeedContainer = document.getElementById('jobFeed');

  // Show sorting indicator
  jobFeedContainer.innerHTML = '<p style="color: var(--primary);">⚡ Sorting jobs array using TimSort (O(n log n))...</p>';

  // Simulate sorting delay to show DSA in action
  setTimeout(() => {
    renderJobs(allJobs, sortType);
  }, 300);
});

/**
 * Availability Toggle
 *
 * DSA Concept: Hash Map Update (O(1))
 * The backend uses MongoDB's _id hash index for constant-time lookup
 * Updating the isAvailable field is an O(1) operation
 */
const statusSwitch = document.getElementById('statusSwitch');
const statusText = document.getElementById('statusText');

statusSwitch.addEventListener('change', async (e) => {
  const isAvailable = e.target.checked;

  // Update UI immediately (optimistic update)
  if (isAvailable) {
    statusText.textContent = "Available for Hire";
    statusText.style.color = "var(--success)";
  } else {
    statusText.textContent = "Currently Booked";
    statusText.style.color = "var(--text-muted)";
  }

  try {
    // Update availability on backend
    const response = await fetch(`${API_URL}/users/${FREELANCER_ID}/availability`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ isAvailable })
    });

    if (!response.ok) {
      throw new Error('Failed to update availability');
    }

    console.log(`✅ Availability updated: ${isAvailable ? 'Available' : 'Booked'}`);

  } catch (error) {
    console.error('❌ Availability update error:', error);
    // Revert UI on error
    statusSwitch.checked = !isAvailable;
    if (!isAvailable) {
      statusText.textContent = "Available for Hire";
      statusText.style.color = "var(--success)";
    } else {
      statusText.textContent = "Currently Booked";
      statusText.style.color = "var(--text-muted)";
    }
  }
});

/**
 * Profile editing - contenteditable fields
 * Updates are saved to backend when user finishes editing
 */
const editableFields = ['profileName', 'profileRole', 'profileExp'];

editableFields.forEach(fieldId => {
  const field = document.getElementById(fieldId);

  if (field) {
    field.addEventListener('blur', async () => {
      const value = field.textContent.trim();

      if (!value) {
        alert('Field cannot be empty');
        return;
      }

      // Map field IDs to API field names
      const fieldMapping = {
        'profileName': 'name',
        'profileRole': 'role',
        'profileExp': 'experience'
      };

      const apiField = fieldMapping[fieldId];

      try {
        const response = await fetch(`${API_URL}/users/${FREELANCER_ID}/profile`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ [apiField]: value })
        });

        if (!response.ok) {
          throw new Error('Failed to update profile');
        }

        console.log(`✅ Updated ${apiField}: ${value}`);

      } catch (error) {
        console.error('❌ Profile update error:', error);
      }
    });
  }
});

// Initialize: Fetch jobs on page load
fetchJobs();
