/**
 * MONITORING SYSTEM INITIALIZER - Inicializador do Sistema de Monitoramento
 * 
 * Script de inicialização que:
 * - Configura e inicializa todos os componentes de monitoramento
 * - Establece ordem de dependência e startup
 * - Configura logging e error handling
 * - Providencia graceful startup e shutdown
 * - Integra com aplicação principal de forma não-invasiva
 * 
 * @author Monitoring System Initializer
 * @priority CRITICAL - System Bootstrap
 */

const logger = require('../utils/logger');

/**
 * MONITORING SYSTEM INITIALIZER - Classe Principal
 */
class MonitoringSystemInitializer {
  constructor() {
    this.isInitialized = false;
    this.masterOrchestrator = null;
    this.initializationPromise = null;
  }

  /**
   * Inicializar sistema de monitoramento
   */
  async initialize() {
    // Evitar múltiplas inicializações
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this._performInitialization();
    return this.initializationPromise;
  }

  /**
   * Executar inicialização
   */
  async _performInitialization() {
    if (this.isInitialized) {
      logger.info('[MONITORING-INIT] System already initialized');
      return this.masterOrchestrator;
    }

    logger.info('[MONITORING-INIT] Starting monitoring system initialization...');
    const startTime = Date.now();

    try {
      // Verificar dependências
      await this.checkDependencies();

      // Carregar e inicializar Master Orchestrator
      const { default: masterMonitoringOrchestrator } = require('./masterMonitoringOrchestrator');
      this.masterOrchestrator = masterMonitoringOrchestrator;

      // Configurar handlers de eventos
      this.setupEventHandlers();

      // Inicializar sistema
      await this.masterOrchestrator.initialize();

      // Aguardar sistema estar pronto
      await this.waitForSystemReady();

      const initTime = Date.now() - startTime;
      this.isInitialized = true;

      logger.info(`[MONITORING-INIT] Monitoring system initialized successfully in ${initTime}ms`);
      return this.masterOrchestrator;

    } catch (error) {
      logger.error('[MONITORING-INIT] Failed to initialize monitoring system:', error);
      this.isInitialized = false;
      this.initializationPromise = null;
      throw error;
    }
  }

  /**
   * Verificar dependências
   */
  async checkDependencies() {
    logger.debug('[MONITORING-INIT] Checking dependencies...');

    // Verificar Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    
    if (majorVersion < 14) {
      throw new Error(`Node.js version ${nodeVersion} not supported. Minimum required: 14.x`);
    }

    // Verificar variáveis de ambiente críticas
    const requiredEnvVars = [];
    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
    
    if (missingEnvVars.length > 0) {
      logger.warn(`[MONITORING-INIT] Missing environment variables: ${missingEnvVars.join(', ')}`);
    }

    // Verificar conexões críticas (opcional)
    try {
      // Redis check
      if (process.env.REDIS_HOST) {
        const Redis = require('ioredis');
        const redis = new Redis({
          host: process.env.REDIS_HOST,
          port: process.env.REDIS_PORT || 6379,
          connectTimeout: 5000,
          maxRetriesPerRequest: 1
        });
        
        await redis.ping();
        await redis.disconnect();
        logger.debug('[MONITORING-INIT] Redis connection verified');
      }

      // Database check
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      await prisma.$queryRaw`SELECT 1`;
      await prisma.$disconnect();
      logger.debug('[MONITORING-INIT] Database connection verified');

    } catch (error) {
      logger.warn('[MONITORING-INIT] Dependency check warning:', error.message);
      // Não falhar a inicialização por problemas de conectividade
    }
  }

  /**
   * Configurar handlers de eventos
   */
  setupEventHandlers() {
    if (!this.masterOrchestrator) return;

    // System events
    this.masterOrchestrator.on('systemInitialized', () => {
      logger.info('[MONITORING-INIT] All monitoring services initialized');
    });

    this.masterOrchestrator.on('systemReady', () => {
      logger.info('[MONITORING-INIT] Monitoring system is ready');
    });

    this.masterOrchestrator.on('serviceFailed', (serviceName, error) => {
      logger.error(`[MONITORING-INIT] Service failed: ${serviceName}`, error);
    });

    this.masterOrchestrator.on('criticalError', (error) => {
      logger.error('[MONITORING-INIT] Critical system error:', error);
    });

    this.masterOrchestrator.on('systemShutdown', () => {
      logger.info('[MONITORING-INIT] Monitoring system shutdown complete');
    });
  }

