const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { PERMISSIONS, checkPermission } = require('../config/roles');

// Protect routes - verify token and extract user info
exports.protect = async (req, res, next) => {
  let token;
  
  console.log('Auth middleware called with headers:');
  
  // Check for token in headers (multiple formats)
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    // Bearer token format
    token = req.headers.authorization.split(' ')[1];
    console.log('Found Bearer token in Authorization header');
  } else if (req.headers['x-auth-token']) {
    // x-auth-token header format
    token = req.headers['x-auth-token'];
    console.log('Found token in x-auth-token header');
  } else if (req.cookies?.token) {
    // Check for token in cookies
    token = req.cookies.token;
    console.log('Found token in cookies');
  }
  
  // Make sure token exists
  if (!token) {
    console.log('No token found in request');
    return res.status(401).json({ 
      success: false,
      message: 'Authentication required. Please log in.' 
    });
  }
  
  try {
    // Verify token
    console.log('Attempting to verify token');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mysecretkey');
    console.log('Token verified, decoded payload:', JSON.stringify(decoded, null, 2));
    
    // Get user from the token (using decoded.user.id instead of decoded.id)
    req.user = decoded.user || {};
    
    // If we have a decoded user ID, retrieve the full user
    if (decoded.user && decoded.user.id) {
      console.log(`Looking up user with ID: ${decoded.user.id}`);
      const userFromDb = await User.findById(decoded.user.id);
      
      if (!userFromDb) {
        console.log(`User with ID ${decoded.user.id} not found in database`);
        return res.status(401).json({ 
          success: false,
          message: 'User not found' 
        });
      }
      
      console.log(`User found: ${userFromDb.username} with role: ${userFromDb.role}`);
      req.user = decoded.user;
    } else {
      console.log('Invalid token payload format - no user.id found');
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token format' 
      });
    }
    
    console.log('Auth middleware completed successfully');
    next();
  } catch (error) {
    console.error('Auth middleware error:', error.message);
    return res.status(401).json({ 
      success: false,
      message: 'Session expired or invalid. Please log in again.' 
    });
  }
};

// Role-based access control - restrict to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ 
        success: false,
        message: 'User role not defined' 
      });
    }
    
    if (!roles.includes(req.user.role)) {
      console.log(`Access denied: User role ${req.user.role} not in authorized roles: ${roles.join(', ')}`);
      return res.status(403).json({ 
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}` 
      });
    }
    
    console.log(`Role check passed for user: ${req.user.username}, role: ${req.user.role}`);
    next();
  };
};

// Permission-based access control
exports.requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: 'Authentication required' 
      });
    }
    
    if (checkPermission(req.user, permission)) {
      console.log(`Permission check passed for user: ${req.user.username}, permission: ${permission}`);
      next();
    } else {
      console.log(`Permission denied: ${permission} for user: ${req.user.username}, role: ${req.user.role}`);
      return res.status(403).json({ 
        success: false,
        message: 'You do not have permission to perform this action' 
      });
    }
  };
};

// Owner or Admin check - allows access if user is an admin or the owner of the resource
exports.isOwnerOrAdmin = (paramIdField = 'id') => {
  return (req, res, next) => {
    const resourceId = req.params[paramIdField];
    
    // Check if user is admin (admins can access all resources)
    if (req.user.role === 'admin') {
      console.log(`Admin access granted for resource: ${resourceId}`);
      return next();
    }
    
    // Check if user is the owner of the resource
    if (req.user.id === resourceId) {
      console.log(`Owner access granted for resource: ${resourceId}`);
      return next();
    }
    
    // Neither admin nor owner
    console.log(`Access denied: User ${req.user.id} is not owner of resource ${resourceId} or an admin`);
    return res.status(403).json({ 
      success: false,
      message: 'Access denied. You can only access your own resources.' 
    });
  };
}; 