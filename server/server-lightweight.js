require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
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

// Serve the website from the project root, but never expose the server folder.
app.use((req, res, next) => {
  if (req.path.startsWith('/server')) {
    return res.status(404).end();
  }
  next();
});
app.use(express.static(path.join(__dirname, '..')));

/**
 * IN-MEMORY DATABASE
 * DSA: Hash Tables (Map) provide O(1) lookups by id.
 */
const db = {
  users: new Map(),          // userId -> user
  jobs: new Map(),           // jobId -> job
  collaborations: new Map(), // collabId -> hired relationship
  conversations: new Map(),  // chatId -> conversation (application or hire)
  messages: new Map(),       // chatId -> message array
  nextUserId: 1,
  nextJobId: 1,
  nextCollabId: 1,
  nextMessageId: 1
};

// 50 Content Creator Freelancers with different specializations
const freelancers = [
  { name: 'Pratik Sharma', username: 'pratik', role: 'Video Editor', skills: ['Premiere Pro', 'DaVinci Resolve', 'After Effects'], experience: '3 Years', hourlyRate: 50, bio: 'Specialized in YouTube content editing' },
  { name: 'Sarah Johnson', username: 'sarah_editor', role: 'Video Editor', skills: ['Final Cut Pro', 'Motion Graphics', 'Color Grading'], experience: '5 Years', hourlyRate: 65, bio: 'Professional video editor for vlogs and documentaries' },
  { name: 'Mike Chen', username: 'mike_thumbnails', role: 'Thumbnail Designer', skills: ['Photoshop', 'Illustrator', 'CTR Optimization'], experience: '2 Years', hourlyRate: 35, bio: 'Creating eye-catching thumbnails that boost CTR' },
  { name: 'Emma Davis', username: 'emma_graphics', role: 'Graphic Designer', skills: ['Canva', 'Photoshop', 'Brand Design'], experience: '4 Years', hourlyRate: 45, bio: 'Channel branding and visual identity expert' },
  { name: 'Alex Turner', username: 'alex_motion', role: 'Motion Graphics Designer', skills: ['After Effects', 'Cinema 4D', 'Blender'], experience: '6 Years', hourlyRate: 80, bio: 'Creating stunning intros and animations' },
  { name: 'Priya Patel', username: 'priya_script', role: 'Scriptwriter', skills: ['Storytelling', 'SEO Writing', 'Research'], experience: '3 Years', hourlyRate: 40, bio: 'Engaging scripts for YouTube and podcasts' },
  { name: 'David Martinez', username: 'david_seo', role: 'SEO Specialist', skills: ['YouTube SEO', 'Keywords', 'Analytics'], experience: '5 Years', hourlyRate: 55, bio: 'Growing channels through strategic SEO' },
  { name: 'Lisa Wang', username: 'lisa_social', role: 'Social Media Manager', skills: ['Instagram', 'Twitter', 'TikTok'], experience: '4 Years', hourlyRate: 50, bio: 'Multi-platform content strategy and growth' },
  { name: 'James Brown', username: 'james_sound', role: 'Audio Engineer', skills: ['Audacity', 'Pro Tools', 'Noise Reduction'], experience: '7 Years', hourlyRate: 60, bio: 'Crystal clear audio for podcasts and videos' },
  { name: 'Sophia Lee', username: 'sophia_voice', role: 'Voiceover Artist', skills: ['Narration', 'Character Voices', 'Professional Recording'], experience: '5 Years', hourlyRate: 70, bio: 'Professional voiceovers in multiple accents' },
  { name: 'Ryan Taylor', username: 'ryan_shorts', role: 'Short-form Content Creator', skills: ['Reels', 'Shorts', 'TikTok Editing'], experience: '2 Years', hourlyRate: 35, bio: 'Viral short-form content specialist' },
  { name: 'Mia Robinson', username: 'mia_captions', role: 'Caption & Subtitle Writer', skills: ['Subtitling', 'Translation', 'Accessibility'], experience: '3 Years', hourlyRate: 30, bio: 'Accurate captions in multiple languages' },
  { name: 'Kevin Nguyen', username: 'kevin_animator', role: '2D Animator', skills: ['Adobe Animate', 'Toon Boom', 'Character Design'], experience: '4 Years', hourlyRate: 75, bio: 'Bringing stories to life with animation' },
  { name: 'Olivia Wilson', username: 'olivia_research', role: 'Content Researcher', skills: ['Fact-checking', 'Data Analysis', 'Topic Research'], experience: '3 Years', hourlyRate: 35, bio: 'Deep research for educational content' },
  { name: 'Chris Anderson', username: 'chris_music', role: 'Music Producer', skills: ['Royalty-free Music', 'Sound Design', 'Audio Mixing'], experience: '6 Years', hourlyRate: 65, bio: 'Custom music and soundtracks' },
  { name: 'Hannah Moore', username: 'hannah_thumbnail', role: 'Thumbnail Specialist', skills: ['Click Psychology', 'A/B Testing', 'Design'], experience: '2 Years', hourlyRate: 40, bio: 'Data-driven thumbnail optimization' },
  { name: 'Daniel Kim', username: 'daniel_camera', role: 'Cinematographer', skills: ['Camera Work', 'Lighting', 'Shot Composition'], experience: '8 Years', hourlyRate: 90, bio: 'Professional filming and cinematography' },
  { name: 'Emily Clark', username: 'emily_color', role: 'Colorist', skills: ['DaVinci Resolve', 'Color Grading', 'LUT Creation'], experience: '5 Years', hourlyRate: 60, bio: 'Cinematic color grading for YouTube' },
  { name: 'Marcus Johnson', username: 'marcus_vfx', role: 'VFX Artist', skills: ['After Effects', 'Nuke', 'Visual Effects'], experience: '7 Years', hourlyRate: 85, bio: 'Professional visual effects and compositing' },
  { name: 'Isabella Garcia', username: 'bella_content', role: 'Content Strategist', skills: ['Channel Strategy', 'Analytics', 'Growth Planning'], experience: '5 Years', hourlyRate: 70, bio: 'Strategic planning for channel growth' },
  { name: 'Tyler White', username: 'tyler_live', role: 'Live Stream Manager', skills: ['OBS', 'StreamYard', 'Live Production'], experience: '3 Years', hourlyRate: 55, bio: 'Professional live streaming setup and management' },
  { name: 'Ava Martinez', username: 'ava_community', role: 'Community Manager', skills: ['Engagement', 'Moderation', 'Fan Interaction'], experience: '4 Years', hourlyRate: 45, bio: 'Building and managing engaged communities' },
  { name: 'Noah Thompson', username: 'noah_podcast', role: 'Podcast Editor', skills: ['Podcast Editing', 'Audio Mastering', 'Show Notes'], experience: '4 Years', hourlyRate: 50, bio: 'Full podcast production and editing' },
  { name: 'Zoe Davis', username: 'zoe_writer', role: 'Blog Writer', skills: ['SEO Writing', 'Content Writing', 'WordPress'], experience: '5 Years', hourlyRate: 45, bio: 'Engaging blog posts for creators' },
  { name: 'Ethan Brown', username: 'ethan_ads', role: 'Ad Campaign Manager', skills: ['Google Ads', 'Facebook Ads', 'ROI Optimization'], experience: '6 Years', hourlyRate: 75, bio: 'Profitable ad campaigns for creators' },
  { name: 'Chloe Wilson', username: 'chloe_email', role: 'Email Marketing Specialist', skills: ['Newsletter Design', 'Email Copy', 'Mailchimp'], experience: '4 Years', hourlyRate: 50, bio: 'Converting email campaigns and newsletters' },
  { name: 'Liam Taylor', username: 'liam_merch', role: 'Merch Designer', skills: ['T-shirt Design', 'Product Mockups', 'Print Design'], experience: '3 Years', hourlyRate: 45, bio: 'Custom merchandise for content creators' },
  { name: 'Grace Lee', username: 'grace_coach', role: 'Content Coach', skills: ['On-camera Coaching', 'Presentation Skills', 'Confidence Building'], experience: '7 Years', hourlyRate: 80, bio: 'Helping creators improve on-camera presence' },
  { name: 'Jackson Miller', username: 'jackson_dev', role: 'Web Developer', skills: ['WordPress', 'HTML/CSS', 'Website Design'], experience: '5 Years', hourlyRate: 65, bio: 'Creator websites and landing pages' },
  { name: 'Lily Anderson', username: 'lily_scheduler', role: 'Upload Scheduler', skills: ['Content Calendar', 'Scheduling', 'Organization'], experience: '2 Years', hourlyRate: 30, bio: 'Consistent upload schedules and planning' },
  { name: 'Mason Garcia', username: 'mason_analytics', role: 'Analytics Expert', skills: ['YouTube Analytics', 'Data Interpretation', 'Growth Metrics'], experience: '5 Years', hourlyRate: 60, bio: 'Data-driven channel optimization' },
  { name: 'Aria Robinson', username: 'aria_translater', role: 'Translator', skills: ['Spanish', 'French', 'Subtitle Translation'], experience: '6 Years', hourlyRate: 40, bio: 'Expanding reach through translation' },
  { name: 'Logan White', username: 'logan_drone', role: 'Drone Operator', skills: ['Drone Filming', 'Aerial Shots', 'FAA Certified'], experience: '4 Years', hourlyRate: 70, bio: 'Stunning aerial footage for creators' },
  { name: 'Scarlett Moore', username: 'scarlett_3d', role: '3D Artist', skills: ['Blender', '3D Modeling', 'Product Visualization'], experience: '5 Years', hourlyRate: 75, bio: 'Professional 3D graphics and animation' },
  { name: 'Carter Thomas', username: 'carter_pr', role: 'PR Manager', skills: ['Media Outreach', 'Press Releases', 'Brand Partnerships'], experience: '8 Years', hourlyRate: 90, bio: 'Strategic PR for growing creators' },
  { name: 'Violet Jackson', username: 'violet_niche', role: 'Niche Researcher', skills: ['Market Research', 'Trend Analysis', 'Competitor Analysis'], experience: '4 Years', hourlyRate: 50, bio: 'Finding profitable niches for creators' },
  { name: 'Hudson Martin', username: 'hudson_sponsor', role: 'Sponsorship Manager', skills: ['Brand Deals', 'Negotiation', 'Contract Review'], experience: '6 Years', hourlyRate: 80, bio: 'Securing lucrative brand partnerships' },
  { name: 'Aurora Lee', username: 'aurora_reels', role: 'Reels Specialist', skills: ['Instagram Reels', 'Viral Content', 'Trend Riding'], experience: '2 Years', hourlyRate: 40, bio: 'Creating viral Instagram Reels' },
  { name: 'Grayson Hall', username: 'grayson_b2b', role: 'B2B Content Creator', skills: ['LinkedIn Content', 'Corporate Videos', 'Professional Content'], experience: '7 Years', hourlyRate: 85, bio: 'Professional B2B content creation' },
  { name: 'Luna Adams', username: 'luna_gaming', role: 'Gaming Content Editor', skills: ['Gaming Highlights', 'Montages', 'Streaming'], experience: '3 Years', hourlyRate: 45, bio: 'Epic gaming content and montages' },
  { name: 'Wyatt Nelson', username: 'wyatt_copyright', role: 'Copyright Manager', skills: ['Copyright Claims', 'Fair Use', 'Content ID'], experience: '5 Years', hourlyRate: 60, bio: 'Protecting creators from copyright issues' },
  { name: 'Stella Carter', username: 'stella_beauty', role: 'Beauty Content Specialist', skills: ['Makeup Tutorials', 'Product Reviews', 'Beauty Editing'], experience: '4 Years', hourlyRate: 50, bio: 'Beauty and lifestyle content expert' },
  { name: 'Jasper Mitchell', username: 'jasper_tech', role: 'Tech Reviewer', skills: ['Tech Reviews', 'Unboxing', 'Product Testing'], experience: '5 Years', hourlyRate: 55, bio: 'Technical content and reviews' },
  { name: 'Hazel Perez', username: 'hazel_food', role: 'Food Content Creator', skills: ['Food Photography', 'Recipe Videos', 'Food Styling'], experience: '4 Years', hourlyRate: 50, bio: 'Delicious food content creation' },
  { name: 'Axel Roberts', username: 'axel_travel', role: 'Travel Content Creator', skills: ['Travel Vlogs', 'Destination Videos', 'Travel Tips'], experience: '6 Years', hourlyRate: 65, bio: 'Captivating travel content' },
  { name: 'Ivy Turner', username: 'ivy_edu', role: 'Educational Content Specialist', skills: ['Explainer Videos', 'Tutorials', 'Course Creation'], experience: '5 Years', hourlyRate: 60, bio: 'Clear and engaging educational content' },
  { name: 'Sawyer Phillips', username: 'sawyer_fitness', role: 'Fitness Content Creator', skills: ['Workout Videos', 'Fitness Coaching', 'Health Content'], experience: '4 Years', hourlyRate: 50, bio: 'Motivating fitness content' },
  { name: 'Nova Campbell', username: 'nova_kids', role: 'Kids Content Specialist', skills: ['Family-Friendly Content', 'Animation', 'Educational Videos'], experience: '5 Years', hourlyRate: 55, bio: 'Safe and fun content for kids' },
  { name: 'Kai Parker', username: 'kai_music', role: 'Music Content Creator', skills: ['Music Videos', 'Cover Songs', 'Music Production'], experience: '6 Years', hourlyRate: 65, bio: 'Professional music content' },
  { name: 'Willow Evans', username: 'willow_asmr', role: 'ASMR Content Specialist', skills: ['ASMR Recording', 'Binaural Audio', 'Relaxation Content'], experience: '3 Years', hourlyRate: 45, bio: 'Relaxing ASMR content creation' }
];

