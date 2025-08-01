/**
 * PostingScheduleCard - Componente de Agenda de Postagens
 * 
 * Exibe as próximas postagens agendadas com:
 * - Lista ordenada por data de publicação
 * - Status visual baseado na prioridade (alta/normal/baixa)
 * - Countdown em tempo real para próxima postagem
 * - Auto-refresh a cada 30 segundos
 * - Responsivo e integrado com tema cyberpunk
 * 
 * Props:
 * - agendaPostagens: Array de objetos com estrutura:
 *   {
 *     id: number,
 *     protocolo: string,
 *     texto: string,
 *     bairro: string,
 *     scheduledPublishAt: string (ISO date),
 *     priority: 'alta' | 'normal' | 'baixa',
 *     createdAt: string (ISO date)
 *   }
 * - onRefresh: Function - Callback para atualizar dados
 * - loading: boolean - Estado de carregamento
 * 
 * @author Dashboard Bot Denúncias
 * @version 1.0.0
 */

import React, { useState, useEffect, memo } from 'react';
import {
  Box,
  Typography,
  Card,
  Stack,
  Chip,
  Divider,
  Avatar,
  LinearProgress,
  Fade,
  IconButton,
  Tooltip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Schedule,
  LocationOn,
  AccessTime,
  Assignment,
  Refresh,
  PriorityHigh,
  Circle,
  WifiOff,
  Wifi,
} from '@mui/icons-material';
import { useSimpleAgendaData } from '../hooks/useSimpleAgendaData';

// Função para calcular countdown
const useCountdown = (targetDate) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = +new Date(targetDate) - +new Date();
      
      if (difference > 0) {
        return {
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        };
      }
      
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    };

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    setTimeLeft(calculateTimeLeft());

    return () => clearInterval(timer);
  }, [targetDate]);

  return timeLeft;
};

// Componente de countdown
const CountdownDisplay = memo(({ targetDate }) => {
  const theme = useTheme();
  const timeLeft = useCountdown(targetDate);
  
  const isExpired = new Date(targetDate) <= new Date();
  
  if (isExpired) {
    return (
      <Chip
        size="small"
        label="Vencido"
        sx={{
          backgroundColor: alpha(theme.palette.error.main, 0.1),
          color: theme.palette.error.main,
          fontWeight: 600,
          fontSize: '0.75rem',
        }}
      />
    );
  }

  const formatTime = () => {
    if (timeLeft.days > 0) {
      return `${timeLeft.days}d ${timeLeft.hours}h`;
    } else if (timeLeft.hours > 0) {
      return `${timeLeft.hours}h ${timeLeft.minutes}m`;
    } else {
      return `${timeLeft.minutes}m ${timeLeft.seconds}s`;
    }
  };

  return (
    <Chip
      size="small"
      label={formatTime()}
      icon={<AccessTime sx={{ fontSize: 14 }} />}
      sx={{
        backgroundColor: alpha(theme.palette.primary.main, 0.1),
        color: theme.palette.primary.main,
        fontWeight: 600,
        fontSize: '0.75rem',
        '& .MuiChip-icon': {
          fontSize: 14,
          color: theme.palette.primary.main,
        },
      }}
    />
  );
});

