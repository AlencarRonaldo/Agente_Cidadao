/**
 * SYSTEM INITIALIZER - Complete Integration System Bootstrap
 * 
 * Inicializa todos os componentes da orquestração de integração:
 * - Integration Flow Orchestrator
 * - Performance Monitoring System
 * - Health monitoring e auto-recovery
 * - Graceful shutdown handling
 * 
 * @author Integration Flow Orchestrator
 * @priority CRITICAL - System Bootstrap
 */

const logger = require('./utils/logger');
const integrationFlowOrchestrator = require('./services/integrationFlowOrchestrator');
const performanceMonitoringSystem = require('./services/performanceMonitoringSystem');

/**
 * SYSTEM INITIALIZER - Classe Principal
 */
class SystemInitializer {
  constructor() {
    this.components = new Map();
    this.isInitialized = false;
    this.shutdownHandlers = [];
    this.healthCheckInterval = null;
    this.startTime = null;
  }

  /**
   * Inicializar sistema completo
   */
  async initialize() {
    if (this.isInitialized) {
      logger.warn('[SYSTEM] Sistema já inicializado');
      return;
    }

    this.startTime = Date.now();
    logger.info('[SYSTEM] ========================================');
    logger.info('[SYSTEM] INICIANDO INTEGRATION ORCHESTRATION SYSTEM');
    logger.info('[SYSTEM] ========================================');

    try {
      // 1. Registrar componentes
      this.registerComponents();

      // 2. Inicializar componentes em ordem
      await this.initializeComponents();

      // 3. Setup monitoramento de saúde
      this.setupHealthMonitoring();

      // 4. Setup handlers de shutdown
      this.setupShutdownHandlers();

      // 5. Setup event forwarding
      this.setupEventForwarding();

      this.isInitialized = true;
      const initTime = Date.now() - this.startTime;
      
      logger.info('[SYSTEM] ========================================');
      logger.info(`[SYSTEM] SISTEMA INICIALIZADO COM SUCESSO (${initTime}ms)`);
      logger.info('[SYSTEM] ========================================');

      // Log status dos componentes
      this.logComponentStatus();

      return {
        success: true,
        initializationTime: initTime,
        components: Array.from(this.components.keys())
      };

    } catch (error) {
      logger.error('[SYSTEM] ========================================');
      logger.error('[SYSTEM] FALHA NA INICIALIZAÇÃO DO SISTEMA');
      logger.error('[SYSTEM] ========================================');
      logger.error('[SYSTEM] Erro:', error);

      await this.cleanup();
      throw error;
    }
  }

  /**
   * Registrar componentes do sistema
   */
  registerComponents() {
    logger.info('[SYSTEM] Registrando componentes...');

    this.components.set('performanceMonitoring', {
      name: 'Performance Monitoring System',
      instance: performanceMonitoringSystem,
      priority: 1, // Inicializar primeiro
      healthCheck: () => performanceMonitoringSystem.isRunning,
      dependencies: []
    });

    this.components.set('integrationOrchestrator', {
      name: 'Integration Flow Orchestrator',
      instance: integrationFlowOrchestrator,
      priority: 2,
      healthCheck: () => integrationFlowOrchestrator.isInitialized,
      dependencies: ['performanceMonitoring']
    });

    logger.info(`[SYSTEM] ${this.components.size} componentes registrados`);
  }

  /**
   * Inicializar componentes em ordem de prioridade
   */
  async initializeComponents() {
    logger.info('[SYSTEM] Inicializando componentes...');

    // Ordenar por prioridade
    const sortedComponents = Array.from(this.components.entries())
      .sort(([, a], [, b]) => a.priority - b.priority);

    for (const [key, component] of sortedComponents) {
      await this.initializeComponent(key, component);
    }
  }

