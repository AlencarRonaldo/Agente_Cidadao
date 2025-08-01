/**
 * Queue Manager - Sistema unificado de gerenciamento de filas
 * Implementa padrões de reliability e performance para processamento de denúncias
 */

const Bull = require('bull');
const Redis = require('ioredis');
const logger = require('../utils/logger');
const { CONFIG } = require('../config/constants');

class QueueManager {
  constructor() {
    this.redis = null;
    this.queues = new Map();
    this.isInitialized = false;
    
    // Configurações de performance e reliability
    this.defaultJobOptions = {
      removeOnComplete: 50, // Manter últimos 50 jobs completos
      removeOnFail: 100,    // Manter últimos 100 jobs falhados
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    };
    
    // Configurações específicas por tipo de fila
    this.queueConfigs = {
      'process-queue': {
        concurrency: 5,
        limiter: {
          max: 10,
          duration: 10000 // 10 jobs por 10 segundos
        }
      },
      'publish-queue': {
        concurrency: 2, // Menor concorrência para evitar rate limits
        limiter: {
          max: 3,
          duration: 60000 // 3 jobs por minuto
        }
      }
    };
  }

  /**
   * Inicializar o gerenciador de filas
   */
  async initialize() {
    try {
      // Configurar conexão Redis otimizada
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        maxRetriesPerRequest: 3,
        retryDelayOnFailover: 100,
        connectTimeout: 10000,
        commandTimeout: 5000,
        // Pool de conexões para performance
        family: 4,
        keepAlive: true,
        // Configurações de reliability
        enableReadyCheck: true,
        maxLoadingTimeout: 5000,
        // Tratamento de reconexão
        lazyConnect: true,
        reconnectOnError: (err) => {
          const targetError = 'READONLY';
          return err.message.includes(targetError);
        }
      });

      // Event listeners para monitoramento
      this.redis.on('connect', () => {
        logger.info('[QUEUE] Redis conectado com sucesso');
      });

      this.redis.on('error', (error) => {
        logger.error('[QUEUE] Erro na conexão Redis:', error);
      });

      this.redis.on('reconnecting', () => {
        logger.warn('[QUEUE] Reconectando ao Redis...');
      });

      // Aguardar conexão
      await this.redis.connect();
      
      this.isInitialized = true;
      logger.info('[QUEUE] Queue Manager inicializado com sucesso');
      
