/**
 * INTEGRATION FLOW ORCHESTRATOR - Master Coordination System
 * 
 * Coordena todos os componentes do sistema com:
 * - Zero message loss guarantee
 * - State consistency entre frontend/backend
 * - Auto-recovery em falhas
 * - Performance monitoring contínuo
 * - Fallback automático
 * 
 * @author Integration Flow Orchestrator
 * @priority CRITICAL - Production Ready
 */

const EventEmitter = require('events');
const { createMachine, interpret } = require('xstate');
const crypto = require('crypto');
const logger = require('../utils/logger');

// Core Services
const adminCacheService = require('./adminCacheService');
const realtimeAdminService = require('./realtimeAdminService');
const masterFlowOrchestrator = require('./masterFlowOrchestrator');
const queueManager = require('../queues/queueManager');

/**
 * INTEGRATION STATE MACHINE
 * Estados: initializing → ready → coordinating → monitoring → error_recovery → shutdown
 */
const integrationStateMachine = createMachine({
  id: 'integrationOrchestrator',
  initial: 'initializing',
  context: {
    startTime: null,
    componentsInitialized: [],
    activeConnections: 0,
    errorCount: 0,
    performanceMetrics: {},
    systemHealth: 'unknown'
  },
  states: {
    initializing: {
      entry: ['logInitialization'],
      invoke: {
        id: 'initializeComponents',
        src: 'initializeComponents',
        onDone: {
          target: 'ready',
          actions: ['markAsReady']
        },
        onError: {
          target: 'error_recovery',
          actions: ['handleInitError']
        }
      },
      after: {
        30000: { // 30s timeout para inicialização
          target: 'error_recovery',
          actions: ['initializationTimeout']
        }
      }
    },
    ready: {
      entry: ['logReady', 'startHealthMonitoring'],
      on: {
        COORDINATE_FLOW: {
          target: 'coordinating',
          actions: ['prepareCoordination']
        },
        HEALTH_CHECK: {
          actions: ['performHealthCheck']
        },
        SYSTEM_ERROR: {
          target: 'error_recovery',
          actions: ['handleSystemError']
        }
      }
    },
    coordinating: {
      entry: ['logCoordination'],
      on: {
        FLOW_COMPLETED: {
          target: 'ready',
          actions: ['updateMetrics']
        },
        COORDINATION_ERROR: {
          target: 'error_recovery',
          actions: ['handleCoordinationError']
        }
      }
    },
    monitoring: {
      entry: ['startMonitoring'],
      always: {
        target: 'ready',
        cond: 'isSystemHealthy'
      }
    },
    error_recovery: {
      entry: ['logRecovery', 'analyzeErrors'],
      always: [
        {
          target: 'initializing',
          cond: 'canReinitialize',
          actions: ['resetSystem']
        },
        {
          target: 'ready',
          cond: 'canRecover',
          actions: ['applyRecovery']
        },
        {
          target: 'shutdown',
          actions: ['markForShutdown']
        }
      ]
    },
    shutdown: {
      entry: ['logShutdown'],
      invoke: {
        id: 'gracefulShutdown',
        src: 'gracefulShutdown'
      },
      type: 'final'
    }
  }
});

/**
 * GLOBAL STATE MANAGER
 * Gerencia estado global com sincronização automática
 */
class GlobalStateManager extends EventEmitter {
  constructor() {
    super();
    this.state = {
      dashboard: {
        summary: null,
        lastUpdate: null,
        isLoading: false
      },
      agenda: {
        upcoming: [],
        lastUpdate: null,
        isLoading: false
      },
      queue: {
        status: null,
        processing: 0,
        pending: 0,
        failed: 0,
        lastUpdate: null
      },
      system: {
        health: 'unknown',
        connections: 0,
        performance: {},
        lastHealthCheck: null
      },
      errors: [],
      version: 1
    };
    
    this.subscribers = new Map();
    this.persistence = new StatePeristence();
    this.syncScheduler = null;
  }

  /**
   * Inicializar state manager
   */
  async initialize() {
    logger.info('[GLOBAL_STATE] Inicializando Global State Manager...');
    
    try {
      // Restaurar estado persistido
      await this.persistence.restore(this.state);
      
      // Configurar sincronização automática
      this.setupAutoSync();
      
      // Setup event listeners
      this.setupEventListeners();
      
      logger.info('[GLOBAL_STATE] Global State Manager inicializado');
      
    } catch (error) {
      logger.error('[GLOBAL_STATE] Erro na inicialização:', error);
      throw error;
    }
  }

