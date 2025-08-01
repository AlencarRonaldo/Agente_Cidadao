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
  alpha
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
  ConnectedTv
} from '@mui/icons-material';
import { apiCall } from '../config/api';

const InstagramConfig = ({ token }) => {
  const { theme: customTheme, isDark } = useCustomTheme();
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
  
  const theme = useTheme();

  // Carregar configuração atual
  useEffect(() => {
    loadCurrentConfig();
  }, []);

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

  return (
    <Box sx={{ 
      maxWidth: 1200, 
      mx: 'auto', 
      p: 3,
      backgroundColor: customTheme.palette.background.default,
      minHeight: '100vh'
    }}>
      {/* Header */}
      <Fade in timeout={600}>
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
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
                Configure as credenciais para publicação automática
              </Typography>
            </Box>
          </Box>
        </Box>
      </Fade>

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

      {/* Dialog de Teste */}
      <Dialog 
        open={testDialogOpen} 
        onClose={() => setTestDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: customTheme.palette.background.paper,
            border: isDark ? `1px solid ${customTheme.palette.divider}` : 'none',
            boxShadow: isDark ? '0 25px 50px -12px rgba(0, 0, 0, 0.6)' : '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }
        }}
      >
        <DialogTitle sx={{ pb: 1, color: customTheme.palette.text.primary, borderBottom: `1px solid ${customTheme.palette.divider}` }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Science sx={{ mr: 1, color: customTheme.palette.primary.main }} />
            Teste de Conexão Instagram
          </Box>
        </DialogTitle>
        <DialogContent sx={{ backgroundColor: customTheme.palette.background.paper }}>
          {testing ? (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <CircularProgress size={48} sx={{ mb: 2 }} />
              <Typography variant="body1">
                Testando conexão com o Instagram...
              </Typography>
              <Typography variant="body2" color={customTheme.palette.text.secondary} sx={{ mt: 1 }}>
                Isso pode levar alguns segundos
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
              
              {testResult.success && testResult.accountInfo && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    Conta Conectada:
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: customTheme.palette.primary.main }}>
                          {testResult.accountInfo.username?.charAt(0).toUpperCase()}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={`@${testResult.accountInfo.username}`}
                        secondary={testResult.accountInfo.fullName}
                      />
                    </ListItem>
                  </List>
                </Box>
              )}
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ backgroundColor: customTheme.palette.background.paper, borderTop: `1px solid ${customTheme.palette.divider}` }}>
          <Button onClick={() => setTestDialogOpen(false)} sx={{ color: customTheme.palette.text.secondary }}>
            Fechar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InstagramConfig;