const express = require('express');
const axios = require('axios');
const router = express.Router();
const { protect, requirePermission } = require('../middleware/auth');
const { PERMISSIONS } = require('../config/roles');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

// @route   POST api/messages
// @desc    Send a message and get AI response
// @access  Private
router.post('/',
  protect,
  requirePermission(PERMISSIONS.CREATE_CHAT),
  async (req, res) => {
    try {
      const { content, conversationId } = req.body;
      
      if (!content) {
        return res.status(400).json({
          success: false,
          message: 'Message content is required'
        });
      }
      
      if (!conversationId) {
        return res.status(400).json({
          success: false,
          message: 'Conversation ID is required'
        });
      }
      
      // Check if conversation exists and belongs to user
      const conversation = await Conversation.findById(conversationId);
      
      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: 'Conversation not found'
        });
      }
      
      if (conversation.user.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to access this conversation'
        });
      }
      
      // Create user message
      const userMessage = new Message({
        conversation: conversationId,
        content,
        role: 'user'
      });
      
      await userMessage.save();
      
      // Get conversation history for context
      const messageHistory = await Message.find({ conversation: conversationId })
        .sort({ createdAt: 1 });
      
      // Format messages for Flowise API according to documentation
      // Format: {role: "userMessage" | "apiMessage", content: string}
      const flowiseHistory = messageHistory.map(msg => ({
        role: msg.role === 'user' ? 'userMessage' : 'apiMessage',
        content: msg.content
      }));
      
      // Get Flowise API configuration from environment variables
      const FLOWISE_API_URL = process.env.FLOWISE_API_URL || 'http://localhost:3000';
      const FLOWISE_CHATBOT_ID = process.env.FLOWISE_CHATBOT_ID;
      const FLOWISE_API_KEY = process.env.FLOWISE_API_KEY || '';

      if (!FLOWISE_CHATBOT_ID) {
        return res.status(500).json({ 
          success: false,
          message: 'Missing Flowise configuration',
          details: {
            chatbotId: FLOWISE_CHATBOT_ID ? 'Set' : 'Missing'
          }
        });
      }

      console.log(`Sending message to Flowise: ${content}`);
      console.log(`Flowise API URL: ${FLOWISE_API_URL}`);
      console.log(`Flowise Chatbot ID: ${FLOWISE_CHATBOT_ID}`);
      console.log(`Using API Key: ${FLOWISE_API_KEY ? 'Yes' : 'No'}`);
      
      // Add user context to the request
      const userContext = {
        userId: req.user.id,
        username: req.user.username,
        role: req.user.role,
        conversationId
      };

      // Set up headers
      const headers = { 'Content-Type': 'application/json' };
      if (FLOWISE_API_KEY && FLOWISE_API_KEY.trim() !== '') {
        headers['Authorization'] = `Bearer ${FLOWISE_API_KEY}`;
      } else {
        console.log('No valid API key found to add to headers');
      }

      // Create a unique session ID based on conversation ID for persistence
      const sessionId = `session_${conversationId}`;
      console.log(`Using session ID: ${sessionId}`);

      // Prepare Flowise API endpoint
      const apiEndpoint = `${FLOWISE_API_URL}/api/v1/prediction/${FLOWISE_CHATBOT_ID}`;
      console.log(`Calling API endpoint: ${apiEndpoint}`);

      // Add retry logic for 500 status codes
      let attempts = 0;
      const maxAttempts = 3;
      let lastError = null;

      while (attempts < maxAttempts) {
        try {
          // Send request to Flowise API
          const aiResponse = await axios.post(
            apiEndpoint,
            { 
              question: content,
              userContext: userContext,
              overrideConfig: {
                sessionId: sessionId,
                returnSourceDocuments: true
              }
            },
            { headers }
          );
          
          // If request succeeds, process the response
          // Extract the AI response
          let responseText = '';
          
          // Handle different response formats
          if (typeof aiResponse.data === 'string') {
            responseText = aiResponse.data;
          } else if (aiResponse.data?.text?.text) {
            responseText = aiResponse.data.text.text;
          } else if (typeof aiResponse.data?.text === 'string') {
            responseText = aiResponse.data.text;
          } else if (aiResponse.data?.data?.text) {
            responseText = aiResponse.data.data.text;
          } else if (typeof aiResponse.data?.data === 'string') {
            responseText = aiResponse.data.data;
          } else if (aiResponse.data?.message) {
            responseText = typeof aiResponse.data.message === 'string' 
              ? aiResponse.data.message 
              : JSON.stringify(aiResponse.data.message);
          } else {
            try {
              responseText = JSON.stringify(aiResponse.data, null, 2);
            } catch {
              responseText = "Received a response I couldn't parse.";
            }
          }

          // Create AI message
          const aiMessage = new Message({
            conversation: conversationId,
            content: responseText,
            role: 'assistant'
          });
          
          await aiMessage.save();
          
          // Update conversation summary if it's the first message
          if (conversation.messageCount <= 2) {
            conversation.summary = content.substring(0, 100);
            await conversation.save();
          }
          
          return res.json({
            success: true,
            data: {
              userMessage,
              aiMessage
            }
          });

        } catch (error) {
          lastError = error;
          
          // Check if it's a 500 error and we haven't exceeded max attempts
          if (error.response?.status === 500 && attempts < maxAttempts - 1) {
            attempts++;
            console.log(`Attempt ${attempts} failed with 500 status code. Retrying...`);
            // Wait for 1 second before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
            continue;
          }
          
          // If it's not a 500 error or we've exceeded max attempts, throw the error
          throw error;
        }
      }

      // If we've exhausted all attempts, throw the last error
      console.error('Error processing message after all retry attempts:', lastError);
      
      // Check for specific errors to provide meaningful responses
      if (lastError.response) {
        console.error('Error response data:', lastError.response.data);
        console.error('Error status code:', lastError.response.status);
      }
      
      return res.status(500).json({
        success: false,
        message: 'Error processing message after multiple retry attempts',
        details: lastError.message
      });
    } catch (error) {
      console.error('Error processing message:', error);
      
      // Check for specific errors to provide meaningful responses
      if (error.response) {
        console.error('Error response data:', error.response.data);
        console.error('Error status code:', error.response.status);
      }
      
      return res.status(500).json({
        success: false,
        message: 'Error processing message',
        details: error.message
      });
    }
  }
);

