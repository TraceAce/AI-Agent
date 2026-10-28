import React, { useState, useEffect } from 'react';
import { Box, Container, CircularProgress, Dialog, Typography, Tabs, Tab } from '@mui/material';
import LoginForm from './components/LoginForm';
import ChatInterface from './components/ChatInterface';
import ChangePasswordForm from './components/ChangePasswordForm';
import AppHeader from './components/AppHeader';
import AdminPanel from './components/AdminPanel';
import ChatHistory from './components/ChatHistory';
import authService from './services/auth';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      style={{ 
        flexGrow: 1, 
        display: value === index ? 'flex' : 'none', 
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        position: 'relative'
      }}
      {...other}
    >
      {value === index && (
        <Box sx={{ 
          flexGrow: 1, 
          display: 'flex', 
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
          position: 'relative'
        }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showChangePassword, setShowChangePassword] = useState<boolean>(false);
  const [tabValue, setTabValue] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('Checking authentication...');
        const isAuth = authService.isAuthenticated();
        
        if (isAuth) {
          // Validate token with backend
          const isValid = await authService.validateToken();
          setIsAuthenticated(isValid);
          
          // Check if user is admin
          const currentUser = authService.getCurrentUser();
          if (currentUser && currentUser.role === 'admin') {
            setIsAdmin(true);
          }
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleLoginSuccess = () => {
    console.log("Login successful - showing chat interface");
    setIsAuthenticated(true);
    
    // Check if user is admin after login
    const currentUser = authService.getCurrentUser();
    if (currentUser && currentUser.role === 'admin') {
      setIsAdmin(true);
    }
  };

  const handleLogout = () => {
    console.log("Logging out user and redirecting to login screen");
    
    // First close any open dialogs
    setShowChangePassword(false);
    
    // Clear authentication data
    authService.logout();
    
    // Update state to trigger re-render and show login form
    setIsAuthenticated(false);
    setIsAdmin(false);
    
    // Optional: force a page refresh to ensure clean state
    // Uncomment if you're having issues with the state not clearing properly
    // window.location.reload();
  };

  const handleChangePassword = () => {
    setShowChangePassword(true);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  if (isLoading) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          bgcolor: 'background.default' 
        }}
      >
        <CircularProgress color="primary" size={60} thickness={4} />
        <Typography variant="h6" color="text.secondary" sx={{ ml: 3 }}>
          Loading...
        </Typography>
      </Box>
    );
  }

  if (!isAuthenticated) {
    console.log("Not authenticated - showing login form");
    return <LoginForm onLoginSuccess={handleLoginSuccess} />;
  }

  // Authenticated view - show chat interface
  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh', 
      bgcolor: 'background.default',
      overflow: 'hidden'
    }}>
      <AppHeader 
        onLogout={handleLogout}
        onChangePassword={handleChangePassword}
      />
      
      <Box sx={{ 
        borderBottom: 1, 
        borderColor: 'divider',
        position: 'sticky',
        top: 0,
        zIndex: 1,
        bgcolor: 'background.paper'
      }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          aria-label="App tabs"
          sx={{ 
            bgcolor: 'background.paper',
            minHeight: 48
          }}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label="Chat" sx={{ minHeight: 48, py: 1 }} />
          {isAdmin && <Tab label="User Management" sx={{ minHeight: 48, py: 1 }} />}
        </Tabs>
      </Box>
      
      <TabPanel value={tabValue} index={0}>
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}>
          <ChatHistory />
        </Box>
      </TabPanel>
      {isAdmin && (
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ 
            flexGrow: 1, 
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            overflow: 'auto'
          }}>
            <AdminPanel />
          </Box>
        </TabPanel>
      )}

      <Dialog 
        open={showChangePassword} 
        onClose={() => setShowChangePassword(false)}
        maxWidth="sm"
        fullWidth
      >
        <ChangePasswordForm 
          onClose={() => setShowChangePassword(false)} 
          onLogout={handleLogout} 
        />
      </Dialog>
    </Box>
  );
};

export default App; 