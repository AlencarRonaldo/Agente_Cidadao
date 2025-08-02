const express = require('express');
const router = express.Router();

// Middleware
const { authenticateToken, requireRole, login, verifyToken, refreshToken, createAdminUser } = require('../middleware/auth');
const { 
  rateLimits, 
  sanitizeInput, 
  validateLogin, 
  validateCreateAdmin,
  validateDenunciaAction,
  requestLogger
} = require('../middleware/validation');

// Controllers
const adminController = require('../controllers/adminController');


// Aplicar middleware de logging e sanitização para todas as rotas
router.use(requestLogger);
router.use(sanitizeInput);

// ======= ROTAS PÚBLICAS (sem autenticação) =======

// Login (SEMPRE PÚBLICO)
router.post('/login', 
  rateLimits.login,
  validateLogin,
  login
);

// Dashboard público para teste (TEMPORÁRIO) - SEM MIDDLEWARES
router.get('/public-dashboard', async (req, res) => {
  try {
    const prisma = require('../config/database');
    
    // Estatísticas básicas diretas
    const totalDenuncias = await prisma.denuncia.count();
    const denunciasPendentes = await prisma.denuncia.count({ 
      where: { status: 'PENDENTE_MODERACAO' } 
    });
    const denunciasPublicadas = await prisma.denuncia.count({ 
      where: { status: 'PUBLICADA' } 
    });

    res.json({
      success: true,
      message: 'Dashboard público funcionando!',
      data: {
        resumo: {
          totalDenuncias,
          denunciasPendentes,
          denunciasPublicadas,
          aprovacaoAutomatica: "85%"
        },
        timestamp: new Date()
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Erro no dashboard público',
      details: error.message
    });
  }
});

// ======= APLICAR AUTENTICAÇÃO PARA TODAS AS ROTAS ABAIXO =======
router.use(authenticateToken);

// Verificar token atual
router.get('/auth/verify', verifyToken);

// Renovar token
router.post('/auth/refresh', refreshToken);

// ======= DASHBOARD E ESTATÍSTICAS =======

// Dashboard principal (todos os roles)
router.get('/dashboard', 
  rateLimits.api,
  adminController.getDashboard
);

// Relatórios (apenas ADMIN e MODERADOR)
router.get('/relatorios',
  requireRole(['ADMIN', 'MODERADOR']),
  rateLimits.api,
  adminController.gerarRelatorio
);

// Estatísticas de agendamento (apenas ADMIN e MODERADOR)
router.get('/scheduling-stats',
  requireRole(['ADMIN', 'MODERADOR']),
  rateLimits.api,
  adminController.getSchedulingStats
);

// ======= GESTÃO DE DENÚNCIAS =======

// Listar denúncias com filtros e paginação (todos os roles)
router.get('/denuncias',
  rateLimits.api,
  adminController.listarDenuncias
);

// Buscar denúncia específica (todos os roles)
router.get('/denuncias/:id',
  rateLimits.api,
  adminController.obterDenuncia
);

// Aprovar denúncia (apenas ADMIN e MODERADOR)
router.post('/denuncias/:id/aprovar',
  requireRole(['ADMIN', 'MODERADOR']),
  rateLimits.admin,
  adminController.aprovarDenuncia
);

// SEGURANÇA REFORÇADA: Aprovar e Postar com Confirmação Explícita (apenas ADMIN)
router.post('/denuncias/:id/aprovar-e-postar',
  requireRole(['ADMIN']), // RESTRITO APENAS PARA ADMIN
  rateLimits.admin,
  (req, res, next) => {
    // Validação de segurança aprimorada
    const { acao, confirmar_publicacao, usuario_confirmacao, motivo_urgencia } = req.body;
    
    // Validar ação
    if (acao !== 'aprovar_e_postar') {
      return res.status(400).json({
        error: 'Ação deve ser: aprovar_e_postar',
        code: 'INVALID_ACTION'
      });
    }
    
    // Exigir confirmação explícita do usuário
    if (!confirmar_publicacao || confirmar_publicacao !== 'CONFIRMO_PUBLICACAO_IMEDIATA') {
      return res.status(400).json({
        error: 'Campo confirmar_publicacao deve ser: CONFIRMO_PUBLICACAO_IMEDIATA',
        code: 'MISSING_CONFIRMATION'
      });
    }
    
    // Exigir identificação do usuário que confirma
    if (!usuario_confirmacao || typeof usuario_confirmacao !== 'string' || usuario_confirmacao.length < 3) {
      return res.status(400).json({
        error: 'Campo usuario_confirmacao é obrigatório (mínimo 3 caracteres)',
        code: 'MISSING_USER_CONFIRMATION'
      });
    }
    
    // Exigir motivo para publicação urgente
    if (!motivo_urgencia || typeof motivo_urgencia !== 'string' || motivo_urgencia.length < 10) {
      return res.status(400).json({
        error: 'Campo motivo_urgencia é obrigatório (mínimo 10 caracteres)',
        code: 'MISSING_URGENCY_REASON'
      });
    }
    
    // Adicionar dados de segurança ao request
    req.securityData = {
      usuario_confirmacao,
      motivo_urgencia,
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      timestamp: new Date()
    };
    
    next();
  },
  adminController.aprovarEPostarComSeguranca
);

// Log de auditoria para endpoint sensível
router.use('/denuncias/:id/aprovar-e-postar', (req, res, next) => {
  const logger = require('../utils/logger');
  logger.warn('🔐 ACESSO ENDPOINT SENSÍVEL - APROVAÇÃO E PUBLICAÇÃO', {
    endpoint: '/aprovar-e-postar',
    user: req.user?.email || 'unknown',
    userId: req.user?.id || 'unknown',
    denunciaId: req.params.id,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  next();
});

// Rejeitar denúncia (apenas ADMIN e MODERADOR)
router.post('/denuncias/:id/rejeitar',
  requireRole(['ADMIN', 'MODERADOR']),
  rateLimits.admin,
  (req, res, next) => {
    // Validação inline para rejeição
    const { motivo } = req.body;
    if (!motivo || motivo.trim().length < 10) {
      return res.status(400).json({
        error: 'Motivo da rejeição deve ter pelo menos 10 caracteres',
        code: 'INVALID_REJECTION_REASON'
      });
    }
    next();
  },
  adminController.rejeitarDenuncia
);

// Editar denúncia (apenas ADMIN e MODERADOR)
router.post('/denuncias/:id/editar',
  requireRole(['ADMIN', 'MODERADOR']),
  rateLimits.admin,
  (req, res, next) => {
    // Validação inline para edição
    const { textoFiltrado } = req.body;
    if (!textoFiltrado || textoFiltrado.trim().length < 10) {
      return res.status(400).json({
        error: 'Texto filtrado deve ter pelo menos 10 caracteres',
        code: 'INVALID_FILTERED_TEXT'
      });
    }
    next();
  },
  adminController.editarDenuncia
);

// Ações em lote (apenas ADMIN e MODERADOR)
router.post('/denuncias/lote',
  requireRole(['ADMIN', 'MODERADOR']),
  rateLimits.admin,
  (req, res, next) => {
    // Validação inline para ações em lote
    const { ids, acao } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        error: 'Lista de IDs é obrigatória',
        code: 'MISSING_IDS'
      });
    }
    
    if (ids.length > 50) {
      return res.status(400).json({
        error: 'Máximo 50 itens por lote',
        code: 'TOO_MANY_ITEMS'
      });
    }
    
    if (!['aprovar', 'rejeitar'].includes(acao)) {
      return res.status(400).json({
        error: 'Ação deve ser: aprovar ou rejeitar',
        code: 'INVALID_ACTION'
      });
    }
    
    next();
  },
  adminController.acaoLote
);

