import axios from 'axios';

const API_URL = process.env.NODE_ENV === 'production' 
  ? '/api/auth' 
  : 'http://localhost:3009/api/auth';

const PASSWORD_API_URL = process.env.NODE_ENV === 'production' 
  ? '/api/password' 
  : 'http://localhost:3009/api/password';

// Set the token in local storage and axios headers
const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('token', token);
    axios.defaults.headers.common['x-auth-token'] = token;
  } else {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['x-auth-token'];
  }
};

// Login user
const login = async (username, password) => {
  try {
    const response = await axios.post(`${API_URL}/login`, { username, password });
    
    if (response.data && response.data.token) {
      console.log('Login successful, setting token');
      setAuthToken(response.data.token);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Login error:', error.response?.data || error.message);
    throw error;
  }
};

// Logout user
const logout = () => {
  console.log('Logging out user');
  setAuthToken(null);
};

// Check if user is authenticated
const isAuthenticated = () => {
  const token = localStorage.getItem('token');
  if (!token) {
    console.log('No token found in localStorage');
    return false;
  }
  
  try {
    // Load token into axios headers
    setAuthToken(token);
    return true;
  } catch (error) {
    console.error('Authentication error:', error);
    return false;
  }
};

// Validate the token
const validateToken = async () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      return false;
    }
    
    console.log('Validating token with backend');
    const response = await axios.get(`${API_URL}/validate`, {
      headers: {
        'x-auth-token': token
      }
    });
    
    const isValid = response.data && response.data.isValid;
    return isValid;
  } catch (error) {
    console.error('Token validation error:', error.response?.data || error.message);
    return false;
  }
};

// Change password
const changePassword = async (currentPassword, newPassword) => {
  try {
    const token = localStorage.getItem('token');
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
  } catch (error) {
    console.error('Change password error:', error.response?.data || error.message);
    throw error;
  }
};

// Get current user info
const getCurrentUser = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_URL}/me`, {
      headers: {
        'x-auth-token': token
      }
    });
    return response.data;
  } catch (error) {
    console.error('Get user error:', error.response?.data || error.message);
    return null;
  }
};

const authService = {
  login,
  logout,
  isAuthenticated,
  validateToken,
  getCurrentUser,
  changePassword,
  setAuthToken
};

export default authService; 