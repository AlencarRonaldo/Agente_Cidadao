import React, { useState, useEffect, useCallback, memo, useMemo } from 'react';
import PropTypes from 'prop-types';
import { apiCall, processApiResponse } from '../config/api';
import { useErrorHandler } from '../utils/errorUtils';
import { useCustomTheme } from '../contexts/ThemeContext';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  ButtonGroup,
  Checkbox,
  Tooltip,
} from '@mui/material';
import {
  Visibility,
  Edit,
  Check,
  Close,
  Search,
  Refresh,
  CheckCircle,
  Cancel,
  Image,
  ZoomIn,
  BrokenImage,
  Schedule,
  Instagram,
  TryAgain,
  PriorityHigh,
  AccessTime,
  CheckCircleOutline,
  ErrorOutline,
  PendingActions,
  PublishedWithChanges
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import LoadingState from './LoadingState';
import { withApiErrorBoundary } from './ApiErrorBoundary';
import { optimizedScrollHandler, applyScrollOptimizations } from '../utils/scrollOptimizer';
import { safeStopPropagation } from '../utils/eventUtils';

const STATUS_COLORS = {
  'RECEBIDA': 'info',
  'PROCESSANDO': 'warning', 
  'APROVADA_BOT': 'success',
  'PENDENTE_MODERACAO': 'warning',
  'APROVADA_ADMIN': 'success',
  'REJEITADA_BOT': 'error',
  'REJEITADA_ADMIN': 'error',
  'AGENDADA': 'info',
  'PUBLICADA': 'success',
  'ERRO': 'error'
};

const STATUS_LABELS = {
  'RECEBIDA': 'Recebida',
  'PROCESSANDO': 'Processando',
  'APROVADA_BOT': 'Aprovada (Bot)',
  'PENDENTE_MODERACAO': 'Pendente Moderação',
  'APROVADA_ADMIN': 'Aprovada (Admin)',
  'REJEITADA_BOT': 'Rejeitada (Bot)',
  'REJEITADA_ADMIN': 'Rejeitada (Admin)',
  'AGENDADA': 'Agendada',
  'PUBLICADA': 'Publicada',
  'ERRO': 'Erro'
};

function DenunciationList({ token }) {
  const { theme, isDark } = useCustomTheme();
  
  // Estados
  const [denuncias, setDenuncias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  
  // Paginação
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  
  // Filtros
  const [filters, setFilters] = useState({
    status: '',
    bairro: '',
    search: '',
    dataInicio: '',
    dataFim: '',
    publicationStatus: '',
    priority: ''
  });
  
  // Diálogos
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState(''); // 'view', 'edit', 'approve', 'reject'
  const [selectedDenuncia, setSelectedDenuncia] = useState(null);
  const [actionReason, setActionReason] = useState('');
  const [editedText, setEditedText] = useState('');
  const [observations, setObservations] = useState('');
  
  // Security validation fields for aprovar-e-postar
  const [securityFields, setSecurityFields] = useState({
    confirmarPublicacao: '',
    usuarioConfirmacao: '',
    motivoUrgencia: ''
  });
  
  // Validation states for real-time feedback
  const [fieldErrors, setFieldErrors] = useState({
    confirmarPublicacao: '',
    usuarioConfirmacao: '',
    motivoUrgencia: ''
  });
  
  const [fieldTouched, setFieldTouched] = useState({
    confirmarPublicacao: false,
    usuarioConfirmacao: false,
    motivoUrgencia: false
  });
  
  // Image modal states
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState('');
  const [imageLoadError, setImageLoadError] = useState({});

  const { handleError } = useErrorHandler('DenunciationList');

  // FIXED: Enhanced loadDenuncias function with better error handling and debugging
  const loadDenuncias = useCallback(async () => {
    if (!token) {      setError('Token de autenticação não encontrado');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);      // Build query parameters
      const params = new URLSearchParams({
        page: page + 1,
        limit: rowsPerPage,
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))
      });

      const url = `/admin/denuncias?${params}`;

      const response = await apiCall(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });      if (!response.ok) {
        const errorText = await response.text();        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await processApiResponse(response);      // FIXED: Ensure data.data exists and is an array
      const denunciasData = Array.isArray(data.data) ? data.data : [];
      const paginationData = data.pagination || { total: 0, page: 1, limit: rowsPerPage };
      
      setDenuncias(denunciasData);
      setTotalCount(paginationData.total);
      setError(null);    } catch (err) {      const errorMessage = err.message || 'Erro ao carregar denúncias';
      handleError(err);
      setError(errorMessage);
      setDenuncias([]); // Ensure we have an empty array on error
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, filters, token]); // CORREÇÃO: Removido handleError para evitar loop infinito

  // Load denuncias on mount and when dependencies change
  useEffect(() => {
    loadDenuncias();
  }, [loadDenuncias]);

  // FIXED: Enhanced dialog handlers with comprehensive error handling
  const openDialog = useCallback((type, denuncia = null) => {    if (!type) {      return;
    }
    
    if (!denuncia && type !== 'batch') {      return;
    }
    
    try {
      // Reset all dialog states first
      setDialogOpen(false);
      setDialogType('');
      setSelectedDenuncia(null);
      setActionReason('');
      setEditedText('');
      setObservations('');
      setSecurityFields({
        confirmarPublicacao: '',
        usuarioConfirmacao: '',
        motivoUrgencia: ''
      });
      
      // Use immediate state update for better reliability
      setTimeout(() => {
        setDialogType(type);
        setSelectedDenuncia(denuncia);
        
        if (type === 'editar' && denuncia) {
          setEditedText(denuncia.textoFiltrado || denuncia.texto || '');
        }
        
        setDialogOpen(true);      }, 50); // Small delay to ensure state updates are processed
      
    } catch (error) {      setError('Erro ao abrir diálogo: ' + error.message);
    }
  }, []);

  const closeDialog = useCallback(() => {
    setDialogOpen(false);
    setSelectedDenuncia(null);
    setActionReason('');
    setEditedText('');
    setObservations('');
    setDialogType('');
    setSecurityFields({
      confirmarPublicacao: '',
      usuarioConfirmacao: '',
      motivoUrgencia: ''
    });
    // Reset validation states
    setFieldErrors({
      confirmarPublicacao: '',
      usuarioConfirmacao: '',
      motivoUrgencia: ''
    });
    setFieldTouched({
      confirmarPublicacao: false,
      usuarioConfirmacao: false,
      motivoUrgencia: false
    });
  }, []);

  // FIXED: Enhanced action handler with better validation
  const handleAction = async (action, denunciaId, payload = {}) => {
    if (!action || !denunciaId) {
      const errorMsg = 'Ação ou ID da denúncia não fornecidos';      setError(errorMsg);
      return;
    }

    if (!token) {
      const errorMsg = 'Token de autenticação não encontrado';      setError(errorMsg);
      return;
    }

    // 🐛 DEBUG: Log the action being performed
    console.log('🐛 DEBUG - handleAction called', {
      action,
      denunciaId,
      payload,
      timestamp: new Date().toISOString()
    });

    try {      const actionEndpoints = {
        'aprovar': 'aprovar',
        'approve': 'aprovar',
        'rejeitar': 'rejeitar', 
        'reject': 'rejeitar',
        'editar': 'editar',
        'edit': 'editar',
        'aprovar-e-postar': 'aprovar-e-postar'
      };
      
      const endpoint = actionEndpoints[action] || action;
      const url = `/admin/denuncias/${denunciaId}/${endpoint}`;
      
      // 🐛 DEBUG: Log request details
      console.log('🐛 DEBUG - Making API request', {
        url,
        method: 'POST',
        payload,
        payloadStringified: JSON.stringify(payload)
      });

      const response = await apiCall(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },  
        body: JSON.stringify(payload)
      });

      // 🐛 DEBUG: Log response details
      console.log('🐛 DEBUG - API response received', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        url: response.url
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('🐛 DEBUG - API error response', {
          status: response.status,
          statusText: response.statusText,
          errorText
        });
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const result = await processApiResponse(response);
      
      // 🐛 DEBUG: Log successful result
      console.log('🐛 DEBUG - API success result', {
        result,
        action,
        denunciaId
      });

      // Reload data and close dialog
      await loadDenuncias();
      closeDialog();
      setSelectedItems([]);
      
    } catch (err) {
      // 🐛 DEBUG: Log error details
      console.error('🐛 DEBUG - handleAction error', {
        error: err,
        message: err.message,
        stack: err.stack,
        action,
        denunciaId,
        payload
      });
      
      const errorMessage = err.message || 'Erro ao executar ação';
      setError(errorMessage);
    }
  };

  // FIXED: Enhanced image handling with safe event propagation using utility
  const handleImageClick = useCallback((imageUrl, event) => {
    try {
      // Safe event handling using utility function
      safeStopPropagation(event, {
        preventDefault: true,
        stopPropagation: true,
        stopImmediatePropagation: true,
        silent: false
      });
      
      if (!imageUrl) {
        console.warn('handleImageClick: No image URL provided');
        return;
      }
      
      setSelectedImageUrl(imageUrl);
      setImageModalOpen(true);
    } catch (error) {
      console.error('Error in handleImageClick:', error);
      setError('Erro ao abrir imagem: ' + error.message);
    }
  }, []);

  const closeImageModal = useCallback(() => {
    setImageModalOpen(false);
    setSelectedImageUrl('');
  }, []);

  // FIXED: Enhanced ActionButtons component with better event handling
  const ActionButtons = memo(({ denuncia, onOpenDialog }) => {
    const canModerate = useMemo(() => 
      ['PENDENTE_MODERACAO', 'RECEBIDA', 'PROCESSANDO'].includes(denuncia?.status),
      [denuncia?.status]
    );

    // FIXED: Move useCallback before conditional returns to fix React Hooks rule violation
    const handleButtonClick = useCallback((action, event) => {
      try {
        // Safe event handling using utility function
        safeStopPropagation(event, {
          preventDefault: true,
          stopPropagation: true,
          stopImmediatePropagation: true,
          silent: false
        });
        
        // Validate parameters
        if (!action || !onOpenDialog || typeof onOpenDialog !== 'function') {
          console.warn('handleButtonClick: Invalid parameters', { action, onOpenDialog });
          return;
        }
        
        // Call the dialog opener
        onOpenDialog(action, denuncia);
      } catch (error) {
        console.error('Error in handleButtonClick:', error);
        // Use console.error instead of alert for better UX
      }
    }, [denuncia, onOpenDialog]);

    // FIXED: Move conditional return after all hooks
    if (!denuncia || !onOpenDialog) {      return null;
    }
    
    return (
      <ButtonGroup 
        size="small" 
        sx={{ 
          '& .MuiIconButton-root': {
            margin: '0 2px'
          }
        }}
      >
        {/* View Button - Always available */}
        <Tooltip title="Visualizar denúncia">
          <IconButton 
            onClick={(e) => handleButtonClick('visualizar', e)}
            color="primary"
            sx={{ 
              '&:hover': { backgroundColor: 'primary.light', color: 'white' }
            }}
          >
            <Visibility />
          </IconButton>
        </Tooltip>
        
        {/* Moderation buttons - Only for moderatable statuses */}
        {canModerate && (
          <>
            <Tooltip title="Aprovar denúncia (agenda na fila)">
              <IconButton 
                onClick={(e) => handleButtonClick('aprovar', e)}
                color="success"
                sx={{ 
                  '&:hover': { backgroundColor: 'success.light', color: 'white' }
                }}
              >
                <Check />
              </IconButton>
            </Tooltip>
            
            {/* NOVO: Botão Aprovar e Postar Imediatamente */}
            <Tooltip title="⚡ Aprovar e Postar AGORA (Bypass da Fila)">
              <IconButton 
                onClick={(e) => handleButtonClick('aprovar-e-postar', e)}
                sx={{ 
                  background: 'linear-gradient(45deg, #28a745, #007bff)',
                  color: 'white',
                  border: 'none',
                  position: 'relative',
                  overflow: 'hidden',
                  '&:hover': { 
                    background: 'linear-gradient(45deg, #218838, #0056b3)',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
                  },
                  '&:active': {
                    transform: 'translateY(0)'
                  },
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: '-100%',
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                    transition: 'left 0.5s'
                  },
                  '&:hover::before': {
                    left: '100%'
                  }
                }}
              >
                ⚡
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Rejeitar denúncia">
              <IconButton 
                onClick={(e) => handleButtonClick('rejeitar', e)}
                color="error"
                sx={{ 
                  '&:hover': { backgroundColor: 'error.light', color: 'white' }
                }}
              >
                <Close />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Editar denúncia">
              <IconButton 
                onClick={(e) => handleButtonClick('editar', e)}
                color="secondary"
                sx={{ 
                  '&:hover': { backgroundColor: 'secondary.light', color: 'white' }
                }}
              >
                <Edit />
              </IconButton>
            </Tooltip>
          </>
        )}
      </ButtonGroup>
    );
  });
  
  ActionButtons.propTypes = {
    denuncia: PropTypes.object.isRequired,
    onOpenDialog: PropTypes.func.isRequired
  };

  // Status chip component
  const StatusChip = memo(({ status }) => (
    <Chip 
      label={STATUS_LABELS[status] || status}
      color={STATUS_COLORS[status] || 'default'}
      size="small"
    />
  ));

  // Loading state
  if (loading && denuncias.length === 0) {
    return <LoadingState variant="table" rows={10} fullHeight />;
  }

  return (
    <Box>
      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Debug Info (Development Only) */}

      {/* Filters */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Buscar"
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                InputProps={{
                  startAdornment: <Search />
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                >
                  <MenuItem value="">Todos</MenuItem>
                  {Object.entries(STATUS_LABELS).map(([key, label]) => (
                    <MenuItem key={key} value={key}>{label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Bairro"
                value={filters.bairro}
                onChange={(e) => setFilters(prev => ({ ...prev, bairro: e.target.value }))}
              />
            </Grid>
            
            <Grid item xs={12} md={2}>
              <Button
                variant="outlined"
                onClick={() => setFilters({
                  status: '',
                  bairro: '',
                  search: '',
                  dataInicio: '',
                  dataFim: '',
                  publicationStatus: '',
                  priority: ''
                })}
                fullWidth
              >
                Limpar
              </Button>
            </Grid>
          </Grid>
          
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <IconButton 
              onClick={loadDenuncias} 
              disabled={loading}
              color="primary"
            >
              <Refresh />
            </IconButton>
          </Box>
        </CardContent>
      </Card>

      {/* Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Protocolo</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Texto</TableCell>
              <TableCell>Bairro</TableCell>
              <TableCell>Data</TableCell>
              <TableCell>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {denuncias.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                    {loading ? 'Carregando denúncias...' : 'Nenhuma denúncia encontrada'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              denuncias.map((denuncia) => (
                <TableRow key={denuncia.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {denuncia.protocolo}
                    </Typography>
                  </TableCell>
                  
                  <TableCell>
                    <StatusChip status={denuncia.status} />
                  </TableCell>
                  
                  <TableCell>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        maxWidth: 300,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {denuncia.textoFiltrado || denuncia.texto}
                    </Typography>
                  </TableCell>
                  
                  <TableCell>{denuncia.bairro}</TableCell>
                  
                  <TableCell>
                    <Typography variant="body2">
                      {format(new Date(denuncia.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </Typography>
                  </TableCell>
                  
                  <TableCell>
                    <ActionButtons denuncia={denuncia} onOpenDialog={openDialog} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        
        {denuncias.length > 0 && (
          <TablePagination
            component="div"
            count={totalCount}
            page={page}
            onPageChange={(e, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            labelRowsPerPage="Itens por página"
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
          />
        )}
      </TableContainer>

      {/* Action Dialog */}
      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {dialogType === 'visualizar' && 'Visualizar Denúncia'}
          {dialogType === 'editar' && 'Editar Denúncia'}
          {dialogType === 'aprovar' && 'Aprovar Denúncia'}
          {dialogType === 'rejeitar' && 'Rejeitar Denúncia'}
          {dialogType === 'aprovar-e-postar' && '⚡ Aprovar e Postar IMEDIATAMENTE'}
        </DialogTitle>
        
        <DialogContent>
          {selectedDenuncia && (
            <Box>
              {dialogType === 'visualizar' && (
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Typography variant="h6">Protocolo: {selectedDenuncia.protocolo}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography><strong>Status:</strong> <StatusChip status={selectedDenuncia.status} /></Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography><strong>Texto:</strong></Typography>
                    <Typography variant="body2">{selectedDenuncia.texto}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography><strong>Bairro:</strong> {selectedDenuncia.bairro}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography><strong>Data:</strong> {format(new Date(selectedDenuncia.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</Typography>
                  </Grid>
                </Grid>
              )}
              
              {dialogType === 'editar' && (
                <Box>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    label="Texto"
                    value={editedText}
                    onChange={(e) => setEditedText(e.target.value)}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    label="Observações (opcional)"
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                  />
                </Box>
              )}
              
              {(dialogType === 'aprovar' || dialogType === 'rejeitar') && (
                <Box>
                  {dialogType === 'rejeitar' && (
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      label="Motivo da Rejeição"
                      value={actionReason}
                      onChange={(e) => setActionReason(e.target.value)}
                      required
                      sx={{ mb: 2 }}
                    />
                  )}
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    label="Observações (opcional)"
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                  />
                </Box>
              )}
              
              {dialogType === 'aprovar-e-postar' && (
                <Box>
                  <Alert severity="warning" sx={{ mb: 3 }}>
                    <Typography variant="h6" sx={{ mb: 1, color: '#ed6c02', fontWeight: 'bold' }}>
                      ⚠️ ATENÇÃO: PUBLICAÇÃO IMEDIATA
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                      Esta ação irá <strong>BYPASS COMPLETO</strong> da fila de agendamentos:
                    </Typography>
                    <Box component="ul" sx={{ margin: 0, paddingLeft: 2 }}>
                      <li>✅ <strong>Aprovar</strong> a denúncia</li>
                      <li>⚡ <strong>PULAR</strong> toda a fila de agendamentos</li>
                      <li>📤 <strong>Publicar AGORA MESMO</strong> no Instagram</li>
                      <li>🌐 Tornar <strong>visível publicamente</strong> instantaneamente</li>
                    </Box>
                    <Typography variant="body2" sx={{ mt: 2, fontStyle: 'italic' }}>
                      💡 Diferente do botão "Aprovar" normal que agenda para publicação posterior.
                    </Typography>
                  </Alert>
                  
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    📋 Denúncia: {selectedDenuncia?.protocolo}
                  </Typography>
                  
                  <Typography variant="body2" sx={{ mb: 2, padding: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                    <strong>Texto:</strong> {selectedDenuncia?.texto}
                  </Typography>
                  
                  <Typography variant="body2" sx={{ mb: 3 }}>
                    <strong>Bairro:</strong> {selectedDenuncia?.bairro}
                  </Typography>
                  
                  {/* Security Validation Fields */}
                  <Alert severity="info" sx={{ mb: 3 }}>
                    <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold' }}>
                      🔐 Validação de Segurança Obrigatória
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                      Por segurança, todos os campos abaixo são obrigatórios para publicação imediata:
                    </Typography>
                    <Box component="ul" sx={{ margin: 0, paddingLeft: 2, '& li': { mb: 1 } }}>
                      <li><strong>Confirmação:</strong> Deve selecionar "CONFIRMO A PUBLICAÇÃO IMEDIATA"</li>
                      <li><strong>Usuário:</strong> Mínimo 3 caracteres (ex: "João Silva")</li>
                      <li><strong>Motivo:</strong> Mínimo 10 caracteres explicando a urgência</li>
                    </Box>
                    <Typography variant="body2" sx={{ mt: 2, fontStyle: 'italic', color: 'info.dark' }}>
                      💡 Os campos ficam verdes quando preenchidos corretamente
                    </Typography>
                  </Alert>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <FormControl 
                        fullWidth 
                        required 
                        error={fieldTouched.confirmarPublicacao && !securityFields.confirmarPublicacao}
                      >
                        <InputLabel 
                          sx={{ 
                            color: securityFields.confirmarPublicacao ? 'success.main' : 'inherit',
                            '&.Mui-focused': {
                              color: securityFields.confirmarPublicacao ? 'success.main' : 'primary.main'
                            }
                          }}
                        >
                          {securityFields.confirmarPublicacao ? '✅' : '🔐'} Confirmar Publicação *
                        </InputLabel>
                        <Select
                          value={securityFields.confirmarPublicacao}
                          onChange={(e) => {
                            const value = e.target.value;
                            setSecurityFields(prev => ({ ...prev, confirmarPublicacao: value }));
                            setFieldTouched(prev => ({ ...prev, confirmarPublicacao: true }));
                            setFieldErrors(prev => ({ 
                              ...prev, 
                              confirmarPublicacao: value ? '' : 'Você deve confirmar a publicação imediata' 
                            }));
                          }}
                          onBlur={() => setFieldTouched(prev => ({ ...prev, confirmarPublicacao: true }))}
                          label="Confirmar Publicação"
                          sx={{
                            '& .MuiOutlinedInput-notchedOutline': {
                              borderColor: securityFields.confirmarPublicacao ? 'success.main' : 'inherit'
                            }
                          }}
                        >
                          <MenuItem value="" disabled>
                            <Box sx={{ display: 'flex', alignItems: 'center', opacity: 0.6 }}>
                              <Typography>⚠️ Selecione para continuar</Typography>
                            </Box>
                          </MenuItem>
                          <MenuItem value="CONFIRMO_PUBLICACAO_IMEDIATA">
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography sx={{ color: 'success.main', fontWeight: 'bold' }}>✅</Typography>
                              <Box>
                                <Typography sx={{ fontWeight: 'bold', color: 'success.main' }}>
                                  CONFIRMO A PUBLICAÇÃO IMEDIATA
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                  Esta denúncia será publicada instantaneamente
                                </Typography>
                              </Box>
                            </Box>
                          </MenuItem>
                        </Select>
                        {fieldTouched.confirmarPublicacao && !securityFields.confirmarPublicacao && (
                          <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1 }}>
                            ❌ Este campo é obrigatório - você deve confirmar a publicação
                          </Typography>
                        )}
                        {securityFields.confirmarPublicacao && (
                          <Typography variant="caption" color="success.main" sx={{ mt: 0.5, ml: 1 }}>
                            ✅ Confirmação registrada - publicação será imediata
                          </Typography>
                        )}
                      </FormControl>
                    </Grid>
                    
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        required
                        label={`${securityFields.usuarioConfirmacao.length >= 3 ? '✅' : '👤'} Nome do Usuário que Confirma *`}
                        value={securityFields.usuarioConfirmacao}
                        onChange={(e) => {
                          const value = e.target.value;
                          setSecurityFields(prev => ({ ...prev, usuarioConfirmacao: value }));
                          setFieldTouched(prev => ({ ...prev, usuarioConfirmacao: true }));
                          
                          if (value.length === 0) {
                            setFieldErrors(prev => ({ ...prev, usuarioConfirmacao: 'Nome é obrigatório' }));
                          } else if (value.length < 3) {
                            setFieldErrors(prev => ({ ...prev, usuarioConfirmacao: `Mínimo 3 caracteres (atual: ${value.length})` }));
                          } else {
                            setFieldErrors(prev => ({ ...prev, usuarioConfirmacao: '' }));
                          }
                        }}
                        onBlur={() => setFieldTouched(prev => ({ ...prev, usuarioConfirmacao: true }))}
                        placeholder="Ex: João Silva"
                        error={fieldTouched.usuarioConfirmacao && fieldErrors.usuarioConfirmacao !== ''}
                        helperText={
                          fieldTouched.usuarioConfirmacao && fieldErrors.usuarioConfirmacao ? (
                            <span style={{ color: 'error.main' }}>❌ {fieldErrors.usuarioConfirmacao}</span>
                          ) : securityFields.usuarioConfirmacao.length >= 3 ? (
                            <span style={{ color: 'green' }}>✅ Nome válido - {securityFields.usuarioConfirmacao.length} caracteres</span>
                          ) : (
                            'Mínimo 3 caracteres - Nome da pessoa responsável pela aprovação'
                          )
                        }
                        inputProps={{ 
                          minLength: 3,
                          maxLength: 100
                        }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            '& fieldset': {
                              borderColor: securityFields.usuarioConfirmacao.length >= 3 ? 'success.main' : 'inherit'
                            }
                          }
                        }}
                      />
                    </Grid>
                    
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        required
                        multiline
                        rows={4}
                        label={`${securityFields.motivoUrgencia.length >= 10 ? '✅' : '📝'} Motivo da Urgência * (${securityFields.motivoUrgencia.length}/10)`}
                        value={securityFields.motivoUrgencia}
                        onChange={(e) => {
                          const value = e.target.value;
                          setSecurityFields(prev => ({ ...prev, motivoUrgencia: value }));
                          setFieldTouched(prev => ({ ...prev, motivoUrgencia: true }));
                          
                          if (value.length === 0) {
                            setFieldErrors(prev => ({ ...prev, motivoUrgencia: 'Motivo da urgência é obrigatório' }));
                          } else if (value.length < 10) {
                            setFieldErrors(prev => ({ ...prev, motivoUrgencia: `Mínimo 10 caracteres (faltam ${10 - value.length})` }));
                          } else {
                            setFieldErrors(prev => ({ ...prev, motivoUrgencia: '' }));
                          }
                        }}
                        onBlur={() => setFieldTouched(prev => ({ ...prev, motivoUrgencia: true }))}
                        placeholder="Ex: Situação de emergência que requer divulgação imediata para segurança pública..."
                        error={fieldTouched.motivoUrgencia && fieldErrors.motivoUrgencia !== ''}
                        helperText={
                          fieldTouched.motivoUrgencia && fieldErrors.motivoUrgencia ? (
                            <span style={{ color: 'error.main' }}>❌ {fieldErrors.motivoUrgencia}</span>
                          ) : securityFields.motivoUrgencia.length >= 10 ? (
                            <span style={{ color: 'green' }}>✅ Justificativa válida - {securityFields.motivoUrgencia.length} caracteres</span>
                          ) : (
                            '💡 Explique detalhadamente por que esta denúncia precisa pular a fila de agendamentos'
                          )
                        }
                        inputProps={{ 
                          minLength: 10,
                          maxLength: 500
                        }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            '& fieldset': {
                              borderColor: securityFields.motivoUrgencia.length >= 10 ? 'success.main' : 'inherit'
                            }
                          }
                        }}
                      />
                    </Grid>
                    
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        multiline
                        rows={2}
                        label="Observações Adicionais (Opcional)"
                        value={observations}
                        onChange={(e) => setObservations(e.target.value)}
                        placeholder="Instruções especiais, contexto adicional, etc."
                      />
                    </Grid>
                    
                    {/* Validation Summary */}
                    <Grid item xs={12}>
                      <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 2, border: '1px solid', borderColor: 'grey.200' }}>
                        <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                          📋 Status da Validação
                        </Typography>
                        
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          {/* Confirmação Status */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {securityFields.confirmarPublicacao ? (
                              <Typography color="success.main" sx={{ fontWeight: 'bold' }}>✅ Confirmação: OK</Typography>
                            ) : (
                              <Typography color="error.main">❌ Confirmação: Pendente</Typography>
                            )}
                          </Box>
                          
                          {/* Usuário Status */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {securityFields.usuarioConfirmacao.length >= 3 ? (
                              <Typography color="success.main" sx={{ fontWeight: 'bold' }}>✅ Usuário: OK ({securityFields.usuarioConfirmacao.length} chars)</Typography>
                            ) : (
                              <Typography color="error.main">❌ Usuário: Pendente {securityFields.usuarioConfirmacao.length > 0 ? `(${securityFields.usuarioConfirmacao.length}/3)` : ''}</Typography>
                            )}
                          </Box>
                          
                          {/* Motivo Status */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {securityFields.motivoUrgencia.length >= 10 ? (
                              <Typography color="success.main" sx={{ fontWeight: 'bold' }}>✅ Motivo: OK ({securityFields.motivoUrgencia.length} chars)</Typography>
                            ) : (
                              <Typography color="error.main">❌ Motivo: Pendente {securityFields.motivoUrgencia.length > 0 ? `(${securityFields.motivoUrgencia.length}/10)` : ''}</Typography>
                            )}
                          </Box>
                        </Box>
                        
                        {/* Overall Status */}
                        <Box sx={{ mt: 2, p: 1.5, borderRadius: 1, bgcolor: 
                          (securityFields.confirmarPublicacao && 
                           securityFields.usuarioConfirmacao.length >= 3 && 
                           securityFields.motivoUrgencia.length >= 10) 
                          ? 'success.light' : 'warning.light' 
                        }}>
                          {(securityFields.confirmarPublicacao && 
                            securityFields.usuarioConfirmacao.length >= 3 && 
                            securityFields.motivoUrgencia.length >= 10) ? (
                            <Typography sx={{ fontWeight: 'bold', color: 'success.dark', textAlign: 'center' }}>
                              🎉 Todos os campos estão válidos! Você pode publicar agora.
                            </Typography>
                          ) : (
                            <Typography sx={{ fontWeight: 'bold', color: 'warning.dark', textAlign: 'center' }}>
                              ⚠️ Complete todos os campos obrigatórios para habilitar a publicação.
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </Grid>
                  </Grid>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={closeDialog}>Cancelar</Button>
          {dialogType === 'editar' && (
            <Button 
              variant="contained"
              onClick={() => handleAction('editar', selectedDenuncia.id, {
                textoFiltrado: editedText,
                observacoes: observations
              })}
            >
              Salvar
            </Button>
          )}
          {dialogType === 'aprovar' && (
            <Button 
              variant="contained" 
              color="success"
              onClick={() => handleAction('aprovar', selectedDenuncia.id, { 
                observacoes: observations 
              })}
            >
              Aprovar
            </Button>
          )}
          {dialogType === 'rejeitar' && (
            <Button 
              variant="contained" 
              color="error"
              onClick={() => handleAction('rejeitar', selectedDenuncia.id, {
                motivo: actionReason,
                observacoes: observations
              })}
              disabled={!actionReason.trim()}
            >
              Rejeitar
            </Button>
          )}
          {dialogType === 'aprovar-e-postar' && (
            <>
              {/* Validation errors display */}
              {(!securityFields.confirmarPublicacao || 
                !securityFields.usuarioConfirmacao || 
                securityFields.usuarioConfirmacao.length < 3 ||
                !securityFields.motivoUrgencia ||
                securityFields.motivoUrgencia.length < 10) && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 2 }}>
                  <Typography variant="caption" color="error" sx={{ fontWeight: 'bold' }}>
                    ⚠️ Complete todos os campos obrigatórios
                  </Typography>
                </Box>
              )}
              
              <Button 
                variant="contained"
                sx={{
                  background: 'linear-gradient(45deg, #28a745, #007bff)',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '1.1rem',
                  padding: '12px 24px',
                  minWidth: '250px',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #218838, #0056b3)',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                  },
                  '&:active': {
                    transform: 'translateY(0)'
                  },
                  '&:disabled': {
                    background: 'linear-gradient(45deg, #cccccc, #999999)',
                    color: '#666666',
                    cursor: 'not-allowed'
                  }
                }}
                disabled={
                  !securityFields.confirmarPublicacao || 
                  !securityFields.usuarioConfirmacao || 
                  securityFields.usuarioConfirmacao.length < 3 ||
                  !securityFields.motivoUrgencia ||
                  securityFields.motivoUrgencia.length < 10
                }
                onClick={() => {
                  // Double validation before submission
                  if (!securityFields.confirmarPublicacao || 
                      !securityFields.usuarioConfirmacao || 
                      securityFields.usuarioConfirmacao.length < 3 ||
                      !securityFields.motivoUrgencia ||
                      securityFields.motivoUrgencia.length < 10) {
                    // This should never happen due to disabled state, but adding as safety net
                    alert('⚠️ Por favor, complete todos os campos de validação obrigatórios antes de publicar.');
                    return;
                  }
                  
                  handleAction('aprovar-e-postar', selectedDenuncia.id, {
                    acao: 'aprovar_e_postar',
                    confirmar_publicacao: securityFields.confirmarPublicacao,
                    usuario_confirmacao: securityFields.usuarioConfirmacao,
                    motivo_urgencia: securityFields.motivoUrgencia,
                    observacoes: observations
                  });
                }}
                title={
                  (!securityFields.confirmarPublicacao || 
                   !securityFields.usuarioConfirmacao || 
                   securityFields.usuarioConfirmacao.length < 3 ||
                   !securityFields.motivoUrgencia ||
                   securityFields.motivoUrgencia.length < 10) 
                  ? 'Complete todos os campos obrigatórios para habilitar a publicação'
                  : 'Clique para publicar imediatamente no Instagram'
                }
              >
                {(!securityFields.confirmarPublicacao || 
                  !securityFields.usuarioConfirmacao || 
                  securityFields.usuarioConfirmacao.length < 3 ||
                  !securityFields.motivoUrgencia ||
                  securityFields.motivoUrgencia.length < 10) 
                ? '🔒 VALIDAÇÃO PENDENTE'
                : '⚡ PUBLICAR AGORA MESMO'
                }
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Image Modal */}
      <Dialog
        open={imageModalOpen}
        onClose={closeImageModal}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { bgcolor: 'rgba(0, 0, 0, 0.9)' }
        }}
      >
        <DialogContent sx={{ p: 2, textAlign: 'center' }}>
          {selectedImageUrl && (
            <img
              src={selectedImageUrl}
              alt="Preview"
              style={{
                maxWidth: '100%',
                maxHeight: '80vh',
                objectFit: 'contain'
              }}
            />
          )}
          <IconButton
            onClick={closeImageModal}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              color: 'white'
            }}
          >
            <Close />
          </IconButton>
        </DialogContent>
      </Dialog>
    </Box>
  );
}

DenunciationList.propTypes = {
  token: PropTypes.string.isRequired
};

export default withApiErrorBoundary(
  memo(DenunciationList), 
  'Denunciation List'
);