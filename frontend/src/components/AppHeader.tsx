import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Box,
  Tooltip,
  Button,
  Chip,
} from '@mui/material';
import {
  AccountCircle,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  AdminPanelSettings as AdminIcon,
  Person as UserIcon,
} from '@mui/icons-material';
import authService, { User } from '../services/auth';

interface AppHeaderProps {
  onLogout: () => void;
  onChangePassword: () => void;
}

const AppHeader: React.FC<AppHeaderProps> = ({ onLogout, onChangePassword }) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const currentUser = authService.getCurrentUser();

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    console.log('Menu clicked', event.currentTarget);
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    console.log('Menu closed');
    setAnchorEl(null);
  };

  const handleChangePassword = () => {
    console.log('Change password clicked');
    handleClose();
    onChangePassword();
  };

  const handleLogout = () => {
    console.log('Logout clicked');
    handleClose();
    onLogout();
  };

  // Force menu to be visible for testing
  console.log('AppHeader rendered, menu open:', Boolean(anchorEl));

  return (
    <AppBar 
      position="static" 
      sx={{
        bgcolor: '#1f2937',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Toolbar>
        <Typography 
          variant="h6" 
          component="div" 
          sx={{ 
            flexGrow: 1,
            color: '#f3f4f6',
            fontWeight: 600,
          }}
        >
          Granite Security Questionnaire Bot
        </Typography>

        {currentUser && (
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 3 }}>
            <Chip
              icon={currentUser.role === 'admin' ? <AdminIcon /> : <UserIcon />}
              label={`${currentUser.username} (${currentUser.role})`}
              color={currentUser.role === 'admin' ? 'secondary' : 'default'}
              variant="outlined"
              sx={{ 
                color: 'white', 
                borderColor: 'white',
                '& .MuiChip-icon': { color: 'white' },
                fontWeight: 'medium'
              }}
            />
          </Box>
        )}
        

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            color="error"
            startIcon={<SettingsIcon />}
            onClick={onChangePassword}
            sx={{ 
              color: 'white',
              fontWeight: 'bold',
              textTransform: 'none'
            }}
          >
            Change Password
          </Button>
          
          <Button
            variant="contained"
            color="error"
            startIcon={<LogoutIcon />}
            onClick={onLogout}
            sx={{ 
              color: 'white',
              fontWeight: 'bold',
              textTransform: 'none'
            }}
          >
            Logout
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default AppHeader; 