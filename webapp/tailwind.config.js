/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // VS Code Dark Theme
        vscode: {
          bg: '#1e1e1e',
          sidebar: '#252526',
          editor: '#1e1e1e',
          panel: '#181818',
          input: '#3c3c3c',
          border: '#454545',
          hover: '#2a2d2e',
          active: '#37373d',
        },
        // Kraftige Pastelfarver
        pastel: {
          blue: '#61afef',
          purple: '#c678dd',
          green: '#98c379',
          yellow: '#e5c07b',
          red: '#e06c75',
          cyan: '#56b6c2',
          orange: '#d19a66',
          pink: '#e691b2',
        },
        // Light Theme
        light: {
          bg: '#ffffff',
          sidebar: '#f3f3f3',
          editor: '#ffffff',
          panel: '#f8f8f8',
          input: '#ffffff',
          border: '#e0e0e0',
          hover: '#eeeeee',
          active: '#e0e0e0',
          text: '#1e1e1e',
        },
      },
      fontFamily: {
        sans: ['Inter', 'SF Pro Display', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'monospace'],
      },
      borderRadius: {
        'sm': '4px',
        DEFAULT: '6px',
        'md': '6px',
        'lg': '8px',
      },
      boxShadow: {
        'vscode': '0 2px 8px rgba(0, 0, 0, 0.3)',
        'vscode-lg': '0 4px 16px rgba(0, 0, 0, 0.4)',
      },
    },
  },
  plugins: [],
}
