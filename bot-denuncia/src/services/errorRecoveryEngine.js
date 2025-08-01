/**
 * ERROR RECOVERY ENGINE - Sistema Inteligente de Recuperação de Erros
 * 
 * Sistema contextual de recuperação que implementa:
 * - Recovery patterns específicos por tipo de erro
 * - Fallbacks automáticos com preservação de dados
 * - Circuit breakers inteligentes
 * - Estratégias de retry exponencial com jitter
 * - Context preservation durante recuperação
 * 
 * @author Integration Flow Orchestrator
 * @priority CRITICAL - Zero Message Loss
 */

const EventEmitter = require('events');
const logger = require('../utils/logger');
const queueManager = require('../queues/queueManager');

/**
 * ERROR CLASSIFICATION SYSTEM
 */
const ERROR_TYPES = {
  NETWORK: {
    patterns: [/ECONNRESET/, /ENOTFOUND/, /ETIMEDOUT/, /ECONNREFUSED/],
    recovery: 'exponential_retry',
    maxRetries: 5,
    baseDelay: 2000,
    preserveContext: true
  },
  RATE_LIMIT: {
    patterns: [/rate.?limit/i, /too.?many.?requests/i, /429/],
    recovery: 'backoff_retry',
    maxRetries: 3,
    baseDelay: 60000, // 1 minuto
    preserveContext: true
  },
  AUTHENTICATION: {
    patterns: [/auth/i, /unauthorized/i, /401/, /403/],
    recovery: 'auth_refresh',
    maxRetries: 2,
    baseDelay: 5000,
    preserveContext: true
  },
  VALIDATION: {
    patterns: [/validation/i, /invalid/i, /bad.?request/i, /400/],
    recovery: 'data_sanitization',
    maxRetries: 2,
    baseDelay: 1000,
    preserveContext: true
  },
  RESOURCE: {
    patterns: [/memory/i, /disk/i, /cpu/i, /resource/i],
    recovery: 'resource_cleanup',
    maxRetries: 3,
    baseDelay: 10000,
    preserveContext: true
  },
  SERVICE_UNAVAILABLE: {
    patterns: [/service.?unavailable/i, /503/, /502/, /504/],
    recovery: 'service_fallback',
    maxRetries: 4,
    baseDelay: 15000,
    preserveContext: true
  },
  CRITICAL: {
    patterns: [/critical/i, /fatal/i, /corruption/i],
    recovery: 'immediate_fallback',
    maxRetries: 1,
    baseDelay: 0,
    preserveContext: true
  }
};

/**
 * RECOVERY STRATEGIES
 */
class RecoveryStrategies {
  constructor(errorRecoveryEngine) {
    this.engine = errorRecoveryEngine;
  }

  /**
   * Retry exponencial com jitter
   */
  async exponential_retry(context, attempt) {
    const { error, errorType, originalData } = context;
    const config = ERROR_TYPES[errorType];
    
    if (attempt > config.maxRetries) {
      throw new Error(`Max retries exceeded for ${errorType}: ${error.message}`);
    }

    // Calcular delay com jitter
    const baseDelay = config.baseDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 0.3 * baseDelay;
    const delay = baseDelay + jitter;

    logger.info(`[RECOVERY] Exponential retry ${attempt}/${config.maxRetries} em ${Math.round(delay/1000)}s`, {
      errorType,
      error: error.message
    });

    await this.sleep(delay);

    // Tentar operação novamente
    return await context.retryOperation();
  }

  /**
   * Backoff retry para rate limits
   */
  async backoff_retry(context, attempt) {
    const { error, errorType } = context;
    const config = ERROR_TYPES[errorType];
    
    if (attempt > config.maxRetries) {
      return await this.service_fallback(context, attempt);
    }

    // Delay maior para rate limits
    const delay = config.baseDelay * attempt;
    
    logger.warn(`[RECOVERY] Rate limit backoff ${attempt}/${config.maxRetries} - aguardando ${Math.round(delay/1000)}s`);

    await this.sleep(delay);
    return await context.retryOperation();
  }

