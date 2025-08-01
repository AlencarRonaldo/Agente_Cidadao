/**
 * Query Optimizer - Utilitários para otimização de queries do banco de dados
 * Implementa estratégias de cache, índices e agregações otimizadas
 */

const prisma = require('../config/database');
const logger = require('./logger');
const adminCacheService = require('../services/adminCacheService');

class QueryOptimizer {
  constructor() {
    this.queryStats = {
      totalQueries: 0,
      cachedQueries: 0,
      slowQueries: 0,
      averageTime: 0
    };
    
    // Templates de queries otimizadas
    this.queryTemplates = {
      dashboardStats: this.createDashboardStatsQuery,
      denunciasList: this.createDenunciasListQuery,
      aggregatedCounts: this.createAggregatedCountsQuery
    };
  }

  /**
   * Executar query com monitoramento de performance
   */
  async executeQuery(queryFn, cacheKey = null, cacheTtl = 300) {
    const startTime = Date.now();
    
    try {
      // Tentar cache primeiro se fornecido
      if (cacheKey) {
        const cachedResult = await adminCacheService.get(cacheKey);
        if (cachedResult) {
          this.queryStats.cachedQueries++;
          logger.debug(`[QUERY] Cache hit: ${cacheKey}`);
          return { ...cachedResult, _fromCache: true };
        }
      }
      
      // Executar query
      const result = await queryFn();
      const executionTime = Date.now() - startTime;
      
      // Atualizar estatísticas
      this.updateQueryStats(executionTime);
      
      // Armazenar em cache se fornecido
      if (cacheKey && result) {
        await adminCacheService.set(cacheKey, result, 'query', cacheTtl);
      }
      
      // Log de queries lentas
      if (executionTime > 1000) {
        logger.warn(`[QUERY] Query lenta: ${executionTime}ms`, {
          cacheKey,
          stackTrace: new Error().stack.split('\n')[2]
        });
      }
      
      return { ...result, _executionTime: executionTime, _fromCache: false };
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      logger.error(`[QUERY] Erro após ${executionTime}ms:`, error);
      throw error;
    }
  }

  /**
   * Atualizar estatísticas de queries
   */
  updateQueryStats(executionTime) {
    this.queryStats.totalQueries++;
    
    if (executionTime > 1000) {
      this.queryStats.slowQueries++;
    }
    
    // Calcular média móvel
    const currentAvg = this.queryStats.averageTime;
    const newAvg = (currentAvg * (this.queryStats.totalQueries - 1) + executionTime) / this.queryStats.totalQueries;
    this.queryStats.averageTime = Math.round(newAvg);
  }

  /**
   * Query otimizada para estatísticas do dashboard
   */
  createDashboardStatsQuery() {
    return async () => {
      // Query agregada única para reduzir round-trips
      const result = await prisma.$queryRaw`
        SELECT 
          COUNT(*) as total_denuncias,
          COUNT(CASE WHEN status = 'PENDENTE_MODERACAO' THEN 1 END) as pendentes,
          COUNT(CASE WHEN status = 'PUBLICADA' THEN 1 END) as publicadas,
          COUNT(CASE WHEN status = 'AGENDADA' THEN 1 END) as agendadas,
          COUNT(CASE WHEN "aprovadaBot" = true THEN 1 END) as aprovadas_bot,
          AVG(CASE WHEN "scoreBot" IS NOT NULL THEN "scoreBot" END) as score_medio,
          COUNT(CASE WHEN "createdAt" >= NOW() - INTERVAL '24 hours' THEN 1 END) as ultimas_24h,
          COUNT(CASE WHEN "createdAt" >= NOW() - INTERVAL '7 days' THEN 1 END) as ultimos_7d
        FROM "Denuncia"
      `;
      
      const stats = result[0];
      
      return {
        totalDenuncias: parseInt(stats.total_denuncias),
        denunciasPendentes: parseInt(stats.pendentes),
        denunciasPublicadas: parseInt(stats.publicadas),
        denunciasAgendadas: parseInt(stats.agendadas),
        aprovadasBot: parseInt(stats.aprovadas_bot),
        scoreMedio: parseFloat(stats.score_medio) || 0,
        ultimas24h: parseInt(stats.ultimas_24h),
        ultimos7d: parseInt(stats.ultimos_7d),
        aprovacaoAutomatica: stats.total_denuncias > 0 
          ? `${Math.round((parseInt(stats.publicadas) / parseInt(stats.total_denuncias)) * 100)}%`
          : '0%'
      };
    };
  }

