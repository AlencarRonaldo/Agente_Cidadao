/**
 * INTEGRATED FLOW CONTROLLER - Controlador Principal do Sistema Integrado
 * 
 * Orquestrador central que une todos os componentes implementados:
 * - MasterFlowOrchestrator (Layer 4)
 * - WhatsAppStabilityEngine (Layer 1)
 * - InstagramHumanizationEngine (Layer 2)
 * - ErrorRecoveryEngine (Layer 3)
 * - PerformanceAuditSystem (Monitoring)
 * 
 * @author Integration Flow Orchestrator
 * @priority CRITICAL - Production System Controller
 */

const EventEmitter = require('events');
const logger = require('../utils/logger');

// Core Components
const masterFlowOrchestrator = require('./masterFlowOrchestrator');
const errorRecoveryEngineModule = require('./errorRecoveryEngine');
const errorRecoveryEngine = errorRecoveryEngineModule.default;
const performanceAuditSystemModule = require('./performanceAuditSystem');
const performanceAuditSystem = performanceAuditSystemModule.default;
const queueManager = require('../queues/queueManager');

// Services
const whatsappService = require('./whatsappService-robust');

/**
 * INTEGRATED FLOW CONTROLLER - Classe Principal
 */
class IntegratedFlowController extends EventEmitter {
  constructor() {
    super();
    
    this.components = {
      orchestrator: masterFlowOrchestrator,
      errorRecovery: errorRecoveryEngine,
      performanceAudit: performanceAuditSystem,
      queueManager: queueManager
    };
    
    this.isInitialized = false;
    this.isRunning = false;
    this.systemHealth = {
      status: 'STARTING',
      components: {},
      lastCheck: null,
      issues: []
    };
    
    this.config = {
      healthCheckInterval: 30000, // 30 segundos
      maxInitializationTime: 120000, // 2 minutos
      gracefulShutdownTimeout: 30000 // 30 segundos
    };
    
    this.healthCheckInterval = null;
    this.startTime = Date.now();
    
    this.setupEventListeners();
  }

  /**
   * Inicializar todo o sistema integrado
   */
  async initialize() {
    if (this.isInitialized) {
      logger.warn('[INTEGRATED-CONTROLLER] Sistema já inicializado');
      return;
    }

    logger.info('[INTEGRATED-CONTROLLER] 🚀 Iniciando sistema integrado...');
    
    const initStart = Date.now();
    const initializationTimeout = setTimeout(() => {
      throw new Error('Timeout na inicialização do sistema');
    }, this.config.maxInitializationTime);

    try {
      this.systemHealth.status = 'INITIALIZING';
      
      // Etapa 1: Inicializar Queue Manager
      logger.info('[INTEGRATED-CONTROLLER] 📋 Inicializando Queue Manager...');
      await this.components.queueManager.initialize();
      this.systemHealth.components.queueManager = { status: 'HEALTHY', lastCheck: Date.now() };
      
      // Etapa 2: Inicializar Performance Audit System
      logger.info('[INTEGRATED-CONTROLLER] 📊 Inicializando Performance Audit System...');
      await this.components.performanceAudit.initialize();
      this.systemHealth.components.performanceAudit = { status: 'HEALTHY', lastCheck: Date.now() };
      
      // Etapa 2.5: Inicializar Error Recovery Engine
      logger.info('[INTEGRATED-CONTROLLER] 🛡️ Inicializando Error Recovery Engine...');
      await this.components.errorRecovery.initialize();
      this.systemHealth.components.errorRecovery = { status: 'HEALTHY', lastCheck: Date.now() };
      
      // Etapa 4: Inicializar Master Flow Orchestrator
      logger.info('[INTEGRATED-CONTROLLER] 🎭 Inicializando Master Flow Orchestrator...');
      await this.components.orchestrator.initialize();
      this.systemHealth.components.orchestrator = { status: 'HEALTHY', lastCheck: Date.now() };
      
      // Etapa 5: Integrar com WhatsApp Service
      logger.info('[INTEGRATED-CONTROLLER] 📱 Integrando WhatsApp Service...');
      await this.integrateWhatsAppService();
      this.systemHealth.components.whatsapp = { status: 'HEALTHY', lastCheck: Date.now() };
      
      clearTimeout(initializationTimeout);
      
      // Sistema inicializado com sucesso
      this.isInitialized = true;
      this.isRunning = true;
      this.systemHealth.status = 'RUNNING';
      this.systemHealth.lastCheck = Date.now();
      
      // Iniciar monitoramento de saúde
      this.startHealthMonitoring();
      
      // Criar auditoria de inicialização
      await this.components.performanceAudit.createAuditEntry('SYSTEM_INITIALIZED', {
        initializationTime: Date.now() - initStart,
        components: Object.keys(this.systemHealth.components),
        version: '1.0.0'
      });
      
      const initTime = Date.now() - initStart;
      logger.info(`[INTEGRATED-CONTROLLER] ✅ Sistema integrado inicializado com sucesso em ${initTime}ms`);
      
      this.emit('systemInitialized', {
        initializationTime: initTime,
        components: this.systemHealth.components
      });
      
    } catch (error) {
      clearTimeout(initializationTimeout);
      this.systemHealth.status = 'FAILED';
      
      logger.error('[INTEGRATED-CONTROLLER] ❌ Falha na inicialização:', error);
      
      // Tentar criar auditoria de falha
      try {
        await this.components.performanceAudit.createAuditEntry('SYSTEM_INITIALIZATION_FAILED', {
          error: error.message,
          initializationTime: Date.now() - initStart
        });
      } catch (auditError) {
        logger.error('[INTEGRATED-CONTROLLER] Falha ao auditar erro de inicialização:', auditError);
      }
      
      throw error;
    }
  }

