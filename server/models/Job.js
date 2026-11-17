const mongoose = require('mongoose');

/**
 * DSA Concept: Bipartite Graph Edges
 * Each Job document represents an edge in the bipartite graph:
 * - creator (node in Set A) connects to freelancer (node in Set B)
 * - Jobs store the relationship between the two disjoint sets
 */

const jobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true // Hash index for O(1) creator lookup
  },
  creatorName: {
    type: String,
    required: true
  },
  budget: {
    type: Number,
    required: true,
    min: 0
  },
  requiredSkills: {
    type: [String],
    default: []
  },
  status: {
    type: String,
    enum: ['open', 'in-progress', 'completed', 'cancelled'],
    default: 'open',
    index: true
  },
  assignedFreelancer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  applicants: [{
    freelancer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    appliedAt: {
      type: Date,
      default: Date.now
    }
  }],
  deadline: {
    type: Date
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  tags: {
    type: [String],
    default: []
  }
}, {
  timestamps: true
});

// Compound indexes for efficient querying
jobSchema.index({ status: 1, createdAt: -1 });
jobSchema.index({ creator: 1, status: 1 });

module.exports = mongoose.model('Job', jobSchema);
