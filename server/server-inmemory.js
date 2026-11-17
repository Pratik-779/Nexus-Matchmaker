require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE']
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('../client'));

/**
 * IN-MEMORY DATABASE (for demo without MongoDB)
 * DSA Concept: Hash Tables
 * Using JavaScript Objects/Maps as hash tables for O(1) lookups
 */
const db = {
  users: new Map(),      // Key: userId, Value: user object
  jobs: new Map(),       // Key: jobId, Value: job object
  nextUserId: 1,
  nextJobId: 1
};

// Seed in-memory database with freelancers
function seedInMemoryDB() {
  const freelancers = [
    { name: 'Alex Turner', email: 'alex.turner@nexus.dev', userType: 'freelancer', role: 'Video Editor', experience: '3 Years', skills: ['Premiere Pro', 'After Effects', 'Color Grading'], hourlyRate: 50, isAvailable: true, rating: 4.8, completedProjects: 45, bio: 'Cinematic storytelling specialist' },
    { name: 'Maya Chen', email: 'maya.chen@nexus.dev', userType: 'freelancer', role: 'Video Editor', experience: '5 Years', skills: ['Final Cut Pro', 'DaVinci Resolve', 'Motion Graphics'], hourlyRate: 65, isAvailable: true, rating: 4.9, completedProjects: 78, bio: 'Award-winning editor for YouTube creators' },
    { name: 'Jordan Blake', email: 'jordan.blake@nexus.dev', userType: 'freelancer', role: 'Video Editor', experience: '2 Years', skills: ['Premiere Pro', 'Audition', 'Quick Turnaround'], hourlyRate: 40, isAvailable: false, rating: 4.5, completedProjects: 32, bio: 'Fast-paced content editing' },
    { name: 'Sophie Williams', email: 'sophie.w@nexus.dev', userType: 'freelancer', role: 'Short-Form Video Editor', experience: '2 Years', skills: ['CapCut', 'Premiere Pro', 'Viral Editing'], hourlyRate: 35, isAvailable: true, rating: 4.7, completedProjects: 120, bio: 'TikTok & Reels specialist' },
    { name: 'Carlos Ruiz', email: 'carlos.ruiz@nexus.dev', userType: 'freelancer', role: 'Podcast Video Editor', experience: '4 Years', skills: ['Premiere Pro', 'Descript', 'Audio Sync'], hourlyRate: 55, isAvailable: true, rating: 4.8, completedProjects: 65, bio: 'Podcast visual storytelling' },
    { name: 'Emma Davis', email: 'emma.davis@nexus.dev', userType: 'freelancer', role: 'Thumbnail Designer', experience: '3 Years', skills: ['Photoshop', 'CTR Optimization', 'A/B Testing'], hourlyRate: 30, isAvailable: true, rating: 4.9, completedProjects: 200, bio: 'High CTR thumbnail expert' },
    { name: 'Liam Foster', email: 'liam.foster@nexus.dev', userType: 'freelancer', role: 'Brand Identity Designer', experience: '6 Years', skills: ['Illustrator', 'Brand Strategy', 'Logo Design'], hourlyRate: 75, isAvailable: true, rating: 5.0, completedProjects: 52, bio: 'Building iconic brand identities' },
    { name: 'Zara Ahmed', email: 'zara.ahmed@nexus.dev', userType: 'freelancer', role: 'UI/UX Designer', experience: '4 Years', skills: ['Figma', 'Prototyping', 'User Research'], hourlyRate: 70, isAvailable: true, rating: 4.8, completedProjects: 38, bio: 'Designing delightful experiences' },
    { name: 'Noah Martinez', email: 'noah.m@nexus.dev', userType: 'freelancer', role: 'Graphic Designer', experience: '3 Years', skills: ['Photoshop', 'Illustrator', 'Print Design'], hourlyRate: 45, isAvailable: true, rating: 4.6, completedProjects: 67, bio: 'Visual communication specialist' },
    { name: 'Isabella Lee', email: 'isabella.lee@nexus.dev', userType: 'freelancer', role: 'Social Media Graphic Designer', experience: '2 Years', skills: ['Canva', 'Photoshop', 'Brand Guidelines'], hourlyRate: 35, isAvailable: true, rating: 4.7, completedProjects: 95, bio: 'Eye-catching social graphics' },
    { name: 'Oliver King', email: 'oliver.king@nexus.dev', userType: 'freelancer', role: 'Infographic Designer', experience: '5 Years', skills: ['Illustrator', 'Data Visualization', 'Storytelling'], hourlyRate: 60, isAvailable: false, rating: 4.9, completedProjects: 43, bio: 'Data into visual stories' },
    { name: 'Ava Thompson', email: 'ava.thompson@nexus.dev', userType: 'freelancer', role: 'Motion Graphics Designer', experience: '4 Years', skills: ['After Effects', 'Cinema 4D', 'Animation'], hourlyRate: 80, isAvailable: true, rating: 4.9, completedProjects: 56, bio: 'Bringing brands to life through motion' },
    { name: 'Ethan Rodriguez', email: 'ethan.r@nexus.dev', userType: 'freelancer', role: '2D Animator', experience: '3 Years', skills: ['Animate CC', 'Character Animation', 'Storyboarding'], hourlyRate: 65, isAvailable: true, rating: 4.7, completedProjects: 41, bio: 'Character-driven animations' },
    { name: 'Mia Garcia', email: 'mia.garcia@nexus.dev', userType: 'freelancer', role: '3D Animator', experience: '5 Years', skills: ['Blender', 'Maya', 'Rigging'], hourlyRate: 90, isAvailable: true, rating: 4.8, completedProjects: 34, bio: '3D worlds and characters' },
    { name: 'Lucas White', email: 'lucas.white@nexus.dev', userType: 'freelancer', role: 'Explainer Video Animator', experience: '3 Years', skills: ['After Effects', 'Vyond', 'Scriptwriting'], hourlyRate: 55, isAvailable: true, rating: 4.6, completedProjects: 72, bio: 'Simplifying complex ideas' },
    { name: 'Charlotte Brown', email: 'charlotte.b@nexus.dev', userType: 'freelancer', role: 'Whiteboard Animator', experience: '2 Years', skills: ['VideoScribe', 'Doodly', 'Illustration'], hourlyRate: 40, isAvailable: true, rating: 4.5, completedProjects: 88, bio: 'Engaging whiteboard storytelling' },
    { name: 'James Wilson', email: 'james.wilson@nexus.dev', userType: 'freelancer', role: 'Content Writer', experience: '4 Years', skills: ['SEO Writing', 'Blog Posts', 'Research'], hourlyRate: 45, isAvailable: true, rating: 4.7, completedProjects: 156, bio: 'SEO-optimized engaging content' },
    { name: 'Amelia Taylor', email: 'amelia.taylor@nexus.dev', userType: 'freelancer', role: 'Copywriter', experience: '5 Years', skills: ['Sales Copy', 'Email Marketing', 'Conversion Optimization'], hourlyRate: 70, isAvailable: true, rating: 4.9, completedProjects: 89, bio: 'Words that convert' },
    { name: 'Benjamin Moore', email: 'ben.moore@nexus.dev', userType: 'freelancer', role: 'Scriptwriter', experience: '3 Years', skills: ['Video Scripts', 'Storytelling', 'Hooks'], hourlyRate: 50, isAvailable: true, rating: 4.8, completedProjects: 104, bio: 'Crafting compelling narratives' },
    { name: 'Harper Anderson', email: 'harper.a@nexus.dev', userType: 'freelancer', role: 'Technical Writer', experience: '6 Years', skills: ['Documentation', 'API Docs', 'Tutorials'], hourlyRate: 75, isAvailable: false, rating: 4.9, completedProjects: 67, bio: 'Making tech understandable' },
    { name: 'Elijah Thomas', email: 'elijah.thomas@nexus.dev', userType: 'freelancer', role: 'Newsletter Writer', experience: '2 Years', skills: ['Email Copy', 'Audience Growth', 'Substack'], hourlyRate: 40, isAvailable: true, rating: 4.6, completedProjects: 78, bio: 'Engaging email storytelling' },
    { name: 'Evelyn Jackson', email: 'evelyn.j@nexus.dev', userType: 'freelancer', role: 'Ghostwriter', experience: '7 Years', skills: ['Book Writing', 'Articles', 'Voice Matching'], hourlyRate: 85, isAvailable: true, rating: 5.0, completedProjects: 45, bio: 'Your voice, amplified' },
    { name: 'Mason Harris', email: 'mason.harris@nexus.dev', userType: 'freelancer', role: 'Social Media Manager', experience: '4 Years', skills: ['Content Strategy', 'Analytics', 'Community Management'], hourlyRate: 60, isAvailable: true, rating: 4.8, completedProjects: 52, bio: 'Building engaged communities' },
    { name: 'Ella Martin', email: 'ella.martin@nexus.dev', userType: 'freelancer', role: 'Meme Creator', experience: '2 Years', skills: ['Viral Content', 'Trend Analysis', 'Photoshop'], hourlyRate: 25, isAvailable: true, rating: 4.5, completedProjects: 210, bio: 'Making brands go viral' },
    { name: 'Logan Lee', email: 'logan.lee@nexus.dev', userType: 'freelancer', role: 'SEO Specialist', experience: '5 Years', skills: ['Keyword Research', 'On-Page SEO', 'Link Building'], hourlyRate: 65, isAvailable: true, rating: 4.7, completedProjects: 73, bio: 'Getting you to #1 on Google' },
    { name: 'Aria Walker', email: 'aria.walker@nexus.dev', userType: 'freelancer', role: 'Instagram Growth Specialist', experience: '3 Years', skills: ['Reels Strategy', 'Engagement', 'Analytics'], hourlyRate: 50, isAvailable: true, rating: 4.9, completedProjects: 64, bio: 'Growing your Instagram organically' },
    { name: 'Jackson Hall', email: 'jackson.hall@nexus.dev', userType: 'freelancer', role: 'YouTube Growth Strategist', experience: '4 Years', skills: ['Algorithm', 'Retention', 'Thumbnails'], hourlyRate: 70, isAvailable: true, rating: 4.8, completedProjects: 48, bio: 'Cracking the YouTube algorithm' },
    { name: 'Scarlett Allen', email: 'scarlett.allen@nexus.dev', userType: 'freelancer', role: 'Email Marketing Specialist', experience: '5 Years', skills: ['Mailchimp', 'Segmentation', 'Automation'], hourlyRate: 60, isAvailable: false, rating: 4.7, completedProjects: 81, bio: 'Email campaigns that convert' },
    { name: 'Aiden Young', email: 'aiden.young@nexus.dev', userType: 'freelancer', role: 'Influencer Marketing Manager', experience: '3 Years', skills: ['Partnerships', 'Campaign Management', 'ROI Tracking'], hourlyRate: 75, isAvailable: true, rating: 4.6, completedProjects: 39, bio: 'Connecting brands with influencers' },
    { name: 'Chloe Hernandez', email: 'chloe.h@nexus.dev', userType: 'freelancer', role: 'Podcast Editor', experience: '3 Years', skills: ['Audacity', 'Audio Cleanup', 'Show Notes'], hourlyRate: 45, isAvailable: true, rating: 4.8, completedProjects: 127, bio: 'Polished podcast episodes' },
    { name: 'Sebastian King', email: 'sebastian.king@nexus.dev', userType: 'freelancer', role: 'Voiceover Artist', experience: '6 Years', skills: ['Narration', 'Character Voices', 'Home Studio'], hourlyRate: 80, isAvailable: true, rating: 4.9, completedProjects: 156, bio: 'Professional voice for your content' },
    { name: 'Grace Wright', email: 'grace.wright@nexus.dev', userType: 'freelancer', role: 'Sound Designer', experience: '4 Years', skills: ['Sound Effects', 'Foley', 'Pro Tools'], hourlyRate: 70, isAvailable: true, rating: 4.7, completedProjects: 62, bio: 'Immersive audio experiences' },
    { name: 'Henry Lopez', email: 'henry.lopez@nexus.dev', userType: 'freelancer', role: 'Music Producer', experience: '5 Years', skills: ['Ableton', 'Logic Pro', 'Mixing'], hourlyRate: 85, isAvailable: true, rating: 4.8, completedProjects: 54, bio: 'Original music for your brand' },
    { name: 'Layla Hill', email: 'layla.hill@nexus.dev', userType: 'freelancer', role: 'Audio Engineer', experience: '7 Years', skills: ['Mixing', 'Mastering', 'Studio Recording'], hourlyRate: 90, isAvailable: false, rating: 5.0, completedProjects: 78, bio: 'Studio-quality audio production' },
    { name: 'Daniel Scott', email: 'daniel.scott@nexus.dev', userType: 'freelancer', role: 'AI Content Creator', experience: '2 Years', skills: ['ChatGPT', 'Midjourney', 'Prompt Engineering'], hourlyRate: 55, isAvailable: true, rating: 4.6, completedProjects: 92, bio: 'AI-powered content at scale' },
    { name: 'Victoria Green', email: 'victoria.green@nexus.dev', userType: 'freelancer', role: 'AI Video Generator', experience: '1 Year', skills: ['Runway ML', 'Synthesia', 'AI Editing'], hourlyRate: 50, isAvailable: true, rating: 4.5, completedProjects: 67, bio: 'Creating videos with AI' },
    { name: 'Matthew Adams', email: 'matthew.adams@nexus.dev', userType: 'freelancer', role: 'AI Image Generator', experience: '2 Years', skills: ['Midjourney', 'DALL-E', 'Stable Diffusion'], hourlyRate: 45, isAvailable: true, rating: 4.7, completedProjects: 103, bio: 'AI-generated visual assets' },
    { name: 'Luna Baker', email: 'luna.baker@nexus.dev', userType: 'freelancer', role: 'Web Developer', experience: '5 Years', skills: ['React', 'Node.js', 'MongoDB'], hourlyRate: 95, isAvailable: true, rating: 4.9, completedProjects: 47, bio: 'Full-stack web solutions' },
    { name: 'Dylan Nelson', email: 'dylan.nelson@nexus.dev', userType: 'freelancer', role: 'Automation Specialist', experience: '4 Years', skills: ['Zapier', 'Make.com', 'Python Scripts'], hourlyRate: 75, isAvailable: true, rating: 4.8, completedProjects: 59, bio: 'Automating your workflows' },
    { name: 'Stella Carter', email: 'stella.carter@nexus.dev', userType: 'freelancer', role: 'Data Analyst', experience: '6 Years', skills: ['Python', 'SQL', 'Tableau'], hourlyRate: 85, isAvailable: false, rating: 4.9, completedProjects: 51, bio: 'Data-driven insights' },
    { name: 'Ryan Mitchell', email: 'ryan.mitchell@nexus.dev', userType: 'freelancer', role: 'Community Manager', experience: '3 Years', skills: ['Discord', 'Moderation', 'Engagement'], hourlyRate: 40, isAvailable: true, rating: 4.6, completedProjects: 68, bio: 'Building loyal communities' },
    { name: 'Nora Perez', email: 'nora.perez@nexus.dev', userType: 'freelancer', role: 'Research Assistant', experience: '4 Years', skills: ['Fact Checking', 'Academic Research', 'Citations'], hourlyRate: 35, isAvailable: true, rating: 4.7, completedProjects: 112, bio: 'Thorough research support' },
    { name: 'Isaac Roberts', email: 'isaac.roberts@nexus.dev', userType: 'freelancer', role: 'Subtitle Creator', experience: '2 Years', skills: ['Transcription', 'Translation', 'Timing'], hourlyRate: 30, isAvailable: true, rating: 4.5, completedProjects: 189, bio: 'Accurate multilingual subtitles' },
    { name: 'Penelope Turner', email: 'penelope.t@nexus.dev', userType: 'freelancer', role: 'Translator', experience: '8 Years', skills: ['Spanish', 'French', 'German'], hourlyRate: 50, isAvailable: true, rating: 4.9, completedProjects: 156, bio: 'Professional translation services' },
    { name: 'Nathan Phillips', email: 'nathan.p@nexus.dev', userType: 'freelancer', role: 'Video Game Streamer Editor', experience: '2 Years', skills: ['Stream Highlights', 'Gaming Content', 'Twitch'], hourlyRate: 35, isAvailable: true, rating: 4.6, completedProjects: 145, bio: 'Epic gaming content edits' },
    { name: 'Hazel Campbell', email: 'hazel.campbell@nexus.dev', userType: 'freelancer', role: 'Product Photographer', experience: '5 Years', skills: ['Lighting', 'Editing', 'E-commerce'], hourlyRate: 65, isAvailable: false, rating: 4.8, completedProjects: 73, bio: 'Product photos that sell' },
    { name: 'Owen Parker', email: 'owen.parker@nexus.dev', userType: 'freelancer', role: 'Virtual Assistant', experience: '3 Years', skills: ['Scheduling', 'Email Management', 'Research'], hourlyRate: 30, isAvailable: true, rating: 4.5, completedProjects: 201, bio: 'Your remote right hand' },
    { name: 'Violet Evans', email: 'violet.evans@nexus.dev', userType: 'freelancer', role: 'Project Manager', experience: '7 Years', skills: ['Agile', 'Coordination', 'Deadline Management'], hourlyRate: 80, isAvailable: true, rating: 4.9, completedProjects: 63, bio: 'Keeping projects on track' },
    { name: 'Caleb Edwards', email: 'caleb.edwards@nexus.dev', userType: 'freelancer', role: 'Proofreader', experience: '4 Years', skills: ['Grammar', 'AP Style', 'Editing'], hourlyRate: 35, isAvailable: true, rating: 4.7, completedProjects: 287, bio: 'Error-free content' },
    { name: 'Lily Collins', email: 'lily.collins@nexus.dev', userType: 'freelancer', role: 'Brand Strategist', experience: '6 Years', skills: ['Market Research', 'Positioning', 'Messaging'], hourlyRate: 90, isAvailable: true, rating: 5.0, completedProjects: 41, bio: 'Strategic brand development' }
  ];

  freelancers.forEach(freelancer => {
    const id = `user_${db.nextUserId++}`;
    db.users.set(id, { _id: id, ...freelancer });
  });

  // Add sample jobs
  const sampleJobs = [
    { title: 'App Interface Redesign', description: 'Need a complete UI overhaul', creatorName: 'Tech Startup X', budget: 1200, requiredSkills: ['UI/UX Designer', 'Figma'], status: 'open' },
    { title: 'Monthly Newsletter Management', description: 'Handle weekly newsletter', creatorName: 'Fitness Guru', budget: 400, requiredSkills: ['Newsletter Creator'], status: 'open' },
    { title: 'Viral Twitter Memes Weekly', description: 'Create engaging memes', creatorName: 'Gaming YT', budget: 200, requiredSkills: ['Meme Creator'], status: 'open' },
    { title: 'Product Promo Videos', description: 'High-quality promo content', creatorName: 'E-Commerce Brand', budget: 850, requiredSkills: ['Video Editor'], status: 'open' },
    { title: 'Audio Cleanup & Mixing', description: 'Polish podcast audio', creatorName: 'Sci-Fi Podcast', budget: 300, requiredSkills: ['Podcast Editor'], status: 'open' },
    { title: 'Generate B-Roll with AI', description: 'AI-generated video assets', creatorName: 'AI Agency', budget: 700, requiredSkills: ['AI Video Generator'], status: 'open' },
    { title: '3D Animation of Floor Plans', description: '3D walkthrough videos', creatorName: 'Real Estate YT', budget: 1500, requiredSkills: ['3D Animator'], status: 'open' },
    { title: 'Color Grade & Cut Europe Vlog', description: 'Professional editing', creatorName: 'Travel Vlogger', budget: 600, requiredSkills: ['Video Editor'], status: 'open' }
  ];

  sampleJobs.forEach(job => {
    const id = `job_${db.nextJobId++}`;
    db.jobs.set(id, { _id: id, ...job, createdAt: new Date() });
  });

  console.log(`✅ In-memory DB seeded: ${db.users.size} users, ${db.jobs.size} jobs`);
}

seedInMemoryDB();

/**
 * DSA Concept: Hash Map (Session Storage)
 * Socket.io uses an in-memory hash map to store connected clients
 */
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  socket.on('taskMoved', (data) => {
    console.log('📋 Task moved:', data);
    socket.broadcast.emit('taskUpdate', data);
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

// Import route handlers (modified for in-memory DB)
const aiMatchRoutes = require('./routes/ai-match-inmemory');
const userRoutes = require('./routes/users-inmemory');
const jobRoutes = require('./routes/jobs-inmemory');

// Pass db to routes
app.use((req, res, next) => {
  req.db = db;
  next();
});

app.use('/api/ai-match', aiMatchRoutes);
app.use('/api/users', userRoutes);
app.use('/api/jobs', jobRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Nexus Matchmaker API is running (In-Memory Mode)',
    timestamp: new Date().toISOString(),
    stats: {
      users: db.users.size,
      jobs: db.jobs.size
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 Socket.io enabled for real-time updates`);
  console.log(`💾 Using in-memory database (no MongoDB required)`);
});
