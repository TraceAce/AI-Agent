const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true
  },
  content: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  // Allow custom metadata for different message types
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // Optional error flag for failed messages
  error: {
    type: Boolean,
    default: false
  }
});

// When a new message is saved, update the conversation's lastUpdated and messageCount
MessageSchema.post('save', async function(doc) {
  try {
    const Conversation = mongoose.model('Conversation');
    
    await Conversation.findByIdAndUpdate(
      doc.conversation,
      {
        $set: { lastUpdated: Date.now() },
        $inc: { messageCount: 1 }
      }
    );
    
    console.log(`Updated conversation ${doc.conversation} with new message`);
  } catch (error) {
    console.error('Error updating conversation after saving message:', error);
  }
});

// Create a text index on message content for search functionality
MessageSchema.index({ content: 'text' });

module.exports = mongoose.model('Message', MessageSchema); 