  /**
   * Query otimizada para top bairros com cache
   */
  async getTopBairros(limit = 5, days = 30) {
    const cacheKey = `top-bairros:${limit}:${days}`;
    
    return await this.executeQuery(async () => {
      const result = await prisma.$queryRaw`
        SELECT 
          bairro,
          COUNT(*) as count,
          COUNT(CASE WHEN status = 'PUBLICADA' THEN 1 END) as publicadas,
          AVG(CASE WHEN "scoreBot" IS NOT NULL THEN "scoreBot" END) as score_medio
        FROM "Denuncia"
        WHERE "createdAt" >= NOW() - INTERVAL '${days} days'
        GROUP BY bairro
        ORDER BY count DESC
        LIMIT ${limit}
      `;
      
      return result.map(item => ({
        bairro: item.bairro,
        count: parseInt(item.count),
        publicadas: parseInt(item.publicadas),
        scoreMedio: parseFloat(item.score_medio) || 0,
        taxaPublicacao: item.count > 0 ? Math.round((parseInt(item.publicadas) / parseInt(item.count)) * 100) : 0
      }));
    }, cacheKey, 300);
  }

  /**
   * Query otimizada para distribuição de status
   */
  async getStatusDistribution() {
    const cacheKey = 'status-distribution';
    
    return await this.executeQuery(async () => {
      const result = await prisma.$queryRaw`
        SELECT 
          status,
          COUNT(*) as count,
          COUNT(CASE WHEN "createdAt" >= NOW() - INTERVAL '24 hours' THEN 1 END) as ultimas_24h
        FROM "Denuncia"
        GROUP BY status
        ORDER BY count DESC
      `;
      
      return result.map(item => ({
        status: item.status,
        count: parseInt(item.count),
        ultimas24h: parseInt(item.ultimas_24h),
        percentual: 0 // Será calculado no frontend
      }));
    }, cacheKey, 180);
  }

