/**
 * MONITORING SYSTEM INITIALIZER - Inicializador do Sistema de Monitoramento Otimizado
 * 
 * Substitui o sistema antigo pelo novo sistema otimizado que resolve:
 * 1. Warning "Error Recovery: Low success rate (0.0%)" - Normal para sistemas novos
 * 2. Warning "Performance Audit: Integrity issues detected" - Problemas de encryption corrigidos
 * 3. Transições desnecessárias RUNNING → DEGRADED - Smart status calculation implementado
 * 
 * @author Optimized Monitoring System
 * @priority CRITICAL - System Migration
 */

const logger = require('../utils/logger');
const optimizedMonitoringSystem = require('./optimizedMonitoringSystem');

/**
 * MONITORING MIGRATION MANAGER - Gerenciador de Migração
 */
class MonitoringMigrationManager {
  constructor() {
    this.migrationStatus = 'pending';
    this.oldSystemStopped = false;
    this.newSystemStarted = false;
  }

  /**
   * Executar migração completa para sistema otimizado
   */
  async migrateToOptimizedSystem() {
    logger.info('[MIGRATION] 🔄 Starting migration to Optimized Monitoring System...');
    
    try {
      this.migrationStatus = 'in_progress';
      
      // Passo 1: Parar sistema antigo se estiver rodando
      await this.stopOldSystem();
      
      // Passo 2: Limpar recursos antigos
      await this.cleanupOldResources();
      
      // Passo 3: Inicializar sistema otimizado
      await this.startOptimizedSystem();
      
      // Passo 4: Verificar integridade do novo sistema
      await this.verifyNewSystem();
      
      this.migrationStatus = 'completed';
      
      logger.info('[MIGRATION] ✅ Migration to Optimized Monitoring System completed successfully');
      
      return {
        success: true,
        message: 'Migration completed successfully',
        newSystemStatus: await optimizedMonitoringSystem.default.getDashboardMetrics()
      };
      
    } catch (error) {
      this.migrationStatus = 'failed';
      logger.error('[MIGRATION] ❌ Migration failed:', error);
      
      // Tentar rollback em caso de falha
      await this.rollbackMigration();
      
      throw new Error(`Migration failed: ${error.message}`);
    }
  }

  /**
   * Parar sistema antigo
   */
  async stopOldSystem() {
    logger.info('[MIGRATION] Stopping old monitoring system...');
    
    try {
      // Tentar parar sistema inteligente antigo
      const oldIntelligentSystem = require('./intelligentMonitoringSystem');
      if (oldIntelligentSystem.default && oldIntelligentSystem.default.stop) {
        await oldIntelligentSystem.default.stop();
        logger.info('[MIGRATION] Old intelligent monitoring system stopped');
      }
      
      // Tentar parar sistema de auditoria antigo
      const oldAuditSystem = require('./performanceAuditSystem');
      if (oldAuditSystem.default && oldAuditSystem.default.shutdown) {
        await oldAuditSystem.default.shutdown();
        logger.info('[MIGRATION] Old audit system stopped');
      }
      
      this.oldSystemStopped = true;
      
    } catch (error) {
      logger.warn('[MIGRATION] Warning stopping old systems (may not be running):', error.message);
      this.oldSystemStopped = true; // Continuar mesmo com warning
    }
  }

  /**
   * Limpar recursos antigos
   */
  async cleanupOldResources() {
    logger.info('[MIGRATION] Cleaning up old resources...');
    
    try {
      // Força garbage collection se disponível
      if (global.gc) {
        global.gc();
        logger.debug('[MIGRATION] Garbage collection forced');
      }
      
      // Limpar listeners de eventos antigos
      process.removeAllListeners('unhandledRejection');
      process.removeAllListeners('uncaughtException');
      
      logger.info('[MIGRATION] Old resources cleaned up');
      
    } catch (error) {
      logger.warn('[MIGRATION] Warning cleaning up resources:', error.message);
      // Continuar mesmo com warnings
    }
  }