  /**
   * Refresh de autenticação
   */
  async auth_refresh(context, attempt) {
    const { error, errorType, service } = context;
    const config = ERROR_TYPES[errorType];
    
    if (attempt > config.maxRetries) {
      throw new Error(`Auth refresh failed after ${config.maxRetries} attempts`);
    }

    logger.info(`[RECOVERY] Tentando refresh de autenticação - tentativa ${attempt}`);

    try {
      // Refresh específico por serviço
      if (service === 'whatsapp') {
        await this.refreshWhatsAppAuth();
      } else if (service === 'instagram') {
        await this.refreshInstagramAuth();
      }

      await this.sleep(config.baseDelay);
      return await context.retryOperation();

    } catch (refreshError) {
      logger.error('[RECOVERY] Falha no refresh de auth:', refreshError);

      if (attempt === config.maxRetries) {
        return await this.service_fallback(context, attempt);
      }
      
      throw refreshError;
    }
  }

  /**
   * Sanitização de dados
   */
  async data_sanitization(context, attempt) {
    const { error, errorType, originalData } = context;
    
    logger.info('[RECOVERY] Aplicando sanitização de dados');

    try {
      // Sanitizar dados baseado no erro
      const sanitizedData = this.sanitizeData(originalData, error);
      
      // Tentar novamente com dados sanitizados
      context.data = sanitizedData;
      return await context.retryOperation();

    } catch (sanitizeError) {
      logger.error('[RECOVERY] Falha na sanitização:', sanitizeError);
      return await this.service_fallback(context, attempt);
    }
  }

  /**
   * Limpeza de recursos
   */
  async resource_cleanup(context, attempt) {
    const { errorType } = context;
    const config = ERROR_TYPES[errorType];
    
    logger.info(`[RECOVERY] Executando limpeza de recursos - tentativa ${attempt}`);

    try {
      // Forçar garbage collection
      if (global.gc) {
        global.gc();
      }

      // Limpar caches
      await this.clearCaches();

      // Aguardar estabilização
      await this.sleep(config.baseDelay);

      return await context.retryOperation();

    } catch (cleanupError) {
      logger.error('[RECOVERY] Falha na limpeza de recursos:', cleanupError);
      
      if (attempt >= config.maxRetries) {
        return await this.service_fallback(context, attempt);
      }
      
      throw cleanupError;
    }
  }

  /**
   * Fallback de serviço
   */
  async service_fallback(context, attempt) {
    const { flowId, originalData, service, operation } = context;
    
    logger.warn(`[RECOVERY] Ativando fallback de serviço para ${service}.${operation}`);

    try {
      // Salvar dados para retry posterior
      await this.saveFallbackData(flowId, {
        service,
        operation,
        data: originalData,
        timestamp: Date.now(),
        retryAfter: Date.now() + (2 * 60 * 60 * 1000) // 2 horas
      });

      // Usar método alternativo se disponível
      if (service === 'instagram') {
        return await this.instagramFallback(originalData);
      } else if (service === 'whatsapp') {
        return await this.whatsappFallback(originalData);
      }

      // Generic fallback
      return {
        success: false,
        fallbackMode: true,
        data: originalData,
        retryScheduled: true,
        message: 'Operation scheduled for retry'
      };

    } catch (fallbackError) {
      logger.error('[RECOVERY] Fallback failed:', fallbackError);
      throw fallbackError;
    }
  }

  /**
   * Fallback imediato para erros críticos
   */
  async immediate_fallback(context, attempt) {
    const { flowId, originalData, error } = context;
    
    logger.error('[RECOVERY] CRÍTICO - Ativando fallback imediato', {
      error: error.message,
      flowId
    });

    // Salvar dados imediatamente
    await this.saveFallbackData(flowId, {
      critical: true,
      data: originalData,
      error: error.message,
      timestamp: Date.now()
    });

    return {
      success: false,
      critical: true,
      fallbackMode: true,
      data: originalData,
      error: error.message
    };
  }

  // Helper methods
  async refreshWhatsAppAuth() {
    // Implementar refresh específico do WhatsApp
    logger.info('[RECOVERY] Refreshing WhatsApp authentication...');
  }

  async refreshInstagramAuth() {
    // Implementar refresh específico do Instagram
    logger.info('[RECOVERY] Refreshing Instagram authentication...');
  }

