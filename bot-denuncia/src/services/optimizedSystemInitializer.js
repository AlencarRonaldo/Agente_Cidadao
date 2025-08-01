/**
 * Optimized System Initializer - Inicializador para todos os serviços otimizados
 * Configura cache, rate limiting, WebSocket e otimizações de banco
 */

const logger = require('../utils/logger');
const adminCacheService = require('./adminCacheService');
const realtimeAdminService = require('./realtimeAdminService');
const queryOptimizer = require('../utils/queryOptimizer');
const queueManager = require('../queues/queueManager');
const { cleanupRateLimitData } = require('../middleware/rateLimiter');

class OptimizedSystemInitializer {
  constructor() {
    this.services = {
      cache: { name: 'Admin Cache Service', initialized: false },
      realtime: { name: 'Realtime Admin Service', initialized: false },
      queryOptimizer: { name: 'Query Optimizer', initialized: false },
      queueManager: { name: 'Queue Manager', initialized: false },
      rateLimit: { name: 'Rate Limit Cleanup', initialized: false }
    };
    
    this.healthChecks = [];
    this.shutdownHandlers = [];
  }

  /**
   * Inicializar todos os serviços otimizados
   */
  async initialize(server = null) {
    logger.info('[SYSTEM] Iniciando sistema otimizado...');
    
    try {
      // 1. Inicializar Cache Service
      await this.initializeCacheService();
      
      // 2. Inicializar Queue Manager
      await this.initializeQueueManager();
      
      // 3. Inicializar Query Optimizer
      await this.initializeQueryOptimizer();
      
      // 4. Inicializar Rate Limit Cleanup
      await this.initializeRateLimitCleanup();
      
      // 5. Inicializar Realtime Service (se servidor fornecido)
      if (server) {
        await this.initializeRealtimeService(server);
      }
      
      // 6. Configurar health checks
      this.setupHealthChecks();
      
      // 7. Configurar shutdown handlers
      this.setupShutdownHandlers();
      
      // 8. Configurar limpeza automática
      this.setupAutomaticCleanup();
      
      logger.info('[SYSTEM] Sistema otimizado inicializado com sucesso!');
      this.logInitializationSummary();
      
      return true;
      
    } catch (error) {
      logger.error('[SYSTEM] Falha na inicialização do sistema otimizado:', error);
      throw error;
    }
  }

  /**
   * Inicializar Cache Service
   */
  async initializeCacheService() {
    try {
      logger.info('[SYSTEM] Inicializando Admin Cache Service...');
      
      await adminCacheService.initialize();
      this.services.cache.initialized = true;
      
      // Configurar listeners de eventos
      adminCacheService.on('cache:invalidated', (data) => {
        logger.debug(`[CACHE] Cache invalidado: ${data.pattern}`);
      });
      
      this.healthChecks.push({
        name: 'cache',
        check: () => adminCacheService.healthCheck()
      });
      
      this.shutdownHandlers.push({
        name: 'cache',
        handler: () => adminCacheService.shutdown()
      });
      
      logger.info('[SYSTEM] ✓ Admin Cache Service inicializado');
      
    } catch (error) {
      logger.error('[SYSTEM] Erro ao inicializar Cache Service:', error);
      throw error;
    }
  }

  /**
   * Inicializar Queue Manager
   */
  async initializeQueueManager() {
    try {
      logger.info('[SYSTEM] Inicializando Queue Manager...');
      
      if (!queueManager.isInitialized) {
        await queueManager.initialize();
      }
      
      this.services.queueManager.initialized = true;
      
      this.healthChecks.push({
        name: 'queues',
        check: () => queueManager.healthCheck()
      });
      
      this.shutdownHandlers.push({
        name: 'queues',
        handler: () => queueManager.shutdown()
      });
      
      logger.info('[SYSTEM] ✓ Queue Manager inicializado');
      
    } catch (error) {
      logger.error('[SYSTEM] Erro ao inicializar Queue Manager:', error);
      throw error;
    }
  }

