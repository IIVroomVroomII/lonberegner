import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, TextField, Button, Typography, Alert, Paper, IconButton, Menu, MenuItem } from '@mui/material';
import PaletteIcon from '@mui/icons-material/Palette';
import CheckIcon from '@mui/icons-material/Check';
import { authAPI } from '../services/api';
import { useThemeStore, themes, type ThemeName } from '../store/themeStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const { currentTheme, setTheme } = useThemeStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [themeMenuAnchor, setThemeMenuAnchor] = useState<null | HTMLElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.login(email, password);
      localStorage.setItem('token', response.data.data.token);
      // Force a full page reload to re-evaluate authentication state
      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login fejlede. Tjek email og adgangskode.');
      setLoading(false);
    }
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

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-primary)',
        position: 'relative',
      }}
    >
      <IconButton
        onClick={handleThemeMenuOpen}
        sx={{
          position: 'absolute',
          top: 16,
          right: 16,
          color: 'var(--text-secondary)',
          '&:hover': { color: 'var(--accent-primary)' },
        }}
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

      <Paper
        elevation={0}
        sx={{
          p: 4,
          width: '100%',
          maxWidth: 420,
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
        }}
      >
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 600,
              color: 'var(--accent-cyan)',
              mb: 1,
              fontSize: '1.75rem',
            }}
          >
            Lønberegning System
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: 'var(--text-secondary)',
              fontSize: '0.875rem',
            }}
          >
            Transport- og Logistikoverenskomst 2025-2028
          </Typography>
        </Box>

        {error && (
          <Alert
            severity="error"
            sx={{
              mb: 3,
              backgroundColor: 'rgba(224, 108, 117, 0.1)',
              border: '1px solid var(--accent-red)',
              color: 'var(--accent-red)',
              '& .MuiAlert-icon': {
                color: 'var(--accent-red)',
              },
            }}
          >
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Box sx={{ mb: 2 }}>
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                mb: 0.5,
                color: 'var(--text-secondary)',
                fontSize: '0.75rem',
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Email
            </Typography>
            <TextField
              fullWidth
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@lonberegning.dk"
              required
              autoComplete="email"
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'var(--bg-input)',
                  borderRadius: '6px',
                  '& fieldset': {
                    borderColor: 'var(--border-color)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'var(--border-hover)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: 'var(--accent-blue)',
                    borderWidth: '2px',
                  },
                  '& input': {
                    color: 'var(--text-primary)',
                    padding: '10px 12px',
                    fontSize: '0.875rem',
                  },
                },
              }}
            />
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                mb: 0.5,
                color: 'var(--text-secondary)',
                fontSize: '0.75rem',
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Adgangskode
            </Typography>
            <TextField
              fullWidth
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'var(--bg-input)',
                  borderRadius: '6px',
                  '& fieldset': {
                    borderColor: 'var(--border-color)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'var(--border-hover)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: 'var(--accent-blue)',
                    borderWidth: '2px',
                  },
                  '& input': {
                    color: 'var(--text-primary)',
                    padding: '10px 12px',
                    fontSize: '0.875rem',
                  },
                },
              }}
            />
          </Box>

          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={loading}
            sx={{
              py: 1.25,
              backgroundColor: 'var(--accent-blue)',
              color: '#ffffff',
              borderRadius: '6px',
              textTransform: 'none',
              fontSize: '0.9375rem',
              fontWeight: 500,
              boxShadow: 'none',
              '&:hover': {
                backgroundColor: 'var(--accent-blue)',
                filter: 'brightness(1.1)',
                boxShadow: 'none',
              },
              '&:disabled': {
                backgroundColor: 'var(--bg-active)',
                color: 'var(--text-muted)',
              },
            }}
          >
            {loading ? 'Logger ind...' : 'Log ind'}
          </Button>
        </form>

      </Paper>
    </Box>
  );
}
