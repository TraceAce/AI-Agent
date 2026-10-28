const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

// Middleware for authentication
const auth = (req, res, next) => {
  // Get token from header
  const token = req.header('x-auth-token');

  // Check if no token
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  // Verify token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mysecretkey');
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  console.log(`Login attempt for username: ${username}`);

  try {
    // Case insensitive username search using regex
    const usernameRegex = new RegExp(`^${username}$`, 'i');
    
    // Check if user exists with case-insensitive search
    const user = await User.findOne({ username: usernameRegex });
    
    if (!user) {
      console.log(`User not found: ${username}`);
      return res.status(400).json({ 
        success: false,
        message: 'Invalid Credentials' 
      });
    }

    // Log for debugging
    console.log(`Found user: ${user.username}, ID: ${user.id}`);

    // Check password
    const isMatch = await user.comparePassword(password);
    console.log(`Password match result: ${isMatch ? 'Success' : 'Failed'}`);
    
    if (!isMatch) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid Credentials' 
      });
    }

    // Update last login time
    user.lastLogin = new Date();
    await user.save();
    
    // Create JWT payload
    const payload = {
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        lastLogin: user.lastLogin
      }
    };

    // Sign token
    jwt.sign(
      payload,
      process.env.JWT_SECRET || 'mysecretkey',
      { expiresIn: '12h' },
      (err, token) => {
        if (err) throw err;
        console.log(`Login successful for user: ${user.username}`);
        res.json({ 
          success: true,
          token,
          user: {
            id: user.id,
            username: user.username,
            role: user.role,
            lastLogin: user.lastLogin
          }
        });
      }
    );
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});

// @route   GET api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
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
    console.error('Error getting current user:', err.message);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});

// @route   GET api/auth/validate
// @desc    Validate token
// @access  Private
router.get('/validate', protect, (req, res) => {
  res.json({ 
    success: true,
    isValid: true, 
    user: req.user 
  });
});

// @route   POST api/auth/reset-admin
// @desc    Reset admin password (for emergency recovery)
// @access  Public
router.post('/reset-admin', async (req, res) => {
  try {
    // Only allow this in development mode for security
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        message: 'This endpoint is not available in production'
      });
    }
    
    const adminUsername = process.env.DEFAULT_ADMIN_USERNAME || 'admin';
    
    // Case insensitive username search using regex
    const usernameRegex = new RegExp(`^${adminUsername}$`, 'i');
    
    // Check if admin exists with case-insensitive search
    const admin = await User.findOne({ username: usernameRegex });
    
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin user not found'
      });
    }
    
    // Reset password to default or environment variable
    admin.password = process.env.DEFAULT_ADMIN_PASSWORD || 'admin';
    await admin.save();
    
    console.log('Admin password reset successful');
    
    res.json({
      success: true,
      message: 'Admin password has been reset'
    });
  } catch (err) {
    console.error('Reset admin error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST api/auth/logout
// @desc    Logout and invalidate token (for future use with token blacklisting)
// @access  Private
router.post('/logout', protect, async (req, res) => {
  try {
    // In a more advanced implementation, you could add the token to a blacklist here
    // For now, we just confirm the logout was received
    
    console.log(`User ${req.user.username} (${req.user.id}) logged out`);
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (err) {
    console.error('Logout error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET api/auth/check-role
// @desc    Check if the user has a specific role
// @access  Private
router.get('/check-role/:role', protect, (req, res) => {
  const requestedRole = req.params.role;
  const userRole = req.user.role;
  
  console.log(`Checking if user ${req.user.username} has role: ${requestedRole}`);
  console.log(`User's actual role: ${userRole}`);
  
  // Admin has all permissions
  if (userRole === 'admin') {
    return res.json({
      success: true,
      hasRole: true,
      role: userRole
    });
  }
  
  // For other roles, check exact match
  const hasRole = userRole === requestedRole;
  
  res.json({
    success: true,
    hasRole,
    role: userRole
  });
});

module.exports = router; 