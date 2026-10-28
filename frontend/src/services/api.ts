import axios, { AxiosError, AxiosResponse } from 'axios';
import { ChatMessage, ChatResponse } from '../types';
import authService from './auth';

// Use the full URL when in production, or localhost for development
const API_URL = process.env.NODE_ENV === 'production' 
  ? process.env.REACT_APP_API_URL  
  : 'http://localhost:3009/api';

console.log('Using API URL:', API_URL);

// Create axios instance with authentication control
const api = axios.create({
  baseURL: API_URL
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = authService.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor to handle unauthorized errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // If 401 response returned from API, logout user and redirect to login
      authService.logout();
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

const chatbotService = {
  sendMessage: async (message: string, chatHistory: ChatMessage[]): Promise<ChatResponse> => {
    try {
      const response: AxiosResponse<ChatResponse> = await api.post('/chat', {
        message,
        chatHistory
      });
      return response.data;
    } catch (error) {
      console.error('Error sending message:', error);
      const axiosError = error as AxiosError;
      throw {
        message: axiosError.message,
        status: axiosError.response?.status,
        details: axiosError.response?.data
      };
    }
  }
};

export default chatbotService; 