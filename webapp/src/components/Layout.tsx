import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  IconButton,
  Divider,
  Menu,
  MenuItem,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PaymentIcon from '@mui/icons-material/Payment';
import PeopleIcon from '@mui/icons-material/People';
import DescriptionIcon from '@mui/icons-material/Description';
import AssessmentIcon from '@mui/icons-material/Assessment';
import LogoutIcon from '@mui/icons-material/Logout';
import PaletteIcon from '@mui/icons-material/Palette';
import CheckIcon from '@mui/icons-material/Check';
import SettingsIcon from '@mui/icons-material/Settings';
import WarningIcon from '@mui/icons-material/Warning';
import HistoryIcon from '@mui/icons-material/History';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import CableIcon from '@mui/icons-material/Cable';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import SubscriptionsIcon from '@mui/icons-material/Subscriptions';
import { useThemeStore, themes, type ThemeName } from '../store/themeStore';

const drawerWidth = 240;

const menuItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
  { text: 'Medarbejdere', icon: <PeopleIcon />, path: '/employees' },
  { text: 'Tidsregistrering', icon: <AccessTimeIcon />, path: '/time-entries' },
  { text: 'Lønberegning', icon: <PaymentIcon />, path: '/payrolls' },
  { text: 'Rapporter', icon: <AssessmentIcon />, path: '/reports' },
  { text: 'Beregningsprofiler', icon: <SettingsIcon />, path: '/calculation-profiles' },
  { text: 'Afvigelser', icon: <ErrorOutlineIcon />, path: '/conflicts' },
  { text: 'Overenskomster', icon: <DescriptionIcon />, path: '/agreements' },
  { text: 'Integrationer', icon: <CableIcon />, path: '/integrations' },
  { text: 'AI Integrationer', icon: <SmartToyIcon />, path: '/ai-integrations' },
  { text: 'Abonnement', icon: <SubscriptionsIcon />, path: '/subscription' },
  { text: 'Audit Log', icon: <HistoryIcon />, path: '/audit-logs' },
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [themeMenuAnchor, setThemeMenuAnchor] = useState<null | HTMLElement>(null);
  const { currentTheme, setTheme } = useThemeStore();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handleThemeMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setThemeMenuAnchor(event.currentTarget);
  };

  const handleThemeMenuClose = () => {
    setThemeMenuAnchor(null);
  };

  const handleThemeChange = (themeName: ThemeName) => {
    setTheme(themeName);
    handleThemeMenuClose();
  };

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar sx={{ minHeight: '48px !important', px: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--accent-cyan)' }}>
          Lønberegning
        </Typography>
      </Toolbar>
      <Divider sx={{ borderColor: 'var(--border-color)' }} />
      <List sx={{ flexGrow: 1, pt: 1, px: 1 }}>
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => navigate(item.path)}
                sx={{
                  borderRadius: '6px',
                  py: 0.75,
                  px: 1.5,
                  minHeight: '36px',
                  backgroundColor: isActive ? 'rgba(97, 175, 239, 0.12)' : 'transparent',
                  borderLeft: isActive ? '3px solid var(--accent-blue)' : '3px solid transparent',
                  '&:hover': {
                    backgroundColor: isActive ? 'rgba(97, 175, 239, 0.18)' : 'var(--bg-hover)',
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: '32px', color: isActive ? 'var(--accent-blue)' : 'var(--text-secondary)' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  primaryTypographyProps={{
                    fontSize: '0.875rem',
                    fontWeight: isActive ? 500 : 400,
                    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
      <Divider sx={{ borderColor: 'var(--border-color)' }} />
      <List sx={{ pb: 1, px: 1 }}>
        <ListItem disablePadding>
          <ListItemButton
            onClick={handleLogout}
            sx={{
              borderRadius: '6px',
              py: 0.75,
              px: 1.5,
              minHeight: '36px',
              '&:hover': {
                backgroundColor: 'rgba(224, 108, 117, 0.12)',
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: '32px', color: 'var(--accent-red)' }}>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText
              primary="Log ud"
              primaryTypographyProps={{
                fontSize: '0.875rem',
                color: 'var(--accent-red)',
              }}
            />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          backgroundColor: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-color)',
        }}
      >
        <Toolbar sx={{ minHeight: '48px !important' }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' }, color: 'var(--text-primary)' }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 500, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
            Transport- og Logistikoverenskomst
          </Typography>
          <IconButton
            onClick={handleThemeMenuOpen}
            sx={{ color: 'var(--text-secondary)', '&:hover': { color: 'var(--accent-primary)' } }}
          >
            <PaletteIcon />
          </IconButton>
          <Menu
            anchorEl={themeMenuAnchor}
            open={Boolean(themeMenuAnchor)}
            onClose={handleThemeMenuClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            PaperProps={{
              sx: {
                mt: 1,
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                minWidth: 200,
              },
            }}
          >
            {(Object.keys(themes) as ThemeName[]).map((themeName) => {
              const theme = themes[themeName];
              const isActive = currentTheme === themeName;
              return (
                <MenuItem
                  key={themeName}
                  onClick={() => handleThemeChange(themeName)}
                  sx={{
                    fontSize: '0.875rem',
                    color: isActive ? 'var(--accent-primary)' : 'var(--text-primary)',
                    backgroundColor: isActive ? 'rgba(97, 175, 239, 0.08)' : 'transparent',
                    '&:hover': {
                      backgroundColor: 'var(--bg-hover)',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <Box
                      sx={{
                        width: 16,
                        height: 16,
                        borderRadius: '3px',
                        backgroundColor: theme.colors.accent.primary,
                        border: '1px solid var(--border-color)',
                        mr: 1.5,
                      }}
                    />
                    <Typography sx={{ fontSize: '0.875rem', flexGrow: 1 }}>
                      {theme.displayName}
                    </Typography>
                    {isActive && <CheckIcon sx={{ fontSize: '1rem', ml: 1 }} />}
                  </Box>
                </MenuItem>
              );
            })}
          </Menu>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              backgroundColor: 'var(--bg-secondary)',
              borderRight: '1px solid var(--border-color)',
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              backgroundColor: 'var(--bg-secondary)',
              borderRight: '1px solid var(--border-color)',
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          backgroundColor: 'var(--bg-primary)',
          overflowY: 'auto',
          height: '100vh',
        }}
      >
        <Toolbar sx={{ minHeight: '48px !important' }} />
        <Outlet />
      </Box>
    </Box>
  );
}
