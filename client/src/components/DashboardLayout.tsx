import React, { useState } from 'react';
import { Box, Drawer, AppBar, Toolbar, Typography, List, ListItem, ListItemIcon, ListItemText, CssBaseline, Avatar, InputBase, IconButton, ThemeProvider, createTheme, Badge, Menu } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import BarChartIcon from '@mui/icons-material/BarChart';
import PersonIcon from '@mui/icons-material/Person';
import MessageIcon from '@mui/icons-material/Message';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SearchIcon from '@mui/icons-material/Search';
import { useNavigate } from 'react-router-dom';

const drawerWidth = 220;

const navItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
  { text: 'Transactions', icon: <UploadFileIcon />, path: '/upload' },
  { text: 'Wallet', icon: <AccountBalanceWalletIcon />, path: '/wallet' },
  { text: 'Analytics', icon: <BarChartIcon />, path: '/analytics' },
  { text: 'Personal', icon: <PersonIcon />, path: '/personal' },
  { text: 'Messages', icon: <MessageIcon />, path: '/messages' },

];

import { useTheme } from '../ThemeContext';

const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const [profileAnchorEl, setProfileAnchorEl] = useState<null | HTMLElement>(null);
  const [profile, setProfile] = useState<{ name?: string; email?: string; profilePic?: string; role?: string } | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  React.useEffect(() => {
    if (profileAnchorEl) {
      setProfileLoading(true);
      const token = localStorage.getItem('token');
      const API_URL = process.env.REACT_APP_API_URL;
fetch(`${API_URL}/users/profile`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      })
        .then(res => res.json())
        .then(data => {
          if (data && (data.name || data.email)) {
            setProfile({ name: data.name, email: data.email, role: data.role, profilePic: data.profilePic });
          } else {
            setProfile({
              name: localStorage.getItem('name') || 'Candidate',
              email: localStorage.getItem('email') || 'example@email.com',
              role: localStorage.getItem('role') || 'analyst',
              profilePic: localStorage.getItem('profilePic') || undefined
            });
          }
        })
        .catch(() => {
          setProfile({
            name: localStorage.getItem('name') || 'Candidate',
            email: localStorage.getItem('email') || 'example@email.com',
            role: localStorage.getItem('role') || 'analyst',
            profilePic: localStorage.getItem('profilePic') || undefined
          });
        })
        .finally(() => setProfileLoading(false));
    }
  }, [profileAnchorEl]);

  return (
    <>
      <CssBaseline />
      <Box sx={{ display: 'flex', minHeight: '100vh', background: (theme) => theme.palette.background.default }}>
        {/* Sidebar */}
        <Drawer
          variant="permanent"
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            [`& .MuiDrawer-paper`]: {
              width: drawerWidth,
              boxSizing: 'border-box',
              background: 'linear-gradient(180deg, #181c2a 0%, #23263a 100%)',
              color: '#fff',
              borderRight: '1px solid #23263a',
            },
          }}
        >
          <Toolbar sx={{ minHeight: 80 }}>
            <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 700, letterSpacing: 1 }}>
              FinanceDash
            </Typography>
          </Toolbar>
          <List>
            {navItems.map((item) => (
              <ListItem button key={item.text} onClick={() => navigate(item.path)}>
                <ListItemIcon sx={{ color: '#b0b8d1' }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItem>
            ))}
            <ListItem button onClick={() => {
              localStorage.removeItem('token');
              navigate('/login');
            }}>
              <ListItemIcon sx={{ color: '#b0b8d1' }}><LogoutIcon /></ListItemIcon>
              <ListItemText primary="Logout" />
            </ListItem>
          </List>
        </Drawer>

        {/* Main content */}
        <Box component="main" sx={{ flexGrow: 1, p: 0, ml: `${drawerWidth}px`, background: (theme) => theme.palette.background.default, minHeight: '100vh' }}>
          <AppBar
            position="fixed"
            sx={{ width: `calc(100% - ${drawerWidth}px)`, ml: `${drawerWidth}px`, background: '#23263a', color: '#fff', boxShadow: 'none', borderBottom: '1px solid #23263a' }}
          >
            <Toolbar sx={{ minHeight: 80, display: 'flex', justifyContent: 'flex-end' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>

                <IconButton onClick={(e) => setProfileAnchorEl(e.currentTarget)}>
                  <Avatar
  src={profile?.profilePic ? (profile.profilePic.startsWith('http') ? profile.profilePic : `http://localhost:5000${profile.profilePic}`) : undefined}
  sx={{ bgcolor: '#7c3aed', width: 40, height: 40, fontWeight: 700, fontSize: 20 }}
>
  {profile?.name ? profile.name[0].toUpperCase() : 'U'}
</Avatar>
                </IconButton>
                <Menu
                  anchorEl={profileAnchorEl}
                  open={Boolean(profileAnchorEl)}
                  onClose={() => setProfileAnchorEl(null)}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                  PaperProps={{ sx: { background: '#23263a', color: '#fff', minWidth: 220, p: 2, borderRadius: 3 } }}
                >
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                    Profile
                  </Typography>
                  {profileLoading ? (
  <Typography variant="body2" sx={{ color: '#b0b8d1' }}>Loading...</Typography>
) : (
  <>
    {profile?.profilePic || localStorage.getItem('profilePic') ? (
      <Avatar
        src={profile?.profilePic ? (profile.profilePic.startsWith('http') ? profile.profilePic : `http://localhost:5000${profile.profilePic}`) : undefined}
        sx={{ width: 64, height: 64, mx: 'auto', mb: 1 }}
      >
        {profile?.name ? profile.name[0].toUpperCase() : 'U'}
      </Avatar>
    ) : null}
    <Typography variant="body2" sx={{ color: '#b0b8d1' }}>
      Name: {profile?.name || 'Candidate'}
    </Typography>
    <Typography variant="body2" sx={{ color: '#b0b8d1' }}>
      Email: {profile?.email || 'example@email.com'}
    </Typography>
    <Typography variant="body2" sx={{ color: '#b0b8d1' }}>
      Role: {profile?.role || 'analyst'}
    </Typography>
  </>
)}
                </Menu>
              </Box>
            </Toolbar>
          </AppBar>
          <Toolbar sx={{ minHeight: 80 }} /> {/* Spacer for AppBar */}
          <Box sx={{ p: 2, pl: 2, pr: 0, ml: -20,mr:12 }}>{children}</Box>
        </Box>
      </Box>
    </> 
  );
};

export default DashboardLayout;
