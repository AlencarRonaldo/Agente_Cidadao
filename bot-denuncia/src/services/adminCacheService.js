/**
 * Admin Cache Service - Sistema inteligente de cache para o painel administrativo
 * Performance otimizada com invalidação seletiva e estratégias diferenciadas
 */

const Redis = require('ioredis');
const logger = require('../utils/logger');
const EventEmitter = require('events');

class AdminCacheService extends EventEmitter {
  constructor() {
    super();
    this.redis = null;
    this.isConnected = false;
    this.cacheStats = {
      hits: 0,
      misses: 0,
      sets: 0,
      invalidations: 0
    };
    
    // Configurações de TTL por tipo de dados
    this.ttlConfig = {
      dashboard: {
        summary: 60,        // 1 minuto - dados que mudam frequentemente
        topBairros: 300,    // 5 minutos - dados mais estáveis
        statusDist: 180,    // 3 minutos - dados intermediários
        filaStatus: 30      // 30 segundos - dados de fila em tempo real
      },
      agenda: {
        upcoming: 30,       // 30 segundos - agenda muda frequentemente
        stats: 60          // 1 minuto - estatísticas da agenda
      },
      reports: {
        daily: 1800,       // 30 minutos - relatórios diários
        weekly: 3600,      // 1 hora - relatórios semanais
        monthly: 7200      // 2 horas - relatórios mensais
      },
      static: {
        bairros: 86400,    // 24 horas - lista de bairros (dados estáticos)
        vereadores: 3600   // 1 hora - lista de vereadores
      }
    };
  }

  /**
   * Inicializar conexão Redis otimizada
   */
  async initialize() {
    try {
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        connectTimeout: 5000,
        commandTimeout: 3000,
        enableReadyCheck: true,
        lazyConnect: true,
        // Configurações de performance
        family: 4,
        keepAlive: true,
        // Pool de conexões
        db: 1, // Usar DB separado para cache administrativo
        keyPrefix: 'admin:cache:' // Prefixo para organização
      });

      this.redis.on('connect', () => {
        this.isConnected = true;
        logger.info('[CACHE] Admin Cache Service conectado ao Redis');
      });

      this.redis.on('error', (error) => {
        this.isConnected = false;
        logger.error('[CACHE] Erro na conexão Redis:', error);
      });

      this.redis.on('reconnecting', () => {
        logger.warn('[CACHE] Reconectando ao Redis...');
      });

      await this.redis.connect();
      
      // Configurar limpeza automática
      this.startCleanupInterval();
      
