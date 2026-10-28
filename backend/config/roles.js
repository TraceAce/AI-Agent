/**
 * Role-Based Access Control (RBAC) configuration
 * 
 * This file defines roles and their associated permissions.
 * Roles hierarchy: admin > user
 */

// Define permissions as constants for consistency and typo prevention
const PERMISSIONS = {
  // User management permissions
  CREATE_USER: 'create:user',
  READ_USER: 'read:user',
  UPDATE_USER: 'update:user',
  DELETE_USER: 'delete:user',
  READ_USERS: 'read:users', // List all users
  
  // Chat permissions
  READ_CHAT: 'read:chat',
  CREATE_CHAT: 'create:chat',
  
  // System permissions
  SYSTEM_ADMIN: 'system:admin',
  READ_LOGS: 'read:logs',
};

// Define roles and their associated permissions
const ROLES = {
  admin: [
    // Admin has all permissions
    PERMISSIONS.CREATE_USER,
    PERMISSIONS.READ_USER,
    PERMISSIONS.UPDATE_USER,
    PERMISSIONS.DELETE_USER,
    PERMISSIONS.READ_USERS,
    PERMISSIONS.READ_CHAT,
    PERMISSIONS.CREATE_CHAT,
    PERMISSIONS.SYSTEM_ADMIN,
    PERMISSIONS.READ_LOGS
  ],
  user: [
    // Regular users can only read their own user data and use the chat
    PERMISSIONS.READ_USER, // Only for their own data
    PERMISSIONS.UPDATE_USER, // Only for their own data
    PERMISSIONS.READ_CHAT,
    PERMISSIONS.CREATE_CHAT
  ]
};

// Function to check if a role has a specific permission
const hasPermission = (role, permission) => {
  if (!ROLES[role]) {
    return false; // Role doesn't exist
  }
  
  return ROLES[role].includes(permission);
};

// Check if user has permission (can be used in authorization middleware)
const checkPermission = (user, permission) => {
  if (!user || !user.role) {
    return false;
  }
  
  return hasPermission(user.role, permission);
};

module.exports = {
  PERMISSIONS,
  ROLES,
  hasPermission,
  checkPermission
}; 