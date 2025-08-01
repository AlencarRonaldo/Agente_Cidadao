import React, { createContext, useContext, useState, useEffect } from 'react';
import { createTheme } from '@mui/material/styles';

// Configuração de cores para tema light
const lightPalette = {
  mode: 'light',
  primary: {
    main: '#2563eb',
    light: '#3b82f6',
    dark: '#1d4ed8',
    contrastText: '#ffffff'
  },
  secondary: {
    main: '#64748b',
    light: '#94a3b8',
    dark: '#475569',
    contrastText: '#ffffff'
  },
  success: {
    main: '#10b981',
    light: '#34d399',
    dark: '#059669',
    contrastText: '#ffffff'
  },
  error: {
    main: '#ef4444',
    light: '#f87171',
    dark: '#dc2626',
    contrastText: '#ffffff'
  },
  warning: {
    main: '#f59e0b',
    light: '#fbbf24',
    dark: '#d97706',
    contrastText: '#ffffff'
  },
  info: {
    main: '#06b6d4',
    light: '#22d3ee',
    dark: '#0891b2',
    contrastText: '#ffffff'
  },
  background: {
    default: '#f8fafc',
    paper: '#ffffff',
    secondary: '#f1f5f9'
  },
  text: {
    primary: '#1e293b',
    secondary: '#64748b',
    disabled: '#94a3b8'
  },
  divider: '#e2e8f0',
  action: {
    active: '#64748b',
    hover: 'rgba(37, 99, 235, 0.04)',
    selected: 'rgba(37, 99, 235, 0.08)',
    disabled: '#94a3b8',
    disabledBackground: '#f1f5f9'
  }
};

// Configuração de cores para tema dark - WCAG AA/AAA compliant
const darkPalette = {
  mode: 'dark',
  primary: {
    main: '#60a5fa', // Mais claro para melhor contraste
    light: '#93c5fd',
    dark: '#3b82f6',
    contrastText: '#ffffff'
  },
  secondary: {
    main: '#cbd5e1', // Melhor contraste para texto secundário
    light: '#e2e8f0',
    dark: '#94a3b8',
    contrastText: '#0f172a'
  },
  success: {
    main: '#4ade80', // Verde mais claro e vibrante
    light: '#86efac',
    dark: '#22c55e',
    contrastText: '#052e16'
  },
  error: {
    main: '#fb7185', // Rosa mais suave que vermelho puro
    light: '#fda4af',
    dark: '#f43f5e',
    contrastText: '#fef2f2'
  },
  warning: {
    main: '#fbbf24', // Mantido - bom contraste
    light: '#fcd34d',
    dark: '#f59e0b',
    contrastText: '#451a03'
  },
  info: {
    main: '#38bdf8', // Azul ciano mais vibrante
    light: '#7dd3fc',
    dark: '#0ea5e9',
    contrastText: '#0c4a6e'
  },
  background: {
    default: '#020617', // Mais escuro para melhor contraste
    paper: '#0f172a', // Slate-900 para cards e modais
    secondary: '#1e293b' // Slate-800 para elementos elevados
  },
  text: {
    primary: '#ffffff', // Branco puro para máximo contraste
    secondary: '#e2e8f0', // Slate-200 para texto secundário
    disabled: '#94a3b8' // Slate-400 para texto desabilitado
  },
  divider: '#475569', // Slate-600 mais visível
  action: {
    active: '#e2e8f0',
    hover: 'rgba(96, 165, 250, 0.12)', // Mais opaco para melhor feedback
    selected: 'rgba(96, 165, 250, 0.16)',
    disabled: '#64748b',
    disabledBackground: '#334155',
    focus: 'rgba(96, 165, 250, 0.24)' // Focus state mais visível
  },
  // Cores customizadas para componentes específicos
  custom: {
    tableHeader: '#1e293b',
    tableRow: {
      even: '#0f172a',
      odd: '#1e293b',
      hover: 'rgba(96, 165, 250, 0.08)'
    },
    card: {
      elevated: '#1e293b',
      border: '#475569'
    },
    status: {
      online: '#22c55e',
      offline: '#64748b',
      warning: '#f59e0b',
      error: '#ef4444'
    }
  }
};