      logger.info('[CACHE] Admin Cache Service inicializado com sucesso');
      return true;
    } catch (error) {
      logger.error('[CACHE] Falha ao inicializar Admin Cache Service:', error);
      throw error;
    }
  }

  /**
   * Obter dados do cache com fallback inteligente
   */
  async get(key, type = 'general') {
    if (!this.isConnected) {
      this.cacheStats.misses++;
      return null;
    }

    try {
      const startTime = Date.now();
      const data = await this.redis.get(key);
      const retrievalTime = Date.now() - startTime;
      
      if (data) {
        this.cacheStats.hits++;
        logger.debug(`[CACHE] Hit: ${key} (${retrievalTime}ms)`);
        return JSON.parse(data);
      } else {
        this.cacheStats.misses++;
        logger.debug(`[CACHE] Miss: ${key}`);
        return null;
      }
    } catch (error) {
      logger.error(`[CACHE] Erro ao buscar ${key}:`, error);
      this.cacheStats.misses++;
      return null;
    }
  }

  /**
   * Armazenar dados no cache com TTL inteligente
   */
  async set(key, data, type = 'general', customTtl = null) {
    if (!this.isConnected) {
      return false;
    }

    try {
      const ttl = customTtl || this.getTtlForType(type);
      const serializedData = JSON.stringify(data);
      
      await this.redis.setex(key, ttl, serializedData);
      
      this.cacheStats.sets++;
      logger.debug(`[CACHE] Set: ${key} (TTL: ${ttl}s)`);
      
      return true;
    } catch (error) {
      logger.error(`[CACHE] Erro ao armazenar ${key}:`, error);
      return false;
    }
  }

  /**
   * Invalidar cache específico ou por padrão
   */
  async invalidate(pattern) {
    if (!this.isConnected) {
      return false;
    }

    try {
      let keys;
      
      if (pattern.includes('*')) {
        // Usar SCAN para padrões
        keys = await this.scanKeys(pattern);
      } else {
        // Chave específica
        keys = [pattern];
      }

      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.cacheStats.invalidations += keys.length;
        logger.info(`[CACHE] Invalidados ${keys.length} itens: ${pattern}`);
        
        // Emitir evento para sincronização
        this.emit('cache:invalidated', { pattern, keys });
      }
      
      return true;
    } catch (error) {
      logger.error(`[CACHE] Erro ao invalidar ${pattern}:`, error);
      return false;
    }
  }

  /**
   * Buscar chaves por padrão usando SCAN (performance otimizada)
   */
  async scanKeys(pattern) {
    const keys = [];
    const stream = this.redis.scanStream({
      match: pattern,
      count: 100
    });

    return new Promise((resolve, reject) => {
      stream.on('data', (resultKeys) => {
        keys.push(...resultKeys);
      });
      
      stream.on('end', () => {
        resolve(keys);
      });
      
      stream.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Cache com função de fallback automática
   */
  async getOrSet(key, fallbackFn, type = 'general', customTtl = null) {
    // Tentar buscar do cache primeiro
    let data = await this.get(key, type);
    
    if (data === null) {
      // Cache miss - executar função de fallback
      try {
        data = await fallbackFn();
        
        if (data !== null && data !== undefined) {
          await this.set(key, data, type, customTtl);
        }
      } catch (error) {
        logger.error(`[CACHE] Erro na função de fallback para ${key}:`, error);
        throw error;
      }
    }
    
    return data;
  }

  /**
   * Obter TTL baseado no tipo de dados
   */
  getTtlForType(type) {
    const parts = type.split('.');
    let config = this.ttlConfig;
    
    for (const part of parts) {
      if (config[part]) {
        config = config[part];
      } else {
        return 300; // Default: 5 minutos
      }
    }
    
    return typeof config === 'number' ? config : 300;
  }

  /**
   * Atualização em lote para otimização
   */
  async setBatch(items) {
    if (!this.isConnected || !Array.isArray(items)) {
      return false;
    }

    try {
      const pipeline = this.redis.pipeline();
      
      for (const item of items) {
        const { key, data, type = 'general', ttl } = item;
        const finalTtl = ttl || this.getTtlForType(type);
        const serializedData = JSON.stringify(data);
        
        pipeline.setex(key, finalTtl, serializedData);
      }
      
      await pipeline.exec();
      
      this.cacheStats.sets += items.length;
      logger.info(`[CACHE] Batch set: ${items.length} itens`);
      
      return true;
    } catch (error) {
      logger.error('[CACHE] Erro no batch set:', error);
      return false;
    }
  }

  /**
   * Estratégias de invalidação inteligente
   */
  async invalidateByEvent(event, data = {}) {
    const invalidationMap = {
      'denuncia:created': ['dashboard:*', 'agenda:*'],
      'denuncia:approved': ['dashboard:*', 'agenda:*'],
      'denuncia:published': ['dashboard:*', 'agenda:*'],
      'denuncia:rejected': ['dashboard:*'],
      'denuncia:scheduled': ['agenda:*'],
      'admin:settings': ['dashboard:*', 'reports:*'],
      'system:maintenance': ['*']
    };

    const patterns = invalidationMap[event];
    if (!patterns) {
      return false;
    }

    logger.info(`[CACHE] Invalidação por evento: ${event}`);
    
    for (const pattern of patterns) {
      await this.invalidate(pattern);
    }
    
    return true;
  }

  /**
   * Limpeza automática de cache expirado
   */
  startCleanupInterval() {
    setInterval(async () => {
      try {
        // Limpar estatísticas antigas se necessário
        if (this.cacheStats.hits + this.cacheStats.misses > 10000) {
          this.resetStats();
        }
        
        logger.debug('[CACHE] Limpeza automática executada');
      } catch (error) {
        logger.error('[CACHE] Erro na limpeza automática:', error);
      }
    }, 30 * 60 * 1000); // A cada 30 minutos
  }

  /**
   * Resetar estatísticas de cache
   */
  resetStats() {
    this.cacheStats = {
      hits: 0,
      misses: 0,
      sets: 0,
      invalidations: 0
    };
    logger.info('[CACHE] Estatísticas resetadas');
  }

  /**
   * Obter estatísticas de performance
   */
  getStats() {
    const total = this.cacheStats.hits + this.cacheStats.misses;
    const hitRate = total > 0 ? (this.cacheStats.hits / total * 100).toFixed(2) : 0;
    
    return {
      ...this.cacheStats,
      hitRate: `${hitRate}%`,
      connected: this.isConnected,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Health check do sistema de cache
   */
  async healthCheck() {
    try {
      if (!this.isConnected) {
        return { healthy: false, reason: 'Desconectado do Redis' };
      }
      
      const startTime = Date.now();
      await this.redis.ping();
      const pingTime = Date.now() - startTime;
      
      const stats = this.getStats();
      
      return {
        healthy: true,
        pingTime,
        stats,
        redis: 'connected'
      };
    } catch (error) {
      return {
        healthy: false,
        reason: error.message
      };
    }
  }

  /**
   * Fechar conexões
   */
  async shutdown() {
    try {
      if (this.redis) {
        await this.redis.quit();
        this.isConnected = false;
      }
      logger.info('[CACHE] Admin Cache Service finalizado');
    } catch (error) {
      logger.error('[CACHE] Erro ao finalizar Admin Cache Service:', error);
    }
  }
}

// Singleton instance
const adminCacheService = new AdminCacheService();

module.exports = adminCacheService;