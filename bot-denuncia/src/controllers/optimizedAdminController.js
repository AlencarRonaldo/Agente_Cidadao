/**
 * Optimized Admin Controller - Versão otimizada com cache inteligente e queries performantes
 * Implementa estratégias avançadas de performance e escalabilidade
 */

const prisma = require('../config/database');
const logger = require('../utils/logger');
const adminCacheService = require('../services/adminCacheService');
const { addPublishJob } = require('../workers/publishWorker');
const instagramService = require('../services/instagramService');
const EventEmitter = require('events');

class OptimizedAdminController extends EventEmitter {
  constructor() {
    super();
    this.performanceMetrics = {
      queryTimes: [],
      cacheHits: 0,
      cacheMisses: 0
    };
    
    // Índices de performance para queries otimizadas
    this.queryOptimizations = {
      dashboard: {
        useAggregation: true,
        batchQueries: true,
        cacheResults: true
      }
    };
  }

  /**
   * Dashboard otimizado com cache inteligente e queries paralelas
   */
  async getDashboard(req, res) {
    const startTime = Date.now();
    const userId = req.user?.id;
    
    try {
      logger.info(`[ADMIN] Dashboard solicitado por ${req.user?.email}`);
      
      // Usar cache com fallback para dados em tempo real
      const dashboardData = await this.getCachedDashboardData();
      
      const responseTime = Date.now() - startTime;
      this.performanceMetrics.queryTimes.push(responseTime);
      
      // Log de performance
      if (responseTime > 1000) {
        logger.warn(`[ADMIN] Dashboard lento: ${responseTime}ms`);
      } else {
        logger.info(`[ADMIN] Dashboard carregado em ${responseTime}ms`);
      }
      
      res.json({
        success: true,
        message: 'Dashboard carregado com sucesso',
        data: dashboardData,
        meta: {
          responseTime,
          cached: dashboardData._cached || false,
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      logger.error('[ADMIN] Erro ao buscar dashboard:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        code: 'DASHBOARD_ERROR',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Obter dados do dashboard com cache inteligente
   */
  async getCachedDashboardData() {
    const cacheKey = 'dashboard:main';
    
    return await adminCacheService.getOrSet(
      cacheKey,
      () => this.fetchDashboardData(),
      'dashboard.summary'
    );
  }

  /**
   * Buscar dados do dashboard com queries otimizadas
   */
  async fetchDashboardData() {
    const startTime = Date.now();
    
    try {
      // Queries paralelas otimizadas com agregação
      const [dashboardStats, topBairros, statusDistribution, agendaPostagens] = await Promise.all([
        this.getDashboardStats(),
        this.getTopBairros(),
        this.getStatusDistribution(), 
        this.getAgendaPostagens()
      ]);
      
      const queryTime = Date.now() - startTime;
      logger.info(`[ADMIN] Queries do dashboard executadas em ${queryTime}ms`);
      
      return {
        resumo: dashboardStats,
        topBairros,
        statusDistribuicao: statusDistribution,
        agendaPostagens,
        filaPublicacao: await this.getFilaStatus(),
        _cached: false,
        _queryTime: queryTime
      };
      
    } catch (error) {
      logger.error('[ADMIN] Erro ao buscar dados do dashboard:', error);
      throw error;
    }
  }

  /**
   * Estatísticas do dashboard com query otimizada
   */
  async getDashboardStats() {
    // Usar cache para dados que mudam menos frequentemente
    const cacheKey = 'dashboard:stats';
    
    return await adminCacheService.getOrSet(
      cacheKey,
      async () => {
        // Query agregada única para otimizar performance
        const stats = await prisma.denuncia.aggregate({
          _count: {
            id: true,
            _all: true
          },
          where: {}
        });
        
        // Contadores por status em paralelo
        const [pendentes, publicadas, agendadas] = await Promise.all([
          prisma.denuncia.count({ where: { status: 'PENDENTE_MODERACAO' } }),
          prisma.denuncia.count({ where: { status: 'PUBLICADA' } }),
          prisma.denuncia.count({ where: { status: 'AGENDADA' } })
        ]);
        
        const total = stats._count.id;
        const aprovacaoAutomatica = total > 0 ? Math.round((publicadas / total) * 100) : 0;
        
        return {
          totalDenuncias: total,
          denunciasPendentes: pendentes,
          denunciasPublicadas: publicadas,
          denunciasAgendadas: agendadas,
          aprovacaoAutomatica: `${aprovacaoAutomatica}%`
        };
      },
      'dashboard.summary',
      60 // TTL de 1 minuto
    );
  }

  /**
   * Top bairros com cache de médio prazo
   */
  async getTopBairros() {
    const cacheKey = 'dashboard:top-bairros';
    
    return await adminCacheService.getOrSet(
      cacheKey,
      async () => {
        const result = await prisma.denuncia.groupBy({
          by: ['bairro'],
          _count: { bairro: true },
          orderBy: { _count: { bairro: 'desc' } },
          take: 5,
          where: {
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Últimos 30 dias
            }
          }
        });
        
        return result.map(item => ({
          bairro: item.bairro,
          count: item._count.bairro
        }));
      },
      'dashboard.topBairros',
      300 // TTL de 5 minutos
    );
  }

  /**
   * Distribuição de status com cache
   */
  async getStatusDistribution() {
    const cacheKey = 'dashboard:status-distribution';
    
    return await adminCacheService.getOrSet(
      cacheKey,
      async () => {
        const result = await prisma.denuncia.groupBy({
          by: ['status'],
          _count: { status: true },
          orderBy: { _count: { status: 'desc' } }
        });
        
        return result.map(item => ({
          status: item.status,
          count: item._count.status
        }));
      },
      'dashboard.statusDist',
      180 // TTL de 3 minutos
    );
  }

  /**
   * Agenda de postagens com refresh frequente
   */
  async getAgendaPostagens() {
    const cacheKey = 'agenda:upcoming';
    
    return await adminCacheService.getOrSet(
      cacheKey,
      async () => {
        const result = await prisma.denuncia.findMany({
          where: {
            status: 'AGENDADA',
            scheduledPublishAt: {
              gte: new Date()
            }
          },
          select: {
            id: true,
            protocolo: true,
            texto: true,
            bairro: true,
            scheduledPublishAt: true,
            priority: true,
            createdAt: true
          },
          orderBy: {
            scheduledPublishAt: 'asc'
          },
          take: 10
        });
        
        return result.map(post => ({
          id: post.id,
          protocolo: post.protocolo,
          texto: post.texto.substring(0, 100) + (post.texto.length > 100 ? '...' : ''),
          bairro: post.bairro,
          scheduledPublishAt: post.scheduledPublishAt,
          priority: post.priority,
          createdAt: post.createdAt
        }));
      },
      'agenda.upcoming',
      30 // TTL de 30 segundos para dados em tempo real
    );
  }

  /**
   * Status da fila de publicação
   */
  async getFilaStatus() {
    const cacheKey = 'dashboard:fila-status';
    
    return await adminCacheService.getOrSet(
      cacheKey,
      async () => {
        const [agendadas, publicadas, erros] = await Promise.all([
          prisma.denuncia.count({ where: { status: 'AGENDADA' } }),
          prisma.denuncia.count({ where: { status: 'PUBLICADA' } }),
          prisma.denuncia.count({ where: { status: 'ERRO_PUBLICACAO' } })
        ]);
        
        return {
          waiting: agendadas,
          active: 0, // Será obtido da fila Redis
          completed: publicadas,
          failed: erros
        };
      },
      'dashboard.filaStatus',
      30 // TTL de 30 segundos
    );
  }

  /**
   * Endpoint separado para agenda com refresh mais frequente
   */
  async getAgenda(req, res) {
    try {
      const { limit = 20, priority } = req.query;
      
      const agendaData = await this.getDetailedAgenda(limit, priority);
      
      res.json({
        success: true,
        data: agendaData,
        meta: {
          timestamp: new Date().toISOString(),
          refreshRate: '30s'
        }
      });
      
    } catch (error) {
      logger.error('[ADMIN] Erro ao buscar agenda:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao buscar agenda',
        code: 'AGENDA_ERROR'
      });
    }
  }

  /**
   * Agenda detalhada com filtros
   */
  async getDetailedAgenda(limit = 20, priority = null) {
    const cacheKey = `agenda:detailed:${limit}:${priority || 'all'}`;
    
    return await adminCacheService.getOrSet(
      cacheKey,
      async () => {
        const where = {
          status: 'AGENDADA',
          scheduledPublishAt: {
            gte: new Date()
          }
        };
        
        if (priority) {
          where.priority = parseInt(priority);
        }
        
        const result = await prisma.denuncia.findMany({
          where,
          select: {
            id: true,
            protocolo: true,
            texto: true,
            bairro: true,
            scheduledPublishAt: true,
            priority: true,
            publishAttempts: true,
            createdAt: true,
            instagramPostId: true
          },
          orderBy: [
            { priority: 'asc' },
            { scheduledPublishAt: 'asc' }
          ],
          take: parseInt(limit)
        });
        
        return result.map(item => ({
          ...item,
          timeToPublish: Math.ceil((item.scheduledPublishAt.getTime() - Date.now()) / (1000 * 60)), // minutos
          texto: item.texto.substring(0, 150) + (item.texto.length > 150 ? '...' : '')
        }));
      },
      'agenda.detailed',
      30 // TTL de 30 segundos
    );
  }

  /**
   * Listar denúncias com cache e otimizações de query
   */
  async listarDenuncias(req, res) {
    const startTime = Date.now();
    
    try {
      const {
        page = 1,
        limit = 20,
        status,
        bairro,
        dataInicio,
        dataFim,
        search,
        orderBy = 'createdAt',
        order = 'desc'
      } = req.query;
      
      // Gerar chave de cache baseada nos parâmetros
      const cacheKey = this.generateListCacheKey(req.query);
      
      const result = await adminCacheService.getOrSet(
        cacheKey,
        () => this.fetchDenunciasList(req.query),
        'list.denuncias',
        120 // TTL de 2 minutos para listas
      );
      
      const responseTime = Date.now() - startTime;
      
      res.json({
        success: true,
        data: result.denuncias,
        pagination: result.pagination,
        filters: result.filters,
        meta: {
          responseTime,
          cached: result._cached || false
        }
      });
      
    } catch (error) {
      logger.error('[ADMIN] Erro ao listar denúncias:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        code: 'LIST_ERROR'
      });
    }
  }

  /**
   * Gerar chave de cache para listagem
   */
  generateListCacheKey(params) {
    const keyParts = ['list', 'denuncias'];
    
    Object.keys(params).sort().forEach(key => {
      if (params[key]) {
        keyParts.push(`${key}:${params[key]}`);
      }
    });
    
    return keyParts.join(':');
  }

  /**
   * Buscar lista de denúncias otimizada
   */
  async fetchDenunciasList(params) {
    const {
      page = 1,
      limit = 20,
      status,
      bairro,
      dataInicio,
      dataFim,
      search,
      orderBy = 'createdAt',
      order = 'desc'
    } = params;
    
    // Construir filtros otimizados
    const where = {};
    
    if (status) where.status = status;
    if (bairro) where.bairro = { contains: bairro, mode: 'insensitive' };
    
    if (dataInicio || dataFim) {
      where.createdAt = {};
      if (dataInicio) where.createdAt.gte = new Date(dataInicio);
      if (dataFim) where.createdAt.lte = new Date(dataFim);
    }
    
    if (search) {
      where.OR = [
        { texto: { contains: search, mode: 'insensitive' } },
        { protocolo: { contains: search, mode: 'insensitive' } },
        { bairro: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    // Validação de ordenação
    const validOrderBy = ['createdAt', 'status', 'bairro', 'scoreBot', 'protocolo', 'scheduledPublishAt'];
    const validOrder = ['asc', 'desc'];
    
    const finalOrderBy = validOrderBy.includes(orderBy) ? orderBy : 'createdAt';
    const finalOrder = validOrder.includes(order) ? order : 'desc';
    
    // Paginação
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    
    // Queries paralelas otimizadas
    const [denuncias, total] = await Promise.all([
      prisma.denuncia.findMany({
        where,
        orderBy: { [finalOrderBy]: finalOrder },
        skip,
        take,
        select: {
          id: true,
          protocolo: true,
          texto: true,
          textoFiltrado: true,
          endereco: true,
          bairro: true,
          imagemUrl: true,
          status: true,
          vereadores: true,
          scoreBot: true,
          aprovadaBot: true,
          aprovadaAdmin: true,
          motivoRejeicaoBot: true,
          motivoRejeicaoAdmin: true,
          editadaPorAdmin: true,
          observacoesAdmin: true,
          createdAt: true,
          processedAt: true,
          reviewedAt: true,
          publishedAt: true,
          phoneNumber: true,
          adminUserId: true,
          scheduledPublishAt: true,
          priority: true,
          instagramPostId: true,
          publishAttempts: true
        }
      }),
      prisma.denuncia.count({ where })
    ]);
    
    // Calcular metadata de paginação
    const totalPages = Math.ceil(total / take);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;
    
    return {
      denuncias,
      pagination: {
        page: parseInt(page),
        limit: take,
        total,
        totalPages,
        hasNext,
        hasPrev
      },
      filters: {
        status,
        bairro,
        dataInicio,
        dataFim,
        search,
        orderBy: finalOrderBy,
        order: finalOrder
      },
      _cached: false
    };
  }

  /**
   * Aprovar denúncia com invalidação de cache
   */
  async aprovarDenuncia(req, res) {
    try {
      const { id } = req.params;
      const { observacoes } = req.body;
      const adminUserId = req.user.id;
      
      // Verificar existência
      const denuncia = await prisma.denuncia.findUnique({
        where: { id }
      });
      
      if (!denuncia) {
        return res.status(404).json({
          success: false,
          error: 'Denúncia não encontrada',
          code: 'DENUNCIA_NOT_FOUND'
        });
      }
      
      if (!['PENDENTE_MODERACAO', 'RECEBIDA', 'PROCESSANDO'].includes(denuncia.status)) {
        return res.status(400).json({
          success: false,
          error: 'Denúncia não pode ser aprovada neste status',
          code: 'INVALID_STATUS_FOR_APPROVAL'
        });
      }
      
      // Atualizar denúncia
      const denunciaAtualizada = await prisma.denuncia.update({
        where: { id },
        data: {
          status: 'APROVADA_ADMIN',
          aprovadaAdmin: true,
          observacoesAdmin: observacoes,
          reviewedAt: new Date(),
          adminUserId
        }
      });
      
      // Agendar publicação
      const PublicationScheduler = require('../services/publicationScheduler');
      const scheduler = new PublicationScheduler();
      
      const schedulingResult = await scheduler.schedulePublication(id, 1);
      
      if (schedulingResult.success) {
        logger.info(`[📅] Publicação agendada para ${schedulingResult.scheduledTime.toLocaleString('pt-BR')}`);
      } else {
        logger.warn(`[⚠️] Falha no agendamento, usando fila tradicional`);
        await addPublishJob(id, {
          source: 'admin_approval',
          priority: 1,
          delay: 0,
          attempts: 3
        });
      }
      
      // Invalidar cache relacionado
      await this.invalidateRelatedCache('denuncia:approved', { id, status: 'APROVADA_ADMIN' });
      
      logger.info(`Denúncia ${denuncia.protocolo} aprovada pelo admin ${req.user.email}`);
      
      res.json({
        success: true,
        message: 'Denúncia aprovada com sucesso',
        data: denunciaAtualizada
      });
      
    } catch (error) {
      logger.error('[ADMIN] Erro ao aprovar denúncia:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        code: 'APPROVAL_ERROR'
      });
    }
  }

  /**
   * Invalidar cache relacionado após operações
   */
  async invalidateRelatedCache(event, data = {}) {
    try {
      await adminCacheService.invalidateByEvent(event, data);
      
      // Emitir evento para atualizações em tempo real
      this.emit('cache:invalidated', { event, data });
      
    } catch (error) {
      logger.error('[ADMIN] Erro ao invalidar cache:', error);
    }
  }

  /**
   * Rejeitar denúncia com invalidação de cache
   */
  async rejeitarDenuncia(req, res) {
    try {
      const { id } = req.params;
      const { motivo, observacoes } = req.body;
      const adminUserId = req.user.id;
      
      if (!motivo) {
        return res.status(400).json({
          success: false,
          error: 'Motivo da rejeição é obrigatório',
          code: 'MISSING_REJECTION_REASON'
        });
      }
      
      const denuncia = await prisma.denuncia.findUnique({
        where: { id }
      });
      
      if (!denuncia) {
        return res.status(404).json({
          success: false,
          error: 'Denúncia não encontrada',
          code: 'DENUNCIA_NOT_FOUND'
        });
      }
      
      const denunciaAtualizada = await prisma.denuncia.update({
        where: { id },
        data: {
          status: 'REJEITADA_ADMIN',
          aprovadaAdmin: false,
          motivoRejeicaoAdmin: motivo,
          observacoesAdmin: observacoes,
          reviewedAt: new Date(),
          adminUserId
        }
      });
      
      // Invalidar cache
      await this.invalidateRelatedCache('denuncia:rejected', { id, status: 'REJEITADA_ADMIN' });
      
      logger.info(`Denúncia ${denuncia.protocolo} rejeitada pelo admin ${req.user.email}. Motivo: ${motivo}`);
      
      res.json({
        success: true,
        message: 'Denúncia rejeitada com sucesso',
        data: denunciaAtualizada
      });
      
    } catch (error) {
      logger.error('[ADMIN] Erro ao rejeitar denúncia:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        code: 'REJECTION_ERROR'
      });
    }
  }

  /**
   * Obter métricas de performance
   */
  async getPerformanceMetrics(req, res) {
    try {
      const cacheStats = adminCacheService.getStats();
      const avgQueryTime = this.performanceMetrics.queryTimes.length > 0 
        ? this.performanceMetrics.queryTimes.reduce((a, b) => a + b, 0) / this.performanceMetrics.queryTimes.length
        : 0;
      
      res.json({
        success: true,
        data: {
          cache: cacheStats,
          queries: {
            averageTime: Math.round(avgQueryTime),
            count: this.performanceMetrics.queryTimes.length,
            slowQueries: this.performanceMetrics.queryTimes.filter(t => t > 1000).length
          },
          system: {
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            timestamp: new Date().toISOString()
          }
        }
      });
      
    } catch (error) {
      logger.error('[ADMIN] Erro ao obter métricas:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao obter métricas',
        code: 'METRICS_ERROR'
      });
    }
  }

  /**
   * Forçar atualização de cache
   */
  async refreshCache(req, res) {
    try {
      const { type = 'all' } = req.query;
      
      if (type === 'all' || type === 'dashboard') {
        await adminCacheService.invalidate('dashboard:*');
      }
      
      if (type === 'all' || type === 'agenda') {
        await adminCacheService.invalidate('agenda:*');
      }
      
      if (type === 'all' || type === 'lists') {
        await adminCacheService.invalidate('list:*');
      }
      
      logger.info(`[ADMIN] Cache ${type} invalidado por ${req.user.email}`);
      
      res.json({
        success: true,
        message: `Cache ${type} invalidado com sucesso`,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      logger.error('[ADMIN] Erro ao invalidar cache:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao invalidar cache',
        code: 'CACHE_REFRESH_ERROR'
      });
    }
  }

  /**
   * Health check do controller otimizado
   */
  async healthCheck(req, res) {
    try {
      const cacheHealth = await adminCacheService.healthCheck();
      const avgQueryTime = this.performanceMetrics.queryTimes.length > 0 
        ? this.performanceMetrics.queryTimes.reduce((a, b) => a + b, 0) / this.performanceMetrics.queryTimes.length
        : 0;
      
      const health = {
        healthy: cacheHealth.healthy && avgQueryTime < 2000,
        cache: cacheHealth,
        performance: {
          averageQueryTime: Math.round(avgQueryTime),
          totalQueries: this.performanceMetrics.queryTimes.length,
          slowQueries: this.performanceMetrics.queryTimes.filter(t => t > 1000).length
        },
        timestamp: new Date().toISOString()
      };
      
      res.json(health);
      
    } catch (error) {
      logger.error('[ADMIN] Erro no health check:', error);
      res.status(500).json({
        healthy: false,
        error: error.message
      });
    }
  }
}

module.exports = new OptimizedAdminController();