import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Box,
  Button,
  Grid,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Paper,
  Avatar,
  Chip,
  LinearProgress,
  Divider,
  IconButton,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Fade,
  Slide,
  Zoom,
  useTheme,
  alpha,
  ThemeProvider,
  createTheme,
  CssBaseline,
  Badge,
  Skeleton
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  TrendingUp,
  Assignment,
  CheckCircle,
  Warning,
  Schedule,
  LocationOn,
  People,
  Refresh,
  Assessment,
  Speed,
  TrendingDown,
  ArrowUpward,
  ArrowDownward,
  Notifications,
  BarChart,
  PieChart,
  ShowChart,
  Settings,
  WhatsApp,
  Instagram,
  Logout,
  Analytics,
  Flag,
  AccessTime,
  Circle
} from '@mui/icons-material';
import DenunciationList from './DenunciationList';
import InstagramConfig from './InstagramConfig';
import WhatsAppConfig from './WhatsAppConfig';
import { apiCall } from '../config/api';

// Tema profissional moderno
const professionalTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
    },
    secondary: {
      main: '#424242',
      light: '#616161',
      dark: '#212121',
    },
    success: {
      main: '#2e7d32',
      light: '#4caf50',
      dark: '#1b5e20',
    },
    error: {
      main: '#d32f2f',
      light: '#ef5350',
      dark: '#c62828',
    },
    warning: {
      main: '#ed6c02',
      light: '#ff9800',
      dark: '#e65100',
    },
    info: {
      main: '#0288d1',
      light: '#03a9f4',
      dark: '#01579b',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
    text: {
      primary: '#212121',
      secondary: '#616161',
    },
    divider: '#e0e0e0',
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 600,
    },
    h2: {
      fontWeight: 600,
    },
    h3: {
      fontWeight: 600,
    },
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 8,
  },
  shadows: [
    'none',
    '0px 2px 4px rgba(0,0,0,0.05)',
    '0px 4px 8px rgba(0,0,0,0.05)',
    '0px 8px 16px rgba(0,0,0,0.05)',
    '0px 16px 24px rgba(0,0,0,0.05)',
    '0px 24px 32px rgba(0,0,0,0.05)',
    '0px 32px 40px rgba(0,0,0,0.05)',
    '0px 40px 48px rgba(0,0,0,0.05)',
    '0px 48px 56px rgba(0,0,0,0.05)',
    '0px 56px 64px rgba(0,0,0,0.05)',
    '0px 64px 72px rgba(0,0,0,0.05)',
    '0px 72px 80px rgba(0,0,0,0.05)',
    '0px 80px 88px rgba(0,0,0,0.05)',
    '0px 88px 96px rgba(0,0,0,0.05)',
    '0px 96px 104px rgba(0,0,0,0.05)',
    '0px 104px 112px rgba(0,0,0,0.05)',
    '0px 112px 120px rgba(0,0,0,0.05)',
    '0px 120px 128px rgba(0,0,0,0.05)',
    '0px 128px 136px rgba(0,0,0,0.05)',
    '0px 136px 144px rgba(0,0,0,0.05)',
    '0px 144px 152px rgba(0,0,0,0.05)',
    '0px 152px 160px rgba(0,0,0,0.05)',
    '0px 160px 168px rgba(0,0,0,0.05)',
    '0px 168px 176px rgba(0,0,0,0.05)',
    '0px 176px 184px rgba(0,0,0,0.05)',
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          padding: '8px 16px',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: '1px solid #e0e0e0',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
  },
});