// ======= GESTÃO DE USUÁRIOS (apenas ADMIN) =======

// Criar usuário admin (apenas ADMIN)
router.post('/usuarios',
  requireRole(['ADMIN']),
  rateLimits.admin,
  validateCreateAdmin,
  createAdminUser
);

// Listar usuários admin (apenas ADMIN)
router.get('/usuarios',
  requireRole(['ADMIN']),
  rateLimits.api,
  async (req, res) => {
    try {
      const usuarios = await require('../config/database').adminUser.findMany({
        select: {
          id: true,
          nome: true,
          email: true,
          role: true,
          ativo: true,
          createdAt: true,
          lastLogin: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      res.json({
        success: true,
        data: usuarios
      });
    } catch (error) {
      res.status(500).json({
        error: 'Erro ao listar usuários',
        code: 'LIST_USERS_ERROR'
      });
    }
  }
);

// Ativar/desativar usuário (apenas ADMIN)
router.patch('/usuarios/:id/status',
  requireRole(['ADMIN']),
  rateLimits.admin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { ativo } = req.body;

      if (typeof ativo !== 'boolean') {
        return res.status(400).json({
          error: 'Campo ativo deve ser true ou false',
          code: 'INVALID_STATUS'
        });
      }

      // Não permitir desativar o próprio usuário
      if (id === req.user.id && !ativo) {
        return res.status(400).json({
          error: 'Você não pode desativar seu próprio usuário',
          code: 'CANNOT_DEACTIVATE_SELF'
        });
      }

      const usuario = await require('../config/database').adminUser.update({
        where: { id },
        data: { ativo },
        select: {
          id: true,
          nome: true,
          email: true,
          role: true,
          ativo: true
        }
      });

      res.json({
        success: true,
        message: `Usuário ${ativo ? 'ativado' : 'desativado'} com sucesso`,
        data: usuario
      });
    } catch (error) {
      if (error.code === 'P2025') {
        return res.status(404).json({
          error: 'Usuário não encontrado',
          code: 'USER_NOT_FOUND'
        });
      }
      
      res.status(500).json({
        error: 'Erro ao atualizar status do usuário',
        code: 'UPDATE_USER_ERROR'
      });
    }
  }
);

// ======= ANÁLISE INTELIGENTE =======

// Testar análise inteligente de texto (apenas ADMIN e MODERADOR)
router.post('/smart-analysis/test',
  requireRole(['ADMIN', 'MODERADOR']),
  rateLimits.api,
  async (req, res) => {
    try {
      const { texto, localizacao } = req.body;
      
      if (!texto || texto.trim().length < 10) {
        return res.status(400).json({
          error: 'Texto deve ter pelo menos 10 caracteres',
          code: 'INVALID_TEXT'
        });
      }
      
      const smartAnalysisService = require('../services/smartAnalysisService');
      const analise = await smartAnalysisService.analisarDenuncia(texto, localizacao);
      
      // Gerar caption de exemplo
      const caption = smartAnalysisService.gerarCaption(analise, texto);
      
      res.json({
        success: true,
        data: {
          analise,
          caption,
          timestamp: new Date()
        }
      });
    } catch (error) {
      res.status(500).json({
        error: 'Erro ao executar análise inteligente',
        code: 'SMART_ANALYSIS_ERROR',
        details: error.message
      });
    }
  }
);

// Listar problemas urbanos conhecidos (todos os roles)
router.get('/smart-analysis/problemas',
  rateLimits.api,
  async (req, res) => {
    try {
      const smartAnalysisService = require('../services/smartAnalysisService');
      const problemas = smartAnalysisService.listarProblemasUrbanos();
      
      res.json({
        success: true,
        data: problemas,
        totalCategorias: Object.keys(problemas).length
      });
    } catch (error) {
      res.status(500).json({
        error: 'Erro ao listar problemas urbanos',
        code: 'LIST_PROBLEMS_ERROR',
        details: error.message
      });
    }
  }
);

// Listar bairros conhecidos (todos os roles)
router.get('/smart-analysis/bairros',
  rateLimits.api,
  async (req, res) => {
    try {
      const smartAnalysisService = require('../services/smartAnalysisService');
      const bairros = smartAnalysisService.listarBairros();
      
      res.json({
        success: true,
        data: bairros,
        totalBairros: bairros.length
      });
    } catch (error) {
      res.status(500).json({
        error: 'Erro ao listar bairros',
        code: 'LIST_NEIGHBORHOODS_ERROR',
        details: error.message
      });
    }
  }
);

// Buscar vereadores por bairro (todos os roles)
router.get('/smart-analysis/vereadores/:bairro',
  rateLimits.api,
  async (req, res) => {
    try {
      const { bairro } = req.params;
      const smartAnalysisService = require('../services/smartAnalysisService');
      const vereadores = smartAnalysisService.buscarVereadores(bairro);
      
      if (!vereadores) {
        return res.status(404).json({
          error: 'Bairro não encontrado',
          code: 'NEIGHBORHOOD_NOT_FOUND'
        });
      }
      
      res.json({
        success: true,
        data: vereadores
      });
    } catch (error) {
      res.status(500).json({
        error: 'Erro ao buscar vereadores',
        code: 'SEARCH_COUNCILORS_ERROR',
        details: error.message
      });
    }
  }
);

// Estatísticas de análises realizadas (apenas ADMIN)
router.get('/smart-analysis/stats',
  requireRole(['ADMIN']),
  rateLimits.api,
  async (req, res) => {
    try {
      const prisma = require('../config/database');
      
      // Buscar denúncias que possuem análise inteligente
      const denuncias = await prisma.denuncia.findMany({
        where: {
          metadata: {
            path: ['analiseInteligente'],
            not: null
          }
        },
        select: {
          metadata: true,
          createdAt: true
        }
      });
      
      // Extrair análises do metadata
      const analises = denuncias
        .map(d => d.metadata?.analiseInteligente)
        .filter(a => a);
      
      const smartAnalysisService = require('../services/smartAnalysisService');
      const stats = smartAnalysisService.obterEstatisticas(analises);
      
      res.json({
        success: true,
        data: {
          ...stats,
          denunciasAnalisadas: denuncias.length,
          periodoAnalise: {
            inicio: denuncias.length > 0 ? denuncias[denuncias.length - 1].createdAt : null,
            fim: denuncias.length > 0 ? denuncias[0].createdAt : null
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        error: 'Erro ao obter estatísticas de análise inteligente',
        code: 'SMART_ANALYSIS_STATS_ERROR',
        details: error.message
      });
    }
  }
);

// Reprocessar denúncia com análise inteligente (apenas ADMIN e MODERADOR)
router.post('/smart-analysis/reprocess/:id',
  requireRole(['ADMIN', 'MODERADOR']),
  rateLimits.admin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const prisma = require('../config/database');
      
      // Buscar denúncia
      const denuncia = await prisma.denuncia.findUnique({
        where: { id }
      });
      
      if (!denuncia) {
        return res.status(404).json({
          error: 'Denúncia não encontrada',
          code: 'DENUNCIA_NOT_FOUND'
        });
      }
      
      // Executar nova análise inteligente
      const smartAnalysisService = require('../services/smartAnalysisService');
      const novaAnalise = await smartAnalysisService.analisarDenuncia(denuncia.texto, denuncia.localizacao);
      
      // Atualizar denúncia com nova análise
      const denunciaAtualizada = await prisma.denuncia.update({
        where: { id },
        data: {
          bairro: novaAnalise.bairro || denuncia.bairro,
          vereadores: novaAnalise.vereadores.length > 0 ? novaAnalise.vereadores : denuncia.vereadores,
          metadata: {
            ...(denuncia.metadata || {}),
            analiseInteligente: {
              ...novaAnalise,
              reprocessedAt: new Date(),
              reprocessedBy: req.user.email
            }
          }
        }
      });
      
      // Gerar nova caption
      const novaCaption = smartAnalysisService.gerarCaption(novaAnalise, denuncia.textoFiltrado || denuncia.texto);
      
      res.json({
        success: true,
        message: 'Denúncia reprocessada com análise inteligente',
        data: {
          denuncia: denunciaAtualizada,
          novaAnalise,
          novaCaption
        }
      });
    } catch (error) {
      res.status(500).json({
        error: 'Erro ao reprocessar denúncia',
        code: 'REPROCESS_ERROR',
        details: error.message
      });
    }
  }
);

// ======= CONFIGURAÇÕES E SISTEMA =======

// Status do sistema (apenas ADMIN)
router.get('/sistema/status',
  requireRole(['ADMIN']),
  rateLimits.api,
  async (req, res) => {
    try {
      const Bull = require('bull');
      
      // Conectar às filas
      const processQueue = new Bull('process-queue', {
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: process.env.REDIS_PORT || 6379,
        },
      });
      
      const publishQueue = new Bull('publish-queue', {
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: process.env.REDIS_PORT || 6379,
        },
      });

      // Status das filas
      const [processStats, publishStats] = await Promise.all([
        processQueue.getJobCounts(),
        publishQueue.getJobCounts()
      ]);

      // Status do banco
      const dbStatus = await require('../config/database').$queryRaw`SELECT 1 as connected`;

      res.json({
        success: true,
        data: {
          database: {
            status: 'connected',
            connected: !!dbStatus
          },
          redis: {
            status: 'connected' // Se chegou até aqui, está conectado
          },
          queues: {
            process: processStats,
            publish: publishStats
          },
          environment: process.env.NODE_ENV || 'development',
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          timestamp: new Date()
        }
      });
    } catch (error) {
      res.status(500).json({
        error: 'Erro ao verificar status do sistema',
        code: 'SYSTEM_STATUS_ERROR',
        details: error.message
      });
    }
  }
);

