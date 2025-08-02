import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Divider,
  Grid,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  LinearProgress,
  Fade,
  Zoom,
  useTheme,
  alpha,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  Paper,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import { useCustomTheme } from '../contexts/ThemeContext';
import {
  Instagram,
  Visibility,
  VisibilityOff,
  Save,
  Science,
  CheckCircle,
  Error,
  Warning,
  Info,
  Settings,
  AccountCircle,
  Refresh,
  Security,
  Speed,
  ConnectedTv,
  SwapHoriz,
  CloudSync,
  Analytics,
  TrendingUp,
  Api,
  CompareArrows,
  ExpandMore,
  Launch,
  AutoAwesome,
  Shield
} from '@mui/icons-material';
import { apiCall } from '../config/api';

const InstagramConfig = ({ token }) => {
  const { theme: customTheme, isDark } = useCustomTheme();
  
  // API Management States
  const [currentTab, setCurrentTab] = useState(0);
  const [apiStatus, setApiStatus] = useState({
    currentApi: 'PRIVATE',
    apis: {},
    migrationReady: false,
    healthScore: 0
  });
  const [migrationRecommendations, setMigrationRecommendations] = useState([]);
  
  // Private API States (existing)
  const [config, setConfig] = useState({
    username: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [accountInfo, setAccountInfo] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testResult, setTestResult] = useState(null);
  
  // Graph API States
  const [graphApiConfig, setGraphApiConfig] = useState({
    enabled: false,
    clientId: '',
    clientSecret: '',
    redirectUri: '',
    oauthUrl: ''
  });
  const [graphApiStatus, setGraphApiStatus] = useState(null);
  const [oauthDialogOpen, setOauthDialogOpen] = useState(false);
  
  // Migration States
  const [migrationDialogOpen, setMigrationDialogOpen] = useState(false);
  const [migrating, setMigrating] = useState(false);
  
  const theme = useTheme();

  // Load configurations on component mount
  useEffect(() => {
    loadAllConfigurations();
  }, []);

  // Load all configurations and status
  const loadAllConfigurations = async () => {
    if (!token) return;
    
    try {
      setLoading(true);
      
      // Load API status and configurations in parallel
      await Promise.all([
        loadCurrentConfig(),
        loadApiStatus(),
        loadGraphApiConfig(),
        loadMigrationRecommendations()
      ]);
      
    } catch (error) {
      console.error('Error loading configurations:', error);
      setMessage({
        type: 'error',
        text: 'Erro ao carregar configurações do sistema'
      });
    } finally {
      setLoading(false);
    }
  };

  // Load API status from the manager
  const loadApiStatus = async () => {
    try {
      const response = await apiCall('/admin/instagram/api-status', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[DEBUG] API Status Response:', data); // Debug temporário
        setApiStatus(data.data || {
          currentApi: 'PRIVATE',
          apis: {},
          migrationReady: false,
          healthScore: 0
        });
      }
    } catch (error) {
      console.warn('Failed to load API status:', error.message);
    }
  };

  // Load Graph API configuration
  const loadGraphApiConfig = async () => {
    try {
      const response = await apiCall('/admin/instagram/graph-config', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setGraphApiConfig(data.config || {
          enabled: false,
          clientId: '',
          clientSecret: '',
          redirectUri: '',
          oauthUrl: ''
        });
        setGraphApiStatus(data.status);
      }
    } catch (error) {
      console.warn('Failed to load Graph API config:', error.message);
    }
  };

  // Load migration recommendations
  const loadMigrationRecommendations = async () => {
    try {
      const response = await apiCall('/admin/instagram/migration-recommendations', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMigrationRecommendations(data.recommendations || []);
      }
    } catch (error) {
      console.warn('Failed to load migration recommendations:', error.message);
    }
  };

  const loadCurrentConfig = async () => {
    // Evitar chamadas duplicadas
    if (loading) return;
    
    try {
      setLoading(true);
      const response = await apiCall('/admin/instagram/config', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (response.ok) {
        setConfig({
          username: data.config?.username || '',
          password: '' // Nunca mostrar a senha
        });
        setConnectionStatus(data.status);
        setAccountInfo(data.accountInfo);
      }
    } catch (error) {
      const errorMessage = error?.message || error?.toString() || 'Erro desconhecido';
      console.error('Erro ao carregar configuração:', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field) => (event) => {
    setConfig(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    
    // Limpar mensagens ao editar
    setMessage({ type: '', text: '' });
  };

  const handleSave = async () => {
    if (!config.username || !config.password) {
      setMessage({
        type: 'error',
        text: 'Por favor, preencha usuário e senha do Instagram'
      });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await apiCall('/admin/instagram/config', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config)
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({
          type: 'success',
          text: 'Configuração salva com sucesso! As credenciais foram criptografadas e armazenadas com segurança.'
        });
        
        // Limpar o campo de senha por segurança
        setConfig(prev => ({ ...prev, password: '' }));
        
        // Recarregar status
        setTimeout(loadCurrentConfig, 1000);
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'Erro ao salvar configuração'
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Erro de conexão ao salvar configuração'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    if (!config.username) {
      setMessage({
        type: 'error',
        text: 'Configure o usuário do Instagram antes de testar'
      });
      return;
    }

    setTesting(true);
    setTestResult(null);
    setTestDialogOpen(true);

    try {
      const response = await apiCall('/admin/instagram/test', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();
      setTestResult(data);

      if (data.success) {
        setMessage({
          type: 'success',
          text: 'Conexão com Instagram testada com sucesso!'
        });
        setAccountInfo(data.accountInfo);
      } else {
        setMessage({
          type: 'error',
          text: `Erro no teste: ${data.message}`
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Erro de conexão ao testar Instagram'
      });
      setMessage({
        type: 'error',
        text: 'Erro de conexão ao testar Instagram'
      });
    } finally {
      setTesting(false);
    }
  };

  const getStatusIcon = (status) => {
    if (!status) return <Warning color="warning" />;
    
    if (status.isLoggedIn && status.hasValidCredentials && status.canConnect) {
      return <CheckCircle color="success" />;
    } else if (status.hasValidCredentials && status.canConnect === false) {
      return <Error color="error" />;
    } else if (status.hasValidCredentials) {
      return <Warning color="warning" />;
    } else {
      return <Error color="error" />;
    }
  };

  const getStatusText = (status) => {
    if (!status) return 'Status desconhecido';
    
    // Usar a mensagem personalizada do backend se disponível
    if (status.connectionMessage) {
      return status.connectionMessage;
    }
    
    // Fallback para lógica anterior
    if (status.isLoggedIn && status.hasValidCredentials) {
      return 'Conectado e funcionando';
    } else if (status.hasValidCredentials) {
      return 'Credenciais configuradas, aguardando conexão';
    } else {
      return 'Credenciais não configuradas';
    }
  };

  const getStatusColor = (status) => {
    if (!status) return 'warning';
    
    if (status.isLoggedIn && status.hasValidCredentials && status.canConnect) {
      return 'success';
    } else if (status.hasValidCredentials && !status.canConnect) {
      return 'error';
    } else if (status.hasValidCredentials) {
      return 'warning';
    } else {
      return 'error';
    }
  };

  // Handle API migration
  const handleApiMigration = async (targetApi) => {
    if (!targetApi || !['PRIVATE', 'GRAPH'].includes(targetApi)) {
      setMessage({
        type: 'error',
        text: 'API de destino inválida'
      });
      return;
    }

    setMigrating(true);
    try {
      const response = await apiCall('/admin/instagram/migrate-api', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetApi,
          testPublication: true
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessage({
          type: 'success',
          text: `Migração para ${targetApi === 'GRAPH' ? 'Graph API' : 'Private API'} realizada com sucesso!`
        });
        
        // Reload all configurations
        await loadAllConfigurations();
        setMigrationDialogOpen(false);
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'Erro na migração da API'
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Erro de conexão durante migração'
      });
    } finally {
      setMigrating(false);
    }
  };

  // Handle Graph API OAuth
  const handleGraphApiOAuth = async () => {
    try {
      const response = await apiCall('/admin/instagram/graph-oauth-init', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Open OAuth URL in new window
        window.open(data.authUrl, '_blank', 'width=600,height=700');
        setOauthDialogOpen(true);
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'Erro ao iniciar OAuth'
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Erro de conexão ao iniciar OAuth'
      });
    }
  };

  // Save Graph API configuration
  const handleGraphApiConfigSave = async () => {
    try {
      const response = await apiCall('/admin/instagram/graph-config', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(graphApiConfig)
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({
          type: 'success',
          text: 'Configuração Graph API salva com sucesso!'
        });
        await loadGraphApiConfig();
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'Erro ao salvar configuração Graph API'
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Erro de conexão ao salvar configuração Graph API'
      });
    }
  };

  // Get priority color for recommendations
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'CRITICAL': return 'error';
      case 'HIGH': return 'warning';
      case 'MEDIUM': return 'info';
      default: return 'default';
    }
  };

  // Get health score color
  const getHealthScoreColor = (score) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  return (
    <Box sx={{ 
      maxWidth: 1400, 
      mx: 'auto', 
      p: 3,
      backgroundColor: customTheme.palette.background.default,
      minHeight: '100vh'
    }}>
      {/* Enhanced Header with API Status */}
      <Fade in timeout={600}>
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 56,
                  height: 56,
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%)',
                  mr: 3,
                  boxShadow: '0 8px 32px rgba(131, 58, 180, 0.3)'
                }}
              >
                <Instagram sx={{ fontSize: 28, color: 'white' }} />
              </Box>
              <Box>
                <Typography 
                  variant="h4" 
                  sx={{ 
                    fontWeight: 800, 
                    color: customTheme.palette.text.primary,
                    fontSize: { xs: '1.75rem', sm: '2.25rem' },
                    lineHeight: 1.2,
                    mb: 0.5
                  }}
                >
                  Configuração do Instagram
                </Typography>
                <Typography 
                  variant="body1" 
                  sx={{ 
                    color: customTheme.palette.text.secondary,
                    fontSize: '1.1rem',
                    fontWeight: 500
                  }}
                >
                  Gerenciamento avançado de APIs e migração
                </Typography>
              </Box>
            </Box>
            
            {/* Current API Status */}
            <Box sx={{ textAlign: 'right' }}>
              <Chip 
                label={`API Atual: ${apiStatus.currentApi === 'GRAPH' ? 'Graph API' : 'Private API'}`}
                color={apiStatus.currentApi === 'GRAPH' ? 'primary' : 'secondary'}
                sx={{ mb: 1, fontWeight: 600 }}
              />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Health Score:
                </Typography>
                <Chip 
                  label={`${apiStatus.healthScore}%`}
                  color={getHealthScoreColor(apiStatus.healthScore)}
                  size="small"
                />
              </Box>
            </Box>
          </Box>
        </Box>
      </Fade>

      {/* Error/Success Messages */}
      {message.text && (
        <Fade in>
          <Alert 
            severity={message.type} 
            sx={{ mb: 3, borderRadius: 2 }}
            onClose={() => setMessage({ type: '', text: '' })}
          >
            {message.text}
          </Alert>
        </Fade>
      )}

      {/* Migration Recommendations */}
      {migrationRecommendations.length > 0 && (
        <Card sx={{ mb: 3, borderLeft: '4px solid #ff9800' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <AutoAwesome sx={{ mr: 1, color: 'warning.main' }} />
              <Typography variant="h6" color="warning.main">
                Recomendações de Migração
              </Typography>
            </Box>
            <Stack spacing={2}>
              {migrationRecommendations.map((rec, index) => (
                <Alert 
                  key={index}
                  severity={rec.priority === 'CRITICAL' ? 'error' : rec.priority === 'HIGH' ? 'warning' : 'info'}
                  action={
                    rec.action && (
                      <Button 
                        size="small" 
                        onClick={() => {
                          if (rec.type === 'MIGRATION_READY') {
                            setMigrationDialogOpen(true);
                          }
                        }}
                      >
                        {rec.action}
                      </Button>
                    )
                  }
                >
                  {rec.message}
                </Alert>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Main Tabbed Interface */}
      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={currentTab} 
          onChange={(e, newValue) => setCurrentTab(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab 
            label="API Status & Migration" 
            icon={<Analytics />} 
            iconPosition="start"
          />
          <Tab 
            label="Private API" 
            icon={<Shield />} 
            iconPosition="start"
          />
          <Tab 
            label="Graph API" 
            icon={<Api />} 
            iconPosition="start"
          />
        </Tabs>

        {/* Tab Content */}
        <Box sx={{ p: 3 }}>
          {/* Tab 0: API Status & Migration */}
          {currentTab === 0 && (
            <Grid container spacing={3}>
              {/* API Comparison */}
              <Grid item xs={12}>
                <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
                  Status das APIs
                </Typography>
                <Grid container spacing={2}>
                  {/* Private API Status */}
                  <Grid item xs={12} md={6}>
                    <Card sx={{ 
                      height: '100%',
                      border: apiStatus.currentApi === 'PRIVATE' ? '2px solid' : '1px solid',
                      borderColor: apiStatus.currentApi === 'PRIVATE' ? 'primary.main' : 'divider'
                    }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <Shield sx={{ mr: 1, color: 'secondary.main' }} />
                          <Typography variant="h6">Private API</Typography>
                          {apiStatus.currentApi === 'PRIVATE' && (
                            <Chip label="ATIVO" color="primary" size="small" sx={{ ml: 2 }} />
                          )}
                        </Box>
                        
                        <Box sx={{ mb: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                              Status:
                            </Typography>
                            {apiStatus.apis.PRIVATE?.healthy ? (
                              <Chip label="Conectado" color="success" size="small" />
                            ) : (
                              <Chip label="Desconectado" color="error" size="small" />
                            )}
                          </Box>
                          
                          {apiStatus.apis.PRIVATE?.accountInfo && (
                            <Typography variant="body2">
                              Conta: @{apiStatus.apis.PRIVATE.accountInfo.username}
                            </Typography>
                          )}
                          
                          {apiStatus.apis.PRIVATE?.error && (
                            <Typography variant="body2" color="error.main" sx={{ mt: 1 }}>
                              Erro: {apiStatus.apis.PRIVATE.error}
                            </Typography>
                          )}
                        </Box>

                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button 
                            size="small" 
                            variant="outlined"
                            onClick={() => setCurrentTab(1)}
                          >
                            Configurar
                          </Button>
                          {apiStatus.currentApi !== 'PRIVATE' && apiStatus.apis.PRIVATE?.healthy && (
                            <Button 
                              size="small" 
                              variant="contained"
                              onClick={() => handleApiMigration('PRIVATE')}
                              disabled={migrating}
                            >
                              Ativar
                            </Button>
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Graph API Status */}
                  <Grid item xs={12} md={6}>
                    <Card sx={{ 
                      height: '100%',
                      border: apiStatus.currentApi === 'GRAPH' ? '2px solid' : '1px solid',
                      borderColor: apiStatus.currentApi === 'GRAPH' ? 'primary.main' : 'divider'
                    }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <Api sx={{ mr: 1, color: 'primary.main' }} />
                          <Typography variant="h6">Graph API</Typography>
                          {apiStatus.currentApi === 'GRAPH' && (
                            <Chip label="ATIVO" color="primary" size="small" sx={{ ml: 2 }} />
                          )}
                          <Chip label="OFICIAL" color="success" size="small" sx={{ ml: 1 }} />
                        </Box>
                        
                        <Box sx={{ mb: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                              Status:
                            </Typography>
                            {apiStatus.apis.GRAPH?.healthy ? (
                              <Chip label="Conectado" color="success" size="small" />
                            ) : (
                              <Chip label="Não configurado" color="warning" size="small" />
                            )}
                          </Box>
                          
                          {apiStatus.apis.GRAPH?.accountInfo && (
                            <Typography variant="body2">
                              Conta: @{apiStatus.apis.GRAPH.accountInfo.username}
                            </Typography>
                          )}

                          {apiStatus.apis.GRAPH?.error && (
                            <Typography variant="body2" color="error.main" sx={{ mt: 1 }}>
                              Erro: {apiStatus.apis.GRAPH.error}
                            </Typography>
                          )}
                        </Box>

                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button 
                            size="small" 
                            variant="outlined"
                            onClick={() => setCurrentTab(2)}
                          >
                            Configurar
                          </Button>
                          {apiStatus.currentApi !== 'GRAPH' && apiStatus.apis.GRAPH?.healthy && (
                            <Button 
                              size="small" 
                              variant="contained"
                              onClick={() => handleApiMigration('GRAPH')}
                              disabled={migrating}
                            >
                              Ativar
                            </Button>
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Grid>

              {/* Migration Controls */}
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                      <SwapHoriz sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="h6">
                        Controles de Migração
                      </Typography>
                    </Box>
                    
                    {/* Debug Info - Remover depois */}
                    {process.env.NODE_ENV === 'development' && (
                      <Alert severity="info" sx={{ mb: 2 }}>
                        <Typography variant="body2">
                          Debug: API Atual = {apiStatus.currentApi}, 
                          Private Health = {String(apiStatus.apis.PRIVATE?.healthy)}, 
                          Graph Health = {String(apiStatus.apis.GRAPH?.healthy)},
                          Migration Ready = {String(apiStatus.migrationReady)}
                        </Typography>
                      </Alert>
                    )}

                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} md={8}>
                        <Typography variant="body1" sx={{ mb: 1 }}>
                          Migrar entre APIs Instagram
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Altere facilmente entre Private API e Graph API oficial do Instagram.
                          {apiStatus.migrationReady ? ' Graph API está pronto para uso.' : ' Configure Graph API primeiro.'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Stack spacing={2}>
                          <Button
                            variant="contained"
                            startIcon={<CompareArrows />}
                            onClick={() => setMigrationDialogOpen(true)}
                            disabled={!apiStatus.migrationReady || migrating}
                            fullWidth
                          >
                            {migrating ? 'Migrando...' : 'Iniciar Migração'}
                          </Button>
                          
                          {/* Botões diretos para cada API */}
                          {apiStatus.currentApi === 'PRIVATE' && apiStatus.apis.GRAPH?.healthy && (
                            <Button
                              variant="outlined"
                              color="primary"
                              startIcon={<Api />}
                              onClick={() => handleApiMigration('GRAPH')}
                              disabled={migrating}
                              fullWidth
                              size="small"
                            >
                              Mudar para Graph API
                            </Button>
                          )}
                          
                          {apiStatus.currentApi === 'GRAPH' && apiStatus.apis.PRIVATE?.healthy && (
                            <Button
                              variant="outlined"
                              color="secondary"
                              startIcon={<Shield />}
                              onClick={() => handleApiMigration('PRIVATE')}
                              disabled={migrating}
                              fullWidth
                              size="small"
                            >
                              Mudar para Private API
                            </Button>
                          )}
                          
                          {!apiStatus.apis.GRAPH?.healthy && (
                            <Button
                              variant="text"
                              size="small"
                              onClick={() => setCurrentTab(2)}
                              fullWidth
                            >
                              Configurar Graph API
                            </Button>
                          )}
                        </Stack>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* Tab 1: Private API Configuration */}
          {currentTab === 1 && (
            <Grid container spacing={3}>
              {/* Status da Conexão */}
              <Grid item xs={12} lg={4}>
                <Zoom in timeout={800}>
                  <Card 
              elevation={0}
              sx={{ 
                borderRadius: 3, 
                border: `1px solid ${customTheme.palette.divider}`,
                backgroundColor: customTheme.palette.background.paper,
                boxShadow: isDark ? '0 4px 20px rgba(0, 0, 0, 0.3)' : '0 4px 20px rgba(0, 0, 0, 0.1)',
                transition: 'all 0.3s ease',
                height: 'fit-content'
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 40,
                      height: 40,
                      borderRadius: '10px',
                      backgroundColor: isDark ? 'rgba(56, 189, 248, 0.2)' : alpha('#2196f3', 0.1),
                      mr: 2
                    }}
                  >
                    <ConnectedTv sx={{ color: isDark ? '#38bdf8' : '#2196f3', fontSize: 20 }} />
                  </Box>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      fontWeight: 700, 
                      color: customTheme.palette.text.primary,
                      fontSize: '1.1rem'
                    }}
                  >
                    Status da Conexão
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  {getStatusIcon(connectionStatus)}
                  <Box sx={{ ml: 2 }}>
                    <Typography variant="body1" sx={{ fontWeight: 600, color: customTheme.palette.text.primary }}>
                      {getStatusText(connectionStatus)}
                    </Typography>
                    <Chip 
                      label={connectionStatus?.username ? `@${connectionStatus.username}` : 'Não configurado'}
                      size="small"
                      color={getStatusColor(connectionStatus)}
                      sx={{ mt: 1 }}
                    />
                    {connectionStatus?.lastError && (
                      <Chip 
                        label={`Erro: ${connectionStatus.lastError.substring(0, 50)}...`}
                        size="small"
                        color="error"
                        variant="outlined"
                        sx={{ mt: 1, ml: 1 }}
                      />
                    )}
                  </Box>
                </Box>

                {connectionStatus && (
                  <List dense sx={{ mt: 2, '& .MuiListItemText-primary': { color: customTheme.palette.text.primary }, '& .MuiListItemText-secondary': { color: customTheme.palette.text.secondary } }}>
                    <ListItem sx={{ px: 0 }}>
                      <ListItemText
                        primary="Credenciais Válidas"
                        secondary={connectionStatus.hasValidCredentials ? 'Sim' : 'Não'}
                      />
                      {connectionStatus.hasValidCredentials ? 
                        <CheckCircle color="success" fontSize="small" /> : 
                        <Error color="error" fontSize="small" />
                      }
                    </ListItem>
                    <ListItem sx={{ px: 0 }}>
                      <ListItemText
                        primary="Sessão Ativa"
                        secondary={connectionStatus.sessionExists ? 'Sim' : 'Não'}
                      />
                      {connectionStatus.sessionExists ? 
                        <CheckCircle color="success" fontSize="small" /> : 
                        <Warning color="warning" fontSize="small" />
                      }
                    </ListItem>
                    <ListItem sx={{ px: 0 }}>
                      <ListItemText
                        primary="Último Login"
                        secondary={connectionStatus.lastLoginAttempt > 0 ? 
                          `${connectionStatus.lastLoginAttempt} tentativa(s)` : 
                          'Nenhuma tentativa'
                        }
                      />
                    </ListItem>
                  </List>
                )}

                <Button
                  fullWidth
                  variant="outlined"
                  onClick={handleTest}
                  disabled={testing || !config.username}
                  startIcon={testing ? <CircularProgress size={16} /> : <Science />}
                  sx={{ 
                    mt: 2,
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                    borderColor: customTheme.palette.primary.main,
                    color: customTheme.palette.primary.main,
                    '&:hover': {
                      backgroundColor: isDark ? 'rgba(96, 165, 250, 0.1)' : 'rgba(37, 99, 235, 0.04)',
                      transform: 'translateY(-1px)'
                    }
                  }}
                >
                  {testing ? 'Testando...' : 'Testar Conexão'}
                </Button>
              </CardContent>
            </Card>
          </Zoom>
        </Grid>

        {/* Formulário de Configuração */}
        <Grid item xs={12} lg={8}>
          <Zoom in timeout={1000}>
            <Card 
              elevation={0}
              sx={{ 
                borderRadius: 3, 
                border: '1px solid #e0e0e0',
                background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)'
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 40,
                      height: 40,
                      borderRadius: '10px',
                      backgroundColor: isDark ? 'rgba(56, 189, 248, 0.2)' : alpha('#2196f3', 0.1),
                      mr: 2
                    }}
                  >
                    <Settings sx={{ color: isDark ? '#38bdf8' : '#2196f3', fontSize: 20 }} />
                  </Box>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      fontWeight: 700, 
                      color: customTheme.palette.text.primary,
                      fontSize: '1.1rem'
                    }}
                  >
                    Credenciais da Conta
                  </Typography>
                </Box>

                {message.text && (
                  <Fade in>
                    <Alert 
                      severity={message.type} 
                      sx={{ mb: 3, borderRadius: 2 }}
                      onClose={() => setMessage({ type: '', text: '' })}
                    >
                      {message.text}
                    </Alert>
                  </Fade>
                )}

                <Box sx={{ mb: 4 }}>
                  <Alert 
                    severity="info" 
                    icon={<Security />}
                    sx={{ borderRadius: 2 }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      <strong>Importante:</strong> Use uma conta dedicada para o bot, nunca sua conta pessoal. 
                      As credenciais são criptografadas e armazenadas com segurança no servidor.
                    </Typography>
                  </Alert>
                </Box>

                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Usuário do Instagram"
                      placeholder="nome_do_usuario"
                      value={config.username}
                      onChange={handleChange('username')}
                      disabled={loading}
                      InputProps={{
                        startAdornment: <AccountCircle sx={{ mr: 1, color: 'text.secondary' }} />
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#ffffff',
                          '& fieldset': {
                            borderColor: customTheme.palette.divider
                          },
                          '&:hover fieldset': {
                            borderColor: customTheme.palette.primary.main
                          }
                        },
                        '& .MuiInputLabel-root': {
                          color: customTheme.palette.text.secondary
                        },
                        '& .MuiFormHelperText-root': {
                          color: customTheme.palette.text.secondary
                        }
                      }}
                      helperText="Digite apenas o nome de usuário, sem @"
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Senha do Instagram"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Digite a senha"
                      value={config.password}
                      onChange={handleChange('password')}
                      disabled={loading}
                      InputProps={{
                        endAdornment: (
                          <IconButton
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                            size="small"
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        )
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#ffffff',
                          '& fieldset': {
                            borderColor: customTheme.palette.divider
                          },
                          '&:hover fieldset': {
                            borderColor: customTheme.palette.primary.main
                          }
                        },
                        '& .MuiInputLabel-root': {
                          color: customTheme.palette.text.secondary
                        },
                        '& .MuiFormHelperText-root': {
                          color: customTheme.palette.text.secondary
                        }
                      }}
                      helperText="Senha será criptografada ao salvar"
                    />
                  </Grid>
                </Grid>

                <Divider sx={{ my: 3 }} />

                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                  <Button
                    variant="outlined"
                    onClick={loadCurrentConfig}
                    disabled={loading}
                    startIcon={<Refresh />}
                    sx={{ 
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 600,
                      borderColor: customTheme.palette.divider,
                      color: customTheme.palette.text.secondary,
                      '&:hover': {
                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
                        transform: 'translateY(-1px)'
                      }
                    }}
                  >
                    Recarregar
                  </Button>
                  
                  <Button
                    variant="contained"
                    onClick={handleSave}
                    disabled={loading || !config.username || !config.password}
                    startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <Save />}
                    sx={{ 
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 600,
                      background: isDark 
                        ? 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)' 
                        : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: '#ffffff',
                      '&:hover': {
                        background: isDark 
                          ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                          : 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
                        transform: 'translateY(-1px)',
                        boxShadow: isDark ? '0 8px 25px rgba(96, 165, 250, 0.3)' : '0 8px 25px rgba(102, 126, 234, 0.3)'
                      }
                    }}
                  >
                    {loading ? 'Salvando...' : 'Salvar Configuração'}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Zoom>
        </Grid>

        {/* Informações da Conta */}
        {accountInfo && (
          <Grid item xs={12}>
            <Zoom in timeout={1200}>
              <Card 
                elevation={0}
                sx={{ 
                  borderRadius: 3, 
                  border: '1px solid #e0e0e0',
                  background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)'
                }}
              >
                <CardContent sx={{ p: 4 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 40,
                        height: 40,
                        borderRadius: '10px',
                        backgroundColor: isDark ? 'rgba(56, 189, 248, 0.2)' : alpha('#2196f3', 0.1),
                        mr: 2
                      }}
                    >
                      <Info sx={{ color: isDark ? '#38bdf8' : '#2196f3', fontSize: 20 }} />
                    </Box>
                    <Typography 
                      variant="h6" 
                      sx={{ 
                        fontWeight: 700, 
                        color: customTheme.palette.text.primary,
                        fontSize: '1.1rem'
                      }}
                    >
                      Informações da Conta Conectada
                    </Typography>
                  </Box>

                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6} md={3}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Avatar
                          sx={{
                            width: 64,
                            height: 64,
                            mx: 'auto',
                            mb: 1,
                            bgcolor: customTheme.palette.primary.main,
                            fontSize: '1.5rem',
                            fontWeight: 700
                          }}
                        >
                          {accountInfo.username?.charAt(0).toUpperCase()}
                        </Avatar>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          @{accountInfo.username}
                        </Typography>
                        <Typography variant="body2" color={customTheme.palette.text.secondary}>
                          {accountInfo.fullName}
                        </Typography>
                        {accountInfo.isVerified && (
                          <Chip 
                            label="Verificado" 
                            size="small" 
                            color="primary" 
                            sx={{ mt: 1 }}
                          />
                        )}
                      </Box>
                    </Grid>

                    <Grid item xs={12} sm={6} md={9}>
                      <Grid container spacing={2}>
                        <Grid item xs={6} sm={3}>
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h4" sx={{ fontWeight: 700, color: customTheme.palette.primary.main }}>
                              {accountInfo.followerCount?.toLocaleString() || 0}
                            </Typography>
                            <Typography variant="body2" color={customTheme.palette.text.secondary}>
                              Seguidores
                            </Typography>
                          </Box>
                        </Grid>
                        
                        <Grid item xs={6} sm={3}>
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h4" sx={{ fontWeight: 700, color: customTheme.palette.primary.main }}>
                              {accountInfo.followingCount?.toLocaleString() || 0}
                            </Typography>
                            <Typography variant="body2" color={customTheme.palette.text.secondary}>
                              Seguindo
                            </Typography>
                          </Box>
                        </Grid>
                        
                        <Grid item xs={6} sm={3}>
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h4" sx={{ fontWeight: 700, color: customTheme.palette.primary.main }}>
                              {accountInfo.mediaCount?.toLocaleString() || 0}
                            </Typography>
                            <Typography variant="body2" color={customTheme.palette.text.secondary}>
                              Posts
                            </Typography>
                          </Box>
                        </Grid>
                        
                        <Grid item xs={6} sm={3}>
                          <Box sx={{ textAlign: 'center' }}>
                            <Chip 
                              label={accountInfo.isPrivate ? "Privada" : "Pública"}
                              color={accountInfo.isPrivate ? "warning" : "success"}
                              size="small"
                            />
                            <Typography variant="body2" color={customTheme.palette.text.secondary} sx={{ mt: 1 }}>
                              Privacidade
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Zoom>
          </Grid>
              )}
            </Grid>
          )}

          {/* Tab 2: Graph API Configuration */}
          {currentTab === 2 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
                  Graph API - Instagram Oficial
                </Typography>
                
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Alert severity="info" sx={{ mb: 3 }}>
                      <Typography variant="body2">
                        <strong>Graph API</strong> é a API oficial do Instagram. Oferece maior estabilidade e recursos oficiais,
                        mas requer configuração OAuth e aprovação da Meta.
                      </Typography>
                    </Alert>

                    <FormControlLabel
                      control={
                        <Switch
                          checked={graphApiConfig.enabled}
                          onChange={(e) => setGraphApiConfig(prev => ({ 
                            ...prev, 
                            enabled: e.target.checked 
                          }))}
                        />
                      }
                      label="Ativar Graph API"
                      sx={{ mb: 3 }}
                    />

                    {graphApiConfig.enabled && (
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            label="Client ID"
                            value={graphApiConfig.clientId}
                            onChange={(e) => setGraphApiConfig(prev => ({ 
                              ...prev, 
                              clientId: e.target.value 
                            }))}
                            helperText="ID da aplicação Meta"
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            label="Client Secret"
                            type="password"
                            value={graphApiConfig.clientSecret}
                            onChange={(e) => setGraphApiConfig(prev => ({ 
                              ...prev, 
                              clientSecret: e.target.value 
                            }))}
                            helperText="Chave secreta da aplicação"
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            label="Redirect URI"
                            value={graphApiConfig.redirectUri}
                            onChange={(e) => setGraphApiConfig(prev => ({ 
                              ...prev, 
                              redirectUri: e.target.value 
                            }))}
                            helperText="URI de callback OAuth"
                          />
                        </Grid>
                      </Grid>
                    )}

                    <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                      <Button
                        variant="outlined"
                        onClick={loadGraphApiConfig}
                        startIcon={<Refresh />}
                      >
                        Recarregar
                      </Button>
                      <Button
                        variant="contained"
                        onClick={handleGraphApiConfigSave}
                        disabled={!graphApiConfig.enabled}
                        startIcon={<Save />}
                      >
                        Salvar Configuração
                      </Button>
                      {graphApiConfig.enabled && graphApiConfig.clientId && (
                        <Button
                          variant="contained"
                          color="primary"
                          onClick={handleGraphApiOAuth}
                          startIcon={<Launch />}
                        >
                          Conectar Instagram
                        </Button>
                      )}
                    </Box>
                  </CardContent>
                </Card>

                {/* Graph API Status */}
                {graphApiStatus && (
                  <Card>
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 2 }}>
                        Status Graph API
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                              Status:
                            </Typography>
                            {graphApiStatus.connected ? (
                              <Chip label="Conectado" color="success" size="small" />
                            ) : (
                              <Chip label="Não conectado" color="warning" size="small" />
                            )}
                          </Box>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography variant="body2" color="text.secondary">
                            Token válido até: {graphApiStatus.tokenExpiresAt ? 
                              new Date(graphApiStatus.tokenExpiresAt).toLocaleDateString('pt-BR') : 
                              'N/A'
                            }
                          </Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                )}
              </Grid>
            </Grid>
          )}
        </Box>
      </Paper>

      {/* Dialogs */}
      
      {/* Test Dialog (existing) */}
      <Dialog 
        open={testDialogOpen} 
        onClose={() => setTestDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Science sx={{ mr: 1, color: customTheme.palette.primary.main }} />
            Teste de Conexão Instagram
          </Box>
        </DialogTitle>
        <DialogContent>
          {testing ? (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <CircularProgress size={48} sx={{ mb: 2 }} />
              <Typography variant="body1">
                Testando conexão com o Instagram...
              </Typography>
              <LinearProgress sx={{ mt: 2 }} />
            </Box>
          ) : testResult ? (
            <Box sx={{ py: 2 }}>
              <Alert 
                severity={testResult.success ? 'success' : 'error'}
                sx={{ mb: 2 }}
              >
                {testResult.message}
              </Alert>
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestDialogOpen(false)}>
            Fechar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Migration Dialog */}
      <Dialog
        open={migrationDialogOpen}
        onClose={() => setMigrationDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <SwapHoriz sx={{ mr: 1, color: 'primary.main' }} />
            Migração de API Instagram
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 3 }}>
            Escolha para qual API deseja migrar o sistema:
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Card 
                sx={{ 
                  border: apiStatus.currentApi === 'PRIVATE' ? '2px solid' : '1px solid',
                  borderColor: apiStatus.currentApi === 'PRIVATE' ? 'primary.main' : 'divider',
                  cursor: 'pointer'
                }}
                onClick={() => apiStatus.currentApi !== 'PRIVATE' && handleApiMigration('PRIVATE')}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Shield sx={{ mr: 1 }} />
                    <Typography variant="h6">Private API</Typography>
                    {apiStatus.currentApi === 'PRIVATE' && (
                      <Chip label="ATUAL" color="primary" size="small" sx={{ ml: 2 }} />
                    )}
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    API não oficial, rápida configuração, baseada em credenciais.
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <Chip 
                      label={apiStatus.apis.PRIVATE?.healthy ? "Conectado" : "Desconectado"}
                      color={apiStatus.apis.PRIVATE?.healthy ? "success" : "error"}
                      size="small"
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card 
                sx={{ 
                  border: apiStatus.currentApi === 'GRAPH' ? '2px solid' : '1px solid',
                  borderColor: apiStatus.currentApi === 'GRAPH' ? 'primary.main' : 'divider',
                  cursor: apiStatus.migrationReady ? 'pointer' : 'default',
                  opacity: apiStatus.migrationReady ? 1 : 0.7
                }}
                onClick={() => apiStatus.migrationReady && apiStatus.currentApi !== 'GRAPH' && handleApiMigration('GRAPH')}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Api sx={{ mr: 1 }} />
                    <Typography variant="h6">Graph API</Typography>
                    {apiStatus.currentApi === 'GRAPH' && (
                      <Chip label="ATUAL" color="primary" size="small" sx={{ ml: 2 }} />
                    )}
                    <Chip label="OFICIAL" color="success" size="small" sx={{ ml: 1 }} />
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    API oficial Instagram, maior estabilidade, requer OAuth.
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <Chip 
                      label={apiStatus.apis.GRAPH?.healthy ? "Conectado" : "Não configurado"}
                      color={apiStatus.apis.GRAPH?.healthy ? "success" : "warning"}
                      size="small"
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          
          {migrating && (
            <Box sx={{ textAlign: 'center', mt: 3 }}>
              <CircularProgress sx={{ mb: 2 }} />
              <Typography variant="body2">
                Executando migração...
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setMigrationDialogOpen(false)}
            disabled={migrating}
          >
            Cancelar
          </Button>
        </DialogActions>
      </Dialog>

      {/* OAuth Dialog */}
      <Dialog
        open={oauthDialogOpen}
        onClose={() => setOauthDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Conectar Instagram via OAuth
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Uma nova janela foi aberta para autenticação no Instagram.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Após autorizar o acesso, volte aqui e clique em "Verificar Conexão".
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOauthDialogOpen(false)}>
            Cancelar
          </Button>
          <Button 
            variant="contained"
            onClick={() => {
              setOauthDialogOpen(false);
              loadAllConfigurations();
            }}
          >
            Verificar Conexão
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InstagramConfig;