  /**
   * Integrar com WhatsApp Service
   */
  async integrateWhatsAppService() {
    try {
      // Hook para processar mensagens através do sistema integrado
      const originalHandleMessage = whatsappService.handleMessage?.bind(whatsappService);
      
      if (originalHandleMessage) {
        whatsappService.handleMessage = async (message) => {
          logger.info('[INTEGRATED-CONTROLLER] 📨 Processando mensagem WhatsApp através do sistema integrado');
          
          try {
            // Processar através do Master Flow Orchestrator
            const flowId = await this.components.orchestrator.processCompleteFlow(message);
            
            logger.info(`[INTEGRATED-CONTROLLER] ✅ Mensagem processada - Flow ID: ${flowId}`);
            return { success: true, flowId };
            
          } catch (error) {
            logger.error('[INTEGRATED-CONTROLLER] ❌ Erro ao processar mensagem:', error);
            
            // Tentar recovery através do error engine
            try {
              const recoveryResult = await this.components.errorRecovery.executeRecovery(
                error,
                {
                  service: 'whatsapp',
                  operation: 'handleMessage',
                  originalData: message,
                  retryOperation: () => originalHandleMessage(message)
                }
              );
              
              logger.info('[INTEGRATED-CONTROLLER] ✅ Mensagem recuperada através do error recovery');
              return recoveryResult;
              
            } catch (recoveryError) {
              logger.error('[INTEGRATED-CONTROLLER] ❌ Falha no recovery da mensagem:', recoveryError);
              throw recoveryError;
            }
          }
        };
      }
      
      logger.info('[INTEGRATED-CONTROLLER] 🔗 WhatsApp Service integrado com sucesso');
      
    } catch (error) {
      logger.error('[INTEGRATED-CONTROLLER] ❌ Falha na integração WhatsApp:', error);
      throw error;
    }
  }