      return true;
    } catch (error) {
      logger.error('[QUEUE] Falha ao inicializar Queue Manager:', error);
      throw error;
    }
  }

  /**
   * Criar ou obter uma fila
   */
  getQueue(queueName) {
    if (!this.isInitialized) {
      throw new Error('Queue Manager não foi inicializado');
    }

    if (this.queues.has(queueName)) {
      return this.queues.get(queueName);
    }

    const queueConfig = this.queueConfigs[queueName] || {};
    
    const queue = new Bull(queueName, {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
      },
      defaultJobOptions: {
        ...this.defaultJobOptions,
        ...queueConfig.jobOptions
      },
      settings: {
        stalledInterval: 30 * 1000,    // 30 segundos
        maxStalledCount: 3,            // Máximo 3 tentativas para jobs "presos"
        retryProcessDelay: 5 * 1000,   // 5 segundos entre tentativas
      }
    });

    // Configurar rate limiting se especificado (Bull v4+ only)
    if (queueConfig.limiter && typeof queue.setLimiter === 'function') {
      try {
        queue.setLimiter(queueConfig.limiter);
        logger.info(`[QUEUE] Rate limiter configurado para '${queueName}'`);
      } catch (error) {
        logger.warn(`[QUEUE] Não foi possível configurar rate limiter para '${queueName}':`, error.message);
      }
    }

    // Event listeners padrão
    this.setupQueueListeners(queue, queueName);
    
    this.queues.set(queueName, queue);
    
    logger.info(`[QUEUE] Fila '${queueName}' criada com sucesso`);
    return queue;
  }

  /**
   * Configurar listeners para monitoramento da fila
   */
  setupQueueListeners(queue, queueName) {
    queue.on('completed', (job, result) => {
      logger.info(`[QUEUE:${queueName}] Job ${job.id} completado`, {
        jobType: job.name,
        processingTime: Date.now() - job.processedOn,
        attempts: job.attemptsMade + 1
      });
    });

    queue.on('failed', (job, err) => {
      logger.error(`[QUEUE:${queueName}] Job ${job.id} falhou`, {
        jobType: job.name,
        error: err.message,
        attempts: job.attemptsMade + 1,
        data: job.data
      });
    });

    queue.on('stalled', (job) => {
      logger.warn(`[QUEUE:${queueName}] Job ${job.id} travado`, {
        jobType: job.name,
        stalledCount: job.opts.attempts - job.attemptsMade
      });
    });

    queue.on('progress', (job, progress) => {
      logger.debug(`[QUEUE:${queueName}] Job ${job.id} progresso: ${progress}%`);
    });

    queue.on('error', (error) => {
      logger.error(`[QUEUE:${queueName}] Erro na fila:`, error);
    });
  }

  /**
   * Adicionar job à fila com opções otimizadas
   */
  async addJob(queueName, jobType, data, options = {}) {
    if (!this.isInitialized) {
      throw new Error('Queue Manager não foi inicializado');
    }

    const queue = this.getQueue(queueName);
    
    const jobOptions = {
      ...this.defaultJobOptions,
      ...options,
      // Adicionar timestamp para tracking
      jobId: options.jobId || `${jobType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    try {
      const job = await queue.add(jobType, data, jobOptions);
      
      logger.info(`[QUEUE:${queueName}] Job adicionado: ${job.id}`, {
        jobType,
        priority: options.priority || 0,
        delay: options.delay || 0
      });
      
      return job;
    } catch (error) {
      logger.error(`[QUEUE:${queueName}] Falha ao adicionar job:`, error);
      throw error;
    }
  }

  /**
   * Processar jobs de uma fila
   */
  process(queueName, jobType, concurrency, processor) {
    const queue = this.getQueue(queueName);
    const queueConfig = this.queueConfigs[queueName] || {};
    
    const finalConcurrency = concurrency || queueConfig.concurrency || 1;
    
    queue.process(jobType, finalConcurrency, async (job) => {
      const startTime = Date.now();
      
      try {
        logger.info(`[QUEUE:${queueName}] Processando job ${job.id}`, {
          jobType,
          attempt: job.attemptsMade + 1,
          data: job.data
        });
        
        const result = await processor(job);
        
        const processingTime = Date.now() - startTime;
        logger.info(`[QUEUE:${queueName}] Job ${job.id} concluído em ${processingTime}ms`);
        
        return result;
      } catch (error) {
        const processingTime = Date.now() - startTime;
        logger.error(`[QUEUE:${queueName}] Job ${job.id} falhou após ${processingTime}ms:`, error);
        throw error;
      }
    });
    
    logger.info(`[QUEUE:${queueName}] Processador configurado para '${jobType}' com concorrência ${finalConcurrency}`);
  }

  /**
   * Obter estatísticas da fila
   */
  async getQueueStats(queueName) {
    const queue = this.getQueue(queueName);
    
    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaiting(),
        queue.getActive(),
        queue.getCompleted(),
        queue.getFailed(),
        queue.getDelayed()
      ]);

      return {
        queueName,
        counts: {
          waiting: waiting.length,
          active: active.length,
          completed: completed.length,
          failed: failed.length,
          delayed: delayed.length
        },
        health: {
          isHealthy: failed.length < 10 && active.length < 20,
          errorRate: failed.length / (completed.length + failed.length || 1)
        }
      };
    } catch (error) {
      logger.error(`[QUEUE:${queueName}] Erro ao obter estatísticas:`, error);
      return null;
    }
  }

  /**
   * Limpeza automática de jobs antigos
   */
  async cleanOldJobs(queueName, options = {}) {
    const queue = this.getQueue(queueName);
    
    const cleanOptions = {
      completed: options.completed || 24 * 60 * 60 * 1000, // 24 horas
      failed: options.failed || 7 * 24 * 60 * 60 * 1000,   // 7 dias
      active: options.active || 2 * 60 * 60 * 1000,        // 2 horas (jobs ativos muito antigos)
      ...options
    };

    try {
      const results = await Promise.all([
        queue.clean(cleanOptions.completed, 'completed'),
        queue.clean(cleanOptions.failed, 'failed'),
        queue.clean(cleanOptions.active, 'active')
      ]);
      
      const [completedCleaned, failedCleaned, activeCleaned] = results;
      
      logger.info(`[QUEUE:${queueName}] Limpeza concluída`, {
        completed: completedCleaned.length,
        failed: failedCleaned.length,
        active: activeCleaned.length
      });
      
      return {
        completed: completedCleaned.length,
        failed: failedCleaned.length,
        active: activeCleaned.length
      };
    } catch (error) {
      logger.error(`[QUEUE:${queueName}] Erro na limpeza:`, error);
      return null;
    }
  }

  /**
   * Pausar fila
   */
  async pauseQueue(queueName) {
    const queue = this.getQueue(queueName);
    await queue.pause();
    logger.info(`[QUEUE:${queueName}] Fila pausada`);
  }

  /**
   * Retomar fila
   */
  async resumeQueue(queueName) {
    const queue = this.getQueue(queueName);
    await queue.resume();
    logger.info(`[QUEUE:${queueName}] Fila retomada`);
  }

  /**
   * Fechar todas as filas e conexões
   */
  async shutdown() {
    logger.info('[QUEUE] Iniciando shutdown do Queue Manager...');
    
    try {
      // Fechar todas as filas
      for (const [queueName, queue] of this.queues) {
        await queue.close();
        logger.info(`[QUEUE] Fila '${queueName}' fechada`);
      }
      
      // Fechar conexão Redis
      if (this.redis) {
        await this.redis.quit();
        logger.info('[QUEUE] Conexão Redis fechada');
      }
      
      this.queues.clear();
      this.isInitialized = false;
      
      logger.info('[QUEUE] Queue Manager finalizado com sucesso');
    } catch (error) {
      logger.error('[QUEUE] Erro durante shutdown:', error);
      throw error;
    }
  }

  /**
   * Monitoramento de saúde das filas
   */
  async healthCheck() {
    if (!this.isInitialized) {
      return { healthy: false, reason: 'Queue Manager não inicializado' };
    }

    try {
      // Verificar conexão Redis
      await this.redis.ping();
      
      // Verificar saúde de cada fila
      const queueStats = [];
      for (const queueName of this.queues.keys()) {
        const stats = await this.getQueueStats(queueName);
        if (stats) {
          queueStats.push(stats);
        }
      }
      
      const unhealthyQueues = queueStats.filter(q => !q.health.isHealthy);
      
      return {
        healthy: unhealthyQueues.length === 0,
        redis: 'connected',
        queues: queueStats,
        issues: unhealthyQueues.map(q => `${q.queueName}: alta taxa de erro ou muitos jobs ativos`)
      };
    } catch (error) {
      return {
        healthy: false,
        reason: `Health check falhou: ${error.message}`
      };
    }
  }
}

// Singleton instance
const queueManager = new QueueManager();

module.exports = queueManager;