// 50 Content Creators from different platforms
const creators = [
  { name: 'Admin Creator', username: 'admin', channelName: 'Nexus Studio', platform: 'YouTube', subscriberCount: 1000000, contentType: 'Tech & Tutorials' },
  { name: 'TechGuru', username: 'techguru', channelName: 'Tech Guru', platform: 'YouTube', subscriberCount: 500000, contentType: 'Technology Reviews' },
  { name: 'Sarah Vlogs', username: 'sarahvlogs', channelName: 'Sarah\'s Daily Vlogs', platform: 'YouTube', subscriberCount: 250000, contentType: 'Lifestyle & Vlogs' },
  { name: 'GamingPro', username: 'gamingpro', channelName: 'Pro Gaming Channel', platform: 'Twitch', subscriberCount: 800000, contentType: 'Gaming Streams' },
  { name: 'FoodieHeaven', username: 'foodieheaven', channelName: 'Foodie Heaven', platform: 'YouTube', subscriberCount: 350000, contentType: 'Cooking & Recipes' },
  { name: 'FitnessKing', username: 'fitnessking', channelName: 'Fitness King', platform: 'Instagram', subscriberCount: 450000, contentType: 'Fitness & Workouts' },
  { name: 'BeautyQueen', username: 'beautyqueen', channelName: 'Beauty Queen', platform: 'TikTok', subscriberCount: 1200000, contentType: 'Beauty & Makeup' },
  { name: 'EduMaster', username: 'edumaster', channelName: 'Education Master', platform: 'YouTube', subscriberCount: 600000, contentType: 'Educational Content' },
  { name: 'TravelWithMe', username: 'travelwithme', channelName: 'Travel With Me', platform: 'YouTube', subscriberCount: 400000, contentType: 'Travel Vlogs' },
  { name: 'ComedyCentral', username: 'comedycentral', channelName: 'Comedy Central', platform: 'YouTube', subscriberCount: 900000, contentType: 'Comedy Sketches' },
  { name: 'MusicMania', username: 'musicmania', channelName: 'Music Mania', platform: 'Spotify', subscriberCount: 200000, contentType: 'Music & Covers' },
  { name: 'PodcastPro', username: 'podcastpro', channelName: 'Pro Podcast', platform: 'Spotify', subscriberCount: 150000, contentType: 'Talk Show Podcast' },
  { name: 'ArtStudio', username: 'artstudio', channelName: 'Art Studio', platform: 'YouTube', subscriberCount: 280000, contentType: 'Art & Drawing' },
  { name: 'BusinessTips', username: 'businesstips', channelName: 'Business Tips', platform: 'LinkedIn', subscriberCount: 320000, contentType: 'Business Advice' },
  { name: 'KidsCorner', username: 'kidscorner', channelName: 'Kids Corner', platform: 'YouTube', subscriberCount: 550000, contentType: 'Kids Entertainment' },
  { name: 'SportsNation', username: 'sportsnation', channelName: 'Sports Nation', platform: 'YouTube', subscriberCount: 700000, contentType: 'Sports Commentary' },
  { name: 'MotivationDaily', username: 'motivationdaily', channelName: 'Daily Motivation', platform: 'Instagram', subscriberCount: 380000, contentType: 'Motivational Content' },
  { name: 'DIYCreator', username: 'diycreator', channelName: 'DIY Creator', platform: 'YouTube', subscriberCount: 420000, contentType: 'DIY & Crafts' },
  { name: 'AnimationWorld', username: 'animationworld', channelName: 'Animation World', platform: 'YouTube', subscriberCount: 650000, contentType: 'Animated Stories' },
  { name: 'PhotographyHub', username: 'photographyhub', channelName: 'Photography Hub', platform: 'Instagram', subscriberCount: 290000, contentType: 'Photography Tips' },
  { name: 'PetLovers', username: 'petlovers', channelName: 'Pet Lovers', platform: 'TikTok', subscriberCount: 850000, contentType: 'Pet Content' },
  { name: 'HistoryChannel', username: 'historychannel', channelName: 'History Channel', platform: 'YouTube', subscriberCount: 480000, contentType: 'History & Facts' },
  { name: 'ScienceDaily', username: 'sciencedaily', channelName: 'Science Daily', platform: 'YouTube', subscriberCount: 520000, contentType: 'Science Explainers' },
  { name: 'FashionTrends', username: 'fashiontrends', channelName: 'Fashion Trends', platform: 'Instagram', subscriberCount: 410000, contentType: 'Fashion & Style' },
  { name: 'ParentingTips', username: 'parentingtips', channelName: 'Parenting Tips', platform: 'Facebook', subscriberCount: 330000, contentType: 'Parenting Advice' },
  { name: 'BookReviews', username: 'bookreviews', channelName: 'Book Reviews', platform: 'YouTube', subscriberCount: 180000, contentType: 'Book Reviews' },
  { name: 'CarVlogs', username: 'carvlogs', channelName: 'Car Vlogs', platform: 'YouTube', subscriberCount: 620000, contentType: 'Car Reviews' },
  { name: 'NatureExplorer', username: 'natureexplorer', channelName: 'Nature Explorer', platform: 'YouTube', subscriberCount: 390000, contentType: 'Nature & Wildlife' },
  { name: 'CryptoNews', username: 'cryptonews', channelName: 'Crypto News', platform: 'Twitter', subscriberCount: 270000, contentType: 'Cryptocurrency' },
  { name: 'RealEstateTips', username: 'realestatetips', channelName: 'Real Estate Tips', platform: 'YouTube', subscriberCount: 240000, contentType: 'Real Estate' },
  { name: 'GardeningLife', username: 'gardeninglife', channelName: 'Gardening Life', platform: 'YouTube', subscriberCount: 310000, contentType: 'Gardening Tips' },
  { name: 'MeditationZone', username: 'meditationzone', channelName: 'Meditation Zone', platform: 'YouTube', subscriberCount: 360000, contentType: 'Meditation & Wellness' },
  { name: 'ProductReviews', username: 'productreviews', channelName: 'Product Reviews', platform: 'YouTube', subscriberCount: 440000, contentType: 'Product Reviews' },
  { name: 'LanguageLearning', username: 'languagelearning', channelName: 'Language Learning', platform: 'YouTube', subscriberCount: 380000, contentType: 'Language Tutorials' },
  { name: 'DanceStudio', username: 'dancestudio', channelName: 'Dance Studio', platform: 'TikTok', subscriberCount: 920000, contentType: 'Dance Choreography' },
  { name: 'CodingTutorials', username: 'codingtutorials', channelName: 'Coding Tutorials', platform: 'YouTube', subscriberCount: 570000, contentType: 'Programming' },
  { name: 'MovieReviews', username: 'moviereviews', channelName: 'Movie Reviews', platform: 'YouTube', subscriberCount: 490000, contentType: 'Movie Reviews' },
  { name: 'HealthyLiving', username: 'healthyliving', channelName: 'Healthy Living', platform: 'Instagram', subscriberCount: 400000, contentType: 'Health & Wellness' },
  { name: 'InteriorDesign', username: 'interiordesign', channelName: 'Interior Design', platform: 'Pinterest', subscriberCount: 260000, contentType: 'Home Decor' },
  { name: 'PranksGalore', username: 'pranksgalore', channelName: 'Pranks Galore', platform: 'YouTube', subscriberCount: 750000, contentType: 'Prank Videos' },
  { name: 'MysteryStories', username: 'mysterystories', channelName: 'Mystery Stories', platform: 'YouTube', subscriberCount: 340000, contentType: 'True Crime' },
  { name: 'LifeHacks', username: 'lifehacks', channelName: 'Life Hacks', platform: 'TikTok', subscriberCount: 680000, contentType: 'Life Hacks' },
  { name: 'FinanceGuru', username: 'financeguru', channelName: 'Finance Guru', platform: 'YouTube', subscriberCount: 530000, contentType: 'Personal Finance' },
  { name: 'MinecraftWorld', username: 'minecraftworld', channelName: 'Minecraft World', platform: 'YouTube', subscriberCount: 880000, contentType: 'Minecraft Gaming' },
  { name: 'YogaFlow', username: 'yogaflow', channelName: 'Yoga Flow', platform: 'YouTube', subscriberCount: 370000, contentType: 'Yoga & Flexibility' },
  { name: 'ASMRSounds', username: 'asmrsounds', channelName: 'ASMR Sounds', platform: 'YouTube', subscriberCount: 460000, contentType: 'ASMR' },
  { name: 'ReactionsDaily', username: 'reactionsdaily', channelName: 'Reactions Daily', platform: 'YouTube', subscriberCount: 510000, contentType: 'Reaction Videos' },
  { name: 'ShortsKing', username: 'shortsking', channelName: 'Shorts King', platform: 'YouTube', subscriberCount: 1500000, contentType: 'YouTube Shorts' },
  { name: 'MemesDaily', username: 'memesdaily', channelName: 'Memes Daily', platform: 'Instagram', subscriberCount: 720000, contentType: 'Meme Content' },
  { name: 'VRExperience', username: 'vrexperience', channelName: 'VR Experience', platform: 'YouTube', subscriberCount: 290000, contentType: 'VR Gaming' },
  { name: 'HomeRepair', username: 'homerepair', channelName: 'Home Repair', platform: 'YouTube', subscriberCount: 350000, contentType: 'Home Improvement' }
];