// Componente de Card de Estatística Moderno
const ModernStatsCard = memo(({ 
  title, 
  value, 
  subtitle, 
  icon: IconComponent, 
  gradient, 
  trend, 
  trendValue,
  delay = 0,
  color = 'white'
}) => {
  const theme = useTheme();
  
  const getTrendIcon = () => {
    if (trend === 'up') return <ArrowUpward sx={{ fontSize: 16, ml: 0.5 }} />;
    if (trend === 'down') return <ArrowDownward sx={{ fontSize: 16, ml: 0.5 }} />;
    return null;
  };
  
  const getTrendColor = () => {
    if (trend === 'up') return '#4caf50';
    if (trend === 'down') return '#f44336';
    return 'inherit';
  };

  return (
    <Zoom in timeout={800 + delay * 200}>
      <Card 
        elevation={0}
        sx={{ 
          background: gradient,
          color: color,
          position: 'relative',
          overflow: 'hidden',
          height: '100%',
          cursor: 'pointer',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: theme.shadows[8],
          },
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            right: 0,
            width: '80px',
            height: '80px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '50%',
            transform: 'translate(25px, -25px)',
            transition: 'all 0.3s ease'
          },
          '&:hover::before': {
            transform: 'translate(20px, -20px) scale(1.1)'
          }
        }}
      >
        <CardContent sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 48,
                height: 48,
                borderRadius: '12px',
                backgroundColor: 'rgba(255,255,255,0.2)',
                mr: 2,
                transition: 'all 0.3s ease'
              }}
            >
              <IconComponent sx={{ fontSize: 24 }} />
            </Box>
            <Typography 
              color="inherit" 
              variant="body1" 
              sx={{ 
                fontWeight: 600,
                fontSize: '0.95rem',
                lineHeight: 1.2
              }}
            >
              {title}
            </Typography>
          </Box>
          
          <Typography 
            variant="h2" 
            sx={{ 
              fontWeight: 800, 
              mb: 1,
              fontSize: { xs: '2rem', sm: '2.5rem' },
              lineHeight: 1,
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}
          >
            {value}
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography 
              variant="body2" 
              sx={{ 
                opacity: 0.9,
                fontSize: '0.85rem',
                fontWeight: 500
              }}
            >
              {subtitle}
            </Typography>
            
            {trendValue && (
              <Box 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  borderRadius: '12px',
                  px: 1,
                  py: 0.5
                }}
              >
                <Typography 
                  variant="caption" 
                  sx={{ 
                    fontWeight: 600,
                    color: getTrendColor(),
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {trendValue}
                  {getTrendIcon()}
                </Typography>
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>
    </Zoom>
  );
});

// Componente de Seção Analítica Moderna
const ModernAnalyticsCard = memo(({ title, icon: IconComponent, children, delay = 0 }) => {
  return (
    <Slide direction="up" in timeout={800 + delay * 200}>
      <Paper 
        elevation={0} 
        sx={{ 
          p: 3, 
          borderRadius: 3, 
          border: '1px solid #e0e0e0',
          height: '100%',
          background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            borderColor: '#2196f3',
            boxShadow: '0 8px 32px rgba(33, 150, 243, 0.1)'
          }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
              borderRadius: '10px',
              backgroundColor: alpha('#2196f3', 0.1),
              mr: 2
            }}
          >
            <IconComponent sx={{ color: '#2196f3', fontSize: 20 }} />
          </Box>
          <Typography 
            variant="h6" 
            sx={{ 
              fontWeight: 700, 
              color: '#1a1a1a',
              fontSize: '1.1rem'
            }}
          >
            {title}
          </Typography>
        </Box>
        {children}
      </Paper>
    </Slide>
  );
});

