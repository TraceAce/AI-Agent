import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  IconButton,
  InputAdornment,
  CircularProgress,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import axios, { AxiosError } from 'axios';
import authService from '../services/auth';

interface ChangePasswordFormProps {
  onClose?: () => void;
  onLogout?: () => void;
}

interface FormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface PasswordVisibility {
  currentPassword: boolean;
  newPassword: boolean;
  confirmPassword: boolean;
}

interface ApiResponse {
  success: boolean;
  message: string;
}

const ChangePasswordForm: React.FC<ChangePasswordFormProps> = ({ onClose, onLogout }) => {
  const [formData, setFormData] = useState<FormData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState<PasswordVisibility>({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });

  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleTogglePassword = (field: keyof PasswordVisibility) => {
    setShowPassword((prev: PasswordVisibility) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev: FormData) => ({
      ...prev,
      [name]: value,
    }));
    // Clear messages when user starts typing
    setError('');
    setSuccess('');
  };

  const validatePassword = (password: string): boolean => {
    // Check for each required element separately for more reliable validation
    const hasLowerCase = /[a-z]/.test(password);
    const hasUpperCase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    // Use a simpler pattern for special characters that won't have escaping issues
    const hasSpecialChar = /[^A-Za-z0-9]/.test(password);
    const isLongEnough = password.length >= 8;
    
    console.log('Password validation results:', {
      hasLowerCase,
      hasUpperCase,
      hasNumber,
      hasSpecialChar,
      isLongEnough,
      passwordLength: password.length
    });
    
    return hasLowerCase && hasUpperCase && hasNumber && hasSpecialChar && isLongEnough;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    // Validate passwords match
    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match');
      setLoading(false);
      return;
    }

    // Validate password strength
    if (!validatePassword(formData.newPassword)) {
      setError(
        'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      );
      setLoading(false);
      return;
    }

    try {
      // Use authService to change password
      const response = await authService.changePassword(
        formData.currentPassword,
        formData.newPassword
      );

      if (response.success) {
        setSuccess('Password changed successfully. You will be logged out in 2 seconds.');
        setFormData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
        
        // Close the form and log the user out after 2 seconds
        setTimeout(() => {
          // Close dialog first
          if (onClose) onClose();
          
          // Perform explicit logout actions
          if (onLogout) {
            // Call the logout function which will clear tokens and update state
            onLogout();
            
            // Force a page refresh to ensure we redirect to login
            window.location.href = window.location.origin;
            
            // Log this action for debugging
            console.log('User logged out after password change');
          } else {
            // Fallback in case onLogout is not provided
            authService.logout();
            console.log('Using authService.logout() directly as fallback');
            // Force page reload to ensure redirect to login
            window.location.reload();
          }
        }, 100);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else if (axios.isAxiosError(err) && err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Failed to change password');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" component="h2" gutterBottom>
        Change Password
      </Typography>

      <form onSubmit={handleSubmit}>
        <TextField
          fullWidth
          type={showPassword.currentPassword ? 'text' : 'password'}
          label="Current Password"
          name="currentPassword"
          value={formData.currentPassword}
          onChange={handleChange}
          margin="normal"
          required
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => handleTogglePassword('currentPassword')}
                  edge="end"
                >
                  {showPassword.currentPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <TextField
          fullWidth
          type={showPassword.newPassword ? 'text' : 'password'}
          label="New Password"
          name="newPassword"
          value={formData.newPassword}
          onChange={handleChange}
          margin="normal"
          required
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => handleTogglePassword('newPassword')}
                  edge="end"
                >
                  {showPassword.newPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <TextField
          fullWidth
          type={showPassword.confirmPassword ? 'text' : 'password'}
          label="Confirm New Password"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleChange}
          margin="normal"
          required
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => handleTogglePassword('confirmPassword')}
                  edge="end"
                >
                  {showPassword.confirmPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mt: 2 }}>
            {success}
          </Alert>
        )}

        <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          {onClose && (
            <Button
              variant="outlined"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={loading}
            startIcon={loading && <CircularProgress size={20} />}
          >
            {loading ? 'Changing Password...' : 'Change Password'}
          </Button>
        </Box>
      </form>
    </Box>
  );
};

export default ChangePasswordForm; 