function seedDatabase() {
  // Seed freelancers. Seeded accounts are given older timestamps so that
  // newly registered users are easy to spot at the top of the lists.
  freelancers.forEach((f, index) => {
    const id = `freelancer_${index + 1}`;
    const createdAt = new Date(Date.now() - (index + 10) * 86400000).toISOString();
    db.users.set(id, {
      _id: id,
      email: `${f.username}@nexus.dev`,
      password: 'password',
      userType: 'freelancer',
      ...f,
      isAvailable: index % 9 !== 0,
      rating: Number((4.0 + Math.random()).toFixed(1)),
      completedProjects: Math.floor(Math.random() * 50) + 10,
      createdAt
    });
  });

  // Seed creators (includes the demo "admin" creator account).
  creators.forEach((c, index) => {
    const id = `creator_${index + 1}`;
    const createdAt = new Date(Date.now() - (index + 10) * 86400000).toISOString();
    db.users.set(id, {
      _id: id,
      email: `${c.username}@nexus.dev`,
      password: 'password',
      userType: 'creator',
      ...c,
      createdAt
    });
  });

  db.nextUserId = 101;
  seedJobs();

  console.log(`✅ Seeded ${freelancers.length} freelancers, ${creators.length} creators, ${db.jobs.size} open jobs`);
}

