const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  group: {
    type: String,
    default: 'General',
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  messageCount: {
    type: Number,
    default: 0
  },
  summary: {
    type: String,
    default: ''
  },
  // Optional metadata for additional filtering or organization
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
});

// Update lastUpdated timestamp before save
ConversationSchema.pre('save', function(next) {
  this.lastUpdated = Date.now();
  next();
});

// Create a text index on title and summary for search functionality
ConversationSchema.index({ title: 'text', summary: 'text', group: 'text' });

module.exports = mongoose.model('Conversation', ConversationSchema); 