  /**
   * Inicializar componente individual
   */
  async initializeComponent(key, component) {
    const startTime = Date.now();
    
    try {
      logger.info(`[SYSTEM] Inicializando ${component.name}...`);

      // Verificar dependências
      await this.checkDependencies(component.dependencies);

      // Inicializar componente
      if (component.instance && typeof component.instance.initialize === 'function') {
        await component.instance.initialize();
      }

      // Verificar se inicialização foi bem-sucedida
      if (component.healthCheck && !component.healthCheck()) {
        throw new Error(`Health check falhou para ${component.name}`);
      }

      const initTime = Date.now() - startTime;
      logger.info(`[SYSTEM] ✓ ${component.name} inicializado (${initTime}ms)`);

      // Registrar métricas de inicialização
      if (performanceMonitoringSystem.isRunning) {
        performanceMonitoringSystem.recordMetric('system', 'component_init_time', initTime, {
          component: key,
          success: true
        });
      }

    } catch (error) {
      const initTime = Date.now() - startTime;
      logger.error(`[SYSTEM] ✗ Falha ao inicializar ${component.name} (${initTime}ms):`, error);

      // Registrar métrica de falha
      if (performanceMonitoringSystem.isRunning) {
        performanceMonitoringSystem.recordMetric('system', 'component_init_time', initTime, {
          component: key,
          success: false,
          error: error.message
        });
      }

      throw error;
    }
  }

  /**
   * Verificar dependências
   */
  async checkDependencies(dependencies) {
    for (const dep of dependencies) {
      const component = this.components.get(dep);
      if (!component) {
        throw new Error(`Dependência não encontrada: ${dep}`);
      }

      if (component.healthCheck && !component.healthCheck()) {
        throw new Error(`Dependência não saudável: ${dep}`);
      }
    }
  }

  /**
   * Setup monitoramento de saúde
   */
  setupHealthMonitoring() {
    logger.info('[SYSTEM] Configurando monitoramento de saúde...');

    this.healthCheckInterval = setInterval(async () => {
      await this.performSystemHealthCheck();
    }, 60000); // A cada 1 minuto

    // Health check inicial
    setTimeout(() => {
      this.performSystemHealthCheck();
    }, 10000); // Após 10 segundos
  }

  /**
   * Realizar health check do sistema
   */
  async performSystemHealthCheck() {
    try {
      const healthStatus = {
        timestamp: new Date().toISOString(),
        uptime: Date.now() - this.startTime,
        components: {},
        overall: 'healthy'
      };

      let unhealthyComponents = 0;

      // Verificar cada componente
      for (const [key, component] of this.components.entries()) {
        try {
          const isHealthy = component.healthCheck ? component.healthCheck() : true;
          
          healthStatus.components[key] = {
            name: component.name,
            healthy: isHealthy,
            lastCheck: new Date().toISOString()
          };

          if (!isHealthy) {
            unhealthyComponents++;
            logger.warn(`[SYSTEM] Componente não saudável: ${component.name}`);
          }

        } catch (error) {
          healthStatus.components[key] = {
            name: component.name,
            healthy: false,
            error: error.message,
            lastCheck: new Date().toISOString()
          };
          unhealthyComponents++;
          logger.error(`[SYSTEM] Erro no health check de ${component.name}:`, error);
        }
      }

      // Determinar status geral
      if (unhealthyComponents === 0) {
        healthStatus.overall = 'healthy';
      } else if (unhealthyComponents < this.components.size / 2) {
        healthStatus.overall = 'degraded';
      } else {
        healthStatus.overall = 'critical';
      }

      // Registrar métricas
      if (performanceMonitoringSystem.isRunning) {
        performanceMonitoringSystem.recordGauge('system_health', 
          unhealthyComponents === 0 ? 1 : 0, {
            unhealthyComponents,
            totalComponents: this.components.size,
            status: healthStatus.overall
          });
      }

      // Log status se não estiver saudável
      if (healthStatus.overall !== 'healthy') {
        logger.warn(`[SYSTEM] Status do sistema: ${healthStatus.overall} (${unhealthyComponents}/${this.components.size} componentes não saudáveis)`);
      }

      // Emitir evento de health check
      this.emit('healthCheck', healthStatus);

    } catch (error) {
      logger.error('[SYSTEM] Erro no health check do sistema:', error);
    }
  }

