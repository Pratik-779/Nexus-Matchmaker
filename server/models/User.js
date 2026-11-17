const mongoose = require('mongoose');

/**
 * DSA Concept: Hash Table
 * MongoDB uses hash-based indexing for _id fields, providing O(1) lookup time.
 * The userType field also uses indexing for efficient bipartite graph queries.
 */

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true, // Hash index for O(1) lookup
    lowercase: true
  },
  userType: {
    type: String,
    enum: ['creator', 'freelancer'],
    required: true,
    index: true // Optimizes bipartite graph queries
  },
  // Freelancer-specific fields
  role: {
    type: String,
    required: function() { return this.userType === 'freelancer'; }
  },
  experience: {
    type: String
  },
  skills: {
    type: [String],
    default: []
  },
  hourlyRate: {
    type: Number,
    min: 0
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  portfolio: {
    type: String
  },
  bio: {
    type: String,
    maxlength: 500
  },
  // Creator-specific fields
  channelName: {
    type: String
  },
  contentType: {
    type: String
  },
  subscriberCount: {
    type: Number,
    min: 0
  },
  // Common fields
  profileImage: {
    type: String,
    default: 'https://via.placeholder.com/150'
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  completedProjects: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

/**
 * DSA Concept: Bipartite Graph
 * This schema represents nodes in a bipartite graph where:
 * - Set A = Creators (userType: 'creator')
 * - Set B = Freelancers (userType: 'freelancer')
 * - Edges = Job connections (stored in Job model)
 * No direct connections exist within Set A or Set B.
 */

// Compound index for efficient matchmaking queries
userSchema.index({ userType: 1, isAvailable: 1, role: 1 });

module.exports = mongoose.model('User', userSchema);
