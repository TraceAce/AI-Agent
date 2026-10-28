import React, { useState, useEffect } from 'react';
import { Box, useMediaQuery, useTheme, Drawer, IconButton } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ConversationSidebar from './ConversationSidebar';
import ChatHistoryView from './ChatHistoryView';
import chatService from '../services/chatService';
import { Conversation } from '../types';

const ChatHistory: React.FC = () => {
  const [selectedConversationId, setSelectedConversationId] = useState<string>('');
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Fetch conversations
  const fetchConversations = async () => {
    try {
      const data = await chatService.getConversations();
      setConversations(data.conversations || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  // Load conversations on mount
  useEffect(() => {
    fetchConversations();
  }, []);
  
  // Handle conversation update
  const handleConversationUpdate = (updatedConversation: Conversation) => {
    setConversations(prev => 
      prev.map(conv => 
        conv._id === updatedConversation._id ? updatedConversation : conv
      )
    );
    
    // Make sure the updated conversation is selected
    setSelectedConversationId(updatedConversation._id);
  };
  
  // Handle conversation delete
  const handleConversationDelete = (conversationId: string) => {
    // Remove the conversation from the state
    setConversations(prev => 
      prev.filter(conv => conv._id !== conversationId)
    );
    
    // Clear the selected conversation ID
    setSelectedConversationId('');
  };
  
  // Handle selecting a conversation
  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);
    
    // Close drawer on mobile after selecting a conversation
    if (isMobile) {
      setDrawerOpen(false);
    }
  };
  
  // Create a new conversation
  const handleNewConversation = async () => {
    try {
      const newConversation = await chatService.createConversation(
        `New Conversation ${new Date().toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })}`,
        'General'
      );
      
      // Add the new conversation to the list
      setConversations(prev => [newConversation, ...prev]);
      
      // Select the new conversation
      setSelectedConversationId(newConversation._id);
      
      // Close drawer on mobile
      if (isMobile) {
        setDrawerOpen(false);
      }
    } catch (error) {
      console.error('Error creating new conversation:', error);
    }
  };
  
  // Toggle mobile drawer
  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };
  
  return (
    <Box
      sx={{
        display: 'flex',
        height: '100%',
        width: '100%',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      {/* Mobile menu button */}
      {isMobile && (
        <IconButton
          color="inherit"
          aria-label="open drawer"
          onClick={toggleDrawer}
          sx={{
            position: 'absolute',
            left: 16,
            top: 16,
            zIndex: 1200
          }}
        >
          <MenuIcon />
        </IconButton>
      )}
      
      {/* Sidebar - responsive with drawer on mobile */}
      {isMobile ? (
        <Drawer
          variant="temporary"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile
          }}
          sx={{
            '& .MuiDrawer-paper': { 
              width: { xs: '85%', sm: 320 },
              boxSizing: 'border-box'
            },
          }}
        >
          <ConversationSidebar
            onSelectConversation={handleSelectConversation}
            selectedConversationId={selectedConversationId}
            onNewConversation={handleNewConversation}
            conversations={conversations}
          />
        </Drawer>
      ) : (
        <Box
          sx={{
            width: 320,
            flexShrink: 0,
            height: '100%'
          }}
        >
          <ConversationSidebar
            onSelectConversation={handleSelectConversation}
            selectedConversationId={selectedConversationId}
            onNewConversation={handleNewConversation}
            conversations={conversations}
          />
        </Box>
      )}
      
      {/* Chat content area */}
      <Box
        sx={{
          flexGrow: 1,
          height: '100%',
          overflow: 'hidden'
        }}
      >
        <ChatHistoryView
          conversationId={selectedConversationId}
          onBack={isMobile ? toggleDrawer : undefined}
          isMobile={isMobile}
          onConversationUpdate={handleConversationUpdate}
          onConversationDelete={handleConversationDelete}
        />
      </Box>
    </Box>
  );
};

export default ChatHistory; 