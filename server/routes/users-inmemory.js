const express = require('express');
const router = express.Router();

router.get('/freelancers', (req, res) => {
  try {
    const db = req.db;
    const { role, available, limit = 50 } = req.query;

    let freelancers = Array.from(db.users.values()).filter(u => u.userType === 'freelancer');

    if (role) {
      freelancers = freelancers.filter(f =>
        f.role.toLowerCase().includes(role.toLowerCase())
      );
    }

    if (available !== undefined) {
      freelancers = freelancers.filter(f => f.isAvailable === (available === 'true'));
    }

    freelancers = freelancers
      .sort((a, b) => b.rating - a.rating || b.completedProjects - a.completedProjects)
      .slice(0, parseInt(limit));

    res.json({
      freelancers,
      count: freelancers.length
    });
  } catch (error) {
    console.error('Error fetching freelancers:', error);
    res.status(500).json({ error: 'Failed to fetch freelancers' });
  }
});

router.get('/:id', (req, res) => {
  try {
    const db = req.db;
    const user = db.users.get(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

router.patch('/:id/availability', (req, res) => {
  try {
    const db = req.db;
    const { isAvailable } = req.body;

    if (typeof isAvailable !== 'boolean') {
      return res.status(400).json({ error: 'isAvailable must be a boolean' });
    }

    const user = db.users.get(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.isAvailable = isAvailable;
    db.users.set(req.params.id, user);

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

router.patch('/:id/profile', (req, res) => {
  try {
    const db = req.db;
    const allowedFields = ['name', 'role', 'experience', 'skills', 'bio', 'hourlyRate', 'portfolio'];

    const user = db.users.get(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        user[field] = req.body[field];
      }
    });

    db.users.set(req.params.id, user);

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

router.post('/', (req, res) => {
  try {
    const db = req.db;
    const id = `user_${db.nextUserId++}`;
    const user = { _id: id, ...req.body };

    db.users.set(id, user);

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
