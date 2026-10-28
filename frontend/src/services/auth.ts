import axios, { AxiosError } from 'axios';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface User {
  id: string;
  username: string;
  role: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: User;
  message?: string;
}

export interface ApiErrorResponse {
  success: boolean;
  message: string;
}

// Use the full URL when in production, or localhost for development
const API_URL = process.env.NODE_ENV === 'production' 
  ? window.location.origin + '/api'  // This will resolve to the current domain with /api path
  : process.env.REACT_APP_API_URL || 'http://localhost:3009/api';

const authService = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, credentials);
      
      // Check if we have a successful response with a token
      if (response.data.success && response.data.token) {
        // Store token in localStorage
        localStorage.setItem('token', response.data.token);
        
        // If user data is available, store it
        if (response.data.user) {
          localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        
        // Set the authorization header for future requests
        authService.setAuthHeader();
        
        return response.data;
      } else {
        throw new Error(response.data.message || 'Login failed');
      }
    } catch (error: unknown) {
      console.error('Login error:', error);
      
      if (error instanceof AxiosError && error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      
      if (error instanceof Error) {
        throw error;
      }
      
      throw new Error('An unknown error occurred during login');
    }
  },

  logout: (): void => {
    // Try to notify the server about logout (but don't wait for response)
    const token = localStorage.getItem('token');
    if (token) {
      // Make a fire-and-forget request to the server to log out
      try {
        axios.post(`${API_URL}/auth/logout`, {}, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }).catch(error => {
          // Just log errors, don't block the logout process
          console.error('Error notifying server about logout:', error);
        });
      } catch (error) {
        console.error('Error during logout API call:', error);
      }
    }
    
    // Clear all authentication data
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Clear any authorization headers
    delete axios.defaults.headers.common['Authorization'];
    delete axios.defaults.headers.common['x-auth-token'];
    
    console.log('User logged out, all session data cleared');
  },

  getCurrentUser: (): User | null => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      return JSON.parse(userStr);
    }
    return null;
  },

  getToken: (): string | null => {
    return localStorage.getItem('token');
  },

  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('token');
  },

  validateToken: async (): Promise<boolean> => {
    try {
      const token = authService.getToken();
      if (!token) {
        return false;
      }
      
      const response = await axios.get(`${API_URL}/auth/validate`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      return response.data && response.data.isValid;
    } catch (error: unknown) {
      console.error('Token validation error:', error);
      return false;
    }
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
    try {
      const token = authService.getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }
      
      const PASSWORD_API_URL = process.env.NODE_ENV === 'production' 
        ? '/api/password' 
        : 'http://localhost:3009/api/password';
        
      const response = await axios.post(
        `${PASSWORD_API_URL}/change`,
        { currentPassword, newPassword },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      
      return response.data;
    } catch (error: unknown) {
      console.error('Change password error:', error);
      
      if (error instanceof AxiosError && error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      
      if (error instanceof Error) {
        throw error;
      }
      
      throw new Error('An unknown error occurred while changing password');
    }
  },

  // Set auth token for axios requests
  setAuthHeader: (): void => {
    const token = authService.getToken();
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }
};

// Set auth header by default
authService.setAuthHeader();

export default authService; 