/**
 * Seed realistic creator hirings so the freelancer portal is useful on first run.
 * Jobs are linked to seeded creators by username, keeping ids stable if the seed
 * order changes later.
 */
function seedJobs() {
  const findCreator = (username) =>
    Array.from(db.users.values()).find(u => u.userType === 'creator' && u.username === username);

  const sampleJobs = [
    {
      creatorUsername: 'techguru',
      title: 'YouTube Video Editor for Tech Reviews',
      description: 'Edit weekly 10-15 minute tech review videos with clean cuts, b-roll and captions.',
      budget: 800,
      requiredSkills: ['Video Editing', 'Premiere Pro', 'Color Grading']
    },
    {
      creatorUsername: 'sarahvlogs',
      title: 'Thumbnail Designer for Daily Vlogs',
      description: 'Create 5 high-CTR thumbnails per week for a lifestyle vlog channel.',
      budget: 350,
      requiredSkills: ['Thumbnail Design', 'Photoshop', 'CTR Optimization']
    },
    {
      creatorUsername: 'gamingpro',
      title: 'Short-Form Clips Editor for Gaming Streams',
      description: 'Turn long Twitch streams into punchy Shorts, Reels and TikToks.',
      budget: 600,
      requiredSkills: ['Short-form Editing', 'CapCut', 'Premiere Pro']
    },
    {
      creatorUsername: 'foodieheaven',
      title: 'Recipe Video Editor',
      description: 'Edit recipe videos with appetizing pacing, sound design and color grading.',
      budget: 450,
      requiredSkills: ['Video Editing', 'Food Styling', 'Color Grading']
    },
    {
      creatorUsername: 'fitnessking',
      title: 'Social Media Manager for Fitness Brand',
      description: 'Plan and publish daily fitness content across Instagram, TikTok and X.',
      budget: 700,
      requiredSkills: ['Social Media Management', 'Content Strategy', 'Analytics']
    },
    {
      creatorUsername: 'beautyqueen',
      title: 'Beauty Reels Editor',
      description: 'Edit fast-paced beauty reels with trending transitions and captions.',
      budget: 500,
      requiredSkills: ['Reels Editing', 'After Effects', 'Trend Analysis']
    },
    {
      creatorUsername: 'edumaster',
      title: 'Motion Graphics for Educational Channel',
      description: 'Build explainer animations and animated lower thirds for lessons.',
      budget: 900,
      requiredSkills: ['Motion Graphics', 'After Effects', 'Animation']
    },
    {
      creatorUsername: 'travelwithme',
      title: 'Travel Vlog Editor',
      description: 'Cut a weekly travel vlog with cinematic color grading and music sync.',
      budget: 650,
      requiredSkills: ['Video Editing', 'DaVinci Resolve', 'Color Grading']
    },
    {
      creatorUsername: 'podcastpro',
      title: 'Podcast Audio Editor',
      description: 'Clean up, mix and master two podcast episodes per week.',
      budget: 400,
      requiredSkills: ['Podcast Editing', 'Audio Mastering', 'Noise Reduction']
    },
    {
      creatorUsername: 'businesstips',
      title: 'SEO Blog Writer',
      description: 'Write two SEO-optimized business articles per week with research.',
      budget: 300,
      requiredSkills: ['SEO Writing', 'Content Writing', 'Research']
    },
    {
      creatorUsername: 'gamingpro',
      title: 'Community Manager for Gaming Community',
      description: 'Manage Discord, moderate chat and run weekly community events.',
      budget: 550,
      requiredSkills: ['Community Management', 'Discord', 'Engagement']
    },
    {
      creatorUsername: 'techguru',
      title: '3D Product Animation',
      description: 'Create a 30-second 3D product animation for a sponsor integration.',
      budget: 1200,
      requiredSkills: ['3D Animation', 'Blender', 'Product Visualization']
    }
  ];

  sampleJobs.forEach((job, index) => {
    const creator = findCreator(job.creatorUsername);
    if (!creator) return;

    const id = `job_${db.nextJobId++}`;
    db.jobs.set(id, {
      _id: id,
      title: job.title,
      description: job.description,
      budget: job.budget,
      requiredSkills: job.requiredSkills,
      creator: creator._id,
      creatorName: creator.name,
      channelName: creator.channelName,
      platform: creator.platform,
      status: 'open',
      applicants: [],
      createdAt: new Date(Date.now() - index * 3600000).toISOString()
    });
  });
}

seedDatabase();


// ============================================================
// Helpers
// ============================================================

function publicUser(user) {
  if (!user) return null;
  const { password, ...safe } = user;
  return safe;
}

function getUser(id) {
  return db.users.get(id);
}

/**
 * Every creator/freelancer pair gets one deterministic chat id.
 * Sorting the two ids keeps the same conversation no matter who starts it.
 */
function getChatId(creatorId, freelancerId) {
  return [creatorId, freelancerId].sort().join('__');
}

function findCollaboration(creatorId, freelancerId) {
  for (const collab of db.collaborations.values()) {
    const collabCreatorId = collab.creator?._id || collab.creator;
    const collabFreelancerId = collab.freelancer?._id || collab.freelancer;
    if (collabCreatorId === creatorId && collabFreelancerId === freelancerId) {
      return collab;
    }
  }
  return null;
}

/**
 * Creates a conversation on first contact (application, hire, or direct message)
 * and upgrades its status when the relationship progresses.
 */
