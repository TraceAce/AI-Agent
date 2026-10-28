// Message types
export interface Message {
  _id: string;
  conversation: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  createdAt: string;
  metadata?: any;
  error?: boolean;
}

// Legacy message type (for compatibility)
export interface LegacyMessage {
  id: number;
  text: string;
  isUser: boolean;
  timestamp: string;
  error?: boolean;
}

// Chat API types
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatResponse {
  text?: string | any;
  data?: string | any;
  message?: string | any;
  botResponse?: string;
}

// Conversation types
export interface Conversation {
  _id: string;
  title: string;
  user: string;
  group: string;
  createdAt: string;
  lastUpdated: string;
  messageCount: number;
  summary: string;
  metadata?: any;
}

export interface ConversationWithMessages {
  conversation: Conversation;
  messages: Message[];
}

// Theme types
export interface ThemeConfig {
  mode: 'light' | 'dark';
  primary: string;
  secondary: string;
  background: string;
  paper: string;
  fontFamily: string;
}

// API Error types
export interface ApiError {
  message: string;
  status?: number;
  details?: any;
}

export interface UserResponse {
  id: string;
  username: string;
  role: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: UserResponse | null;
  loading: boolean;
} 