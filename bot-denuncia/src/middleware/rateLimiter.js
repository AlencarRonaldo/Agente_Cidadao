/**
 * Rate Limiter Middleware - Sistema de controle de taxa para endpoints administrativos
 * Implementa limites diferenciados e estratégias anti-abuse
 */

const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('ioredis');
const logger = require('../utils/logger');

// Configurar cliente Redis para rate limiting
const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  db: 2, // DB separado para rate limiting
  keyPrefix: 'rl:',
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true
});

redisClient.on('error', (error) => {
  logger.error('[RATE_LIMIT] Erro na conexão Redis:', error);
});

/**
 * Criar store Redis para rate limiting
 */
const createRedisStore = () => {
  try {
    return new RedisStore({
      sendCommand: (...args) => redisClient.call(...args),
      prefix: 'admin:',
    });
  } catch (error) {
    logger.warn('[RATE_LIMIT] Fallback para memória devido a erro Redis:', error);
    return undefined; // Usar memória como fallback
  }
};

/**
 * Configurar mensagem de erro personalizada
 */
const rateLimitHandler = (req, res) => {
  const remainingTime = Math.ceil(req.rateLimit.resetTime / 1000);
  
  logger.warn(`[RATE_LIMIT] Limite excedido: ${req.ip} - ${req.method} ${req.path}`);
  
  res.status(429).json({
    success: false,
    error: 'Muitas solicitações',
    code: 'RATE_LIMIT_EXCEEDED',
    message: `Limite de requisições excedido. Tente novamente em ${remainingTime} segundos.`,
    retryAfter: remainingTime,
    limit: req.rateLimit.limit,
    remaining: req.rateLimit.remaining,
    resetTime: new Date(req.rateLimit.resetTime).toISOString()
  });
};

/**
 * Skip function para desenvolvimento
 */
const skipDevelopment = (req) => {
  return process.env.NODE_ENV === 'development' && 
         process.env.DISABLE_RATE_LIMIT === 'true';
};

/**
 * Rate limiter para dashboard (frequente)
 */
const dashboardLimiter = rateLimit({
  store: createRedisStore(),
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 120, // 120 requisições por minuto (2 por segundo)
  message: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipDevelopment,
  keyGenerator: (req) => {
    // Considerar usuário e IP para maior segurança
    return `${req.user?.id || req.ip}:dashboard`;
  },
  onLimitReached: (req) => {
    logger.warn(`[RATE_LIMIT] Limite dashboard atingido: ${req.user?.email || req.ip}`);
  }
});

/**
 * Rate limiter para listagens (moderado)
 */
const listLimiter = rateLimit({
  store: createRedisStore(),
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 60, // 60 requisições por minuto
  message: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipDevelopment,
  keyGenerator: (req) => {
    return `${req.user?.id || req.ip}:list`;
  }
});

/**
 * Rate limiter para operações de escrita (restrito)
 */
const writeLimiter = rateLimit({
  store: createRedisStore(),
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 30, // 30 operações por minuto
  message: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipDevelopment,
  keyGenerator: (req) => {
    return `${req.user?.id || req.ip}:write`;
  },
  onLimitReached: (req) => {
    logger.warn(`[RATE_LIMIT] Limite operações atingido: ${req.user?.email || req.ip} - ${req.method} ${req.path}`);
  }
});

/**
 * Rate limiter para operações em lote (muito restrito)
 */
const batchLimiter = rateLimit({
  store: createRedisStore(),
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 10, // 10 operações em lote por 5 minutos
  message: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipDevelopment,
  keyGenerator: (req) => {
    return `${req.user?.id || req.ip}:batch`;
  },
  onLimitReached: (req) => {
    logger.error(`[RATE_LIMIT] Limite lote atingido: ${req.user?.email || req.ip}`);
  }
});

/**
 * Rate limiter para autenticação (anti-brute force)
 */
const authLimiter = rateLimit({
  store: createRedisStore(),
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 tentativas por IP
  message: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Não contar logins bem-sucedidos
  keyGenerator: (req) => {
    return `${req.ip}:auth`;
  },
  onLimitReached: (req) => {
    logger.error(`[SECURITY] Tentativas de login excessivas de ${req.ip}`);
  }
});

/**
 * Rate limiter para APIs externas (Instagram, etc.)
 */