function ensureConversation(creatorId, freelancerId, details = {}) {
  const creator = getUser(creatorId);
  const freelancer = getUser(freelancerId);

  if (!creator || creator.userType !== 'creator') return null;
  if (!freelancer || freelancer.userType !== 'freelancer') return null;

  const chatId = getChatId(creatorId, freelancerId);
  const now = new Date().toISOString();
  let conversation = db.conversations.get(chatId);

  if (!conversation) {
    conversation = {
      _id: chatId,
      chatId,
      creatorId,
      freelancerId,
      status: details.status || 'connected',
      jobId: details.jobId || null,
      jobTitle: details.jobTitle || null,
      createdAt: now,
      updatedAt: now,
      lastMessage: '',
      lastMessageAt: now
    };
  }

  if (details.jobId) {
    conversation.jobId = details.jobId;
    conversation.jobTitle = details.jobTitle || conversation.jobTitle;
  }

  if (details.status === 'hired') {
    conversation.status = 'hired';
  } else if (details.status === 'applied' && conversation.status !== 'hired') {
    conversation.status = 'applied';
  }

  conversation.updatedAt = now;
  db.conversations.set(chatId, conversation);
  return conversation;
}

function serializeConversation(conversation, viewerId) {
  if (!conversation) return null;

  const creator = getUser(conversation.creatorId);
  const freelancer = getUser(conversation.freelancerId);
  const otherUser = viewerId === conversation.creatorId ? freelancer : creator;
  const messages = db.messages.get(conversation.chatId) || [];
  const last = messages[messages.length - 1];

  return {
    ...conversation,
    creator: publicUser(creator),
    freelancer: publicUser(freelancer),
    otherUser: publicUser(otherUser),
    lastMessage: last
      ? { message: last.message, senderId: last.senderId, timestamp: last.timestamp }
      : null,
    messageCount: messages.length
  };
}

function storeMessage({ chatId, senderId, senderName, message, timestamp }) {
  const conversation = db.conversations.get(chatId);
  if (!conversation) return null;

  const isParticipant =
    senderId === conversation.creatorId || senderId === conversation.freelancerId;
  if (!isParticipant) return null;

  const text = String(message || '').trim();
  if (!text) return null;

  const sender = getUser(senderId);
  const messageData = {
    _id: `msg_${db.nextMessageId++}`,
    chatId,
    senderId,
    senderName: senderName || sender?.name || 'User',
    message: text.slice(0, 2000),
    timestamp: timestamp || new Date().toISOString()
  };

  if (!db.messages.has(chatId)) db.messages.set(chatId, []);
  db.messages.get(chatId).push(messageData);

  conversation.lastMessage = messageData.message;
  conversation.lastMessageAt = messageData.timestamp;
  conversation.updatedAt = messageData.timestamp;
  db.conversations.set(chatId, conversation);

  return messageData;
}

function broadcastMessage(messageData) {
  const conversation = db.conversations.get(messageData.chatId);
  if (!conversation) return;

  // Room broadcast for users currently viewing the chat.
  io.to(`chat_${messageData.chatId}`).emit('newMessage', messageData);

  // User-room broadcast so dashboards and the conversation list stay live.
  io.to(`creator_${conversation.creatorId}`).emit('newMessage', messageData);
  io.to(`freelancer_${conversation.freelancerId}`).emit('newMessage', messageData);
  io.to(`creator_${conversation.creatorId}`).emit('conversationUpdated', conversation);
  io.to(`freelancer_${conversation.freelancerId}`).emit('conversationUpdated', conversation);
}

function calculateJobMatch(job, freelancer) {
  if (!freelancer) return 0;

  const required = (job.requiredSkills || []).map(s => String(s).toLowerCase());
  const role = String(freelancer.role || '').toLowerCase();
  const skills = (freelancer.skills || []).map(s => String(s).toLowerCase());
  const bio = String(freelancer.bio || '').toLowerCase();

  let score = 40;

  required.forEach(req => {
    if (role.includes(req) || req.includes(role)) score += 22;
    else if (skills.some(s => s.includes(req) || req.includes(s))) score += 16;
    else if (bio.includes(req)) score += 6;
  });

  score += Math.min(10, Math.round((Number(freelancer.rating) || 0) * 2));
  if (freelancer.isAvailable) score += 10;

  return Math.max(35, Math.min(99, Math.round(score)));
}

function calculateFreelancerMatch(prompt, freelancer) {
  const stopwords = new Set([
    'the', 'and', 'for', 'with', 'need', 'looking', 'hire', 'someone', 'who', 'can',
    'that', 'this', 'have', 'from', 'your', 'you', 'our', 'are', 'was', 'will',
    'want', 'would', 'should', 'about', 'into', 'make', 'create', 'help', 'find',
    'please', 'some', 'any', 'good', 'best', 'new'
  ]);

  const tokens = String(prompt || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 1 && !stopwords.has(token));

  const role = String(freelancer.role || '').toLowerCase();
  const skills = (freelancer.skills || []).map(s => String(s).toLowerCase());
  const bio = String(freelancer.bio || '').toLowerCase();

  let score = 45;
  let hits = 0;

  tokens.forEach(token => {
    if (role.includes(token) || token.includes(role)) {
      score += 24;
      hits++;
    } else if (skills.some(s => s.includes(token) || token.includes(s))) {
      score += 12;
      hits++;
    } else if (bio.includes(token)) {
      score += 5;
      hits++;
    }
  });

  if (hits === 0) score += 5;
  score += Math.min(10, Math.round((Number(freelancer.rating) || 0) * 2));
  if (freelancer.isAvailable) score += 10;

  return {
    ...publicUser(freelancer),
    matchScore: Math.max(40, Math.min(99, Math.round(score))),
    matchedTokens: hits
  };
}

function getApplicationFreelancerId(application) {
  return application?.freelancerId || application?.freelancer || application;
}

// ============================================================
// Socket.io real-time communication
// ============================================================