// Limpar filas (apenas ADMIN)
router.post('/sistema/limpar-filas',
  requireRole(['ADMIN']),
  rateLimits.admin,
  async (req, res) => {
    try {
      const { tipo = 'completed' } = req.body;
      
      const Bull = require('bull');
      const processQueue = new Bull('process-queue', {
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: process.env.REDIS_PORT || 6379,
        },
      });
      
      const publishQueue = new Bull('publish-queue', {
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: process.env.REDIS_PORT || 6379,
        },
      });

      // Limpar jobs antigos
      const age = 24 * 3600 * 1000; // 24 horas
      
      await Promise.all([
        processQueue.clean(age, tipo),
        publishQueue.clean(age, tipo)
      ]);

      res.json({
        success: true,
        message: `Filas limpas: ${tipo} jobs mais antigos que 24h foram removidos`
      });
    } catch (error) {
      res.status(500).json({
        error: 'Erro ao limpar filas',
        code: 'CLEAN_QUEUES_ERROR'
      });
    }
  }
);

// ======= WHATSAPP CONFIGURATION =======

// Obter status do WhatsApp (apenas ADMIN)
router.get('/whatsapp/status',
  requireRole(['ADMIN']),
  rateLimits.api,
  async (req, res) => {
    try {
      const whatsappService = require('../services/whatsappService');
      const status = whatsappService.getConnectionStatus();
      
      // Adicionar informações de debug para o frontend
      const enhancedStatus = {
        ...status,
        hasQrCode: !!status.qrCode,
        qrCodeLength: status.qrCode ? status.qrCode.length : 0,
        needsQrCode: !status.isConnected && !status.isConnecting && !status.isInitializing,
        debugInfo: {
          hasClient: status.hasClient,
          hasHeartbeat: status.hasHeartbeat,
          uptime: status.uptime,
          connectionAttempts: status.connectionAttempts
        }
      };
      
      res.json({
        success: true,
        data: enhancedStatus
      });
    } catch (error) {
      res.status(500).json({
        error: 'Erro ao verificar status do WhatsApp',
        code: 'WHATSAPP_STATUS_ERROR',
        details: error.message
      });
    }
  }
);

