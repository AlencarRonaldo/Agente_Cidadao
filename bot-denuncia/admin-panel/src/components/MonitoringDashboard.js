import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  LinearProgress,
  Alert,
  Button,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  CircularProgress,
  Badge,
  Stack,
  Paper,
  alpha,
  useTheme
} from '@mui/material';
import {
  Refresh,
  Warning,
  CheckCircle,
  Error,
  Schedule,
  TrendingUp,
  TrendingDown,
  Speed,
  Queue,
  Timeline,
  Notifications,
  Close,
  Circle,
  BrokenImage,
  CheckCircleOutline,
  ErrorOutline,
  AccessTime,
  Psychology,
  Analytics
} from '@mui/icons-material';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { apiCall } from '../config/api';

// Registrar componentes do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  ChartTooltip,
  Legend,
  ArcElement
);

const MonitoringDashboard = ({ token, onClose }) => {
  const theme = useTheme();
  const [systemStatus, setSystemStatus] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState(null);
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const wsRef = useRef(null);
  const [wsConnected, setWsConnected] = useState(false);

  // Configuração do WebSocket
  const setupWebSocket = useCallback(() => {
    if (!token) return;

    try {
      const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/monitoring`;
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('Conexão WebSocket estabelecida');
        setWsConnected(true);
        
        // Autenticar
        wsRef.current.send(JSON.stringify({
          type: 'authenticate',
          payload: { token }
        }));
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (error) {
          console.error('Erro ao processar mensagem WebSocket:', error);
        }
      };

      wsRef.current.onclose = () => {
        console.log('Conexão WebSocket fechada');
        setWsConnected(false);
        
        // Tentar reconectar após 5 segundos
        setTimeout(() => {
          if (token) {
            setupWebSocket();
          }
        }, 5000);
      };

      wsRef.current.onerror = (error) => {
        console.error('Erro WebSocket:', error);
        setWsConnected(false);
      };

    } catch (error) {
      console.error('Erro ao configurar WebSocket:', error);
    }
  }, [token]);

  // Processar mensagens do WebSocket
  const handleWebSocketMessage = (data) => {
    switch (data.type) {
      case 'auth_success':
        console.log('Autenticação WebSocket bem-sucedida');
        // Inscrever-se nos canais
        wsRef.current.send(JSON.stringify({
          type: 'subscribe',
          payload: {
            channels: ['publication_events', 'system_alerts', 'queue_status', 'system_status']
          }
        }));
        break;

      case 'system_status':
      case 'system_status_update':
        setSystemStatus(data.data);
        setLastUpdate(new Date());
        break;

      case 'system_alert':
        setAlerts(prev => [data.data, ...prev.slice(0, 19)]); // Manter apenas os 20 mais recentes
        break;

      case 'publication_event':
        // Atualizar métricas em tempo real
        updateMetricsFromEvent(data.data);
        break;

      case 'queue_status':
        setSystemStatus(prev => prev ? { ...prev, queue: data.data } : null);
        break;

      case 'error':
        console.error('Erro WebSocket:', data.error);
        break;
    }
  };

  // Atualizar métricas baseado em eventos
  const updateMetricsFromEvent = (eventData) => {
    setMetrics(prev => {
      if (!prev) return null;
      
      // Atualizar estatísticas em tempo real
      const updated = { ...prev };
      
      switch (eventData.event) {
        case 'published':
          updated.publication.successful += 1;
          updated.publication.total += 1;
          break;
        case 'failed':
          updated.publication.failed += 1;
          updated.publication.total += 1;
          break;
      }
      
      // Recalcular taxa de sucesso
      if (updated.publication.total > 0) {
        updated.publication.successRate = 
          (updated.publication.successful / updated.publication.total) * 100;
      }
      
      return updated;
    });
  };

  // Carregar dados iniciais
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const [statusResponse, metricsResponse, alertsResponse] = await Promise.all([
        apiCall('/admin/monitoring/status', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        apiCall('/admin/monitoring/metrics', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        apiCall('/admin/monitoring/alerts', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        setSystemStatus(statusData.data);
      }

      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json();
        setMetrics(metricsData.data);
      }

      if (alertsResponse.ok) {
        const alertsData = await alertsResponse.json();
        setAlerts(alertsData.data.alerts || []);
      }

      setLastUpdate(new Date());
    } catch (err) {
      console.error('Erro ao carregar dados de monitoramento:', err);
      setError('Erro ao carregar dados de monitoramento');
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Efeitos
  useEffect(() => {
    loadData();
    setupWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [loadData, setupWebSocket]);

  // Handlers
  const handleRefresh = () => {
    loadData();
  };

  const handleAlertClick = (alert) => {
    setSelectedAlert(alert);
    setAlertDialogOpen(true);
  };

  // Componentes auxiliares
  const StatusIndicator = ({ status, label }) => {
    const getStatusColor = () => {
      switch (status) {
        case 'healthy': return theme.palette.success.main;
        case 'warning': return theme.palette.warning.main;
        case 'critical': return theme.palette.error.main;
        default: return theme.palette.grey[500];
      }
    };

    const getStatusIcon = () => {
      switch (status) {
        case 'healthy': return <CheckCircle />;
        case 'warning': return <Warning />;
        case 'critical': return <Error />;
        default: return <Circle />;
      }
    };

    return (
      <Chip
        icon={getStatusIcon()}
        label={label}
        size="small"
        sx={{
          backgroundColor: alpha(getStatusColor(), 0.1),
          color: getStatusColor(),
          '& .MuiChip-icon': {
            color: getStatusColor()
          }
        }}
      />
    );
  };

  const MetricCard = ({ title, value, subtitle, icon: IconComponent, color, trend }) => (
    <Card elevation={0} sx={{ height: '100%', border: `1px solid ${theme.palette.divider}` }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
              borderRadius: 2,
              backgroundColor: alpha(color, 0.1),
              mr: 2
            }}
          >
            <IconComponent sx={{ fontSize: 24, color }} />
          </Box>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
              {value}
            </Typography>
            <Typography variant="body2" color="textSecondary" noWrap>
              {title}
            </Typography>
          </Box>
          {trend && (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {trend.direction === 'up' ? (
                <TrendingUp sx={{ fontSize: 16, color: theme.palette.success.main, mr: 0.5 }} />
              ) : (
                <TrendingDown sx={{ fontSize: 16, color: theme.palette.error.main, mr: 0.5 }} />
              )}
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                {trend.value}
              </Typography>
            </Box>
          )}
        </Box>
        {subtitle && (
          <Typography variant="caption" color="textSecondary">
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );

  if (loading && !systemStatus) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            Monitoramento do Sistema
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" color="textSecondary">
              Última atualização: {lastUpdate ? format(lastUpdate, 'HH:mm:ss', { locale: ptBR }) : 'Nunca'}
            </Typography>
            <Badge 
              color={wsConnected ? 'success' : 'error'} 
              variant="dot"
              sx={{ '& .MuiBadge-badge': { right: -2, top: 2 } }}
            >
              <Typography variant="caption" color="textSecondary">
                WebSocket {wsConnected ? 'Conectado' : 'Desconectado'}
              </Typography>
            </Badge>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Atualizar dados">
            <IconButton onClick={handleRefresh} disabled={loading}>
              <Refresh sx={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            </IconButton>
          </Tooltip>
          {onClose && (
            <IconButton onClick={onClose}>
              <Close />
            </IconButton>
          )}
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Status Geral */}
      {systemStatus && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={3}>
            <MetricCard
              title="Status do Sistema"
              value={<StatusIndicator status={systemStatus.status} label={systemStatus.status} />}
              subtitle={`Saúde: ${systemStatus.systemHealth?.overall || 0}%`}
              icon={Speed}
              color={theme.palette.primary.main}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <MetricCard
              title="Fila de Publicação"
              value={systemStatus.queue?.waiting || 0}
              subtitle={`${systemStatus.queue?.active || 0} processando`}
              icon={Queue}
              color={theme.palette.warning.main}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <MetricCard
              title="Limite Diário"
              value={`${systemStatus.limits?.current || 0}/${systemStatus.limits?.maximum || 0}`}
              subtitle={`${systemStatus.limits?.remaining || 0} restantes`}
              icon={Schedule}
              color={theme.palette.info.main}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <MetricCard
              title="Taxa de Sucesso"
              value={`${systemStatus.publications?.successRate?.toFixed(1) || 0}%`}
              subtitle="Últimas 24h"
              icon={CheckCircleOutline}
              color={theme.palette.success.main}
            />
          </Grid>
        </Grid>
      )}

      {/* Alertas */}
      {alerts.length > 0 && (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Notifications sx={{ mr: 1, color: theme.palette.warning.main }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Alertas Ativos ({alerts.length})
              </Typography>
            </Box>
            <Stack spacing={1}>
              {alerts.slice(0, 5).map((alert, index) => (
                <Alert
                  key={alert.id || index}
                  severity={alert.severity}
                  action={
                    <Button size="small" onClick={() => handleAlertClick(alert)}>
                      Detalhes
                    </Button>
                  }
                >
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {alert.title}
                  </Typography>
                  <Typography variant="caption">
                    {alert.message}
                  </Typography>
                </Alert>
              ))}
              {alerts.length > 5 && (
                <Typography variant="caption" color="textSecondary" sx={{ textAlign: 'center' }}>
                  +{alerts.length - 5} alertas adicionais
                </Typography>
              )}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Métricas Detalhadas */}
      {metrics && (
        <Grid container spacing={3}>
          {/* Publicações por Hora */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  Publicações por Hora
                </Typography>
                <Box sx={{ height: 300 }}>
                  <Line
                    data={{
                      labels: Object.keys(metrics.publication?.byHour || {}).map(hour => `${hour}:00`),
                      datasets: [{
                        label: 'Publicações',
                        data: Object.values(metrics.publication?.byHour || {}),
                        borderColor: theme.palette.primary.main,
                        backgroundColor: alpha(theme.palette.primary.main, 0.1),
                        tension: 0.4
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          display: false
                        }
                      },
                      scales: {
                        y: {
                          beginAtZero: true
                        }
                      }
                    }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Distribuição de Status */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  Status das Publicações
                </Typography>
                <Box sx={{ height: 300, display: 'flex', justifyContent: 'center' }}>
                  <Doughnut
                    data={{
                      labels: ['Sucessos', 'Falhas', 'Processando'],
                      datasets: [{
                        data: [
                          metrics.publication?.successful || 0,
                          metrics.publication?.failed || 0,
                          systemStatus?.queue?.active || 0
                        ],
                        backgroundColor: [
                          theme.palette.success.main,
                          theme.palette.error.main,
                          theme.palette.warning.main
                        ]
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false
                    }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Performance */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                  Métricas de Performance
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.primary.main }}>
                        {metrics.performance?.averageProcessingTime ? 
                          `${Math.round(metrics.performance.averageProcessingTime / 1000)}s` : 
                          'N/A'
                        }
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Tempo Médio de Processamento
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.success.main }}>
                        {metrics.performance?.throughputPerHour?.toFixed(1) || 0}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Publicações/Hora
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.warning.main }}>
                        {metrics.performance?.peakQueueSize || 0}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Pico da Fila
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.error.main }}>
                        {metrics.errors?.errorRate?.toFixed(1) || 0}%
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Taxa de Erro
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Dialog de Detalhes do Alerta */}
      <Dialog open={alertDialogOpen} onClose={() => setAlertDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {selectedAlert?.severity === 'critical' && <Error sx={{ mr: 1, color: theme.palette.error.main }} />}
            {selectedAlert?.severity === 'warning' && <Warning sx={{ mr: 1, color: theme.palette.warning.main }} />}
            {selectedAlert?.title}
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedAlert && (
            <Box>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {selectedAlert.message}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {selectedAlert.timestamp ? format(new Date(selectedAlert.timestamp), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR }) : ''}
              </Typography>
              {selectedAlert.details && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="h6" sx={{ mb: 1 }}>Detalhes:</Typography>
                  <pre style={{ fontSize: '0.875rem', overflow: 'auto' }}>
                    {JSON.stringify(selectedAlert.details, null, 2)}
                  </pre>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAlertDialogOpen(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MonitoringDashboard;