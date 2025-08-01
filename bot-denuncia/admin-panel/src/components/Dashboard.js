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
  useTheme,
  alpha,
  CssBaseline,
  Stack,
  Badge
} from '@mui/material';
import { useCustomTheme } from '../contexts/ThemeContext';
import ThemeToggle from './ThemeToggle';
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
  BarChart,
  PieChart,
  ShowChart,
  WhatsApp,
  Instagram,
  Logout,
  Analytics,
  AccessTime,
  Circle,
  NotificationsNone
} from '@mui/icons-material';
import DenunciationList from './DenunciationList';
import InstagramConfig from './InstagramConfig';
import WhatsAppConfig from './WhatsAppConfig';
import PostingScheduleCard from './PostingScheduleCard';
import MonitoringDashboardSimple from './MonitoringDashboardSimple';
import SmartNotifications from './SmartNotifications';
import { apiCall } from '../config/api';


// Card de estatística profissional
const ProfessionalStatsCard = memo(({
  title,
  value,
  subtitle,
  icon: IconComponent,
  trend,
  trendValue,
  delay = 0,
  color
}) => {
  const theme = useTheme();
  
  const getTrendIcon = () => {
    if (trend === 'up') return <TrendingUp sx={{ fontSize: 14 }} />;
    if (trend === 'down') return <TrendingDown sx={{ fontSize: 14 }} />;
    return null;
  };
  
  const getTrendColor = () => {
    if (trend === 'up') return theme.palette.success.main;
    if (trend === 'down') return theme.palette.error.main;
    return theme.palette.text.secondary;
  };

  return (
    <Fade in timeout={300 + delay * 100}>
      <Card
        elevation={0}
        sx={{
          height: '100%',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
            borderColor: alpha(color || theme.palette.primary.main, 0.3),
          },
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 48,
                height: 48,
                borderRadius: 2,
                backgroundColor: alpha(color || theme.palette.primary.main, 0.1),
              }}
            >
              <IconComponent sx={{ fontSize: 24, color: color || theme.palette.primary.main }} />
            </Box>
            {trendValue && (
              <Chip
                size="small"
                icon={getTrendIcon()}
                label={trendValue}
                sx={{
                  height: 28,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  backgroundColor: alpha(getTrendColor(), 0.1),
                  color: getTrendColor(),
                  '& .MuiChip-icon': {
                    fontSize: 14,
                    color: getTrendColor(),
                  },
                }}
              />
            )}
          </Box>
          
          <Typography
            variant="h3"
            sx={{
              fontWeight: 700,
              fontSize: '2.25rem',
              lineHeight: 1.2,
              color: theme.palette.text.primary,
              mb: 1,
            }}
          >
            {value}
          </Typography>
          
          <Typography
            variant="body1"
            sx={{
              color: theme.palette.text.primary,
              fontWeight: 600,
              fontSize: '0.875rem',
              mb: 0.5,
            }}
          >
            {title}
          </Typography>
          
          <Typography
            variant="body2"
            sx={{
              color: theme.palette.text.secondary,
              fontSize: '0.75rem',
            }}
          >
            {subtitle}
          </Typography>
        </CardContent>
      </Card>
    </Fade>
  );
});

// Card analítico profissional
const ProfessionalAnalyticsCard = memo(({ title, icon: IconComponent, children, delay = 0 }) => {
  const theme = useTheme();
  
  return (
    <Fade in timeout={400 + delay * 100}>
      <Card elevation={0} sx={{ height: '100%' }}>
        <Box sx={{ p: 3, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 36,
                height: 36,
                borderRadius: 1.5,
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                mr: 2,
              }}
            >
              <IconComponent sx={{ color: theme.palette.primary.main, fontSize: 20 }} />
            </Box>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                color: theme.palette.text.primary,
                fontSize: '1rem',
              }}
            >
              {title}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      </Card>
    </Fade>
  );
});