  /**
   * Inicializar Query Optimizer
   */
  async initializeQueryOptimizer() {
    try {
      logger.info('[SYSTEM] Inicializando Query Optimizer...');
      
      // Resetar estatísticas
      queryOptimizer.resetStats();
      
      // Executar otimização de índices em background
      setImmediate(async () => {
        try {
          await queryOptimizer.optimizeIndexes();
        } catch (error) {
          logger.warn('[SYSTEM] Erro na otimização de índices:', error);
        }
      });
      
      this.services.queryOptimizer.initialized = true;
      
      this.healthChecks.push({
        name: 'queries',
        check: () => {
          const stats = queryOptimizer.getStats();
          return {
            healthy: stats.averageTime < 2000,
            stats
          };
        }
      });
      
      logger.info('[SYSTEM] ✓ Query Optimizer inicializado');
      
    } catch (error) {
      logger.error('[SYSTEM] Erro ao inicializar Query Optimizer:', error);
      throw error;
    }
  }

  /**
   * Inicializar Rate Limit Cleanup
   */
  async initializeRateLimitCleanup() {
    try {
      logger.info('[SYSTEM] Configurando Rate Limit Cleanup...');
      
      // Executar limpeza inicial
      await cleanupRateLimitData();
      
      // Configurar limpeza periódica
      setInterval(async () => {
        try {
          await cleanupRateLimitData();
        } catch (error) {
          logger.error('[SYSTEM] Erro na limpeza de rate limit:', error);
        }
      }, 2 * 60 * 60 * 1000); // A cada 2 horas
      
      this.services.rateLimit.initialized = true;
      
      logger.info('[SYSTEM] ✓ Rate Limit Cleanup configurado');
      
    } catch (error) {
      logger.error('[SYSTEM] Erro ao configurar Rate Limit Cleanup:', error);
      throw error;
    }
  }

  /**
   * Inicializar Realtime Service
   */
  async initializeRealtimeService(server) {
    try {
      logger.info('[SYSTEM] Inicializando Realtime Admin Service...');
      
      await realtimeAdminService.initialize(server);
      
      // Conectar eventos de cache com WebSocket
      adminCacheService.on('cache:invalidated', (data) => {
        realtimeAdminService.broadcastCacheUpdate(data);
      });
      
      this.services.realtime.initialized = true;
      
      this.healthChecks.push({
        name: 'realtime',
        check: () => {
          const stats = realtimeAdminService.getStats();
          return {
            healthy: stats.activeConnections >= 0,
            stats
          };
        }
      });
      
      this.shutdownHandlers.push({
        name: 'realtime',
        handler: () => realtimeAdminService.shutdown()
      });
      
      logger.info('[SYSTEM] ✓ Realtime Admin Service inicializado');
      
    } catch (error) {
      logger.error('[SYSTEM] Erro ao inicializar Realtime Service:', error);
      // Não falhar a inicialização se WebSocket falhar
      logger.warn('[SYSTEM] Continuando sem WebSocket...');
    }
  }

  /**
   * Configurar health checks
   */
  setupHealthChecks() {
    logger.info('[SYSTEM] Configurando health checks...');
    
    // Health check interval
    setInterval(async () => {
      try {
        const results = await this.runHealthChecks();
        const unhealthy = results.filter(r => !r.healthy);
        
        if (unhealthy.length > 0) {
          logger.warn('[HEALTH] Serviços com problemas:', unhealthy.map(r => r.name));
        }
      } catch (error) {
        logger.error('[HEALTH] Erro no health check:', error);
      }
    }, 5 * 60 * 1000); // A cada 5 minutos
    
    logger.info('[SYSTEM] ✓ Health checks configurados');
  }

  /**
   * Configurar shutdown handlers
   */
  setupShutdownHandlers() {
    logger.info('[SYSTEM] Configurando shutdown handlers...');
    
    const gracefulShutdown = async (signal) => {
      logger.info(`[SYSTEM] Recebido sinal ${signal}, iniciando shutdown graceful...`);
      
      try {
        // Executar handlers em ordem reversa
        for (const handler of this.shutdownHandlers.reverse()) {
          try {
            logger.info(`[SYSTEM] Finalizando ${handler.name}...`);
            await handler.handler();
            logger.info(`[SYSTEM] ✓ ${handler.name} finalizado`);
          } catch (error) {
            logger.error(`[SYSTEM] Erro ao finalizar ${handler.name}:`, error);
          }
        }
        
        logger.info('[SYSTEM] Shutdown graceful concluído');
        process.exit(0);
        
      } catch (error) {
        logger.error('[SYSTEM] Erro durante shutdown:', error);
        process.exit(1);
      }
    };
    
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    // Tratamento de erros não capturados
    process.on('uncaughtException', (error) => {
      logger.error('[SYSTEM] Erro não capturado:', error);
      gracefulShutdown('uncaughtException');
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('[SYSTEM] Promise rejeitada não tratada:', reason);
      gracefulShutdown('unhandledRejection');
    });
    
    logger.info('[SYSTEM] ✓ Shutdown handlers configurados');
  }

