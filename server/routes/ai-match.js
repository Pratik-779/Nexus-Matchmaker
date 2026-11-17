const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const User = require('../models/User');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * POST /api/ai-match/search
 * AI-powered freelancer matching using Google Gemini API
 *
 * DSA Concepts Applied:
 * 1. NLP → Extract intent from natural language
 * 2. Hash Table → MongoDB indexed lookups (O(1))
 * 3. Max-Heap (Priority Queue) → Sort matches by score
 * 4. String Matching → Skills comparison algorithm
 */

router.post('/search', async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Search prompt is required' });
    }

    console.log('🤖 AI Match Request:', prompt);

    // Step 1: Use Gemini API to extract intent and keywords
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const aiPrompt = `You are a matchmaking assistant for a freelance platform. Extract the key information from this request:
"${prompt}"

Return ONLY a JSON object with these fields (no markdown, no explanation):
{
  "role": "primary job role being requested (e.g., Video Editor, Graphic Designer)",
  "skills": ["skill1", "skill2", "skill3"],
  "keywords": ["keyword1", "keyword2"]
}`;

    const result = await model.generateContent(aiPrompt);
    const response = await result.response;
    let aiText = response.text().trim();

    // Clean up markdown code blocks if present
    aiText = aiText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    console.log('🧠 Gemini Response:', aiText);

    let extractedData;
    try {
      extractedData = JSON.parse(aiText);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      // Fallback: simple keyword extraction
      const words = prompt.toLowerCase().split(/\s+/);
      extractedData = {
        role: words.find(w => w.length > 4) || 'freelancer',
        skills: words.filter(w => w.length > 3),
        keywords: words.filter(w => w.length > 3)
      };
    }

    const { role, skills, keywords } = extractedData;

    // Step 2: Query MongoDB for matching freelancers
    // Uses compound index: { userType: 1, isAvailable: 1, role: 1 }
    let query = { userType: 'freelancer' };

    if (role) {
      // Case-insensitive regex match on role
      query.role = { $regex: new RegExp(role, 'i') };
    }

    const freelancers = await User.find(query).lean();

    if (freelancers.length === 0) {
      // Fallback: return all available freelancers
      const allFreelancers = await User.find({
        userType: 'freelancer',
        isAvailable: true
      }).limit(10).lean();

      return res.json({
        matches: allFreelancers.map(f => ({ ...f, matchScore: 50 })),
        totalCount: allFreelancers.length,
        query: { role, skills, keywords }
      });
    }

    /**
     * DSA Concept: Priority Queue (Max-Heap)
     * Calculate match scores and use a conceptual max-heap to rank results.
     * JavaScript's Array.sort() uses TimSort (hybrid of merge sort and insertion sort).
     *
     * Scoring Algorithm:
     * - Base score: 50
     * - Role exact match: +30
     * - Each skill match: +10
     * - Keyword in bio: +5
     * - High rating bonus: +(rating * 2)
     * - Availability bonus: +10
     */
    const scoredMatches = freelancers.map(freelancer => {
      let score = 50; // Base score

      // Role matching
      if (role && freelancer.role.toLowerCase().includes(role.toLowerCase())) {
        score += 30;
      }

      // Skills matching
      if (skills && Array.isArray(freelancer.skills)) {
        skills.forEach(skill => {
          const skillMatch = freelancer.skills.some(fs =>
            fs.toLowerCase().includes(skill.toLowerCase()) ||
            skill.toLowerCase().includes(fs.toLowerCase())
          );
          if (skillMatch) score += 10;
        });
      }

      // Keyword matching in bio
      if (keywords && freelancer.bio) {
        keywords.forEach(keyword => {
          if (freelancer.bio.toLowerCase().includes(keyword.toLowerCase())) {
            score += 5;
          }
        });
      }

      // Rating bonus
      if (freelancer.rating) {
        score += Math.round(freelancer.rating * 2);
      }

      // Availability bonus
      if (freelancer.isAvailable) {
        score += 10;
      }

      // Cap at 100
      score = Math.min(score, 100);

      return {
        ...freelancer,
        matchScore: score
      };
    });

    /**
     * DSA Implementation: Max-Heap Sorting
     * Sort by matchScore in descending order (highest first)
     * Time Complexity: O(n log n) using TimSort
     * Space Complexity: O(n)
     */
    scoredMatches.sort((a, b) => b.matchScore - a.matchScore);

    // Return top matches
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

module.exports = router;