// Header profissional
const ProfessionalHeader = memo(({ user, onLogout, onRefresh, loading, lastUpdate, currentView, setCurrentView, token }) => {
  const theme = useTheme();
  
  const formatLastUpdate = () => {
    const now = new Date();
    const diff = now - lastUpdate;
    
    if (diff < 60000) {
      return 'Agora mesmo';
    } else if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `Há ${minutes} minuto${minutes > 1 ? 's' : ''}`;
    } else {
      return lastUpdate.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  };

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        backgroundColor: theme.palette.background.paper,
        borderBottom: `1px solid ${theme.palette.divider}`,
        color: theme.palette.text.primary,
      }}
    >
      <Toolbar sx={{ px: 3, minHeight: '64px !important' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
              borderRadius: 2,
              backgroundColor: theme.palette.primary.main,
              mr: 3,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: theme.palette.primary.dark,
              }
            }}
            onClick={() => setCurrentView('dashboard')}
          >
            <DashboardIcon sx={{ fontSize: 20, color: 'white' }} />
          </Box>
          <Box>
            <Typography 
              variant="h6" 
              sx={{ 
                fontWeight: 700, 
                fontSize: '1.25rem',
                cursor: 'pointer',
                color: theme.palette.text.primary,
                '&:hover': {
                  color: theme.palette.primary.main,
                },
                transition: 'color 0.2s ease'
              }}
              onClick={() => setCurrentView('dashboard')}
            >
              Dashboard Bot Denúncias
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: theme.palette.text.secondary,
                fontSize: '0.875rem',
                mt: -0.5
              }}
            >
              Painel de administração
            </Typography>
          </Box>
        </Box>
        
        <Stack direction="row" spacing={1} alignItems="center">
          {user.role === 'ADMIN' && (
            <>
              <Tooltip title="Configurar Instagram" placement="bottom">
                <IconButton
                  size="medium"
                  onClick={() => setCurrentView(currentView === 'instagram' ? 'dashboard' : 'instagram')}
                  sx={{
                    color: currentView === 'instagram' ? theme.palette.primary.main : theme.palette.text.secondary,
                    backgroundColor: currentView === 'instagram' ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                      color: theme.palette.primary.main,
                    },
                  }}
                >
                  <Instagram />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Configurar WhatsApp" placement="bottom">
                <IconButton
                  size="medium"
                  onClick={() => setCurrentView(currentView === 'whatsapp' ? 'dashboard' : 'whatsapp')}
                  sx={{
                    color: currentView === 'whatsapp' ? theme.palette.primary.main : theme.palette.text.secondary,
                    backgroundColor: currentView === 'whatsapp' ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                      color: theme.palette.primary.main,
                    },
                  }}
                >
                  <WhatsApp />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Monitoramento do Sistema" placement="bottom">
                <IconButton
                  size="medium"
                  onClick={() => setCurrentView(currentView === 'monitoring' ? 'dashboard' : 'monitoring')}
                  sx={{
                    color: currentView === 'monitoring' ? theme.palette.primary.main : theme.palette.text.secondary,
                    backgroundColor: currentView === 'monitoring' ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                      color: theme.palette.primary.main,
                    },
                  }}
                >
                  <Analytics />
                </IconButton>
              </Tooltip>
              
              
              <Divider orientation="vertical" flexItem sx={{ mx: 1, height: 24, alignSelf: 'center' }} />
            </>
          )}
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2 }}>
            <AccessTime sx={{ fontSize: 16, color: theme.palette.text.secondary }} />
            <Typography
              variant="body2"
              sx={{
                color: theme.palette.text.secondary,
                fontSize: '0.875rem',
                fontWeight: 500,
              }}
            >
              {formatLastUpdate()}
            </Typography>
          </Box>
          
          <Tooltip title="Atualizar dados" placement="bottom">
            <IconButton
              size="medium"
              onClick={onRefresh}
              disabled={loading}
              sx={{
                color: theme.palette.text.secondary,
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  color: theme.palette.primary.main,
                },
              }}
            >
              <Refresh
                sx={{
                  fontSize: 20,
                  animation: loading ? 'spin 1s linear infinite' : 'none',
                  '@keyframes spin': {
                    '0%': { transform: 'rotate(0deg)' },
                    '100%': { transform: 'rotate(360deg)' }
                  }
                }}
              />
            </IconButton>
          </Tooltip>
          
          <Divider orientation="vertical" flexItem sx={{ mx: 2, height: 24, alignSelf: 'center' }} />
          
          <SmartNotifications 
            token={token}
            onNotificationAction={(notification, action) => {
              // Implementar ações específicas baseadas na notificação
              if (action === 'view_denuncia' && notification.data?.denunciaId) {
                // Navegar para a denúncia específica
                setCurrentView('dashboard');
              } else if (action === 'investigate') {
                setCurrentView('monitoring');
              }
            }}
          />
          
          <ThemeToggle variant="contained" />
          
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar
              sx={{
                width: 36,
                height: 36,
                bgcolor: theme.palette.primary.main,
                fontSize: '0.875rem',
                fontWeight: 600,
              }}
            >
              {user.nome.charAt(0).toUpperCase()}
            </Avatar>
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                {user.nome}
              </Typography>
              <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontSize: '0.75rem' }}>
                {user.role === 'ADMIN' ? 'Administrador' : 'Usuário'}
              </Typography>
            </Box>
          </Stack>
          
          <Button
            onClick={onLogout}
            startIcon={<Logout fontSize="small" />}
            size="small"
            sx={{
              ml: 2,
              color: theme.palette.text.secondary,
              '&:hover': {
                backgroundColor: alpha(theme.palette.error.main, 0.08),
                color: theme.palette.error.main,
              },
            }}
          >
            Sair
          </Button>
        </Stack>
      </Toolbar>
    </AppBar>
  );
});

