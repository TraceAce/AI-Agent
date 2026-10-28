import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  TextField, 
  Button, 
  CircularProgress,
  IconButton,
  Tooltip,
  Divider,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Snackbar,
  Alert
} from '@mui/material';
import {
  Send as SendIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  ArrowBack as BackIcon,
  ContentCopy as CopyIcon
} from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import chatService from '../services/chatService';
import { Message, Conversation } from '../types';

interface ChatHistoryViewProps {
  conversationId: string;
  onBack?: () => void;
  isMobile?: boolean;
  onConversationUpdate?: (conversation: Conversation) => void;
  onConversationDelete?: (conversationId: string) => void;
}

const ChatHistoryView: React.FC<ChatHistoryViewProps> = ({ 
  conversationId, 
  onBack,
  isMobile = false,
  onConversationUpdate,
  onConversationDelete
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [sending, setSending] = useState<boolean>(false);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState<boolean>(false);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editGroup, setEditGroup] = useState<string>('');
  const [groups, setGroups] = useState<string[]>([]);
  
  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  
  // Copy notification state
  const [copyNotification, setCopyNotification] = useState<boolean>(false);
  const [copiedText, setCopiedText] = useState<string>('');

  // Fetch conversation and messages
  const fetchConversation = async () => {
    if (!conversationId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const data = await chatService.getConversationById(conversationId);
      setConversation(data.conversation);
      setMessages(data.messages);
      
    } catch (error) {
      console.error('Error fetching conversation:', error);
      setError('Failed to load conversation');
    } finally {
      setLoading(false);
    }
  };

  // Fetch groups for dialog
  const fetchGroups = async () => {
    try {
      const groups = await chatService.getGroups();
      setGroups(groups);
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };

  // Load conversation when ID changes
  useEffect(() => {
    if (conversationId) {
      fetchConversation();
      fetchGroups();
    } else {
      setConversation(null);
      setMessages([]);
    }
  }, [conversationId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Send a message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputValue.trim() || !conversationId) return;
    
    try {
      setSending(true);
      setError(null);
      
      const result = await chatService.sendMessage(inputValue.trim(), conversationId);
      
      // Add messages to the list
      setMessages(prev => [...prev, result.userMessage, result.aiMessage]);
      setInputValue('');
      
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  // Handle key presses for sending messages with Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Send message on Enter, but allow Shift+Enter for new lines
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e as unknown as React.FormEvent);
    }
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Handle opening edit dialog
  const handleOpenEditDialog = () => {
    if (conversation) {
      setEditTitle(conversation.title);
      setEditGroup(conversation.group);
      setEditDialogOpen(true);
    }
  };
  
  // Handle saving conversation edits
  const handleSaveEdit = async () => {
    if (!conversation || !editTitle.trim()) return;
    
    try {
      setLoading(true);
      const updatedConversation = await chatService.updateConversation(conversation._id, editTitle, editGroup);
      
      // Update the local conversation state
      setConversation(prev => {
        if (!prev) return null;
        return {
          ...prev,
          title: editTitle,
          group: editGroup
        };
      });

      // Notify parent component about the update
      if (onConversationUpdate && updatedConversation) {
        onConversationUpdate(updatedConversation);
      }
      
      setEditDialogOpen(false);
    } catch (error) {
      console.error('Error updating conversation:', error);
      setError('Failed to update conversation');
    } finally {
      setLoading(false);
    }
  };

  // Handle deleting the conversation
  const handleDeleteConversation = () => {
    if (!conversation) return;
    setDeleteDialogOpen(true);
  };
  
  // Handle confirming conversation delete
  const handleConfirmDelete = async () => {
    if (!conversation) return;
    
    try {
      setLoading(true);
      await chatService.deleteConversation(conversation._id);
      
      // Close the dialog
      setDeleteDialogOpen(false);
      
      // Notify parent component about the deletion
      if (onConversationDelete) {
        onConversationDelete(conversation._id);
      }
      
      // Redirect to empty state
      if (onBack) {
        onBack();
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      setError('Failed to delete conversation');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle copying message content
  const handleCopyMessage = (content: string) => {
    // Remove Markdown syntax for cleaner clipboard content
    const plainText = content
      .replace(/\*\*(.*?)\*\*/g, '$1') // Bold
      .replace(/\*(.*?)\*/g, '$1')     // Italic
      .replace(/\_\_(.*?)\_\_/g, '$1') // Bold with underscores
      .replace(/\_(.*?)\_/g, '$1')     // Italic with underscores
      .replace(/\`\`\`(.*?)\`\`\`/gs, '$1') // Code blocks
      .replace(/\`(.*?)\`/g, '$1')    // Inline code
      .replace(/\[(.*?)\]\((.*?)\)/g, '$1 ($2)') // Links
      .replace(/\n\s*[\-\*\+]\s+/g, '\n• ') // Unordered lists
      .replace(/\n\s*\d+\.\s+/g, '\n• ') // Ordered lists
      .replace(/\n\s*>\s+/g, '\n'); // Block quotes
      
    navigator.clipboard.writeText(plainText)
      .then(() => {
        setCopiedText(plainText.length > 20 ? plainText.substring(0, 20) + '...' : plainText);
        setCopyNotification(true);
        setTimeout(() => setCopyNotification(false), 2000);
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
      });
  };

  // Function to normalize newlines
  const normalizeNewlines = (content: string) => {
    return content.replace(/\n\s*\n\s*\n/g, '\n\n').replace(/\n\n+/g, '\n\n').trim();
  };

  // Empty state when no conversation is selected
  if (!conversationId) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100%',
          p: 3
        }}
      >
        <Typography variant="h6" color="text.secondary" gutterBottom>
          Select a conversation or start a new chat
        </Typography>
        <Typography variant="body2" color="text.secondary" align="center">
          Your chat history will be organized into conversations that you can easily find later
        </Typography>
      </Box>
    );
  }

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%',
        width: '100%'
      }}
    >
      {/* Conversation header */}
      <Paper 
        elevation={2} 
        sx={{ 
          mb: 2,
          p: 2, 
          display: 'flex', 
          alignItems: 'center',
          justifyContent: 'space-between',
          borderRadius: '4px',
          position: 'relative',
          background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
          color: 'white',
          boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
          '&:before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, #4C1D95 0%, #6D28D9 50%, #8B5CF6 100%)',
            borderTopLeftRadius: '4px',
            borderTopRightRadius: '4px'
          }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {isMobile && (
            <IconButton 
              edge="start" 
              onClick={onBack} 
              sx={{ mr: 1 }}
            >
              <BackIcon />
            </IconButton>
          )}
          
          <Box>
            <Typography variant="h6" component="h1">
              {conversation?.title || 'Conversation'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {conversation?.messageCount || 0} messages • {conversation?.group || 'General'}
            </Typography>
          </Box>
        </Box>
        
        <Box>
          <Tooltip title="Edit conversation title">
            <IconButton 
              size="small" 
              sx={{ ml: 1 }}
              onClick={handleOpenEditDialog}
              disabled={!conversation}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Delete conversation">
            <IconButton 
              size="small" 
              color="error" 
              sx={{ ml: 1 }}
              onClick={handleDeleteConversation}
              disabled={!conversation}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>
      
      {/* Messages list */}
      <Box 
        sx={{ 
          flexGrow: 1, 
          overflow: 'auto',
          p: 2,
          background: 'linear-gradient(180deg, #0F172A 0%, #1E293B 100%)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {loading ? (
          <Box 
            sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              height: '100%'
            }}
          >
            <CircularProgress size={40} />
          </Box>
        ) : error ? (
          <Box 
            sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              height: '100%'
            }}
          >
            <Typography color="error">{error}</Typography>
          </Box>
        ) : messages.length === 0 ? (
          <Box 
            sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              height: '100%'
            }}
          >
            <Typography variant="body2" color="text.secondary">
              No messages in this conversation yet. Start by sending a message below.
            </Typography>
          </Box>
        ) : (
          messages.map((message, index) => (
            <Box
              key={message._id || index}
              sx={{
                display: 'flex',
                flexDirection: message.role === 'user' ? 'row-reverse' : 'row',
                mb: 2
              }}
            >
              <Box sx={{ maxWidth: '80%' }}>
                <Paper 
                  elevation={1}
                  sx={{ 
                    p: 1.2,
                    borderRadius: "16px",
                    transform: 'translateY(0)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 12px rgba(58, 84, 2, 0.4)'
                    },
                    ...(message.role === 'user' 
                      ? { 
                          background: 'linear-gradient(135deg,rgb(43, 96, 47) 0%,rgb(83, 133, 93) 100%)', 
                          color: 'white',
                          boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)'
                        }
                      : { 
                        background: 'linear-gradient(135deg, #2D3748 0%, #1A202C 100%)',
                          color: 'white',
                          boxShadow: '0 8px 16px rgba(0,0,0,0.2)'
                        }),
                    ...(message.error && { 
                      background: 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)', 
                      color: 'white',
                      boxShadow: '0 4px 12px rgba(220, 38, 38, 0.4)'
                    })
                  }}
                >
                  <Box sx={{ fontSize: 15, lineHeight: 1.3, whiteSpace: 'pre-wrap', overflowWrap: 'break-word' }}>
                    <ReactMarkdown components={{
                      p: ({node, ...props}) => <p style={{ margin: '0.1em 0' }} {...props} />,
                      li: ({node, ...props}) => <li style={{ 
                        margin: 0, 
                        padding: 0,
                        lineHeight: '1.5',
                        marginBottom: '-0.5em' 
                      }} {...props} />,
                      ul: ({node, ...props}) => <ul style={{ 
                        margin: 0, 
                        padding: 0,
                        paddingLeft: '1em',
                        lineHeight: '1.5',
                        listStyleType: 'none'
                      }} {...props} />,
                      ol: ({node, ...props}) => <ol style={{ 
                        margin: 0, 
                        padding: 0,
                        paddingLeft: '1em',
                        lineHeight: '1.5',
                        listStyleType: 'none'
                      }} {...props} />,
                      h1: ({node, ...props}) => <h1 style={{ margin: '0', fontSize: '1.4em' }} {...props} />,
                      h2: ({node, ...props}) => <h2 style={{ margin: '0', fontSize: '1.3em' }} {...props} />,
                      h3: ({node, ...props}) => <h3 style={{ margin: '0', fontSize: '1.2em' }} {...props} />,
                      blockquote: ({node, ...props}) => <blockquote style={{ margin: '0.2em 0', paddingLeft: '0.6em', borderLeft: '3px solid #ccc' }} {...props} />,
                      br: ({node, ...props}) => <br style={{ display: 'none' }} {...props} />
                    }}>
                      {normalizeNewlines(message.content)}
                    </ReactMarkdown>
                  </Box>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                      mt: 0.5, 
                      opacity: 0.8,
                      color: 'rgba(255, 255, 255, 0.8)',
                      gap: 1
                    }}
                  >
                    {message.role !== 'user' && (
                      <Tooltip title="Copy response">
                        <IconButton 
                          size="small" 
                          onClick={() => handleCopyMessage(message.content)}
                          sx={{ 
                            p: 0.3,
                            opacity: 0.6,
                            '&:hover': { opacity: 1 } 
                          }}
                        >
                          <CopyIcon fontSize="inherit" />
                        </IconButton>
                      </Tooltip>
                    )}
                    
                    {formatTimestamp(message.createdAt)}
                    
                    {message.role === 'user' && (
                      <Tooltip title="Copy message">
                        <IconButton 
                          size="small" 
                          onClick={() => handleCopyMessage(message.content)}
                          sx={{ 
                            p: 0.3,
                            opacity: 0.6,
                            '&:hover': { opacity: 1 } 
                          }}
                        >
                          <CopyIcon fontSize="inherit" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Typography>
                </Paper>
              </Box>
            </Box>
          ))
        )}
        <div ref={messagesEndRef} />
      </Box>
      
      {/* Message input */}
      <Paper 
        component="form" 
        onSubmit={handleSendMessage}
        elevation={2}
        sx={{ 
          p: 2, 
          display: 'flex', 
          alignItems: 'center',
          background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
          borderTop: '1px solid #334155'
        }}
      >
        <TextField
          fullWidth
          placeholder="Type your message..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          multiline
          maxRows={4}
          disabled={sending}
          sx={{ 
            mr: 2,
            '& .MuiOutlinedInput-root': {
              color: 'white',
              '& fieldset': {
                borderColor: 'rgba(255, 255, 255, 0.3)',
              },
              '&:hover fieldset': {
                borderColor: 'rgba(255, 255, 255, 0.5)',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#8B5CF6',
              }
            },
            '& .MuiInputLabel-root': {
              color: 'rgba(255, 255, 255, 0.7)',
            },
            '& .MuiInputBase-input::placeholder': {
              color: 'rgba(255, 255, 255, 0.5)',
              opacity: 1,
            }
          }}
          InputProps={{
            endAdornment: sending && (
              <InputAdornment position="end">
                <CircularProgress size={20} sx={{ color: 'white' }} />
              </InputAdornment>
            ),
          }}
        />
        <Button
          variant="contained"
          color="primary"
          type="submit"
          disabled={!inputValue.trim() || sending}
          endIcon={<SendIcon />}
          sx={{
            background: 'linear-gradient(90deg, #4C1D95 0%, #6D28D9 100%)',
            '&:hover': {
              background: 'linear-gradient(90deg, #6D28D9 0%, #8B5CF6 100%)',
            }
          }}
        >
          Send
        </Button>
      </Paper>
      <Typography
        variant="caption"
        sx={{
          px: 2,
          py: 1,
          color: 'text.secondary',
          fontSize: '0.7rem',
          textAlign: 'center',
          bgcolor: '#0F172A',
          borderTop: '1px solid #1E293B'
        }}
      >
        Please exercise good judgement with responses - secbot is smart, not flawless.
      </Typography>
      
      {/* Edit dialog */}
      <Dialog 
        open={editDialogOpen} 
        onClose={() => setEditDialogOpen(false)}
        PaperProps={{
          sx: {
            background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
            color: 'white',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
          }
        }}
      >
        <DialogTitle>Edit Conversation</DialogTitle>
        <DialogContent sx={{ minWidth: '400px', pt: 2 }}>
          <TextField
            autoFocus
            margin="dense"
            label="Title"
            fullWidth
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth>
            <InputLabel>Group</InputLabel>
            <Select
              value={editGroup}
              label="Group"
              onChange={(e: SelectChangeEvent) => setEditGroup(e.target.value)}
            >
              {groups.map(group => (
                <MenuItem key={group} value={group}>{group}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleSaveEdit} 
            variant="contained"
            disabled={!editTitle.trim() || loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete confirmation dialog */}
      <Dialog 
        open={deleteDialogOpen} 
        onClose={() => setDeleteDialogOpen(false)}
        PaperProps={{
          sx: {
            background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
            color: 'white',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
          }
        }}
      >
        <DialogTitle>Delete Conversation</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this conversation?
            <br /><br />
            <span style={{ color: 'red' }}>
              This action cannot be undone.
            </span>
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDeleteDialogOpen(false)}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmDelete} 
            variant="contained"
            color="error"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Copy notification */}
      <Snackbar
        open={copyNotification}
        autoHideDuration={2000}
        onClose={() => setCopyNotification(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          severity="success" 
          variant="filled" 
          sx={{ 
            width: '100%',
            background: 'linear-gradient(90deg, #065F46 0%, #047857 100%)'
          }}
        >
          Copied: {copiedText}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ChatHistoryView; 