const http = require('http');

const API = 'http://localhost:5000';

async function test(name, method, path, body = null) {
  return new Promise((resolve) => {
    const url = new URL(path, API);
    const options = {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {}
    };

    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const status = res.statusCode >= 200 && res.statusCode < 300 ? '✅' : '❌';
        console.log(`${status} ${name} (${res.statusCode})`);
        resolve({ status: res.statusCode, data: data ? JSON.parse(data) : null });
      });
    });

    req.on('error', (e) => {
      console.log(`❌ ${name} - ${e.message}`);
      resolve({ status: 0, error: e.message });
    });

    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

(async () => {
  console.log('\n🧪 TESTING NEXUS MATCHMAKER FEATURES\n');
  
  console.log('1️⃣  AI SMART MATCH:');
  const match1 = await test('  Video Editor Search', 'POST', '/api/ai-match/search', { prompt: 'I need a video editor' });
  if (match1.data?.matches) console.log(`     Found ${match1.data.matches.length} matches`);
  
  const match2 = await test('  Podcast Editor Search', 'POST', '/api/ai-match/search', { prompt: 'podcast editor' });
  if (match2.data?.matches) console.log(`     Found ${match2.data.matches.length} matches`);
  
  const match3 = await test('  UI/UX Designer Search', 'POST', '/api/ai-match/search', { prompt: 'UI/UX designer for app' });
  if (match3.data?.matches) console.log(`     Found ${match3.data.matches.length} matches`);

  console.log('\n2️⃣  FREELANCER DASHBOARD:');
  const freelancers = await test('  Get All Freelancers', 'GET', '/api/users/freelancers');
  if (freelancers.data?.freelancers) console.log(`     ${freelancers.data.freelancers.length} freelancers in database`);
  
  const available = await test('  Get Available Freelancers', 'GET', '/api/users/freelancers?available=true');
  if (available.data?.freelancers) console.log(`     ${available.data.freelancers.length} available for hire`);

  console.log('\n3️⃣  JOB FEED:');
  const jobs = await test('  Get Open Jobs', 'GET', '/api/jobs?status=open');
  if (jobs.data?.jobs) console.log(`     ${jobs.data.jobs.length} open jobs`);
  
  const freelancerId = freelancers.data?.freelancers?.[0]?._id;
  const jobId = jobs.data?.jobs?.[0]?._id;

  console.log('\n4️⃣  AVAILABILITY TOGGLE:');
  if (freelancerId) {
    await test('  Toggle to Unavailable', 'PATCH', `/api/users/${freelancerId}/availability`, { isAvailable: false });
    await test('  Toggle to Available', 'PATCH', `/api/users/${freelancerId}/availability`, { isAvailable: true });
  }

  console.log('\n5️⃣  PROFILE UPDATE:');
  if (freelancerId) {
    await test('  Update Profile', 'PATCH', `/api/users/${freelancerId}/profile`, { bio: 'Updated bio via API test' });
  }

  console.log('\n6️⃣  JOB APPLICATION:');
  if (jobId && freelancerId) {
    const applyResult = await test('  Apply to Job', 'POST', `/api/jobs/${jobId}/apply`, { freelancerId });
    if (applyResult.data?.chatId) {
      console.log(`     Chat created: ${applyResult.data.chatId}`);
      await test('  Send Message After Applying', 'POST', `/api/messages/${applyResult.data.chatId}`, {
        senderId: freelancerId,
        senderName: 'Test Freelancer',
        message: 'Hello! I just applied for this role.'
      });
      await test('  Load Conversation Messages', 'GET', `/api/messages/${applyResult.data.chatId}`);
    }
  }

  console.log('\n7️⃣  CREATE NEW JOB:');
  const creators = await test('  Get Creators', 'GET', '/api/creators');
  const creatorId = creators.data?.creators?.[0]?._id;
  if (creatorId) {
    await test('  Create Job Posting', 'POST', '/api/jobs', {
      creatorId,
      title: 'Test Job Posting',
      description: 'Testing job creation',
      budget: 500,
      requiredSkills: ['Testing', 'API']
    });
  }

  console.log('\n8️⃣  HEALTH CHECK:');
  const health = await test('  Server Health', 'GET', '/api/health');
  if (health.data?.stats) {
    console.log(`     Users: ${health.data.stats.users}, Jobs: ${health.data.stats.jobs}`);
  }

  console.log('\n✅ ALL FEATURE TESTS COMPLETED!\n');
})();