// Conectar WhatsApp (apenas ADMIN)
router.post('/whatsapp/connect',
  requireRole(['ADMIN']),
  rateLimits.admin,
  async (req, res) => {
    try {
      const whatsappService = require('../services/whatsappService');
      const result = await whatsappService.initialize();
      
      res.json({
        success: result.success,
        message: result.message,
        qrRequired: !result.success || whatsappService.qrCode ? true : false
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: `Erro ao conectar WhatsApp: ${error.message}`
      });
    }
  }
);

// Desconectar WhatsApp (apenas ADMIN)
router.post('/whatsapp/disconnect',
  requireRole(['ADMIN']),
  rateLimits.admin,
  async (req, res) => {
    try {
      const whatsappService = require('../services/whatsappService');
      const result = await whatsappService.disconnect();
      
      res.json({
        success: result.success,
        message: result.message
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: `Erro ao desconectar WhatsApp: ${error.message}`
      });
    }
  }
);

// Forçar nova sessão WhatsApp (apenas ADMIN)
router.post('/whatsapp/force-new-session',
  requireRole(['ADMIN']),
  rateLimits.admin,
  async (req, res) => {
    try {
      const whatsappService = require('../services/whatsappService');
      const result = await whatsappService.forceNewSession();
      
      res.json({
        success: result.success,
        message: result.message,
        action: 'Nova sessão forçada - QR Code será gerado em breve'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: `Erro ao forçar nova sessão: ${error.message}`
      });
    }
  }
);

// Obter estatísticas detalhadas do WhatsApp (apenas ADMIN)
router.get('/whatsapp/detailed-stats',
  requireRole(['ADMIN']),
  rateLimits.api,
  async (req, res) => {
    try {
      const whatsappService = require('../services/whatsappService');
      const stats = whatsappService.getDetailedStats();
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(500).json({
        error: 'Erro ao obter estatísticas detalhadas',
        code: 'WHATSAPP_STATS_ERROR',
        details: error.message
      });
    }
  }
);

// Verificar sessão existente antes de conectar (apenas ADMIN)
router.get('/whatsapp/check-session',
  requireRole(['ADMIN']),
  rateLimits.api,
  async (req, res) => {
    try {
      const whatsappService = require('../services/whatsappService');
      const sessionCheck = await whatsappService.checkExistingSession();
      
      res.json({
        success: true,
        data: sessionCheck
      });
    } catch (error) {
      res.status(500).json({
        error: 'Erro ao verificar sessão existente',
        code: 'WHATSAPP_SESSION_CHECK_ERROR',
        details: error.message
      });
    }
  }
);

// Validar sessão atual (apenas ADMIN)
router.get('/whatsapp/validate-session',
  requireRole(['ADMIN']),
  rateLimits.api,
  async (req, res) => {
    try {
      const whatsappService = require('../services/whatsappService');
      const validation = await whatsappService.validateCurrentSession();
      
      res.json({
        success: true,
        data: validation
      });
    } catch (error) {
      res.status(500).json({
        error: 'Erro ao validar sessão atual',
        code: 'WHATSAPP_SESSION_VALIDATION_ERROR',
        details: error.message
      });
    }
  }
);

// Obter QR Code (apenas ADMIN)
router.get('/whatsapp/qr',
  requireRole(['ADMIN']),
  rateLimits.api,
  async (req, res) => {
    try {
      const whatsappService = require('../services/whatsappService');
      const status = whatsappService.getConnectionStatus();
      
      res.json({
        success: true,
        qrCode: status.qrCode,
        isConnecting: status.isConnecting,
        isConnected: status.isConnected
      });
    } catch (error) {
      res.status(500).json({
        error: 'Erro ao obter QR Code',
        code: 'WHATSAPP_QR_ERROR',
        details: error.message
      });
    }
  }
);

// Obter informações da conta WhatsApp (apenas ADMIN)
router.get('/whatsapp/account-info',
  requireRole(['ADMIN']),
  rateLimits.api,
  async (req, res) => {
    try {
      const whatsappService = require('../services/whatsappService');
      const accountInfo = await whatsappService.getAccountInfo();
      
      if (!accountInfo) {
        return res.status(400).json({
          error: 'WhatsApp não está conectado ou não foi possível obter informações',
          code: 'WHATSAPP_NOT_CONNECTED'
        });
      }
      
      res.json({
        success: true,
        data: accountInfo
      });
    } catch (error) {
      res.status(500).json({
        error: 'Erro ao obter informações da conta WhatsApp',
        code: 'WHATSAPP_ACCOUNT_ERROR',
        details: error.message
      });
    }
  }
);

