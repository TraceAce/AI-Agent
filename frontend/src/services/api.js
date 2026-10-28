import axios from 'axios';
import authService from './authService';

// Create an axios instance with base URL based on environment
const api = axios.create({
  baseURL: process.env.NODE_ENV === 'production' 
    ? '/api' 
    : 'http://localhost:3009/api'
});

// Request interceptor to add auth token to requests
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['x-auth-token'] = token;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response && error.response.status === 401) {
      // If unauthorized, log out user
      console.log('Auth error in API call, logging out');
      authService.logout();
    }
    return Promise.reject(error);
  }
);

// Send message to chatbot API
export const sendMessage = async (message, chatHistory = []) => {
  try {
    console.log('Sending message to API:', { message, chatHistory });
    const response = await api.post('/chat/message', { 
      message,
      chatHistory 
    });
    console.log('Message response from API:', response.data);
    
    // Extract the actual response text
    let responseData = response.data;
    
    // If we're getting a nested response object from Flowise
    if (responseData?.data && typeof responseData.data !== 'string') {
      // Flowise responses are often directly the text or in the 'text' field
      if (typeof responseData.data === 'string') {
        return { text: responseData.data };
      } else if (responseData.data.text) {
        return { text: responseData.data.text };
      } else {
        // Just return the data object directly and let the component handle extraction
        return { text: responseData.data };
      }
    }
    
    // For simpler response structures
    if (responseData?.data) {
      return { text: responseData.data };
    } else if (responseData?.message) {
      return { text: responseData.message };
    }
    
    // Direct passthrough if nothing else works
    return responseData;
  } catch (error) {
    console.error('Error in sendMessage:', error);
    throw error;
  }
};

// Health check
export const checkHealth = async () => {
  try {
    const response = await api.get('/health');
    return response.data;
  } catch (error) {
    console.error('Health check error:', error);
    throw error;
  }
};

// Export both individual functions and as a service object for backward compatibility
const chatbotService = {
  sendMessage,
  checkHealth
};

export default chatbotService; 