  /**
   * Query otimizada para agenda de publicações
   */
  async getAgendaPublicacoes(limit = 10) {
    const cacheKey = `agenda-publicacoes:${limit}`;
    
    return await this.executeQuery(async () => {
      return await prisma.denuncia.findMany({
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
          publishAttempts: true,
          createdAt: true
        },
        orderBy: [
          { priority: 'asc' },
          { scheduledPublishAt: 'asc' }
        ],
        take: limit
      });
    }, cacheKey, 30); // Cache curto para dados em tempo real
  }

  /**
   * Query otimizada para listagem de denúncias com filtros
   */
  createDenunciasListQuery(filters, pagination) {
    return async () => {
      const { where, orderBy } = this.buildWhereClause(filters);
      const { skip, take } = pagination;
      
      // Usar query paralela para count e dados
      const [denuncias, total] = await Promise.all([
        prisma.denuncia.findMany({
          where,
          orderBy,
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
      
      return { denuncias, total };
    };
  }

  /**
   * Construir cláusula WHERE otimizada
   */
  buildWhereClause(filters) {
    const {
      status,
      bairro,
      dataInicio,
      dataFim,
      search,
      orderBy = 'createdAt',
      order = 'desc'
    } = filters;
    
    const where = {};
    
    // Filtros simples
    if (status) where.status = status;
    if (bairro) where.bairro = { contains: bairro, mode: 'insensitive' };
    
    // Filtro de data otimizado
    if (dataInicio || dataFim) {
      where.createdAt = {};
      if (dataInicio) where.createdAt.gte = new Date(dataInicio);
      if (dataFim) where.createdAt.lte = new Date(dataFim);
    }
    
    // Busca textual otimizada
    if (search) {
      where.OR = [
        { texto: { contains: search, mode: 'insensitive' } },
        { protocolo: { contains: search, mode: 'insensitive' } },
        { bairro: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    // Ordenação validada
    const validOrderBy = [
      'createdAt', 'status', 'bairro', 'scoreBot', 'protocolo', 
      'scheduledPublishAt', 'priority', 'publishedAt'
    ];
    const validOrder = ['asc', 'desc'];
    
    const finalOrderBy = validOrderBy.includes(orderBy) ? orderBy : 'createdAt';
    const finalOrder = validOrder.includes(order) ? order : 'desc';
    
    return {
      where,
      orderBy: { [finalOrderBy]: finalOrder }
    };
  }

  /**
   * Query para relatórios otimizada
   */
  async getReportData(type, filters = {}) {
    const cacheKey = `report:${type}:${JSON.stringify(filters).substring(0, 50)}`;
    
    return await this.executeQuery(async () => {
      switch (type) {
        case 'performance':
          return await this.getPerformanceReport(filters);
        case 'bairros':
          return await this.getBairrosReport(filters);
        case 'timeline':
          return await this.getTimelineReport(filters);
        default:
          throw new Error(`Tipo de relatório inválido: ${type}`);
      }
    }, cacheKey, 600); // Cache de 10 minutos para relatórios
  }

  /**
   * Relatório de performance
   */
  async getPerformanceReport(filters) {
    const { dataInicio, dataFim } = filters;
    const whereClause = this.buildDateFilter(dataInicio, dataFim);
    
    const result = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('day', "createdAt") as data,
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'PUBLICADA' THEN 1 END) as publicadas,
        AVG(CASE WHEN "scoreBot" IS NOT NULL THEN "scoreBot" END) as score_medio,
        AVG(CASE WHEN "tempoConversa" IS NOT NULL THEN "tempoConversa" END) as tempo_medio_conversa
      FROM "Denuncia"
      WHERE "createdAt" >= ${dataInicio || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)}
        AND "createdAt" <= ${dataFim || new Date()}
      GROUP BY DATE_TRUNC('day', "createdAt")
      ORDER BY data ASC
    `;
    
    return result.map(item => ({
      data: item.data,
      total: parseInt(item.total),
      publicadas: parseInt(item.publicadas),
      scoreMedio: parseFloat(item.score_medio) || 0,
      tempoMedioConversa: parseFloat(item.tempo_medio_conversa) || 0,
      taxaPublicacao: item.total > 0 ? Math.round((parseInt(item.publicadas) / parseInt(item.total)) * 100) : 0
    }));
  }

  /**
   * Relatório por bairros
   */
  async getBairrosReport(filters) {
    const { dataInicio, dataFim, limit = 20 } = filters;
    
    const result = await prisma.$queryRaw`
      SELECT 
        bairro,
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'PUBLICADA' THEN 1 END) as publicadas,
        COUNT(CASE WHEN status = 'REJEITADA_ADMIN' THEN 1 END) as rejeitadas,
        AVG(CASE WHEN "scoreBot" IS NOT NULL THEN "scoreBot" END) as score_medio
      FROM "Denuncia"
      WHERE "createdAt" >= ${dataInicio || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)}
        AND "createdAt" <= ${dataFim || new Date()}
      GROUP BY bairro
      ORDER BY total DESC
      LIMIT ${limit}
    `;
    
    return result.map(item => ({
      bairro: item.bairro,
      total: parseInt(item.total),
      publicadas: parseInt(item.publicadas),
      rejeitadas: parseInt(item.rejeitadas),
      scoreMedio: parseFloat(item.score_medio) || 0,
      taxaPublicacao: item.total > 0 ? Math.round((parseInt(item.publicadas) / parseInt(item.total)) * 100) : 0
    }));
  }

  /**
   * Relatório de timeline
   */
  async getTimelineReport(filters) {
    const { dataInicio, dataFim, intervalo = 'day' } = filters;
    const truncFunction = intervalo === 'hour' ? 'hour' : 'day';
    
    const result = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('${truncFunction}', "createdAt") as periodo,
        COUNT(*) as total,
        COUNT(CASE WHEN "aprovadaBot" = true THEN 1 END) as aprovadas_bot,
        COUNT(CASE WHEN status = 'PUBLICADA' THEN 1 END) as publicadas
      FROM "Denuncia"
      WHERE "createdAt" >= ${dataInicio || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)}
        AND "createdAt" <= ${dataFim || new Date()}
      GROUP BY DATE_TRUNC('${truncFunction}', "createdAt")
      ORDER BY periodo ASC
    `;
    
    return result.map(item => ({
      periodo: item.periodo,
      total: parseInt(item.total),
      aprovadasBot: parseInt(item.aprovadas_bot),
      publicadas: parseInt(item.publicadas)
    }));
  }

  /**
   * Construir filtro de data
   */
  buildDateFilter(dataInicio, dataFim) {
    const where = {};
    if (dataInicio || dataFim) {
      where.createdAt = {};
      if (dataInicio) where.createdAt.gte = new Date(dataInicio);
      if (dataFim) where.createdAt.lte = new Date(dataFim);
    }
    return where;
  }

  /**
   * Otimizar índices do banco (execução manual)
   */
  async optimizeIndexes() {
    try {
      logger.info('[QUERY] Iniciando otimização de índices...');
      
      // Verificar e criar índices necessários
      const indexQueries = [
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_denuncia_status_created ON "Denuncia" (status, "createdAt" DESC)',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_denuncia_bairro_status ON "Denuncia" (bairro, status)',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_denuncia_scheduled_priority ON "Denuncia" ("scheduledPublishAt", priority) WHERE status = \'AGENDADA\'',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_denuncia_phone_created ON "Denuncia" ("phoneNumber", "createdAt" DESC)',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_denuncia_admin_reviewed ON "Denuncia" ("adminUserId", "reviewedAt") WHERE "reviewedAt" IS NOT NULL'
      ];
      
      for (const query of indexQueries) {
        try {
          await prisma.$executeRawUnsafe(query);
          logger.info(`[QUERY] Índice criado: ${query.substring(0, 100)}...`);
        } catch (error) {
          if (!error.message.includes('already exists')) {
            logger.warn(`[QUERY] Erro ao criar índice: ${error.message}`);
          }
        }
      }
      
      logger.info('[QUERY] Otimização de índices concluída');
      return true;
    } catch (error) {
      logger.error('[QUERY] Erro na otimização de índices:', error);
      return false;
    }
  }

  /**
   * Obter estatísticas do otimizador
   */
  getStats() {
    const hitRate = this.queryStats.totalQueries > 0 
      ? ((this.queryStats.cachedQueries / this.queryStats.totalQueries) * 100).toFixed(2)
      : 0;
    
    const slowQueryRate = this.queryStats.totalQueries > 0
      ? ((this.queryStats.slowQueries / this.queryStats.totalQueries) * 100).toFixed(2)
      : 0;
    
    return {
      ...this.queryStats,
      hitRate: `${hitRate}%`,
      slowQueryRate: `${slowQueryRate}%`,
      cacheService: adminCacheService.getStats(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Resetar estatísticas
   */
  resetStats() {
    this.queryStats = {
      totalQueries: 0,
      cachedQueries: 0,
      slowQueries: 0,
      averageTime: 0
    };
    logger.info('[QUERY] Estatísticas resetadas');
  }
}

// Singleton instance
const queryOptimizer = new QueryOptimizer();

module.exports = queryOptimizer;