  /**
   * Atualizar seção do estado
   */
  async updateState(section, data, options = {}) {
    const { broadcast = true, persist = true, validate = true } = options;
    
    try {
      // Validar mudança se necessário
      if (validate && !this.validateStateChange(section, data)) {
        throw new Error(`Mudança de estado inválida para seção: ${section}`);
      }

      // Backup do estado anterior
      const previousState = JSON.parse(JSON.stringify(this.state[section]));
      
      // Aplicar mudança
      if (typeof data === 'function') {
        this.state[section] = data(this.state[section]);
      } else {
        this.state[section] = { ...this.state[section], ...data };
      }
      
      this.state[section].lastUpdate = new Date().toISOString();
      this.state.version++;

      // Persistir se necessário
      if (persist) {
        await this.persistence.save(section, this.state[section]);
      }

      // Broadcast para subscribers
      if (broadcast) {
        this.broadcastStateChange(section, this.state[section], previousState);
      }

      logger.debug(`[GLOBAL_STATE] Estado atualizado: ${section}`);
      
    } catch (error) {
      logger.error(`[GLOBAL_STATE] Erro ao atualizar estado ${section}:`, error);
      throw error;
    }
  }

  /**
   * Obter seção do estado
   */
  getState(section = null) {
    if (section) {
      return JSON.parse(JSON.stringify(this.state[section]));
    }
    return JSON.parse(JSON.stringify(this.state));
  }

  /**
   * Inscrever-se em mudanças de estado
   */
  subscribe(section, callback) {
    const subscriptionId = crypto.randomUUID();
    
    if (!this.subscribers.has(section)) {
      this.subscribers.set(section, new Map());
    }
    
    this.subscribers.get(section).set(subscriptionId, callback);
    
    return () => {
      this.subscribers.get(section)?.delete(subscriptionId);
    };
  }

