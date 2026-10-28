import React, { useState, useEffect, ChangeEvent } from 'react';
import { 
  Box, 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemText, 
  Typography, 
  IconButton, 
  TextField, 
  InputAdornment,
  Divider,
  Collapse,
  Button,
  Badge,
  CircularProgress,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  ChatBubbleOutline as ChatIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import chatService from '../services/chatService';
import { Conversation } from '../types';

interface ConversationSidebarProps {
  onSelectConversation: (id: string) => void;
  selectedConversationId: string;
  onNewConversation: () => void;
  conversations: Conversation[];
}

const ConversationSidebar: React.FC<ConversationSidebarProps> = ({
  onSelectConversation,
  selectedConversationId,
  onNewConversation,
  conversations
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [groups, setGroups] = useState<string[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  
  // Group context menu states
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  
  // Edit group dialog states
  const [groupDialogOpen, setGroupDialogOpen] = useState<boolean>(false);
  const [newGroupName, setNewGroupName] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isAdding, setIsAdding] = useState<boolean>(false);
  
  // Fetch groups
  const fetchGroups = async () => {
    try {
      setLoading(true);
      const groupsData = await chatService.getGroups();
      
      // Make sure we have at least 'General' as a group
      let allGroups = ['General'];
      if (groupsData && groupsData.length > 0) {
        // Add any groups not already included
        groupsData.forEach((group: string) => {
          if (!allGroups.includes(group)) {
            allGroups.push(group);
          }
        });
      }
      
      setGroups(allGroups);
      
      // Initialize expanded state for all groups
      const initialExpanded: Record<string, boolean> = {};
      allGroups.forEach(group => {
        // Inherit previous state if it exists, otherwise set to true (expanded)
        initialExpanded[group] = expandedGroups[group] !== undefined 
          ? expandedGroups[group] 
          : true;
      });
      setExpandedGroups(initialExpanded);
      
    } catch (error) {
      console.error('Error fetching groups:', error);
      setError('Failed to load conversation groups');
    } finally {
      setLoading(false);
    }
  };
  
  // Load groups on mount
  useEffect(() => {
    fetchGroups();
  }, []);
  
  // Update groups when conversations change
  useEffect(() => {
    // Only run this effect when the component mounts or when conversations array changes
    const uniqueGroups: string[] = [];
    conversations.forEach((c: Conversation) => {
      if (c.group && !uniqueGroups.includes(c.group)) {
        uniqueGroups.push(c.group);
      }
    });
    
    // If there are conversation groups that aren't in our groups state, refresh groups
    const needsRefresh = uniqueGroups.some(group => !groups.includes(group));
    
    if (needsRefresh) {
      fetchGroups();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations]); // Using eslint-disable to avoid adding groups as dependency
  
  // Group conversations by their group property
  const groupedConversations: Record<string, Conversation[]> = {};
  
  // Filter conversations by search query first
  const filteredBySearch = conversations.filter((conversation: Conversation) => {
    return conversation.title.toLowerCase().includes(searchQuery.toLowerCase());
  });
  
  // Then organize by group
  filteredBySearch.forEach((conversation: Conversation) => {
    const group = conversation.group || 'General';
    if (!groupedConversations[group]) {
      groupedConversations[group] = [];
    }
    groupedConversations[group].push(conversation);
  });

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };
  
  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [group]: !prev[group]
    }));
  };
  
  // Open group context menu
  const handleGroupMenuOpen = (e: React.MouseEvent<HTMLElement>, group: string) => {
    e.stopPropagation(); // Prevent toggling the group expansion
    setMenuAnchorEl(e.currentTarget);
    setSelectedGroup(group);
  };
  
  // Close group context menu
  const handleGroupMenuClose = () => {
    setMenuAnchorEl(null);
  };
  
  // Open dialog to add group
  const handleAddGroup = () => {
    setNewGroupName('');
    setIsAdding(true);
    setIsEditing(false);
    setIsDeleting(false);
    setGroupDialogOpen(true);
  };
  
  // Open dialog to edit group
  const handleEditGroup = () => {
    // Use the selectedGroup directly from the menu context
    setNewGroupName(selectedGroup);
    setIsEditing(true);
    setIsAdding(false);
    setIsDeleting(false);
    setGroupDialogOpen(true);
    handleGroupMenuClose();
  };
  
  // Open dialog to confirm deletion
  const handleDeleteGroup = () => {
    setIsDeleting(true);
    setIsAdding(false);
    setIsEditing(false);
    setGroupDialogOpen(true);
    handleGroupMenuClose();
  };
  
  // Save new or edited group
  const handleSaveGroup = async () => {
    if (!newGroupName.trim()) {
      console.log('Cannot save: empty group name');
      return;
    }
    
    try {
      setLoading(true);
      
      if (isAdding) {
        // For adding, we just need to create a conversation with the new group
        const newConversation = await chatService.createConversation("New Conversation", newGroupName);
        console.log(`Created new group: "${newGroupName}" with conversation:`, newConversation);
        
        // Update UI immediately - add new group to groups list
        if (!groups.includes(newGroupName)) {
          setGroups(prevGroups => [...prevGroups, newGroupName]);
          
          // Set expanded state for new group
          setExpandedGroups(prev => ({
            ...prev,
            [newGroupName]: true
          }));
          
          // Add the new conversation to the conversations list (passed as prop)
          // This is crucial to make it appear in the sidebar immediately
          if (newConversation && !conversations.some(c => c._id === newConversation._id)) {
            // This is a bit of a hack since we can't directly modify the prop
            // But it ensures the UI updates correctly
            conversations.unshift(newConversation);
          }
        }
      } else if (isEditing && selectedGroup) {
        // For editing, call API to rename the group
        console.log(`Attempting to rename group from "${selectedGroup}" to "${newGroupName}"`);
        await chatService.renameGroup(selectedGroup, newGroupName);
        
        // Update group name immediately in the UI
        // 1. Update the groups list
        setGroups(prevGroups => {
          const updatedGroups = [...prevGroups];
          const index = updatedGroups.indexOf(selectedGroup);
          if (index !== -1) {
            updatedGroups[index] = newGroupName;
          }
          return updatedGroups;
        });
        
        // 2. Transfer expanded state from old group to new group
        setExpandedGroups(prev => ({
          ...prev,
          [newGroupName]: prev[selectedGroup] || true,
        }));
        
        // 3. Update the UI immediately instead of waiting for a refresh
        conversations.forEach(conv => {
          if (conv.group === selectedGroup) {
            conv.group = newGroupName;
          }
        });
      }
      
      // Close dialog before refreshing to avoid UI freeze
      setGroupDialogOpen(false);
      setIsAdding(false);
      setIsEditing(false);
      setSelectedGroup('');
      
      // Then refresh groups to ensure consistency with server
      await fetchGroups();
      
    } catch (error) {
      console.error('Error updating group:', error);
      setError(`Failed to update group: ${error}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Confirm and delete group
  const handleConfirmDelete = async () => {
    if (!selectedGroup) return;
    
    try {
      setLoading(true);
      
      // Call API to delete the group and all its conversations
      await chatService.deleteGroup(selectedGroup);
      
      // Update UI immediately - remove deleted group from groups list
      setGroups(prevGroups => prevGroups.filter(group => group !== selectedGroup));
      
      // Remove group from expandedGroups state
      setExpandedGroups(prev => {
        const updated = { ...prev };
        delete updated[selectedGroup];
        return updated;
      });
      
      // Close dialog before refreshing to avoid UI freeze
      setGroupDialogOpen(false);
      setIsDeleting(false);
      setSelectedGroup('');
      
      // Then refresh groups to ensure consistency with server
      await fetchGroups();
      
    } catch (error) {
      console.error('Error deleting group:', error);
      setError(`Failed to delete group: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
        borderRight: 1,
        borderColor: 'divider'
      }}
    >
      {/* Header with new chat button */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            onClick={onNewConversation}
            startIcon={<AddIcon />}
            size="small"
            sx={{ flexGrow: 1 }}
          >
            New Chat
          </Button>

          <Button
            variant="contained"
            onClick={handleAddGroup}
            startIcon={<AddIcon />}
            size="small"
            sx={{ flexGrow: 1 }}
          >
            New Group
          </Button>
        </Box>
      </Box>
      
      {/* Search box */}
      <Box sx={{ p: 2 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>
      
      {/* Error message */}
      {error && (
        <Box sx={{ p: 2, color: 'error.main' }}>
          <Typography variant="body2">{error}</Typography>
          <Button 
            variant="text" 
            size="small"
            onClick={() => setError(null)}
            sx={{ mt: 1 }}
          >
            Dismiss
          </Button>
        </Box>
      )}
      
      {/* Conversations list grouped by category */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : filteredBySearch.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">
              {searchQuery 
                ? 'No conversations found' 
                : 'No conversations yet'}
            </Typography>
          </Box>
        ) : (
          <List sx={{ width: '100%', p: 0 }}>
            {groups.map(group => {
              // Only show groups that have conversations after filtering
              if (!groupedConversations[group] || groupedConversations[group].length === 0) {
                return null;
              }
              
              return (
                <React.Fragment key={group}>
                  {/* Group header with toggle */}
                  <ListItemButton
                    onClick={() => toggleGroup(group)}
                    sx={{ 
                      py: 1, 
                      bgcolor: 'action.hover'
                    }}
                  >
                    <ListItemText 
                      primary={group} 
                      primaryTypographyProps={{
                        fontWeight: 'medium',
                        variant: 'body2'
                      }}
                    />
                    <Badge 
                      badgeContent={groupedConversations[group].length} 
                      color="primary"
                      sx={{ mr: 1 }}
                    />
                    
                    {/* Group actions */}
                    <IconButton
                      size="small"
                      onClick={(e) => handleGroupMenuOpen(e, group)}
                      sx={{ mr: 1 }}
                    >
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                    
                    {expandedGroups[group] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </ListItemButton>
                  
                  {/* Group conversations */}
                  <Collapse in={expandedGroups[group]} timeout="auto">
                    <List disablePadding>
                      {groupedConversations[group].map((conversation: Conversation) => (
                        <ListItem
                          key={conversation._id}
                          disablePadding
                          sx={{
                            pl: 2,
                            borderLeft: '4px solid',
                            borderLeftColor: selectedConversationId === conversation._id 
                              ? 'primary.main' 
                              : 'transparent'
                          }}
                        >
                          <ListItemButton
                            selected={selectedConversationId === conversation._id}
                            onClick={() => onSelectConversation(conversation._id)}
                            sx={{ 
                              borderRadius: 1,
                              py: 1
                            }}
                          >
                            <ChatIcon fontSize="small" sx={{ mr: 1.5, opacity: 0.7 }} />
                            <ListItemText
                              primary={conversation.title}
                              secondary={`${conversation.messageCount || 0} messages`}
                              primaryTypographyProps={{ 
                                noWrap: true,
                                fontWeight: selectedConversationId === conversation._id ? 'medium' : 'normal'
                              }}
                              secondaryTypographyProps={{ 
                                noWrap: true,
                                fontSize: '0.75rem'
                              }}
                            />
                          </ListItemButton>
                        </ListItem>
                      ))}
                    </List>
                  </Collapse>
                  <Divider />
                </React.Fragment>
              );
            })}
          </List>
        )}
      </Box>
      
      {/* Group context menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleGroupMenuClose}
      >
        <MenuItem 
          onClick={handleEditGroup}
          disabled={selectedGroup === 'General'}
        >
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Rename Group
        </MenuItem>
        <MenuItem 
          onClick={handleDeleteGroup}
          disabled={selectedGroup === 'General'}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete Group
        </MenuItem>
      </Menu>
      
      {/* Group dialog (shared for add/edit) */}
      <Dialog 
        open={groupDialogOpen && (isEditing || isAdding)} 
        onClose={() => {
          setGroupDialogOpen(false);
          setIsEditing(false);
          setIsAdding(false);
        }}
      >
        <DialogTitle>{isAdding ? "Add Group" : "Rename Group"}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Group Name"
            fullWidth
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            sx={{ mt: 1, minWidth: 300 }}
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setGroupDialogOpen(false);
              setIsEditing(false);
              setIsAdding(false);
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSaveGroup} 
            variant="contained"
            color="primary"
            disabled={!newGroupName.trim() || loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Group delete confirmation dialog */}
      <Dialog 
        open={groupDialogOpen && isDeleting} 
        onClose={() => {
          setGroupDialogOpen(false);
          setIsDeleting(false);
        }}
      >
        <DialogTitle>Delete Group</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the <b>{selectedGroup}</b> group? 
            <br /><br />
            <span style={{ color: 'red' }}>
              This will permanently delete all conversations in this group. 
              This action cannot be undone.
            </span>
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setGroupDialogOpen(false);
              setIsDeleting(false);
            }}
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
    </Box>
  );
};

export default ConversationSidebar; 