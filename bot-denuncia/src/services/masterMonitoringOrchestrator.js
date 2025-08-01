/**
 * MASTER MONITORING ORCHESTRATOR - Orquestrador Principal de Monitoramento
 * 
 * Sistema central que coordena todos os componentes de monitoramento:
 * - Orquestra health monitoring, metrics collection, ML analysis
 * - Coordena incident response e performance correlation
 * - Gerencia real-time dashboard e alerting system
 * - Implementa configuração centralizada e lifecycle management
 * - Providencia APIs unificadas e service discovery
 * - Mantém SLA compliance e operational excellence
 * 
 * @author Master Monitoring Orchestrator
 * @priority CRITICAL - System-Wide Operational Intelligence
 */

const EventEmitter = require('events');
const logger = require('../utils/logger');
const performanceAuditSystem = require('./performanceAuditSystem');

/**
 * SERVICE REGISTRY - Registro de Serviços
 */
class ServiceRegistry extends EventEmitter {
  constructor() {
    super();
    
    this.services = new Map();
    this.serviceStates = new Map();
    this.dependencies = new Map();
    this.healthChecks = new Map();
    
    this.config = {
      healthCheckInterval: 30000,  // 30 segundos
      serviceTimeout: 60000,       // 1 minuto
      maxRetries: 3,
      gracefulShutdownTimeout: 30000
    };
  }

  /**
   * Registrar serviço
   */
  register(serviceName, serviceInstance, config = {}) {
    const serviceConfig = {
      name: serviceName,
      instance: serviceInstance,
      dependencies: config.dependencies || [],
      healthCheck: config.healthCheck || null,
      critical: config.critical || false,
      startupOrder: config.startupOrder || 100,
      shutdownOrder: config.shutdownOrder || 100,
      ...config
    };

    this.services.set(serviceName, serviceConfig);
    this.serviceStates.set(serviceName, {
      state: 'registered',
      lastHealthCheck: null,
      errorCount: 0,
      startTime: null,
      uptime: 0
    });

    if (serviceConfig.dependencies.length > 0) {
      this.dependencies.set(serviceName, serviceConfig.dependencies);
    }

    logger.info(`[REGISTRY] Service registered: ${serviceName}`);
    this.emit('serviceRegistered', serviceName, serviceConfig);
  }

  /**
   * Inicializar serviço
   */
  async initialize(serviceName) {
    const service = this.services.get(serviceName);
    const state = this.serviceStates.get(serviceName);
    
    if (!service) {
      throw new Error(`Service not found: ${serviceName}`);
    }

    try {
      state.state = 'initializing';
      state.startTime = Date.now();

      // Verificar dependências
      await this.checkDependencies(serviceName);

      // Inicializar serviço
      if (service.instance.initialize) {
        await service.instance.initialize();
      }

      state.state = 'running';
      logger.info(`[REGISTRY] Service initialized: ${serviceName}`);
      
      this.emit('serviceInitialized', serviceName);
      return true;

    } catch (error) {
      state.state = 'failed';
      state.errorCount++;
      
      logger.error(`[REGISTRY] Failed to initialize service ${serviceName}:`, error);
      this.emit('serviceInitializationFailed', serviceName, error);
      throw error;
    }
  }

  /**
   * Verificar dependências
   */
  async checkDependencies(serviceName) {
    const dependencies = this.dependencies.get(serviceName) || [];
    
    for (const dependency of dependencies) {
      const depState = this.serviceStates.get(dependency);
      
      if (!depState || depState.state !== 'running') {
        throw new Error(`Dependency not available: ${dependency} for service ${serviceName}`);
      }
    }
  }

