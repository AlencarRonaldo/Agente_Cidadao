/**
 * Optimized Admin Routes - Rotas otimizadas com cache, rate limiting e real-time
 * Implementa todas as melhorias de performance e segurança
 */

const express = require('express');
const router = express.Router();
const optimizedAdminController = require('../controllers/optimizedAdminController');
const auth = require('../middleware/auth');
const validation = require('../middleware/validation');
const { 
  dynamicRateLimit, 
  rateLimitLogger,
  dashboardLimiter,
  listLimiter,
  writeLimiter,
  batchLimiter,
  externalApiLimiter
} = require('../middleware/rateLimiter');
const logger = require('../utils/logger');

// Middleware global para rotas administrativas
router.use(auth.requireAdmin);
router.use(rateLimitLogger);

// Middleware de log de requisições administrativas
router.use((req, res, next) => {
  logger.info(`[ADMIN_API] ${req.method} ${req.path} - ${req.user?.email}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  next();
});

// =============================================================================
// DASHBOARD ROUTES - Cache otimizado e refresh rápido
// =============================================================================

/**
 * GET /dashboard
 * Dashboard principal com cache inteligente
 */
router.get('/dashboard', dashboardLimiter, async (req, res) => {
  await optimizedAdminController.getDashboard(req, res);
});

/**
 * GET /agenda
 * Agenda de publicações com refresh frequente
 */
router.get('/agenda', dashboardLimiter, async (req, res) => {
  await optimizedAdminController.getAgenda(req, res);
});

/**
 * GET /agenda/detailed
 * Agenda detalhada com filtros avançados
 */
router.get('/agenda/detailed', listLimiter, async (req, res) => {
  try {
    const { limit = 50, priority, hours = 24 } = req.query;
    
    // Validar parâmetros
    const validatedLimit = Math.min(parseInt(limit) || 50, 100);
    const validatedHours = Math.min(parseInt(hours) || 24, 168); // Máx 7 dias
    
    const agendaData = await optimizedAdminController.getDetailedAgenda(
      validatedLimit, 
      priority ? parseInt(priority) : null,
      validatedHours
    );
    
    res.json({
      success: true,
      data: agendaData,
      meta: {
        limit: validatedLimit,
        priority: priority || 'all',
        hours: validatedHours,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    logger.error('[ADMIN_API] Erro na agenda detalhada:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar agenda detalhada',
      code: 'DETAILED_AGENDA_ERROR'
    });
  }
});

// =============================================================================
// LISTAGEM E PESQUISA - Queries otimizadas
// =============================================================================

/**
 * GET /denuncias
 * Listagem otimizada com cache e filtros
 */
router.get('/denuncias', listLimiter, async (req, res) => {
  await optimizedAdminController.listarDenuncias(req, res);
});

/**
 * GET /denuncias/:id
 * Buscar denúncia específica com cache
 */
router.get('/denuncias/:id', listLimiter, 
  validation.validateObjectId('id'),
  async (req, res) => {
    try {
      const originalController = require('../controllers/adminController');
      await originalController.obterDenuncia(req, res);
    } catch (error) {
      logger.error('[ADMIN_API] Erro ao buscar denúncia:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao buscar denúncia',
        code: 'FETCH_DENUNCIA_ERROR'
      });
    }
  }
);

// =============================================================================
// OPERAÇÕES DE ESCRITA - Rate limiting restrito
// =============================================================================

/**
 * POST /denuncias/:id/aprovar
 * Aprovar denúncia com invalidação de cache
 */
router.post('/denuncias/:id/aprovar', writeLimiter,
  validation.validateObjectId('id'),
  validation.validateBody({
    observacoes: { type: 'string', required: false, maxLength: 500 }
  }),
  async (req, res) => {
    await optimizedAdminController.aprovarDenuncia(req, res);
  }
);

/**
 * POST /denuncias/:id/rejeitar
 * Rejeitar denúncia com invalidação de cache
 */
router.post('/denuncias/:id/rejeitar', writeLimiter,
  validation.validateObjectId('id'),
  validation.validateBody({
    motivo: { type: 'string', required: true, minLength: 3, maxLength: 200 },
    observacoes: { type: 'string', required: false, maxLength: 500 }
  }),
  async (req, res) => {
    await optimizedAdminController.rejeitarDenuncia(req, res);
  }
);

/**
 * PUT /denuncias/:id/editar
 * Editar denúncia
 */
router.put('/denuncias/:id/editar', writeLimiter,
  validation.validateObjectId('id'),
  validation.validateBody({
    textoFiltrado: { type: 'string', required: true, minLength: 10, maxLength: 2000 },
    observacoes: { type: 'string', required: false, maxLength: 500 }
  }),
  async (req, res) => {
    try {
      const originalController = require('../controllers/adminController');
      await originalController.editarDenuncia(req, res);
      
      // Invalidar cache após edição
      await optimizedAdminController.invalidateRelatedCache('denuncia:edited', {
        id: req.params.id
      });
      
    } catch (error) {
      logger.error('[ADMIN_API] Erro ao editar denúncia:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao editar denúncia',
        code: 'EDIT_DENUNCIA_ERROR'
      });
    }
  }
);

// =============================================================================
// OPERAÇÕES EM LOTE - Rate limiting muito restrito
// =============================================================================

/**
 * POST /batch/acao
 * Operações em lote com validação rigorosa
 */
router.post('/batch/acao', batchLimiter,
  validation.validateBody({
    ids: { 
      type: 'array', 
      required: true, 
      minItems: 1, 
      maxItems: 50, // Limite para evitar sobrecarga
      items: { type: 'string' }
    },
    acao: { 
      type: 'string', 
      required: true, 
      enum: ['aprovar', 'rejeitar'] 
    },
    motivo: { 
      type: 'string', 
      required: false, 
      maxLength: 200 
    },
    observacoes: { 
      type: 'string', 
      required: false, 
      maxLength: 500 
    }
  }),
  async (req, res) => {
    try {
      const originalController = require('../controllers/adminController');
      await originalController.acaoLote(req, res);
      
      // Invalidar cache após operação em lote
      await optimizedAdminController.invalidateRelatedCache('batch:operation', {
        action: req.body.acao,
        count: req.body.ids.length
      });
      
    } catch (error) {
      logger.error('[ADMIN_API] Erro na operação em lote:', error);
      res.status(500).json({
        success: false,
        error: 'Erro na operação em lote',
        code: 'BATCH_OPERATION_ERROR'
      });
    }
  }
);

// =============================================================================
// RELATÓRIOS E ESTATÍSTICAS
// =============================================================================

/**
 * GET /relatorios/:tipo
 * Gerar relatórios com cache de longa duração
 */
router.get('/relatorios/:tipo', listLimiter,
  validation.validateParams({
    tipo: { type: 'string', enum: ['geral', 'bairros', 'vereadores', 'moderacao', 'performance'] }
  }),
  async (req, res) => {
    try {
      const originalController = require('../controllers/adminController');
      await originalController.gerarRelatorio(req, res);
    } catch (error) {
      logger.error('[ADMIN_API] Erro ao gerar relatório:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao gerar relatório',
        code: 'REPORT_ERROR'
      });
    }
  }
);

// =============================================================================
// AGENDAMENTO E PUBLICAÇÃO
// =============================================================================

/**
 * GET /scheduling/stats
 * Estatísticas de agendamento
 */
router.get('/scheduling/stats', listLimiter, async (req, res) => {
  try {
    const originalController = require('../controllers/adminController');
    await originalController.getSchedulingStats(req, res);
  } catch (error) {
    logger.error('[ADMIN_API] Erro nas estatísticas de agendamento:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar estatísticas de agendamento',
      code: 'SCHEDULING_STATS_ERROR'
    });
  }
});

/**
 * POST /denuncias/:id/forcar-publicacao
 * Forçar publicação imediata (debug/emergência)
 */
router.post('/denuncias/:id/forcar-publicacao', externalApiLimiter,
  validation.validateObjectId('id'),
  async (req, res) => {
    try {
      const originalController = require('../controllers/adminController');
      await originalController.forcarPublicacao(req, res);
    } catch (error) {
      logger.error('[ADMIN_API] Erro ao forçar publicação:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao forçar publicação',
        code: 'FORCE_PUBLISH_ERROR'
      });
    }
  }
);

// =============================================================================
// INTEGRAÇÕES EXTERNAS
// =============================================================================

/**
 * POST /instagram/test
 * Testar conexão Instagram
 */
router.post('/instagram/test', externalApiLimiter, async (req, res) => {
  try {
    const originalController = require('../controllers/adminController');
    await originalController.testarInstagram(req, res);
  } catch (error) {
    logger.error('[ADMIN_API] Erro no teste Instagram:', error);
    res.status(500).json({
      success: false,
      error: 'Erro no teste Instagram',
      code: 'INSTAGRAM_TEST_ERROR'
    });
  }
});

// =============================================================================
// PERFORMANCE E MONITORAMENTO
// =============================================================================

/**
 * GET /performance/metrics
 * Métricas de performance do sistema
 */
router.get('/performance/metrics', listLimiter, async (req, res) => {
  await optimizedAdminController.getPerformanceMetrics(req, res);
});

/**
 * POST /cache/refresh
 * Forçar atualização de cache
 */
router.post('/cache/refresh', writeLimiter,
  validation.validateBody({
    type: { type: 'string', enum: ['all', 'dashboard', 'agenda', 'lists'], default: 'all' }
  }),
  async (req, res) => {
    await optimizedAdminController.refreshCache(req, res);
  }
);

/**
 * GET /health
 * Health check do controller otimizado
 */
router.get('/health', async (req, res) => {
  await optimizedAdminController.healthCheck(req, res);
});

// =============================================================================
// TRATAMENTO DE ERROS
// =============================================================================

// Middleware de tratamento de erros para rotas administrativas
router.use((error, req, res, next) => {
  logger.error('[ADMIN_API] Erro não tratado:', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    user: req.user?.email,
    ip: req.ip
  });
  
  // Não vazar informações sensíveis em produção
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(error.status || 500).json({
    success: false,
    error: 'Erro interno do servidor',
    code: 'INTERNAL_SERVER_ERROR',
    message: isDevelopment ? error.message : 'Erro interno do servidor',
    timestamp: new Date().toISOString(),
    ...(isDevelopment && { stack: error.stack })
  });
});

// Middleware para rotas não encontradas
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint não encontrado',
    code: 'ENDPOINT_NOT_FOUND',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;