import React, { useState, useEffect, ChangeEvent, ReactElement } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Alert,
  CircularProgress,
  Snackbar,
  SelectChangeEvent,
  AlertProps,
  Tooltip,
  Chip,
  Stack
} from '@mui/material';
import { 
  Delete as DeleteIcon, 
  Edit as EditIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  Lock as LockIcon,
  Search as SearchIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
  UnfoldMore as UnfoldMoreIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon
} from '@mui/icons-material';
import axios from 'axios';
import authService from '../services/auth';
import jwt_decode from 'jwt-decode';

// Define interface for User
interface User {
  _id: string;
  username: string;
  role: string;
  createdAt: string;
  lastLogin: string | null;
}

// Define sort options
type SortField = 'username' | 'role' | 'createdAt' | 'lastLogin';
type SortDirection = 'asc' | 'desc';

// Define notification type
interface Notification {
  message: string;
  type: 'success' | 'error';
}

// Define API base URL
const API_URL = process.env.NODE_ENV === 'production' 
  ? window.location.origin + '/api'
  : process.env.REACT_APP_API_URL || 'http://localhost:3009/api';

const AdminPanel: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [openAddDialog, setOpenAddDialog] = useState<boolean>(false);
  const [openEditDialog, setOpenEditDialog] = useState<boolean>(false);
  const [openResetDialog, setOpenResetDialog] = useState<boolean>(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState<boolean>(false);
  const [notification, setNotification] = useState<Notification | null>(null);
  
  // Search and sort states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('username');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  // Form states
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [role, setRole] = useState<string>('user');
  const [newPassword, setNewPassword] = useState<string>('');

  // Get current user info from token
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded = jwt_decode(token) as { userId: string };
        setCurrentUserId(decoded.userId);
      } catch (error) {
        console.error('Failed to decode token:', error);
      }
    }
  }, []);

  // Fetch users when component mounts
  useEffect(() => {
    fetchUsers();
  }, []);

  // Filtering and sorting function
  const filterAndSortUsers = () => {
    let result = [...users];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(user => 
        user.username.toLowerCase().includes(query) || 
        user.role.toLowerCase().includes(query)
      );
    }
    
    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;
      
      switch(sortField) {
        case 'username':
          comparison = a.username.localeCompare(b.username);
          break;
        case 'role':
          comparison = a.role.localeCompare(b.role);
          break;
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'lastLogin':
          // Handle null lastLogin values
          if (!a.lastLogin && !b.lastLogin) comparison = 0;
          else if (!a.lastLogin) comparison = 1; // null values go last when ascending
          else if (!b.lastLogin) comparison = -1;
          else comparison = new Date(a.lastLogin).getTime() - new Date(b.lastLogin).getTime();
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    
    setFilteredUsers(result);
  };
  
  // Apply filtering and sorting when dependencies change
  useEffect(() => {
    filterAndSortUsers();
  }, [users, searchQuery, sortField, sortDirection]);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = authService.getToken();
      if (!token) throw new Error('Not authenticated');
      
      const response = await axios.get(`${API_URL}/users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        setUsers(response.data.data);
      } else {
        setError(response.data.message || 'Failed to fetch users');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'An error occurred');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handler for text field changes
  const handleTextFieldChange = (setter: React.Dispatch<React.SetStateAction<string>>) => 
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setter(event.target.value);
    };

  // Handler for sorting
  const handleSort = (field: SortField) => {
    setSortField(field);
    if (sortField === field) {
      // Toggle direction if clicking the same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Default to ascending for a new field
      setSortDirection('asc');
    }
  };

  // Render the sort icon based on current sort state
  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <UnfoldMoreIcon fontSize="small" sx={{ ml: 0.5, opacity: 0.3 }} />;
    }
    return sortDirection === 'asc' 
      ? <KeyboardArrowUpIcon fontSize="small" sx={{ ml: 0.5 }} />
      : <KeyboardArrowDownIcon fontSize="small" sx={{ ml: 0.5 }} />;
  };

  const handleAddUser = async () => {
    try {
      const token = authService.getToken();
      if (!token) throw new Error('Not authenticated');
      
      const response = await axios.post(`${API_URL}/users`, 
        { username, password, role },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (response.data.success) {
        setNotification({ message: 'User added successfully', type: 'success' });
        fetchUsers();
        setOpenAddDialog(false);
        clearForm();
      } else {
        setError(response.data.message || 'Failed to add user');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'An error occurred');
      console.error('Error adding user:', err);
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    
    try {
      const token = authService.getToken();
      if (!token) throw new Error('Not authenticated');
      
      const response = await axios.put(`${API_URL}/users/${selectedUser._id}`, 
        { username, role },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (response.data.success) {
        setNotification({ message: 'User updated successfully', type: 'success' });
        fetchUsers();
        setOpenEditDialog(false);
        clearForm();
      } else {
        setError(response.data.message || 'Failed to update user');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'An error occurred');
      console.error('Error updating user:', err);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser) return;
    
    try {
      const token = authService.getToken();
      if (!token) throw new Error('Not authenticated');
      
      const response = await axios.post(`${API_URL}/password/reset/${selectedUser._id}`, 
        { newPassword },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (response.data.success) {
        setNotification({ message: 'Password reset successfully', type: 'success' });
        setOpenResetDialog(false);
        setNewPassword('');
      } else {
        setError(response.data.message || 'Failed to reset password');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'An error occurred');
      console.error('Error resetting password:', err);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    
    try {
      const token = authService.getToken();
      if (!token) throw new Error('Not authenticated');
      
      const response = await axios.delete(`${API_URL}/users/${selectedUser._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        setNotification({ message: 'User deleted successfully', type: 'success' });
        fetchUsers();
        setOpenDeleteDialog(false);
      } else {
        setError(response.data.message || 'Failed to delete user');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'An error occurred');
      console.error('Error deleting user:', err);
    }
  };

  const clearForm = () => {
    setUsername('');
    setPassword('');
    setRole('user');
    setNewPassword('');
    setSelectedUser(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const handleSelectChange = (e: SelectChangeEvent<string>) => {
    setRole(e.target.value);
  };

  // Helper function to prepare edit user dialog
  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setOpenEditDialog(true);
  };

  // Helper function to prepare delete user dialog
  const handleOpenDeleteDialog = (user: User) => {
    setSelectedUser(user);
    setOpenDeleteDialog(true);
  };

  return (
    <Box sx={{ 
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%',
      p: { xs: 1, sm: 2, md: 3 }, 
      pt: { xs: 0, sm: 1, md: 2 },
      overflow: 'hidden',
      position: 'relative'
    }}>
      <Paper sx={{ 
        mb: 2, 
        p: 2, 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        flexDirection: { xs: 'column', sm: 'row' },
        gap: { xs: 2, sm: 0 }
      }}>
        <Typography variant="h6" component="h1">
          User Management
        </Typography>
        <Box sx={{ 
          display: 'flex', 
          gap: 1,
          width: { xs: '100%', sm: 'auto' },
          flexDirection: { xs: 'column', sm: 'row' }
        }}>
          <TextField
            placeholder="Search users..."
            size="small"
            value={searchQuery}
            onChange={handleTextFieldChange(setSearchQuery)}
            InputProps={{
              startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
            }}
            sx={{ minWidth: '220px' }}
          />
          <Button 
            variant="outlined" 
            startIcon={<RefreshIcon />} 
            onClick={fetchUsers} 
            disabled={loading}
            sx={{ 
              flexShrink: 0,
              ml: { xs: 0, sm: 1 }
            }}
          >
            Refresh
          </Button>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />} 
            onClick={() => setOpenAddDialog(true)}
            sx={{ flexShrink: 0 }}
          >
            Add User
          </Button>
        </Box>
      </Paper>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Paper sx={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <TableContainer sx={{ flexGrow: 1, overflow: 'auto' }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 6, height: '100%' }}>
              <CircularProgress size={40} thickness={4} />
              <Typography variant="body1" sx={{ ml: 2, color: 'text.secondary' }}>
                Loading users...
              </Typography>
            </Box>
          ) : (
            <Table stickyHeader aria-label="users table">
              <TableHead>
                <TableRow>
                  <TableCell 
                    sx={{ 
                      fontWeight: 'bold', 
                      bgcolor: 'background.paper',
                      width: { xs: '25%', sm: '20%' },
                      cursor: 'pointer'
                    }}
                    onClick={() => handleSort('username')}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      Username
                      {renderSortIcon('username')}
                    </Box>
                  </TableCell>
                  <TableCell 
                    sx={{ 
                      fontWeight: 'bold', 
                      bgcolor: 'background.paper',
                      width: { xs: '20%', sm: '15%' },
                      cursor: 'pointer'
                    }}
                    onClick={() => handleSort('role')}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      Role
                      {renderSortIcon('role')}
                    </Box>
                  </TableCell>
                  <TableCell 
                    sx={{ 
                      fontWeight: 'bold', 
                      bgcolor: 'background.paper',
                      width: { xs: '30%', sm: '20%' },
                      display: { xs: 'none', sm: 'table-cell' },
                      cursor: 'pointer'
                    }}
                    onClick={() => handleSort('createdAt')}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      Created At
                      {renderSortIcon('createdAt')}
                    </Box>
                  </TableCell>
                  <TableCell 
                    sx={{ 
                      fontWeight: 'bold', 
                      bgcolor: 'background.paper',
                      width: { xs: '30%', sm: '25%' },
                      display: { xs: 'none', sm: 'table-cell' },
                      cursor: 'pointer'
                    }}
                    onClick={() => handleSort('lastLogin')}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      Last Login
                      {renderSortIcon('lastLogin')}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ 
                    fontWeight: 'bold', 
                    bgcolor: 'background.paper',
                    width: { xs: '25%', sm: '20%' }
                  }}>
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                      <CircularProgress size={30} />
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                      {searchQuery ? 'No users match your search' : 'No users found'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user._id}>
                      <TableCell>{user.username}</TableCell>
                      <TableCell>
                        <Chip 
                          label={user.role}
                          size="small"
                          color={user.role === 'admin' ? 'primary' : 'default'}
                        />
                      </TableCell>
                      <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                        {formatDate(user.createdAt)}
                      </TableCell>
                      <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                        {user.lastLogin ? formatDate(user.lastLogin) : 'Never'}
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedUser(user);
                              setUsername(user.username);
                              setRole(user.role);
                              setOpenEditDialog(true);
                            }}
                            aria-label="Edit user"
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedUser(user);
                              setOpenDeleteDialog(true);
                            }}
                            aria-label="Delete user"
                            disabled={user._id === currentUserId || user.username === 'admin'}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </TableContainer>
      </Paper>

      {/* Add User Dialog */}
      <Dialog open={openAddDialog} onClose={() => setOpenAddDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New User</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, my: 1 }}>
            <TextField 
              label="Username" 
              fullWidth 
              value={username} 
              onChange={handleTextFieldChange(setUsername)} 
              placeholder="Enter username"
              variant="outlined"
              autoFocus
            />
            <TextField 
              label="Password" 
              type="password" 
              fullWidth 
              value={password} 
              onChange={handleTextFieldChange(setPassword)} 
              placeholder="Enter password"
              variant="outlined"
            />
            <FormControl fullWidth variant="outlined">
              <InputLabel>Role</InputLabel>
              <Select
                value={role}
                label="Role"
                onChange={handleSelectChange}
              >
                <MenuItem value="user">User</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button 
            onClick={() => setOpenAddDialog(false)}
            variant="outlined"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleAddUser} 
            variant="contained" 
            color="primary"
            disabled={!username || !password}
          >
            Add User
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit User: {selectedUser?.username}</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, my: 1 }}>
            <TextField 
              label="Username" 
              fullWidth 
              value={username} 
              onChange={handleTextFieldChange(setUsername)} 
              variant="outlined"
              autoFocus
            />
            <FormControl fullWidth variant="outlined">
              <InputLabel>Role</InputLabel>
              <Select
                value={role}
                label="Role"
                onChange={handleSelectChange}
              >
                <MenuItem value="user">User</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button 
            onClick={() => setOpenEditDialog(false)}
            variant="outlined"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleUpdateUser} 
            variant="contained" 
            color="primary"
            disabled={!username}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={openResetDialog} onClose={() => setOpenResetDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Reset Password</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ my: 1 }}>
            <Typography variant="body1" gutterBottom>
              Reset password for: <strong>{selectedUser?.username}</strong>
            </Typography>
            <TextField 
              label="New Password" 
              type="password" 
              fullWidth 
              sx={{ mt: 2 }}
              value={newPassword} 
              onChange={handleTextFieldChange(setNewPassword)} 
              variant="outlined"
              autoFocus
              placeholder="Enter new password"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button 
            onClick={() => setOpenResetDialog(false)}
            variant="outlined"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleResetPassword} 
            variant="contained" 
            color="secondary"
            disabled={!newPassword}
          >
            Reset Password
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body1">
            Are you sure you want to delete user <strong>{selectedUser?.username}</strong>?
          </Typography>
          <Typography variant="body2" sx={{ mt: 1, color: 'error.main' }}>
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button 
            onClick={() => setOpenDeleteDialog(false)}
            variant="outlined"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteUser} 
            variant="contained" 
            color="error"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification Snackbar */}
      {notification && (
        <Snackbar
          open={true}
          autoHideDuration={6000}
          onClose={() => setNotification(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert 
            onClose={() => setNotification(null)} 
            severity={notification.type} 
            variant="filled"
            sx={{ width: '100%' }}
          >
            {notification.message}
          </Alert>
        </Snackbar>
      )}
    </Box>
  );
};

export default AdminPanel; 