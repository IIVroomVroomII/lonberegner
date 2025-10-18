import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeName = 'dark-blue' | 'dark-purple' | 'dark-green' | 'light-modern' | 'nord' | 'monokai';

export interface Theme {
  name: ThemeName;
  displayName: string;
  colors: {
    bg: {
      primary: string;
      secondary: string;
      tertiary: string;
      hover: string;
      active: string;
      input: string;
    };
    border: {
      default: string;
      hover: string;
    };
    text: {
      primary: string;
      secondary: string;
      muted: string;
    };
    accent: {
      primary: string;
      secondary: string;
      success: string;
      warning: string;
      danger: string;
      info: string;
    };
  };
}

export const themes: Record<ThemeName, Theme> = {
  'dark-blue': {
    name: 'dark-blue',
    displayName: 'Dark Blue (VS Code)',
    colors: {
      bg: {
        primary: '#1e1e1e',
        secondary: '#252526',
        tertiary: '#181818',
        hover: '#2a2d2e',
        active: '#37373d',
        input: '#3c3c3c',
      },
      border: {
        default: '#454545',
        hover: '#656565',
      },
      text: {
        primary: '#d4d4d4',
        secondary: '#9d9d9d',
        muted: '#6a6a6a',
      },
      accent: {
        primary: '#61afef',
        secondary: '#56b6c2',
        success: '#98c379',
        warning: '#e5c07b',
        danger: '#e06c75',
        info: '#61afef',
      },
    },
  },

  'dark-purple': {
    name: 'dark-purple',
    displayName: 'Dark Purple',
    colors: {
      bg: {
        primary: '#1a1625',
        secondary: '#221e2e',
        tertiary: '#15121d',
        hover: '#2d2838',
        active: '#3a3448',
        input: '#2d2838',
      },
      border: {
        default: '#3a3448',
        hover: '#4a4458',
      },
      text: {
        primary: '#e0def4',
        secondary: '#908caa',
        muted: '#6e6a86',
      },
      accent: {
        primary: '#c4a7e7',
        secondary: '#9ccfd8',
        success: '#a6e3a1',
        warning: '#f9e2af',
        danger: '#eb6f92',
        info: '#89dceb',
      },
    },
  },

  'dark-green': {
    name: 'dark-green',
    displayName: 'Dark Green (Matrix)',
    colors: {
      bg: {
        primary: '#0d1117',
        secondary: '#161b22',
        tertiary: '#0a0e13',
        hover: '#1c2128',
        active: '#272e38',
        input: '#1c2128',
      },
      border: {
        default: '#30363d',
        hover: '#484f58',
      },
      text: {
        primary: '#c9d1d9',
        secondary: '#8b949e',
        muted: '#6e7681',
      },
      accent: {
        primary: '#58a6ff',
        secondary: '#39d353',
        success: '#3fb950',
        warning: '#d29922',
        danger: '#f85149',
        info: '#58a6ff',
      },
    },
  },

  'light-modern': {
    name: 'light-modern',
    displayName: 'Light Modern',
    colors: {
      bg: {
        primary: '#ffffff',
        secondary: '#f6f8fa',
        tertiary: '#f0f2f5',
        hover: '#eaeef2',
        active: '#dfe3e8',
        input: '#ffffff',
      },
      border: {
        default: '#d0d7de',
        hover: '#a8b2bc',
      },
      text: {
        primary: '#24292f',
        secondary: '#57606a',
        muted: '#8c959f',
      },
      accent: {
        primary: '#0969da',
        secondary: '#8250df',
        success: '#1a7f37',
        warning: '#9a6700',
        danger: '#cf222e',
        info: '#0969da',
      },
    },
  },

  'nord': {
    name: 'nord',
    displayName: 'Nord',
    colors: {
      bg: {
        primary: '#2e3440',
        secondary: '#3b4252',
        tertiary: '#2a2f3a',
        hover: '#434c5e',
        active: '#4c566a',
        input: '#3b4252',
      },
      border: {
        default: '#4c566a',
        hover: '#5e6a7f',
      },
      text: {
        primary: '#eceff4',
        secondary: '#d8dee9',
        muted: '#9099a4',
      },
      accent: {
        primary: '#88c0d0',
        secondary: '#81a1c1',
        success: '#a3be8c',
        warning: '#ebcb8b',
        danger: '#bf616a',
        info: '#5e81ac',
      },
    },
  },

  'monokai': {
    name: 'monokai',
    displayName: 'Monokai',
    colors: {
      bg: {
        primary: '#272822',
        secondary: '#2d2e27',
        tertiary: '#1e1f1a',
        hover: '#3e3d32',
        active: '#49483e',
        input: '#3e3d32',
      },
      border: {
        default: '#49483e',
        hover: '#5e5d52',
      },
      text: {
        primary: '#f8f8f2',
        secondary: '#a6a596',
        muted: '#75715e',
      },
      accent: {
        primary: '#66d9ef',
        secondary: '#ae81ff',
        success: '#a6e22e',
        warning: '#e6db74',
        danger: '#f92672',
        info: '#66d9ef',
      },
    },
  },
};

interface ThemeState {
  currentTheme: ThemeName;
  setTheme: (theme: ThemeName) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      currentTheme: 'dark-blue',

      setTheme: (themeName) => {
        const theme = themes[themeName];

        // Apply theme colors to CSS variables
        const root = document.documentElement;

        root.style.setProperty('--bg-primary', theme.colors.bg.primary);
        root.style.setProperty('--bg-secondary', theme.colors.bg.secondary);
        root.style.setProperty('--bg-tertiary', theme.colors.bg.tertiary);
        root.style.setProperty('--bg-hover', theme.colors.bg.hover);
        root.style.setProperty('--bg-active', theme.colors.bg.active);
        root.style.setProperty('--bg-input', theme.colors.bg.input);

        root.style.setProperty('--border-color', theme.colors.border.default);
        root.style.setProperty('--border-hover', theme.colors.border.hover);

        root.style.setProperty('--text-primary', theme.colors.text.primary);
        root.style.setProperty('--text-secondary', theme.colors.text.secondary);
        root.style.setProperty('--text-muted', theme.colors.text.muted);

        root.style.setProperty('--accent-primary', theme.colors.accent.primary);
        root.style.setProperty('--accent-secondary', theme.colors.accent.secondary);
        root.style.setProperty('--accent-success', theme.colors.accent.success);
        root.style.setProperty('--accent-warning', theme.colors.accent.warning);
        root.style.setProperty('--accent-danger', theme.colors.accent.danger);
        root.style.setProperty('--accent-info', theme.colors.accent.info);

        // Legacy support for old variable names
        root.style.setProperty('--accent-blue', theme.colors.accent.primary);
        root.style.setProperty('--accent-cyan', theme.colors.accent.secondary);
        root.style.setProperty('--accent-green', theme.colors.accent.success);
        root.style.setProperty('--accent-yellow', theme.colors.accent.warning);
        root.style.setProperty('--accent-red', theme.colors.accent.danger);

        set({ currentTheme: themeName });
      },
    }),
    {
      name: 'theme-storage',
      onRehydrateStorage: () => (state) => {
        // Apply theme on initial load
        if (state?.currentTheme) {
          state.setTheme(state.currentTheme);
        }
      },
    }
  )
);

// Initialize theme on load
const initialTheme = useThemeStore.getState().currentTheme;
useThemeStore.getState().setTheme(initialTheme);