  /**
   * Inicializar sistema otimizado
   */
  async startOptimizedSystem() {
    logger.info('[MIGRATION] Starting optimized monitoring system...');
    
    try {
      await optimizedMonitoringSystem.default.start();
      this.newSystemStarted = true;
      
      logger.info('[MIGRATION] Optimized monitoring system started successfully');
      
    } catch (error) {
      logger.error('[MIGRATION] Failed to start optimized system:', error);
      throw error;
    }
  }

  /**
   * Verificar integridade do novo sistema
   */
  async verifyNewSystem() {
    logger.info('[MIGRATION] Verifying new system integrity...');
    
    try {
      // Aguardar alguns segundos para estabilização
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Obter métricas do dashboard
      const metrics = await optimizedMonitoringSystem.default.getDashboardMetrics();
      
      // Verificações básicas
      if (!metrics.timestamp || !metrics.overallStatus || !metrics.components) {
        throw new Error('Invalid dashboard metrics structure');
      }
      
      if (!metrics.systemHealth.monitoringUptime) {
        throw new Error('System uptime not being tracked');
      }
      
      logger.info('[MIGRATION] New system verification passed', {
        overallStatus: metrics.overallStatus.status,
        componentsCount: Object.keys(metrics.components).length,
        uptime: metrics.systemHealth.monitoringUptime
      });
      
    } catch (error) {
      logger.error('[MIGRATION] New system verification failed:', error);
      throw error;
    }
  }

  /**
   * Rollback da migração em caso de falha
   */
  async rollbackMigration() {
    logger.warn('[MIGRATION] Attempting rollback...');
    
    try {
      // Parar sistema novo se foi iniciado
      if (this.newSystemStarted) {
        await optimizedMonitoringSystem.default.stop();
        logger.info('[MIGRATION] New system stopped during rollback');
      }
      
      // Tentar reiniciar sistema antigo
      const oldIntelligentSystem = require('./intelligentMonitoringSystem');
      if (oldIntelligentSystem.default && oldIntelligentSystem.default.start) {
        await oldIntelligentSystem.default.start();
        logger.info('[MIGRATION] Old system restarted during rollback');
      }
      
      logger.warn('[MIGRATION] Rollback completed');
      
    } catch (rollbackError) {
      logger.error('[MIGRATION] Rollback failed:', rollbackError);
      // Sistema pode estar em estado inconsistente
    }
  }

  /**
   * Obter status da migração
   */
  getMigrationStatus() {
    return {
      status: this.migrationStatus,
      oldSystemStopped: this.oldSystemStopped,
      newSystemStarted: this.newSystemStarted,
      timestamp: Date.now()
    };
  }
}

/**
 * OPTIMIZED MONITORING INITIALIZER - Inicializador Principal
 */
class OptimizedMonitoringInitializer {
  constructor() {
    this.migrationManager = new MonitoringMigrationManager();
    this.isInitialized = false;
  }