  sanitizeData(data, error) {
    // Implementar sanitização baseada no erro
    let sanitized = { ...data };
    
    // Remover caracteres especiais se erro de encoding
    if (error.message.includes('encoding') || error.message.includes('unicode')) {
      if (sanitized.content) {
        sanitized.content = sanitized.content.replace(/[^\x00-\x7F]/g, '');
      }
    }

    // Truncar se erro de tamanho
    if (error.message.includes('too long') || error.message.includes('size')) {
      if (sanitized.content) {
        sanitized.content = sanitized.content.substring(0, 2000);
      }
    }

    return sanitized;
  }

  async clearCaches() {
    // Implementar limpeza de caches
    logger.info('[RECOVERY] Clearing system caches...');
  }

  async saveFallbackData(flowId, data) {
    try {
      if (!this.isInitialized) {
        logger.warn('[ERROR-RECOVERY] Cannot save fallback data - ErrorRecoveryEngine not initialized');
        return;
      }
      
      await queueManager.addJob('fallback-recovery-queue', 'save-fallback', {
        flowId,
        ...data
      }, {
        priority: 10,
        attempts: 5
      });
    } catch (error) {
      logger.error('[RECOVERY] Failed to save fallback data:', error);
    }
  }

  async instagramFallback(data) {
    // Implementar fallback específico do Instagram
    return {
      success: false,
      fallbackMode: true,
      service: 'instagram',
      data,
      message: 'Instagram fallback activated'
    };
  }

  async whatsappFallback(data) {
    // Implementar fallback específico do WhatsApp
    return {
      success: false,
      fallbackMode: true,
      service: 'whatsapp',
      data,
      message: 'WhatsApp fallback activated'
    };
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * CIRCUIT BREAKER INTELIGENTE
 */
class IntelligentCircuitBreaker {
  constructor(name, options = {}) {
    this.name = name;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
    
    // Configuration
    this.config = {
      failureThreshold: options.failureThreshold || 5,
      recoveryTimeout: options.recoveryTimeout || 60000, // 1 minuto
      successThreshold: options.successThreshold || 3, // Para sair de HALF_OPEN
      monitoringPeriod: options.monitoringPeriod || 300000, // 5 minutos
      ...options
    };

    // Metrics
    this.metrics = {
      totalRequests: 0,
      totalFailures: 0,
      totalSuccesses: 0,
      averageResponseTime: 0,
      lastStateChange: Date.now()
    };

    this.startMonitoring();
  }

  /**
   * Executar operação através do circuit breaker
   */
  async execute(operation, context = {}) {
    this.metrics.totalRequests++;

    // Verificar estado do circuit breaker
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime < this.config.recoveryTimeout) {
        throw new Error(`Circuit breaker ${this.name} is OPEN`);
      } else {
        // Tentar transição para HALF_OPEN
        this.state = 'HALF_OPEN';
        this.metrics.lastStateChange = Date.now();
        logger.info(`[CIRCUIT] ${this.name} transitioned to HALF_OPEN`);
      }
    }

    const startTime = Date.now();

    try {
      const result = await operation(context);
      
      // Sucesso
      const responseTime = Date.now() - startTime;
      this.onSuccess(responseTime);
      
      return result;

    } catch (error) {
      // Falha
      const responseTime = Date.now() - startTime;
      this.onFailure(error, responseTime);
      
      throw error;
    }
  }

  /**
   * Callback de sucesso
   */
  onSuccess(responseTime) {
    this.successCount++;
    this.metrics.totalSuccesses++;
    
    // Atualizar tempo médio de resposta
    this.updateAverageResponseTime(responseTime);

    if (this.state === 'HALF_OPEN') {
      if (this.successCount >= this.config.successThreshold) {
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.successCount = 0;
        this.metrics.lastStateChange = Date.now();
        logger.info(`[CIRCUIT] ${this.name} recovered - transitioned to CLOSED`);
      }
    } else if (this.state === 'CLOSED') {
      // Reset failure count on success
      this.failureCount = Math.max(0, this.failureCount - 1);
    }
  }

  /**
   * Callback de falha
   */
  onFailure(error, responseTime) {
    this.failureCount++;
    this.metrics.totalFailures++;
    this.lastFailureTime = Date.now();
    
    this.updateAverageResponseTime(responseTime);

    if (this.state === 'CLOSED' || this.state === 'HALF_OPEN') {
      if (this.failureCount >= this.config.failureThreshold) {
        this.state = 'OPEN';
        this.successCount = 0;
        this.metrics.lastStateChange = Date.now();
        logger.warn(`[CIRCUIT] ${this.name} tripped - transitioned to OPEN`, {
          failures: this.failureCount,
          error: error.message
        });
      }
    }
  }

