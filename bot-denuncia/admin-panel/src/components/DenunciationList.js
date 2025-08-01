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
      const url = `/admin/denuncias/${denunciaId}/${endpoint}`;      const response = await apiCall(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });      if (!response.ok) {
        const errorText = await response.text();        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const result = await processApiResponse(response);      // Reload data and close dialog
      await loadDenuncias();
      closeDialog();
      setSelectedItems([]);
      
    } catch (err) {      const errorMessage = err.message || 'Erro ao executar ação';
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
                  
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    label="Observações (opcional)"
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                    placeholder="Motivo da publicação imediata, instruções especiais, etc."
                  />
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
            <Button 
              variant="contained"
              sx={{
                background: 'linear-gradient(45deg, #28a745, #007bff)',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '1.1rem',
                padding: '12px 24px',
                '&:hover': {
                  background: 'linear-gradient(45deg, #218838, #0056b3)',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                },
                '&:active': {
                  transform: 'translateY(0)'
                }
              }}
              onClick={() => handleAction('aprovar-e-postar', selectedDenuncia.id, {
                acao: 'aprovar_e_postar',
                publicar_agora: true,
                observacoes: observations,
                usuario_id: 'admin' // Será substituído pelo auth no backend
              })}
            >
              ⚡ PUBLICAR AGORA MESMO
            </Button>
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