// Enviar mensagem de teste (apenas ADMIN)
router.post('/whatsapp/test-message',
  requireRole(['ADMIN']),
  rateLimits.admin,
  async (req, res) => {
    try {
      const { phoneNumber, message } = req.body;
      
      if (!phoneNumber) {
        return res.status(400).json({
          error: 'Número de telefone é obrigatório',
          code: 'MISSING_PHONE_NUMBER'
        });
      }
      
      // Validar formato do número
      const phoneRegex = /^[1-9]\d{1,14}$/;
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      
      if (!phoneRegex.test(cleanPhone)) {
        return res.status(400).json({
          error: 'Formato de número inválido',
          code: 'INVALID_PHONE_FORMAT'
        });
      }
      
      const whatsappService = require('../services/whatsappService');
      const result = await whatsappService.sendTestMessage(cleanPhone, message);
      
      res.json({
        success: result.success,
        message: result.message
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: `Erro ao enviar mensagem de teste: ${error.message}`
      });
    }
  }
);

// Obter estatísticas de conversas (apenas ADMIN)
router.get('/whatsapp/conversations',
  requireRole(['ADMIN']),
  rateLimits.api,
  async (req, res) => {
    try {
      const prisma = require('../config/database');
      
      const [total, ativos, porEstado] = await Promise.all([
        prisma.conversaUsuario.count(),
        prisma.conversaUsuario.count({
          where: {
            expiresAt: {
              gt: new Date()
            }
          }
        }),
        prisma.conversaUsuario.groupBy({
          by: ['estado'],
          _count: true
        })
      ]);
      
      res.json({
        success: true,
        data: {
          total,
          ativos,
          distribuicaoPorEstado: porEstado.map(item => ({
            estado: item.estado,
            count: item._count
          }))
        }
      });
    } catch (error) {
      res.status(500).json({
        error: 'Erro ao obter estatísticas de conversas',
        code: 'WHATSAPP_CONVERSATIONS_ERROR',
        details: error.message
      });
    }
  }
);

// ======= MASTER FLOW CONTROLLER =======

// Obter status completo do sistema (apenas ADMIN)
router.get('/master-flow/status',
  requireRole(['ADMIN']),
  rateLimits.api,
  async (req, res) => {
    try {
      const MasterFlowController = require('../services/masterFlowController');
      const masterFlow = new MasterFlowController();
      
      const systemStatus = masterFlow.getSystemStatus();
      
      res.json({
        success: true,
        data: systemStatus
      });
    } catch (error) {
      res.status(500).json({
        error: 'Erro ao obter status do Master Flow Controller',
        code: 'MASTER_FLOW_STATUS_ERROR',
        details: error.message
      });
    }
  }
);

// Executar diagnóstico completo (apenas ADMIN)
router.post('/master-flow/diagnosis',
  requireRole(['ADMIN']),
  rateLimits.admin,
  async (req, res) => {
    try {
      const ContextualDiagnostics = require('../services/contextualDiagnostics');
      const diagnostics = new ContextualDiagnostics();
      
      const diagnosis = await diagnostics.executeDiagnosis();
      
      res.json({
        success: true,
        message: 'Diagnóstico executado com sucesso',
        data: diagnosis
      });
    } catch (error) {
      res.status(500).json({
        error: 'Erro ao executar diagnóstico',
        code: 'DIAGNOSIS_ERROR',
        details: error.message
      });
    }
  }
);

// Executar correção automática (apenas ADMIN)
router.post('/master-flow/auto-correction',
  requireRole(['ADMIN']),
  rateLimits.admin,
  async (req, res) => {
    try {
      const FlowCorrectionEngine = require('../services/flowCorrectionEngine');
      const correctionEngine = new FlowCorrectionEngine();
      
      const correctionResult = await correctionEngine.executeAutoCorrection();
      
      res.json({
        success: true,
        message: 'Correção automática executada',
        data: correctionResult
      });
    } catch (error) {
      res.status(500).json({
        error: 'Erro ao executar correção automática',
        code: 'AUTO_CORRECTION_ERROR',
        details: error.message
      });
    }
  }
);

// Executar correção de emergência (apenas ADMIN)
router.post('/master-flow/emergency-correction',
  requireRole(['ADMIN']),
  rateLimits.admin,
  async (req, res) => {
    try {
      const FlowCorrectionEngine = require('../services/flowCorrectionEngine');
      const correctionEngine = new FlowCorrectionEngine();
      
      const emergencyResult = await correctionEngine.executeEmergencyCorrection();
      
      res.json({
        success: emergencyResult.success,
        message: emergencyResult.success ? 'Correção de emergência executada com sucesso' : 'Correção de emergência falhou',
        data: emergencyResult
      });
    } catch (error) {
      res.status(500).json({
        error: 'Erro ao executar correção de emergência',
        code: 'EMERGENCY_CORRECTION_ERROR',
        details: error.message
      });
    }
  }
);

// Status da fila de posts (apenas ADMIN)
router.get('/master-flow/queue-status',
  requireRole(['ADMIN']),
  rateLimits.api,
  async (req, res) => {
    try {
      const IntelligentPostQueue = require('../services/intelligentPostQueue');
      const postQueue = new IntelligentPostQueue();
      
      // Inicializar se necessário
      await postQueue.initialize();
      
      const queueStatus = postQueue.getQueueStatus();
      const queueItems = postQueue.getQueueItems(20);
      
      res.json({
        success: true,
        data: {
          status: queueStatus,
          items: queueItems
        }
      });
    } catch (error) {
      res.status(500).json({
        error: 'Erro ao obter status da fila',
        code: 'QUEUE_STATUS_ERROR',
        details: error.message
      });
    }
  }
);

// Processar fila de posts (apenas ADMIN)
router.post('/master-flow/process-queue',
  requireRole(['ADMIN']),
  rateLimits.admin,
  async (req, res) => {
    try {
      const { batchSize = 5 } = req.body;
      
      const IntelligentPostQueue = require('../services/intelligentPostQueue');
      const postQueue = new IntelligentPostQueue();
      
      await postQueue.initialize();
      
      if (!postQueue.processing) {
        postQueue.startProcessing();
        
        res.json({
          success: true,
          message: 'Processamento da fila iniciado',
          data: {
            processing: true,
            queueLength: postQueue.queue.length
          }
        });
      } else {
        res.json({
          success: true,
          message: 'Fila já está sendo processada',
          data: {
            processing: true,
            queueLength: postQueue.queue.length
          }
        });
      }
    } catch (error) {
      res.status(500).json({
        error: 'Erro ao processar fila',
        code: 'PROCESS_QUEUE_ERROR',
        details: error.message
      });
    }
  }
);

