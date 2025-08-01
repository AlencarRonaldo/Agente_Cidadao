/**
 * Master Flow Controller - Controlador Principal do Fluxo WhatsApp→Instagram
 * Integra todos os sistemas: Diagnóstico, Correção, Fila e Dashboard
 * @author Sistema Bot Denúncia
 */

const logger = require('../utils/logger');
const EventEmitter = require('events');

// Importar todos os sistemas implementados
const ContextualDiagnostics = require('./contextualDiagnostics');
const FlowCorrectionEngine = require('./flowCorrectionEngine');
const IntelligentPostQueue = require('./intelligentPostQueue');
const RealTimeDashboard = require('./realtimeDashboard').default;

class MasterFlowController extends EventEmitter {
  constructor() {
    super();
    
    // Inicializar componentes
    this.diagnostics = new ContextualDiagnostics();
    this.correctionEngine = new FlowCorrectionEngine();
    this.postQueue = new IntelligentPostQueue();
    this.dashboard = RealTimeDashboard;
    
    // Estado do sistema
    this.state = {
      status: 'initializing',
      lastDiagnosis: null,
      lastCorrection: null,
      componentsReady: {
        diagnostics: false,
        correctionEngine: false,
        postQueue: false,
        dashboard: false
      },
      metrics: {
        startTime: Date.now(),
        totalOperations: 0,
        successfulOperations: 0,
        failedOperations: 0,
        postsProcessed: 0,
        errorsHandled: 0
      }
    };
    
    // Configurações
    this.config = {
      autoDiagnosisInterval: 300000, // 5 minutos
      autoCorrection: true,
      emergencyThreshold: 0.3, // 30% taxa de falha para modo emergência
      healthCheckInterval: 60000, // 1 minuto
      maxConcurrentOperations: 3
    };
    
    // Intervalos e timers
    this.intervals = new Map();
    this.activeOperations = new Set();
    
    logger.info('🎛️ [MASTER] Master Flow Controller inicializado');
  }

  /**
   * Inicializar sistema completo
   */
  async initialize() {
    logger.info('🚀 [MASTER] Inicializando Master Flow Controller...');
    
    const startTime = Date.now();
    
    try {
      // FASE 1: Diagnóstico inicial
      logger.info('📊 [MASTER] FASE 1: Executando diagnóstico inicial...');
      const initialDiagnosis = await this.diagnostics.executeDiagnosis();
      this.state.lastDiagnosis = initialDiagnosis;
      this.state.componentsReady.diagnostics = true;
      
      // FASE 2: Inicializar fila de posts
      logger.info('🚥 [MASTER] FASE 2: Inicializando fila de posts...');
      const queueInitialized = await this.postQueue.initialize();
      this.state.componentsReady.postQueue = queueInitialized;
      
      if (!queueInitialized) {
        logger.warn('⚠️ [MASTER] Fila de posts não pôde ser inicializada - continuando sem ela');
      }
      
      // FASE 3: Inicializar dashboard
      logger.info('📊 [MASTER] FASE 3: Inicializando dashboard em tempo real...');
      try {
        await this.dashboard.initialize();
        this.state.componentsReady.dashboard = true;
        logger.info('✅ [MASTER] Dashboard inicializado com sucesso');
      } catch (error) {
        logger.warn('⚠️ [MASTER] Dashboard não pôde ser inicializado - continuando sem ele:', error.message);
        this.state.componentsReady.dashboard = false;
      }
      
      // FASE 4: Aplicar correções se necessário
      if (this.shouldApplyAutoCorrection(initialDiagnosis)) {
        logger.info('🔧 [MASTER] FASE 4: Aplicando correções automáticas...');
        const correctionResult = await this.correctionEngine.executeAutoCorrection();
        this.state.lastCorrection = correctionResult;
        this.state.componentsReady.correctionEngine = true;
      } else {
        logger.info('✅ [MASTER] FASE 4: Sistema saudável - não requer correções');
        this.state.componentsReady.correctionEngine = true;
      }
      
      // FASE 5: Configurar monitoramento automático
      logger.info('⏰ [MASTER] FASE 5: Configurando monitoramento automático...');
      this.setupAutomaticMonitoring();
      
      // FASE 6: Integrar eventos
      logger.info('🔗 [MASTER] FASE 6: Integrando eventos dos componentes...');
      this.setupEventIntegration();
      
      // Finalizar inicialização
      this.state.status = 'running';
      const initTime = Date.now() - startTime;
      
      logger.info(`🎉 [MASTER] Sistema inicializado com sucesso em ${initTime}ms`);
      logger.info(`📈 [MASTER] Status dos componentes:`, this.state.componentsReady);
      
      this.emit('systemInitialized', {
        initTime,
        components: this.state.componentsReady,
        diagnosis: initialDiagnosis.overall_health
      });
      
      return true;
      
    } catch (error) {
      logger.error('❌ [MASTER] Falha na inicialização do sistema:', error.message);
      this.state.status = 'error';
      this.emit('systemError', error);
      return false;
    }
  }