// @route   GET api/messages/:conversationId
// @desc    Get messages for a conversation
// @access  Private
router.get('/:conversationId',
  protect,
  async (req, res) => {
    try {
      const { conversationId } = req.params;
      const { limit = 50, before } = req.query;
      
      // Check if conversation exists and belongs to user
      const conversation = await Conversation.findById(conversationId);
      
      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: 'Conversation not found'
        });
      }
      
      if (conversation.user.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to access this conversation'
        });
      }
      
      // Build query
      const query = { conversation: conversationId };
      
      // Add before filter if provided
      if (before) {
        query.createdAt = { $lt: new Date(before) };
      }
      
      // Get messages with pagination
      const messages = await Message.find(query)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .sort({ createdAt: 1 });
      
      return res.json({
        success: true,
        data: messages
      });
    } catch (error) {
      console.error('Error fetching messages:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error',
        details: error.message
      });
    }
  }
);

// @route   DELETE api/messages/:id
// @desc    Delete a message
// @access  Private
router.delete('/:id',
  protect,
  async (req, res) => {
    try {
      const message = await Message.findById(req.params.id);
      
      if (!message) {
        return res.status(404).json({
          success: false,
          message: 'Message not found'
        });
      }
      
      // Get conversation to check ownership
      const conversation = await Conversation.findById(message.conversation);
      
      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: 'Associated conversation not found'
        });
      }
      
      // Check if conversation belongs to user
      if (conversation.user.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to delete this message'
        });
      }
      
      // Delete the message
      await Message.findByIdAndDelete(req.params.id);
      
      // Update message count
      conversation.messageCount = Math.max(0, conversation.messageCount - 1);
      await conversation.save();
      
      return res.json({
        success: true,
        message: 'Message deleted'
      });
    } catch (error) {
      console.error('Error deleting message:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error',
        details: error.message
      });
    }
  }
);

module.exports = router; 