const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const User = require('../models/User');

/**
 * GET /api/jobs
 * Fetch all jobs with optional filtering
 */
router.get('/', async (req, res) => {
  try {
    const { status, creatorId, limit = 20 } = req.query;

    let query = {};

    if (status) {
      query.status = status;
    }

    if (creatorId) {
      query.creator = creatorId;
    }

    const jobs = await Job.find(query)
      .populate('creator', 'name email channelName')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    res.json({
      jobs,
      count: jobs.length
    });

  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

/**
 * POST /api/jobs
 * Create a new job posting
 */
router.post('/', async (req, res) => {
  try {
    const job = new Job(req.body);
    await job.save();

    console.log(`✅ Created new job: ${job.title}`);

    res.status(201).json({
      message: 'Job created successfully',
      job
    });

  } catch (error) {
    console.error('Error creating job:', error);
    res.status(400).json({
      error: 'Failed to create job',
      details: error.message
    });
  }
});

/**
 * GET /api/jobs/:id
 * Get single job by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate('creator', 'name email channelName')
      .populate('assignedFreelancer', 'name email role skills')
      .lean();

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json(job);

  } catch (error) {
    console.error('Error fetching job:', error);
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

/**
 * PATCH /api/jobs/:id/status
 * Update job status
 */
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;

    const validStatuses = ['open', 'in-progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const job = await Job.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    console.log(`✅ Updated job ${job.title} status to ${status}`);

    res.json({
      message: 'Job status updated',
      job
    });

  } catch (error) {
    console.error('Error updating job status:', error);
    res.status(500).json({ error: 'Failed to update job status' });
  }
});

/**
 * POST /api/jobs/:id/apply
 * Freelancer applies to a job
 */
router.post('/:id/apply', async (req, res) => {
  try {
    const { freelancerId } = req.body;

    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Check if already applied
    const alreadyApplied = job.applicants.some(
      app => app.freelancer.toString() === freelancerId
    );

    if (alreadyApplied) {
      return res.status(400).json({ error: 'Already applied to this job' });
    }

    job.applicants.push({ freelancer: freelancerId });
    await job.save();

    console.log(`✅ Freelancer ${freelancerId} applied to job ${job.title}`);

    res.json({
      message: 'Application submitted successfully',
      job
    });

  } catch (error) {
    console.error('Error applying to job:', error);
    res.status(500).json({ error: 'Failed to apply to job' });
  }
});

module.exports = router;