// Configuração base do tema (comum para light e dark)
const baseThemeConfig = {
  typography: {
    fontFamily: '"Inter", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", sans-serif',
    // Headers com melhor contraste e peso
    h1: { 
      fontWeight: 800, 
      fontSize: '2.5rem',
      lineHeight: 1.2,
      letterSpacing: '-0.025em'
    },
    h2: { 
      fontWeight: 700, 
      fontSize: '2rem',
      lineHeight: 1.25,
      letterSpacing: '-0.02em'
    },
    h3: { 
      fontWeight: 700, 
      fontSize: '1.75rem',
      lineHeight: 1.3,
      letterSpacing: '-0.015em'
    },
    h4: { 
      fontWeight: 600, 
      fontSize: '1.5rem',
      lineHeight: 1.35,
      letterSpacing: '-0.01em'
    },
    h5: { 
      fontWeight: 600, 
      fontSize: '1.25rem',
      lineHeight: 1.4,
      letterSpacing: '-0.005em'
    },
    h6: { 
      fontWeight: 600, 
      fontSize: '1rem',
      lineHeight: 1.5,
      letterSpacing: '0em'
    },
    // Body text otimizado para leitura
    body1: { 
      fontSize: '1rem', 
      lineHeight: 1.6,
      letterSpacing: '0.005em',
      fontWeight: 400
    },
    body2: { 
      fontSize: '0.875rem', 
      lineHeight: 1.5,
      letterSpacing: '0.01em',
      fontWeight: 400
    },
    // Buttons e componentes interativos
    button: {
      textTransform: 'none',
      fontWeight: 600, // Mais peso para melhor visibilidade
      fontSize: '0.875rem',
      letterSpacing: '0.025em'
    },
    caption: { 
      fontSize: '0.75rem', 
      lineHeight: 1.4,
      letterSpacing: '0.025em',
      fontWeight: 500
    },
    // Novos tipos para casos específicos
    subtitle1: {
      fontSize: '1rem',
      fontWeight: 500,
      lineHeight: 1.75,
      letterSpacing: '0.00938em'
    },
    subtitle2: {
      fontSize: '0.875rem',
      fontWeight: 500,
      lineHeight: 1.57,
      letterSpacing: '0.00714em'
    },
    overline: {
      fontSize: '0.75rem',
      fontWeight: 600,
      lineHeight: 2.66,
      letterSpacing: '0.08333em',
      textTransform: 'uppercase'
    }
  },
  shape: {
    borderRadius: 8
  },
  shadows: [
    'none',
    '0 1px 2px 0 rgb(0 0 0 / 0.15)',
    '0 1px 3px 0 rgb(0 0 0 / 0.25), 0 1px 2px -1px rgb(0 0 0 / 0.25)',
    '0 4px 6px -1px rgb(0 0 0 / 0.25), 0 2px 4px -2px rgb(0 0 0 / 0.25)',
    '0 10px 15px -3px rgb(0 0 0 / 0.35), 0 4px 6px -4px rgb(0 0 0 / 0.35)',
    '0 20px 25px -5px rgb(0 0 0 / 0.4), 0 8px 10px -6px rgb(0 0 0 / 0.4)',
    '0 25px 50px -12px rgb(0 0 0 / 0.5)',
    ...Array(18).fill('0 25px 50px -12px rgb(0 0 0 / 0.5)')
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 500,
          padding: '8px 16px',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
          }
        },
        contained: {
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
          }
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 12,
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: theme.palette.mode === 'dark' 
            ? '0 1px 3px rgba(0, 0, 0, 0.3)' 
            : '0 1px 3px rgba(0, 0, 0, 0.1)',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: theme.palette.mode === 'dark'
              ? '0 8px 25px rgba(0, 0, 0, 0.4)'
              : '0 8px 25px rgba(0, 0, 0, 0.15)'
          }
        })
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundImage: 'none',
          border: `1px solid ${theme.palette.divider}`,
          transition: 'all 0.2s ease-in-out'
        })
      }
    },
    MuiAppBar: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundImage: 'none',
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.primary,
          boxShadow: 'none',
          borderBottom: `1px solid ${theme.palette.divider}`
        })
      }
    },
    MuiTableCell: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderColor: theme.palette.divider,
          fontSize: '0.875rem',
          lineHeight: 1.6,
          ...(theme.palette.mode === 'dark' && {
            '&:not(.MuiTableCell-head)': {
              color: theme.palette.text.primary
            }
          })
        }),
        head: ({ theme }) => ({
          backgroundColor: theme.palette.mode === 'dark' 
            ? theme.palette.custom?.tableHeader || theme.palette.background.secondary
            : theme.palette.background.secondary,
          fontWeight: 700,
          fontSize: '0.75rem',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: theme.palette.mode === 'dark' 
            ? theme.palette.text.primary 
            : theme.palette.text.primary,
          borderBottom: `2px solid ${theme.palette.divider}`,
          '&.MuiTableCell-root': {
            fontWeight: 700
          }
        })
      }
    },
    MuiTableRow: {
      styleOverrides: {
        root: ({ theme }) => ({
          ...(theme.palette.mode === 'dark' && {
            '&:nth-of-type(even)': {
              backgroundColor: theme.palette.custom?.tableRow?.even || 'rgba(255, 255, 255, 0.02)'
            },
            '&:nth-of-type(odd)': {
              backgroundColor: theme.palette.custom?.tableRow?.odd || 'rgba(255, 255, 255, 0.01)'
            },
            '&:hover': {
              backgroundColor: theme.palette.custom?.tableRow?.hover || 'rgba(96, 165, 250, 0.08)',
              '& .MuiTableCell-root': {
                color: theme.palette.text.primary
              }
            }
          })
        })
      }
    },
    MuiTextField: {
      styleOverrides: {
        root: ({ theme }) => ({
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            transition: 'all 0.2s ease-in-out',
            backgroundColor: theme.palette.mode === 'dark' 
              ? 'rgba(255, 255, 255, 0.02)'
              : 'rgba(255, 255, 255, 1)',
            '&:hover': {
              transform: 'translateY(-1px)',
              backgroundColor: theme.palette.mode === 'dark' 
                ? 'rgba(255, 255, 255, 0.04)'
                : 'rgba(255, 255, 255, 1)'
            },
            '&.Mui-focused': {
              backgroundColor: theme.palette.mode === 'dark' 
                ? 'rgba(255, 255, 255, 0.06)'
                : 'rgba(255, 255, 255, 1)'
            }
          },
          '& .MuiInputLabel-root': {
            fontWeight: 500,
            color: theme.palette.mode === 'dark' 
              ? theme.palette.text.secondary
              : theme.palette.text.secondary,
            '&.Mui-focused': {
              color: theme.palette.primary.main,
              fontWeight: 600
            }
          },
          '& .MuiOutlinedInput-input': {
            color: theme.palette.text.primary,
            fontWeight: 400,
            '&::placeholder': {
              color: theme.palette.text.disabled,
              opacity: 1
            }
          }
        })
      }
    },
    MuiChip: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 6,
          fontWeight: 600,
          fontSize: '0.75rem',
          letterSpacing: '0.025em',
          ...(theme.palette.mode === 'dark' && {
            '&.MuiChip-colorPrimary': {
              backgroundColor: theme.palette.primary.main,
              color: theme.palette.primary.contrastText
            },
            '&.MuiChip-colorSecondary': {
              backgroundColor: theme.palette.secondary.main,
              color: theme.palette.secondary.contrastText
            },
            '&.MuiChip-colorSuccess': {
              backgroundColor: theme.palette.success.main,
              color: theme.palette.success.contrastText
            },
            '&.MuiChip-colorError': {
              backgroundColor: theme.palette.error.main,
              color: theme.palette.error.contrastText
            },
            '&.MuiChip-colorWarning': {
              backgroundColor: theme.palette.warning.main,
              color: theme.palette.warning.contrastText
            },
            '&.MuiChip-colorInfo': {
              backgroundColor: theme.palette.info.main,
              color: theme.palette.info.contrastText
            }
          })
        })
      }
    },
    MuiDialog: {
      styleOverrides: {
        paper: ({ theme }) => ({
          borderRadius: 16,
          border: theme.palette.mode === 'dark' 
            ? `1px solid ${theme.palette.divider}`
            : 'none',
          boxShadow: theme.palette.mode === 'dark'
            ? '0 25px 50px -12px rgba(0, 0, 0, 0.6)'
            : '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        })
      }
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: ({ theme }) => ({
          fontWeight: 700,
          fontSize: '1.25rem',
          color: theme.palette.text.primary,
          paddingBottom: theme.spacing(1),
          borderBottom: `1px solid ${theme.palette.divider}`
        })
      }
    },
    MuiDialogContent: {
      styleOverrides: {
        root: ({ theme }) => ({
          color: theme.palette.text.primary,
          '& .MuiTypography-root': {
            color: theme.palette.text.primary
          }
        })
      }
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: ({ theme }) => ({
          backgroundColor: theme.palette.mode === 'dark' 
            ? theme.palette.background.secondary
            : theme.palette.text.primary,
          color: theme.palette.mode === 'dark'
            ? theme.palette.text.primary
            : theme.palette.background.paper,
          borderRadius: 8,
          fontSize: '0.75rem',
          fontWeight: 500,
          padding: theme.spacing(1, 1.5),
          border: theme.palette.mode === 'dark'
            ? `1px solid ${theme.palette.divider}`
            : 'none',
          boxShadow: theme.palette.mode === 'dark'
            ? '0 8px 32px rgba(0, 0, 0, 0.4)'
            : '0 8px 32px rgba(0, 0, 0, 0.15)'
        })
      }
    },
    // Novos componentes para melhor experiência
    MuiIconButton: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 8,
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            backgroundColor: theme.palette.mode === 'dark'
              ? 'rgba(255, 255, 255, 0.08)'
              : 'rgba(0, 0, 0, 0.04)',
            transform: 'scale(1.05)'
          },
          '&:focus-visible': {
            outline: `2px solid ${theme.palette.primary.main}`,
            outlineOffset: '2px'
          }
        })
      }
    },
    MuiSelect: {
      styleOverrides: {
        select: ({ theme }) => ({
          color: theme.palette.text.primary,
          '&:focus': {
            backgroundColor: 'transparent'
          }
        })
      }
    },
    MuiMenuItem: {
      styleOverrides: {
        root: ({ theme }) => ({
          fontSize: '0.875rem',
          fontWeight: 400,
          color: theme.palette.text.primary,
          '&:hover': {
            backgroundColor: theme.palette.mode === 'dark'
              ? 'rgba(96, 165, 250, 0.12)'
              : theme.palette.action.hover
          },
          '&.Mui-selected': {
            backgroundColor: theme.palette.mode === 'dark'
              ? 'rgba(96, 165, 250, 0.16)'
              : theme.palette.action.selected,
            color: theme.palette.primary.main,
            fontWeight: 500,
            '&:hover': {
              backgroundColor: theme.palette.mode === 'dark'
                ? 'rgba(96, 165, 250, 0.20)'
                : theme.palette.action.selected
            }
          }
        })
      }
    },
    MuiAlert: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 12,
          border: `1px solid transparent`,
          fontWeight: 500,
          '& .MuiAlert-icon': {
            fontSize: '1.25rem'
          }
        }),
        standardError: ({ theme }) => ({
          backgroundColor: theme.palette.mode === 'dark'
            ? 'rgba(251, 113, 133, 0.15)'
            : theme.palette.error.light,
          color: theme.palette.mode === 'dark'
            ? theme.palette.error.light
            : theme.palette.error.dark,
          border: `1px solid ${theme.palette.error.main}`
        }),
        standardWarning: ({ theme }) => ({
          backgroundColor: theme.palette.mode === 'dark'
            ? 'rgba(251, 191, 36, 0.15)'
            : theme.palette.warning.light,
          color: theme.palette.mode === 'dark'
            ? theme.palette.warning.light
            : theme.palette.warning.dark,
          border: `1px solid ${theme.palette.warning.main}`
        }),
        standardInfo: ({ theme }) => ({
          backgroundColor: theme.palette.mode === 'dark'
            ? 'rgba(56, 189, 248, 0.15)'
            : theme.palette.info.light,
          color: theme.palette.mode === 'dark'
            ? theme.palette.info.light
            : theme.palette.info.dark,
          border: `1px solid ${theme.palette.info.main}`
        }),
        standardSuccess: ({ theme }) => ({
          backgroundColor: theme.palette.mode === 'dark'
            ? 'rgba(74, 222, 128, 0.15)'
            : theme.palette.success.light,
          color: theme.palette.mode === 'dark'
            ? theme.palette.success.light
            : theme.palette.success.dark,
          border: `1px solid ${theme.palette.success.main}`
        })
      }
    }
  }
};

