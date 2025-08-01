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

// Cores para status de publicação
const PUBLICATION_STATUS_COLORS = {
  'scheduled': '#1976d2',    // Azul - Agendada
  'publishing': '#ff9800',   // Laranja - Publicando
  'published': '#4caf50',    // Verde - Publicada
  'error': '#f44336',        // Vermelho - Erro
  'pending': '#9e9e9e'       // Cinza - Pendente
};

// Cores para prioridade
const PRIORITY_COLORS = {
  1: '#f44336', // Alta - Vermelho
  2: '#ff9800', // Normal - Laranja
  3: '#4caf50'  // Baixa - Verde
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

// Labels para status de publicação
const PUBLICATION_STATUS_LABELS = {
  'scheduled': 'Agendada',
  'publishing': 'Publicando',
  'published': 'Publicada',
  'error': 'Erro',
  'pending': 'Pendente'
};

// Labels para prioridade
const PRIORITY_LABELS = {
  1: 'Alta',
  2: 'Normal',
  3: 'Baixa'
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
  
  // Batch operations
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [batchAction, setBatchAction] = useState('');

  const { handleError } = useErrorHandler('DenunciationList');

  // Enhanced debug function to test modal states and interactions
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Modal states updated:', { 
        dialogOpen, 
        dialogType, 
        imageModalOpen, 
        selectedDenuncia: selectedDenuncia?.id,
        selectedImageUrl: !!selectedImageUrl,
        timestamp: new Date().toISOString()
      });
    }
  }, [dialogOpen, dialogType, imageModalOpen, selectedDenuncia, selectedImageUrl]);

  // Enhanced diagnostic logging
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🚀 DenunciationList component mounted/updated:', {
        denunciasCount: denuncias.length,
        loading,
        error: !!error,
        hasToken: !!token,
        timestamp: new Date().toISOString()
      });
    }
  }, [denuncias.length, loading, error, token]);

  // Image handlers - declared early to avoid hoisting issues
  const closeImageModal = useCallback(() => {
    setImageModalOpen(false);
    setSelectedImageUrl('');
  }, []);

  const handleImageClick = useCallback((imageUrl, event) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🖼️ handleImageClick called:', { 
        imageUrl, 
        hasEvent: !!event,
        eventType: event?.type,
        target: event?.target?.tagName,
        timestamp: new Date().toISOString()
      });
    }
    
    try {
      // Stop all event propagation immediately
      if (event) {
        event.stopPropagation();
        event.preventDefault();
        event.stopImmediatePropagation();
        console.log('✅ Event propagation completely stopped');
      }
      
      if (!imageUrl) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('⚠️ handleImageClick: No image URL provided');
        }
        return;
      }
      
      console.log('🔄 Setting image modal state immediately...');
      // Set both states simultaneously for immediate effect
      setSelectedImageUrl(imageUrl);
      setImageModalOpen(true);
      console.log('✅ Image modal opened immediately');
      
    } catch (error) {
      console.error('❌ Error in handleImageClick:', error);
      handleError(error);
    }
  }, [handleError]);

  const handleImageError = (denunciaId) => {
    setImageLoadError(prev => ({ ...prev, [denunciaId]: true }));
  };

  // Função para calcular status de publicação (deve vir antes de loadDenuncias)
  const getPublicationStatus = useCallback((denuncia) => {
    if (denuncia.instagramPostId) {
      return 'published';
    }
    
    if (denuncia.scheduledPublishAt) {
      const scheduledTime = new Date(denuncia.scheduledPublishAt);
      const now = new Date();
      
      if (scheduledTime <= now && !denuncia.instagramPostId) {
        return denuncia.publishAttempts > 0 ? 'error' : 'publishing';
      }
      return 'scheduled';
    }
    
    if (['APROVADA_ADMIN', 'APROVADA_BOT'].includes(denuncia.status)) {
      return 'pending';
    }
    
    return null;
  }, []);

  const loadDenuncias = useCallback(async () => {
    try {
      setLoading(true);
      
      // Separar filtros do servidor dos filtros do cliente
      const serverFilters = {
        status: filters.status,
        bairro: filters.bairro,
        search: filters.search,
        dataInicio: filters.dataInicio,
        dataFim: filters.dataFim,
        priority: filters.priority
      };
      
      const params = new URLSearchParams({
        page: page + 1,
        limit: rowsPerPage,
        ...Object.fromEntries(Object.entries(serverFilters).filter(([_, v]) => v))
      });

      const response = await apiCall(`/admin/denuncias?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await processApiResponse(response);
      
      // Aplicar filtro de status de publicação no cliente
      let filteredData = data.data;
      if (filters.publicationStatus) {
        filteredData = data.data.filter(denuncia => {
          const pubStatus = getPublicationStatus(denuncia);
          return pubStatus === filters.publicationStatus;
        });
      }
      
      setDenuncias(filteredData);
      setTotalCount(data.pagination.total);
      setError(null);
    } catch (err) {
      const errorMessage = handleError(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, filters, token, handleError, getPublicationStatus]);

  // Carregar denúncias
  useEffect(() => {
    loadDenuncias();
  }, [page, rowsPerPage, filters, loadDenuncias]);

  // Handle ESC key for image modal
  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.key === 'Escape' && imageModalOpen) {
        closeImageModal();
      }
    };

    if (imageModalOpen) {
      document.addEventListener('keydown', handleKeyPress);
      return () => document.removeEventListener('keydown', handleKeyPress);
    }
  }, [imageModalOpen, closeImageModal]);

  // Scroll optimization effect
  useEffect(() => {
    const tableContainer = document.querySelector('.MuiTableContainer-root');
    let cleanup;
    
    if (tableContainer) {
      cleanup = applyScrollOptimizations(tableContainer);
      
      // Add optimized scroll handler se necessário
      const handleScroll = optimizedScrollHandler((event) => {
        // Scroll logic here if needed
      });
      
      tableContainer.addEventListener('scroll', handleScroll, { passive: true });
      
      return () => {
        tableContainer.removeEventListener('scroll', handleScroll);
        if (cleanup) cleanup();
      };
    }
  }, []);

  // FIXED: Handlers de ação com melhor tratamento de erro
  const handleAction = async (action, denunciaId, payload = {}) => {
    // Validate inputs
    if (!action || !denunciaId) {
      const errorMsg = 'Ação ou ID da denúncia não fornecidos';
      console.error('❌ handleAction validation failed:', { action, denunciaId });
      setError(errorMsg);
      return;
    }

    if (!token) {
      const errorMsg = 'Token de autenticação não encontrado';
      console.error('❌ No authentication token');
      setError(errorMsg);
      return;
    }

    try {
      console.log('🚀 Starting action:', { action, denunciaId, payload });
      
      // Map action to correct endpoint
      const actionEndpoints = {
        'aprovar': 'aprovar',
        'approve': 'aprovar',
        'rejeitar': 'rejeitar', 
        'reject': 'rejeitar',
        'editar': 'editar',
        'edit': 'editar'
      };
      
      const endpoint = actionEndpoints[action] || action;
      const url = `/admin/denuncias/${denunciaId}/${endpoint}`;
      
      console.log('📡 Making API call to:', url);
      
      const response = await apiCall(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      console.log('📡 API response status:', response.status);
      
      const result = await processApiResponse(response);
      console.log('✅ Action completed successfully:', result);
      
      // Reload data and close dialog
      await loadDenuncias();
      setDialogOpen(false);
      setSelectedItems([]);
      
      // Clear any previous errors
      setError(null);
      
    } catch (err) {
      console.error('❌ Action failed:', err);
      const errorMessage = handleError(err);
      setError(errorMessage);
      
      // Don't close dialog on error so user can retry
    }
  };

  const handleBatchAction = async () => {
    if (selectedItems.length === 0) return;

    try {
      const payload = {
        ids: selectedItems,
        acao: batchAction,
        motivo: actionReason,
        observacoes: observations
      };

      const response = await apiCall('/admin/denuncias/lote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      await processApiResponse(response);
      await loadDenuncias();
      setBatchDialogOpen(false);
      setSelectedItems([]);
      setActionReason('');
      setObservations('');
    } catch (err) {
      const errorMessage = handleError(err);
      setError(errorMessage);
    }
  };

  // Dialog handlers - FIXED VERSION
  const openDialog = useCallback((type, denuncia = null) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 openDialog called:', { 
        type, 
        denunciaId: denuncia?.id,
        denunciaProtocolo: denuncia?.protocolo,
        timestamp: new Date().toISOString()
      });
    }
    
    try {
      if (!type) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('⚠️ openDialog: No dialog type provided');
        }
        return;
      }
      
      console.log('🔄 Setting dialog state...');
      
      // CRITICAL FIX: Set all states in proper order and force re-render
      setDialogOpen(false); // Close first to ensure clean state
      setDialogType(''); // Clear type first
      setSelectedDenuncia(null); // Clear selection first
      setActionReason(''); // Clear form data
      setEditedText(''); // Clear edit text
      setObservations(''); // Clear observations
      
      // Use setTimeout to ensure state updates are processed
      setTimeout(() => {
        setDialogType(type);
        setSelectedDenuncia(denuncia);
        
        if (type === 'edit' && denuncia) {
          setEditedText(denuncia.textoFiltrado || denuncia.texto);
          console.log('📝 Edit mode: text set');
        }
        
        setDialogOpen(true);
        console.log('✅ Dialog opened with clean state');
      }, 0);
      
    } catch (error) {
      console.error('❌ Error in openDialog:', error);
      handleError(error);
    }
  }, [handleError]);

  const closeDialog = useCallback(() => {
    setDialogOpen(false);
    setSelectedDenuncia(null);
    setActionReason('');
    setEditedText('');
    setObservations('');
  }, []);

  // Selection handlers
  const handleSelectAll = (event) => {
    if (event.target.checked) {
      setSelectedItems(denuncias.map(d => d.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (id) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const isSelected = (id) => selectedItems.includes(id);

  // Image thumbnail component
  const ImageThumbnail = memo(({ denuncia }) => {
    if (!denuncia.imagemUrl) {
      return (
        <Box
          sx={{
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'grey.100',
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'grey.300'
          }}
        >
          <Image sx={{ color: 'grey.400', fontSize: 16 }} />
        </Box>
      );
    }

    if (imageLoadError[denuncia.id]) {
      return (
        <Box
          sx={{
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'error.light',
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'error.main'
          }}
        >
          <BrokenImage sx={{ color: 'error.dark', fontSize: 16 }} />
        </Box>
      );
    }

    return (
      <Box
        className="image-thumbnail"
        sx={{
          position: 'relative',
          width: 40,
          height: 40,
          borderRadius: 1,
          overflow: 'hidden',
          cursor: 'pointer',
          border: '1px solid',
          borderColor: 'grey.300',
          pointerEvents: 'auto',
          zIndex: 10, // Higher z-index to ensure it's clickable
          userSelect: 'none', // Prevent text selection
          '&:hover': {
            borderColor: 'primary.main',
            transform: 'scale(1.05)', // Visual feedback
            '& .zoom-overlay': {
              opacity: 1
            }
          },
          '&:active': {
            transform: 'scale(0.98)' // Click feedback
          }
        }}
        onClick={(e) => {
          console.log('🖱️ Image thumbnail clicked directly');
          e.stopPropagation();
          e.preventDefault();
          e.stopImmediatePropagation();
          handleImageClick(denuncia.imagemUrl, e);
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
        onTouchStart={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
      >
        <img
          src={denuncia.imagemUrl}
          alt={`Imagem da denúncia ${denuncia.protocolo}`}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
          onError={() => handleImageError(denuncia.id)}
          loading="lazy"
        />
        <Box
          className="zoom-overlay"
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0,
            transition: 'opacity 0.2s'
          }}
        >
          <ZoomIn sx={{ color: 'white', fontSize: 16 }} />
        </Box>
      </Box>
    );
  });

  ImageThumbnail.propTypes = {
    denuncia: PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      protocolo: PropTypes.string.isRequired,
      imagemUrl: PropTypes.string
    }).isRequired
  };


  // Função para calcular estatísticas (deve vir depois de getPublicationStatus)
  const getStatistics = useMemo(() => {
    if (denuncias.length === 0) return null;
    
    const stats = {
      total: denuncias.length,
      published: 0,
      scheduled: 0,
      pending: 0,
      errors: 0,
      highPriority: 0
    };
    
    denuncias.forEach(denuncia => {
      const pubStatus = getPublicationStatus(denuncia);
      
      switch (pubStatus) {
        case 'published': stats.published++; break;
        case 'scheduled': stats.scheduled++; break;
        case 'pending': stats.pending++; break;
        case 'error': stats.errors++; break;
      }
      
      if (denuncia.priority === 1) stats.highPriority++;
    });
    
    return stats;
  }, [denuncias, getPublicationStatus]);

  // Memoized status chip component
  const StatusChip = memo(({ status }) => (
    <Chip 
      label={STATUS_LABELS[status] || status}
      color={STATUS_COLORS[status] || 'default'}
      size="small"
      aria-label={`Status: ${STATUS_LABELS[status] || status}`}
    />
  ));
  
  StatusChip.propTypes = {
    status: PropTypes.string.isRequired
  };

  // Componente para status de publicação
  const PublicationStatusChip = memo(({ denuncia }) => {
    const status = getPublicationStatus(denuncia);
    
    if (!status) return null;
    
    const getIcon = () => {
      switch (status) {
        case 'scheduled': return <Schedule sx={{ fontSize: 14 }} />;
        case 'publishing': return <PendingActions sx={{ fontSize: 14 }} />;
        case 'published': return <CheckCircleOutline sx={{ fontSize: 14 }} />;
        case 'error': return <ErrorOutline sx={{ fontSize: 14 }} />;
        case 'pending': return <AccessTime sx={{ fontSize: 14 }} />;
        default: return null;
      }
    };
    
    return (
      <Tooltip 
        title={`Publicação: ${PUBLICATION_STATUS_LABELS[status]}${
          denuncia.publishAttempts > 0 ? ` (Tentativas: ${denuncia.publishAttempts})` : ''
        }`}
      >
        <Chip
          icon={getIcon()}
          label={PUBLICATION_STATUS_LABELS[status]}
          size="small"
          sx={{
            bgcolor: PUBLICATION_STATUS_COLORS[status],
            color: 'white',
            fontSize: '0.75rem',
            '& .MuiChip-icon': {
              color: 'white'
            }
          }}
        />
      </Tooltip>
    );
  });

  PublicationStatusChip.propTypes = {
    denuncia: PropTypes.object.isRequired
  };

  // Componente para prioridade
  const PriorityChip = memo(({ priority }) => {
    if (!priority) return null;
    
    return (
      <Tooltip title={`Prioridade: ${PRIORITY_LABELS[priority]}`}>
        <Chip
          icon={<PriorityHigh sx={{ fontSize: 14 }} />}
          label={priority}
          size="small"
          sx={{
            bgcolor: PRIORITY_COLORS[priority],
            color: 'white',
            fontSize: '0.75rem',
            minWidth: '45px',
            '& .MuiChip-icon': {
              color: 'white'
            }
          }}
        />
      </Tooltip>
    );
  });

  PriorityChip.propTypes = {
    priority: PropTypes.number
  };

  // Componente para horário agendado
  const ScheduledTimeChip = memo(({ scheduledTime }) => {
    if (!scheduledTime) return null;
    
    const formatDateTime = (dateTime) => {
      try {
        return format(new Date(dateTime), 'dd/MM HH:mm', { locale: ptBR });
      } catch {
        return 'Data inválida';
      }
    };
    
    const isOverdue = new Date(scheduledTime) < new Date() && scheduledTime;
    
    return (
      <Tooltip title={`Agendado para: ${format(new Date(scheduledTime), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`}>
        <Chip
          icon={<Schedule sx={{ fontSize: 14 }} />}
          label={formatDateTime(scheduledTime)}
          size="small"
          color={isOverdue ? 'error' : 'primary'}
          variant={isOverdue ? 'filled' : 'outlined'}
          sx={{ fontSize: '0.75rem' }}
        />
      </Tooltip>
    );
  });

  ScheduledTimeChip.propTypes = {
    scheduledTime: PropTypes.string
  };

  // Componente para link do Instagram
  const InstagramLink = memo(({ postId }) => {
    if (!postId) return null;
    
    return (
      <Tooltip title={`Ver no Instagram: ${postId}`}>
        <Chip
          icon={<Instagram sx={{ fontSize: 14 }} />}
          label="Ver Post"
          size="small"
          color="success"
          clickable
          onClick={() => window.open(`https://www.instagram.com/p/${postId}`, '_blank')}
          sx={{ fontSize: '0.75rem' }}
        />
      </Tooltip>
    );
  });

  InstagramLink.propTypes = {
    postId: PropTypes.string
  };

  // Memoized action buttons component
  const ActionButtons = memo(({ denuncia, onOpenDialog }) => {
    const canModerate = useMemo(() => 
      ['PENDENTE_MODERACAO', 'RECEBIDA', 'PROCESSANDO'].includes(denuncia?.status),
      [denuncia?.status]
    );

    if (!denuncia || !onOpenDialog) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ ActionButtons: Missing required props', { 
          denuncia: !!denuncia, 
          onOpenDialog: !!onOpenDialog,
          denunciaId: denuncia?.id 
        });
      }
      return null;
    }

    // FIXED: Enhanced click handler with comprehensive error handling
    const handleButtonClick = useCallback((action, event) => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`🎯 ActionButton clicked: ${action}`, {
          denunciaId: denuncia.id,
          protocolo: denuncia.protocolo,
          action,
          hasEvent: !!event,
          timestamp: new Date().toISOString()
        });
      }
      
      try {
        // CRITICAL FIX: Stop all event propagation immediately
        if (event) {
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
          console.log('✅ All event propagation stopped');
        }
        
        // CRITICAL FIX: Validate inputs before calling
        if (!action) {
          console.error('❌ No action provided to handleButtonClick');
          return;
        }
        
        if (!onOpenDialog || typeof onOpenDialog !== 'function') {
          console.error('❌ onOpenDialog is not a function:', typeof onOpenDialog);
          return;
        }
        
        if (!denuncia || !denuncia.id) {
          console.error('❌ Invalid denuncia object:', denuncia);
          return;
        }
        
        console.log('🔄 Calling onOpenDialog with validated parameters...');
        
        // CRITICAL FIX: Use try-catch for the actual function call
        try {
          onOpenDialog(action, denuncia);
          console.log('✅ onOpenDialog called successfully');
        } catch (dialogError) {
          console.error('❌ Error in onOpenDialog call:', dialogError);
          // Still try to provide user feedback
          alert(`Erro ao abrir diálogo: ${dialogError.message}`);
        }
        
      } catch (error) {
        console.error('❌ Critical error in button click handler:', error);
        alert(`Erro crítico: ${error.message}`);
      }
    }, [denuncia, onOpenDialog]);
    
    return (
      <ButtonGroup 
        size="small" 
        role="group" 
        aria-label="Ações da denúncia"
        sx={{ 
          pointerEvents: 'auto !important', 
          zIndex: 10,
          position: 'relative',
          '& .MuiIconButton-root': {
            pointerEvents: 'auto !important',
            zIndex: 11,
            position: 'relative',
            cursor: 'pointer !important'
          },
          '& .MuiIconButton-root:hover': {
            backgroundColor: 'action.hover'
          }
        }}
      >
        <Tooltip title="Visualizar denúncia">
          <IconButton 
            onClick={(e) => handleButtonClick('view', e)}
            aria-label={`Visualizar denúncia ${denuncia.protocolo}`}
            sx={{ 
              pointerEvents: 'auto !important',
              cursor: 'pointer !important',
              zIndex: 12
            }}
          >
            <Visibility />
          </IconButton>
        </Tooltip>
        
        {canModerate && (
          <>
            <Tooltip title="Aprovar denúncia">
              <IconButton 
                color="success"
                onClick={(e) => handleButtonClick('approve', e)}
                aria-label={`Aprovar denúncia ${denuncia.protocolo}`}
                sx={{ 
                  pointerEvents: 'auto !important',
                  cursor: 'pointer !important',
                  zIndex: 12
                }}
              >
                <Check />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Rejeitar denúncia">
              <IconButton 
                color="error"
                onClick={(e) => handleButtonClick('reject', e)}
                aria-label={`Rejeitar denúncia ${denuncia.protocolo}`}
                sx={{ 
                  pointerEvents: 'auto !important',
                  cursor: 'pointer !important',
                  zIndex: 12
                }}
              >
                <Close />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Editar denúncia">
              <IconButton 
                color="primary"
                onClick={(e) => handleButtonClick('edit', e)}
                aria-label={`Editar denúncia ${denuncia.protocolo}`}
                sx={{ 
                  pointerEvents: 'auto !important',
                  cursor: 'pointer !important',
                  zIndex: 12
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
    denuncia: PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      protocolo: PropTypes.string.isRequired,
      status: PropTypes.string.isRequired
    }).isRequired,
    onOpenDialog: PropTypes.func.isRequired
  };

  // Test function to validate clickable elements (development only)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && denuncias.length > 0) {
      console.log('🧪 Component ready for interaction testing:', {
        denunciasLoaded: denuncias.length,
        dialogFunctionExists: typeof openDialog === 'function',
        imageHandlerExists: typeof handleImageClick === 'function',
        timestamp: new Date().toISOString()
      });
    }
  }, [denuncias.length, openDialog, handleImageClick]);

  // Render main content
  if (loading && denuncias.length === 0) {
    return <LoadingState variant="table" rows={10} fullHeight />;
  }

  return (
    <Box>
      {/* Estatísticas Rápidas */}
      {getStatistics && (
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card sx={{ textAlign: 'center', p: 2 }}>
              <Typography variant="h4" color="primary">{getStatistics.total}</Typography>
              <Typography variant="body2" color="text.secondary">Total</Typography>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card sx={{ textAlign: 'center', p: 2 }}>
              <Typography variant="h4" sx={{ color: PUBLICATION_STATUS_COLORS.published }}>
                {getStatistics.published}
              </Typography>
              <Typography variant="body2" color="text.secondary">Publicadas</Typography>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card sx={{ textAlign: 'center', p: 2 }}>
              <Typography variant="h4" sx={{ color: PUBLICATION_STATUS_COLORS.scheduled }}>
                {getStatistics.scheduled}
              </Typography>
              <Typography variant="body2" color="text.secondary">Agendadas</Typography>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card sx={{ textAlign: 'center', p: 2 }}>
              <Typography variant="h4" sx={{ color: PUBLICATION_STATUS_COLORS.pending }}>
                {getStatistics.pending}
              </Typography>
              <Typography variant="body2" color="text.secondary">Pendentes</Typography>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card sx={{ textAlign: 'center', p: 2 }}>
              <Typography variant="h4" sx={{ color: PRIORITY_COLORS[1] }}>
                {getStatistics.highPriority}
              </Typography>
              <Typography variant="body2" color="text.secondary">Alta Prioridade</Typography>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Header com filtros */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
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
            
            <Grid item xs={12} md={2}>
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
            
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                label="Bairro"
                value={filters.bairro}
                onChange={(e) => setFilters(prev => ({ ...prev, bairro: e.target.value }))}
              />
            </Grid>
            
            <Grid item xs={12} md={1.5}>
              <TextField
                fullWidth
                type="date"
                label="Data Início"
                value={filters.dataInicio}
                onChange={(e) => setFilters(prev => ({ ...prev, dataInicio: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            <Grid item xs={12} md={1.5}>
              <TextField
                fullWidth
                type="date"
                label="Data Fim"
                value={filters.dataFim}
                onChange={(e) => setFilters(prev => ({ ...prev, dataFim: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
          
          {/* Segunda linha de filtros */}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Status Publicação</InputLabel>
                <Select
                  value={filters.publicationStatus}
                  onChange={(e) => setFilters(prev => ({ ...prev, publicationStatus: e.target.value }))}
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="scheduled">📅 Agendada</MenuItem>
                  <MenuItem value="publishing">🔄 Publicando</MenuItem>
                  <MenuItem value="published">✅ Publicada</MenuItem>
                  <MenuItem value="error">❌ Erro</MenuItem>
                  <MenuItem value="pending">⏳ Pendente</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Prioridade</InputLabel>
                <Select
                  value={filters.priority}
                  onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
                >
                  <MenuItem value="">Todas</MenuItem>
                  <MenuItem value="1">🔴 Alta</MenuItem>
                  <MenuItem value="2">🟡 Normal</MenuItem>
                  <MenuItem value="3">🟢 Baixa</MenuItem>
                </Select>
              </FormControl>
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
                sx={{ mr: 1 }}
              >
                Limpar Filtros
              </Button>
            </Grid>
            
            <Grid item xs={12} md={1}>
              <IconButton 
                onClick={loadDenuncias} 
                disabled={loading}
                size="large"
                color="primary"
              >
                <Refresh />
              </IconButton>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Ações em lote */}
      {selectedItems.length > 0 && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {selectedItems.length} item(s) selecionado(s)
            </Typography>
            <ButtonGroup>
              <Button
                startIcon={<CheckCircle />}
                onClick={() => {
                  setBatchAction('aprovar');
                  setBatchDialogOpen(true);
                }}
              >
                Aprovar Selecionados
              </Button>
              <Button
                startIcon={<Cancel />}
                onClick={() => {
                  setBatchAction('rejeitar');
                  setBatchDialogOpen(true);
                }}
              >
                Rejeitar Selecionados
              </Button>
            </ButtonGroup>
          </CardContent>
        </Card>
      )}

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Tabela */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={selectedItems.length > 0 && selectedItems.length < denuncias.length}
                  checked={denuncias.length > 0 && selectedItems.length === denuncias.length}
                  onChange={handleSelectAll}
                />
              </TableCell>
              <TableCell>Protocolo</TableCell>
              <TableCell>Foto</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Publicação</TableCell>
              <TableCell>Agendado Para</TableCell>
              <TableCell>Instagram</TableCell>
              <TableCell>Texto</TableCell>
              <TableCell>Bairro</TableCell>
              <TableCell>Score</TableCell>
              <TableCell>Data</TableCell>
              <TableCell>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {denuncias.map((denuncia) => (
              <TableRow 
                key={denuncia.id}
                selected={isSelected(denuncia.id)}
                hover
                onClick={(e) => {
                  // Only handle row clicks if not clicking on interactive elements
                  const target = e.target;
                  const isInteractiveElement = target.closest('button, .image-thumbnail, .MuiChip-root, a');
                  
                  if (isInteractiveElement) {
                    // Let interactive elements handle their own events
                    return;
                  }
                  
                  // Optional: Handle row selection or other row-level actions here
                  console.log('📋 Row clicked:', denuncia.protocolo);
                }}
              >
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={isSelected(denuncia.id)}
                    onChange={() => handleSelectItem(denuncia.id)}
                  />
                </TableCell>
                
                <TableCell>
                  <Typography variant="body2" fontWeight="bold">
                    {denuncia.protocolo}
                  </Typography>
                </TableCell>
                
                <TableCell>
                  <ImageThumbnail denuncia={denuncia} />
                </TableCell>
                
                <TableCell>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <StatusChip status={denuncia.status} />
                    <PriorityChip priority={denuncia.priority} />
                  </Box>
                </TableCell>
                
                <TableCell>
                  <PublicationStatusChip denuncia={denuncia} />
                </TableCell>
                
                <TableCell>
                  <ScheduledTimeChip scheduledTime={denuncia.scheduledPublishAt} />
                </TableCell>
                
                <TableCell>
                  <InstagramLink postId={denuncia.instagramPostId} />
                </TableCell>
                
                <TableCell>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      maxWidth: 200,
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
                  {denuncia.scoreBot && (
                    <Chip 
                      label={`${Math.round(denuncia.scoreBot * 100)}%`}
                      size="small"
                      color={denuncia.scoreBot >= 0.8 ? 'success' : denuncia.scoreBot >= 0.5 ? 'warning' : 'error'}
                    />
                  )}
                </TableCell>
                
                <TableCell>
                  <Typography variant="body2">
                    {format(new Date(denuncia.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                  </Typography>
                </TableCell>
                
                <TableCell>
                  <ActionButtons denuncia={denuncia} onOpenDialog={openDialog} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
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
      </TableContainer>

      {/* Dialog para ações individuais */}
      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {dialogType === 'view' && 'Visualizar Denúncia'}
          {dialogType === 'edit' && 'Editar Denúncia'}
          {dialogType === 'approve' && 'Aprovar Denúncia'}
          {dialogType === 'reject' && 'Rejeitar Denúncia'}
        </DialogTitle>
        
        <DialogContent>
          {selectedDenuncia && (
            <Box>
              {dialogType === 'view' && (
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Typography variant="h6">Protocolo: {selectedDenuncia.protocolo}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography><strong>Status:</strong> <StatusChip status={selectedDenuncia.status} /></Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography><strong>Texto Original:</strong></Typography>
                    <Typography variant="body2">{selectedDenuncia.texto}</Typography>
                  </Grid>
                  {selectedDenuncia.textoFiltrado && (
                    <Grid item xs={12}>
                      <Typography><strong>Texto Filtrado:</strong></Typography>
                      <Typography variant="body2">{selectedDenuncia.textoFiltrado}</Typography>
                    </Grid>
                  )}
                  <Grid item xs={12}>
                    <Typography><strong>Endereço:</strong> {selectedDenuncia.endereco}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography><strong>Bairro:</strong> {selectedDenuncia.bairro}</Typography>
                  </Grid>
                  {selectedDenuncia.vereadores && (
                    <Grid item xs={12}>
                      <Typography><strong>Vereadores:</strong> {selectedDenuncia.vereadores.join(', ')}</Typography>
                    </Grid>
                  )}
                  {selectedDenuncia.scoreBot && (
                    <Grid item xs={12}>
                      <Typography><strong>Score do Bot:</strong> {Math.round(selectedDenuncia.scoreBot * 100)}%</Typography>
                    </Grid>
                  )}
                  
                  {/* Informações de Publicação */}
                  <Grid item xs={12}>
                    <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Informações de Publicação</Typography>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Typography><strong>Status de Publicação:</strong></Typography>
                    <Box sx={{ mt: 0.5 }}>
                      <PublicationStatusChip denuncia={selectedDenuncia} />
                    </Box>
                  </Grid>
                  
                  {selectedDenuncia.priority && (
                    <Grid item xs={12} md={6}>
                      <Typography><strong>Prioridade:</strong></Typography>
                      <Box sx={{ mt: 0.5 }}>
                        <PriorityChip priority={selectedDenuncia.priority} />
                      </Box>
                    </Grid>
                  )}
                  
                  {selectedDenuncia.scheduledPublishAt && (
                    <Grid item xs={12} md={6}>
                      <Typography><strong>Agendado Para:</strong></Typography>
                      <Box sx={{ mt: 0.5 }}>
                        <ScheduledTimeChip scheduledTime={selectedDenuncia.scheduledPublishAt} />
                      </Box>
                    </Grid>
                  )}
                  
                  {selectedDenuncia.instagramPostId && (
                    <Grid item xs={12} md={6}>
                      <Typography><strong>Post Instagram:</strong></Typography>
                      <Box sx={{ mt: 0.5 }}>
                        <InstagramLink postId={selectedDenuncia.instagramPostId} />
                      </Box>
                    </Grid>
                  )}
                  
                  {selectedDenuncia.publishAttempts > 0 && (
                    <Grid item xs={12}>
                      <Typography>
                        <strong>Tentativas de Publicação:</strong> {selectedDenuncia.publishAttempts}
                      </Typography>
                    </Grid>
                  )}
                  
                  {selectedDenuncia.publishedAt && (
                    <Grid item xs={12}>
                      <Typography>
                        <strong>Publicado em:</strong> {format(new Date(selectedDenuncia.publishedAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </Typography>
                    </Grid>
                  )}
                  {selectedDenuncia.imagemUrl && (
                    <Grid item xs={12}>
                      <Typography><strong>Imagem:</strong></Typography>
                      <Box
                        sx={{
                          mt: 1,
                          display: 'inline-block',
                          position: 'relative',
                          borderRadius: 1,
                          overflow: 'hidden',
                          cursor: 'pointer',
                          border: '1px solid',
                          borderColor: 'grey.300',
                          '&:hover': {
                            borderColor: 'primary.main'
                          }
                        }}
                        onClick={(e) => {
                          console.log('🖱️ Modal image clicked');
                          e.stopPropagation();
                          handleImageClick(selectedDenuncia.imagemUrl, e);
                        }}
                      >
                        <img
                          src={selectedDenuncia.imagemUrl}
                          alt={`Imagem da denúncia ${selectedDenuncia.protocolo}`}
                          style={{
                            maxWidth: '200px',
                            maxHeight: '150px',
                            objectFit: 'cover',
                            display: 'block'
                          }}
                          onError={() => handleImageError(selectedDenuncia.id)}
                        />
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 4,
                            right: 4,
                            bgcolor: 'rgba(0, 0, 0, 0.6)',
                            borderRadius: '50%',
                            p: 0.5,
                            color: 'white'
                          }}
                        >
                          <ZoomIn sx={{ fontSize: 16 }} />
                        </Box>
                      </Box>
                    </Grid>
                  )}
                </Grid>
              )}
              
              {dialogType === 'edit' && (
                <Box>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    label="Texto Filtrado"
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
              
              {(dialogType === 'approve' || dialogType === 'reject') && (
                <Box>
                  {dialogType === 'reject' && (
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
            </Box>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={closeDialog}>Cancelar</Button>
          {dialogType === 'edit' && (
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
          {dialogType === 'approve' && (
            <Button 
              variant="contained" 
              color="success"
              onClick={() => handleAction('aprovar', selectedDenuncia.id, { observacoes: observations })}
            >
              Aprovar
            </Button>
          )}
          {dialogType === 'reject' && (
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
        </DialogActions>
      </Dialog>

      {/* Dialog para ações em lote */}
      <Dialog open={batchDialogOpen} onClose={() => setBatchDialogOpen(false)}>
        <DialogTitle>
          {batchAction === 'aprovar' ? 'Aprovar' : 'Rejeitar'} {selectedItems.length} Denúncia(s)
        </DialogTitle>
        
        <DialogContent>
          {batchAction === 'rejeitar' && (
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
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setBatchDialogOpen(false)}>Cancelar</Button>
          <Button 
            variant="contained"
            color={batchAction === 'aprovar' ? 'success' : 'error'}
            onClick={handleBatchAction}
            disabled={batchAction === 'rejeitar' && !actionReason.trim()}
          >
            {batchAction === 'aprovar' ? 'Aprovar' : 'Rejeitar'} Selecionados
          </Button>
        </DialogActions>
      </Dialog>

      {/* Image Preview Modal */}
      <Dialog
        open={imageModalOpen}
        onClose={closeImageModal}
        maxWidth="md"
        fullWidth
        onClick={(e) => {
          // Close modal when clicking on backdrop
          if (e.target === e.currentTarget) {
            closeImageModal();
          }
        }}
        PaperProps={{
          sx: {
            bgcolor: 'rgba(0, 0, 0, 0.9)',
            boxShadow: 'none'
          },
          className: 'image-modal-backdrop'
        }}
      >
        <DialogContent
          sx={{
            p: 2,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            bgcolor: 'transparent'
          }}
        >
          <Box
            sx={{
              position: 'relative',
              maxWidth: '100%',
              maxHeight: '80vh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {selectedImageUrl && (
              <img
                src={selectedImageUrl}
                alt="Preview da imagem"
                style={{
                  maxWidth: '100%',
                  maxHeight: '80vh',
                  objectFit: 'contain',
                  borderRadius: '4px'
                }}
              />
            )}
            
            <IconButton
              onClick={closeImageModal}
              sx={{
                position: 'absolute',
                top: -8,
                right: -8,
                bgcolor: 'rgba(255, 255, 255, 0.9)',
                color: 'text.primary',
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 1)'
                }
              }}
            >
              <Close />
            </IconButton>
          </Box>
          
          <Typography
            variant="body2"
            sx={{
              mt: 2,
              color: 'white',
              textAlign: 'center',
              opacity: 0.8
            }}
          >
            Pressione ESC ou clique fora da imagem para fechar
          </Typography>
        </DialogContent>
      </Dialog>
    </Box>
  );
}

// PropTypes validation
DenunciationList.propTypes = {
  token: PropTypes.string.isRequired
};

// Memoize the main component
const MemoizedDenunciationList = memo(DenunciationList);
MemoizedDenunciationList.displayName = 'DenunciationList';

// Export with error boundary
export default withApiErrorBoundary(
  MemoizedDenunciationList, 
  'Denunciation List'
);