  /**
   * Aguardar sistema estar pronto
   */
  async waitForSystemReady(timeout = 60000) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Timeout waiting for system ready'));
      }, timeout);

      const checkReady = () => {
        if (this.masterOrchestrator) {
          const status = this.masterOrchestrator.getSystemStatus();
          
          if (status.health === 'healthy' && status.servicesSummary.failed === 0) {
            clearTimeout(timeoutId);
            resolve();
            return;
          }
        }
        
        setTimeout(checkReady, 1000);
      };

      // Se já temos um listener para systemReady, usar ele
      if (this.masterOrchestrator) {
        this.masterOrchestrator.once('systemReady', () => {
          clearTimeout(timeoutId);
          resolve();
        });
      }

      checkReady();
    });
  }

  /**
   * Integrar com aplicação Express
   */
  integrateWithExpress(app) {
    if (!this.isInitialized || !this.masterOrchestrator) {
      logger.warn('[MONITORING-INIT] Cannot integrate with Express: system not initialized');
      return false;
    }

    try {
      // Middleware para adicionar monitoring headers
      app.use((req, res, next) => {
        res.set('X-Monitoring-System', 'active');
        res.set('X-Monitoring-Version', '1.0.0');
        next();
      });

      // Health check routes (já devem estar configuradas)
      logger.debug('[MONITORING-INIT] Express integration completed');
      return true;

    } catch (error) {
      logger.error('[MONITORING-INIT] Express integration failed:', error);
      return false;
    }
  }

  /**
   * Configurar monitoramento para ambiente de produção
   */
  configureForProduction() {
    if (!this.masterOrchestrator) {
      logger.warn('[MONITORING-INIT] Cannot configure for production: system not initialized');
      return;
    }

    logger.info('[MONITORING-INIT] Configuring for production environment...');

    const productionConfig = {
      // Intervalos otimizados para produção
      'monitoring.healthCheckInterval': 30000,        // 30s
      'monitoring.metricsCollectionInterval': 10000,  // 10s
      'monitoring.correlationAnalysisInterval': 600000, // 10min

      // Retenção otimizada
      'metricsCollection.retentionPolicies.realtime': 2 * 60 * 60 * 1000,  // 2 horas
      'metricsCollection.retentionPolicies.hourly': 14 * 24 * 60 * 60 * 1000, // 2 semanas

      // Alertas de produção
      'alerting.enabled': true,
      'alerting.channels': ['log', 'webhook'],

      // Segurança
      'security.enableEncryption': true,
      'security.enableDigitalSignature': true,

      // Performance
      'performance.enableAuditSystem': true,
      'dashboard.websocket.compressionEnabled': true
    };

    this.masterOrchestrator.configure(productionConfig);
    logger.info('[MONITORING-INIT] Production configuration applied');
  }

  /**
   * Configurar monitoramento para desenvolvimento
   */
  configureForDevelopment() {
    if (!this.masterOrchestrator) {
      logger.warn('[MONITORING-INIT] Cannot configure for development: system not initialized');
      return;
    }

    logger.info('[MONITORING-INIT] Configuring for development environment...');

    const developmentConfig = {
      // Intervalos mais frequentes para desenvolvimento
      'monitoring.healthCheckInterval': 15000,        // 15s
      'monitoring.metricsCollectionInterval': 5000,   // 5s
      'monitoring.correlationAnalysisInterval': 120000, // 2min

      // Retenção menor
      'metricsCollection.retentionPolicies.realtime': 30 * 60 * 1000,  // 30 min
      'metricsCollection.retentionPolicies.hourly': 24 * 60 * 60 * 1000, // 1 dia

      // Debug habilitado
      'alerting.enabled': true,
      'alerting.channels': ['log'],

      // Segurança relaxada para desenvolvimento
      'security.enableEncryption': false,
      'security.enableDigitalSignature': false
    };

    this.masterOrchestrator.configure(developmentConfig);
    logger.info('[MONITORING-INIT] Development configuration applied');
  }

  /**
   * Obter instância do Master Orchestrator
   */
  getOrchestrator() {
    return this.masterOrchestrator;
  }

  /**
   * Verificar se está inicializado
   */
  isReady() {
    return this.isInitialized && this.masterOrchestrator;
  }

  /**
   * Obter status do sistema
   */
  getStatus() {
    if (!this.isReady()) {
      return {
        initialized: false,
        ready: false,
        message: 'Monitoring system not initialized'
      };
    }

    const systemStatus = this.masterOrchestrator.getSystemStatus();
    
    return {
      initialized: this.isInitialized,
      ready: systemStatus.isRunning,
      health: systemStatus.health,
      uptime: systemStatus.uptime,
      services: systemStatus.servicesSummary
    };
  }

  /**
   * Shutdown do sistema
   */
  async shutdown() {
    if (this.masterOrchestrator) {
      logger.info('[MONITORING-INIT] Shutting down monitoring system...');
      await this.masterOrchestrator.gracefulShutdown('MANUAL');
    }
  }
}

// Singleton instance
const monitoringInitializer = new MonitoringSystemInitializer();

/**
 * Função de conveniência para inicialização
 */
async function initializeMonitoring(options = {}) {
  try {
    const orchestrator = await monitoringInitializer.initialize();
    
    // Aplicar configuração baseada no ambiente
    const env = process.env.NODE_ENV || 'development';
    
    if (env === 'production') {
      monitoringInitializer.configureForProduction();
    } else {
      monitoringInitializer.configureForDevelopment();
    }

    // Configuração personalizada
    if (options.config) {
      orchestrator.configure(options.config);
    }

    return orchestrator;

  } catch (error) {
    logger.error('[MONITORING-INIT] Initialization failed:', error);
    throw error;
  }
}

/**
 * Função para integração com Express
 */
function integrateWithExpress(app) {
  return monitoringInitializer.integrateWithExpress(app);
}

/**
 * Função para obter status
 */
function getMonitoringStatus() {
  return monitoringInitializer.getStatus();
}

module.exports = {
  MonitoringSystemInitializer,
  initializeMonitoring,
  integrateWithExpress,
  getMonitoringStatus,
  monitoringInitializer
};