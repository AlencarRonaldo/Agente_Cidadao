/**
 * Workers Index - Sistema unificado de inicialização de workers
 * Gerencia lifecycle e health check dos workers de processamento
 */

const queueManager = require('../queues/queueManager');
const { setupProcessor: setupProcessWorker } = require('./processWorker');
const { setupProcessor: setupPublishWorker } = require('./publishWorker');
const photoCleanupWorker = require('./photoCleanupWorker');
const logger = require('../utils/logger');

class WorkerManager {
  constructor() {
    this.workers = new Map();
    this.isInitialized = false;
    this.healthCheckInterval = null;
  }

  /**
   * Inicializar todos os workers
   */
  async initialize() {
    try {
      logger.info('[WORKER_MANAGER] Iniciando sistema de workers...');

      // Inicializar queue manager primeiro
      if (!queueManager.isInitialized) {
        await queueManager.initialize();
      }

      // Inicializar processadores
      await this.setupWorkers();

      // Configurar monitoramento de saúde
      this.setupHealthCheck();

      // Configurar shutdown graceful
      this.setupGracefulShutdown();

      this.isInitialized = true;
      logger.info('[WORKER_MANAGER] Sistema de workers inicializado com sucesso');

      return true;
    } catch (error) {
      logger.error('[WORKER_MANAGER] Erro ao inicializar workers:', error);
      throw error;
    }
  }

  /**
   * Configurar todos os workers
   */
  async setupWorkers() {
    try {
      // Setup Process Worker
      logger.info('[WORKER_MANAGER] Configurando Process Worker...');
      await setupProcessWorker();
      this.workers.set('process', {
        name: 'Process Worker',
        status: 'running',
        startedAt: new Date(),
        queueName: 'process-queue'
      });

      // Setup Publish Worker
      logger.info('[WORKER_MANAGER] Configurando Publish Worker...');
      await setupPublishWorker();
      this.workers.set('publish', {
        name: 'Publish Worker',
        status: 'running',
        startedAt: new Date(),
        queueName: 'publish-queue'
      });

      // Setup Photo Cleanup Worker
      logger.info('[WORKER_MANAGER] Configurando Photo Cleanup Worker...');
      photoCleanupWorker.start();
      this.workers.set('photoCleanup', {
        name: 'Photo Cleanup Worker',
        status: 'running',
        startedAt: new Date(),
        type: 'background'
      });

      logger.info('[WORKER_MANAGER] Todos os workers configurados');
    } catch (error) {
      logger.error('[WORKER_MANAGER] Erro ao configurar workers:', error);
      throw error;
    }
  }

