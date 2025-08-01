import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
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
  TextField,
  Tooltip,
  LinearProgress,
  Fade,
  Zoom,
  useTheme,
  alpha
} from '@mui/material';
import { useCustomTheme } from '../contexts/ThemeContext';
import {
  WhatsApp,
  QrCode,
  ConnectedTv,
  CheckCircle,
  Error,
  Warning,
  Info,
  Settings,
  Phone,
  Refresh,
  Security,
  Send,
  AccountCircle,
  Logout,
  Link,
  LinkOff,
  Message,
  Speed,
  Battery90,
  Smartphone
} from '@mui/icons-material';
import { apiCall, processApiResponse } from '../config/api';
import { useErrorHandler } from '../utils/errorUtils';

const WhatsAppConfig = ({ token }) => {
  const { theme: customTheme, isDark } = useCustomTheme();
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [accountInfo, setAccountInfo] = useState(null);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrCode, setQrCode] = useState(null);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testMessage, setTestMessage] = useState({
    phoneNumber: '',
    message: 'Teste de conexão do Bot de Denúncias Cidadãs 🤖'
  });
  const [sendingTest, setSendingTest] = useState(false);
  const [conversations, setConversations] = useState(null);
  
  const theme = useTheme();
  const { handleError } = useErrorHandler('WhatsAppConfig');

  // Carregar status atual
  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 5000); // Atualizar a cada 5 segundos
    return () => clearInterval(interval);
  }, []);

  const loadStatus = async () => {
    try {
      const response = await apiCall('/admin/whatsapp/status', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await processApiResponse(response);
      
      console.log('Status WhatsApp:', {
        isConnected: data.data?.isConnected,
        isConnecting: data.data?.isConnecting,
        hasQrCode: !!data.data?.qrCode,
        qrCodeLength: data.data?.qrCode?.length
      });
      
      setConnectionStatus(data.data);
      
      // PRIORITY FIX: Only show QR dialog if actually connecting and has QR code
      // Don't show QR if session is being restored automatically
      if (data.data.isConnecting && data.data.qrCode && !data.data.isInitializing) {
        console.log('📱 QR Code disponível, abrindo dialog');
        setQrCode(data.data.qrCode);
        setQrDialogOpen(true);
      } else if (data.data.isConnected) {
        console.log('✅ WhatsApp conectado, fechando QR dialog');
        setQrDialogOpen(false);
        setQrCode(null);
        loadAccountInfo();
        loadConversations();
        
        // Show success message if session was restored
        if (data.data.restored) {
          setMessage({
            type: 'success',
            text: 'Sessão WhatsApp restaurada automaticamente!'
          });
        }
      } else if (!data.data.isConnecting && !data.data.isConnected) {
        console.log('❌ WhatsApp desconectado');
        setQrDialogOpen(false);
        setQrCode(null);
        
        // Clear any previous messages when disconnected
        if (message.text && message.type === 'success') {
          setMessage({ type: '', text: '' });
        }
      }
    } catch (error) {
      const errorMessage = handleError(error);
      console.error('Erro ao carregar status:', errorMessage);
      // Não mostra erro para o usuário aqui pois é chamado periodicamente
    }
  };

  const loadAccountInfo = async () => {
    try {
      const response = await apiCall('/admin/whatsapp/account-info', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await processApiResponse(response);
      setAccountInfo(data.data);
    } catch (error) {
      const errorMessage = handleError(error);
      console.error('Erro ao carregar informações da conta:', errorMessage);
    }
  };

  const loadConversations = async () => {
    try {
      const response = await apiCall('/admin/whatsapp/conversations', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await processApiResponse(response);
      setConversations(data.data);
    } catch (error) {
      const errorMessage = handleError(error);
      console.error('Erro ao carregar conversas:', errorMessage);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    setMessage({ type: '', text: '' });

    try {
      // PRIORITY FIX: First check if there's an existing session that can be restored
      console.log('🔍 Verificando sessão existente antes de conectar...');
      
      const sessionCheckResponse = await apiCall('/admin/whatsapp/check-session', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const sessionData = await processApiResponse(sessionCheckResponse);
      
      if (sessionData.data?.hasValidSession) {
        console.log('✅ Sessão válida encontrada, tentando restaurar...');
        setMessage({
          type: 'info',
          text: 'Sessão existente encontrada, tentando restaurar automaticamente...'
        });
      } else {
        console.log('📱 Nenhuma sessão válida, nova conexão necessária');
        setMessage({
          type: 'info',
          text: 'Iniciando nova conexão WhatsApp...'
        });
      }

      // Now proceed with connection
      const response = await apiCall('/admin/whatsapp/connect', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      const data = await processApiResponse(response);

      console.log('Resposta connect:', data);
      
      if (data.success) {
        if (sessionData.data?.hasValidSession) {
          setMessage({
            type: 'success',
            text: 'Tentando restaurar sessão existente... Aguarde alguns segundos.'
          });
          
          // For session restoration, check status more frequently and don't show QR initially
          setTimeout(() => {
            loadStatus(); // Check if session was restored
          }, 3000);
          
        } else {
          setMessage({
            type: 'success',
            text: 'Conectando ao WhatsApp... Escaneie o QR Code quando aparecer.'
          });
          
          // Only start QR checking if no existing session
          setTimeout(() => {
            console.log('Primeira verificação de QR Code...');
            checkForQrCode();
          }, 5000);
          
          // Continuar verificando a cada 3 segundos
          const qrCheckInterval = setInterval(() => {
            console.log('Verificando QR Code periodicamente...');
            checkForQrCode();
          }, 3000);
          
          // Parar de verificar após 2 minutos
          setTimeout(() => {
            clearInterval(qrCheckInterval);
            console.log('Timeout de verificação de QR Code');
          }, 120000);
        }
      } else {
        setMessage({
          type: 'error',
          text: data.message || 'Erro ao conectar WhatsApp'
        });
      }
    } catch (error) {
      const errorMessage = handleError(error);
      setMessage({
        type: 'error',
        text: errorMessage
      });
    } finally {
      setConnecting(false);
    }
  };

  const checkForQrCode = async () => {
    try {
      const response = await apiCall('/admin/whatsapp/qr', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await processApiResponse(response);
      
      console.log('Resposta QR Check:', data);
      
      if (data.qrCode) {
        console.log('QR Code encontrado, abrindo dialog');
        setQrCode(data.qrCode);
        setQrDialogOpen(true);
      }
    } catch (error) {
      const errorMessage = handleError(error);
      console.error('Erro ao verificar QR code:', errorMessage);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await apiCall('/admin/whatsapp/disconnect', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      const data = await processApiResponse(response);

      if (data.success) {
        setMessage({
          type: 'success',
          text: 'WhatsApp desconectado com sucesso'
        });
        setAccountInfo(null);
        setConversations(null);
        setQrDialogOpen(false);
      } else {
        setMessage({
          type: 'error',
          text: data.message || 'Erro ao desconectar WhatsApp'
        });
      }
    } catch (error) {
      const errorMessage = handleError(error);
      setMessage({
        type: 'error',
        text: errorMessage
      });
    } finally {
      setDisconnecting(false);
    }
  };

  const handleSendTest = async () => {
    if (!testMessage.phoneNumber) {
      setMessage({
        type: 'error',
        text: 'Digite um número de telefone para o teste'
      });
      return;
    }

    setSendingTest(true);

    try {
      const response = await apiCall('/admin/whatsapp/test-message', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testMessage)
      });

      const data = await processApiResponse(response);

      if (data.success) {
        setMessage({
          type: 'success',
          text: 'Mensagem de teste enviada com sucesso!'
        });
        setTestDialogOpen(false);
      } else {
        setMessage({
          type: 'error',
          text: data.message || 'Erro ao enviar mensagem de teste'
        });
      }
    } catch (error) {
      const errorMessage = handleError(error);
      setMessage({
        type: 'error',
        text: errorMessage
      });
    } finally {
      setSendingTest(false);
    }
  };

  const getStatusIcon = (status) => {
    if (!status) return <Warning color="warning" />;
    
    if (status.isConnected) {
      return <CheckCircle color="success" />;
    } else if (status.isConnecting) {
      return <CircularProgress size={20} />;
    } else {
      return <Error color="error" />;
    }
  };

  const getStatusText = (status) => {
    if (!status) return 'Status desconhecido';
    
    if (status.isConnected) {
      return 'Conectado e funcionando';
    } else if (status.isConnecting) {
      return 'Conectando... Aguarde QR Code';
    } else {
      return 'Desconectado';
    }
  };

  const getStatusColor = (status) => {
    if (!status) return 'warning';
    
    if (status.isConnected) {
      return 'success';
    } else if (status.isConnecting) {
      return 'info';
    } else {
      return 'error';
    }
  };

  return (
    <Box sx={{ 
      width: '100%', 
      px: 2, 
      py: 3,
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
                background: 'linear-gradient(135deg, #25d366 0%, #128c7e 100%)',
                mr: 3,
                boxShadow: '0 8px 32px rgba(37, 211, 102, 0.3)'
              }}
            >
              <WhatsApp sx={{ fontSize: 28, color: 'white' }} />
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
                Configuração do WhatsApp
              </Typography>
              <Typography 
                variant="body1" 
                sx={{ 
                  color: customTheme.palette.text.secondary,
                  fontSize: '1.1rem',
                  fontWeight: 500
                }}
              >
                Gerencie a conexão do bot com WhatsApp Web
              </Typography>
            </Box>
          </Box>
        </Box>
      </Fade>

      <Grid container spacing={2} sx={{ width: '100%' }}>
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
                height: '100%',
                minHeight: '400px',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <CardContent sx={{ p: 3, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 40,
                      height: 40,
                      borderRadius: '10px',
                      backgroundColor: isDark ? 'rgba(37, 211, 102, 0.2)' : alpha('#25d366', 0.1),
                      mr: 2
                    }}
                  >
                    <ConnectedTv sx={{ color: isDark ? '#4ade80' : '#25d366', fontSize: 20 }} />
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
                      label={connectionStatus?.isConnected ? 'Online' : 'Offline'}
                      size="small"
                      color={getStatusColor(connectionStatus)}
                      sx={{ 
                        mt: 1,
                        fontWeight: 600,
                        backgroundColor: connectionStatus?.isConnected 
                          ? isDark ? '#4ade80' : '#10b981' 
                          : isDark ? '#64748b' : '#9ca3af',
                        color: connectionStatus?.isConnected 
                          ? isDark ? '#052e16' : '#ffffff'
                          : isDark ? '#f8fafc' : '#ffffff'
                      }}
                    />
                  </Box>
                </Box>

                {connectionStatus && (
                  <List dense sx={{ mt: 2, '& .MuiListItemText-primary': { color: customTheme.palette.text.primary }, '& .MuiListItemText-secondary': { color: customTheme.palette.text.secondary } }}>
                    <ListItem sx={{ px: 0 }}>
                      <ListItemText
                        primary="Cliente Disponível"
                        secondary={connectionStatus.hasClient ? 'Sim' : 'Não'}
                      />
                      {connectionStatus.hasClient ? 
                        <CheckCircle color="success" fontSize="small" /> : 
                        <Error color="error" fontSize="small" />
                      }
                    </ListItem>
                    {connectionStatus.connectionInfo && (
                      <ListItem sx={{ px: 0 }}>
                        <ListItemText
                          primary="Telefone"
                          secondary={connectionStatus.connectionInfo.phone || 'N/A'}
                        />
                        <Phone fontSize="small" color="primary" />
                      </ListItem>
                    )}
                    <ListItem sx={{ px: 0 }}>
                      <ListItemText
                        primary="Tentativas de Reconexão"
                        secondary={`${connectionStatus.reconnectAttempts || 0}/3`}
                      />
                    </ListItem>
                  </List>
                )}

                <Divider sx={{ my: 2 }} />

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {!connectionStatus?.isConnected ? (
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={handleConnect}
                      disabled={connecting || connectionStatus?.isConnecting}
                      startIcon={connecting ? <CircularProgress size={16} /> : <Link />}
                      sx={{ 
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 600,
                        background: isDark 
                          ? 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)' 
                          : 'linear-gradient(135deg, #25d366 0%, #128c7e 100%)',
                        color: isDark ? '#052e16' : '#ffffff',
                        '&:hover': {
                          background: isDark 
                            ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                            : 'linear-gradient(135deg, #20b858 0%, #0f7b6c 100%)',
                          transform: 'translateY(-1px)',
                          boxShadow: isDark ? '0 8px 25px rgba(74, 222, 128, 0.3)' : '0 8px 25px rgba(37, 211, 102, 0.3)'
                        }
                      }}
                    >
                      {connecting ? 'Conectando...' : 'Conectar WhatsApp'}
                    </Button>
                  ) : (
                    <Button
                      fullWidth
                      variant="outlined"
                      onClick={handleDisconnect}
                      disabled={disconnecting}
                      startIcon={disconnecting ? <CircularProgress size={16} /> : <LinkOff />}
                      color="error"
                      sx={{ 
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 600,
                        borderColor: isDark ? '#fb7185' : '#ef4444',
                        color: isDark ? '#fb7185' : '#ef4444',
                        '&:hover': {
                          borderColor: isDark ? '#f43f5e' : '#dc2626',
                          backgroundColor: isDark ? 'rgba(251, 113, 133, 0.1)' : 'rgba(239, 68, 68, 0.04)',
                          transform: 'translateY(-1px)'
                        }
                      }}
                    >
                      {disconnecting ? 'Desconectando...' : 'Desconectar'}
                    </Button>
                  )}
                  
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => setTestDialogOpen(true)}
                    disabled={!connectionStatus?.isConnected}
                    startIcon={<Send />}
                    sx={{ 
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
                    Enviar Teste
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Zoom>
        </Grid>

        {/* Informações da Conta */}
        <Grid item xs={12} lg={4}>
          <Zoom in timeout={1000}>
            <Card 
              elevation={0}
              sx={{ 
                borderRadius: 3, 
                border: `1px solid ${customTheme.palette.divider}`,
                backgroundColor: customTheme.palette.background.paper,
                boxShadow: isDark ? '0 4px 20px rgba(0, 0, 0, 0.3)' : '0 4px 20px rgba(0, 0, 0, 0.1)',
                transition: 'all 0.3s ease',
                height: '100%',
                minHeight: '400px',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <CardContent sx={{ p: 3, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 40,
                      height: 40,
                      borderRadius: '10px',
                      backgroundColor: isDark ? 'rgba(37, 211, 102, 0.2)' : alpha('#25d366', 0.1),
                      mr: 2
                    }}
                  >
                    <AccountCircle sx={{ color: isDark ? '#4ade80' : '#25d366', fontSize: 20 }} />
                  </Box>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      fontWeight: 700, 
                      color: customTheme.palette.text.primary,
                      fontSize: '1.1rem'
                    }}
                  >
                    Informações da Conta
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

                {!connectionStatus?.isConnected ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Smartphone sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" sx={{ mb: 1, color: 'text.secondary' }}>
                      WhatsApp não está conectado
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Clique em "Conectar WhatsApp" para iniciar a conexão
                    </Typography>
                  </Box>
                ) : accountInfo ? (
                  <>
                    <Box sx={{ textAlign: 'center', mb: 3 }}>
                      <Avatar
                        sx={{
                          width: 64,
                          height: 64,
                          mx: 'auto',
                          mb: 2,
                          bgcolor: isDark ? '#4ade80' : '#25d366',
                          fontSize: '1.5rem',
                          fontWeight: 700
                        }}
                      >
                        <WhatsApp sx={{ fontSize: 32 }} />
                      </Avatar>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, fontSize: '1rem' }}>
                        {accountInfo.pushname || 'Bot Denúncias'}
                      </Typography>
                      <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                        +{accountInfo.phone}
                      </Typography>
                      <Chip 
                        label={accountInfo.platform || 'WhatsApp Web'}
                        size="small" 
                        color="primary"
                        sx={{ mb: 2 }}
                      />
                    </Box>

                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, p: 2, borderRadius: 2, backgroundColor: isDark ? 'rgba(37, 211, 102, 0.1)' : alpha('#25d366', 0.05), border: isDark ? '1px solid rgba(37, 211, 102, 0.2)' : 'none' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          Total de Chats
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: isDark ? '#4ade80' : '#25d366' }}>
                          {accountInfo.totalChats || 0}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, p: 2, borderRadius: 2, backgroundColor: isDark ? 'rgba(37, 211, 102, 0.1)' : alpha('#25d366', 0.05), border: isDark ? '1px solid rgba(37, 211, 102, 0.2)' : 'none' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          Total de Contatos
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: isDark ? '#4ade80' : '#25d366' }}>
                          {accountInfo.totalContacts || 0}
                        </Typography>
                      </Box>

                      {accountInfo.battery && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, p: 2, borderRadius: 2, backgroundColor: isDark ? 'rgba(37, 211, 102, 0.1)' : alpha('#25d366', 0.05), border: isDark ? '1px solid rgba(37, 211, 102, 0.2)' : 'none' }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            Bateria
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: isDark ? '#4ade80' : '#25d366' }}>
                            {accountInfo.battery}% {accountInfo.plugged ? '🔌' : '🔋'}
                          </Typography>
                        </Box>
                      )}

                      {accountInfo.connectedAt && (
                        <Box sx={{ p: 2, borderRadius: 2, backgroundColor: isDark ? 'rgba(37, 211, 102, 0.1)' : alpha('#25d366', 0.05), border: isDark ? '1px solid rgba(37, 211, 102, 0.2)' : 'none' }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                            Conectado em
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {new Date(accountInfo.connectedAt).toLocaleString('pt-BR')}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 2 }}>
                    <CircularProgress />
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Carregando informações da conta...
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Zoom>
        </Grid>

        {/* Estatísticas de Conversas */}
        <Grid item xs={12} lg={4}>
          <Zoom in timeout={1200}>
            <Card 
              elevation={0}
              sx={{ 
                borderRadius: 3, 
                border: `1px solid ${customTheme.palette.divider}`,
                backgroundColor: customTheme.palette.background.paper,
                boxShadow: isDark ? '0 4px 20px rgba(0, 0, 0, 0.3)' : '0 4px 20px rgba(0, 0, 0, 0.1)',
                transition: 'all 0.3s ease',
                height: '100%',
                minHeight: '400px',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <CardContent sx={{ p: 3, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 40,
                      height: 40,
                      borderRadius: '10px',
                      backgroundColor: isDark ? 'rgba(37, 211, 102, 0.2)' : alpha('#25d366', 0.1),
                      mr: 2
                    }}
                  >
                    <Info sx={{ color: isDark ? '#4ade80' : '#25d366', fontSize: 20 }} />
                  </Box>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      fontWeight: 700, 
                      color: customTheme.palette.text.primary,
                      fontSize: '1.1rem'
                    }}
                  >
                    Estatísticas
                  </Typography>
                </Box>

                {conversations ? (
                  <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                    {/* Estatísticas principais */}
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                      <Grid item xs={4}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h3" sx={{ fontWeight: 700, color: isDark ? '#4ade80' : '#25d366', fontSize: '1.8rem', mb: 0.5 }}>
                            {conversations.total}
                          </Typography>
                          <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 500, fontSize: '0.7rem' }}>
                            Total
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={4}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h3" sx={{ fontWeight: 700, color: '#ff9800', fontSize: '1.8rem', mb: 0.5 }}>
                            {conversations.ativos}
                          </Typography>
                          <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 500, fontSize: '0.7rem' }}>
                            Ativas
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={4}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h3" sx={{ fontWeight: 700, color: '#2196f3', fontSize: '1.8rem', mb: 0.5 }}>
                            {conversations.distribuicaoPorEstado?.length || 0}
                          </Typography>
                          <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 500, fontSize: '0.7rem' }}>
                            Estados
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>

                    {/* Distribuição por Estado */}
                    {conversations.distribuicaoPorEstado && conversations.distribuicaoPorEstado.length > 0 && (
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, color: '#1a1a1a' }}>
                          Distribuição por Estado:
                        </Typography>
                        <Box sx={{ maxHeight: '250px', overflowY: 'auto' }}>
                          <Grid container spacing={1}>
                            {conversations.distribuicaoPorEstado.slice(0, 6).map((item, index) => (
                              <Grid item xs={6} key={index}>
                                <Box sx={{ 
                                  p: 1.5, 
                                  borderRadius: 1.5, 
                                  border: '1px solid #e0e0e0',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  transition: 'all 0.3s ease',
                                  '&:hover': {
                                    borderColor: '#25d366',
                                    transform: 'translateY(-1px)',
                                    boxShadow: '0 2px 8px rgba(37, 211, 102, 0.1)'
                                  }
                                }}>
                                  <Typography variant="caption" sx={{ fontWeight: 500, fontSize: '0.7rem' }}>
                                    {item.estado}
                                  </Typography>
                                  <Chip 
                                    label={item.count} 
                                    size="small" 
                                    sx={{
                                      backgroundColor: isDark ? 'rgba(37, 211, 102, 0.2)' : alpha('#25d366', 0.1),
                                      color: isDark ? '#4ade80' : '#25d366',
                                      fontWeight: 600,
                                      height: '20px',
                                      fontSize: '0.65rem'
                                    }}
                                  />
                                </Box>
                              </Grid>
                            ))}
                          </Grid>
                          {conversations.distribuicaoPorEstado.length > 6 && (
                            <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
                              +{conversations.distribuicaoPorEstado.length - 6} outros estados
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    )}
                  </Box>
                ) : (
                  <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                    <CircularProgress size={40} sx={{ mb: 2 }} />
                    <Typography variant="body1" color="textSecondary" sx={{ fontWeight: 500 }}>
                      Carregando estatísticas...
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Zoom>
        </Grid>

      </Grid>

      {/* Dialog do QR Code */}
      <Dialog 
        open={qrDialogOpen} 
        onClose={() => setQrDialogOpen(false)}
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
            <QrCode sx={{ mr: 1, color: isDark ? '#4ade80' : '#25d366' }} />
            Escaneie o QR Code
          </Box>
        </DialogTitle>
        <DialogContent sx={{ backgroundColor: customTheme.palette.background.paper }}>
          <Box sx={{ textAlign: 'center', py: 2 }}>
            {qrCode ? (
              <Box>
                <img 
                  src={`data:image/png;base64,${qrCode}`} 
                  alt="QR Code WhatsApp"
                  style={{ maxWidth: '100%', height: 'auto' }}
                />
                <Typography variant="body2" sx={{ mt: 2, color: customTheme.palette.text.secondary }}>
                  1. Abra o WhatsApp no seu celular<br/>
                  2. Toque em Menu (⋮) ou Configurações<br/>
                  3. Toque em "Dispositivos conectados"<br/>
                  4. Toque em "Conectar dispositivo"<br/>
                  5. Escaneie este código QR
                </Typography>
              </Box>
            ) : (
              <Box>
                <CircularProgress size={48} sx={{ mb: 2 }} />
                <Typography variant="body1" color={customTheme.palette.text.primary}>
                  Gerando QR Code...
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ backgroundColor: customTheme.palette.background.paper, borderTop: `1px solid ${customTheme.palette.divider}` }}>
          <Button onClick={() => setQrDialogOpen(false)} sx={{ color: customTheme.palette.text.secondary }}>
            Fechar
          </Button>
          <Button onClick={loadStatus} startIcon={<Refresh />} sx={{ color: customTheme.palette.primary.main }}>
            Atualizar
          </Button>
        </DialogActions>
      </Dialog>

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
            <Send sx={{ mr: 1, color: isDark ? '#4ade80' : '#25d366' }} />
            Enviar Mensagem de Teste
          </Box>
        </DialogTitle>
        <DialogContent sx={{ backgroundColor: customTheme.palette.background.paper }}>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Número de telefone"
              placeholder="5511999999999"
              value={testMessage.phoneNumber}
              onChange={(e) => setTestMessage(prev => ({ ...prev, phoneNumber: e.target.value }))}
              sx={{ mb: 2 }}
              helperText="Digite o número com código do país (ex: 5511999999999)"
              sx={{
                '& .MuiOutlinedInput-root': {
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
            />
            
            <TextField
              fullWidth
              label="Mensagem"
              multiline
              rows={3}
              value={testMessage.message}
              onChange={(e) => setTestMessage(prev => ({ ...prev, message: e.target.value }))}
              helperText="Mensagem que será enviada para teste"
              sx={{
                '& .MuiOutlinedInput-root': {
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
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ backgroundColor: customTheme.palette.background.paper, borderTop: `1px solid ${customTheme.palette.divider}` }}>
          <Button onClick={() => setTestDialogOpen(false)} sx={{ color: customTheme.palette.text.secondary }}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSendTest}
            disabled={sendingTest || !testMessage.phoneNumber}
            startIcon={sendingTest ? <CircularProgress size={16} /> : <Send />}
            variant="contained"
            sx={{
              background: isDark 
                ? 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)' 
                : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              '&:hover': {
                background: isDark 
                  ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                  : 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)'
              }
            }}
          >
            {sendingTest ? 'Enviando...' : 'Enviar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WhatsAppConfig;