io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  socket.on('joinCreatorRoom', (creatorId) => {
    socket.join(`creator_${creatorId}`);
  });

  socket.on('joinFreelancerRoom', (freelancerId) => {
    socket.join(`freelancer_${freelancerId}`);
  });

  socket.on('joinChatRoom', (chatId) => {
    socket.join(`chat_${chatId}`);
  });

  socket.on('sendMessage', (data) => {
    const messageData = storeMessage(data || {});
    if (!messageData) return;
    broadcastMessage(messageData);
  });

  socket.on('taskMoved', (data) => {
    const { freelancerId, creatorId, fromColumn, toColumn, task } = data || {};

    const collab = findCollaboration(creatorId, freelancerId);
    if (!collab) return;

    if (!collab.tasks) collab.tasks = { todo: [], inprogress: [], done: [] };
    if (!Array.isArray(collab.tasks[fromColumn]) || !Array.isArray(collab.tasks[toColumn])) return;

    const fromTasks = collab.tasks[fromColumn];
    const taskIndex = fromTasks.findIndex(t => t.title === task?.title);
    if (taskIndex === -1) return;

    fromTasks.splice(taskIndex, 1);
    collab.tasks[toColumn].push(task);

    io.to(`creator_${creatorId}`).emit('taskUpdate', data);
    io.to(`freelancer_${freelancerId}`).emit('taskUpdate', data);
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

// ============================================================
// Authentication
// ============================================================

app.post('/api/auth/login', (req, res) => {
  const { username, password, userType } = req.body || {};
  const normalizedUsername = String(username || '').trim().toLowerCase();

  const users = Array.from(db.users.values());
  const user = users.find(u =>
    String(u.username || '').toLowerCase() === normalizedUsername &&
    u.password === password &&
    u.userType === userType
  );

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  user.lastLoginAt = new Date().toISOString();

  res.json({
    success: true,
    message: 'Login successful',
    user: publicUser(user),
    token: 'demo-token-' + Date.now()
  });
});

app.post('/api/auth/signup', (req, res) => {
  const { username, email, password, name, userType } = req.body || {};

  if (!username || !email || !password || !name || !userType) {
    return res.status(400).json({ error: 'Name, email, username, password and user type are required' });
  }

  if (!['creator', 'freelancer'].includes(userType)) {
    return res.status(400).json({ error: 'Invalid user type' });
  }

  // Gmail-only email validation
  const normalizedEmail = String(email).trim().toLowerCase();
  if (!normalizedEmail.endsWith('@gmail.com')) {
    return res.status(400).json({ error: 'Only @gmail.com email addresses are accepted' });
  }

  const users = Array.from(db.users.values());
  const normalizedUsername = String(username).trim().toLowerCase();

  const existingByUsername = users.find(u =>
    String(u.username || '').toLowerCase() === normalizedUsername
  );
  if (existingByUsername) {
    return res.status(400).json({ error: 'This username is already taken. Please choose another.' });
  }

  const existingByEmail = users.find(u =>
    String(u.email || '').toLowerCase() === normalizedEmail
  );
  if (existingByEmail) {
    return res.status(400).json({ error: 'This email address is already registered.' });
  }

  const userId = `${userType}_${db.nextUserId++}`;
  const newUser = {
    _id: userId,
    ...req.body,
    username: String(username).trim(),
    email: String(email).trim(),
    name: String(name).trim(),
    userType,
    createdAt: new Date().toISOString()
  };

  if (userType === 'freelancer') {
    newUser.isAvailable = true;
    newUser.rating = 0;
    newUser.completedProjects = 0;
    newUser.skills = Array.isArray(newUser.skills) ? newUser.skills : [];
  }

  db.users.set(userId, newUser);

  // New profiles should immediately be discoverable on the other side.
  io.emit('newUser', { userType, user: publicUser(newUser) });

  console.log(`✅ New ${userType} registered: ${username}`);

  res.status(201).json({
    success: true,
    message: 'Account created successfully',
    userId,
    user: publicUser(newUser)
  });
});

app.get('/api/auth/me/:id', (req, res) => {
  const user = getUser(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: publicUser(user) });
});

// ============================================================
// Creators & freelancers (directory / discovery)
// ============================================================

function listCreators(req, res) {
  const creators = Array.from(db.users.values())
    .filter(u => u.userType === 'creator')
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  res.json({ creators: creators.map(publicUser), count: creators.length });
}

function listFreelancers(req, res) {
  const { role, available, search, limit } = req.query;

  let freelancers = Array.from(db.users.values()).filter(u => u.userType === 'freelancer');

  if (role) {
    freelancers = freelancers.filter(f =>
      String(f.role || '').toLowerCase().includes(String(role).toLowerCase())
    );
  }

  if (available !== undefined) {
    freelancers = freelancers.filter(f => f.isAvailable === (available === 'true'));
  }

  if (search) {
    const term = String(search).toLowerCase();
    freelancers = freelancers.filter(f =>
      String(f.name || '').toLowerCase().includes(term) ||
      String(f.role || '').toLowerCase().includes(term) ||
      (f.skills || []).some(s => String(s).toLowerCase().includes(term))
    );
  }

  freelancers = freelancers
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, parseInt(limit, 10) || 100);

  res.json({ freelancers: freelancers.map(publicUser), count: freelancers.length });
}

app.get('/api/creators', listCreators);
app.get('/api/freelancers', listFreelancers);

// Backwards-compatible aliases used by older parts of the project/tests.
app.get('/api/users/freelancers', listFreelancers);
app.get('/api/users/creators', listCreators);