  /**
   * Parar serviço
   */
  async stop(serviceName, graceful = true) {
    const service = this.services.get(serviceName);
    const state = this.serviceStates.get(serviceName);
    
    if (!service || state.state !== 'running') {
      return;
    }

    try {
      state.state = 'stopping';

      if (graceful && service.instance.stop) {
        await Promise.race([
          service.instance.stop(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Graceful shutdown timeout')), 
                      this.config.gracefulShutdownTimeout)
          )
        ]);
      }

      state.state = 'stopped';
      state.uptime = Date.now() - state.startTime;
      
      logger.info(`[REGISTRY] Service stopped: ${serviceName}`);
      this.emit('serviceStopped', serviceName);

    } catch (error) {
      logger.error(`[REGISTRY] Error stopping service ${serviceName}:`, error);
      state.state = 'error';
    }
  }

  /**
   * Obter status do serviço
   */
  getServiceStatus(serviceName) {
    const service = this.services.get(serviceName);
    const state = this.serviceStates.get(serviceName);
    
    if (!service || !state) {
      return null;
    }

    return {
      name: serviceName,
      state: state.state,
      critical: service.critical,
      uptime: state.startTime ? Date.now() - state.startTime : 0,
      errorCount: state.errorCount,
      lastHealthCheck: state.lastHealthCheck,
      dependencies: service.dependencies
    };
  }

  /**
   * Obter todos os serviços
   */
  getAllServices() {
    const services = {};
    
    this.services.forEach((_, serviceName) => {
      services[serviceName] = this.getServiceStatus(serviceName);
    });
    
    return services;
  }

  /**
   * Verificar saúde dos serviços
   */
  async performHealthChecks() {
    const healthResults = {};
    
    for (const [serviceName, service] of this.services) {
      const state = this.serviceStates.get(serviceName);
      
      if (state.state !== 'running') continue;

      try {
        let healthy = true;
        
        if (service.healthCheck) {
          healthy = await service.healthCheck();
        } else if (service.instance.getServiceStatus) {
          const status = service.instance.getServiceStatus();
          healthy = status.isRunning !== false;
        }

        state.lastHealthCheck = Date.now();
        healthResults[serviceName] = {
          healthy,
          timestamp: state.lastHealthCheck
        };

        if (!healthy) {
          state.errorCount++;
          this.emit('serviceUnhealthy', serviceName);
        }

      } catch (error) {
        state.errorCount++;
        healthResults[serviceName] = {
          healthy: false,
          error: error.message,
          timestamp: Date.now()
        };
        
        this.emit('serviceHealthCheckFailed', serviceName, error);
      }
    }

    return healthResults;
  }
}

/**
 * CONFIGURATION MANAGER - Gerenciador de Configuração
 */
class ConfigurationManager {
  constructor() {
    this.config = new Map();
    this.watchers = new Map();
    this.defaultConfig = this.getDefaultConfiguration();
    
    this.loadConfiguration();
  }

