import React, { useState, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import WalletProtection from './components/WalletProtection';
import ErrorBoundary from './components/ErrorBoundary';
import { CustomThemeProvider, useCustomTheme } from './contexts/ThemeContext';
import './styles/theme-transitions.css';

// Tema para tela de login (cyberpunk)
const loginTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#00ffff', // Ciano cyberpunk
      dark: '#00bfff',
      light: '#66ffff',
    },
    secondary: {
      main: '#8a2be2', // Roxo cyberpunk
      dark: '#6a1b9a',
      light: '#ab47bc',
    },
    background: {
      default: '#0a0a0a',
      paper: 'rgba(26, 26, 46, 0.9)',
    },
    text: {
      primary: '#ffffff',
      secondary: '#00ffff',
    },
  },
  typography: {
    fontFamily: "'Inter', 'Roboto', 'Arial', sans-serif",
    h4: {
      fontWeight: 700,
      background: 'linear-gradient(45deg, #00ffff 30%, #8a2be2 90%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
  },
});


// Componente interno que usa o tema customizado
const AppContent = () => {
  const { theme } = useCustomTheme();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar se há token salvo no localStorage
    const savedToken = localStorage.getItem('adminToken');
    const savedUser = localStorage.getItem('adminUser');

    if (savedToken && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setToken(savedToken);
        setUser(parsedUser);
        setIsAuthenticated(true);
      } catch (error) {
        // Token ou user inválidos, limpar localStorage
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
      }
    }
    
    setLoading(false);
  }, []);

  const handleLogin = (newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
  };

  if (loading) {
    return null; // ou um spinner de loading
  }

  return (
    <ThemeProvider theme={isAuthenticated ? theme : loginTheme}>
      <CssBaseline />
      <ErrorBoundary>
        {isAuthenticated ? (
          <Dashboard 
            token={token} 
            user={user} 
            onLogout={handleLogout} 
          />
        ) : (
          <Login onLogin={handleLogin} />
        )}
      </ErrorBoundary>
    </ThemeProvider>
  );
};

// Componente principal App
function App() {
  return (
    <ErrorBoundary>
      <WalletProtection>
        <CustomThemeProvider>
          <AppContent />
        </CustomThemeProvider>
      </WalletProtection>
    </ErrorBoundary>
  );
}

export default App;