// Pausar/retomar fila de posts (apenas ADMIN)
router.post('/master-flow/queue/:action',
  requireRole(['ADMIN']),
  rateLimits.admin,
  async (req, res) => {
    try {
      const { action } = req.params;
      
      if (!['pause', 'resume', 'clear'].includes(action)) {
        return res.status(400).json({
          error: 'Ação deve ser: pause, resume ou clear',
          code: 'INVALID_QUEUE_ACTION'
        });
      }
      
      const IntelligentPostQueue = require('../services/intelligentPostQueue');
      const postQueue = new IntelligentPostQueue();
      
      await postQueue.initialize();
      
      let message = '';
      
      switch (action) {
        case 'pause':
          postQueue.pauseProcessing();
          message = 'Fila pausada';
          break;
        case 'resume':
          postQueue.resumeProcessing();
          message = 'Fila retomada';
          break;
        case 'clear':
          postQueue.clearQueue();
          message = 'Fila limpa';
          break;
      }
      
      res.json({
        success: true,
        message,
        data: postQueue.getQueueStatus()
      });
    } catch (error) {
      res.status(500).json({
        error: 'Erro ao executar ação na fila',
        code: 'QUEUE_ACTION_ERROR',
        details: error.message
      });
    }
  }
);

// Adicionar post específico à fila (apenas ADMIN)
router.post('/master-flow/queue-post/:id',
  requireRole(['ADMIN']),
  rateLimits.admin,
  async (req, res) => {
    try {
      const { id } = req.params;
      
      const MasterFlowController = require('../services/masterFlowController');
      const masterFlow = new MasterFlowController();
      
      const result = await masterFlow.queueApprovedPost(id);
      
      res.json({
        success: result.success,
        message: result.success ? 'Post adicionado à fila' : 'Falha ao adicionar post à fila',
        data: result
      });
    } catch (error) {
      res.status(500).json({
        error: 'Erro ao adicionar post à fila',
        code: 'QUEUE_POST_ERROR',
        details: error.message
      });
    }
  }
);

// Dashboard de monitoramento em tempo real (apenas ADMIN)
router.get('/master-flow/dashboard-metrics',
  requireRole(['ADMIN']),
  rateLimits.api,
  async (req, res) => {
    try {
      const RealTimeDashboard = require('../services/realtimeDashboard').default;
      
      if (!RealTimeDashboard.isRunning) {
        return res.status(503).json({
          error: 'Dashboard não está executando',
          code: 'DASHBOARD_NOT_RUNNING'
        });
      }
      
      const serviceStatus = RealTimeDashboard.getServiceStatus();
      
      res.json({
        success: true,
        data: serviceStatus
      });
    } catch (error) {
      res.status(500).json({
        error: 'Erro ao obter métricas do dashboard',
        code: 'DASHBOARD_METRICS_ERROR',
        details: error.message
      });
    }
  }
);

// Teste controlado de publicação (apenas ADMIN)
router.post('/master-flow/controlled-test',
  requireRole(['ADMIN']),
  rateLimits.admin,
  async (req, res) => {
    try {
      const ContextualDiagnostics = require('../services/contextualDiagnostics');
      const diagnostics = new ContextualDiagnostics();
      
      const testResult = await diagnostics.executeControlledPostingTest();
      
      res.json({
        success: testResult.success,
        message: testResult.success ? 'Teste controlado executado com sucesso' : 'Teste controlado falhou',
        data: testResult
      });
    } catch (error) {
      res.status(500).json({
        error: 'Erro ao executar teste controlado',
        code: 'CONTROLLED_TEST_ERROR',
        details: error.message
      });
    }
  }
);

// Inicializar sistema Master Flow (apenas ADMIN)
router.post('/master-flow/initialize',
  requireRole(['ADMIN']),
  rateLimits.admin,
  async (req, res) => {
    try {
      const { SystemInitializer } = require('../services/systemInitializer');
      const initializer = new SystemInitializer();
      
      const success = await initializer.initialize();
      
      if (success) {
        // Salvar instância global para uso posterior
        const { setGlobalInitializer } = require('../services/systemInitializer');
        setGlobalInitializer(initializer);
        
        res.json({
          success: true,
          message: 'Sistema Master Flow inicializado com sucesso',
          data: initializer.getStatus()
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Falha na inicialização do sistema Master Flow'
        });
      }
    } catch (error) {
      res.status(500).json({
        error: 'Erro ao inicializar sistema Master Flow',
        code: 'MASTER_FLOW_INIT_ERROR',
        details: error.message
      });
    }
  }
);

// Status do sistema Master Flow (apenas ADMIN)
router.get('/master-flow/system-status',
  requireRole(['ADMIN']),
  rateLimits.api,
  async (req, res) => {
    try {
      const { getGlobalInitializer } = require('../services/systemInitializer');
      const initializer = getGlobalInitializer();
      
      if (!initializer) {
        return res.json({
          success: true,
          data: {
            initialized: false,
            status: 'not_initialized',
            message: 'Sistema Master Flow não foi inicializado'
          }
        });
      }
      
      const status = initializer.getStatus();
      
      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      res.status(500).json({
        error: 'Erro ao obter status do sistema',
        code: 'SYSTEM_STATUS_ERROR',
        details: error.message
      });
    }
  }
);

// Reiniciar sistema Master Flow (apenas ADMIN)
router.post('/master-flow/restart',
  requireRole(['ADMIN']),
  rateLimits.admin, 
  async (req, res) => {
    try {
      const { getGlobalInitializer } = require('../services/systemInitializer');
      const initializer = getGlobalInitializer();
      
      if (!initializer) {
        return res.status(400).json({
          error: 'Sistema não foi inicializado',
          code: 'SYSTEM_NOT_INITIALIZED'
        });
      }
      
      const success = await initializer.restart();
      
      res.json({
        success,
        message: success ? 'Sistema reiniciado com sucesso' : 'Falha ao reiniciar sistema',
        data: initializer.getStatus()
      });
    } catch (error) {
      res.status(500).json({
        error: 'Erro ao reiniciar sistema',
        code: 'SYSTEM_RESTART_ERROR',
        details: error.message
      });
    }
  }
);