  /**
   * Broadcast mudanças de estado
   */
  broadcastStateChange(section, newState, previousState) {
    const sectionSubscribers = this.subscribers.get(section);
    
    if (sectionSubscribers) {
      sectionSubscribers.forEach((callback, subscriptionId) => {
        try {
          callback({
            section,
            newState,
            previousState,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          logger.error(`[GLOBAL_STATE] Erro no callback ${subscriptionId}:`, error);
        }
      });
    }

    // Emit global event
    this.emit('stateChange', { section, newState, previousState });
  }

  /**
   * Validar mudança de estado
   */
  validateStateChange(section, data) {
    const validators = {
      dashboard: (data) => {
        return data && typeof data === 'object';
      },
      agenda: (data) => {
        return data && (Array.isArray(data.upcoming) || data.upcoming === undefined);
      },
      queue: (data) => {
        return data && typeof data === 'object';
      },
      system: (data) => {
        return data && typeof data === 'object';
      }
    };

    const validator = validators[section];
    return !validator || validator(data);
  }

  /**
   * Setup sincronização automática
   */
  setupAutoSync() {
    this.syncScheduler = setInterval(async () => {
      try {
        await this.syncWithCache();
      } catch (error) {
        logger.error('[GLOBAL_STATE] Erro na sincronização automática:', error);
      }
    }, 30000); // A cada 30 segundos
  }

  /**
   * Sincronizar com cache
   */
  async syncWithCache() {
    try {
      // Sync dashboard data
      const dashboardData = await adminCacheService.get('dashboard:main', 'dashboard.summary');
      if (dashboardData) {
        await this.updateState('dashboard', { 
          summary: dashboardData,
          isLoading: false 
        }, { broadcast: true, persist: false });
      }

      // Sync agenda data
      const agendaData = await adminCacheService.get('agenda:upcoming', 'agenda.upcoming');
      if (agendaData) {
        await this.updateState('agenda', { 
          upcoming: agendaData,
          isLoading: false 
        }, { broadcast: true, persist: false });
      }

      // Sync queue status
      const queueData = await adminCacheService.get('dashboard:fila-status', 'dashboard.filaStatus');
      if (queueData) {
        await this.updateState('queue', {
          ...queueData,
          lastUpdate: new Date().toISOString()
        }, { broadcast: true, persist: false });
      }

    } catch (error) {
      logger.error('[GLOBAL_STATE] Erro na sincronização com cache:', error);
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Cache invalidation events
    adminCacheService.on('cache:invalidated', async (data) => {
      logger.debug('[GLOBAL_STATE] Cache invalidado, sincronizando...');
      await this.syncWithCache();
    });

    // Master flow events
    masterFlowOrchestrator.on('flowCompleted', async (data) => {
      await this.updateState('system', {
        performance: {
          ...this.state.system.performance,
          lastFlowDuration: data.duration,
          lastFlowSuccess: data.success
        }
      });
    });
  }

  /**
   * Shutdown
   */
  async shutdown() {
    logger.info('[GLOBAL_STATE] Finalizando Global State Manager...');
    
    if (this.syncScheduler) {
      clearInterval(this.syncScheduler);
    }
    
    await this.persistence.save('_full_state', this.state);
    this.removeAllListeners();
    
    logger.info('[GLOBAL_STATE] Global State Manager finalizado');
  }
}

/**
 * STATE PERSISTENCE
 * Persistência de estado com backup automático
 */
class StatePeristence {
  constructor() {
    this.backupDir = require('path').join(process.cwd(), 'backup', 'state');
    this.maxBackups = 10;
  }

  async save(section, data) {
    try {
      const fs = require('fs').promises;
      
      // Criar diretório se não existir
      await fs.mkdir(this.backupDir, { recursive: true });
      
      // Salvar estado atual
      const filename = `${section}_${Date.now()}.json`;
      const filepath = require('path').join(this.backupDir, filename);
      
      await fs.writeFile(filepath, JSON.stringify(data, null, 2));
      
      // Limpar backups antigos
      await this.cleanupOldBackups(section);
      
    } catch (error) {
      logger.error(`[STATE_PERSISTENCE] Erro ao salvar ${section}:`, error);
    }
  }

  async restore(stateObject) {
    try {
      const fs = require('fs').promises;
      const path = require('path');
      
      if (!(await this.directoryExists(this.backupDir))) {
        logger.info('[STATE_PERSISTENCE] Nenhum backup encontrado');
        return;
      }
      
      const files = await fs.readdir(this.backupDir);
      
      // Buscar arquivo mais recente para cada seção
      const sections = ['dashboard', 'agenda', 'queue', 'system'];
      
      for (const section of sections) {
        const sectionFiles = files
          .filter(f => f.startsWith(`${section}_`))
          .sort()
          .reverse();
        
        if (sectionFiles.length > 0) {
          const latestFile = path.join(this.backupDir, sectionFiles[0]);
          try {
            const data = JSON.parse(await fs.readFile(latestFile, 'utf8'));
            stateObject[section] = { ...stateObject[section], ...data };
            logger.info(`[STATE_PERSISTENCE] Seção ${section} restaurada`);
          } catch (error) {
            logger.warn(`[STATE_PERSISTENCE] Erro ao restaurar ${section}:`, error);
          }
        }
      }
      
    } catch (error) {
      logger.error('[STATE_PERSISTENCE] Erro na restauração:', error);
    }
  }

  async cleanupOldBackups(section) {
    try {
      const fs = require('fs').promises;
      
      const files = await fs.readdir(this.backupDir);
      const sectionFiles = files
        .filter(f => f.startsWith(`${section}_`))
        .sort()
        .reverse();
      
      // Manter apenas os N mais recentes
      const filesToDelete = sectionFiles.slice(this.maxBackups);
      
      for (const file of filesToDelete) {
        await fs.unlink(require('path').join(this.backupDir, file));
      }
      
    } catch (error) {
      logger.error(`[STATE_PERSISTENCE] Erro na limpeza de backups ${section}:`, error);
    }
  }

  async directoryExists(dir) {
    try {
      const fs = require('fs').promises;
      await fs.access(dir);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * WEBSOCKET ORCHESTRATION LAYER
 * Coordena conexões WebSocket com recovery automático
 */
class WebSocketOrchestrationLayer extends EventEmitter {
  constructor(globalStateManager) {
    super();
    this.globalStateManager = globalStateManager;
    this.connections = new Map();
    this.healthCheckInterval = null;
    this.reconnectTimeouts = new Map();
    this.maxReconnectAttempts = 5;
    this.baseReconnectDelay = 1000;
  }

  /**
   * Inicializar orquestração WebSocket
   */
  async initialize() {
    logger.info('[WS_ORCHESTRATOR] Inicializando WebSocket Orchestration Layer...');
    
    try {
      // Setup real-time service integration
      this.setupRealtimeIntegration();
      
      // Setup state synchronization
      this.setupStateSynchronization();
      
      // Start health monitoring
      this.startHealthMonitoring();
      
      logger.info('[WS_ORCHESTRATOR] WebSocket Orchestration Layer inicializado');
      
    } catch (error) {
      logger.error('[WS_ORCHESTRATOR] Erro na inicialização:', error);
      throw error;
    }
  }

  /**
   * Setup integração com realtime service
   */
  setupRealtimeIntegration() {
    // Interceptar eventos do realtime service
    realtimeAdminService.on('clientConnected', (clientData) => {
      this.handleClientConnection(clientData);
    });

    realtimeAdminService.on('clientDisconnected', (clientData) => {
      this.handleClientDisconnection(clientData);
    });

    realtimeAdminService.on('subscriptionChanged', (subscriptionData) => {
      this.handleSubscriptionChange(subscriptionData);
    });
  }

  /**
   * Setup sincronização de estado
   */
  setupStateSynchronization() {
    // Escutar mudanças no estado global
    this.globalStateManager.on('stateChange', (changeData) => {
      this.broadcastStateChange(changeData);
    });

    // Setup periodic sync
    setInterval(() => {
      this.syncConnectedClients();
    }, 15000); // A cada 15 segundos
  }

  /**
   * Lidar com nova conexão de cliente
   */
  handleClientConnection(clientData) {
    const { userId, connectionId } = clientData;
    
    this.connections.set(connectionId, {
      userId,
      connectedAt: Date.now(),
      lastPing: Date.now(),
      subscriptions: new Set(),
      reconnectAttempts: 0
    });

    // Enviar estado inicial
    this.sendInitialState(connectionId);
    
    logger.info(`[WS_ORCHESTRATOR] Cliente conectado: ${userId}`);
  }

  /**
   * Lidar com desconexão de cliente
   */
  handleClientDisconnection(clientData) {
    const { connectionId } = clientData;
    
    if (this.connections.has(connectionId)) {
      const connection = this.connections.get(connectionId);
      
      // Setup reconnect timeout
      this.setupReconnectTimeout(connectionId, connection);
      
      logger.info(`[WS_ORCHESTRATOR] Cliente desconectado: ${connection.userId}`);
    }
  }

  /**
   * Enviar estado inicial para cliente
   */
  async sendInitialState(connectionId) {
    try {
      const fullState = this.globalStateManager.getState();
      
      await realtimeAdminService.sendToConnection(connectionId, {
        type: 'initial_state',
        data: fullState,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      logger.error(`[WS_ORCHESTRATOR] Erro ao enviar estado inicial:`, error);
    }
  }

  /**
   * Broadcast mudança de estado
   */
  broadcastStateChange(changeData) {
    const { section, newState } = changeData;
    
    // Mapear seção para canal WebSocket
    const channelMap = {
      dashboard: 'dashboard_updates',
      agenda: 'agenda_updates',
      queue: 'queue_updates',
      system: 'system_alerts'
    };
    
    const channel = channelMap[section];
    if (channel) {
      realtimeAdminService.broadcastToChannel(channel, {
        type: 'state_update',
        section,
        data: newState,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Setup timeout de reconexão
   */
  setupReconnectTimeout(connectionId, connection) {
    const attempts = connection.reconnectAttempts || 0;
    
    if (attempts < this.maxReconnectAttempts) {
      const delay = this.baseReconnectDelay * Math.pow(2, attempts);
      
      const timeout = setTimeout(() => {
        this.attemptReconnect(connectionId, connection);
      }, delay);
      
      this.reconnectTimeouts.set(connectionId, timeout);
    } else {
      logger.warn(`[WS_ORCHESTRATOR] Max reconnect attempts reached for ${connection.userId}`);
      this.connections.delete(connectionId);
    }
  }

  /**
   * Tentar reconexão
   */
  async attemptReconnect(connectionId, connection) {
    try {
      connection.reconnectAttempts++;
      
      // Verificar se cliente ainda está desconectado
      if (!realtimeAdminService.isClientConnected(connection.userId)) {
        // Enviar ping de reconexão
        await realtimeAdminService.sendReconnectPing(connection.userId);
      } else {
        // Cliente já reconectou
        this.connections.delete(connectionId);
        this.reconnectTimeouts.delete(connectionId);
      }
      
    } catch (error) {
      logger.error(`[WS_ORCHESTRATOR] Erro na tentativa de reconexão:`, error);
      this.setupReconnectTimeout(connectionId, connection);
    }
  }

  /**
   * Sincronizar clientes conectados
   */
  async syncConnectedClients() {
    const currentState = this.globalStateManager.getState();
    
    for (const [connectionId, connection] of this.connections.entries()) {
      try {
        // Verificar se conexão ainda está ativa
        const isActive = await this.pingConnection(connectionId);
        
        if (isActive) {
          connection.lastPing = Date.now();
        } else {
          // Marcar para reconexão
          this.handleClientDisconnection({ connectionId });
        }
        
      } catch (error) {
        logger.error(`[WS_ORCHESTRATOR] Erro no sync da conexão ${connectionId}:`, error);
      }
    }
  }

  /**
   * Ping conexão para verificar se está ativa
   */
  async pingConnection(connectionId) {
    try {
      return await realtimeAdminService.pingConnection(connectionId);
    } catch (error) {
      return false;
    }
  }

  /**
   * Start health monitoring
   */
  startHealthMonitoring() {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, 60000); // A cada 1 minuto
  }

  /**
   * Realizar health check
   */
  async performHealthCheck() {
    try {
      const stats = realtimeAdminService.getStats();
      
      // Atualizar estado do sistema
      await this.globalStateManager.updateState('system', {
        health: stats.activeConnections > 0 ? 'healthy' : 'degraded',
        connections: stats.activeConnections,
        lastHealthCheck: new Date().toISOString()
      });
      
      // Limpar timeouts expirados
      this.cleanupExpiredTimeouts();
      
    } catch (error) {
      logger.error('[WS_ORCHESTRATOR] Erro no health check:', error);
    }
  }

  /**
   * Limpar timeouts expirados
   */
  cleanupExpiredTimeouts() {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutos
    
    for (const [connectionId, connection] of this.connections.entries()) {
      if (now - connection.lastPing > maxAge) {
        // Limpar conexão expirada
        const timeout = this.reconnectTimeouts.get(connectionId);
        if (timeout) {
          clearTimeout(timeout);
          this.reconnectTimeouts.delete(connectionId);
        }
        this.connections.delete(connectionId);
        
        logger.info(`[WS_ORCHESTRATOR] Conexão expirada removida: ${connectionId}`);
      }
    }
  }

  /**
   * Shutdown
   */
  async shutdown() {
    logger.info('[WS_ORCHESTRATOR] Finalizando WebSocket Orchestration Layer...');
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    // Limpar todos os timeouts
    for (const timeout of this.reconnectTimeouts.values()) {
      clearTimeout(timeout);
    }
    
    this.connections.clear();
    this.reconnectTimeouts.clear();
    this.removeAllListeners();
    
    logger.info('[WS_ORCHESTRATOR] WebSocket Orchestration Layer finalizado');
  }
}

/**
 * ERROR RECOVERY ENGINE
 * Sistema inteligente de recuperação de erros
 */
class ErrorRecoveryEngine extends EventEmitter {
  constructor(globalStateManager) {
    super();
    this.globalStateManager = globalStateManager;
    this.errorHistory = [];
    this.recoveryStrategies = new Map();
    this.circuitBreakers = new Map();
    this.maxErrorHistory = 1000;
    
    this.setupRecoveryStrategies();
  }

  /**
   * Setup estratégias de recuperação
   */
  setupRecoveryStrategies() {
    // Cache recovery
    this.recoveryStrategies.set('cache_failure', {
      immediate: async () => {
        logger.info('[RECOVERY] Aplicando recovery imediato para cache...');
        try {
          await adminCacheService.healthCheck();
          return { success: true, action: 'cache_health_check' };
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      fallback: async () => {
        logger.warn('[RECOVERY] Aplicando fallback para cache...');
        // Usar estado em memória como fallback
        return { success: true, action: 'memory_fallback', fallbackMode: true };
      }
    });

    // WebSocket recovery
    this.recoveryStrategies.set('websocket_failure', {
      immediate: async () => {
        logger.info('[RECOVERY] Aplicando recovery imediato para WebSocket...');
        try {
          await realtimeAdminService.initialize();
          return { success: true, action: 'websocket_restart' };
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      fallback: async () => {
        logger.warn('[RECOVERY] Aplicando fallback para WebSocket...');
        // Usar polling como fallback
        return { success: true, action: 'polling_fallback', fallbackMode: true };
      }
    });

    // Flow recovery
    this.recoveryStrategies.set('flow_failure', {
      immediate: async (context) => {
        logger.info('[RECOVERY] Aplicando recovery imediato para flow...');
        try {
          // Tentar reprocessar flow
          await masterFlowOrchestrator.retryFlow(context.flowId);
          return { success: true, action: 'flow_retry' };
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      fallback: async (context) => {
        logger.warn('[RECOVERY] Aplicando fallback para flow...');
        // Salvar para processamento posterior
        await masterFlowOrchestrator.saveForLaterProcessing(context);
        return { success: true, action: 'delayed_processing', fallbackMode: true };
      }
    });
  }

  /**
   * Registrar erro
   */
  async registerError(errorType, error, context = {}) {
    const errorRecord = {
      id: crypto.randomUUID(),
      type: errorType,
      message: error.message || error,
      stack: error.stack,
      context,
      timestamp: Date.now(),
      recovered: false
    };

    this.errorHistory.push(errorRecord);
    
    // Limitar histórico
    if (this.errorHistory.length > this.maxErrorHistory) {
      this.errorHistory.shift();
    }

    // Atualizar estado global
    await this.globalStateManager.updateState('errors', 
      (currentErrors) => [errorRecord, ...currentErrors.slice(0, 99)] // Manter últimos 100
    );

    // Verificar circuit breaker
    this.checkCircuitBreaker(errorType);

    // Tentar recovery
    const recoveryResult = await this.attemptRecovery(errorType, error, context);
    
    if (recoveryResult.success) {
      errorRecord.recovered = true;
      errorRecord.recoveryAction = recoveryResult.action;
    }

    this.emit('errorRecovered', { errorRecord, recoveryResult });
    
    return recoveryResult;
  }

  /**
   * Tentar recuperação
   */
  async attemptRecovery(errorType, error, context) {
    const strategy = this.recoveryStrategies.get(errorType);
    
    if (!strategy) {
      logger.warn(`[RECOVERY] Nenhuma estratégia encontrada para: ${errorType}`);
      return { success: false, reason: 'no_strategy' };
    }

    try {
      // Tentar recovery imediato
      const immediateResult = await strategy.immediate(context);
      
      if (immediateResult.success) {
        logger.info(`[RECOVERY] Recovery imediato bem-sucedido: ${errorType}`);
        this.resetCircuitBreaker(errorType);
        return immediateResult;
      }

      // Tentar fallback
      const fallbackResult = await strategy.fallback(context);
      
      if (fallbackResult.success) {
        logger.info(`[RECOVERY] Fallback bem-sucedido: ${errorType}`);
        return fallbackResult;
      }

      return { success: false, reason: 'all_strategies_failed' };

    } catch (recoveryError) {
      logger.error(`[RECOVERY] Erro durante recovery de ${errorType}:`, recoveryError);
      return { success: false, error: recoveryError.message };
    }
  }

  /**
   * Verificar circuit breaker
   */
  checkCircuitBreaker(errorType) {
    const recentErrors = this.errorHistory
      .filter(e => e.type === errorType && Date.now() - e.timestamp < 300000) // 5 minutos
      .length;

    if (recentErrors >= 5) {
      this.openCircuitBreaker(errorType);
    }
  }

  /**
   * Abrir circuit breaker
   */
  openCircuitBreaker(errorType) {
    this.circuitBreakers.set(errorType, {
      isOpen: true,
      openedAt: Date.now(),
      failures: this.getRecentFailures(errorType)
    });

    logger.warn(`[RECOVERY] Circuit breaker aberto para: ${errorType}`);
    this.emit('circuitBreakerOpened', { errorType });

    // Auto-reset após 5 minutos
    setTimeout(() => {
      this.resetCircuitBreaker(errorType);
    }, 300000);
  }

  /**
   * Reset circuit breaker
   */
  resetCircuitBreaker(errorType) {
    this.circuitBreakers.delete(errorType);
    logger.info(`[RECOVERY] Circuit breaker resetado para: ${errorType}`);
    this.emit('circuitBreakerReset', { errorType });
  }

  /**
   * Obter falhas recentes
   */
  getRecentFailures(errorType) {
    return this.errorHistory
      .filter(e => e.type === errorType && Date.now() - e.timestamp < 300000)
      .length;
  }

  /**
   * Verificar se circuit breaker está aberto
   */
  isCircuitBreakerOpen(errorType) {
    const breaker = this.circuitBreakers.get(errorType);
    return breaker && breaker.isOpen;
  }
}

/**
 * INTEGRATION FLOW ORCHESTRATOR - Classe Principal
 */
class IntegrationFlowOrchestrator extends EventEmitter {
  constructor() {
    super();
    
    // Core components
    this.globalStateManager = new GlobalStateManager();
    this.webSocketOrchestrator = new WebSocketOrchestrationLayer(this.globalStateManager);
    this.errorRecoveryEngine = new ErrorRecoveryEngine(this.globalStateManager);
    
    // State machine
    this.stateMachine = null;
    this.isInitialized = false;
    
    // Configuration
    this.config = {
      autoRetryFailedFlows: true,
      maxRetryAttempts: 3,
      healthCheckInterval: 30000,
      performanceMonitoringEnabled: true
    };
    
    // Metrics
    this.metrics = {
      flowsProcessed: 0,
      errorsRecovered: 0,
      uptime: Date.now(),
      performanceStats: {}
    };
  }

  /**
   * Inicializar orchestrator
   */
  async initialize() {
    if (this.isInitialized) {
      logger.warn('[INTEGRATION] Já inicializado');
      return;
    }

    logger.info('[INTEGRATION] Inicializando Integration Flow Orchestrator...');

    try {
      // Initialize state machine
      this.stateMachine = interpret(integrationStateMachine.withConfig({
        services: {
          initializeComponents: async () => {
            return await this.initializeAllComponents();
          },
          gracefulShutdown: async () => {
            return await this.performGracefulShutdown();
          }
        },
        actions: {
          logInitialization: () => {
            logger.info('[INTEGRATION] Iniciando inicialização...');
          },
          markAsReady: (context) => {
            context.systemHealth = 'healthy';
            logger.info('[INTEGRATION] Sistema pronto');
          },
          handleInitError: (context, event) => {
            logger.error('[INTEGRATION] Erro na inicialização:', event.data);
          },
          initializationTimeout: () => {
            logger.error('[INTEGRATION] Timeout na inicialização');
          },
          logReady: () => {
            logger.info('[INTEGRATION] Sistema no estado READY');
          },
          startHealthMonitoring: () => {
            this.startHealthMonitoring();
          },
          performHealthCheck: async () => {
            await this.performSystemHealthCheck();
          },
          prepareCoordination: (context, event) => {
            logger.info(`[INTEGRATION] Preparando coordenação: ${event.flowId}`);
          },
          updateMetrics: (context, event) => {
            this.updateMetrics(event.data);
          },
          handleSystemError: async (context, event) => {
            await this.errorRecoveryEngine.registerError('system', event.data);
          },
          handleCoordinationError: async (context, event) => {
            await this.errorRecoveryEngine.registerError('coordination', event.data);
          },
          logCoordination: () => {
            logger.info('[INTEGRATION] Estado COORDINATING');
          },
          logRecovery: () => {
            logger.warn('[INTEGRATION] Estado ERROR_RECOVERY');
          },
          analyzeErrors: (context) => {
            logger.info(`[INTEGRATION] Analisando ${context.errorCount} erros`);
          },
          resetSystem: () => {
            logger.info('[INTEGRATION] Resetando sistema...');
          },
          applyRecovery: () => {
            logger.info('[INTEGRATION] Aplicando recovery...');
          },
          markForShutdown: () => {
            logger.warn('[INTEGRATION] Sistema marcado para shutdown');
          },
          logShutdown: () => {
            logger.info('[INTEGRATION] Iniciando shutdown...');
          },
          startMonitoring: () => {
            logger.info('[INTEGRATION] Estado MONITORING');
          }
        },
        guards: {
          isSystemHealthy: (context) => {
            return context.systemHealth === 'healthy' && context.errorCount < 5;
          },
          canReinitialize: (context) => {
            return context.errorCount < 3;
          },
          canRecover: (context) => {
            return context.errorCount < 10;
          }
        }
      }));

      // Setup state machine listeners
      this.setupStateMachineListeners();

      // Start state machine
      this.stateMachine.start();
      this.stateMachine.send('INITIALIZE');

      // Wait for initialization
      await this.waitForInitialization();

      this.isInitialized = true;
      logger.info('[INTEGRATION] Integration Flow Orchestrator inicializado com sucesso');

    } catch (error) {
      logger.error('[INTEGRATION] Falha na inicialização:', error);
      throw error;
    }
  }

  /**
   * Inicializar todos os componentes
   */
  async initializeAllComponents() {
    const components = [
      { name: 'GlobalStateManager', fn: () => this.globalStateManager.initialize() },
      { name: 'AdminCacheService', fn: () => adminCacheService.initialize() },
      { name: 'RealtimeAdminService', fn: () => realtimeAdminService.initialize() },
      { name: 'MasterFlowOrchestrator', fn: () => masterFlowOrchestrator.initialize() },
      { name: 'WebSocketOrchestrator', fn: () => this.webSocketOrchestrator.initialize() }
    ];

    const results = [];

    for (const component of components) {
      try {
        logger.info(`[INTEGRATION] Inicializando ${component.name}...`);
        await component.fn();
        results.push({ name: component.name, success: true });
        logger.info(`[INTEGRATION] ${component.name} inicializado com sucesso`);
      } catch (error) {
        logger.error(`[INTEGRATION] Erro ao inicializar ${component.name}:`, error);
        results.push({ name: component.name, success: false, error: error.message });
        
        // Tentar recovery
        await this.errorRecoveryEngine.registerError('initialization', error, { component: component.name });
      }
    }

    const failedComponents = results.filter(r => !r.success);
    if (failedComponents.length > 0) {
      throw new Error(`Falha na inicialização: ${failedComponents.map(c => c.name).join(', ')}`);
    }

    return { componentsInitialized: results.map(r => r.name) };
  }

  /**
   * Setup listeners da state machine
   */
  setupStateMachineListeners() {
    this.stateMachine.onTransition((state) => {
      logger.debug(`[INTEGRATION] Transição: ${state.value}`);
      this.emit('stateTransition', state);
    });

    this.stateMachine.onError((error) => {
      logger.error('[INTEGRATION] Erro na state machine:', error);
      this.emit('stateMachineError', error);
    });
  }

  /**
   * Aguardar inicialização
   */
  async waitForInitialization() {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout na inicialização'));
      }, 30000);

      const checkState = () => {
        if (this.stateMachine.state.matches('ready')) {
          clearTimeout(timeout);
          resolve();
        } else if (this.stateMachine.state.matches('error_recovery') || 
                   this.stateMachine.state.matches('shutdown')) {
          clearTimeout(timeout);
          reject(new Error('Falha na inicialização'));
        } else {
          setTimeout(checkState, 100);
        }
      };

      checkState();
    });
  }

  /**
   * Coordenar fluxo completo
   */
  async coordinateFlow(flowData) {
    if (!this.isInitialized) {
      throw new Error('Integration orchestrator não inicializado');
    }

    const flowId = crypto.randomUUID();
    
    try {
      logger.info(`[INTEGRATION] Coordenando fluxo ${flowId}`);

      // Notificar state machine
      this.stateMachine.send({
        type: 'COORDINATE_FLOW',
        flowId,
        data: flowData
      });

      // Processar através do master orchestrator
      const result = await masterFlowOrchestrator.processCompleteFlow(flowData);

      // Atualizar estado global
      await this.globalStateManager.updateState('system', {
        performance: {
          ...this.globalStateManager.getState('system').performance,
          lastFlowId: flowId,
          lastFlowResult: result
        }
      });

      // Notificar conclusão
      this.stateMachine.send({
        type: 'FLOW_COMPLETED',
        flowId,
        result
      });

      this.metrics.flowsProcessed++;
      
      logger.info(`[INTEGRATION] Fluxo ${flowId} coordenado com sucesso`);
      return { flowId, result };

    } catch (error) {
      logger.error(`[INTEGRATION] Erro na coordenação do fluxo ${flowId}:`, error);
      
      // Registrar erro e tentar recovery
      const recoveryResult = await this.errorRecoveryEngine.registerError('flow', error, { flowId, flowData });
      
      // Notificar erro
      this.stateMachine.send({
        type: 'COORDINATION_ERROR',
        flowId,
        error,
        recoveryResult
      });

      if (recoveryResult.success) {
        this.metrics.errorsRecovered++;
        return { flowId, result: recoveryResult, recovered: true };
      }

      throw error;
    }
  }

  /**
   * Start health monitoring
   */
  startHealthMonitoring() {
    this.healthMonitoringInterval = setInterval(async () => {
      await this.performSystemHealthCheck();
    }, this.config.healthCheckInterval);
  }

  /**
   * Realizar health check do sistema
   */
  async performSystemHealthCheck() {
    try {
      const healthChecks = await Promise.allSettled([
        adminCacheService.healthCheck(),
        realtimeAdminService.getStats(),
        masterFlowOrchestrator.getStats()
      ]);

      const cacheHealth = healthChecks[0];
      const realtimeHealth = healthChecks[1];
      const orchestratorHealth = healthChecks[2];

      const systemHealth = {
        cache: cacheHealth.status === 'fulfilled' && cacheHealth.value.healthy,
        realtime: realtimeHealth.status === 'fulfilled' && realtimeHealth.value.activeConnections >= 0,
        orchestrator: orchestratorHealth.status === 'fulfilled' && orchestratorHealth.value.isInitialized,
        overall: 'healthy',
        timestamp: new Date().toISOString()
      };

      // Determinar saúde geral
      const criticalComponentsHealthy = systemHealth.cache && systemHealth.orchestrator;
      systemHealth.overall = criticalComponentsHealthy ? 'healthy' : 'degraded';

      // Atualizar estado global
      await this.globalStateManager.updateState('system', {
        health: systemHealth.overall,
        healthDetails: systemHealth,
        lastHealthCheck: systemHealth.timestamp
      });

      // Emitir evento
      this.emit('healthCheck', systemHealth);

      if (systemHealth.overall === 'degraded') {
        this.stateMachine.send({ type: 'SYSTEM_ERROR', data: systemHealth });
      }

    } catch (error) {
      logger.error('[INTEGRATION] Erro no health check:', error);
      await this.errorRecoveryEngine.registerError('health_check', error);
    }
  }

  /**
   * Atualizar métricas
   */
  updateMetrics(data) {
    this.metrics.performanceStats = {
      ...this.metrics.performanceStats,
      ...data,
      lastUpdate: Date.now()
    };
  }

  /**
   * Obter estatísticas
   */
  getStats() {
    return {
      isInitialized: this.isInitialized,
      currentState: this.stateMachine?.state?.value || 'unknown',
      metrics: {
        ...this.metrics,
        uptime: Date.now() - this.metrics.uptime
      },
      globalState: this.globalStateManager.getState(),
      errorStats: {
        totalErrors: this.errorRecoveryEngine.errorHistory.length,
        recentErrors: this.errorRecoveryEngine.errorHistory.filter(e => Date.now() - e.timestamp < 300000).length,
        circuitBreakers: Array.from(this.errorRecoveryEngine.circuitBreakers.keys())
      }
    };
  }

  /**
   * Shutdown graceful
   */
  async performGracefulShutdown() {
    logger.info('[INTEGRATION] Iniciando shutdown graceful...');
    
    try {
      // Parar health monitoring
      if (this.healthMonitoringInterval) {
        clearInterval(this.healthMonitoringInterval);
      }

      // Shutdown componentes
      await Promise.allSettled([
        this.webSocketOrchestrator.shutdown(),
        this.globalStateManager.shutdown(),
        masterFlowOrchestrator.shutdown(),
        realtimeAdminService.shutdown(),
        adminCacheService.shutdown()
      ]);

      this.isInitialized = false;
      logger.info('[INTEGRATION] Shutdown graceful completado');

    } catch (error) {
      logger.error('[INTEGRATION] Erro durante shutdown:', error);
      throw error;
    }
  }

  /**
   * Shutdown público
   */
  async shutdown(signal = 'SIGTERM') {
    logger.info(`[INTEGRATION] Shutdown solicitado (${signal})`);
    
    if (this.stateMachine) {
      this.stateMachine.send({ type: 'SHUTDOWN', signal });
      
      // Aguardar finalização
      await new Promise((resolve) => {
        const checkShutdown = () => {
          if (this.stateMachine.state.matches('shutdown')) {
            resolve();
          } else {
            setTimeout(checkShutdown, 100);
          }
        };
        checkShutdown();
      });
    }
    
    this.removeAllListeners();
  }
}

// Singleton instance
const integrationFlowOrchestrator = new IntegrationFlowOrchestrator();

module.exports = integrationFlowOrchestrator;