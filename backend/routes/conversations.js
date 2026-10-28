const express = require('express');
const router = express.Router();
const { protect, requirePermission } = require('../middleware/auth');
const { PERMISSIONS } = require('../config/roles');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

// @route   GET api/conversations
// @desc    Get all conversations for current user with optional filtering
// @access  Private
router.get('/', 
  protect,
  async (req, res) => {
    try {
      const { group, search, limit = 20, page = 1 } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      // Build query
      const query = { user: req.user.id };
      
      // Add group filter if provided
      if (group) {
        query.group = group;
      }
      
      // Add text search if provided
      let searchQuery = {};
      if (search) {
        searchQuery = { $text: { $search: search } };
      }
      
      // Combine queries
      const finalQuery = { ...query, ...searchQuery };
      
      // Get conversations with pagination
      const conversations = await Conversation.find(finalQuery)
        .sort({ lastUpdated: -1 })
        .skip(skip)
        .limit(parseInt(limit));
      
      // Get total count for pagination
      const total = await Conversation.countDocuments(finalQuery);
      
      // Get unique groups for filtering
      const groups = await Conversation.distinct('group', { user: req.user.id });
      
      return res.json({
        success: true,
        data: conversations,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        },
        groups
      });
    } catch (error) {
      console.error('Error fetching conversations:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error',
        details: error.message
      });
    }
  }
);

// @route   POST api/conversations
// @desc    Create a new conversation
// @access  Private
router.post('/',
  protect,
  requirePermission(PERMISSIONS.CREATE_CHAT),
  async (req, res) => {
    try {
      const { title, group = 'General', initialMessage } = req.body;
      
      if (!title) {
        return res.status(400).json({
          success: false,
          message: 'Title is required'
        });
      }
      
      // Create conversation
      const conversation = new Conversation({
        title,
        user: req.user.id,
        group,
        summary: initialMessage || ''
      });
      
      await conversation.save();
      
      // If initial message is provided, create it
      if (initialMessage) {
        const message = new Message({
          conversation: conversation._id,
          content: initialMessage,
          role: 'user'
        });
        
        await message.save();
      }
      
      return res.status(201).json({
        success: true,
        data: conversation
      });
    } catch (error) {
      console.error('Error creating conversation:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error',
        details: error.message
      });
    }
  }
);

// ==== GROUP ROUTES ====
// These routes need to be BEFORE the :id routes to avoid conflicts

// @route   GET api/conversations/groups/list
// @desc    Get all unique conversation groups for user
// @access  Private
router.get('/groups/list',
  protect,
  async (req, res) => {
    try {
      const groups = await Conversation.distinct('group', { user: req.user.id });
      
      return res.json({
        success: true,
        data: groups
      });
    } catch (error) {
      console.error('Error fetching groups:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error',
        details: error.message
      });
    }
  }
);

// @route   PUT api/conversations/groups/rename
// @desc    Rename a conversation group
// @access  Private
router.put('/groups/rename',
  protect,
  async (req, res) => {
    try {
      const { oldName, newName } = req.body;
      
      console.log(`[PUT /api/conversations/groups/rename] Request received`);
      console.log(`Request body:`, JSON.stringify(req.body));
      
      if (!oldName || oldName.trim() === '') {
        console.log(`[ERROR] Old group name is empty or missing. Received: oldName="${oldName}", newName="${newName}"`);
        return res.status(400).json({
          success: false,
          message: 'Old group name is required and cannot be empty'
        });
      }
      
      if (!newName || newName.trim() === '') {
        console.log(`[ERROR] New group name is empty or missing. Received: oldName="${oldName}", newName="${newName}"`);
        return res.status(400).json({
          success: false,
          message: 'New group name is required and cannot be empty'
        });
      }
      
      console.log(`Renaming group from "${oldName}" to "${newName}" for user ${req.user.id}`);
      
      // Prevent renaming the General group
      if (oldName === 'General') {
        console.log(`[ERROR] Attempt to rename the General group was blocked`);
        return res.status(400).json({
          success: false,
          message: 'The General group cannot be renamed'
        });
      }
      
      // Update all conversations in the group to the new group name
      const result = await Conversation.updateMany(
        { user: req.user.id, group: oldName },
        { $set: { group: newName } }
      );
      
      console.log(`Renamed group ${oldName} to ${newName} for user ${req.user.id}. Updated ${result.modifiedCount} conversations.`);
      
      return res.json({
        success: true,
        message: `Group renamed successfully. Updated ${result.modifiedCount} conversations.`
      });
    } catch (error) {
      console.error('[ERROR] Error renaming group:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error',
        details: error.message
      });
    }
  }
);

