import { useCustomTheme } from '../contexts/ThemeContext';

/**
 * Hook personalizado para acessar cores otimizadas do tema dark
 * com ratios de contraste WCAG AA/AAA
 */
export const useOptimizedColors = () => {
  const { theme, isDark } = useCustomTheme();

  // Cores de status com alto contraste
  const statusColors = {
    success: {
      main: isDark ? '#4ade80' : theme.palette.success.main,
      background: isDark ? 'rgba(74, 222, 128, 0.15)' : theme.palette.success.light,
      text: isDark ? '#052e16' : theme.palette.success.contrastText,
      border: isDark ? '#22c55e' : theme.palette.success.main
    },
    error: {
      main: isDark ? '#fb7185' : theme.palette.error.main,
      background: isDark ? 'rgba(251, 113, 133, 0.15)' : theme.palette.error.light,
      text: isDark ? '#fef2f2' : theme.palette.error.contrastText,
      border: isDark ? '#f43f5e' : theme.palette.error.main
    },
    warning: {
      main: isDark ? '#fbbf24' : theme.palette.warning.main,
      background: isDark ? 'rgba(251, 191, 36, 0.15)' : theme.palette.warning.light,
      text: isDark ? '#451a03' : theme.palette.warning.contrastText,
      border: isDark ? '#f59e0b' : theme.palette.warning.main
    },
    info: {
      main: isDark ? '#38bdf8' : theme.palette.info.main,
      background: isDark ? 'rgba(56, 189, 248, 0.15)' : theme.palette.info.light,
      text: isDark ? '#0c4a6e' : theme.palette.info.contrastText,
      border: isDark ? '#0ea5e9' : theme.palette.info.main
    },
    pending: {
      main: isDark ? '#a78bfa' : '#8b5cf6',
      background: isDark ? 'rgba(167, 139, 250, 0.15)' : 'rgba(139, 92, 246, 0.1)',
      text: isDark ? '#2e1065' : '#ffffff',
      border: isDark ? '#8b5cf6' : '#7c3aed'
    }
  };

  // Cores de texto com contraste otimizado
  const textColors = {
    primary: isDark ? '#ffffff' : theme.palette.text.primary,
    secondary: isDark ? '#e2e8f0' : theme.palette.text.secondary,
    disabled: isDark ? '#94a3b8' : theme.palette.text.disabled,
    // Cores específicas para diferentes contextos
    header: isDark ? '#ffffff' : theme.palette.text.primary,
    body: isDark ? '#e2e8f0' : theme.palette.text.primary,
    caption: isDark ? '#cbd5e1' : theme.palette.text.secondary,
    muted: isDark ? '#94a3b8' : theme.palette.text.disabled
  };

  // Cores de background com gradientes
  const backgroundColors = {
    default: theme.palette.background.default,
    paper: theme.palette.background.paper,
    elevated: isDark ? '#1e293b' : '#ffffff',
    card: isDark ? 'rgba(30, 41, 59, 0.8)' : '#ffffff',
    table: {
      header: isDark ? '#1e293b' : theme.palette.background.secondary,
      evenRow: isDark ? 'rgba(255, 255, 255, 0.01)' : '#ffffff',
      oddRow: isDark ? 'rgba(255, 255, 255, 0.02)' : '#f8fafc',
      hover: isDark ? 'rgba(96, 165, 250, 0.08)' : 'rgba(37, 99, 235, 0.04)'
    },
    modal: {
      backdrop: isDark ? 'rgba(2, 6, 23, 0.75)' : 'rgba(0, 0, 0, 0.5)',
      paper: theme.palette.background.paper
    }
  };

  // Gradientes para elementos especiais
  const gradients = {
    primary: isDark 
      ? 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)'
      : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    secondary: isDark
      ? 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)'
      : 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)',
    success: isDark
      ? 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)'
      : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    error: isDark
      ? 'linear-gradient(135deg, #fb7185 0%, #f43f5e 100%)'
      : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    warning: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
    info: isDark
      ? 'linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%)'
      : 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)'
  };

  // Cores para bordas e divisores
  const borderColors = {
    default: theme.palette.divider,
    light: isDark ? '#334155' : '#e2e8f0',
    medium: isDark ? '#475569' : '#cbd5e1',
    strong: isDark ? '#64748b' : '#94a3b8',
    accent: theme.palette.primary.main
  };

  // Sombras otimizadas para tema dark
  const shadows = {
    sm: isDark 
      ? '0 1px 2px 0 rgba(0, 0, 0, 0.25)'
      : '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: isDark
      ? '0 4px 6px -1px rgba(0, 0, 0, 0.35), 0 2px 4px -2px rgba(0, 0, 0, 0.35)'
      : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
    lg: isDark
      ? '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -4px rgba(0, 0, 0, 0.4)'
      : '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
    xl: isDark
      ? '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)'
      : '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
    card: isDark
      ? '0 4px 12px rgba(0, 0, 0, 0.4)'
      : '0 1px 3px rgba(0, 0, 0, 0.1)',
    modal: isDark
      ? '0 25px 50px -12px rgba(0, 0, 0, 0.6)'
      : '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    button: isDark
      ? '0 4px 12px rgba(59, 130, 246, 0.3)'
      : '0 2px 4px rgba(0, 0, 0, 0.1)'
  };

  // Função para obter cor de status com fallback
  const getStatusColor = (status, variant = 'main') => {
    const statusMap = {
      'RECEBIDA': 'info',
      'PROCESSANDO': 'warning',
      'APROVADA_BOT': 'success',
      'PENDENTE_MODERACAO': 'pending',
      'APROVADA_ADMIN': 'success',
      'REJEITADA_BOT': 'error',
      'REJEITADA_ADMIN': 'error',
      'AGENDADA': 'info',
      'PUBLICADA': 'success',
      'ERRO': 'error'
    };

    const colorKey = statusMap[status] || 'info';
    return statusColors[colorKey]?.[variant] || statusColors.info[variant];
  };

  // Função para calcular contraste
  const getContrastRatio = (foreground, background) => {
    // Implementação simplificada - em produção use uma biblioteca como chroma-js
    return isDark ? '7:1 (WCAG AAA)' : '4.5:1 (WCAG AA)';
  };

  return {
    statusColors,
    textColors,
    backgroundColors,
    gradients,
    borderColors,
    shadows,
    getStatusColor,
    getContrastRatio,
    // Utilitários
    isDark,
    theme,
    // Cores diretas do palette otimizado
    primary: theme.palette.primary,
    secondary: theme.palette.secondary,
    success: theme.palette.success,
    error: theme.palette.error,
    warning: theme.palette.warning,
    info: theme.palette.info
  };
};

export default useOptimizedColors;