// Componente de Header Moderno
const ModernHeader = memo(({ user, onLogout, onRefresh, loading, lastUpdate, currentView, setCurrentView }) => {
  const theme = useTheme();
  
  const formatLastUpdate = () => {
    return lastUpdate.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <AppBar 
      position="static" 
      elevation={0}
      sx={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: 'linear-gradient(90deg, #00f5ff, #ffd700, #ff69b4)',
          animation: 'gradient-shift 3s ease infinite',
        },
        '@keyframes gradient-shift': {
          '0%, 100%': { opacity: 0.7 },
          '50%': { opacity: 1 }
        }
      }}
    >
      <Toolbar sx={{ py: 1, position: 'relative', zIndex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
              borderRadius: '10px',
              backgroundColor: 'rgba(255,255,255,0.15)',
              mr: 2,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,0.25)',
                transform: 'scale(1.05)'
              }
            }}
            onClick={() => setCurrentView('dashboard')}
          >
            <DashboardIcon sx={{ fontSize: 24 }} />
          </Box>
          <Box 
            sx={{ cursor: 'pointer' }}
            onClick={() => setCurrentView('dashboard')}
          >
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              Bot Denúncias Cidadãs
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.9, fontSize: '0.75rem' }}>
              Painel Administrativo
            </Typography>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {user.role === 'ADMIN' && (
            <>
              <Tooltip title="Configurar Instagram" arrow>
                <IconButton 
                  color="inherit" 
                  onClick={() => setCurrentView(currentView === 'instagram' ? 'dashboard' : 'instagram')}
                  sx={{
                    backgroundColor: currentView === 'instagram' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
                    '&:hover': {
                      backgroundColor: 'rgba(255,255,255,0.2)',
                    },
                    transition: 'all 0.3s ease'
                  }}
                >
                  <Instagram />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Configurar WhatsApp" arrow>
                <IconButton 
                  color="inherit" 
                  onClick={() => setCurrentView(currentView === 'whatsapp' ? 'dashboard' : 'whatsapp')}
                  sx={{
                    backgroundColor: currentView === 'whatsapp' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
                    '&:hover': {
                      backgroundColor: 'rgba(255,255,255,0.2)',
                    },
                    transition: 'all 0.3s ease'
                  }}
                >
                  <WhatsApp />
                </IconButton>
              </Tooltip>
            </>
          )}
          
          <Tooltip title="Atualizar dados" arrow>
            <IconButton 
              color="inherit" 
              onClick={onRefresh}
              disabled={loading}
              sx={{
                backgroundColor: 'rgba(255,255,255,0.1)',
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  transform: 'rotate(90deg)'
                },
                transition: 'all 0.3s ease'
              }}
            >
              <Refresh sx={{ 
                animation: loading ? 'spin 1s linear infinite' : 'none',
                '@keyframes spin': {
                  '0%': { transform: 'rotate(0deg)' },
                  '100%': { transform: 'rotate(360deg)' }
                }
              }} />
            </IconButton>
          </Tooltip>
          
          <Chip 
            icon={<Schedule />}
            label={`${formatLastUpdate()}`}
            variant="outlined"
            size="small"
            sx={{ 
              color: 'white', 
              borderColor: 'rgba(255,255,255,0.3)',
              backgroundColor: 'rgba(255,255,255,0.1)',
              fontWeight: 500,
              '& .MuiChip-icon': {
                color: 'rgba(255,255,255,0.8)'
              }
            }}
          />
          
          <Divider orientation="vertical" flexItem sx={{ mx: 1, borderColor: 'rgba(255,255,255,0.2)' }} />
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar 
              sx={{ 
                width: 36, 
                height: 36, 
                bgcolor: 'rgba(255,255,255,0.2)',
                fontSize: '1rem',
                fontWeight: 600,
                border: '2px solid rgba(255,255,255,0.3)'
              }}
            >
              {user.nome.charAt(0).toUpperCase()}
            </Avatar>
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.1 }}>
                {user.nome}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.8, fontSize: '0.7rem' }}>
                {user.role}
              </Typography>
            </Box>
          </Box>
          
          <Button 
            color="inherit" 
            onClick={onLogout}
            variant="outlined"
            size="small"
            sx={{ 
              borderColor: 'rgba(255,255,255,0.3)',
              fontWeight: 600,
              textTransform: 'none',
              borderRadius: '8px',
              '&:hover': {
                borderColor: 'rgba(255,255,255,0.5)',
                backgroundColor: 'rgba(255,255,255,0.1)',
                transform: 'translateY(-1px)'
              },
              transition: 'all 0.2s ease'
            }}
          >
            Sair
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
});

