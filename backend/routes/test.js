/**
 * Test routes for demonstrating Role Based Access Control
 */
const express = require('express');
const router = express.Router();
const { protect, authorize, requirePermission } = require('../middleware/auth');
const { PERMISSIONS } = require('../config/roles');

/**
 * @route   GET /api/test/public
 * @desc    Public test route - no authentication required
 * @access  Public
 */
router.get('/public', (req, res) => {
  res.json({
    success: true,
    message: 'This is a public endpoint that anyone can access',
    data: {
      timestamp: new Date(),
      endpoint: '/api/test/public'
    }
  });
});

/**
 * @route   GET /api/test/protected
 * @desc    Protected route - any authenticated user can access
 * @access  Private
 */
router.get('/protected', protect, (req, res) => {
  res.json({
    success: true,
    message: 'This is a protected endpoint that requires authentication',
    data: {
      user: req.user,
      timestamp: new Date(),
      endpoint: '/api/test/protected'
    }
  });
});

/**
 * @route   GET /api/test/admin
 * @desc    Admin-only route - only users with admin role can access
 * @access  Private/Admin
 */
router.get('/admin', 
  protect, 
  authorize('admin'), 
  (req, res) => {
    res.json({
      success: true,
      message: 'This is an admin-only endpoint',
      data: {
        user: req.user,
        timestamp: new Date(),
        endpoint: '/api/test/admin'
      }
    });
  }
);

/**
 * @route   GET /api/test/chat-permission
 * @desc    Tests chat permission - only users with chat permission can access
 * @access  Private
 */
router.get('/chat-permission', 
  protect, 
  requirePermission(PERMISSIONS.CREATE_CHAT), 
  (req, res) => {
    res.json({
      success: true,
      message: 'You have permission to use the chat functionality',
      data: {
        user: req.user,
        permission: PERMISSIONS.CREATE_CHAT,
        timestamp: new Date(),
        endpoint: '/api/test/chat-permission'
      }
    });
  }
);

/**
 * @route   GET /api/test/user-management
 * @desc    Tests user management permission - only admins should have this
 * @access  Private/Admin
 */
router.get('/user-management', 
  protect, 
  requirePermission(PERMISSIONS.READ_USERS), 
  (req, res) => {
    res.json({
      success: true,
      message: 'You have permission to manage users',
      data: {
        user: req.user,
        permission: PERMISSIONS.READ_USERS,
        timestamp: new Date(),
        endpoint: '/api/test/user-management'
      }
    });
  }
);

module.exports = router; 