  /**
   * Setup handlers de shutdown
   */
  setupShutdownHandlers() {
    logger.info('[SYSTEM] Configurando handlers de shutdown...');

    const signals = ['SIGINT', 'SIGTERM', 'SIGUSR2'];
    
    signals.forEach(signal => {
      process.on(signal, () => {
        logger.info(`[SYSTEM] Sinal ${signal} recebido, iniciando shutdown graceful...`);
        this.shutdown(signal);
      });
    });

    // Handler para uncaught exceptions
    process.on('uncaughtException', async (error) => {
      logger.error('[SYSTEM] Uncaught Exception:', error);
      await this.shutdown('uncaughtException');
      process.exit(1);
    });

    // Handler para unhandled rejections
    process.on('unhandledRejection', async (reason, promise) => {
      logger.error('[SYSTEM] Unhandled Rejection at:', promise, 'reason:', reason);
      await this.shutdown('unhandledRejection');
      process.exit(1);
    });
  }

  /**
   * Setup event forwarding
   */
  setupEventForwarding() {
    logger.info('[SYSTEM] Configurando event forwarding...');

    // Forward eventos do integration orchestrator
    if (integrationFlowOrchestrator) {
      integrationFlowOrchestrator.on('healthDegraded', (data) => {
        logger.warn('[SYSTEM] Saúde degradada reportada:', data);
        this.emit('componentHealthDegraded', { component: 'integrationOrchestrator', ...data });
      });

      integrationFlowOrchestrator.on('systemPaused', (data) => {
        logger.warn('[SYSTEM] Sistema pausado:', data);
        this.emit('systemPaused', data);
      });

      integrationFlowOrchestrator.on('flowCompleted', (data) => {
        if (performanceMonitoringSystem.isRunning) {
          performanceMonitoringSystem.recordCounter('flows_completed');
          performanceMonitoringSystem.recordMetric('flow', 'duration', data.duration, {
            flowId: data.flowId,
            success: data.success
          });
        }
      });
    }

    // Forward eventos do performance monitoring
    if (performanceMonitoringSystem) {
      performanceMonitoringSystem.on('alert', (alert) => {
        logger.warn('[SYSTEM] Alerta de performance:', alert);
        this.emit('performanceAlert', alert);
      });

      performanceMonitoringSystem.on('metricsCollected', (metrics) => {
        // Processar métricas importantes
        if (metrics.cpu?.percent > 90) {
          logger.warn(`[SYSTEM] CPU crítica: ${metrics.cpu.percent.toFixed(1)}%`);
        }
        if (metrics.memory?.system?.percent > 95) {
          logger.warn(`[SYSTEM] Memória crítica: ${metrics.memory.system.percent.toFixed(1)}%`);
        }
      });
    }
  }

  /**
   * Log status dos componentes
   */
  logComponentStatus() {
    logger.info('[SYSTEM] Status dos componentes:');
    
    for (const [key, component] of this.components.entries()) {
      const isHealthy = component.healthCheck ? component.healthCheck() : true;
      const status = isHealthy ? '✓ Saudável' : '✗ Não saudável';
      logger.info(`[SYSTEM]   ${component.name}: ${status}`);
    }
  }