// Parar sistema Master Flow (apenas ADMIN)
router.post('/master-flow/shutdown',
  requireRole(['ADMIN']),
  rateLimits.admin,
  async (req, res) => {
    try {
      const { getGlobalInitializer, setGlobalInitializer } = require('../services/systemInitializer');
      const initializer = getGlobalInitializer();
      
      if (!initializer) {
        return res.json({
          success: true,
          message: 'Sistema já estava parado'
        });
      }
      
      await initializer.shutdown();
      setGlobalInitializer(null);
      
      res.json({
        success: true,
        message: 'Sistema Master Flow parado com sucesso'
      });
    } catch (error) {
      res.status(500).json({
        error: 'Erro ao parar sistema',
        code: 'SYSTEM_SHUTDOWN_ERROR',
        details: error.message
      });
    }
  }
);

// ======= INSTAGRAM CONFIGURATION =======

// ===== Instagram API Management Routes (NEW) =====

// Get Instagram API Status (both Private and Graph APIs)
router.get('/instagram/api-status',
  requireRole(['ADMIN']),
  rateLimits.api,
  adminController.getInstagramApiStatus
);

// Get Migration Recommendations
router.get('/instagram/migration-recommendations',
  requireRole(['ADMIN']),
  rateLimits.api,
  adminController.getMigrationRecommendations
);

// Migrate Instagram API
router.post('/instagram/migrate-api',
  requireRole(['ADMIN']),
  rateLimits.admin,
  adminController.migrateInstagramApi
);

// Get Graph API Configuration
router.get('/instagram/graph-config',
  requireRole(['ADMIN']),
  rateLimits.api,
  adminController.getGraphApiConfig
);

// Save Graph API Configuration
router.post('/instagram/graph-config',
  requireRole(['ADMIN']),  
  rateLimits.admin,
  adminController.saveGraphApiConfig
);

// Initialize Graph API OAuth
router.post('/instagram/graph-oauth-init',
  requireRole(['ADMIN']),
  rateLimits.admin,
  adminController.initGraphApiOAuth
);

// Complete Graph API OAuth
router.post('/instagram/graph-oauth-complete',
  requireRole(['ADMIN']),
  rateLimits.admin,
  adminController.completeGraphApiOAuth
);

// Enhanced Instagram Test (works with both APIs)
router.post('/instagram/test-enhanced',
  requireRole(['ADMIN']),
  rateLimits.admin,
  adminController.testarInstagramEnhanced
);

// ===== Existing Instagram Routes (Backward Compatible) =====

// Obter configuração atual do Instagram (apenas ADMIN)
router.get('/instagram/config',
  requireRole(['ADMIN']),
  rateLimits.api,
  async (req, res) => {
    try {
      const instagramService = require('../services/instagramService');
      
      // Obter o status básico primeiro
      const status = await instagramService.getConnectionStatus();
      
      // Tentar obter accountInfo apenas se as credenciais estão válidas
      let accountInfo = null;
      if (status.hasValidCredentials) {
        try {
          accountInfo = await instagramService.getAccountInfo();
        } catch (error) {
          // Se falhar ao obter account info, atualizar o status para refletir isso
          status.connectionError = error.message;
          status.canConnect = false;
        }
      }
      
      // Melhorar o status com informações mais detalhadas
      const enhancedStatus = {
        ...status,
        connectionMessage: getConnectionMessage(status, accountInfo),
        canConnect: Boolean(accountInfo),
        lastError: status.connectionError || null
      };
      
      res.json({
        success: true,
        config: {
          username: status.username || '',
          // Nunca retornar a senha
        },
        status: enhancedStatus,
        accountInfo: accountInfo
      });
    } catch (error) {
      res.status(500).json({
        error: 'Erro ao obter configuração do Instagram',
        code: 'INSTAGRAM_CONFIG_ERROR',
        details: error.message
      });
    }
  }
);

// Função auxiliar para gerar mensagem de status
function getConnectionMessage(status, accountInfo) {
  if (!status.hasValidCredentials) {
    return 'Credenciais não configuradas';
  }
  
  // CORREÇÃO: Priorizar verificação de login ativo primeiro
  if (status.isLoggedIn) {
    if (accountInfo) {
      return 'Conectado e funcionando';
    } else {
      // Se está logado mas não conseguiu obter accountInfo, ainda está funcionando
      return 'Conectado (informações da conta indisponíveis)';
    }
  }
  
  // Se tem credenciais válidas mas não está logado
  if (status.hasValidCredentials && !status.isLoggedIn) {
    return 'Credenciais configuradas, aguardando login';
  }
  
  // Se tem credenciais mas falhou completamente na conexão
  if (status.hasValidCredentials && !accountInfo) {
    return 'Credenciais configuradas, mas conexão falhou';
  }
  
  return 'Status indisponível';
}

// Salvar configuração do Instagram (apenas ADMIN)
router.post('/instagram/config',
  requireRole(['ADMIN']),
  rateLimits.admin,
  async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({
          error: 'Usuário e senha são obrigatórios',
          code: 'MISSING_CREDENTIALS'
        });
      }
      
      // Validar formato do username
      if (!/^[a-zA-Z0-9._]+$/.test(username)) {
        return res.status(400).json({
          error: 'Nome de usuário contém caracteres inválidos',
          code: 'INVALID_USERNAME'
        });
      }
      
      // Salvar credenciais no arquivo .env
      const envUtils = require('../utils/envUtils');
      const envUpdateResult = await envUtils.updateInstagramCredentials(username, password);
      
      if (!envUpdateResult.success) {
        return res.status(500).json({
          error: 'Erro ao salvar credenciais no arquivo .env',
          code: 'ENV_UPDATE_ERROR',
          details: envUpdateResult.message
        });
      }
      
      // Tentar logout da sessão anterior
      const instagramService = require('../services/instagramService');
      try {
        await instagramService.logout();
      } catch (error) {
        // Ignorar erros de logout
      }
      
      // Reinicializar serviço com novas credenciais
      instagramService.username = username;
      instagramService.password = password;
      instagramService.isLoggedIn = false;
      
      res.json({
        success: true,
        message: 'Configuração salva com sucesso! As credenciais foram persistidas no arquivo .env e sobrescreverão qualquer configuração anterior.',
        data: {
          username: username,
          configuredAt: new Date().toISOString(),
          envBackup: envUpdateResult.backupFile
        }
      });
    } catch (error) {
      res.status(500).json({
        error: 'Erro ao salvar configuração do Instagram',
        code: 'SAVE_CONFIG_ERROR',
        details: error.message
      });
    }
  }
);

