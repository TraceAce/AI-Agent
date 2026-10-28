import React, { useState, useRef, useEffect } from 'react';
import { 
  Box, 
  TextField, 
  Button, 
  Paper, 
  Typography, 
  Avatar, 
  CircularProgress,
  IconButton,
  Card,
  Chip,
  Divider,
  Tooltip
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import DeleteIcon from '@mui/icons-material/Delete';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import ReactMarkdown from 'react-markdown';
import chatbotService from '../services/api';
import { Message, ChatMessage, ChatResponse, LegacyMessage } from '../types';

// Combined message type for backward compatibility during transition
type CombinedMessage = Message & Partial<LegacyMessage>;

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<CombinedMessage[]>([]);
  const [input, setInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (): void => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatChatHistory = (msgs: CombinedMessage[]): ChatMessage[] => {
    return msgs.map(msg => ({
      role: (msg.role as 'user' | 'assistant' | 'system') || (msg.isUser ? 'user' : 'assistant'),
      content: msg.content || msg.text || ''
    }));
  };

  const handleSendMessage = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: CombinedMessage = {
      _id: String(Date.now()),
      conversation: 'temp',
      content: input,
      role: 'user',
      createdAt: new Date().toISOString()
    };

    setMessages((prev: CombinedMessage[]) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const chatHistory = formatChatHistory(messages);
      const response = await chatbotService.sendMessage(input, chatHistory);
      
      
      // Extract text from the various possible response formats
      let responseText = '';
      
      // Handle nested response structures
      if (typeof response === 'string') {
        responseText = response;
      } else if (response?.text?.text) {
        // Handle double-nested text object
        responseText = response.text.text;
      } else if (typeof response?.text === 'string') {
        // Direct text string
        responseText = response.text;
      } else if (response?.data?.text) {
        // Text inside data
        responseText = response.data.text;
      } else if (typeof response?.data === 'string') {
        // Data as string
        responseText = response.data;
      } else if (response?.message) {
        // Try message field
        responseText = typeof response.message === 'string' 
          ? response.message 
          : JSON.stringify(response.message);
      } else {
        // Last resort - stringify the whole response but make it more readable
        try {
          responseText = JSON.stringify(response, null, 2);
        } catch {
          responseText = "Received a response I couldn't parse.";
        }
      }
      
      const botMessage: CombinedMessage = {
        _id: String(Date.now() + 1),
        conversation: 'temp',
        content: responseText || "I'm not sure how to respond to that.",
        role: 'assistant',
        createdAt: new Date().toISOString()
      };

      setMessages((prev: CombinedMessage[]) => [...prev, botMessage]);
    } catch (error) {
      console.error('Error getting response:', error);
      const errorMessage: CombinedMessage = {
        _id: String(Date.now() + 1),
        conversation: 'temp',
        content: "Sorry, I'm having trouble connecting right now. Please try again later.",
        role: 'assistant',
        error: true,
        createdAt: new Date().toISOString()
      };
      setMessages((prev: CombinedMessage[]) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = (): void => {
    setMessages([]);
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      width: '100%',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      overflow: 'hidden'
    }}>
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        mb: 2,
        px: 2,
        pt: 2
      }}>
        <Chip
          icon={<SmartToyOutlinedIcon />}
          label="AI Assistant"
          variant="outlined"
          color="primary"
        />
        
        {messages.length > 0 && (
          <Tooltip title="Clear conversation">
            <IconButton 
              color="error" 
              onClick={clearChat}
              disabled={loading}
              size="small"
            >
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>
      
      {messages.length > 0 && <Divider sx={{ mb: 2, mx: 2 }} />}
      
      <Paper 
        elevation={0} 
        sx={{ 
          p: 2, 
          flexGrow: 1, 
          mx: 2,
          mb: 2, 
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.default',
          borderRadius: 2
        }}
      >
        {messages.length === 0 ? (
          <Box 
            sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              height: '100%',
              color: 'text.secondary'
            }}
          >
            <SmartToyOutlinedIcon sx={{ fontSize: 60, mb: 2, opacity: 0.5 }} />
            <Typography variant="h6" gutterBottom>
              Start a conversation with Granite AI
            </Typography>
            <Typography variant="body2" sx={{ textAlign: 'center', maxWidth: '500px' }}>
              Ask any question to get started. Your conversation history will appear here.
            </Typography>
          </Box>
        ) : (
          messages.map((message: Message) => (
            <Box 
              key={message._id} 
              sx={{ 
                display: 'flex', 
                justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                mb: 3
              }}
              className="fade-in"
            >
              <Box 
                sx={{ 
                  display: 'flex', 
                  maxWidth: '75%', 
                  flexDirection: message.role === 'user' ? 'row-reverse' : 'row',
                  alignItems: 'flex-start'
                }}
              >
                <Avatar 
                  sx={{ 
                    bgcolor: message.role === 'user' ? 'primary.main' : 'secondary.main',
                    width: 36, 
                    height: 36,
                    mr: message.role === 'user' ? 0 : 1.5,
                    ml: message.role === 'user' ? 1.5 : 0
                  }}
                >
                  {message.role === 'user' ? <PersonOutlineIcon /> : <SmartToyOutlinedIcon />}
                </Avatar>
                
                <Card
                  elevation={0}
                  className={message.role === 'user' ? 'user-message message-bubble' : 'ai-message message-bubble'}
                  sx={{ 
                    bgcolor: message.role === 'user' ? 'primary.main' : 'background.paper',
                    color: message.role === 'user' ? 'white' : 'text.primary',
                    ...(message.error && { bgcolor: '#541212' })
                  }}
                >
                  <Box sx={{ fontSize: 15, lineHeight: 1.6 }}>
                    <ReactMarkdown>
                      {message.content}
                    </ReactMarkdown>
                  </Box>
                  
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      display: 'block',
                      mt: 1,
                      textAlign: 'right',
                      opacity: 0.7,
                      fontSize: '0.7rem'
                    }}
                  >
                    {new Date(message.createdAt).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </Typography>
                </Card>
              </Box>
            </Box>
          ))
        )}
        <div ref={messagesEndRef} />
      </Paper>
      
      <Box 
        component="form" 
        onSubmit={handleSendMessage} 
        sx={{ 
          p: 2, 
          pt: 0,
          display: 'flex',
          width: '100%'
        }}
      >
        <TextField
          fullWidth
          placeholder="Type your message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          variant="outlined"
          disabled={loading}
          autoFocus
          sx={{ mr: 2 }}
        />
        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={!input.trim() || loading}
          endIcon={loading ? <CircularProgress size={24} /> : <SendIcon />}
          sx={{ px: 3 }}
        >
          Send
        </Button>
      </Box>
      <Typography
        variant="caption"
        sx={{
          px: 2,
          pb: 1.5,
          color: 'text.secondary',
          fontSize: '0.7rem',
          textAlign: 'center'
        }}
      >
        Please exercise good judgement with responses - secbot is smart, not flawless.
      </Typography>
    </Box>
  );
};

export default ChatInterface; 