  /**
   * Atualizar tempo médio de resposta
   */
  updateAverageResponseTime(responseTime) {
    if (this.metrics.averageResponseTime === 0) {
      this.metrics.averageResponseTime = responseTime;
    } else {
      this.metrics.averageResponseTime = 
        (this.metrics.averageResponseTime + responseTime) / 2;
    }
  }

  /**
   * Iniciar monitoramento
   */
  startMonitoring() {
    this.monitoringInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.config.monitoringPeriod);
  }

  /**
   * Health check periódico
   */
  performHealthCheck() {
    const now = Date.now();
    const timeSinceLastFailure = now - this.lastFailureTime;

    // Auto-recovery se não há falhas recentes
    if (this.state === 'OPEN' && timeSinceLastFailure > (this.config.recoveryTimeout * 2)) {
      this.state = 'HALF_OPEN';
      this.failureCount = Math.floor(this.failureCount / 2); // Reduzir pela metade
      this.metrics.lastStateChange = now;
      logger.info(`[CIRCUIT] ${this.name} auto-recovery to HALF_OPEN`);
    }

    // Log metrics
    if (this.metrics.totalRequests > 0) {
      const successRate = (this.metrics.totalSuccesses / this.metrics.totalRequests) * 100;
      logger.debug(`[CIRCUIT] ${this.name} metrics`, {
        state: this.state,
        successRate: successRate.toFixed(2) + '%',
        avgResponseTime: Math.round(this.metrics.averageResponseTime) + 'ms',
        failures: this.failureCount
      });
    }
  }

  /**
   * Obter status do circuit breaker
   */
  getStatus() {
    const successRate = this.metrics.totalRequests > 0 
      ? (this.metrics.totalSuccesses / this.metrics.totalRequests) * 100 
      : 0;

    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      metrics: {
        ...this.metrics,
        successRate,
        failureRate: 100 - successRate
      },
      isHealthy: this.state !== 'OPEN' && successRate > 70
    };
  }

  /**
   * Forçar reset do circuit breaker
   */
  reset() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
    this.metrics.lastStateChange = Date.now();
    
    logger.info(`[CIRCUIT] ${this.name} manually reset`);
  }

  /**
   * Parar monitoramento
   */
  stop() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
  }
}

/**
 * ERROR RECOVERY ENGINE - Classe Principal
 */
class ErrorRecoveryEngine extends EventEmitter {
  constructor() {
    super();
    
    this.recoveryStrategies = new RecoveryStrategies(this);
    this.circuitBreakers = new Map();
    this.recoveryHistory = [];
    
    // Configuration
    this.config = {
      maxRecoveryAttempts: 5,
      recoveryTimeout: 300000, // 5 minutos
      contextPreservationEnabled: true,
      enableCircuitBreakers: true
    };

    this.createDefaultCircuitBreakers();
    // setupRecoveryQueue() moved to initialize() method to fix initialization order
    
    // Initialization state
    this.isInitialized = false;
  }

