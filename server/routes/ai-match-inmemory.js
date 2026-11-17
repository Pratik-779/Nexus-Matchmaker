const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'demo-mode');

/**
 * POST /api/ai-match/search
 * AI-powered freelancer matching using Google Gemini API
 * Works with in-memory database
 */
router.post('/search', async (req, res) => {
  try {
    const { prompt } = req.body;
    const db = req.db;

    if (!prompt) {
      return res.status(400).json({ error: 'Search prompt is required' });
    }

    console.log('🤖 AI Match Request:', prompt);

    let extractedData;

    // Try Gemini API if key is available
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'demo-mode') {
      try {
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
        const aiPrompt = `Extract the key information from this freelance request and return ONLY a JSON object (no markdown):
"${prompt}"

Format:
{
  "role": "primary job role",
  "skills": ["skill1", "skill2"],
  "keywords": ["keyword1", "keyword2"]
}`;

        const result = await model.generateContent(aiPrompt);
        const response = await result.response;
        let aiText = response.text().trim();
        aiText = aiText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        console.log('🧠 Gemini Response:', aiText);
        extractedData = JSON.parse(aiText);
      } catch (aiError) {
        console.log('⚠️ Gemini API error, using fallback extraction');
        extractedData = extractKeywords(prompt);
      }
    } else {
      console.log('⚠️ No Gemini API key, using keyword extraction');
      extractedData = extractKeywords(prompt);
    }

    const { role, skills, keywords } = extractedData;

    // Get all freelancers from in-memory DB
    const allFreelancers = Array.from(db.users.values()).filter(u => u.userType === 'freelancer');

    // Filter by role if specified
    let matchedFreelancers = allFreelancers;
    if (role) {
      matchedFreelancers = allFreelancers.filter(f =>
        f.role.toLowerCase().includes(role.toLowerCase())
      );
    }

    // If no role matches, filter by skills/keywords
    if (matchedFreelancers.length === 0 && (skills.length > 0 || keywords.length > 0)) {
      matchedFreelancers = allFreelancers.filter(f => {
        const freelancerText = `${f.role} ${f.skills.join(' ')} ${f.bio}`.toLowerCase();
        return [...skills, ...keywords].some(term =>
          freelancerText.includes(term.toLowerCase())
        );
      });
    }

    // Fallback: return top rated available freelancers
    if (matchedFreelancers.length === 0) {
      matchedFreelancers = allFreelancers
        .filter(f => f.isAvailable)
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 10);
    }

    /**
     * DSA: Priority Queue (Max-Heap) Scoring
     */
    const scoredMatches = matchedFreelancers.map(freelancer => {
      let score = 50;

      if (role && freelancer.role.toLowerCase().includes(role.toLowerCase())) {
        score += 30;
      }

      if (skills && Array.isArray(freelancer.skills)) {
        skills.forEach(skill => {
          const skillMatch = freelancer.skills.some(fs =>
            fs.toLowerCase().includes(skill.toLowerCase()) ||
            skill.toLowerCase().includes(fs.toLowerCase())
          );
          if (skillMatch) score += 10;
        });
      }

      if (keywords && freelancer.bio) {
        keywords.forEach(keyword => {
          if (freelancer.bio.toLowerCase().includes(keyword.toLowerCase())) {
            score += 5;
          }
        });
      }

      if (freelancer.rating) {
        score += Math.round(freelancer.rating * 2);
      }

      if (freelancer.isAvailable) {
        score += 10;
      }

      score = Math.min(score, 100);

      return {
        ...freelancer,
        matchScore: score
      };
    });

    // Sort by score (Max-Heap logic)
    scoredMatches.sort((a, b) => b.matchScore - a.matchScore);

    const topMatches = scoredMatches.slice(0, 10);

    console.log(`✅ Found ${topMatches.length} matches`);

    res.json({
      matches: topMatches,
      totalCount: scoredMatches.length,
      query: { role, skills, keywords }
    });

  } catch (error) {
    console.error('❌ AI Match Error:', error);
    res.status(500).json({
      error: 'Failed to process match request',
      details: error.message
    });
  }
});

// Fallback keyword extraction
function extractKeywords(prompt) {
  const words = prompt.toLowerCase().split(/\s+/);
  const longWords = words.filter(w => w.length > 3);

  // Common role keywords
  const roleKeywords = ['editor', 'designer', 'writer', 'animator', 'developer', 'manager', 'specialist', 'creator', 'artist'];
  const detectedRole = longWords.find(w => roleKeywords.some(r => w.includes(r) || r.includes(w)));

  return {
    role: detectedRole || '',
    skills: longWords.filter(w => w.length > 4).slice(0, 5),
    keywords: longWords.slice(0, 5)
  };
}

module.exports = router;