  /**
   * Iniciar monitoramento de saúde
   */
  startHealthMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, this.config.healthCheckInterval);
    
    logger.info('[INTEGRATED-CONTROLLER] 💓 Monitoramento de saúde iniciado');
  }

  /**
   * Executar verificação de saúde
   */
  async performHealthCheck() {
    logger.debug('[INTEGRATED-CONTROLLER] 🔍 Executando health check...');
    
    try {
      const healthResults = {};
      const issues = [];
      
      // Check Queue Manager
      try {
        const queueHealth = await this.components.queueManager.healthCheck();
        healthResults.queueManager = {
          status: queueHealth.healthy ? 'HEALTHY' : 'UNHEALTHY',
          details: queueHealth,
          lastCheck: Date.now()
        };
        
        if (!queueHealth.healthy) {
          issues.push(`Queue Manager: ${queueHealth.reason || 'Unhealthy'}`);
        }
      } catch (error) {
        healthResults.queueManager = {
          status: 'ERROR',
          error: error.message,
          lastCheck: Date.now()
        };
        issues.push(`Queue Manager: ${error.message}`);
      }
      
      // Check Master Flow Orchestrator
      try {
        const orchestratorStats = this.components.orchestrator.getStats();
        healthResults.orchestrator = {
          status: orchestratorStats.isInitialized ? 'HEALTHY' : 'UNHEALTHY',
          details: orchestratorStats,
          lastCheck: Date.now()
        };
        
        if (!orchestratorStats.isInitialized) {
          issues.push('Master Flow Orchestrator: Not initialized');
        }
        
        if (orchestratorStats.activeFlows >= orchestratorStats.maxConcurrentFlows) {
          issues.push('Master Flow Orchestrator: Max concurrent flows reached');
        }
      } catch (error) {
        healthResults.orchestrator = {
          status: 'ERROR',
          error: error.message,
          lastCheck: Date.now()
        };
        issues.push(`Master Flow Orchestrator: ${error.message}`);
      }
      
      // Check Error Recovery Engine
      try {
        const recoveryStats = this.components.errorRecovery.getRecoveryStats();
        const successRate = recoveryStats.successRate;
        
        healthResults.errorRecovery = {
          status: successRate > 70 ? 'HEALTHY' : 'DEGRADED',
          details: recoveryStats,
          lastCheck: Date.now()
        };
        
        if (successRate <= 70) {
          issues.push(`Error Recovery: Low success rate (${successRate.toFixed(1)}%)`);
        }
      } catch (error) {
        healthResults.errorRecovery = {
          status: 'ERROR',
          error: error.message,
          lastCheck: Date.now()
        };
        issues.push(`Error Recovery: ${error.message}`);
      }
      
      // Check Performance Audit System
      try {
        const auditReport = this.components.performanceAudit.generateAuditReport(300000); // 5 minutos
        healthResults.performanceAudit = {
          status: auditReport.integrityStatus.valid ? 'HEALTHY' : 'UNHEALTHY',
          details: auditReport,
          lastCheck: Date.now()
        };
        
        if (!auditReport.integrityStatus.valid) {
          issues.push('Performance Audit: Integrity issues detected');
        }
      } catch (error) {
        healthResults.performanceAudit = {
          status: 'ERROR',
          error: error.message,
          lastCheck: Date.now()
        };
        issues.push(`Performance Audit: ${error.message}`);
      }
      
      // Atualizar status geral do sistema
      this.systemHealth.components = healthResults;
      this.systemHealth.issues = issues;
      this.systemHealth.lastCheck = Date.now();
      
      const overallHealthy = issues.length === 0;
      const previousStatus = this.systemHealth.status;
      
      if (overallHealthy && this.isRunning) {
        this.systemHealth.status = 'RUNNING';
      } else if (issues.length > 0 && issues.length < 3) {
        this.systemHealth.status = 'DEGRADED';
      } else {
        this.systemHealth.status = 'UNHEALTHY';
      }
      
      // Emitir eventos de mudança de status
      if (previousStatus !== this.systemHealth.status) {
        logger.warn(`[INTEGRATED-CONTROLLER] Status mudou: ${previousStatus} → ${this.systemHealth.status}`);
        this.emit('statusChanged', {
          previous: previousStatus,
          current: this.systemHealth.status,
          issues: issues
        });
      }
      
      // Log issues críticos
      if (issues.length > 0) {
        logger.warn(`[INTEGRATED-CONTROLLER] Health check encontrou ${issues.length} problema(s):`, issues);
      } else {
        logger.debug('[INTEGRATED-CONTROLLER] ✅ Health check passou - sistema saudável');
      }
      
      this.emit('healthCheckCompleted', this.systemHealth);
      
    } catch (error) {
      logger.error('[INTEGRATED-CONTROLLER] ❌ Erro no health check:', error);
      this.systemHealth.status = 'ERROR';
      this.systemHealth.issues = [`Health check failed: ${error.message}`];
    }
  }

  /**
   * Processar mensagem única (API externa)
   */
  async processMessage(message, options = {}) {
    if (!this.isRunning) {
      throw new Error('Sistema não está rodando');
    }

    logger.info('[INTEGRATED-CONTROLLER] 📨 Processando mensagem via API externa');
    
    const measurementId = this.components.performanceAudit.startMeasurement(
      'external_api',
      'processMessage',
      { source: 'api', ...options }
    );

    try {
      const flowId = await this.components.orchestrator.processCompleteFlow(message);
      
      this.components.performanceAudit.finalizeMeasurement(measurementId, {
        success: true,
        flowId
      });
      
      return {
        success: true,
        flowId,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      this.components.performanceAudit.finalizeMeasurement(measurementId, {
        success: false,
        error: error.message
      });
      
      throw error;
    }
  }

  /**
   * Obter status completo do sistema
   */
  getSystemStatus() {
    const uptime = Date.now() - this.startTime;
    
    return {
      system: {
        status: this.systemHealth.status,
        uptime: Math.round(uptime / 1000), // segundos
        isInitialized: this.isInitialized,
        isRunning: this.isRunning,
        lastHealthCheck: this.systemHealth.lastCheck,
        issues: this.systemHealth.issues
      },
      components: this.systemHealth.components,
      metrics: this.components.performanceAudit.getDashboardMetrics(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Setup de event listeners
   */
  setupEventListeners() {
    // Orchestrator events
    this.components.orchestrator.on('flowCompleted', (data) => {
      logger.info(`[INTEGRATED-CONTROLLER] ✅ Flow completado: ${data.flowId}`);
      this.emit('flowCompleted', data);
    });

    this.components.orchestrator.on('systemPaused', (data) => {
      logger.warn('[INTEGRATED-CONTROLLER] ⏸️ Sistema pausado:', data.reason);
      this.systemHealth.status = 'PAUSED';
      this.emit('systemPaused', data);
    });

    // Error Recovery events
    this.components.errorRecovery.on('recoverySuccess', (data) => {
      logger.info(`[INTEGRATED-CONTROLLER] 🛠️ Recovery bem-sucedido: ${data.recoveryId}`);
      this.emit('recoverySuccess', data);
    });

    this.components.errorRecovery.on('recoveryFailed', (data) => {
      logger.error(`[INTEGRATED-CONTROLLER] ❌ Recovery falhou: ${data.recoveryId}`);
      this.emit('recoveryFailed', data);
    });

    // Performance Audit events
    this.components.performanceAudit.on('slaViolation', (data) => {
      logger.warn('[INTEGRATED-CONTROLLER] ⚠️ Violação de SLA:', data);
      this.emit('slaViolation', data);
    });

    // Process events
    process.on('SIGINT', () => this.shutdown('SIGINT'));
    process.on('SIGTERM', () => this.shutdown('SIGTERM'));
    process.on('uncaughtException', (error) => {
      logger.error('[INTEGRATED-CONTROLLER] 💥 Uncaught Exception:', error);
      this.emit('criticalError', { type: 'uncaughtException', error });
    });
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('[INTEGRATED-CONTROLLER] 💥 Unhandled Rejection:', reason);
      this.emit('criticalError', { type: 'unhandledRejection', reason, promise });
    });
  }

  /**
   * Shutdown graceful do sistema
   */
  async shutdown(signal) {
    if (!this.isInitialized) {
      logger.info('[INTEGRATED-CONTROLLER] Sistema não estava inicializado');
      return;
    }

    logger.info(`[INTEGRATED-CONTROLLER] 🛑 Iniciando shutdown graceful (${signal})...`);
    
    const shutdownStart = Date.now();
    this.isRunning = false;
    this.systemHealth.status = 'SHUTTING_DOWN';

    // Timeout de segurança
    const shutdownTimeout = setTimeout(() => {
      logger.error('[INTEGRATED-CONTROLLER] ⏰ Timeout no shutdown - forçando saída');
      process.exit(1);
    }, this.config.gracefulShutdownTimeout);

    try {
      // Parar health monitoring
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = null;
      }

      // Criar auditoria de shutdown
      try {
        await this.components.performanceAudit.createAuditEntry('SYSTEM_SHUTDOWN_STARTED', {
          signal,
          uptime: Date.now() - this.startTime,
          activeComponents: Object.keys(this.systemHealth.components)
        });
      } catch (error) {
        logger.warn('[INTEGRATED-CONTROLLER] Falha ao auditar início do shutdown:', error);
      }

      // Shutdown dos componentes em ordem reversa
      logger.info('[INTEGRATED-CONTROLLER] 📋 Finalizando Master Flow Orchestrator...');
      await this.components.orchestrator.shutdown(signal);

      logger.info('[INTEGRATED-CONTROLLER] 🛡️ Finalizando Error Recovery Engine...');
      await this.components.errorRecovery.shutdown();

      logger.info('[INTEGRATED-CONTROLLER] 📊 Finalizando Performance Audit System...');
      await this.components.performanceAudit.shutdown();

      logger.info('[INTEGRATED-CONTROLLER] 📋 Finalizando Queue Manager...');
      await this.components.queueManager.shutdown();

      clearTimeout(shutdownTimeout);

      const shutdownTime = Date.now() - shutdownStart;
      logger.info(`[INTEGRATED-CONTROLLER] ✅ Shutdown completado em ${shutdownTime}ms`);

      this.systemHealth.status = 'STOPPED';
      this.isInitialized = false;

      this.emit('systemShutdown', {
        signal,
        shutdownTime,
        graceful: true
      });

      // Aguardar um pouco para logs serem escritos
      setTimeout(() => {
        process.exit(0);
      }, 1000);

    } catch (error) {
      clearTimeout(shutdownTimeout);
      
      logger.error('[INTEGRATED-CONTROLLER] ❌ Erro durante shutdown:', error);
      
      this.emit('systemShutdown', {
        signal,
        shutdownTime: Date.now() - shutdownStart,
        graceful: false,
        error: error.message
      });

      process.exit(1);
    }
  }
}

// Singleton instance
const integratedFlowController = new IntegratedFlowController();

module.exports = integratedFlowController;