  /**
   * Obter configuração padrão
   */
  getDefaultConfiguration() {
    return {
      // Monitoring System Config
      monitoring: {
        healthCheckInterval: 30000,
        metricsCollectionInterval: 5000,
        correlationAnalysisInterval: 300000,
        enablePredictiveAnalytics: true,
        enableAutomatedRecovery: true,
        enableRealTimeDashboard: true
      },

      // Health Monitor Config
      healthMonitor: {
        healthCheckInterval: 30000,
        predictionInterval: 300000,
        alertCooldown: 60000,
        maxHistoryEntries: 1000,
        anomalyDetectionWindow: 100,
        mlModelUpdateInterval: 3600000
      },

      // Metrics Collection Config
      metricsCollection: {
        collectionIntervals: {
          realtime: 5000,
          frequent: 30000,
          regular: 300000,
          periodic: 3600000
        },
        retentionPolicies: {
          realtime: 24 * 60 * 60 * 1000,
          hourly: 7 * 24 * 60 * 60 * 1000,
          daily: 30 * 24 * 60 * 60 * 1000,
          weekly: 365 * 24 * 60 * 60 * 1000
        },
        batchSize: 1000,
        compressionEnabled: true
      },

      // Incident Response Config
      incidentResponse: {
        autoRecoveryEnabled: true,
        maxConcurrentRecoveries: 3,
        incidentCooldown: 300000,
        escalationEnabled: true,
        learningEnabled: true
      },

      // Dashboard Config
      dashboard: {
        websocket: {
          port: 8080,
          pingInterval: 30000,
          maxClients: 100,
          compressionEnabled: true
        },
        dataOrchestrator: {
          updateIntervals: {
            metrics: 5000,
            system_health: 10000,
            performance: 30000,
            incidents: 5000,
            business_metrics: 60000,
            predictions: 300000
          }
        }
      },

      // Correlation Analysis Config
      correlation: {
        updateInterval: 300000,
        correlationThreshold: 0.5,
        maxHistoricalEntries: 1000,
        cacheTimeout: 600000,
        enableRealTimeCorrelation: true,
        minDataPoints: 20
      },

      // Performance Config
      performance: {
        enableAuditSystem: true,
        enableMetricsCollector: true,
        slaThresholds: {
          whatsappProcessing: 5000,
          instagramPosting: 30000,
          completeFlow: 60000,
          errorRecovery: 10000,
          systemResponse: 2000
        }
      },

      // Alerting Config
      alerting: {
        enabled: true,
        channels: ['log', 'webhook'],
        severityLevels: ['critical', 'high', 'medium', 'low'],
        rateLimit: {
          critical: 0,      // Sem limite
          high: 5,          // 5 por hora
          medium: 10,       // 10 por hora
          low: 20           // 20 por hora
        }
      },

      // Security Config
      security: {
        enableEncryption: true,
        enableDigitalSignature: true,
        auditLogRetention: 365 * 24 * 60 * 60 * 1000,
        compressionEnabled: true
      }
    };
  }

  /**
   * Carregar configuração
   */
  loadConfiguration() {
    // Carregar configuração padrão
    Object.entries(this.defaultConfig).forEach(([key, value]) => {
      this.config.set(key, value);
    });

    // Sobrescrever com variáveis de ambiente se disponíveis
    this.loadEnvironmentConfig();
  }

  /**
   * Carregar configuração do ambiente
   */
  loadEnvironmentConfig() {
    // Monitoring
    if (process.env.MONITORING_HEALTH_INTERVAL) {
      this.set('monitoring.healthCheckInterval', parseInt(process.env.MONITORING_HEALTH_INTERVAL));
    }

    if (process.env.ENABLE_PREDICTIVE_ANALYTICS) {
      this.set('monitoring.enablePredictiveAnalytics', process.env.ENABLE_PREDICTIVE_ANALYTICS === 'true');
    }

    if (process.env.ENABLE_AUTOMATED_RECOVERY) {
      this.set('monitoring.enableAutomatedRecovery', process.env.ENABLE_AUTOMATED_RECOVERY === 'true');
    }

    // Dashboard
    if (process.env.DASHBOARD_WS_PORT) {
      this.set('dashboard.websocket.port', parseInt(process.env.DASHBOARD_WS_PORT));
    }

    // Redis/Database
    if (process.env.REDIS_HOST) {
      this.set('redis.host', process.env.REDIS_HOST);
    }

    if (process.env.REDIS_PORT) {
      this.set('redis.port', parseInt(process.env.REDIS_PORT));
    }
  }