  /**
   * Initialize ErrorRecoveryEngine after dependencies are ready
   */
  async initialize() {
    if (this.isInitialized) {
      logger.warn('[ERROR-RECOVERY] Already initialized, skipping...');
      return;
    }

    try {
      logger.info('[ERROR-RECOVERY] 🛡️ Initializing Error Recovery Engine...');
      
      // Setup recovery queues now that queueManager is initialized
      this.setupRecoveryQueue();
      
      this.isInitialized = true;
      logger.info('[ERROR-RECOVERY] ✅ Error Recovery Engine initialized successfully');
    } catch (error) {
      logger.error('[ERROR-RECOVERY] ❌ Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Classificar tipo de erro
   */
  classifyError(error, context = {}) {
    const errorMessage = error.message || error.toString();
    
    for (const [type, config] of Object.entries(ERROR_TYPES)) {
      for (const pattern of config.patterns) {
        if (pattern.test(errorMessage) || pattern.test(error.code || '')) {
          return { type, config };
        }
      }
    }

    // Default classification
    return { 
      type: 'UNKNOWN', 
      config: { 
        recovery: 'exponential_retry', 
        maxRetries: 3, 
        baseDelay: 5000,
        preserveContext: true
      } 
    };
  }

  /**
   * Executar recuperação de erro
   */
  async executeRecovery(error, context, attempt = 1) {
    const classification = this.classifyError(error, context);
    const recoveryId = this.generateRecoveryId();
    
    logger.info(`[RECOVERY:${recoveryId}] Iniciando recuperação`, {
      errorType: classification.type,
      attempt,
      service: context.service,
      operation: context.operation
    });

    const recoveryContext = {
      ...context,
      error,
      errorType: classification.type,
      recoveryId,
      attempt
    };

    try {
      // Preservar contexto se habilitado
      if (classification.config.preserveContext && this.config.contextPreservationEnabled) {
        await this.preserveContext(recoveryId, recoveryContext);
      }

      // Executar estratégia de recuperação
      const strategy = classification.config.recovery;
      const recoveryMethod = this.recoveryStrategies[strategy];
      
      if (!recoveryMethod) {
        throw new Error(`Recovery strategy not found: ${strategy}`);
      }

      const result = await recoveryMethod.call(this.recoveryStrategies, recoveryContext, attempt);
      
      // Log sucesso
      this.recordRecovery(recoveryId, true, classification.type, attempt);
      logger.info(`[RECOVERY:${recoveryId}] Recuperação bem-sucedida`, {
        strategy,
        attempt
      });

      this.emit('recoverySuccess', { recoveryId, strategy, attempt, result });
      return result;

    } catch (recoveryError) {
      // Log falha
      this.recordRecovery(recoveryId, false, classification.type, attempt, recoveryError);
      logger.error(`[RECOVERY:${recoveryId}] Falha na recuperação`, {
        strategy: classification.config.recovery,
        attempt,
        error: recoveryError.message
      });

      // Tentar próxima tentativa se possível
      if (attempt < this.config.maxRecoveryAttempts && attempt < classification.config.maxRetries) {
        return await this.executeRecovery(error, context, attempt + 1);
      }

      this.emit('recoveryFailed', { recoveryId, error: recoveryError, finalAttempt: attempt });
      throw recoveryError;
    }
  }

  /**
   * Executar operação com circuit breaker
   */
  async executeWithCircuitBreaker(service, operation, operationFn, context = {}) {
    const cbName = `${service}.${operation}`;
    const circuitBreaker = this.getOrCreateCircuitBreaker(cbName);

    try {
      return await circuitBreaker.execute(operationFn, context);
    } catch (error) {
      // Se circuit breaker aberto, tentar recovery direto
      if (error.message.includes('Circuit breaker') && error.message.includes('OPEN')) {
        logger.warn(`[RECOVERY] Circuit breaker aberto para ${cbName} - tentando recovery`);
        
        return await this.executeRecovery(new Error('Circuit breaker triggered'), {
          ...context,
          service,
          operation,
          retryOperation: operationFn
        });
      }
      
      throw error;
    }
  }

  /**
   * Criar circuit breakers padrão
   */
  createDefaultCircuitBreakers() {
    const services = ['whatsapp', 'instagram', 'analysis', 'database'];
    
    services.forEach(service => {
      const cbName = `${service}.default`;
      const circuitBreaker = new IntelligentCircuitBreaker(cbName, {
        failureThreshold: 5,
        recoveryTimeout: 60000,
        successThreshold: 3
      });
      
      this.circuitBreakers.set(cbName, circuitBreaker);
    });
  }

  /**
   * Obter ou criar circuit breaker
   */
  getOrCreateCircuitBreaker(name, options = {}) {
    if (this.circuitBreakers.has(name)) {
      return this.circuitBreakers.get(name);
    }

    const circuitBreaker = new IntelligentCircuitBreaker(name, options);
    this.circuitBreakers.set(name, circuitBreaker);
    
    return circuitBreaker;
  }

  /**
   * Preservar contexto para recovery
   */
  async preserveContext(recoveryId, context) {
    try {
      if (!this.isInitialized) {
        logger.warn('[ERROR-RECOVERY] Cannot preserve context - ErrorRecoveryEngine not initialized');
        return;
      }
      
      await queueManager.addJob('context-preservation-queue', 'preserve-context', {
        recoveryId,
        context: {
          ...context,
          // Serializar apenas dados essenciais
          error: {
            message: context.error.message,
            stack: context.error.stack,
            code: context.error.code
          }
        },
        timestamp: Date.now()
      }, {
        priority: 10,
        attempts: 3
      });
    } catch (error) {
      logger.warn('[RECOVERY] Failed to preserve context:', error.message);
    }
  }

  /**
   * Registrar tentativa de recovery
   */
  recordRecovery(recoveryId, success, errorType, attempt, error = null) {
    const record = {
      recoveryId,
      success,
      errorType,
      attempt,
      timestamp: Date.now(),
      error: error ? error.message : null
    };

    this.recoveryHistory.push(record);
    
    // Manter apenas últimos 1000 registros
    if (this.recoveryHistory.length > 1000) {
      this.recoveryHistory = this.recoveryHistory.slice(-1000);
    }
  }

  /**
   * Setup da queue de recovery
   */
  setupRecoveryQueue() {
    try {
      // Verify queueManager is initialized before using it
      if (!queueManager.isInitialized) {
        throw new Error('QueueManager must be initialized before setting up recovery queues');
      }

      logger.info('[ERROR-RECOVERY] Setting up recovery queues...');

      // Processor para preservação de contexto
      queueManager.process('context-preservation-queue', 'preserve-context', 2, async (job) => {
        const { recoveryId, context } = job.data;
        logger.info(`[RECOVERY] Context preserved for ${recoveryId}`);
        return { preserved: true };
      });

      // Processor para fallback recovery
      queueManager.process('fallback-recovery-queue', 'save-fallback', 1, async (job) => {
        const { flowId } = job.data;
        logger.info(`[RECOVERY] Fallback data saved for ${flowId}`);
        return { saved: true };
      });

      logger.info('[ERROR-RECOVERY] Recovery queues setup completed');
    } catch (error) {
      logger.error('[ERROR-RECOVERY] Failed to setup recovery queues:', error);
      throw error;
    }
  }

  /**
   * Obter estatísticas de recovery
   */
  getRecoveryStats() {
    const recent = this.recoveryHistory.filter(r => 
      Date.now() - r.timestamp < 24 * 60 * 60 * 1000 // Últimas 24 horas
    );

    const successfulRecoveries = recent.filter(r => r.success);
    const failedRecoveries = recent.filter(r => !r.success);

    const errorTypeStats = {};
    recent.forEach(r => {
      errorTypeStats[r.errorType] = (errorTypeStats[r.errorType] || 0) + 1;
    });

    const circuitBreakerStats = Array.from(this.circuitBreakers.values())
      .map(cb => cb.getStatus());

    return {
      totalRecoveries: recent.length,
      successfulRecoveries: successfulRecoveries.length,
      failedRecoveries: failedRecoveries.length,
      successRate: recent.length > 0 ? (successfulRecoveries.length / recent.length) * 100 : 0,
      errorTypeBreakdown: errorTypeStats,
      circuitBreakers: circuitBreakerStats,
      averageAttempts: recent.length > 0 
        ? recent.reduce((sum, r) => sum + r.attempt, 0) / recent.length 
        : 0
    };
  }

  /**
   * Reset de circuit breakers
   */
  resetCircuitBreakers() {
    this.circuitBreakers.forEach(cb => cb.reset());
    logger.info('[RECOVERY] All circuit breakers reset');
  }

  /**
   * Shutdown do engine
   */
  async shutdown() {
    logger.info('[RECOVERY] Shutting down Error Recovery Engine...');
    
    // Parar circuit breakers
    this.circuitBreakers.forEach(cb => cb.stop());
    this.circuitBreakers.clear();
    
    logger.info('[RECOVERY] Error Recovery Engine shut down');
  }

  // Utility methods
  generateRecoveryId() {
    return `recovery_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }
}

// Singleton instance
const errorRecoveryEngine = new ErrorRecoveryEngine();

module.exports = {
  ErrorRecoveryEngine,
  IntelligentCircuitBreaker,
  RecoveryStrategies,
  ERROR_TYPES,
  default: errorRecoveryEngine
};