  /**
   * Configurar monitoramento de saúde
   */
  setupHealthCheck() {
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        logger.error('[WORKER_MANAGER] Erro no health check:', error);
      }
    }, 60000); // A cada minuto

    logger.info('[WORKER_MANAGER] Health check configurado');
  }

  /**
   * Executar verificação de saúde
   */
  async performHealthCheck() {
    try {
      // Verificar saúde do queue manager
      const queueHealth = await queueManager.healthCheck();
      
      if (!queueHealth.healthy) {
        logger.warn('[WORKER_MANAGER] Queue Manager não está saudável:', queueHealth);
      }

      // Verificar status de cada worker
      for (const [workerId, workerInfo] of this.workers) {
        try {
          if (workerInfo.type === 'background') {
            // Special handling for background workers
            if (workerId === 'photoCleanup') {
              const cleanupHealth = photoCleanupWorker.getHealthStatus();
              workerInfo.status = cleanupHealth.healthy ? 'running' : 'unhealthy';
              workerInfo.lastHealthCheck = new Date();
              workerInfo.stats = {
                totalRuns: cleanupHealth.totalRuns,
                totalCleaned: cleanupHealth.totalCleaned,
                consecutiveFailures: cleanupHealth.consecutiveFailures
              };
              
              if (!cleanupHealth.healthy) {
                logger.warn(`[WORKER_MANAGER] Worker ${workerId} não está saudável:`, cleanupHealth);
              }
            }
          } else {
            // Queue-based workers
            const queueStats = await queueManager.getQueueStats(workerInfo.queueName);
            
            if (queueStats) {
              // Atualizar status baseado nas estatísticas
              const isHealthy = queueStats.health.isHealthy;
              workerInfo.status = isHealthy ? 'running' : 'unhealthy';
              workerInfo.lastHealthCheck = new Date();
              workerInfo.stats = queueStats.counts;
              
              if (!isHealthy) {
                logger.warn(`[WORKER_MANAGER] Worker ${workerId} não está saudável:`, queueStats);
              }
            }
          }
        } catch (error) {
          logger.error(`[WORKER_MANAGER] Erro ao verificar worker ${workerId}:`, error);
          workerInfo.status = 'error';
          workerInfo.lastError = error.message;
        }
      }

      // Log consolidado do health check
      const healthSummary = {
        queueManager: queueHealth.healthy ? 'healthy' : 'unhealthy',
        workers: Object.fromEntries(
          Array.from(this.workers.entries()).map(([id, info]) => [
            id, 
            { 
              status: info.status, 
              uptime: Date.now() - info.startedAt.getTime(),
              queueStats: info.stats
            }
          ])
        )
      };

      logger.debug('[WORKER_MANAGER] Health check concluído:', healthSummary);
    } catch (error) {
      logger.error('[WORKER_MANAGER] Erro durante health check:', error);
    }
  }

  /**
   * Obter status de todos os workers
   */
  async getStatus() {
    const status = {
      initialized: this.isInitialized,
      queueManager: await queueManager.healthCheck(),
      workers: {}
    };

    for (const [workerId, workerInfo] of this.workers) {
      try {
        const queueStats = await queueManager.getQueueStats(workerInfo.queueName);
        
        status.workers[workerId] = {
          ...workerInfo,
          uptime: Date.now() - workerInfo.startedAt.getTime(),
          queueStats: queueStats ? queueStats.counts : null
        };
      } catch (error) {
        status.workers[workerId] = {
          ...workerInfo,
          error: error.message
        };
      }
    }

    return status;
  }

  /**
   * Parar worker específico
   */
  async stopWorker(workerId) {
    try {
      const workerInfo = this.workers.get(workerId);
      if (!workerInfo) {
        throw new Error(`Worker ${workerId} não encontrado`);
      }

      // Pausar fila correspondente
      await queueManager.pauseQueue(workerInfo.queueName);
      
      workerInfo.status = 'stopped';
      workerInfo.stoppedAt = new Date();

      logger.info(`[WORKER_MANAGER] Worker ${workerId} parado`);
    } catch (error) {
      logger.error(`[WORKER_MANAGER] Erro ao parar worker ${workerId}:`, error);
      throw error;
    }
  }

  /**
   * Reiniciar worker específico
   */
  async restartWorker(workerId) {
    try {
      const workerInfo = this.workers.get(workerId);
      if (!workerInfo) {
        throw new Error(`Worker ${workerId} não encontrado`);
      }

      // Retomar fila correspondente
      await queueManager.resumeQueue(workerInfo.queueName);
      
      workerInfo.status = 'running';
      workerInfo.restartedAt = new Date();

      logger.info(`[WORKER_MANAGER] Worker ${workerId} reiniciado`);
    } catch (error) {
      logger.error(`[WORKER_MANAGER] Erro ao reiniciar worker ${workerId}:`, error);
      throw error;
    }
  }

  /**
   * Configurar shutdown graceful
   */
  setupGracefulShutdown() {
    const gracefulShutdown = async (signal) => {
      logger.info(`[WORKER_MANAGER] Recebido sinal ${signal}, iniciando shutdown graceful...`);
      
      try {
        // Parar health check
        if (this.healthCheckInterval) {
          clearInterval(this.healthCheckInterval);
        }

        // Parar todos os workers
        for (const [workerId, workerInfo] of this.workers) {
          if (workerInfo.type === 'background') {
            if (workerId === 'photoCleanup') {
              photoCleanupWorker.stop();
            }
          } else {
            await this.stopWorker(workerId);
          }
        }

        // Shutdown do queue manager
        await queueManager.shutdown();

        logger.info('[WORKER_MANAGER] Shutdown graceful concluído');
        process.exit(0);
      } catch (error) {
        logger.error('[WORKER_MANAGER] Erro durante shutdown graceful:', error);
        process.exit(1);
      }
    };

    // Registrar listeners para sinais de shutdown
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('[WORKER_MANAGER] Uncaught Exception:', error);
      gracefulShutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('[WORKER_MANAGER] Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('unhandledRejection');
    });

    logger.info('[WORKER_MANAGER] Shutdown graceful configurado');
  }

  /**
   * Executar limpeza manual de filas
   */
  async cleanQueues() {
    try {
      const results = {};
      
      for (const [workerId, workerInfo] of this.workers) {
        logger.info(`[WORKER_MANAGER] Limpando fila do worker ${workerId}...`);
        
        const cleanResult = await queueManager.cleanOldJobs(workerInfo.queueName);
        results[workerId] = cleanResult;
      }

      logger.info('[WORKER_MANAGER] Limpeza de filas concluída:', results);
      return results;
    } catch (error) {
      logger.error('[WORKER_MANAGER] Erro na limpeza de filas:', error);
      throw error;
    }
  }
}

// Singleton instance
const workerManager = new WorkerManager();

// Função legada para compatibilidade
async function initializeWorkers() {
  return await workerManager.initialize();
}

// Auto-inicializar quando o módulo for carregado em standalone
if (require.main === module) {
  workerManager.initialize().catch(error => {
    logger.error('[WORKER_MANAGER] Falha crítica na inicialização:', error);
    process.exit(1);
  });
}

module.exports = {
  initializeWorkers,
  workerManager
};