  /**
   * Verificar se deve aplicar correção automática
   */
  shouldApplyAutoCorrection(diagnosis) {
    if (!this.config.autoCorrection) {
      return false;
    }
    
    // Verificar se há problemas críticos
    const overallHealth = diagnosis.overall_health;
    if (overallHealth?.status === 'critical') {
      return true;
    }
    
    // Verificar se há posts pendentes
    const pendingPosts = diagnosis.components?.approval_flow?.approval_events?.data?.pending_posts || 0;
    if (pendingPosts > 0) {
      return true;
    }
    
    // Verificar problemas do Instagram
    const instagramIssues = diagnosis.components?.instagram?.decision?.issues?.length || 0;
    if (instagramIssues > 0) {
      return true;
    }
    
    return false;
  }

  /**
   * Configurar monitoramento automático
   */
  setupAutomaticMonitoring() {
    // Diagnóstico automático
    const diagnosisInterval = setInterval(async () => {
      try {
        await this.executeRoutineDiagnosis();
      } catch (error) {
        logger.error('❌ [MASTER] Erro no diagnóstico automático:', error.message);
        this.handleSystemError(error);
      }
    }, this.config.autoDiagnosisInterval);
    
    this.intervals.set('diagnosis', diagnosisInterval);
    
    // Health check
    const healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        logger.error('❌ [MASTER] Erro no health check:', error.message);
        this.handleSystemError(error);
      }
    }, this.config.healthCheckInterval);
    
    this.intervals.set('healthCheck', healthCheckInterval);
    
    logger.info('⏰ [MASTER] Monitoramento automático configurado');
  }

  /**
   * Configurar integração de eventos
   */
  setupEventIntegration() {
    // Eventos da fila de posts
    if (this.state.componentsReady.postQueue) {
      this.postQueue.on('itemCompleted', (item) => {
        this.state.metrics.postsProcessed++;
        this.state.metrics.successfulOperations++;
        this.emit('postProcessed', item);
        
        logger.info(`📤 [MASTER] Post processado com sucesso: ${item.id}`);
      });
      
      this.postQueue.on('itemFailed', (item) => {
        this.state.metrics.failedOperations++;
        this.emit('postFailed', item);
        
        logger.error(`❌ [MASTER] Falha no processamento do post: ${item.id}`);
        
        // Verificar se precisa executar correção de emergência
        this.checkEmergencyConditions();
      });
      
      this.postQueue.on('processingStarted', () => {
        this.emit('queueProcessingStarted');
      });
      
      this.postQueue.on('processingFinished', () => {
        this.emit('queueProcessingFinished');
      });
    }
    
    // Eventos do sistema de correção
    this.correctionEngine.on('correctionCompleted', (result) => {
      this.state.lastCorrection = result;
      this.emit('systemCorrected', result);
      
      logger.info(`🔧 [MASTER] Correção aplicada: ${result.summary?.corrections_applied || 0} correções`);
    });
    
    // Eventos do dashboard
    if (this.state.componentsReady.dashboard) {
      this.dashboard.on('clientConnected', (client) => {
        this.emit('dashboardClientConnected', client);
      });
      
      this.dashboard.on('systemError', (error) => {
        logger.error('❌ [MASTER] Erro no dashboard:', error.message);
        this.handleSystemError(error);
      });
    }
    
    logger.info('🔗 [MASTER] Integração de eventos configurada');
  }

  /**
   * Executar diagnóstico de rotina
   */
  async executeRoutineDiagnosis() {
    if (this.activeOperations.has('diagnosis')) {
      logger.debug('[MASTER] Diagnóstico já em execução - pulando');
      return;
    }
    
    this.activeOperations.add('diagnosis');
    
    try {
      logger.debug('🔍 [MASTER] Executando diagnóstico de rotina...');
      
      const diagnosis = await this.diagnostics.executeDiagnosis();
      this.state.lastDiagnosis = diagnosis;
      this.state.metrics.totalOperations++;
      
      // Verificar se precisa de correção
      if (this.shouldApplyAutoCorrection(diagnosis)) {
        logger.info('🔧 [MASTER] Diagnóstico detectou problemas - aplicando correção...');
        await this.executeAutoCorrection();
      }
      
      // Emitir evento
      this.emit('routineDiagnosisCompleted', diagnosis);
      
      logger.debug('✅ [MASTER] Diagnóstico de rotina concluído');
      
    } catch (error) {
      logger.error('❌ [MASTER] Falha no diagnóstico de rotina:', error.message);
      this.state.metrics.failedOperations++;
      this.handleSystemError(error);
    } finally {
      this.activeOperations.delete('diagnosis');
    }
  }

  /**
   * Executar correção automática
   */
  async executeAutoCorrection() {
    if (this.activeOperations.has('correction')) {
      logger.debug('[MASTER] Correção já em execução - pulando');
      return;
    }
    
    this.activeOperations.add('correction');
    
    try {
      logger.info('🔧 [MASTER] Executando correção automática...');
      
      const correctionResult = await this.correctionEngine.executeAutoCorrection();
      this.state.lastCorrection = correctionResult;
      this.state.metrics.totalOperations++;
      
      if (correctionResult.summary?.status === 'fully_resolved') {
        this.state.metrics.successfulOperations++;
        logger.info('✅ [MASTER] Correção automática bem-sucedida');
      } else {
        this.state.metrics.failedOperations++;
        logger.warn('⚠️ [MASTER] Correção automática parcialmente bem-sucedida');
      }
      
      this.emit('autoCorrectionCompleted', correctionResult);
      
    } catch (error) {
      logger.error('❌ [MASTER] Falha na correção automática:', error.message);
      this.state.metrics.failedOperations++;
      this.handleSystemError(error);
    } finally {
      this.activeOperations.delete('correction');
    }
  }

  /**
   * Verificar condições de emergência
   */
  async checkEmergencyConditions() {
    const totalOps = this.state.metrics.totalOperations;
    if (totalOps === 0) return;
    
    const failureRate = this.state.metrics.failedOperations / totalOps;
    
    if (failureRate >= this.config.emergencyThreshold) {
      logger.warn(`🚨 [MASTER] Taxa de falha alta detectada: ${Math.round(failureRate * 100)}%`);
      await this.executeEmergencyProtocol();
    }
  }

  /**
   * Executar protocolo de emergência
   */
  async executeEmergencyProtocol() {
    if (this.activeOperations.has('emergency')) {
      return;
    }
    
    this.activeOperations.add('emergency');
    
    try {
      logger.warn('🚨 [MASTER] Executando protocolo de emergência...');
      
      // Pausar fila de posts
      if (this.state.componentsReady.postQueue) {
        this.postQueue.pauseProcessing();
        logger.info('⏸️ [MASTER] Fila de posts pausada');
      }
      
      // Executar correção de emergência
      const emergencyResult = await this.correctionEngine.executeEmergencyCorrection();
      
      if (emergencyResult.success) {
        logger.info('✅ [MASTER] Correção de emergência bem-sucedida');
        
        // Retomar fila de posts
        if (this.state.componentsReady.postQueue) {
          this.postQueue.resumeProcessing();
          logger.info('▶️ [MASTER] Fila de posts retomada');
        }
      } else {
        logger.error('❌ [MASTER] Correção de emergência falhou - intervenção manual necessária');
        this.state.status = 'emergency';
      }
      
      this.emit('emergencyProtocolExecuted', emergencyResult);
      
    } catch (error) {
      logger.error('❌ [MASTER] Falha no protocolo de emergência:', error.message);
      this.state.status = 'critical';
      this.emit('systemCritical', error);
    } finally {
      this.activeOperations.delete('emergency');
    }
  }

  /**
   * Realizar health check
   */
  async performHealthCheck() {
    try {
      const healthStatus = {
        timestamp: new Date().toISOString(),
        overall: 'healthy',
        components: {},
        alerts: []
      };
      
      // Verificar componentes
      healthStatus.components.diagnostics = this.state.componentsReady.diagnostics ? 'healthy' : 'unhealthy';
      healthStatus.components.postQueue = this.state.componentsReady.postQueue ? 'healthy' : 'unhealthy';
      healthStatus.components.dashboard = this.state.componentsReady.dashboard ? 'healthy' : 'warning';
      healthStatus.components.correctionEngine = this.state.componentsReady.correctionEngine ? 'healthy' : 'unhealthy';
      
      // Verificar se fila está muito cheia
      if (this.state.componentsReady.postQueue) {
        const queueStatus = this.postQueue.getQueueStatus();
        if (queueStatus.queue.pending > 20) {
          healthStatus.components.postQueue = 'warning';
          healthStatus.alerts.push({
            type: 'warning',
            component: 'postQueue',
            message: `${queueStatus.queue.pending} posts pendentes na fila`
          });
        }
      }
      
      // Determinar status geral
      const unhealthyComponents = Object.values(healthStatus.components).filter(status => status === 'unhealthy').length;
      const warningComponents = Object.values(healthStatus.components).filter(status => status === 'warning').length;
      
      if (unhealthyComponents > 0) {
        healthStatus.overall = 'unhealthy';
      } else if (warningComponents > 0) {
        healthStatus.overall = 'warning';
      }
      
      this.emit('healthCheckCompleted', healthStatus);
      
      // Log apenas se houver problemas
      if (healthStatus.overall !== 'healthy') {
        logger.warn(`🏥 [MASTER] Health check: ${healthStatus.overall} - ${healthStatus.alerts.length} alertas`);
      }
      
    } catch (error) {
      logger.error('❌ [MASTER] Falha no health check:', error.message);
    }
  }

  /**
   * Adicionar post aprovado à fila
   */
  async queueApprovedPost(denunciaId) {
    try {
      if (!this.state.componentsReady.postQueue) {
        logger.warn('⚠️ [MASTER] Fila de posts não disponível - processamento direto');
        return await this.processPostDirectly(denunciaId);
      }
      
      const result = await this.postQueue.queueApprovedPost(denunciaId);
      
      if (result) {
        logger.info(`➕ [MASTER] Post adicionado à fila: denúncia ${denunciaId}`);
        this.emit('postQueued', { denunciaId });
        return { success: true, queued: true };
      } else {
        logger.error(`❌ [MASTER] Falha ao adicionar post à fila: denúncia ${denunciaId}`);
        return { success: false, error: 'Failed to queue post' };
      }
      
    } catch (error) {
      logger.error(`❌ [MASTER] Erro ao processar denúncia ${denunciaId}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Processar post diretamente (fallback quando fila não está disponível)
   */
  async processPostDirectly(denunciaId) {
    try {
      logger.info(`📤 [MASTER] Processando post diretamente: denúncia ${denunciaId}`);
      
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      const instagramService = require('./instagramService');
      
      // Buscar denúncia
      const denuncia = await prisma.denuncia.findUnique({
        where: { id: denunciaId },
        include: { vereadores: true }
      });
      
      if (!denuncia || !denuncia.aprovado) {
        throw new Error('Denúncia não encontrada ou não aprovada');
      }
      
      // Publicar
      const result = await instagramService.publicar({
        texto: denuncia.texto,
        imagem: denuncia.imagePath,
        vereadores: denuncia.vereadores
      });
      
      if (result.success) {
        // Atualizar banco
        await prisma.denuncia.update({
          where: { id: denunciaId },
          data: {
            instagramPostId: result.postId,
            instagramUrl: result.postUrl,
            publishedAt: new Date()
          }
        });
        
        this.state.metrics.postsProcessed++;
        this.state.metrics.successfulOperations++;
        
        logger.info(`✅ [MASTER] Post processado diretamente: ${result.postId}`);
        this.emit('postProcessed', { denunciaId, postId: result.postId });
        
        return { success: true, postId: result.postId, postUrl: result.postUrl };
      } else {
        throw new Error(result.error);
      }
      
    } catch (error) {
      this.state.metrics.failedOperations++;
      logger.error(`❌ [MASTER] Falha no processamento direto: denúncia ${denunciaId}`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obter status completo do sistema
   */
  getSystemStatus() {
    const status = {
      ...this.state,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.state.metrics.startTime,
      operationMetrics: {
        totalOperations: this.state.metrics.totalOperations,
        successRate: this.state.metrics.totalOperations > 0 
          ? Math.round((this.state.metrics.successfulOperations / this.state.metrics.totalOperations) * 100)
          : 100,
        postsProcessed: this.state.metrics.postsProcessed,
        errorsHandled: this.state.metrics.errorsHandled
      }
    };
    
    // Adicionar status dos componentes
    if (this.state.componentsReady.postQueue) {
      status.queueStatus = this.postQueue.getQueueStatus();
    }
    
    if (this.state.componentsReady.dashboard) {
      status.dashboardStatus = this.dashboard.getServiceStatus();
    }
    
    return status;
  }

  /**
   * Configurar sistema
   */
  configure(newConfig) {
    Object.assign(this.config, newConfig);
    logger.info('⚙️ [MASTER] Configuração atualizada:', newConfig);
    this.emit('configurationUpdated', this.config);
  }

  /**
   * Tratar erro do sistema
   */
  handleSystemError(error) {
    this.state.metrics.errorsHandled++;
    
    // Log do erro
    logger.error('🚨 [MASTER] Erro do sistema:', error.message);
    
    // Emitir evento
    this.emit('systemError', error);
    
    // Verificar se precisa de protocolo de emergência
    this.checkEmergencyConditions();
  }

  /**
   * Parar sistema
   */
  async shutdown() {
    logger.info('🛑 [MASTER] Iniciando shutdown do sistema...');
    
    this.state.status = 'shutting_down';
    
    try {
      // Parar intervalos
      this.intervals.forEach((intervalId, name) => {
        clearInterval(intervalId);
        logger.debug(`⏹️ [MASTER] Interval parado: ${name}`);
      });
      this.intervals.clear();
      
      // Parar componentes
      if (this.state.componentsReady.postQueue) {
        await this.postQueue.cleanup();
      }
      
      if (this.state.componentsReady.dashboard) {
        await this.dashboard.stop();
      }
      
      if (this.state.componentsReady.diagnostics) {
        await this.diagnostics.cleanup();
      }
      
      await this.correctionEngine.cleanup();
      
      this.state.status = 'stopped';
      this.emit('systemStopped');
      
      logger.info('✅ [MASTER] Sistema parado com sucesso');
      
    } catch (error) {
      logger.error('❌ [MASTER] Erro durante shutdown:', error.message);
      this.state.status = 'error';
    }
  }
}

module.exports = MasterFlowController;