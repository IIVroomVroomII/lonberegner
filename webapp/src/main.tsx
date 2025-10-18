import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#7dd3fc', // Kraftig pastel blå
      light: '#a5d8ff',
      dark: '#5eadd1',
    },
    secondary: {
      main: '#c084fc', // Kraftig pastel lilla
      light: '#d8b4fe',
      dark: '#a855f7',
    },
    success: {
      main: '#86efac', // Kraftig pastel grøn
      dark: '#4ade80',
    },
    warning: {
      main: '#fcd34d', // Kraftig pastel gul
      dark: '#f59e0b',
    },
    error: {
      main: '#fca5a5', // Kraftig pastel rød
      dark: '#ef4444',
    },
    background: {
      default: '#1e1e1e', // VS Code mørk baggrund
      paper: '#252526', // VS Code sidebar farve
    },
    text: {
      primary: '#d4d4d4', // VS Code text farve
      secondary: '#9ca3af',
    },
    divider: '#3e3e42',
  },
  shape: {
    borderRadius: 4, // Let rundede hjørner
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", "Roboto", sans-serif',
    fontSize: 13,
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
      letterSpacing: '-0.02em',
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          padding: '6px 16px',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
        contained: {
          '&:hover': {
            transform: 'translateY(-1px)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          border: '1px solid #3e3e42',
          backgroundImage: 'none',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid #3e3e42',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 4,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 4,
        },
      },
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <App />
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
