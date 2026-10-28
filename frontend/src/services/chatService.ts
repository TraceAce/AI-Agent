import axios, { AxiosError, AxiosResponse } from 'axios';
import authService from './auth';
import { Message, ChatMessage, Conversation, ConversationWithMessages } from '../types';

// Use the full URL when in production, or localhost for development
const API_URL = process.env.NODE_ENV === 'production' 
  ? window.location.origin + '/api'
  : process.env.REACT_APP_API_URL || 'http://localhost:3009/api';

console.log('Using API URL for chat service:', API_URL);

// Create axios instance with authentication
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

const chatService = {
  // Conversations
  getConversations: async (group?: string, search?: string, page: number = 1, limit: number = 20): Promise<{ 
    conversations: Conversation[], 
    pagination: any,
    groups: string[] 
  }> => {
    try {
      let url = `/conversations?page=${page}&limit=${limit}`;
      if (group) url += `&group=${encodeURIComponent(group)}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      
      const response = await api.get(url);
      return {
        conversations: response.data.data,
        pagination: response.data.pagination,
        groups: response.data.groups
      };
    } catch (error) {
      console.error('Error fetching conversations:', error);
      throw error;
    }
  },

  getConversationById: async (id: string): Promise<ConversationWithMessages> => {
    try {
      const response = await api.get(`/conversations/${id}`);
      return response.data.data;
    } catch (error) {
      console.error(`Error fetching conversation ${id}:`, error);
      throw error;
    }
  },

  createConversation: async (title: string, group: string = 'General', initialMessage?: string): Promise<Conversation> => {
    try {
      const response = await api.post('/conversations', { title, group, initialMessage });
      return response.data.data;
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  },

  updateConversation: async (id: string, title: string, group?: string): Promise<Conversation> => {
    try {
      const response = await api.put(`/conversations/${id}`, { title, group });
      return response.data.data;
    } catch (error) {
      console.error(`Error updating conversation ${id}:`, error);
      throw error;
    }
  },

  deleteConversation: async (id: string): Promise<void> => {
    try {
      await api.delete(`/conversations/${id}`);
    } catch (error) {
      console.error(`Error deleting conversation ${id}:`, error);
      throw error;
    }
  },

  getGroups: async (): Promise<string[]> => {
    try {
      const response = await api.get('/conversations/groups/list');
      console.log("Groups API response:", response.data);
      
      // Ensure we're returning an array even if the API response is inconsistent
      const groups = response.data.data || [];
      
      // Make sure we have at least 'General' as an option
      if (groups.length === 0 || !groups.includes('General')) {
        return ['General', ...groups.filter((g: string) => g !== 'General')];
      }
      
      return groups;
    } catch (error) {
      console.error('Error fetching groups:', error);
      // Return at least 'General' as a fallback
      return ['General'];
    }
  },

  renameGroup: async (oldName: string, newName: string): Promise<boolean> => {
    try {
      console.log(`Making API request to rename group from "${oldName}" to "${newName}"`);
      const response = await api.put('/conversations/groups/rename', { 
        oldName, 
        newName 
      });
      console.log('Rename group API response:', response.data);
      return response.data.success;
    } catch (error: unknown) {
      console.error(`Error renaming group from "${oldName}" to "${newName}":`, error);
      if (error instanceof Error && 'response' in error) {
        const axiosError = error as AxiosError;
        if (axiosError.response) {
          console.error('Error response data:', axiosError.response.data);
          console.error('Error status:', axiosError.response.status);
        }
      }
      throw error;
    }
  },
  
  deleteGroup: async (groupName: string): Promise<boolean> => {
    try {
      const response = await api.delete(`/conversations/groups/${encodeURIComponent(groupName)}`);
      return response.data.success;
    } catch (error: unknown) {
      console.error(`Error deleting group "${groupName}":`, error);
      if (error instanceof Error && 'response' in error) {
        const axiosError = error as AxiosError;
        if (axiosError.response) {
          console.error('Error response data:', axiosError.response.data);
          console.error('Error status:', axiosError.response.status);
        }
      }
      throw error;
    }
  },

  // Messages
  getMessages: async (conversationId: string, limit: number = 50, before?: string): Promise<Message[]> => {
    try {
      let url = `/messages/${conversationId}?limit=${limit}`;
      if (before) url += `&before=${before}`;
      
      const response = await api.get(url);
      return response.data.data;
    } catch (error) {
      console.error(`Error fetching messages for conversation ${conversationId}:`, error);
      throw error;
    }
  },

  sendMessage: async (content: string, conversationId: string): Promise<{ userMessage: Message, aiMessage: Message }> => {
    try {
      const response = await api.post('/messages', { content, conversationId });
      return response.data.data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  },

  deleteMessage: async (id: string): Promise<void> => {
    try {
      await api.delete(`/messages/${id}`);
    } catch (error) {
      console.error(`Error deleting message ${id}:`, error);
      throw error;
    }
  },

  // Legacy method for compatibility with existing code
  sendChatMessage: async (message: string, chatHistory: ChatMessage[] = []): Promise<any> => {
    try {
      const response = await api.post('/chat/message', { message, chatHistory });
      return response.data;
    } catch (error) {
      console.error('Error sending message (legacy):', error);
      const axiosError = error as AxiosError;
      throw {
        message: axiosError.message,
        status: axiosError.response?.status,
        details: axiosError.response?.data
      };
    }
  }
};

export default chatService; 