  /**
   * Coordenar fluxo (API pública)
   */
  async coordinateFlow(flowData) {
    if (!this.isInitialized) {
      throw new Error('Sistema não inicializado');
    }

    logger.info('[SYSTEM] Coordenando fluxo através do sistema...');
    
    const startTime = Date.now();
    
    try {
      const result = await integrationFlowOrchestrator.coordinateFlow(flowData);
      
      const duration = Date.now() - startTime;
      logger.info(`[SYSTEM] Fluxo coordenado com sucesso (${duration}ms)`);
      
      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`[SYSTEM] Erro na coordenação do fluxo (${duration}ms):`, error);
      
      // Registrar métrica de erro
      if (performanceMonitoringSystem.isRunning) {
        performanceMonitoringSystem.recordCounter('flow_errors');
        performanceMonitoringSystem.recordMetric('flow', 'error_duration', duration, {
          error: error.message
        });
      }
      
      throw error;
    }
  }

  /**
   * Obter status do sistema
   */
  getSystemStatus() {
    const status = {
      initialized: this.isInitialized,
      uptime: this.startTime ? Date.now() - this.startTime : 0,
      components: {},
      metrics: null,
      recommendations: null
    };

    // Status dos componentes
    for (const [key, component] of this.components.entries()) {
      status.components[key] = {
        name: component.name,
        healthy: component.healthCheck ? component.healthCheck() : true
      };
    }

    // Métricas atuais
    if (performanceMonitoringSystem.isRunning) {
      status.metrics = performanceMonitoringSystem.getCurrentMetrics();
      status.recommendations = performanceMonitoringSystem.getRecommendations();
    }

    // Stats do integration orchestrator
    if (integrationFlowOrchestrator.isInitialized) {
      status.orchestrator = integrationFlowOrchestrator.getStats();
    }

    return status;
  }

  /**
   * Gerar relatório do sistema
   */
  async generateSystemReport() {
    logger.info('[SYSTEM] Gerando relatório do sistema...');

    const report = {
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      systemStatus: this.getSystemStatus(),
      performanceReport: null,
      healthHistory: null
    };

    // Relatório de performance
    if (performanceMonitoringSystem.isRunning) {
      report.performanceReport = await performanceMonitoringSystem.generateReport();
    }

    // Adicionar informações específicas do sistema
    report.systemInfo = {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      pid: process.pid,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage()
    };

    logger.info('[SYSTEM] Relatório do sistema gerado');
    return report;
  }

  /**
   * Cleanup interno
   */
  async cleanup() {
    logger.info('[SYSTEM] Executando cleanup...');

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    this.isInitialized = false;
  }

  /**
   * Shutdown graceful
   */
  async shutdown(signal = 'SIGTERM') {
    logger.info('[SYSTEM] ========================================');
    logger.info(`[SYSTEM] INICIANDO SHUTDOWN GRACEFUL (${signal})`);
    logger.info('[SYSTEM] ========================================');

    const shutdownStart = Date.now();

    try {
      // 1. Parar recebimento de novos requests
      this.isInitialized = false;

      // 2. Gerar relatório final
      try {
        const finalReport = await this.generateSystemReport();
        
        // Salvar relatório
        const fs = require('fs').promises;
        const reportsDir = require('path').join(process.cwd(), 'reports', 'system');
        await fs.mkdir(reportsDir, { recursive: true });
        
        const reportPath = require('path').join(reportsDir, `shutdown-report-${Date.now()}.json`);
        await fs.writeFile(reportPath, JSON.stringify(finalReport, null, 2));
        
        logger.info(`[SYSTEM] Relatório final salvo: ${reportPath}`);
      } catch (error) {
        logger.warn('[SYSTEM] Erro ao gerar relatório final:', error);
      }

      // 3. Shutdown componentes em ordem reversa
      const sortedComponents = Array.from(this.components.entries())
        .sort(([, a], [, b]) => b.priority - a.priority);

      for (const [key, component] of sortedComponents) {
        try {
          logger.info(`[SYSTEM] Finalizando ${component.name}...`);
          
          if (component.instance && typeof component.instance.shutdown === 'function') {
            await component.instance.shutdown();
          }
          
          logger.info(`[SYSTEM] ✓ ${component.name} finalizado`);
        } catch (error) {
          logger.error(`[SYSTEM] Erro ao finalizar ${component.name}:`, error);
        }
      }

      // 4. Cleanup interno
      await this.cleanup();

      const shutdownTime = Date.now() - shutdownStart;
      logger.info('[SYSTEM] ========================================');
      logger.info(`[SYSTEM] SHUTDOWN CONCLUÍDO (${shutdownTime}ms)`);
      logger.info('[SYSTEM] ========================================');

      // 5. Exit gracefully
      process.exit(0);

    } catch (error) {
      const shutdownTime = Date.now() - shutdownStart;
      logger.error('[SYSTEM] ========================================');
      logger.error(`[SYSTEM] ERRO NO SHUTDOWN (${shutdownTime}ms)`);
      logger.error('[SYSTEM] ========================================');
      logger.error('[SYSTEM] Erro:', error);
      
      process.exit(1);
    }
  }

  /**
   * EventEmitter methods
   */
  emit(event, ...args) {
    // Implementação básica de EventEmitter para logging
    logger.debug(`[SYSTEM] Evento emitido: ${event}`);
  }
}

// Singleton instance
const systemInitializer = new SystemInitializer();

module.exports = systemInitializer;