  /**
   * Obter configuração
   */
  get(path) {
    const keys = path.split('.');
    let value = this.config.get(keys[0]);
    
    for (let i = 1; i < keys.length; i++) {
      if (value && typeof value === 'object') {
        value = value[keys[i]];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  /**
   * Definir configuração
   */
  set(path, value) {
    const keys = path.split('.');
    const topKey = keys[0];
    
    if (keys.length === 1) {
      this.config.set(topKey, value);
    } else {
      let config = this.config.get(topKey) || {};
      let current = config;
      
      for (let i = 1; i < keys.length - 1; i++) {
        current[keys[i]] = current[keys[i]] || {};
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      this.config.set(topKey, config);
    }

    // Notificar watchers
    const watchers = this.watchers.get(path) || [];
    watchers.forEach(callback => callback(value, path));
  }

  /**
   * Observar mudanças na configuração
   */
  watch(path, callback) {
    if (!this.watchers.has(path)) {
      this.watchers.set(path, []);
    }
    
    this.watchers.get(path).push(callback);
  }

  /**
   * Obter toda a configuração
   */
  getAll() {
    const allConfig = {};
    
    this.config.forEach((value, key) => {
      allConfig[key] = value;
    });
    
    return allConfig;
  }
}

/**
 * MASTER MONITORING ORCHESTRATOR - Orquestrador Principal
 */
class MasterMonitoringOrchestrator extends EventEmitter {
  constructor() {
    super();
    
    this.serviceRegistry = new ServiceRegistry();
    this.configManager = new ConfigurationManager();
    
    this.services = {
      healthMonitor: null,
      metricsCollector: null,
      incidentResponse: null,
      dashboard: null,
      correlationEngine: null,
      performanceAudit: null
    };

    this.isInitialized = false;
    this.isRunning = false;
    this.startTime = null;
    
    this.setupEventHandlers();
  }

  /**
   * Configurar handlers de eventos
   */
  setupEventHandlers() {
    // Service Registry Events
    this.serviceRegistry.on('serviceInitialized', (serviceName) => {
      logger.info(`[ORCHESTRATOR] Service ready: ${serviceName}`);
      this.checkSystemReadiness();
    });

    this.serviceRegistry.on('serviceInitializationFailed', (serviceName, error) => {
      logger.error(`[ORCHESTRATOR] Service failed: ${serviceName}`, error);
      this.emit('serviceFailed', serviceName, error);
    });

    this.serviceRegistry.on('serviceUnhealthy', (serviceName) => {
      logger.warn(`[ORCHESTRATOR] Service unhealthy: ${serviceName}`);
      this.handleUnhealthyService(serviceName);
    });

    // System-wide error handling
    process.on('uncaughtException', (error) => {
      logger.error('[ORCHESTRATOR] Uncaught exception:', error);
      this.handleCriticalError(error);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('[ORCHESTRATOR] Unhandled rejection:', reason);
      this.handleCriticalError(reason);
    });
  }

  /**
   * Inicializar sistema de monitoramento
   */
  async initialize() {
    if (this.isInitialized) {
      logger.warn('[ORCHESTRATOR] System already initialized');
      return;
    }

    logger.info('[ORCHESTRATOR] Initializing Master Monitoring System...');
    this.startTime = Date.now();

    try {
      // Registrar todos os serviços
      await this.registerAllServices();

      // Inicializar serviços em ordem de dependência
      await this.initializeServicesInOrder();

      // Configurar monitoramento de saúde
      this.setupHealthMonitoring();

      // Configurar lifecycle hooks
      this.setupLifecycleHooks();

      this.isInitialized = true;
      this.isRunning = true;

      // Auditar inicialização
      await performanceAuditSystem.createAuditEntry('MONITORING_SYSTEM_INITIALIZED', {
        timestamp: Date.now(),
        services: Object.keys(this.services),
        initializationTime: Date.now() - this.startTime
      });

      this.emit('systemInitialized');
      logger.info('[ORCHESTRATOR] Master Monitoring System initialized successfully');

    } catch (error) {
      logger.error('[ORCHESTRATOR] Failed to initialize monitoring system:', error);
      await this.cleanup();
      throw error;
    }
  }

  /**
   * Registrar todos os serviços
   */
  async registerAllServices() {
    logger.info('[ORCHESTRATOR] Registering monitoring services...');

    // Performance Audit System (já instanciado)
    this.services.performanceAudit = performanceAuditSystem;
    this.serviceRegistry.register('performanceAudit', performanceAuditSystem, {
      critical: true,
      startupOrder: 1,
      shutdownOrder: 99
    });

    // Health Monitor
    const { default: intelligentMonitoringSystem } = require('./intelligentMonitoringSystem');
    this.services.healthMonitor = intelligentMonitoringSystem;
    this.serviceRegistry.register('healthMonitor', intelligentMonitoringSystem, {
      dependencies: ['performanceAudit'],
      critical: true,
      startupOrder: 10,
      shutdownOrder: 90
    });

    // Metrics Collector
    const { default: metricsAggregationEngine } = require('./metricsAggregationEngine');
    this.services.metricsCollector = metricsAggregationEngine;
    this.serviceRegistry.register('metricsCollector', metricsAggregationEngine, {
      dependencies: ['performanceAudit'],
      critical: true,
      startupOrder: 20,
      shutdownOrder: 80
    });

    // Incident Response
    const { default: automatedIncidentResponse } = require('./automatedIncidentResponse');
    this.services.incidentResponse = automatedIncidentResponse;
    this.serviceRegistry.register('incidentResponse', automatedIncidentResponse, {
      dependencies: ['healthMonitor', 'metricsCollector'],
      critical: true,
      startupOrder: 30,
      shutdownOrder: 70
    });

    // Correlation Engine
    const { default: performanceCorrelationEngine } = require('./performanceCorrelationEngine');
    this.services.correlationEngine = performanceCorrelationEngine;
    this.serviceRegistry.register('correlationEngine', performanceCorrelationEngine, {
      dependencies: ['metricsCollector'],
      critical: false,
      startupOrder: 40,
      shutdownOrder: 60
    });

    // Dashboard
    const { default: realtimeDashboard } = require('./realtimeDashboard');
    this.services.dashboard = realtimeDashboard;
    this.serviceRegistry.register('dashboard', realtimeDashboard, {
      dependencies: ['healthMonitor', 'metricsCollector', 'incidentResponse'],
      critical: false,
      startupOrder: 50,
      shutdownOrder: 50
    });

    logger.info('[ORCHESTRATOR] All services registered');
  }

  /**
   * Inicializar serviços em ordem
   */
  async initializeServicesInOrder() {
    logger.info('[ORCHESTRATOR] Initializing services in dependency order...');

    // Obter ordem de inicialização
    const services = Array.from(this.serviceRegistry.services.entries())
      .sort(([,a], [,b]) => a.startupOrder - b.startupOrder);

    // Inicializar sequencialmente
    for (const [serviceName, serviceConfig] of services) {
      try {
        logger.info(`[ORCHESTRATOR] Initializing ${serviceName}...`);
        await this.serviceRegistry.initialize(serviceName);
        
        // Aplicar configuração específica do serviço
        await this.applyServiceConfiguration(serviceName, serviceConfig);
        
      } catch (error) {
        logger.error(`[ORCHESTRATOR] Failed to initialize ${serviceName}:`, error);
        
        if (serviceConfig.critical) {
          throw new Error(`Critical service ${serviceName} failed to initialize: ${error.message}`);
        } else {
          logger.warn(`[ORCHESTRATOR] Non-critical service ${serviceName} failed, continuing...`);
        }
      }
    }
  }

  /**
   * Aplicar configuração do serviço
   */
  async applyServiceConfiguration(serviceName, serviceConfig) {
    const service = serviceConfig.instance;
    const config = this.configManager.get(serviceName) || {};

    if (service.configure && Object.keys(config).length > 0) {
      try {
        service.configure(config);
        logger.debug(`[ORCHESTRATOR] Configuration applied to ${serviceName}`);
      } catch (error) {
        logger.warn(`[ORCHESTRATOR] Failed to apply configuration to ${serviceName}:`, error);
      }
    }
  }

  /**
   * Configurar monitoramento de saúde
   */
  setupHealthMonitoring() {
    // Monitoramento periódico de saúde dos serviços
    setInterval(async () => {
      if (!this.isRunning) return;

      try {
        const healthResults = await this.serviceRegistry.performHealthChecks();
        this.emit('healthCheckCompleted', healthResults);
      } catch (error) {
        logger.error('[ORCHESTRATOR] Health check failed:', error);
      }
    }, this.configManager.get('monitoring.healthCheckInterval'));

    logger.info('[ORCHESTRATOR] Health monitoring configured');
  }

  /**
   * Configurar lifecycle hooks
   */
  setupLifecycleHooks() {
    // Shutdown gracioso
    process.on('SIGTERM', () => this.gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => this.gracefulShutdown('SIGINT'));

    // Reload de configuração
    process.on('SIGUSR1', () => this.reloadConfiguration());
  }

  /**
   * Verificar disponibilidade do sistema
   */
  checkSystemReadiness() {
    const allServices = this.serviceRegistry.getAllServices();
    const criticalServices = Object.values(allServices).filter(s => s.critical);
    const runningCritical = criticalServices.filter(s => s.state === 'running');

    if (runningCritical.length === criticalServices.length) {
      this.emit('systemReady');
      logger.info('[ORCHESTRATOR] All critical services are running - system ready');
    }
  }

  /**
   * Handle serviço não saudável
   */
  async handleUnhealthyService(serviceName) {
    const serviceConfig = this.serviceRegistry.services.get(serviceName);
    
    if (serviceConfig.critical) {
      logger.error(`[ORCHESTRATOR] Critical service ${serviceName} is unhealthy`);
      
      // Tentar reinicializar serviço crítico
      try {
        await this.serviceRegistry.stop(serviceName);
        await this.serviceRegistry.initialize(serviceName);
        logger.info(`[ORCHESTRATOR] Service ${serviceName} restarted successfully`);
      } catch (error) {
        logger.error(`[ORCHESTRATOR] Failed to restart ${serviceName}:`, error);
        this.emit('criticalServiceFailure', serviceName, error);
      }
    }
  }

  /**
   * Handle erro crítico
   */
  async handleCriticalError(error) {
    logger.error('[ORCHESTRATOR] Critical system error detected:', error);
    
    // Auditar erro crítico
    try {
      await performanceAuditSystem.createAuditEntry('CRITICAL_ERROR', {
        error: error.message,
        stack: error.stack,
        timestamp: Date.now()
      });
    } catch (auditError) {
      logger.error('[ORCHESTRATOR] Failed to audit critical error:', auditError);
    }

    this.emit('criticalError', error);
  }

  /**
   * Obter status do sistema
   */
  getSystemStatus() {
    const allServices = this.serviceRegistry.getAllServices();
    const uptime = this.startTime ? Date.now() - this.startTime : 0;
    
    const servicesSummary = {
      total: Object.keys(allServices).length,
      running: Object.values(allServices).filter(s => s.state === 'running').length,
      critical: Object.values(allServices).filter(s => s.critical).length,
      failed: Object.values(allServices).filter(s => s.state === 'failed').length
    };

    return {
      isInitialized: this.isInitialized,
      isRunning: this.isRunning,
      uptime,
      startTime: this.startTime,
      services: allServices,
      servicesSummary,
      configuration: this.configManager.getAll(),
      health: servicesSummary.failed === 0 ? 'healthy' : 'degraded'
    };
  }

  /**
   * Obter métricas do sistema
   */
  async getSystemMetrics() {
    const metrics = {
      timestamp: Date.now(),
      systemStatus: this.getSystemStatus(),
      healthMetrics: null,
      performanceMetrics: null,
      incidentMetrics: null,
      correlationMetrics: null
    };

    try {
      // Health metrics
      if (this.services.healthMonitor) {
        metrics.healthMetrics = this.services.healthMonitor.getDashboardMetrics();
      }

      // Performance metrics
      if (this.services.performanceAudit) {
        metrics.performanceMetrics = this.services.performanceAudit.getDashboardMetrics();
      }

      // Incident metrics
      if (this.services.incidentResponse) {
        metrics.incidentMetrics = this.services.incidentResponse.getIncidentDashboard();
      }

      // Correlation metrics
      if (this.services.correlationEngine) {
        metrics.correlationMetrics = this.services.correlationEngine.getCorrelationDashboard();
      }

    } catch (error) {
      logger.error('[ORCHESTRATOR] Error collecting system metrics:', error);
    }

    return metrics;
  }

  /**
   * Recarregar configuração
   */
  reloadConfiguration() {
    logger.info('[ORCHESTRATOR] Reloading configuration...');
    
    try {
      this.configManager.loadConfiguration();
      
      // Aplicar nova configuração aos serviços
      this.serviceRegistry.services.forEach(async (serviceConfig, serviceName) => {
        await this.applyServiceConfiguration(serviceName, serviceConfig);
      });

      this.emit('configurationReloaded');
      logger.info('[ORCHESTRATOR] Configuration reloaded successfully');
      
    } catch (error) {
      logger.error('[ORCHESTRATOR] Failed to reload configuration:', error);
    }
  }

  /**
   * Atualizar configuração
   */
  updateConfiguration(path, value) {
    this.configManager.set(path, value);
    this.emit('configurationUpdated', path, value);
    logger.info(`[ORCHESTRATOR] Configuration updated: ${path} = ${value}`);
  }

  /**
   * Shutdown gracioso
   */
  async gracefulShutdown(signal) {
    logger.info(`[ORCHESTRATOR] Received ${signal}, initiating graceful shutdown...`);
    
    this.isRunning = false;
    
    try {
      // Auditar shutdown
      await performanceAuditSystem.createAuditEntry('SYSTEM_SHUTDOWN', {
        signal,
        uptime: Date.now() - this.startTime,
        timestamp: Date.now()
      });

      // Parar serviços em ordem reversa
      const services = Array.from(this.serviceRegistry.services.entries())
        .sort(([,a], [,b]) => b.shutdownOrder - a.shutdownOrder);

      for (const [serviceName] of services) {
        try {
          logger.info(`[ORCHESTRATOR] Stopping ${serviceName}...`);
          await this.serviceRegistry.stop(serviceName, true);
        } catch (error) {
          logger.error(`[ORCHESTRATOR] Error stopping ${serviceName}:`, error);
        }
      }

      this.emit('systemShutdown');
      logger.info('[ORCHESTRATOR] Graceful shutdown completed');
      
      process.exit(0);

    } catch (error) {
      logger.error('[ORCHESTRATOR] Error during graceful shutdown:', error);
      process.exit(1);
    }
  }

  /**
   * Cleanup de emergência
   */
  async cleanup() {
    logger.warn('[ORCHESTRATOR] Performing emergency cleanup...');
    
    this.isRunning = false;
    
    // Parar todos os serviços rapidamente
    const stopPromises = Array.from(this.serviceRegistry.services.keys()).map(
      serviceName => this.serviceRegistry.stop(serviceName, false)
    );
    
    await Promise.allSettled(stopPromises);
    logger.info('[ORCHESTRATOR] Emergency cleanup completed');
  }

  /**
   * API de configuração
   */
  configure(config) {
    Object.entries(config).forEach(([key, value]) => {
      this.configManager.set(key, value);
    });
    
    this.emit('systemConfigured', config);
    logger.info('[ORCHESTRATOR] System configuration updated');
  }

  /**
   * Obter configuração
   */
  getConfiguration() {
    return this.configManager.getAll();
  }
}

// Singleton instance
const masterMonitoringOrchestrator = new MasterMonitoringOrchestrator();

module.exports = {
  MasterMonitoringOrchestrator,
  ServiceRegistry,
  ConfigurationManager,
  default: masterMonitoringOrchestrator
};