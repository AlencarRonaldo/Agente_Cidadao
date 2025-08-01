import React, { useState } from 'react';
import {
  IconButton,
  Tooltip,
  Box,
  useTheme as useMuiTheme,
  alpha,
  Fade
} from '@mui/material';
import {
  LightMode,
  DarkMode,
  Brightness4
} from '@mui/icons-material';
import { useCustomTheme } from '../contexts/ThemeContext';

const ThemeToggle = ({ 
  size = 'medium', 
  showTooltip = true, 
  variant = 'standard' 
}) => {
  const { themeMode, toggleTheme, isDark } = useCustomTheme();
  const muiTheme = useMuiTheme();
  const [isHovered, setIsHovered] = useState(false);

  const getIcon = () => {
    if (variant === 'auto') {
      return <Brightness4 sx={{ fontSize: size === 'small' ? 18 : size === 'large' ? 28 : 22 }} />;
    }
    
    return isDark ? (
      <LightMode sx={{ fontSize: size === 'small' ? 18 : size === 'large' ? 28 : 22 }} />
    ) : (
      <DarkMode sx={{ fontSize: size === 'small' ? 18 : size === 'large' ? 28 : 22 }} />
    );
  };

  const getTooltipText = () => {
    if (variant === 'auto') {
      return 'Alternar tema';
    }
    return isDark ? 'Modo claro' : 'Modo escuro';
  };

  const getButtonStyles = () => {
    const baseStyles = {
      transition: 'all 0.3s ease-in-out',
      borderRadius: 2,
      position: 'relative',
      overflow: 'hidden',
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: isDark 
          ? 'linear-gradient(45deg, #fbbf24 0%, #f59e0b 100%)'
          : 'linear-gradient(45deg, #3b82f6 0%, #1d4ed8 100%)',
        opacity: 0,
        transition: 'opacity 0.3s ease-in-out',
        borderRadius: 'inherit'
      },
      '&:hover::before': {
        opacity: 0.1
      },
      '&:hover': {
        transform: 'scale(1.05)',
        boxShadow: isDark
          ? `0 0 20px ${alpha('#fbbf24', 0.3)}`
          : `0 0 20px ${alpha('#3b82f6', 0.3)}`
      }
    };

    // Estilos específicos por variante
    switch (variant) {
      case 'floating':
        return {
          ...baseStyles,
          backgroundColor: alpha(muiTheme.palette.background.paper, 0.9),
          backdropFilter: 'blur(8px)',
          border: `1px solid ${alpha(muiTheme.palette.divider, 0.2)}`,
          boxShadow: muiTheme.palette.mode === 'dark'
            ? '0 8px 32px rgba(0, 0, 0, 0.3)'
            : '0 8px 32px rgba(0, 0, 0, 0.1)',
          '&:hover': {
            ...baseStyles['&:hover'],
            backgroundColor: alpha(muiTheme.palette.background.paper, 1),
            boxShadow: muiTheme.palette.mode === 'dark'
              ? '0 12px 40px rgba(0, 0, 0, 0.4)'
              : '0 12px 40px rgba(0, 0, 0, 0.15)'
          }
        };
      
      case 'contained':
        return {
          ...baseStyles,
          backgroundColor: isDark 
            ? alpha('#fbbf24', 0.1)
            : alpha('#3b82f6', 0.1),
          color: isDark ? '#fbbf24' : '#3b82f6',
          border: `1px solid ${isDark ? alpha('#fbbf24', 0.2) : alpha('#3b82f6', 0.2)}`,
          '&:hover': {
            ...baseStyles['&:hover'],
            backgroundColor: isDark 
              ? alpha('#fbbf24', 0.15)
              : alpha('#3b82f6', 0.15)
          }
        };
      
      default:
        return {
          ...baseStyles,
          color: muiTheme.palette.text.secondary,
          '&:hover': {
            ...baseStyles['&:hover'],
            backgroundColor: alpha(
              isDark ? '#fbbf24' : '#3b82f6', 
              0.08
            ),
            color: isDark ? '#fbbf24' : '#3b82f6'
          }
        };
    }
  };

  const button = (
    <IconButton
      onClick={toggleTheme}
      size={size}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      sx={getButtonStyles()}
      aria-label={getTooltipText()}
    >
      <Box 
        sx={{ 
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Fade in timeout={300}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: isHovered ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.6s ease-in-out'
            }}
          >
            {getIcon()}
          </Box>
        </Fade>
      </Box>
    </IconButton>
  );

  if (showTooltip) {
    return (
      <Tooltip 
        title={getTooltipText()} 
        placement="bottom"
        enterDelay={500}
        TransitionComponent={Fade}
        TransitionProps={{ timeout: 200 }}
      >
        {button}
      </Tooltip>
    );
  }

  return button;
};

// Componente para toggle flutuante (posição fixa)
export const FloatingThemeToggle = ({ 
  position = { bottom: 24, right: 24 },
  zIndex = 1000 
}) => {
  return (
    <Box
      sx={{
        position: 'fixed',
        ...position,
        zIndex,
        animation: 'fadeInUp 0.5s ease-out'
      }}
    >
      <ThemeToggle variant="floating" size="large" />
    </Box>
  );
};

// Componente para barra de ferramentas
export const ToolbarThemeToggle = ({ ...props }) => {
  return <ThemeToggle variant="standard" size="medium" {...props} />;
};

// Componente para header/navbar
export const HeaderThemeToggle = ({ ...props }) => {
  return <ThemeToggle variant="contained" size="medium" {...props} />;
};

export default ThemeToggle;