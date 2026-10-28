const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { protect, requirePermission, isOwnerOrAdmin } = require('../middleware/auth');
const { PERMISSIONS } = require('../config/roles');
const User = require('../models/User');

// @route   POST /api/password/change
// @desc    Change user password
// @access  Private
router.post('/change', 
  protect, 
  requirePermission(PERMISSIONS.UPDATE_USER),
  async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      console.log('Password change request received');
      console.log('User ID from token:', req.user?.id);

      // Validate request body
      if (!currentPassword || !newPassword) {
        console.log('Missing required fields');
        return res.status(400).json({ 
          success: false, 
          message: 'Current password and new password are required' 
        });
      }

      // Password strength validation
      const hasLowerCase = /[a-z]/.test(newPassword);
      const hasUpperCase = /[A-Z]/.test(newPassword);
      const hasNumber = /[0-9]/.test(newPassword);
      // Use a simpler pattern that just checks for any non-alphanumeric character
      const hasSpecialChar = /[^A-Za-z0-9]/.test(newPassword);
      const isLongEnough = newPassword.length >= 8;
      
      console.log('Password validation details:', {
        hasLowerCase,
        hasUpperCase,
        hasNumber,
        hasSpecialChar,
        isLongEnough,
        passwordLength: newPassword.length,
        password: newPassword // Only log in development!
      });
      
      if (!hasLowerCase || !hasUpperCase || !hasNumber || !hasSpecialChar || !isLongEnough) {
        console.log('Password does not meet strength requirements');
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character'
        });
      }

      // Get user from database
      console.log(`Looking up user with ID: ${req.user.id}`);
      const user = await User.findById(req.user.id);
      if (!user) {
        console.log(`User with ID ${req.user.id} not found`);
        return res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
      }
      
      console.log(`Found user: ${user.username}, ID: ${user.id}`);

      // Check if current password is correct using the model's comparePassword method
      console.log('Checking current password');
      const isMatch = await user.comparePassword(currentPassword);
      console.log(`Current password check result: ${isMatch ? 'Success' : 'Failed'}`);
      
      if (!isMatch) {
        return res.status(400).json({ 
          success: false, 
          message: 'Current password is incorrect' 
        });
      }

      // Set the new password - this will be hashed by the pre-save hook
      console.log('Setting new password');
      user.password = newPassword;

      // Save updated user - Mongoose pre-save hook will handle hashing
      console.log('Saving user with new password');
      await user.save();

      // Log for debugging
      console.log('Password updated successfully for user:', user.username);

      res.json({ 
        success: true, 
        message: 'Password updated successfully' 
      });
    } catch (err) {
      console.error('Error in change password:', err.message);
      res.status(500).json({ 
        success: false, 
        message: 'Server error' 
      });
    }
  }
);

// @route   POST /api/password/reset/:userId
// @desc    Reset user password (admin only)
// @access  Private/Admin
router.post('/reset/:userId', 
  protect, 
  isOwnerOrAdmin('userId'),
  async (req, res) => {
    try {
      const { newPassword } = req.body;
      const { userId } = req.params;
      
      // Check if request is made by an admin or the user themselves
      const isAdmin = req.user.role === 'admin';
      const isSelfReset = req.user.id === userId;
      
      if (!isAdmin && !isSelfReset) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to reset this user\'s password'
        });
      }
      
      // Password strength validation (only for self-reset, admins can set any password)
      if (isSelfReset) {
        const hasLowerCase = /[a-z]/.test(newPassword);
        const hasUpperCase = /[A-Z]/.test(newPassword);
        const hasNumber = /[0-9]/.test(newPassword);
        // Use a simpler pattern that just checks for any non-alphanumeric character
        const hasSpecialChar = /[^A-Za-z0-9]/.test(newPassword);
        const isLongEnough = newPassword.length >= 8;
        
        console.log('Password reset validation details:', {
          hasLowerCase,
          hasUpperCase,
          hasNumber,
          hasSpecialChar,
          isLongEnough,
          passwordLength: newPassword.length
        });
        
        if (!hasLowerCase || !hasUpperCase || !hasNumber || !hasSpecialChar || !isLongEnough) {
          return res.status(400).json({
            success: false,
            message: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character'
          });
        }
      }
      
      // Find the user
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      // Set new password
      user.password = newPassword;
      await user.save();
      
      console.log(`Password reset for user ${user.username} by ${isAdmin ? 'admin' : 'self'}`);
      
      res.json({
        success: true,
        message: `Password has been reset for ${user.username}`
      });
    } catch (err) {
      console.error('Error in password reset:', err.message);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
);

module.exports = router; 