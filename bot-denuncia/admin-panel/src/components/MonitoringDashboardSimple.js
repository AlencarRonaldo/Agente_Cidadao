import React, { useState, useEffect } from 'react';
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
  CircularProgress,
  Stack,
  Paper,
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
  Notifications
} from '@mui/icons-material';
import { apiCall } from '../config/api';

// Componente simplificado sem gráficos
const MonitoringDashboardSimple = ({ token }) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [metrics, setMetrics] = useState({
    instagram: { connected: false, posts_today: 0, limit: 4 },
    queue: { waiting: 0, processing: 0, completed: 0 },
    system: { uptime: 0, memory: '0MB', cpu: '0%' },
    publications: { success_rate: 0, avg_time: 0 },
    errors: { total: 0, instagram: 0, network: 0 }
  });

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiCall('/monitoring/status', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const data = await response.json();
      setMetrics(data);
    } catch (err) {
      setError('Erro ao carregar métricas');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchMetrics();
      const interval = setInterval(fetchMetrics, 30000); // Atualiza a cada 30s
      return () => clearInterval(interval);
    }
  }, [token]);

  const getStatusColor = (connected) => connected ? 'success' : 'error';
  const getStatusIcon = (connected) => connected ? <CheckCircle /> : <Error />;

  if (loading && !metrics.instagram.connected) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height={400}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          📊 Dashboard de Monitoramento
        </Typography>
        <Tooltip title="Atualizar métricas">
          <IconButton onClick={fetchMetrics} disabled={loading}>
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Status Cards */}
      <Grid container spacing={3} mb={3}>
        {/* Instagram Status */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Status Instagram
                  </Typography>
                  <Typography variant="h5" component="div">
                    {metrics.instagram.connected ? 'Conectado' : 'Desconectado'}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {metrics.instagram.posts_today}/{metrics.instagram.limit} posts hoje
                  </Typography>
                </Box>
                <Chip
                  icon={getStatusIcon(metrics.instagram.connected)}
                  label={metrics.instagram.connected ? 'Online' : 'Offline'}
                  color={getStatusColor(metrics.instagram.connected)}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Queue Status */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Fila de Publicação
              </Typography>
              <Stack spacing={1}>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">Aguardando</Typography>
                  <Chip label={metrics.queue.waiting} size="small" color="warning" />
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">Processando</Typography>
                  <Chip label={metrics.queue.processing} size="small" color="info" />
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">Concluídas</Typography>
                  <Chip label={metrics.queue.completed} size="small" color="success" />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* System Health */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Saúde do Sistema
              </Typography>
              <Stack spacing={1}>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">CPU</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {metrics.system.cpu}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">Memória</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {metrics.system.memory}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">Uptime</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {Math.floor(metrics.system.uptime / 3600)}h
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Performance Metrics */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📈 Métricas de Performance
              </Typography>
              <Stack spacing={2}>
                <Box>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">Taxa de Sucesso</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {(metrics.publications.success_rate * 100).toFixed(1)}%
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={metrics.publications.success_rate * 100}
                    color={metrics.publications.success_rate > 0.8 ? 'success' : 'warning'}
                  />
                </Box>
                <Box>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">Tempo Médio de Publicação</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {metrics.publications.avg_time.toFixed(1)}s
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={Math.min((30 - metrics.publications.avg_time) / 30 * 100, 100)}
                    color={metrics.publications.avg_time < 15 ? 'success' : 'warning'}
                  />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                ⚠️ Erros Recentes
              </Typography>
              <Stack spacing={2}>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">Total de Erros</Typography>
                  <Chip 
                    label={metrics.errors.total} 
                    size="small" 
                    color={metrics.errors.total > 10 ? 'error' : 'default'}
                  />
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">Erros Instagram</Typography>
                  <Chip 
                    label={metrics.errors.instagram} 
                    size="small" 
                    color={metrics.errors.instagram > 0 ? 'warning' : 'default'}
                  />
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">Erros de Rede</Typography>
                  <Chip 
                    label={metrics.errors.network} 
                    size="small" 
                    color={metrics.errors.network > 0 ? 'warning' : 'default'}
                  />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Alertas */}
      {metrics.instagram.posts_today >= metrics.instagram.limit && (
        <Alert severity="warning" sx={{ mt: 3 }}>
          <Typography variant="subtitle2" fontWeight="bold">
            ⚠️ Limite Diário Atingido
          </Typography>
          <Typography variant="body2">
            O limite de {metrics.instagram.limit} publicações diárias foi atingido. 
            Novas denúncias serão agendadas para o próximo dia útil.
          </Typography>
        </Alert>
      )}

      {!metrics.instagram.connected && (
        <Alert severity="error" sx={{ mt: 3 }}>
          <Typography variant="subtitle2" fontWeight="bold">
            ❌ Instagram Desconectado
          </Typography>
          <Typography variant="body2">
            A conexão com o Instagram foi perdida. Verifique as credenciais e tente reconectar.
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

export default MonitoringDashboardSimple;