// @route   DELETE api/conversations/groups/:groupName
// @desc    Delete a conversation group and all its conversations
// @access  Private
router.delete('/groups/:groupName',
  protect,
  async (req, res) => {
    try {
      const { groupName } = req.params;
      
      if (groupName === 'General') {
        return res.status(400).json({
          success: false,
          message: 'The General group cannot be deleted'
        });
      }
      
      // Find all conversation IDs in this group
      const conversations = await Conversation.find({ 
        user: req.user.id, 
        group: groupName 
      });
      
      const conversationIds = conversations.map(conv => conv._id);
      
      // Delete all messages in these conversations
      const deletedMessages = await Message.deleteMany({
        conversation: { $in: conversationIds }
      });
      
      // Delete all conversations in this group
      const deletedConversations = await Conversation.deleteMany({ 
        user: req.user.id, 
        group: groupName 
      });
      
      console.log(`Deleted group ${groupName} for user ${req.user.id}. Deleted ${deletedConversations.deletedCount} conversations and ${deletedMessages.deletedCount} messages.`);
      
      return res.json({
        success: true,
        message: `Group deleted successfully. Removed ${deletedConversations.deletedCount} conversations and ${deletedMessages.deletedCount} messages.`
      });
    } catch (error) {
      console.error('Error deleting group:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error',
        details: error.message
      });
    }
  }
);

// ==== INDIVIDUAL CONVERSATION ROUTES ====

// @route   GET api/conversations/:id
// @desc    Get a single conversation with its messages
// @access  Private
router.get('/:id',
  protect,
  async (req, res) => {
    try {
      const conversation = await Conversation.findById(req.params.id);
      
      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: 'Conversation not found'
        });
      }
      
      // Check if conversation belongs to user
      if (conversation.user.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to access this conversation'
        });
      }
      
      // Get messages for conversation
      const messages = await Message.find({ conversation: req.params.id })
        .sort({ createdAt: 1 });
      
      return res.json({
        success: true,
        data: {
          conversation,
          messages
        }
      });
    } catch (error) {
      console.error('Error fetching conversation:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error',
        details: error.message
      });
    }
  }
);

// @route   PUT api/conversations/:id
// @desc    Update conversation title or group
// @access  Private
router.put('/:id',
  protect,
  async (req, res) => {
    try {
      const { title, group } = req.body;
      
      const conversation = await Conversation.findById(req.params.id);
      
      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: 'Conversation not found'
        });
      }
      
      // Check if conversation belongs to user
      if (conversation.user.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update this conversation'
        });
      }
      
      // Update fields if provided
      if (title) conversation.title = title;
      if (group) conversation.group = group;
      
      await conversation.save();
      
      return res.json({
        success: true,
        data: conversation
      });
    } catch (error) {
      console.error('Error updating conversation:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error',
        details: error.message
      });
    }
  }
);

// @route   DELETE api/conversations/:id
// @desc    Delete a conversation and its messages
// @access  Private
router.delete('/:id',
  protect,
  async (req, res) => {
    try {
      const conversation = await Conversation.findById(req.params.id);
      
      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: 'Conversation not found'
        });
      }
      
      // Check if conversation belongs to user
      if (conversation.user.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to delete this conversation'
        });
      }
      
      // Delete all messages in the conversation
      await Message.deleteMany({ conversation: req.params.id });
      
      // Delete the conversation
      await Conversation.findByIdAndDelete(req.params.id);
      
      return res.json({
        success: true,
        message: 'Conversation deleted'
      });
    } catch (error) {
      console.error('Error deleting conversation:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error',
        details: error.message
      });
    }
  }
);

module.exports = router; 