const Dashboard = ({ token, user, onLogout }) => {
  const { theme } = useCustomTheme();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');

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

  const getStatsData = () => {
    if (!dashboardData) return [];
    
    return [
      {
        title: 'Total de Denúncias',
        value: dashboardData.resumo.totalDenuncias,
        subtitle: 'Registros no sistema',
        icon: Assignment,
        color: '#2563eb',
        trend: 'up',
        trendValue: '+12.5%'
      },
      {
        title: 'Aguardando Moderação',
        value: dashboardData.resumo.denunciasPendentes,
        subtitle: 'Necessitam ação',
        icon: Warning,
        color: '#f59e0b',
        trend: dashboardData.resumo.denunciasPendentes > 10 ? 'up' : 'down',
        trendValue: dashboardData.resumo.denunciasPendentes > 10 ? 'Alto' : 'Baixo'
      },
      {
        title: 'Publicadas',
        value: dashboardData.resumo.denunciasPublicadas,
        subtitle: 'Postadas no Instagram',
        icon: CheckCircle,
        color: '#10b981',
        trend: 'up',
        trendValue: '+8.2%'
      },
      {
        title: 'Taxa de Eficiência',
        value: `${dashboardData.resumo.aprovacaoAutomatica}%`,
        subtitle: 'Aprovação automática',
        icon: TrendingUp,
        color: '#06b6d4',
        trend: parseInt(dashboardData.resumo.aprovacaoAutomatica) >= 75 ? 'up' : 'down',
        trendValue: parseInt(dashboardData.resumo.aprovacaoAutomatica) >= 75 ? 'Excelente' : 'Regular'
      }
    ];
  };

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

  if (loading && !dashboardData) {
    return (
      <>
        <CssBaseline />
        <Box 
          display="flex" 
          flexDirection="column"
          justifyContent="center" 
          alignItems="center" 
          minHeight="100vh"
          sx={{ backgroundColor: theme.palette.background.default }}
        >
          <CircularProgress 
            size={48} 
            thickness={4}
            sx={{ color: theme.palette.primary.main, mb: 3 }}
          />
          <Typography 
            variant="h6" 
            sx={{ 
              color: theme.palette.text.primary,
              fontWeight: 600,
              mb: 1
            }}
          >
            Carregando Dashboard
          </Typography>
          <Typography 
            variant="body2" 
            sx={{ 
              color: theme.palette.text.secondary,
              textAlign: 'center'
            }}
          >
            Preparando dados do sistema...
          </Typography>
        </Box>
      </>
    );
  }

  return (
    <>
      <CssBaseline />
      <Box sx={{ 
        flexGrow: 1, 
        backgroundColor: theme.palette.background.default,
        minHeight: '100vh'
      }}>
        <ProfessionalHeader 
          user={user}
          onLogout={handleLogout}
          onRefresh={handleRefresh}
          loading={isRefreshing}
          lastUpdate={lastUpdate}
          currentView={currentView}
          setCurrentView={setCurrentView}
          token={token}
        />

        <Container maxWidth="xl" sx={{ py: 4 }}>
          {error && (
            <Alert 
              severity="error" 
              sx={{ mb: 3, borderRadius: 2 }}
              onClose={() => setError('')}
            >
              {error}
            </Alert>
          )}

          {currentView === 'instagram' ? (
            <InstagramConfig token={token} />
          ) : currentView === 'whatsapp' ? (
            <WhatsAppConfig token={token} />
          ) : currentView === 'monitoring' ? (
            <MonitoringDashboardSimple 
              token={token} 
              onClose={() => setCurrentView('dashboard')}
            />
          ) : dashboardData && (
            <>
              {/* Header da seção */}
              <Box sx={{ mb: 4 }}>
                <Typography 
                  variant="h4" 
                  sx={{ 
                    fontWeight: 700, 
                    color: theme.palette.text.primary,
                    mb: 1
                  }}
                >
                  Visão Geral do Sistema
                </Typography>
                <Typography 
                  variant="body1" 
                  sx={{ 
                    color: theme.palette.text.secondary,
                    fontSize: '1rem'
                  }}
                >
                  Acompanhe as métricas e estatísticas em tempo real
                </Typography>
              </Box>
              
              {/* Cards de estatísticas */}
              <Grid container spacing={3} sx={{ mb: 4 }}>
                {getStatsData().map((stat, index) => (
                  <Grid item xs={12} sm={6} lg={3} key={index}>
                    <ProfessionalStatsCard {...stat} delay={index} />
                  </Grid>
                ))}
              </Grid>

              {/* Seção de Analytics - 3 cards na mesma linha */}
              <Grid container spacing={3} sx={{ mb: 4 }}>
                {/* Agenda de Postagens */}
                <Grid item xs={12} md={6} lg={4}>
                  <PostingScheduleCard 
                    agendaPostagens={dashboardData.agendaPostagens || []}
                    onRefresh={handleRefresh}
                    loading={isRefreshing}
                  />
                </Grid>

                {/* Top Bairros */}
                <Grid item xs={12} md={6} lg={4}>
                  <ProfessionalAnalyticsCard 
                    title="Bairros com Mais Denúncias"
                    icon={LocationOn}
                    delay={0}
                  >
                    {dashboardData.topBairros && dashboardData.topBairros.length > 0 ? (
                      <Stack spacing={2}>
                        {dashboardData.topBairros.map((item, index) => (
                          <Box 
                            key={index}
                            sx={{ 
                              display: 'flex', 
                              alignItems: 'center',
                              p: 2,
                              borderRadius: 2,
                              backgroundColor: alpha(theme.palette.primary.main, 0.04),
                              '&:hover': {
                                backgroundColor: alpha(theme.palette.primary.main, 0.08),
                              },
                              transition: 'background-color 0.2s ease'
                            }}
                          >
                            <Avatar 
                              sx={{ 
                                bgcolor: theme.palette.primary.main,
                                width: 32,
                                height: 32,
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                mr: 2
                              }}
                            >
                              {index + 1}
                            </Avatar>
                            <Box sx={{ flexGrow: 1 }}>
                              <Typography 
                                variant="body1" 
                                sx={{ 
                                  fontWeight: 600,
                                  color: theme.palette.text.primary,
                                  mb: 0.5
                                }}
                              >
                                {item.bairro}
                              </Typography>
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  color: theme.palette.text.secondary,
                                }}
                              >
                                {item.count} denúncia{item.count !== 1 ? 's' : ''}
                              </Typography>
                            </Box>
                            <Chip 
                              label={item.count}
                              size="small"
                              sx={{
                                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                color: theme.palette.primary.main,
                                fontWeight: 600,
                              }}
                            />
                          </Box>
                        ))}
                      </Stack>
                    ) : (
                      <Box sx={{ textAlign: 'center', py: 4 }}>
                        <BarChart sx={{ fontSize: 48, color: theme.palette.text.secondary, mb: 2 }} />
                        <Typography variant="body1" color="textSecondary">
                          Nenhum dado disponível
                        </Typography>
                      </Box>
                    )}
                  </ProfessionalAnalyticsCard>
                </Grid>

                {/* Distribuição por Status */}
                <Grid item xs={12} md={12} lg={4}>
                  <ProfessionalAnalyticsCard 
                    title="Distribuição por Status"
                    icon={PieChart}
                    delay={1}
                  >
                    {dashboardData.statusDistribuicao && dashboardData.statusDistribuicao.length > 0 ? (
                      <Stack spacing={2}>
                        {dashboardData.statusDistribuicao.map((item, index) => {
                          const percentage = Math.round((item.count / dashboardData.resumo.totalDenuncias) * 100);
                          const statusColor = theme.palette[getStatusColor(item.status)]?.main;
                          
                          return (
                            <Box key={index} sx={{ p: 2, borderRadius: 2, backgroundColor: alpha(statusColor || '#000', 0.04) }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                                <Typography 
                                  variant="body1" 
                                  sx={{ 
                                    fontWeight: 600,
                                    color: theme.palette.text.primary,
                                    textTransform: 'capitalize'
                                  }}
                                >
                                  {item.status.replace(/_/g, ' ').toLowerCase()}
                                </Typography>
                                <Chip 
                                  label={`${percentage}%`}
                                  size="small"
                                  sx={{
                                    backgroundColor: alpha(statusColor || '#000', 0.1),
                                    color: statusColor,
                                    fontWeight: 600,
                                  }}
                                />
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Typography 
                                  variant="body2" 
                                  sx={{ color: theme.palette.text.secondary }}
                                >
                                  {item.count} registro{item.count !== 1 ? 's' : ''}
                                </Typography>
                                <LinearProgress 
                                  variant="determinate" 
                                  value={percentage} 
                                  sx={{ 
                                    width: '40%',
                                    height: 6, 
                                    borderRadius: 3,
                                    backgroundColor: alpha(statusColor || '#000', 0.1),
                                    '& .MuiLinearProgress-bar': {
                                      backgroundColor: statusColor,
                                      borderRadius: 3,
                                    }
                                  }}
                                />
                              </Box>
                            </Box>
                          );
                        })}
                      </Stack>
                    ) : (
                      <Box sx={{ textAlign: 'center', py: 4 }}>
                        <ShowChart sx={{ fontSize: 48, color: theme.palette.text.secondary, mb: 2 }} />
                        <Typography variant="body1" color="textSecondary">
                          Nenhum dado disponível
                        </Typography>
                      </Box>
                    )}
                  </ProfessionalAnalyticsCard>
                </Grid>
              </Grid>
              
              {/* Sistema de Publicação */}
              {dashboardData.filaPublicacao && (
                <Card elevation={0} sx={{ mb: 4 }}>
                  <Box sx={{ p: 3, borderBottom: `1px solid ${theme.palette.divider}` }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 36,
                          height: 36,
                          borderRadius: 1.5,
                          backgroundColor: alpha(theme.palette.primary.main, 0.1),
                          mr: 2,
                        }}
                      >
                        <Speed sx={{ color: theme.palette.primary.main, fontSize: 20 }} />
                      </Box>
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 600,
                          color: theme.palette.text.primary,
                          fontSize: '1rem',
                        }}
                      >
                        Sistema de Publicação
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ p: 3 }}>
                    <Grid container spacing={3}>
                      {[
                        { 
                          label: 'Aguardando', 
                          value: dashboardData.filaPublicacao.waiting, 
                          color: theme.palette.info.main,
                          icon: Schedule
                        },
                        { 
                          label: 'Processando', 
                          value: dashboardData.filaPublicacao.active, 
                          color: theme.palette.warning.main,
                          icon: Refresh
                        },
                        { 
                          label: 'Concluídas', 
                          value: dashboardData.filaPublicacao.completed, 
                          color: theme.palette.success.main,
                          icon: CheckCircle
                        },
                        { 
                          label: 'Falharam', 
                          value: dashboardData.filaPublicacao.failed, 
                          color: theme.palette.error.main,
                          icon: Warning
                        }
                      ].map((item, index) => {
                        const IconComponent = item.icon;
                        return (
                          <Grid item xs={6} sm={3} key={index}>
                            <Box 
                              sx={{ 
                                textAlign: 'center',
                                p: 3,
                                borderRadius: 2,
                                border: `1px solid ${alpha(item.color, 0.2)}`,
                                backgroundColor: alpha(item.color, 0.04),
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                  backgroundColor: alpha(item.color, 0.08),
                                }
                              }}
                            >
                              <IconComponent sx={{ fontSize: 28, color: item.color, mb: 1 }} />
                              <Typography 
                                variant="h4" 
                                sx={{ 
                                  fontWeight: 700, 
                                  color: theme.palette.text.primary,
                                  mb: 0.5
                                }}
                              >
                                {item.value}
                              </Typography>
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  color: theme.palette.text.secondary,
                                  fontWeight: 500,
                                  textTransform: 'uppercase',
                                  fontSize: '0.75rem',
                                  letterSpacing: '0.5px'
                                }}
                              >
                                {item.label}
                              </Typography>
                            </Box>
                          </Grid>
                        );
                      })}
                    </Grid>
                  </Box>
                </Card>
              )}
            </>
          )}

          {/* Lista de Denúncias */}
          {currentView === 'dashboard' && (
            <Card elevation={0}>
              <Box sx={{ p: 3, borderBottom: `1px solid ${theme.palette.divider}` }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 36,
                      height: 36,
                      borderRadius: 1.5,
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                      mr: 2,
                    }}
                  >
                    <People sx={{ color: theme.palette.primary.main, fontSize: 20 }} />
                  </Box>
                  <Box>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 600,
                        color: theme.palette.text.primary,
                        fontSize: '1rem',
                        mb: 0.5
                      }}
                    >
                      Gerenciamento de Denúncias
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: theme.palette.text.secondary,
                      }}
                    >
                      Visualize, modere e gerencie todas as denúncias cidadãs
                    </Typography>
                  </Box>
                </Box>
              </Box>
              <Box>
                <DenunciationList token={token} />
              </Box>
            </Card>
          )}
        </Container>
      </Box>
    </>
  );
};

// Aplicar otimizações de performance
Dashboard.displayName = 'Dashboard';
ProfessionalStatsCard.displayName = 'ProfessionalStatsCard';
ProfessionalAnalyticsCard.displayName = 'ProfessionalAnalyticsCard';
ProfessionalHeader.displayName = 'ProfessionalHeader';

export default Dashboard;