  /**
   * Configurar limpeza automática
   */
  setupAutomaticCleanup() {
    logger.info('[SYSTEM] Configurando limpeza automática...');
    
    // Limpeza diária às 3:00
    const scheduleDailyCleanup = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(3, 0, 0, 0);
      
      const msUntilCleanup = tomorrow.getTime() - now.getTime();
      
      setTimeout(() => {
        this.runDailyCleanup();
        // Reagendar para o próximo dia
        setInterval(() => this.runDailyCleanup(), 24 * 60 * 60 * 1000);
      }, msUntilCleanup);
    };
    
    scheduleDailyCleanup();
    
    // Limpeza de memória a cada hora
    setInterval(() => {
      if (global.gc) {
        global.gc();
        logger.debug('[SYSTEM] Garbage collection executado');
      }
    }, 60 * 60 * 1000);
    
    logger.info('[SYSTEM] ✓ Limpeza automática configurada');
  }

  /**
   * Executar limpeza diária
   */
  async runDailyCleanup() {
    logger.info('[SYSTEM] Iniciando limpeza diária...');
    
    try {
      // Limpeza de cache expirado
      // (Redis já faz isso automaticamente, mas é bom garantir)
      
      // Limpeza de rate limit
      await cleanupRateLimitData();
      
      // Resetar estatísticas se muito grandes
      const queryStats = queryOptimizer.getStats();
      if (queryStats.totalQueries > 10000) {
        queryOptimizer.resetStats();
        logger.info('[SYSTEM] Estatísticas de query resetadas');
      }
      
      if (adminCacheService.cacheStats.hits + adminCacheService.cacheStats.misses > 10000) {
        adminCacheService.resetStats();
        logger.info('[SYSTEM] Estatísticas de cache resetadas');
      }
      
      logger.info('[SYSTEM] Limpeza diária concluída');
      
    } catch (error) {
      logger.error('[SYSTEM] Erro na limpeza diária:', error);
    }
  }

  /**
   * Executar health checks de todos os serviços
   */
  async runHealthChecks() {
    const results = [];
    
    for (const healthCheck of this.healthChecks) {
      try {
        const result = await healthCheck.check();
        results.push({
          name: healthCheck.name,
          healthy: result.healthy !== false,
          ...result
        });
      } catch (error) {
        results.push({
          name: healthCheck.name,
          healthy: false,
          error: error.message
        });
      }
    }
    
    return results;
  }

  /**
   * Obter status de todos os serviços
   */
  async getSystemStatus() {
    const healthResults = await this.runHealthChecks();
    
    return {
      services: this.services,
      health: healthResults,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Log do resumo de inicialização
   */
  logInitializationSummary() {
    const initializedServices = Object.entries(this.services)
      .filter(([_, service]) => service.initialized)
      .map(([key, service]) => service.name);
    
    const failedServices = Object.entries(this.services)
      .filter(([_, service]) => !service.initialized)
      .map(([key, service]) => service.name);
    
    logger.info('[SYSTEM] ='.repeat(50));
    logger.info('[SYSTEM] RESUMO DA INICIALIZAÇÃO');
    logger.info('[SYSTEM] ='.repeat(50));
    logger.info(`[SYSTEM] Serviços inicializados: ${initializedServices.length}`);
    initializedServices.forEach(service => {
      logger.info(`[SYSTEM] ✓ ${service}`);
    });
    
    if (failedServices.length > 0) {
      logger.warn(`[SYSTEM] Serviços com falha: ${failedServices.length}`);
      failedServices.forEach(service => {
        logger.warn(`[SYSTEM] ✗ ${service}`);
      });
    }
    
    logger.info('[SYSTEM] Health checks configurados: ' + this.healthChecks.length);
    logger.info('[SYSTEM] Shutdown handlers configurados: ' + this.shutdownHandlers.length);
    logger.info('[SYSTEM] ='.repeat(50));
  }
}

// Singleton instance
const optimizedSystemInitializer = new OptimizedSystemInitializer();

module.exports = optimizedSystemInitializer;