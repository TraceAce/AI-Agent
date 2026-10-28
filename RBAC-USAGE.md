# Using Role-Based Access Control in Granite AI

This guide provides instructions on how to use the newly implemented Role-Based Access Control (RBAC) features in the Granite AI application.

## Available Roles

The application currently supports two roles:

- **Admin**: Full system access, including user management
- **User**: Standard access to chat functionality and self-management

## Admin Features

As an admin, you have access to the following features:

### User Management

1. From the main interface, click the "User Management" tab in the navigation bar.
2. The User Management panel provides the following capabilities:
   - **View all users**: See a list of all users with their roles and creation dates
   - **Add new users**: Create new user accounts with defined roles
   - **Edit users**: Update user information and change roles
   - **Reset passwords**: Reset passwords for any user
   - **Delete users**: Remove user accounts from the system

### Password Management

Admins can:
- Change their own password through the "Change Password" option in the app header
- Reset passwords for any user through the User Management panel

### Role Verification

To check if a specific user has admin privileges, you can use the following API endpoint:
```
GET /api/auth/check-role/admin
```

### Creating an Admin User

If you need to create a new admin user:
1. Login as an existing admin
2. Navigate to User Management
3. Click "Add User"
4. Fill in the username and password
5. Select "admin" from the role dropdown
6. Click "Add User"

## User Features

Standard users have access to:

1. **Chat Interface**: Communicate with the AI assistant
2. **Change Password**: Update their own password
3. **Profile Information**: View their username and role

## Testing the RBAC System

The application includes test routes that can be used to verify RBAC functionality:

- **Public Endpoint**: `/api/test/public` - Accessible without logging in
- **Protected Endpoint**: `/api/test/protected` - Requires login but no specific role
- **Admin Endpoint**: `/api/test/admin` - Requires admin role
- **Permission-Specific Endpoints**:
  - `/api/test/chat-permission` - Requires chat permission (both roles)
  - `/api/test/user-management` - Requires user management permission (admin only)

You can use tools like Postman or curl to test these endpoints:

```bash
# Example: Test admin access (replace YOUR_TOKEN with actual JWT token)
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3009/api/test/admin
```

## Troubleshooting

### Access Denied Messages

If you receive "Access Denied" errors, check:
1. Are you logged in?
2. Do you have the correct role for the operation?
3. Are you trying to access another user's resources?

### JWT Errors

If you receive authentication errors:
1. Your session may have expired - try logging out and back in
2. There may be an issue with the JWT token - clear browser cache

### Role Assignment Issues

If you cannot assign roles to users:
1. Verify you are logged in as an admin
2. Make sure you're not trying to remove the last admin user in the system

## Security Best Practices

1. **Principle of Least Privilege**: Assign users the minimum permissions needed for their job
2. **Regular Auditing**: Periodically review user roles and permissions
3. **Password Security**: Use strong passwords and change them regularly
4. **Session Management**: Log out when not using the application
5. **Account Sharing**: Do not share credentials between users 