const externalApiLimiter = rateLimit({
  store: createRedisStore(),
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 10, // 10 calls por minuto para APIs externas
  message: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipDevelopment,
  keyGenerator: (req) => {
    return `${req.user?.id || req.ip}:external`;
  },
  onLimitReached: (req) => {
    logger.warn(`[RATE_LIMIT] Limite API externa atingido: ${req.user?.email || req.ip}`);
  }
});

/**
 * Rate limiter global (segurança geral)
 */
const globalLimiter = rateLimit({
  store: createRedisStore(),
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 200, // 200 requisições totais por minuto
  message: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipDevelopment,
  keyGenerator: (req) => {
    return `${req.ip}:global`;
  },
  onLimitReached: (req) => {
    logger.error(`[SECURITY] Limite global atingido: ${req.ip}`);
  }
});

/**
 * Middleware para log de requisições com métricas
 */
const rateLimitLogger = (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    // Log apenas se houver rate limit info
    if (req.rateLimit) {
      const rateLimitInfo = {
        ip: req.ip,
        user: req.user?.email,
        method: req.method,
        path: req.path,
        limit: req.rateLimit.limit,
        remaining: req.rateLimit.remaining,
        resetTime: new Date(req.rateLimit.resetTime).toISOString(),
        status: res.statusCode
      };
      
      // Log apenas se estiver próximo do limite
      if (req.rateLimit.remaining < req.rateLimit.limit * 0.2) {
        logger.warn('[RATE_LIMIT] Próximo do limite:', rateLimitInfo);
      }
    }
    
    originalSend.call(this, data);
  };
  
  next();
};

/**
 * Middleware de rate limiting dinâmico baseado no endpoint
 */
const dynamicRateLimit = (req, res, next) => {
  const path = req.path.toLowerCase();
  const method = req.method.toLowerCase();
  
  // Aplicar limites baseados no padrão do endpoint
  if (path.includes('/dashboard')) {
    return dashboardLimiter(req, res, next);
  }
  
  if (path.includes('/denuncias') && method === 'get') {
    return listLimiter(req, res, next);
  }
  
  if (path.includes('/batch') || path.includes('/lote')) {
    return batchLimiter(req, res, next);
  }
  
  if (path.includes('/instagram') || path.includes('/test')) {
    return externalApiLimiter(req, res, next);
  }
  
  if (['post', 'put', 'patch', 'delete'].includes(method)) {
    return writeLimiter(req, res, next);
  }
  
  // Aplicar limite global para outros casos
  return globalLimiter(req, res, next);
};

/**
 * Obter estatísticas de rate limiting
 */
const getRateLimitStats = async () => {
  try {
    const keys = await redisClient.keys('admin:*');
    const stats = {
      totalKeys: keys.length,
      keysByType: {},
      timestamp: new Date().toISOString()
    };
    
    // Agrupar por tipo
    keys.forEach(key => {
      const type = key.split(':')[2] || 'unknown';
      stats.keysByType[type] = (stats.keysByType[type] || 0) + 1;
    });
    
    return stats;
  } catch (error) {
    logger.error('[RATE_LIMIT] Erro ao obter estatísticas:', error);
    return {
      error: 'Indisponível',
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Limpar dados de rate limiting expirados
 */
const cleanupRateLimitData = async () => {
  try {
    const keys = await redisClient.keys('admin:*');
    let cleanedCount = 0;
    
    for (const key of keys) {
      const ttl = await redisClient.ttl(key);
      if (ttl === -1) { // Sem expiração
        await redisClient.expire(key, 3600); // Definir 1 hora
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      logger.info(`[RATE_LIMIT] ${cleanedCount} chaves sem TTL corrigidas`);
    }
    
    return cleanedCount;
  } catch (error) {
    logger.error('[RATE_LIMIT] Erro na limpeza:', error);
    return 0;
  }
};

// Limpeza automática a cada hora
setInterval(cleanupRateLimitData, 60 * 60 * 1000);

module.exports = {
  // Rate limiters específicos
  dashboardLimiter,
  listLimiter,
  writeLimiter,
  batchLimiter,
  authLimiter,
  externalApiLimiter,
  globalLimiter,
  
  // Middleware dinâmico
  dynamicRateLimit,
  rateLimitLogger,
  
  // Utilitários
  getRateLimitStats,
  cleanupRateLimitData,
  
  // Cliente Redis para cleanup manual se necessário
  redisClient
};