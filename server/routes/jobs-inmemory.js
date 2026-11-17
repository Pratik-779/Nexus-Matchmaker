const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  try {
    const db = req.db;
    const { status, creatorId, limit = 20 } = req.query;

    let jobs = Array.from(db.jobs.values());

    if (status) {
      jobs = jobs.filter(j => j.status === status);
    }

    if (creatorId) {
      jobs = jobs.filter(j => j.creator === creatorId);
    }

    jobs = jobs
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, parseInt(limit));

    res.json({
      jobs,
      count: jobs.length
    });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

router.post('/', (req, res) => {
  try {
    const db = req.db;
    const id = `job_${db.nextJobId++}`;
    const job = {
      _id: id,
      ...req.body,
      status: req.body.status || 'open',
      createdAt: new Date(),
      applicants: []
    };

    db.jobs.set(id, job);

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

router.get('/:id', (req, res) => {
  try {
    const db = req.db;
    const job = db.jobs.get(req.params.id);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json(job);
  } catch (error) {
    console.error('Error fetching job:', error);
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

router.patch('/:id/status', (req, res) => {
  try {
    const db = req.db;
    const { status } = req.body;

    const validStatuses = ['open', 'in-progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const job = db.jobs.get(req.params.id);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    job.status = status;
    db.jobs.set(req.params.id, job);

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

router.post('/:id/apply', (req, res) => {
  try {
    const db = req.db;
    const { freelancerId } = req.body;

    const job = db.jobs.get(req.params.id);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (!job.applicants) {
      job.applicants = [];
    }

    const alreadyApplied = job.applicants.some(app => app.freelancer === freelancerId);

    if (alreadyApplied) {
      return res.status(400).json({ error: 'Already applied to this job' });
    }

    job.applicants.push({
      freelancer: freelancerId,
      appliedAt: new Date()
    });

    db.jobs.set(req.params.id, job);

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