// Testar conexão com Instagram (apenas ADMIN)
router.post('/instagram/test',
  requireRole(['ADMIN']),
  rateLimits.admin,
  async (req, res) => {
    try {
      const instagramService = require('../services/instagramService');
      const result = await instagramService.testConnection();
      
      res.json({
        success: result.success,
        message: result.message,
        accountInfo: result.accountInfo || null
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: `Erro ao testar conexão: ${error.message}`,
        details: error.message
      });
    }
  }
);

// Status do Instagram (apenas ADMIN)
router.get('/instagram/status',
  requireRole(['ADMIN']),
  rateLimits.api,
  async (req, res) => {
    try {
      const instagramService = require('../services/instagramService');
      
      // Tentar obter account info para garantir que o serviço seja inicializado
      await instagramService.getAccountInfo().catch(() => null);
      
      // Obter status atualizado
      const status = await instagramService.getConnectionStatus();
      
      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      res.status(500).json({
        error: 'Erro ao verificar status do Instagram',
        code: 'INSTAGRAM_STATUS_ERROR',
        details: error.message
      });
    }
  }
);

// Testar conexão e login Instagram (apenas ADMIN)
router.post('/instagram/test-connection',
  requireRole(['ADMIN']),
  rateLimits.admin,
  adminController.testarInstagram
);

// Forçar publicação imediata para debug (apenas ADMIN)
router.post('/instagram/force-publish/:id',
  requireRole(['ADMIN']),
  rateLimits.admin,
  adminController.forcarPublicacao
);

// Obter informações da conta Instagram (apenas ADMIN)
router.get('/instagram/account-info',
  requireRole(['ADMIN']),
  rateLimits.api,
  async (req, res) => {
    try {
      const instagramService = require('../services/instagramService');
      const accountInfo = await instagramService.getAccountInfo();
      
      if (!accountInfo) {
        return res.status(400).json({
          error: 'Não foi possível obter informações da conta',
          code: 'ACCOUNT_INFO_ERROR'
        });
      }
      
      res.json({
        success: true,
        data: accountInfo
      });
    } catch (error) {
      res.status(500).json({
        error: 'Erro ao obter informações da conta Instagram',
        code: 'INSTAGRAM_ACCOUNT_ERROR',
        details: error.message
      });
    }
  }
);

// Listar posts recentes do Instagram (apenas ADMIN)
router.get('/instagram/recent-posts',
  requireRole(['ADMIN']),
  rateLimits.api,
  async (req, res) => {
    try {
      const { limit = 10 } = req.query;
      const instagramService = require('../services/instagramService');
      const posts = await instagramService.getRecentPosts(parseInt(limit));
      
      res.json({
        success: true,
        data: posts,
        count: posts.length
      });
    } catch (error) {
      res.status(500).json({
        error: 'Erro ao listar posts do Instagram',
        code: 'INSTAGRAM_POSTS_ERROR',
        details: error.message
      });
    }
  }
);

// Publicar teste no Instagram (apenas ADMIN)
router.post('/instagram/test-post',
  requireRole(['ADMIN']),
  rateLimits.admin,
  async (req, res) => {
    try {
      const { texto = 'Teste de publicação do Bot de Denúncias Cidadãs 🤖' } = req.body;
      
      if (!req.files || !req.files.imagem) {
        return res.status(400).json({
          error: 'Imagem é obrigatória para publicação',
          code: 'MISSING_IMAGE'
        });
      }

      const instagramService = require('../services/instagramService');
      const imageService = require('../services/imageService');
      
      // Processar imagem para Instagram
      const processedImage = await imageService.processForInstagram(
        req.files.imagem.tempFilePath,
        { type: 'square', quality: 85 }
      );
      
      // Publicar no Instagram
      const result = await instagramService.publicar({
        texto: texto,
        imagem: processedImage.filePath,
        vereadores: []
      });
      
      // Limpar arquivo temporário
      await imageService.cleanupTempFiles();
      
      res.json({
        success: result.success,
        message: result.success ? 'Post publicado com sucesso!' : 'Falha na publicação',
        data: result
      });
    } catch (error) {
      res.status(500).json({
        error: 'Erro ao publicar teste no Instagram',
        code: 'INSTAGRAM_POST_ERROR',
        details: error.message
      });
    }
  }
);

// Logout do Instagram (apenas ADMIN)
router.post('/instagram/logout',
  requireRole(['ADMIN']),
  rateLimits.admin,
  async (req, res) => {
    try {
      const instagramService = require('../services/instagramService');
      await instagramService.logout();
      
      res.json({
        success: true,
        message: 'Logout do Instagram realizado com sucesso'
      });
    } catch (error) {
      res.status(500).json({
        error: 'Erro ao fazer logout do Instagram',
        code: 'INSTAGRAM_LOGOUT_ERROR',
        details: error.message
      });
    }
  }
);

// ======= TRATAMENTO DE ERROS =======

// Middleware de tratamento de erros específico para admin routes
router.use((error, req, res, next) => {
  const logger = require('../utils/logger');
  logger.error('Erro nas rotas admin:', error);

  // Erro de CORS
  if (error.message === 'Não permitido pelo CORS') {
    return res.status(403).json({
      error: 'Origem não permitida pelo CORS',
      code: 'CORS_ERROR'
    });
  }

  // Erro de validação do Prisma
  if (error.code && error.code.startsWith('P')) {
    return res.status(400).json({
      error: 'Erro de validação no banco de dados',
      code: 'DATABASE_VALIDATION_ERROR'
    });
  }

  // Erro genérico
  res.status(500).json({
    error: 'Erro interno do servidor',
    code: 'INTERNAL_SERVER_ERROR'
  });
});


module.exports = router;