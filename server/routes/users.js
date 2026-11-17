const express = require('express');
const router = express.Router();
const User = require('../models/User');

/**
 * GET /api/users/freelancers
 * Fetch all freelancers with optional filtering
 *
 * DSA Concept: Hash Table Indexing
 * MongoDB uses B-tree indexes (hash-like O(log n)) for efficient queries
 */
router.get('/freelancers', async (req, res) => {
  try {
    const { role, available, limit = 50 } = req.query;

    let query = { userType: 'freelancer' };

    if (role) {
      query.role = { $regex: new RegExp(role, 'i') };
    }

    if (available !== undefined) {
      query.isAvailable = available === 'true';
    }

    const freelancers = await User.find(query)
      .limit(parseInt(limit))
      .sort({ rating: -1, completedProjects: -1 })
      .lean();

    res.json({
      freelancers,
      count: freelancers.length
    });

  } catch (error) {
    console.error('Error fetching freelancers:', error);
    res.status(500).json({ error: 'Failed to fetch freelancers' });
  }
});

/**
 * GET /api/users/:id
 * Get single user by ID
 * DSA Concept: O(1) hash lookup via MongoDB _id index
 */
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).lean();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);

  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

/**
 * PATCH /api/users/:id/availability
 * Toggle user availability status
 *
 * DSA Concept: Hash Map Update (O(1))
 * MongoDB _id index provides constant-time lookup and update
 */
router.patch('/:id/availability', async (req, res) => {
  try {
    const { isAvailable } = req.body;

    if (typeof isAvailable !== 'boolean') {
      return res.status(400).json({ error: 'isAvailable must be a boolean' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isAvailable },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log(`✅ Updated availability for ${user.name}: ${isAvailable}`);

    res.json({
      message: 'Availability updated',
      user
    });

  } catch (error) {
    console.error('Error updating availability:', error);
    res.status(500).json({ error: 'Failed to update availability' });
  }
});

/**
 * PATCH /api/users/:id/profile
 * Update user profile information
 */
router.patch('/:id/profile', async (req, res) => {
  try {
    const allowedFields = ['name', 'role', 'experience', 'skills', 'bio', 'hourlyRate', 'portfolio'];
    const updates = {};

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log(`✅ Updated profile for ${user.name}`);

    res.json({
      message: 'Profile updated',
      user
    });

  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

/**
 * POST /api/users
 * Create a new user (creator or freelancer)
 */
router.post('/', async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();

    console.log(`✅ Created new user: ${user.name} (${user.userType})`);

    res.status(201).json({
      message: 'User created successfully',
      user
    });

  } catch (error) {
    console.error('Error creating user:', error);
    res.status(400).json({
      error: 'Failed to create user',
      details: error.message
    });
  }
});

module.exports = router;