// Componente individual de postagem agendada
const ScheduledPostItem = memo(({ post, index }) => {
  const theme = useTheme();
  
  const getPriorityColor = (priority) => {
    // CORREÇÃO: Converter número para string de prioridade
    const priorityStr = getPriorityString(priority);
    switch (priorityStr) {
      case 'alta':
        return theme.palette.error.main;
      case 'normal':
        return theme.palette.warning.main;
      case 'baixa':
        return theme.palette.success.main;
      default:
        return theme.palette.info.main;
    }
  };

  const getPriorityIcon = (priority) => {
    const priorityStr = getPriorityString(priority);
    switch (priorityStr) {
      case 'alta':
        return <PriorityHigh sx={{ fontSize: 14 }} />;
      default:
        return <Circle sx={{ fontSize: 8 }} />;
    }
  };

  const getPriorityString = (priority) => {
    // Converter número (1,2,3) para string de prioridade
    if (priority === 1) return 'alta';
    if (priority === 2) return 'normal';
    if (priority === 3) return 'baixa';
    // Se já for string, retornar como está
    if (typeof priority === 'string') return priority.toLowerCase();
    return 'normal'; // Default
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const truncateText = (text, maxLength = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <Fade in timeout={300 + index * 100}>
      <Box
        sx={{
          p: 2.5,
          borderRadius: 2,
          backgroundColor: alpha(getPriorityColor(post.priority), 0.04),
          border: `1px solid ${alpha(getPriorityColor(post.priority), 0.2)}`,
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            backgroundColor: alpha(getPriorityColor(post.priority), 0.08),
            transform: 'translateY(-1px)',
            boxShadow: `0 4px 12px ${alpha(getPriorityColor(post.priority), 0.15)}`,
          },
        }}
      >
        {/* Header com protocolo e prioridade */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          mb: 2,
          flexWrap: { xs: 'wrap', sm: 'nowrap' },
          gap: 1
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, flex: 1 }}>
            <Avatar
              sx={{
                width: 24,
                height: 24,
                backgroundColor: getPriorityColor(post.priority),
                fontSize: '0.75rem',
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {index + 1}
            </Avatar>
            <Typography
              variant="body1"
              sx={{
                fontWeight: 600,
                color: theme.palette.text.primary,
                fontSize: '0.875rem',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              #{post.protocolo}
            </Typography>
          </Box>
          
          <Chip
            size="small"
            icon={getPriorityIcon(post.priority)}
            label={getPriorityString(post.priority).toUpperCase()}
            sx={{
              backgroundColor: alpha(getPriorityColor(post.priority), 0.1),
              color: getPriorityColor(post.priority),
              fontWeight: 600,
              fontSize: '0.7rem',
              height: 24,
              flexShrink: 0,
              '& .MuiChip-icon': {
                fontSize: 14,
                color: getPriorityColor(post.priority),
              },
            }}
          />
        </Box>

        {/* Conteúdo da denúncia */}
        <Typography
          variant="body2"
          sx={{
            color: theme.palette.text.secondary,
            lineHeight: 1.5,
            mb: 2,
            fontSize: '0.875rem',
          }}
        >
          {truncateText(post.texto)}
        </Typography>

        {/* Informações de localização e data */}
        <Stack spacing={1.5}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocationOn sx={{ fontSize: 16, color: theme.palette.text.secondary }} />
            <Typography
              variant="body2"
              sx={{
                color: theme.palette.text.secondary,
                fontSize: '0.8rem',
                fontWeight: 500,
              }}
            >
              {post.bairro}
            </Typography>
          </Box>
          
          <Box sx={{ 
            display: 'flex', 
            alignItems: { xs: 'flex-start', sm: 'center' }, 
            justifyContent: 'space-between',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: 1, sm: 0 }
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, flex: 1 }}>
              <Schedule sx={{ fontSize: 16, color: theme.palette.text.secondary, flexShrink: 0 }} />
              <Typography
                variant="body2"
                sx={{
                  color: theme.palette.text.secondary,
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {formatDate(post.scheduledPublishAt)}
              </Typography>
            </Box>
            
            <Box sx={{ alignSelf: { xs: 'flex-end', sm: 'center' } }}>
              <CountdownDisplay targetDate={post.scheduledPublishAt} />
            </Box>
          </Box>
        </Stack>
      </Box>
    </Fade>
  );
});

// Componente principal
const PostingScheduleCard = ({ 
  agendaPostagens: propAgendaPostagens, 
  onRefresh: propOnRefresh, 
  loading: propLoading,
  useOrchestrator = true 
}) => {
  const theme = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  
  // Integration with simple data hook (no WebSocket timeouts)
  const orchestratorData = useSimpleAgendaData({
    onError: (error) => {
      console.warn('[PostingScheduleCard] Data error:', error);
    },
    onStateChange: (change) => {
      console.log('[PostingScheduleCard] State change:', change.type);
    },
    enabled: useOrchestrator // Pass enabled flag to hook
  });

  // CORREÇÃO CRÍTICA: Sempre usar dados das props (backend) quando disponíveis
  // O hook orchestratorData foi desabilitado para priorizar dados reais
  const agendaPostagens = (propAgendaPostagens && propAgendaPostagens.length > 0) ? 
    propAgendaPostagens : 
    (useOrchestrator && orchestratorData ? orchestratorData.agendaPostagens : []);
    
  const onRefresh = propOnRefresh || 
    (useOrchestrator && orchestratorData ? orchestratorData.onRefresh : null);
    
  const loading = (propLoading !== undefined) ? propLoading : 
    (useOrchestrator && orchestratorData ? orchestratorData.isLoading : false);
    
  const isConnected = (propAgendaPostagens && propAgendaPostagens.length > 0) ? true :
    (useOrchestrator && orchestratorData ? orchestratorData.isConnected : true);
    
  const lastUpdate = useOrchestrator && orchestratorData ? 
    orchestratorData.lastUpdate : null;
  const formatLastUpdate = useOrchestrator && orchestratorData ? 
    orchestratorData.formatLastUpdate : null;
  
  // Dados de exemplo para desenvolvimento (quando não há dados)
  const mockData = process.env.NODE_ENV === 'development' && agendaPostagens.length === 0 ? [
    {
      id: 1,
      protocolo: 'DEN-2024-001',
      texto: 'Buraco grande na Rua das Flores, causando transtornos aos pedestres e veículos. A situação persiste há mais de 3 semanas.',
      bairro: 'Centro',
      scheduledPublishAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 horas
      priority: 'alta',
      createdAt: new Date().toISOString(),
    },
    {
      id: 2,
      protocolo: 'DEN-2024-002',
      texto: 'Lâmpada queimada na Praça da Matriz, deixando o local escuro durante a noite.',
      bairro: 'São José',
      scheduledPublishAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(), // 6 horas
      priority: 'normal',
      createdAt: new Date().toISOString(),
    },
    {
      id: 3,
      protocolo: 'DEN-2024-003',
      texto: 'Poste inclinado na Avenida Principal representando risco de queda.',
      bairro: 'Vila Nova',
      scheduledPublishAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 dia
      priority: 'baixa',
      createdAt: new Date().toISOString(),
    },
  ] : [];
  
  // Usar dados reais ou mock data
  const dataToShow = agendaPostagens.length > 0 ? agendaPostagens : mockData;

  // Auto-refresh apenas se não estiver usando orchestrator (que já tem auto-refresh)
  useEffect(() => {
    if (!useOrchestrator) {
      const interval = setInterval(() => {
        if (onRefresh && !loading && !refreshing) {
          handleRefresh();
        }
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [useOrchestrator, onRefresh, loading, refreshing]);

  const handleRefresh = async () => {
    if (onRefresh && !loading) {
      setRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setTimeout(() => setRefreshing(false), 1000);
      }
    }
  };

  // Ordenar postagens por data de publicação
  const sortedPosts = dataToShow
    .sort((a, b) => new Date(a.scheduledPublishAt) - new Date(b.scheduledPublishAt))
    .slice(0, 5); // Mostrar apenas as próximas 5

  // Próxima postagem
  const nextPost = sortedPosts[0];

  return (
    <Card elevation={0} sx={{ height: '100%' }}>
      {/* Header */}
      <Box sx={{ p: 3, borderBottom: `1px solid ${theme.palette.divider}` }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
              <Assignment sx={{ color: theme.palette.primary.main, fontSize: 20 }} />
            </Box>
            <Box>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  color: theme.palette.text.primary,
                  fontSize: '1rem',
                  mb: 0.5,
                }}
              >
                Agenda de Postagens
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography
                  variant="body2"
                  sx={{
                    color: theme.palette.text.secondary,
                    fontSize: '0.8rem',
                  }}
                >
                  {sortedPosts.length} postagem{sortedPosts.length !== 1 ? 's' : ''} agendada{sortedPosts.length !== 1 ? 's' : ''}
                </Typography>
                
                {useOrchestrator && (
                  <Tooltip title={isConnected ? 'Conectado ao sistema' : 'Desconectado'}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {isConnected ? (
                        <Wifi sx={{ fontSize: 14, color: theme.palette.success.main }} />
                      ) : (
                        <WifiOff sx={{ fontSize: 14, color: theme.palette.error.main }} />
                      )}
                    </Box>
                  </Tooltip>
                )}

                {lastUpdate && formatLastUpdate && (
                  <Typography
                    variant="caption"
                    sx={{
                      color: theme.palette.text.disabled,
                      fontSize: '0.7rem',
                    }}
                  >
                    • {formatLastUpdate(lastUpdate)}
                  </Typography>
                )}
              </Box>
            </Box>
          </Box>
          
          <Tooltip title="Atualizar agenda" placement="left">
            <IconButton
              size="small"
              onClick={handleRefresh}
              disabled={loading || refreshing}
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
                  fontSize: 18,
                  animation: (loading || refreshing) ? 'spin 1s linear infinite' : 'none',
                  '@keyframes spin': {
                    '0%': { transform: 'rotate(0deg)' },
                    '100%': { transform: 'rotate(360deg)' }
                  }
                }}
              />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Conteúdo */}
      <Box sx={{ 
        p: 3, 
        maxHeight: { xs: 400, sm: 500 }, 
        overflowY: 'auto',
        '&::-webkit-scrollbar': {
          width: '6px',
        },
        '&::-webkit-scrollbar-track': {
          background: alpha(theme.palette.divider, 0.1),
          borderRadius: '3px',
        },
        '&::-webkit-scrollbar-thumb': {
          background: alpha(theme.palette.text.secondary, 0.3),
          borderRadius: '3px',
          '&:hover': {
            background: alpha(theme.palette.text.secondary, 0.5),
          },
        },
      }}>
        {loading && !refreshing ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <LinearProgress sx={{ mb: 2, borderRadius: 2 }} />
            <Typography variant="body2" color="textSecondary">
              Carregando agenda...
            </Typography>
          </Box>
        ) : sortedPosts.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Schedule sx={{ fontSize: 48, color: theme.palette.text.secondary, mb: 2 }} />
            <Typography
              variant="h6"
              sx={{
                color: theme.palette.text.primary,
                fontWeight: 600,
                mb: 1,
              }}
            >
              Nenhuma postagem agendada
            </Typography>
            <Typography variant="body2" color="textSecondary">
              As postagens aprovadas aparecerão aqui quando forem agendadas
            </Typography>
          </Box>
        ) : (
          <>
            {/* Próxima postagem em destaque */}
            {nextPost && (
              <>
                <Box sx={{ mb: 3 }}>
                  <Typography
                    variant="body1"
                    sx={{
                      fontWeight: 600,
                      color: theme.palette.text.primary,
                      mb: 2,
                      fontSize: '0.9rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
                    <AccessTime sx={{ fontSize: 16 }} />
                    Próxima Publicação
                  </Typography>
                  <ScheduledPostItem post={nextPost} index={0} />
                </Box>
                
                {sortedPosts.length > 1 && (
                  <Divider sx={{ my: 3, opacity: 0.7 }} />
                )}
              </>
            )}

            {/* Outras postagens */}
            {sortedPosts.length > 1 && (
              <Box>
                <Typography
                  variant="body1"
                  sx={{
                    fontWeight: 600,
                    color: theme.palette.text.primary,
                    mb: 2,
                    fontSize: '0.9rem',
                  }}
                >
                  Próximas na Fila
                </Typography>
                <Stack spacing={2}>
                  {sortedPosts.slice(1).map((post, index) => (
                    <ScheduledPostItem key={post.id} post={post} index={index + 1} />
                  ))}
                </Stack>
              </Box>
            )}
          </>
        )}
      </Box>
    </Card>
  );
};

// Otimizações de performance
PostingScheduleCard.displayName = 'PostingScheduleCard';
ScheduledPostItem.displayName = 'ScheduledPostItem';
CountdownDisplay.displayName = 'CountdownDisplay';

export default memo(PostingScheduleCard);