  /**
   * Inicializar sistema de monitoramento otimizado
   */
  async initialize() {
    if (this.isInitialized) {
      logger.warn('[MONITORING-INIT] System already initialized');
      return optimizedMonitoringSystem.getDashboardMetrics();
    }

    logger.info('[MONITORING-INIT] 🚀 Initializing Optimized Monitoring System...');
    
    try {
      // Executar migração
      const migrationResult = await this.migrationManager.migrateToOptimizedSystem();
      
      // Configurar handlers de eventos
      this.setupEventHandlers();
      
      // Configurar handlers de processo
      this.setupProcessHandlers();
      
      this.isInitialized = true;
      
      logger.info('[MONITORING-INIT] ✅ Optimized Monitoring System initialized successfully');
      
      return migrationResult;
      
    } catch (error) {
      logger.error('[MONITORING-INIT] ❌ Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Configurar handlers de eventos
   */
  setupEventHandlers() {
    // Handler para health check completo
    optimizedMonitoringSystem.default.on('healthCheckCompleted', (data) => {
      const { results, executionTime, periodStatus } = data;
      
      // Log apenas se houver problemas ou estivermos fora do grace period
      const hasIssues = Object.values(results).some(r => 
        r.status?.status === 'critical' || r.status?.status === 'error'
      );
      
      if (hasIssues || periodStatus.period !== 'grace') {
        logger.info(`[MONITORING] Health check completed in ${executionTime}ms (${periodStatus.period} period)`, {
          overallStatus: this.calculateOverallFromResults(results),
          issuesFound: hasIssues
        });
      }
    });

    // Handler para alertas críticos
    optimizedMonitoringSystem.default.on('criticalAlert', (alertData) => {
      logger.error('[MONITORING] 🚨 CRITICAL ALERT:', alertData);
    });

    // Handler para alertas de degradação
    optimizedMonitoringSystem.default.on('degradationAlert', (alertData) => {
      logger.warn('[MONITORING] ⚠️ DEGRADATION ALERT:', alertData);
    });

    // Handler para recuperação executada
    optimizedMonitoringSystem.default.on('recoveryExecuted', (recoveryData) => {
      logger.info(`[MONITORING] 🔧 Recovery executed for ${recoveryData.component}:`, recoveryData.result);
    });

    // Handler para falha de recuperação
    optimizedMonitoringSystem.default.on('recoveryFailed', (failureData) => {
      logger.error(`[MONITORING] ❌ Recovery failed for ${failureData.component}:`, failureData.error);
    });
  }

  /**
   * Configurar handlers de processo
   */
  setupProcessHandlers() {
    // Handler para shutdown gracioso
    const gracefulShutdown = async (signal) => {
      logger.info(`[MONITORING-INIT] Received ${signal}, shutting down gracefully...`);
      
      try {
        await optimizedMonitoringSystem.default.stop();
        logger.info('[MONITORING-INIT] Monitoring system stopped gracefully');
        process.exit(0);
      } catch (error) {
        logger.error('[MONITORING-INIT] Error during graceful shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handler para exceções não capturadas
    process.on('uncaughtException', (error) => {
      logger.error('[MONITORING-INIT] Uncaught Exception:', error);
      
      // Tentar log de emergency antes de sair
      if (optimizedMonitoringSystem.default.isRunning) {
        optimizedMonitoringSystem.default.emit('emergencyShutdown', { reason: 'uncaughtException', error });
      }
      
      process.exit(1);
    });

    // Handler para promises rejeitadas
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('[MONITORING-INIT] Unhandled Rejection at:', promise, 'reason:', reason);
      
      // Não sair do processo para promises rejeitadas, apenas logar
      if (optimizedMonitoringSystem.default.isRunning) {
        optimizedMonitoringSystem.default.emit('unhandledRejection', { reason, promise });
      }
    });
  }

  /**
   * Calcular status geral a partir dos resultados
   */
  calculateOverallFromResults(results) {
    const statuses = Object.values(results).map(r => r.status?.status || r.status);
    
    if (statuses.some(s => s === 'critical' || s === 'error')) {
      return 'critical';
    } else if (statuses.some(s => s === 'degraded')) {
      return 'degraded';
    } else if (statuses.some(s => s === 'warning')) {
      return 'warning';
    } else if (statuses.every(s => s === 'healthy')) {
      return 'healthy';
    } else {
      return 'unknown';
    }
  }

  /**
   * Obter status do sistema
   */
  getSystemStatus() {
    if (!this.isInitialized) {
      return {
        initialized: false,
        migration: this.migrationManager.getMigrationStatus()
      };
    }

    return {
      initialized: true,
      migration: this.migrationManager.getMigrationStatus(),
      monitoring: optimizedMonitoringSystem.default.getDashboardMetrics()
    };
  }

  /**
   * Reinicializar sistema (para desenvolvimento/debug)
   */
  async reinitialize() {
    logger.info('[MONITORING-INIT] Reinitializing system...');
    
    if (this.isInitialized) {
      await optimizedMonitoringSystem.default.stop();
      this.isInitialized = false;
    }
    
    this.migrationManager = new MonitoringMigrationManager();
    return await this.initialize();
  }
}

// Singleton instance
const monitoringInitializer = new OptimizedMonitoringInitializer();

module.exports = {
  OptimizedMonitoringInitializer,
  MonitoringMigrationManager,
  default: monitoringInitializer,
  
  // API conveniente
  initialize: () => monitoringInitializer.initialize(),
  getStatus: () => monitoringInitializer.getSystemStatus(),
  reinitialize: () => monitoringInitializer.reinitialize(),
  
  // Acesso direto ao sistema otimizado
  optimizedSystem: optimizedMonitoringSystem
};