// Context
const ThemeContext = createContext();

// Hook personalizado para usar o tema
export const useCustomTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useCustomTheme deve ser usado dentro de um ThemeProvider');
  }
  return context;
};

// Provider do tema
export const CustomThemeProvider = ({ children }) => {
  // Detectar preferência do sistema
  const getSystemPreference = () => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  };

  // Estado do tema
  const [themeMode, setThemeMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme-preference');
    return savedTheme || getSystemPreference();
  });

  // Criar tema baseado no modo atual
  const theme = createTheme({
    palette: themeMode === 'dark' ? darkPalette : lightPalette,
    ...baseThemeConfig
  });

  // Função para alternar tema
  const toggleTheme = () => {
    const newMode = themeMode === 'light' ? 'dark' : 'light';
    setThemeMode(newMode);
    localStorage.setItem('theme-preference', newMode);
  };

  // Função para definir tema específico
  const setTheme = (mode) => {
    setThemeMode(mode);
    localStorage.setItem('theme-preference', mode);
  };

  // Escutar mudanças na preferência do sistema
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e) => {
      // Só atualizar se não houver preferência salva
      const savedTheme = localStorage.getItem('theme-preference');
      if (!savedTheme) {
        setThemeMode(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Aplicar transições suaves ao body e data-theme
  useEffect(() => {
    document.body.style.transition = 'background-color 0.3s ease, color 0.3s ease';
    document.body.style.backgroundColor = theme.palette.background.default;
    document.body.style.color = theme.palette.text.primary;
    
    // Aplicar data-theme para CSS customizado
    document.documentElement.setAttribute('data-theme', themeMode);
    
    return () => {
      document.body.style.transition = '';
    };
  }, [theme, themeMode]);

  const value = {
    theme,
    themeMode,
    toggleTheme,
    setTheme,
    isDark: themeMode === 'dark',
    isLight: themeMode === 'light'
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;