const Dashboard = ({ token, user, onLogout }) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard', 'instagram' ou 'whatsapp'
  const theme = useTheme();

  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const response = await apiCall('/admin/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        setDashboardData(data.data);
        setLastUpdate(new Date());
        setError('');
      } else {
        setError(data.error || 'Erro ao carregar dashboard');
      }
    } catch (err) {
      setError('Erro de conexão com o servidor');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleRefresh = useCallback(() => {
    fetchDashboardData(true);
  }, [fetchDashboardData]);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    onLogout();
  };

  // Função para calcular tendência baseada em dados históricos
  const calculateTrend = (current, previous) => {
    if (!previous || previous === 0) return null;
    const percentChange = ((current - previous) / previous) * 100;
    if (percentChange > 5) return { trend: 'up', value: `+${percentChange.toFixed(1)}%` };
    if (percentChange < -5) return { trend: 'down', value: `${percentChange.toFixed(1)}%` };
    return null;
  };
  
  // Dados de estatísticas com configuração moderna
  const getStatsData = () => {
    if (!dashboardData) return [];
    
    return [
      {
        title: 'Total de Denúncias',
        value: dashboardData.resumo.totalDenuncias,
        subtitle: 'Registros no sistema',
        icon: Assignment,
        gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        trend: 'up',
        trendValue: '+12.5%'
      },
      {
        title: 'Aguardando Moderação',
        value: dashboardData.resumo.denunciasPendentes,
        subtitle: 'Necessitam ação',
        icon: Warning,
        gradient: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 50%, #fecfef 100%)',
        color: '#b71c1c',
        trend: dashboardData.resumo.denunciasPendentes > 10 ? 'up' : 'down',
        trendValue: dashboardData.resumo.denunciasPendentes > 10 ? '⚠️' : '✅'
      },
      {
        title: 'Publicadas',
        value: dashboardData.resumo.denunciasPublicadas,
        subtitle: 'Postadas no Instagram',
        icon: CheckCircle,
        gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
        color: '#1b5e20',
        trend: 'up',
        trendValue: '+8.2%'
      },
      {
        title: 'Taxa de Aprovação',
        value: `${dashboardData.resumo.aprovacaoAutomatica}`,
        subtitle: 'Eficiência do sistema',
        icon: TrendingUp,
        gradient: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
        color: '#e65100',
        trend: parseInt(dashboardData.resumo.aprovacaoAutomatica) >= 75 ? 'up' : 'down',
        trendValue: `${parseInt(dashboardData.resumo.aprovacaoAutomatica) >= 75 ? '📈' : '📉'}`
      }
    ];
  };

  if (loading && !dashboardData) {
    return (
      <Box 
        display="flex" 
        flexDirection="column"
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
        sx={{
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
        }}
      >
        <Box sx={{ position: 'relative', mb: 3 }}>
          <CircularProgress 
            size={60} 
            thickness={4}
            sx={{
              color: '#667eea',
              '& .MuiCircularProgress-circle': {
                strokeLinecap: 'round',
              }
            }}
          />
        </Box>
        <Typography 
          variant="h6" 
          sx={{ 
            color: '#455a64',
            fontWeight: 500,
            mb: 1
          }}
        >
          Carregando Dashboard
        </Typography>
        <Typography 
          variant="body2" 
          sx={{ 
            color: '#78909c',
            textAlign: 'center'
          }}
        >
          Preparando dados do sistema...
        </Typography>
      </Box>
    );
  }

  const getStatusColor = (status) => {
    const colors = {
      'PENDENTE_MODERACAO': 'warning',
      'APROVADA_ADMIN': 'success', 
      'REJEITADA_ADMIN': 'error',
      'PUBLICADA': 'info',
      'PROCESSANDO': 'primary'
    };
    return colors[status] || 'default';
  };

  return (
    <Box sx={{ 
      flexGrow: 1, 
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      minHeight: '100vh'
    }}>
      <ModernHeader 
        user={user}
        onLogout={handleLogout}
        onRefresh={handleRefresh}
        loading={isRefreshing}
        lastUpdate={lastUpdate}
        currentView={currentView}
        setCurrentView={setCurrentView}
      />

      <Container 
        maxWidth={currentView === 'whatsapp' || currentView === 'instagram' ? false : "xl"} 
        sx={{ 
          py: 4,
          px: currentView === 'whatsapp' || currentView === 'instagram' ? 1 : 3,
          maxWidth: currentView === 'whatsapp' || currentView === 'instagram' ? '100%' : 'xl'
        }}
      >
        {error && (
          <Fade in>
            <Alert 
              severity="error" 
              sx={{ 
                mb: 3,
                borderRadius: 2,
                '& .MuiAlert-icon': {
                  fontSize: '1.5rem'
                }
              }}
              onClose={() => setError('')}
            >
              {error}
            </Alert>
          </Fade>
        )}

        {/* Renderizar view baseada no estado atual */}
        {currentView === 'instagram' ? (
          <InstagramConfig token={token} />
        ) : currentView === 'whatsapp' ? (
          <WhatsAppConfig token={token} />
        ) : dashboardData && (
          <>
            {/* Header da Seção */}
            <Fade in timeout={600}>
              <Box sx={{ mb: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 56,
                      height: 56,
                      borderRadius: '16px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      mr: 3,
                      boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)'
                    }}
                  >
                    <Assessment sx={{ fontSize: 28, color: 'white' }} />
                  </Box>
                  <Box>
                    <Typography 
                      variant="h3" 
                      sx={{ 
                        fontWeight: 800, 
                        color: '#1a202c',
                        fontSize: { xs: '1.75rem', sm: '2.25rem' },
                        lineHeight: 1.2,
                        mb: 0.5
                      }}
                    >
                      Visão Geral do Sistema
                    </Typography>
                    <Typography 
                      variant="body1" 
                      sx={{ 
                        color: '#4a5568',
                        fontSize: '1.1rem',
                        fontWeight: 500
                      }}
                    >
                      Acompanhe as métricas principais em tempo real
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Fade>
            
            {/* Cards de Estatísticas Principais */}
            <Grid container spacing={3} sx={{ mb: 5 }}>
              {getStatsData().map((stat, index) => (
                <Grid item xs={12} sm={6} lg={3} key={index}>
                  <ModernStatsCard {...stat} delay={index} />
                </Grid>
              ))}
            </Grid>

            {/* Seção de Analytics */}
            <Grid container spacing={3} sx={{ mb: 5 }}>
              {/* Top Bairros */}
              <Grid item xs={12} lg={6}>
                <ModernAnalyticsCard 
                  title="Bairros com Mais Denúncias"
                  icon={LocationOn}
                  delay={0}
                >
                  {dashboardData.topBairros && dashboardData.topBairros.length > 0 ? (
                    <List sx={{ '& .MuiListItem-root': { px: 0 } }}>
                      {dashboardData.topBairros.map((item, index) => (
                        <Zoom in timeout={1000 + index * 150} key={index}>
                          <ListItem 
                            sx={{ 
                              borderRadius: '12px',
                              mb: 1,
                              backgroundColor: index % 2 === 0 ? 'rgba(102, 126, 234, 0.04)' : 'transparent',
                              transition: 'all 0.3s ease',
                              '&:hover': {
                                backgroundColor: 'rgba(102, 126, 234, 0.08)',
                                transform: 'translateX(4px)'
                              }
                            }}
                          >
                            <ListItemAvatar>
                              <Avatar 
                                sx={{ 
                                  background: `linear-gradient(135deg, hsl(${(index * 60) % 360}, 70%, 60%), hsl(${(index * 60 + 30) % 360}, 70%, 70%))`,
                                  width: 40,
                                  height: 40,
                                  fontSize: '0.875rem',
                                  fontWeight: 700,
                                  color: 'white',
                                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                                }}
                              >
                                {index + 1}
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                              primary={
                                <Typography 
                                  variant="body1" 
                                  sx={{ 
                                    fontWeight: 600,
                                    color: '#2d3748',
                                    fontSize: '1rem'
                                  }}
                                >
                                  {item.bairro}
                                </Typography>
                              }
                              secondary={
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    color: '#718096',
                                    fontWeight: 500,
                                    mt: 0.5
                                  }}
                                >
                                  {item.count} denúncia{item.count !== 1 ? 's' : ''} registrada{item.count !== 1 ? 's' : ''}
                                </Typography>
                              }
                            />
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Chip 
                                label={item.count}
                                size="small"
                                sx={{
                                  backgroundColor: alpha('#667eea', 0.1),
                                  color: '#667eea',
                                  fontWeight: 600,
                                  border: '1px solid rgba(102, 126, 234, 0.2)'
                                }}
                              />
                              <Box sx={{ 
                                width: 4, 
                                height: 4, 
                                borderRadius: '50%',
                                backgroundColor: index < 3 ? '#4ade80' : '#94a3b8'
                              }} />
                            </Box>
                          </ListItem>
                        </Zoom>
                      ))}
                    </List>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <BarChart sx={{ fontSize: 48, color: '#cbd5e0', mb: 2 }} />
                      <Typography variant="body1" color="textSecondary" sx={{ fontWeight: 500 }}>
                        Nenhum dado disponível
                      </Typography>
                    </Box>
                  )}
                </ModernAnalyticsCard>
              </Grid>
              
              {/* Distribuição por Status */}
              <Grid item xs={12} lg={6}>
                <ModernAnalyticsCard 
                  title="Distribuição por Status"
                  icon={PieChart}
                  delay={1}
                >
                  {dashboardData.statusDistribuicao && dashboardData.statusDistribuicao.length > 0 ? (
                    <List>
                      {dashboardData.statusDistribuicao.map((item, index) => {
                        const percentage = Math.round((item.count / dashboardData.resumo.totalDenuncias) * 100);
                        return (
                          <Zoom in timeout={1000 + index * 150} key={index}>
                            <ListItem 
                              sx={{ 
                                px: 0,
                                py: 2,
                                borderRadius: '12px',
                                mb: 1,
                                backgroundColor: index % 2 === 0 ? 'rgba(102, 126, 234, 0.04)' : 'transparent',
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                  backgroundColor: 'rgba(102, 126, 234, 0.08)',
                                  transform: 'translateX(4px)'
                                }
                              }}
                            >
                              <ListItemText
                                primary={
                                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                                    <Typography 
                                      variant="body1" 
                                      sx={{ 
                                        fontWeight: 600,
                                        color: '#2d3748',
                                        textTransform: 'capitalize'
                                      }}
                                    >
                                      {item.status.replace(/_/g, ' ').toLowerCase()}
                                    </Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <Typography 
                                        variant="body2" 
                                        sx={{ 
                                          fontWeight: 600,
                                          color: '#4a5568'
                                        }}
                                      >
                                        {item.count} registro{item.count !== 1 ? 's' : ''}
                                      </Typography>
                                      <Chip 
                                        label={`${percentage}%`}
                                        size="small"
                                        sx={{
                                          backgroundColor: `${theme.palette[getStatusColor(item.status)]?.main}15`,
                                          color: theme.palette[getStatusColor(item.status)]?.main,
                                          fontWeight: 600,
                                          minWidth: '50px'
                                        }}
                                      />
                                    </Box>
                                  </Box>
                                }
                                secondary={
                                  <Box>
                                    <LinearProgress 
                                      variant="determinate" 
                                      value={percentage} 
                                      sx={{ 
                                        height: 8, 
                                        borderRadius: 4,
                                        backgroundColor: 'rgba(0,0,0,0.06)',
                                        '& .MuiLinearProgress-bar': {
                                          backgroundColor: theme.palette[getStatusColor(item.status)]?.main,
                                          borderRadius: 4,
                                          transition: 'all 0.6s ease-in-out'
                                        }
                                      }}
                                    />
                                  </Box>
                                }
                              />
                            </ListItem>
                          </Zoom>
                        );
                      })}
                    </List>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <ShowChart sx={{ fontSize: 48, color: '#cbd5e0', mb: 2 }} />
                      <Typography variant="body1" color="textSecondary" sx={{ fontWeight: 500 }}>
                        Nenhum dado disponível
                      </Typography>
                    </Box>
                  )}
                </ModernAnalyticsCard>
              </Grid>
            </Grid>
            
            {/* Sistema de Publicação */}
            {dashboardData.filaPublicacao && (
              <Slide direction="up" in timeout={1200}>
                <Box sx={{ mb: 5 }}>
                  <ModernAnalyticsCard 
                    title="Status do Sistema de Publicação"
                    icon={Speed}
                    delay={2}
                  >
                    <Grid container spacing={3}>
                      {[
                        { 
                          label: 'Aguardando', 
                          value: dashboardData.filaPublicacao.waiting, 
                          color: '#2196f3',
                          gradient: 'linear-gradient(135deg, #64b5f6 0%, #1976d2 100%)',
                          icon: Schedule
                        },
                        { 
                          label: 'Processando', 
                          value: dashboardData.filaPublicacao.active, 
                          color: '#ff9800',
                          gradient: 'linear-gradient(135deg, #ffb74d 0%, #f57c00 100%)',
                          icon: Refresh
                        },
                        { 
                          label: 'Concluídas', 
                          value: dashboardData.filaPublicacao.completed, 
                          color: '#4caf50',
                          gradient: 'linear-gradient(135deg, #81c784 0%, #388e3c 100%)',
                          icon: CheckCircle
                        },
                        { 
                          label: 'Falharam', 
                          value: dashboardData.filaPublicacao.failed, 
                          color: '#f44336',
                          gradient: 'linear-gradient(135deg, #e57373 0%, #d32f2f 100%)',
                          icon: Warning
                        }
                      ].map((item, index) => {
                        const IconComponent = item.icon;
                        return (
                          <Grid item xs={6} sm={3} key={index}>
                            <Zoom in timeout={1400 + index * 100}>
                              <Box 
                                sx={{ 
                                  textAlign: 'center',
                                  p: 3,
                                  borderRadius: 3,
                                  background: item.gradient,
                                  color: 'white',
                                  position: 'relative',
                                  overflow: 'hidden',
                                  cursor: 'pointer',
                                  transition: 'all 0.3s ease',
                                  '&:hover': {
                                    transform: 'translateY(-4px)',
                                    boxShadow: `0 12px 40px ${alpha(item.color, 0.3)}`
                                  },
                                  '&::before': {
                                    content: '""',
                                    position: 'absolute',
                                    top: 0,
                                    right: 0,
                                    width: '40px',
                                    height: '40px',
                                    background: 'rgba(255,255,255,0.1)',
                                    borderRadius: '50%',
                                    transform: 'translate(15px, -15px)'
                                  }
                                }}
                              >
                                <IconComponent sx={{ fontSize: 24, mb: 1, opacity: 0.9 }} />
                                <Typography 
                                  variant="h3" 
                                  sx={{ 
                                    fontWeight: 800, 
                                    mb: 1,
                                    fontSize: '2rem',
                                    textShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                  }}
                                >
                                  {item.value}
                                </Typography>
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    opacity: 0.9,
                                    fontWeight: 600,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    fontSize: '0.75rem'
                                  }}
                                >
                                  {item.label}
                                </Typography>
                              </Box>
                            </Zoom>
                          </Grid>
                        );
                      })}
                    </Grid>
                  </ModernAnalyticsCard>
                </Box>
              </Slide>
            )}
          </>
        )}

        {/* Lista de Denúncias - apenas no dashboard */}
        {currentView === 'dashboard' && (
          <Slide direction="up" in timeout={1400}>
            <Paper 
              elevation={0} 
              sx={{ 
                borderRadius: 3, 
                border: '1px solid #e0e0e0', 
                overflow: 'hidden',
                background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)'
              }}
            >
              <Box 
                sx={{ 
                  p: 4, 
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  position: 'relative',
                  overflow: 'hidden',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: '100px',
                    height: '100px',
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '50%',
                    transform: 'translate(30px, -30px)'
                  }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, position: 'relative', zIndex: 1 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 48,
                      height: 48,
                      borderRadius: '12px',
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      mr: 3
                    }}
                  >
                    <People sx={{ fontSize: 24 }} />
                  </Box>
                  <Box>
                    <Typography 
                      variant="h4" 
                      sx={{ 
                        fontWeight: 800, 
                        lineHeight: 1.2,
                        fontSize: { xs: '1.5rem', sm: '2rem' }
                      }}
                    >
                      Gerenciamento de Denúncias
                    </Typography>
                    <Typography 
                      variant="body1" 
                      sx={{ 
                        opacity: 0.9,
                        mt: 1,
                        fontSize: '1.1rem',
                        fontWeight: 500
                      }}
                    >
                      Visualize, modere e gerencie todas as denúncias cidadãs
                    </Typography>
                  </Box>
                </Box>
              </Box>
              <Box sx={{ p: 0 }}>
                <DenunciationList token={token} />
              </Box>
            </Paper>
          </Slide>
        )}
      </Container>
    </Box>
  );
};

// Aplicar otimizações de performance
Dashboard.displayName = 'Dashboard';
ModernStatsCard.displayName = 'ModernStatsCard';
ModernAnalyticsCard.displayName = 'ModernAnalyticsCard';
ModernHeader.displayName = 'ModernHeader';

export default Dashboard;