app.get('/api/users/:id', (req, res) => {
  const user = getUser(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(publicUser(user));
});

app.patch('/api/users/:id/availability', (req, res) => {
  const user = getUser(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  user.isAvailable = Boolean(req.body.isAvailable);
  db.users.set(user._id, user);

  res.json({ message: 'Availability updated', user: publicUser(user) });
});

app.patch('/api/users/:id/profile', (req, res) => {
  const user = getUser(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const allowed = ['name', 'role', 'experience', 'skills', 'bio', 'hourlyRate', 'portfolio'];
  allowed.forEach(field => {
    if (req.body[field] !== undefined) user[field] = req.body[field];
  });

  db.users.set(user._id, user);
  res.json({ message: 'Profile updated', user: publicUser(user) });
});

// ============================================================
// Collaborations (hiring)
// ============================================================

app.get('/api/collaborations/creator/:creatorId', (req, res) => {
  const collaborations = Array.from(db.collaborations.values())
    .filter(c => (c.creator?._id || c.creator) === req.params.creatorId)
    .map(collab => {
      if (!collab.chatId) {
        const conversation = ensureConversation(
          collab.creator?._id || collab.creator,
          collab.freelancer?._id || collab.freelancer,
          { status: collab.status === 'active' ? 'hired' : 'applied' }
        );
        collab.chatId = conversation?.chatId;
      }
      return { ...collab, _id: collab._id };
    });

  res.json({ collaborations, count: collaborations.length });
});

app.get('/api/collaborations/freelancer/:freelancerId', (req, res) => {
  const collaborations = Array.from(db.collaborations.values())
    .filter(c => (c.freelancer?._id || c.freelancer) === req.params.freelancerId)
    .map(collab => {
      if (!collab.chatId) {
        const conversation = ensureConversation(
          collab.creator?._id || collab.creator,
          collab.freelancer?._id || collab.freelancer,
          { status: collab.status === 'active' ? 'hired' : 'applied' }
        );
        collab.chatId = conversation?.chatId;
      }
      return { ...collab, _id: collab._id };
    });

  res.json({ collaborations, count: collaborations.length });
});

app.post('/api/collaborations/hire', (req, res) => {
  const { creatorId, freelancerId, jobId } = req.body || {};
  const creator = getUser(creatorId);
  const freelancer = getUser(freelancerId);

  if (!creator || !freelancer) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (creator.userType !== 'creator' || freelancer.userType !== 'freelancer') {
    return res.status(400).json({ error: 'A creator can only hire a freelancer' });
  }

  const job = jobId ? db.jobs.get(jobId) : null;

  // Check for an existing active or pending collaboration
  let collaboration = findCollaboration(creatorId, freelancerId);

  if (collaboration) {
    const conversation = ensureConversation(creatorId, freelancerId, {
      status: collaboration.status === 'active' ? 'hired' : 'applied',
      jobId: job?._id,
      jobTitle: job?.title
    });
    return res.json({
      message: collaboration.status === 'pending'
        ? 'Hire offer already sent — waiting for freelancer to accept'
        : 'Freelancer already hired',
      collaboration,
      conversation: serializeConversation(conversation, creatorId),
      chatId: conversation?.chatId
    });
  }

  // Create a conversation so they can message each other
  const conversation = ensureConversation(creatorId, freelancerId, {
    status: 'applied',
    jobId: job?._id,
    jobTitle: job?.title
  });

  const collabId = `collab_${db.nextCollabId++}`;
  collaboration = {
    _id: collabId,
    creator: publicUser(creator),
    freelancer: publicUser(freelancer),
    chatId: conversation.chatId,
    jobId: job?._id || null,
    jobTitle: job?.title || null,
    offeredAt: new Date().toISOString(),
    status: 'pending',   // freelancer must accept
    tasks: { todo: [], inprogress: [], done: [] }
  };

  db.collaborations.set(collabId, collaboration);

  // Notify the freelancer of the pending offer
  io.to(`freelancer_${freelancerId}`).emit('newHireOffer', {
    collaboration,
    chatId: collaboration.chatId
  });

  res.json({
    message: 'Hire offer sent! Waiting for freelancer to accept.',
    collaboration,
    conversation: serializeConversation(conversation, creatorId),
    chatId: collaboration.chatId
  });
});

// Freelancer responds to a hire offer (accept or decline)
// Also allows a freelancer to leave/decline an already-active collaboration
app.patch('/api/collaborations/:collabId/respond', (req, res) => {
  const collab = db.collaborations.get(req.params.collabId);
  if (!collab) return res.status(404).json({ error: 'Collaboration not found' });

  const { accept, freelancerId } = req.body || {};

  // Verify the responding user is the freelancer in this collaboration
  const collabFreelancerId = collab.freelancer?._id || collab.freelancer;
  if (freelancerId && freelancerId !== collabFreelancerId) {
    return res.status(403).json({ error: 'Not authorised to respond to this offer' });
  }

  const creatorId = collab.creator?._id || collab.creator;

  if (accept) {
    // Accept — activate the collaboration
    collab.status = 'active';
    collab.hiredAt = new Date().toISOString();
    db.collaborations.set(collab._id, collab);

    // Update the linked job if present
    if (collab.jobId) {
      const job = db.jobs.get(collab.jobId);
      if (job) {
        job.status = 'in-progress';
        job.assignedFreelancer = collabFreelancerId;
        (job.applicants || []).forEach(application => {
          if (getApplicationFreelancerId(application) === collabFreelancerId) {
            application.status = 'hired';
          }
        });
        db.jobs.set(job._id, job);
      }
    }

    // Update conversation status to hired
    ensureConversation(creatorId, collabFreelancerId, { status: 'hired' });

    io.to(`creator_${creatorId}`).emit('hireAccepted', { collaboration: collab });
    io.to(`freelancer_${collabFreelancerId}`).emit('hireAccepted', { collaboration: collab });

    return res.json({ message: 'Hire accepted! Collaboration is now active.', collaboration: collab });
  } else {
    // Decline or leave — remove the collaboration
    db.collaborations.delete(collab._id);

    // If there was a linked job, reopen it
    if (collab.jobId) {
      const job = db.jobs.get(collab.jobId);
      if (job && (job.status === 'in-progress' || job.status === 'open')) {
        job.status = 'open';
        job.assignedFreelancer = null;
        (job.applicants || []).forEach(application => {
          if (getApplicationFreelancerId(application) === collabFreelancerId) {
            application.status = 'declined';
          }
        });
        db.jobs.set(job._id, job);
      }
    }

    const eventName = collab.status === 'active' ? 'hireLeft' : 'hireDeclined';
    io.to(`creator_${creatorId}`).emit(eventName, { collabId: collab._id, freelancerId: collabFreelancerId });
    io.to(`freelancer_${collabFreelancerId}`).emit(eventName, { collabId: collab._id });

    return res.json({ message: collab.status === 'active' ? 'You have left the collaboration.' : 'Hire offer declined.' });
  }
});

// Creator unhires / removes a freelancer from an active collaboration
app.delete('/api/collaborations/:collabId', (req, res) => {
  const collab = db.collaborations.get(req.params.collabId);
  if (!collab) return res.status(404).json({ error: 'Collaboration not found' });

  db.collaborations.delete(collab._id);

  const creatorId = collab.creator?._id || collab.creator;
  const freelancerId = collab.freelancer?._id || collab.freelancer;

  // Reopen the linked job if applicable
  if (collab.jobId) {
    const job = db.jobs.get(collab.jobId);
    if (job) {
      job.status = 'open';
      job.assignedFreelancer = null;
      (job.applicants || []).forEach(application => {
        if (getApplicationFreelancerId(application) === freelancerId) {
          application.status = 'pending';
        }
      });
      db.jobs.set(job._id, job);
    }
  }

  io.to(`freelancer_${freelancerId}`).emit('freelancerUnhired', { collabId: collab._id, creatorId });
  io.to(`creator_${creatorId}`).emit('freelancerUnhired', { collabId: collab._id });

  res.json({ message: 'Freelancer unhired successfully.' });
});

app.patch('/api/collaborations/:collabId', (req, res) => {
  const collab = db.collaborations.get(req.params.collabId);
  if (!collab) return res.status(404).json({ error: 'Collaboration not found' });

  if (req.body.tasks) collab.tasks = req.body.tasks;
  db.collaborations.set(req.params.collabId, collab);

  res.json({ message: 'Collaboration updated', collaboration: collab });
});

// Filter collaborations to only return active ones for the hired lists
function activeCollaborations(collabs) {
  return collabs.filter(c => c.status === 'active');
}

// Return all pending offers for a freelancer
app.get('/api/collaborations/pending/freelancer/:freelancerId', (req, res) => {
  const offers = Array.from(db.collaborations.values())
    .filter(c => (c.freelancer?._id || c.freelancer) === req.params.freelancerId && c.status === 'pending');
  res.json({ offers, count: offers.length });
});

// ============================================================
// Jobs & applications
// ============================================================

app.get('/api/jobs', (req, res) => {
  const { status, creatorId, freelancerId, limit } = req.query;
  let jobs = Array.from(db.jobs.values());

  if (status) jobs = jobs.filter(j => j.status === status);
  if (creatorId) jobs = jobs.filter(j => j.creator === creatorId);

  const freelancer = freelancerId ? getUser(freelancerId) : null;

  jobs = jobs.map(job => {
    const applicants = job.applicants || [];
    const hasApplied = freelancer
      ? applicants.some(a => getApplicationFreelancerId(a) === freelancerId)
      : false;

    return {
      ...job,
      applicantCount: applicants.length,
      hasApplied,
      ...(freelancer ? { matchScore: calculateJobMatch(job, freelancer) } : {})
    };
  });

  jobs.sort((a, b) => {
    if (freelancer) return (b.matchScore - a.matchScore) || (new Date(b.createdAt) - new Date(a.createdAt));
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  if (limit) jobs = jobs.slice(0, parseInt(limit, 10));

  res.json({ jobs, count: jobs.length });
});

function createJob(req, res) {
  const { creatorId, title, description, budget, requiredSkills } = req.body || {};
  const creator = getUser(creatorId);

  if (!creator || creator.userType !== 'creator') {
    return res.status(404).json({ error: 'Creator not found' });
  }

  if (!title || !description) {
    return res.status(400).json({ error: 'Title and description are required' });
  }

  const jobId = `job_${db.nextJobId++}`;
  const job = {
    _id: jobId,
    title: String(title).trim(),
    description: String(description).trim(),
    budget: Number(budget) || 0,
    requiredSkills: Array.isArray(requiredSkills)
      ? requiredSkills
      : String(requiredSkills || '').split(',').map(s => s.trim()).filter(Boolean),
    creator: creator._id,
    creatorName: creator.name,
    channelName: creator.channelName || '',
    platform: creator.platform || '',
    status: 'open',
    applicants: [],
    createdAt: new Date().toISOString()
  };

  db.jobs.set(jobId, job);

  // Freelancers see newly posted hirings without refreshing.
  io.emit('newJob', job);

  res.status(201).json({
    success: true,
    message: 'Job posted successfully',
    job
  });
}

app.post('/api/jobs', createJob);
app.post('/api/jobs/create', createJob);

app.get('/api/jobs/:id', (req, res) => {
  const job = db.jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json(job);
});

app.patch('/api/jobs/:id/status', (req, res) => {
  const job = db.jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  const validStatuses = ['open', 'in-progress', 'completed', 'cancelled'];
  if (!validStatuses.includes(req.body.status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  job.status = req.body.status;
  db.jobs.set(job._id, job);

  res.json({ message: 'Job status updated', job });
});

app.post('/api/jobs/:id/apply', (req, res) => {
  const job = db.jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  if (job.status !== 'open') {
    return res.status(400).json({ error: 'This job is no longer open' });
  }

  const { freelancerId } = req.body || {};
  const freelancer = getUser(freelancerId);

  if (!freelancer || freelancer.userType !== 'freelancer') {
    return res.status(404).json({ error: 'Freelancer not found' });
  }

  job.applicants = job.applicants || [];
  const alreadyApplied = job.applicants.some(
    application => getApplicationFreelancerId(application) === freelancerId
  );

  if (alreadyApplied) {
    return res.status(400).json({ error: 'You have already applied to this job' });
  }

  job.applicants.push({
    freelancerId,
    appliedAt: new Date().toISOString(),
    status: 'pending'
  });

  db.jobs.set(job._id, job);

  // Applying opens a conversation immediately, so the freelancer can message
  // the creator before (or without) being hired.
  const conversation = ensureConversation(job.creator, freelancerId, {
    status: 'applied',
    jobId: job._id,
    jobTitle: job.title
  });

  io.to(`creator_${job.creator}`).emit('newApplication', {
    jobId: job._id,
    jobTitle: job.title,
    freelancer: publicUser(freelancer)
  });

  console.log(`✅ ${freelancer.name} applied to "${job.title}"`);

  res.json({
    message: 'Application submitted successfully. You can now message the creator.',
    job,
    conversation: serializeConversation(conversation, freelancerId),
    chatId: conversation?.chatId
  });
});

app.get('/api/applications/creator/:creatorId', (req, res) => {
  const applications = [];

  Array.from(db.jobs.values())
    .filter(job => job.creator === req.params.creatorId)
    .forEach(job => {
      (job.applicants || []).forEach(application => {
        const freelancerId = getApplicationFreelancerId(application);
        const freelancer = getUser(freelancerId);
        if (!freelancer) return;

        applications.push({
          _id: `${job._id}_${freelancerId}`,
          jobId: job._id,
          jobTitle: job.title,
          budget: job.budget,
          jobStatus: job.status,
          freelancer: publicUser(freelancer),
          appliedAt: application.appliedAt || job.createdAt,
          status: application.status || 'pending'
        });
      });
    });

  applications.sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt));
  res.json({ applications, count: applications.length });
});

app.get('/api/applications/freelancer/:freelancerId', (req, res) => {
  const applications = [];

  Array.from(db.jobs.values()).forEach(job => {
    const application = (job.applicants || []).find(
      a => getApplicationFreelancerId(a) === req.params.freelancerId
    );

    if (!application) return;

    applications.push({
      _id: `${job._id}_${req.params.freelancerId}`,
      job,
      appliedAt: application.appliedAt || job.createdAt,
      status: application.status || 'pending'
    });
  });

  applications.sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt));
  res.json({ applications, count: applications.length });
});

// ============================================================
// Conversations & messages
// ============================================================

app.get('/api/conversations/:userId', (req, res) => {
  const user = getUser(req.params.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const conversations = Array.from(db.conversations.values())
    .filter(c => c.creatorId === user._id || c.freelancerId === user._id)
    .map(c => serializeConversation(c, user._id))
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  res.json({ conversations, count: conversations.length });
});

app.post('/api/conversations', (req, res) => {
  const { creatorId, freelancerId, initiatorId, jobId } = req.body || {};
  const job = jobId ? db.jobs.get(jobId) : null;

  const conversation = ensureConversation(creatorId, freelancerId, {
    jobId,
    jobTitle: job?.title
  });

  if (!conversation) {
    return res.status(400).json({ error: 'A conversation needs one creator and one freelancer' });
  }

  res.json({
    conversation: serializeConversation(conversation, initiatorId || creatorId),
    chatId: conversation.chatId
  });
});

app.get('/api/messages/:chatId', (req, res) => {
  const conversation = db.conversations.get(req.params.chatId);
  if (!conversation) {
    return res.status(404).json({ error: 'Conversation not found' });
  }

  res.json({ messages: db.messages.get(req.params.chatId) || [] });
});

// REST fallback for sending a message (Socket.io is the primary path).
app.post('/api/messages/:chatId', (req, res) => {
  const messageData = storeMessage({
    chatId: req.params.chatId,
    ...(req.body || {})
  });

  if (!messageData) {
    return res.status(400).json({ error: 'Could not send message' });
  }

  broadcastMessage(messageData);
  res.json({ message: messageData });
});

// ============================================================
// AI matchmaking
// ============================================================

// Keywords that are clearly unrelated to content creation
const CONTENT_CREATION_KEYWORDS = [
  'video', 'edit', 'editor', 'thumbnail', 'graphic', 'design', 'designer', 'script',
  'scriptwriter', 'seo', 'social', 'media', 'manager', 'audio', 'sound', 'engineer',
  'voice', 'voiceover', 'short', 'reel', 'caption', 'subtitle', 'animator', 'animation',
  'research', 'researcher', 'music', 'producer', 'motion', 'camera', 'cinematographer',
  'colorist', 'color', 'vfx', 'strategy', 'strategist', 'stream', 'community', 'podcast',
  'blog', 'writer', 'ad', 'email', 'marketing', 'merch', 'merch', 'coach', 'web', 'developer',
  'schedule', 'analytics', 'translate', 'translator', 'drone', '3d', 'pr', 'niche', 'sponsor',
  'sponsorship', 'gaming', 'copyright', 'beauty', 'tech', 'food', 'travel', 'educational',
  'fitness', 'kids', 'asmr', 'content', 'creator', 'channel', 'youtube', 'tiktok', 'instagram',
  'twitch', 'podcast', 'freelancer', 'hire', 'creative', 'digital', 'brand', 'promotion'
];

function isContentCreationRelated(prompt) {
  const tokens = prompt.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/);
  return tokens.some(token => CONTENT_CREATION_KEYWORDS.some(kw => kw.includes(token) || token.includes(kw)));
}

app.post('/api/ai-match/search', (req, res) => {
  const prompt = String(req.body?.prompt || '').trim();

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const related = isContentCreationRelated(prompt);

  const matches = Array.from(db.users.values())
    .filter(u => u.userType === 'freelancer')
    .map(freelancer => calculateFreelancerMatch(prompt, freelancer))
    .sort((a, b) => b.matchScore - a.matchScore || (Number(b.rating) || 0) - (Number(a.rating) || 0))
    .slice(0, 20);

  // Determine if the top results are genuinely relevant
  const topScore = matches[0]?.matchScore || 0;
  const LOW_RELEVANCE_THRESHOLD = 58;
  const lowRelevance = !related || topScore < LOW_RELEVANCE_THRESHOLD;

  res.json({
    matches,
    totalCount: matches.length,
    lowRelevance,
    suggestion: lowRelevance
      ? `No exact match found for "${prompt}". Here are some related content creation freelancers you might need:`
      : null,
    query: {
      original: prompt,
      role: prompt,
      tokens: prompt.toLowerCase().split(/\s+/)
    }
  });
});

// ============================================================
// Health check & server start
// ============================================================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Nexus Matchmaker API running',
    timestamp: new Date().toISOString(),
    stats: {
      users: db.users.size,
      freelancers: Array.from(db.users.values()).filter(u => u.userType === 'freelancer').length,
      creators: Array.from(db.users.values()).filter(u => u.userType === 'creator').length,
      jobs: db.jobs.size,
      collaborations: db.collaborations.size,
      conversations: db.conversations.size
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🌐 Website available at http://localhost:${PORT}`);
  console.log(`📡 Socket.io ready`);
  console.log(`👥 ${freelancers.length} freelancers loaded`);
  console.log(`🎬 ${creators.length} creators loaded`);
  console.log(`📢 ${db.jobs.size} open hirings loaded`);
});
