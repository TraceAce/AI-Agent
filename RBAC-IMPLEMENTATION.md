# Role-Based Access Control (RBAC) Implementation

This document outlines the Role-Based Access Control system implemented in the Granite AI application.

## Overview

The RBAC system provides a structured approach to controlling access to various parts of the application. It is built around two main roles:

- **Admin**: Full access to all parts of the application, including user management.
- **User**: Limited access to standard features like chat and personal settings.

## Architecture

The RBAC system is composed of the following components:

### 1. Role Configuration

Defined in `backend/config/roles.js`, this configuration establishes:

- **Permissions**: Granular access controls for specific actions (e.g., reading users, managing chats)
- **Roles**: Collections of permissions assigned to each role type
- **Utility functions**: Methods to check permissions for a given role

### 2. Authentication Middleware

Enhanced middleware in `backend/middleware/auth.js` that provides:

- **Token validation**: Verifies JWT tokens and extracts user information
- **Role verification**: Checks if a user has a specific role (`authorize` function)
- **Permission checking**: Verifies if a user's role has a specific permission (`requirePermission` function)
- **Ownership validation**: Allows users to access their own resources regardless of role (`isOwnerOrAdmin` function)

### 3. Secured Routes

All API routes have been updated to use the RBAC middleware:

- **User Management**: Admin-only access to create, view, update, and delete users
- **Chat Routes**: Controlled by chat-specific permissions
- **Password Management**: Different access levels for changing own password vs. resetting others' passwords
- **Test Routes**: Sample routes demonstrating different permission levels

## Testing RBAC

You can use the following test routes to verify RBAC functionality:

- `GET /api/test/public`: Accessible to everyone without authentication
- `GET /api/test/protected`: Requires authentication but no specific role
- `GET /api/test/admin`: Requires admin role
- `GET /api/test/chat-permission`: Requires permission to create chats
- `GET /api/test/user-management`: Requires permission to manage users

## Frontend Implementation

The frontend has been updated to support RBAC:

- **User role display**: The app header shows the current user's role
- **Conditional rendering**: Admin users see additional UI elements (tabs for user management)
- **Admin Panel**: A dedicated interface for user management, only visible to admins

## Security Considerations

This RBAC implementation follows security best practices:

- **JWT payload**: Contains minimal user information (ID, username, role)
- **Server-side validation**: All permissions are verified on the server regardless of client-side UI
- **Granular permissions**: More specific than role-based checks for precise access control
- **Audit trail**: Comprehensive logging of access attempts and permission checks

## Future Enhancements

Potential improvements to the RBAC system:

- Custom roles with configurable permissions
- Role assignment delegation
- Enhanced audit logging for security events
- Rate limiting based on user roles
- Dynamic permission updates without server restart 