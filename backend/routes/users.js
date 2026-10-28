const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { protect, authorize, requirePermission, isOwnerOrAdmin } = require('../middleware/auth');
const { PERMISSIONS } = require('../config/roles');
const User = require('../models/User');

/**
 * @route   GET /api/users
 * @desc    Get all users (admin only)
 * @access  Private/Admin
 */
router.get('/', 
  protect, 
  authorize('admin'), 
  requirePermission(PERMISSIONS.READ_USERS),
  async (req, res) => {
    try {
      // Get all users without returning password field
      const users = await User.find().select('-password');
      
      res.json({
        success: true,
        count: users.length,
        data: users
      });
    } catch (err) {
      console.error('Error getting users:', err.message);
      res.status(500).json({
        success: false,
        message: 'Server error getting users'
      });
    }
  }
);

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID (admin or user themselves)
 * @access  Private
 */
router.get('/:id', 
  protect,
  isOwnerOrAdmin('id'),
  requirePermission(PERMISSIONS.READ_USER),
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id).select('-password');
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      res.json({
        success: true,
        data: user
      });
    } catch (err) {
      console.error('Error getting user:', err.message);
      
      // Handle invalid ID format
      if (err.kind === 'ObjectId') {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Server error getting user'
      });
    }
  }
);

/**
 * @route   POST /api/users
 * @desc    Create a new user (admin only)
 * @access  Private/Admin
 */
router.post('/',
  protect,
  authorize('admin'),
  requirePermission(PERMISSIONS.CREATE_USER),
  async (req, res) => {
    const { username, password, role } = req.body;
    
    try {
      // Validate input
      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: 'Username and password are required'
        });
      }
      
      // Check if username is already taken
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Username is already taken'
        });
      }
      
      // Create new user
      const user = new User({
        username,
        password, // Will be hashed by the pre-save hook
        role: role || 'user' // Default to 'user' if role not specified
      });
      
      await user.save();
      
      // Return user without password
      const userWithoutPassword = user.toObject();
      delete userWithoutPassword.password;
      
      res.status(201).json({
        success: true,
        data: userWithoutPassword,
        message: 'User created successfully'
      });
    } catch (err) {
      console.error('Error creating user:', err.message);
      res.status(500).json({
        success: false,
        message: 'Server error creating user'
      });
    }
  }
);

/**
 * @route   PUT /api/users/:id
 * @desc    Update user (admin or user themselves)
 * @access  Private
 */
router.put('/:id',
  protect,
  isOwnerOrAdmin('id'),
  requirePermission(PERMISSIONS.UPDATE_USER),
  async (req, res) => {
    const { username, password, role } = req.body;
    
    try {
      // Find user
      let user = await User.findById(req.params.id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      // Only admins can update roles
      if (role && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Only admins can update user roles'
        });
      }
      
      // Update fields conditionally
      if (username) user.username = username;
      if (password) user.password = password; // Will be hashed by pre-save hook
      if (role && req.user.role === 'admin') user.role = role;
      
      await user.save();
      
      // Return updated user without password
      const updatedUser = user.toObject();
      delete updatedUser.password;
      
      res.json({
        success: true,
        data: updatedUser,
        message: 'User updated successfully'
      });
    } catch (err) {
      console.error('Error updating user:', err.message);
      
      // Handle invalid ID format
      if (err.kind === 'ObjectId') {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Server error updating user'
      });
    }
  }
);

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user (admin only)
 * @access  Private/Admin
 */
router.delete('/:id',
  protect,
  authorize('admin'),
  requirePermission(PERMISSIONS.DELETE_USER),
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      // Prevent deletion of the last admin user
      if (user.role === 'admin') {
        const adminCount = await User.countDocuments({ role: 'admin' });
        
        if (adminCount <= 1) {
          return res.status(400).json({
            success: false,
            message: 'Cannot delete the last admin user'
          });
        }
      }
      
      await User.deleteOne({ _id: req.params.id });
      
      res.json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (err) {
      console.error('Error deleting user:', err.message);
      
      // Handle invalid ID format
      if (err.kind === 'ObjectId') {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Server error deleting user'
      });
    }
  }
);

module.exports = router; 