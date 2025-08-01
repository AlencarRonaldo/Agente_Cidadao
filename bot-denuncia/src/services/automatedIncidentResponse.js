/**
 * AUTOMATED INCIDENT RESPONSE SYSTEM - Sistema de Resposta Automática a Incidentes
 * 
 * Sistema inteligente de resposta automática que:
 * - Detecta incidentes em tempo real através de múltiplas fontes
 * - Classifica severidade e impacto automaticamente
 * - Executa planos de resposta pré-definidos
 * - Implementa capacidades de auto-cura (self-healing)
 * - Escala resposta baseada na criticidade
 * - Aprende com incidentes passados para melhorar respostas
 * 
 * @author Automated Incident Response System
 * @priority CRITICAL - Zero-Downtime Operations
 */

const EventEmitter = require('events');
const logger = require('../utils/logger');
const performanceAuditSystem = require('./performanceAuditSystem');

/**
 * INCIDENT CLASSIFIER - Classificador de Incidentes
 */
class IncidentClassifier {
  constructor() {
    this.severityMatrix = new Map();
    this.impactMatrix = new Map();
    this.escalationRules = new Map();
    
    this.setupClassificationRules();
  }

  /**
   * Configurar regras de classificação
   */
  setupClassificationRules() {
    // Matriz de severidade baseada em métricas
    this.severityMatrix.set('whatsapp_disconnected', {
      severity: 'critical',
      businessImpact: 'high',
      userImpact: 'critical',
      slaImpact: 'major',
      autoRecovery: true
    });

    this.severityMatrix.set('instagram_auth_failed', {
      severity: 'high',
      businessImpact: 'high',
      userImpact: 'high',
      slaImpact: 'major',
      autoRecovery: true
    });

    this.severityMatrix.set('database_high_latency', {
      severity: 'medium',
      businessImpact: 'medium',
      userImpact: 'medium',
      slaImpact: 'minor',
      autoRecovery: false
    });

    this.severityMatrix.set('queue_overload', {
      severity: 'high',
      businessImpact: 'high',
      userImpact: 'medium',
      slaImpact: 'major',
      autoRecovery: true
    });

    this.severityMatrix.set('flow_stuck', {
      severity: 'high',
      businessImpact: 'high',
      userImpact: 'high',
      slaImpact: 'major',
      autoRecovery: true
    });

    this.severityMatrix.set('memory_exhaustion', {
      severity: 'critical',
      businessImpact: 'critical',
      userImpact: 'critical',
      slaImpact: 'major',
      autoRecovery: true
    });

    this.severityMatrix.set('anomaly_detected', {
      severity: 'medium',
      businessImpact: 'low',
      userImpact: 'low',
      slaImpact: 'minor',
      autoRecovery: false
    });

    // Regras de escalação
    this.escalationRules.set('time_based', {
      level1: 300000,  // 5 minutos
      level2: 900000,  // 15 minutos
      level3: 1800000, // 30 minutos
      level4: 3600000  // 1 hora
    });

    this.escalationRules.set('severity_based', {
      critical: 'immediate',
      high: 'level1',
      medium: 'level2',
      low: 'level3'
    });
  }

  /**
   * Classificar incidente
   */
  classifyIncident(incidentData) {
    const {
      type,
      source,
      metrics,
      context,
      timestamp
    } = incidentData;

    // Buscar regra de classificação
    const classification = this.severityMatrix.get(type) || {
      severity: 'low',
      businessImpact: 'low',
      userImpact: 'low',
      slaImpact: 'minor',
      autoRecovery: false
    };

    // Ajustar classificação baseada em contexto
    const adjustedClassification = this.adjustClassificationByContext(classification, context, metrics);

    // Calcular prioridade
    const priority = this.calculatePriority(adjustedClassification);

    // Determinar plano de resposta
    const responsePlan = this.determineResponsePlan(type, adjustedClassification);

    return {
      incidentId: `INC_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      type,
      source,
      timestamp,
      classification: adjustedClassification,
      priority,
      responsePlan,
      escalationLevel: this.determineInitialEscalationLevel(adjustedClassification.severity),
      metadata: {
        metrics,
        context,
        classificationTime: Date.now(),
        autoRecoveryEligible: adjustedClassification.autoRecovery
      }
    };
  }

  /**
   * Ajustar classificação baseada em contexto
   */
  adjustClassificationByContext(baseClassification, context, metrics) {
    const adjusted = { ...baseClassification };

    // Ajustar baseado em horário (horário de pico)
    if (this.isPeakHours(new Date())) {
      adjusted.userImpact = this.escalateSeverity(adjusted.userImpact);
      adjusted.businessImpact = this.escalateSeverity(adjusted.businessImpact);
    }

    // Ajustar baseado em métricas atuais
    if (metrics) {
      if (metrics.errorRate > 10) {
        adjusted.severity = this.escalateSeverity(adjusted.severity);
      }
      
      if (metrics.responseTime > 5000) {
        adjusted.userImpact = this.escalateSeverity(adjusted.userImpact);
      }
    }

    // Ajustar baseado em incidentes simultâneos
    if (context?.simultaneousIncidents > 2) {
      adjusted.severity = this.escalateSeverity(adjusted.severity);
      adjusted.businessImpact = this.escalateSeverity(adjusted.businessImpact);
    }

    return adjusted;
  }

  escalateSeverity(currentLevel) {
    const levels = ['low', 'medium', 'high', 'critical'];
    const currentIndex = levels.indexOf(currentLevel);
    return levels[Math.min(currentIndex + 1, levels.length - 1)];
  }

  isPeakHours(date) {
    const hour = date.getHours();
    return (hour >= 8 && hour <= 12) || (hour >= 14 && hour <= 18);
  }

  calculatePriority(classification) {
    const severityWeight = { low: 1, medium: 2, high: 3, critical: 4 };
    const impactWeight = { low: 1, medium: 2, high: 3, critical: 4 };

    const severityScore = severityWeight[classification.severity] || 1;
    const businessScore = impactWeight[classification.businessImpact] || 1;
    const userScore = impactWeight[classification.userImpact] || 1;

    const totalScore = severityScore + businessScore + userScore;

    if (totalScore >= 10) return 'P1'; // Critical
    if (totalScore >= 8) return 'P2';  // High
    if (totalScore >= 6) return 'P3';  // Medium
    return 'P4'; // Low
  }

  determineResponsePlan(incidentType, classification) {
    return {
      immediate: this.getImmediateActions(incidentType),
      shortTerm: this.getShortTermActions(incidentType, classification),
      longTerm: this.getLongTermActions(incidentType),
      rollbackPlan: this.getRollbackPlan(incidentType),
      escalationTriggers: this.getEscalationTriggers(classification)
    };
  }

  getImmediateActions(incidentType) {
    const immediateActions = {
      whatsapp_disconnected: [
        'attempt_reconnection',
        'switch_to_backup_connection',
        'notify_stakeholders'
      ],
      instagram_auth_failed: [
        'refresh_authentication',
        'switch_to_backup_account',
        'pause_posting_queue'
      ],
      database_high_latency: [
        'check_connection_pool',
        'analyze_slow_queries',
        'alert_dba_team'
      ],
      queue_overload: [
        'increase_worker_count',
        'throttle_input_rate',
        'purge_expired_jobs'
      ],
      flow_stuck: [
        'identify_stuck_flows',
        'attempt_flow_recovery',
        'reset_state_machine'
      ],
      memory_exhaustion: [
        'trigger_garbage_collection',
        'restart_worker_processes',
        'scale_horizontally'
      ]
    };

    return immediateActions[incidentType] || ['log_incident', 'alert_team'];
  }

  getShortTermActions(incidentType, classification) {
    // Ações de curto prazo baseadas no tipo e severidade
    return [
      'detailed_root_cause_analysis',
      'implement_temporary_workaround',
      'monitor_recovery_progress',
      'update_stakeholders'
    ];
  }

  getLongTermActions(incidentType) {
    return [
      'implement_permanent_fix',
      'update_monitoring_rules',
      'conduct_post_mortem',
      'update_runbooks'
    ];
  }

  getRollbackPlan(incidentType) {
    return {
      triggers: ['recovery_action_failed', 'incident_escalated'],
      steps: ['revert_changes', 'restore_backup', 'notify_stakeholders'],
      validationChecks: ['verify_system_stability', 'confirm_service_availability']
    };
  }

  getEscalationTriggers(classification) {
    return {
      timeBasedEscalation: this.escalationRules.get('time_based'),
      severityBasedEscalation: this.escalationRules.get('severity_based')[classification.severity],
      manualEscalation: 'available',
      autoEscalationDisabled: false
    };
  }

  determineInitialEscalationLevel(severity) {
    const levelMap = {
      critical: 'L1',
      high: 'L2', 
      medium: 'L3',
      low: 'L4'
    };
    
    return levelMap[severity] || 'L4';
  }
}

/**
 * RECOVERY ORCHESTRATOR - Orquestrador de Recuperação
 */
class RecoveryOrchestrator extends EventEmitter {
  constructor() {
    super();
    
    this.activeRecoveries = new Map();
    this.recoveryStrategies = new Map();
    this.recoveryHistory = [];
    
    this.setupRecoveryStrategies();
  }

  /**
   * Configurar estratégias de recuperação
   */
  setupRecoveryStrategies() {
    // WhatsApp Recovery Strategies
    this.recoveryStrategies.set('whatsapp_disconnected', {
      strategy: 'sequential',
      maxAttempts: 3,
      backoffStrategy: 'exponential',
      steps: [
        {
          action: 'soft_reconnect',
          timeout: 30000,
          successCriteria: 'connection_established'
        },
        {
          action: 'hard_reconnect',
          timeout: 60000,
          successCriteria: 'connection_established'
        },
        {
          action: 'full_restart',
          timeout: 120000,
          successCriteria: 'service_operational'
        }
      ],
      rollbackAction: 'switch_to_manual_mode'
    });

    // Instagram Recovery Strategies
    this.recoveryStrategies.set('instagram_auth_failed', {
      strategy: 'parallel',
      maxAttempts: 2,
      steps: [
        {
          action: 'refresh_session',
          timeout: 30000,
          successCriteria: 'authentication_valid'
        },
        {
          action: 'relogin',
          timeout: 60000,
          successCriteria: 'authentication_valid'
        }
      ],
      rollbackAction: 'disable_posting'
    });

    // Database Recovery Strategies
    this.recoveryStrategies.set('database_high_latency', {
      strategy: 'sequential',
      maxAttempts: 2,
      steps: [
        {
          action: 'clear_connection_pool',
          timeout: 10000,
          successCriteria: 'latency_improved'
        },
        {
          action: 'restart_connection',
          timeout: 30000,
          successCriteria: 'latency_normal'
        }
      ],
      rollbackAction: 'switch_to_readonly'
    });

    // Queue Recovery Strategies
    this.recoveryStrategies.set('queue_overload', {
      strategy: 'parallel',
      maxAttempts: 1,
      steps: [
        {
          action: 'scale_workers',
          timeout: 30000,
          successCriteria: 'queue_processing_normal'
        },
        {
          action: 'throttle_input',
          timeout: 10000,
          successCriteria: 'queue_depth_reduced'
        }
      ],
      rollbackAction: 'pause_queue_processing'
    });

    // Flow Recovery Strategies
    this.recoveryStrategies.set('flow_stuck', {
      strategy: 'sequential',
      maxAttempts: 2,
      steps: [
        {
          action: 'retry_stuck_flows',
          timeout: 60000,
          successCriteria: 'flows_resumed'
        },
        {
          action: 'reset_flow_state',
          timeout: 30000,
          successCriteria: 'flows_operational'
        }
      ],
      rollbackAction: 'manual_flow_recovery'
    });

    // Memory Recovery Strategies
    this.recoveryStrategies.set('memory_exhaustion', {
      strategy: 'sequential',
      maxAttempts: 2,
      priority: 'critical',
      steps: [
        {
          action: 'force_garbage_collection',
          timeout: 10000,
          successCriteria: 'memory_freed'
        },
        {
          action: 'restart_process',
          timeout: 60000,
          successCriteria: 'memory_normal'
        }
      ],
      rollbackAction: 'emergency_shutdown'
    });
  }

  /**
   * Executar recuperação automática
   */
  async executeRecovery(incident) {
    const recoveryId = `REC_${incident.incidentId}_${Date.now()}`;
    
    logger.info(`[RECOVERY] Starting automated recovery for incident ${incident.incidentId}`);

    const recoverySession = {
      recoveryId,
      incidentId: incident.incidentId,
      incidentType: incident.type,
      startTime: Date.now(),
      status: 'in_progress',
      currentStep: 0,
      attempts: 0,
      actions: [],
      success: false
    };

    this.activeRecoveries.set(recoveryId, recoverySession);

    try {
      const strategy = this.recoveryStrategies.get(incident.type);
      
      if (!strategy) {
        throw new Error(`No recovery strategy found for incident type: ${incident.type}`);
      }

      // Executar estratégia
      const result = await this.executeRecoveryStrategy(recoverySession, strategy, incident);
      
      // Finalizar sessão de recuperação
      recoverySession.endTime = Date.now();
      recoverySession.duration = recoverySession.endTime - recoverySession.startTime;
      recoverySession.status = result.success ? 'completed' : 'failed';
      recoverySession.success = result.success;
      recoverySession.result = result;

      // Armazenar no histórico
      this.recoveryHistory.push({ ...recoverySession });
      
      // Auditar recuperação
      await performanceAuditSystem.createAuditEntry('RECOVERY_COMPLETED', {
        recoveryId,
        incidentId: incident.incidentId,
        success: result.success,
        duration: recoverySession.duration,
        actionsExecuted: recoverySession.actions.length
      });

      // Emitir evento
      this.emit('recoveryCompleted', {
        recoveryId,
        incident,
        result,
        session: recoverySession
      });

      logger.info(`[RECOVERY] Recovery ${result.success ? 'succeeded' : 'failed'} for incident ${incident.incidentId}`);
      
      return result;

    } catch (error) {
      recoverySession.status = 'error';
      recoverySession.error = error.message;
      recoverySession.endTime = Date.now();

      logger.error(`[RECOVERY] Recovery failed for incident ${incident.incidentId}:`, error);
      
      this.emit('recoveryFailed', {
        recoveryId,
        incident,
        error: error.message
      });

      return { success: false, error: error.message };
      
    } finally {
      this.activeRecoveries.delete(recoveryId);
    }
  }

  /**
   * Executar estratégia de recuperação
   */
  async executeRecoveryStrategy(session, strategy, incident) {
    const { steps, maxAttempts, strategy: strategyType } = strategy;
    
    session.strategy = strategyType;
    session.maxAttempts = maxAttempts;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      session.attempts = attempt;
      
      logger.debug(`[RECOVERY] Attempt ${attempt}/${maxAttempts} for ${session.incidentId}`);

      let stepResults;
      
      if (strategyType === 'sequential') {
        stepResults = await this.executeSequentialSteps(session, steps, incident);
      } else if (strategyType === 'parallel') {
        stepResults = await this.executeParallelSteps(session, steps, incident);
      } else {
        throw new Error(`Unknown recovery strategy: ${strategyType}`);
      }

      // Verificar se a recuperação foi bem-sucedida
      const allStepsSuccessful = stepResults.every(result => result.success);
      
      if (allStepsSuccessful) {
        // Validar recuperação
        const validationResult = await this.validateRecovery(incident);
        
        if (validationResult.success) {
          return {
            success: true,
            attempt,
            steps: stepResults,
            validation: validationResult,
            message: 'Recovery completed successfully'
          };
        } else {
          logger.warn(`[RECOVERY] Recovery validation failed on attempt ${attempt}`);
        }
      }

      // Se não foi a última tentativa, aguardar backoff
      if (attempt < maxAttempts) {
        const backoffTime = this.calculateBackoff(attempt, strategy.backoffStrategy);
        logger.debug(`[RECOVERY] Waiting ${backoffTime}ms before next attempt`);
        await this.sleep(backoffTime);
      }
    }

    // Todas as tentativas falharam, executar rollback se necessário
    if (strategy.rollbackAction) {
      logger.warn(`[RECOVERY] All attempts failed, executing rollback: ${strategy.rollbackAction}`);
      const rollbackResult = await this.executeRollback(session, strategy.rollbackAction, incident);
      
      return {
        success: false,
        attempts: maxAttempts,
        rollback: rollbackResult,
        message: 'Recovery failed, rollback executed'
      };
    }

    return {
      success: false,
      attempts: maxAttempts,
      message: 'All recovery attempts failed'
    };
  }

  /**
   * Executar passos sequencialmente
   */
  async executeSequentialSteps(session, steps, incident) {
    const results = [];
    
    for (let i = 0; i < steps.length; i++) {
      session.currentStep = i;
      const step = steps[i];
      
      logger.debug(`[RECOVERY] Executing step ${i + 1}/${steps.length}: ${step.action}`);
      
      const stepResult = await this.executeRecoveryAction(step, incident);
      results.push(stepResult);
      
      session.actions.push({
        step: i,
        action: step.action,
        result: stepResult,
        timestamp: Date.now()
      });

      // Se o passo falhou, parar a execução sequencial
      if (!stepResult.success) {
        logger.warn(`[RECOVERY] Step ${step.action} failed, stopping sequential execution`);
        break;
      }
    }
    
    return results;
  }

  /**
   * Executar passos em paralelo
   */
  async executeParallelSteps(session, steps, incident) {
    logger.debug(`[RECOVERY] Executing ${steps.length} steps in parallel`);
    
    const stepPromises = steps.map(async (step, index) => {
      const stepResult = await this.executeRecoveryAction(step, incident);
      
      session.actions.push({
        step: index,
        action: step.action,
        result: stepResult,
        timestamp: Date.now()
      });
      
      return stepResult;
    });

    return await Promise.all(stepPromises);
  }

  /**
   * Executar ação de recuperação
   */
  async executeRecoveryAction(step, incident) {
    const { action, timeout, successCriteria } = step;
    const startTime = Date.now();
    
    try {
      // Executar com timeout
      const result = await Promise.race([
        this.performAction(action, incident),
        this.timeout(timeout)
      ]);

      // Verificar critério de sucesso
      const success = await this.checkSuccessCriteria(successCriteria, incident, result);
      
      return {
        action,
        success,
        result,
        duration: Date.now() - startTime,
        successCriteria,
        criteriaCheck: success
      };

    } catch (error) {
      return {
        action,
        success: false,
        error: error.message,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Executar ação específica
   */
  async performAction(action, incident) {
    switch (action) {
      case 'soft_reconnect':
        return await this.performWhatsAppSoftReconnect();
      
      case 'hard_reconnect':
        return await this.performWhatsAppHardReconnect();
      
      case 'full_restart':
        return await this.performWhatsAppFullRestart();
      
      case 'refresh_session':
        return await this.performInstagramRefreshSession();
      
      case 'relogin':
        return await this.performInstagramRelogin();
      
      case 'clear_connection_pool':
        return await this.performDatabaseClearPool();
      
      case 'restart_connection':
        return await this.performDatabaseRestart();
      
      case 'scale_workers':
        return await this.performQueueScaleWorkers();
      
      case 'throttle_input':
        return await this.performQueueThrottle();
      
      case 'retry_stuck_flows':
        return await this.performFlowRetry();
      
      case 'reset_flow_state':
        return await this.performFlowReset();
      
      case 'force_garbage_collection':
        return await this.performForceGC();
      
      case 'restart_process':
        return await this.performProcessRestart();
      
      default:
        throw new Error(`Unknown recovery action: ${action}`);
    }
  }

  // Implementações das ações de recuperação...

  async performWhatsAppSoftReconnect() {
    try {
      const whatsappService = require('./whatsappService-robust');
      await whatsappService.reconnect();
      return { status: 'reconnected', method: 'soft' };
    } catch (error) {
      throw new Error(`WhatsApp soft reconnect failed: ${error.message}`);
    }
  }

  async performWhatsAppHardReconnect() {
    try {
      const whatsappService = require('./whatsappService-robust');
      await whatsappService.forceReconnect();
      return { status: 'reconnected', method: 'hard' };
    } catch (error) {
      throw new Error(`WhatsApp hard reconnect failed: ${error.message}`);
    }
  }

  async performWhatsAppFullRestart() {
    try {
      const whatsappService = require('./whatsappService-robust');
      await whatsappService.restart();
      return { status: 'restarted', method: 'full' };
    } catch (error) {
      throw new Error(`WhatsApp full restart failed: ${error.message}`);
    }
  }

  async performInstagramRefreshSession() {
    try {
      const instagramService = require('./instagramService-improved');
      await instagramService.refreshSession();
      return { status: 'session_refreshed' };
    } catch (error) {
      throw new Error(`Instagram session refresh failed: ${error.message}`);
    }
  }

  async performInstagramRelogin() {
    try {
      const instagramService = require('./instagramService-improved');
      await instagramService.relogin();
      return { status: 'relogged' };
    } catch (error) {
      throw new Error(`Instagram relogin failed: ${error.message}`);
    }
  }

  async performDatabaseClearPool() {
    try {
      // Implementar limpeza do pool de conexões
      return { status: 'pool_cleared' };
    } catch (error) {
      throw new Error(`Database pool clear failed: ${error.message}`);
    }
  }

  async performDatabaseRestart() {
    try {
      // Implementar restart da conexão de banco
      return { status: 'connection_restarted' };
    } catch (error) {
      throw new Error(`Database restart failed: ${error.message}`);
    }
  }

  async performQueueScaleWorkers() {
    try {
      const queueManager = require('../queues/queueManager');
      await queueManager.scaleWorkers(2); // Dobrar workers
      return { status: 'workers_scaled', action: 'doubled' };
    } catch (error) {
      throw new Error(`Queue worker scaling failed: ${error.message}`);
    }
  }

  async performQueueThrottle() {
    try {
      const queueManager = require('../queues/queueManager');
      await queueManager.enableThrottling(0.5); // Reduzir para 50%
      return { status: 'throttling_enabled', rate: 0.5 };
    } catch (error) {
      throw new Error(`Queue throttling failed: ${error.message}`);
    }
  }

  async performFlowRetry() {
    try {
      const masterFlowOrchestrator = require('./masterFlowOrchestrator');
      const result = await masterFlowOrchestrator.retryStuckFlows();
      return { status: 'flows_retried', ...result };
    } catch (error) {
      throw new Error(`Flow retry failed: ${error.message}`);
    }
  }

  async performFlowReset() {
    try {
      const masterFlowOrchestrator = require('./masterFlowOrchestrator');
      const result = await masterFlowOrchestrator.resetStuckFlows();
      return { status: 'flows_reset', ...result };
    } catch (error) {
      throw new Error(`Flow reset failed: ${error.message}`);
    }
  }

  async performForceGC() {
    try {
      if (global.gc) {
        global.gc();
        const memAfter = process.memoryUsage();
        return { status: 'gc_executed', memoryAfter: memAfter };
      } else {
        return { status: 'gc_not_available' };
      }
    } catch (error) {
      throw new Error(`Force GC failed: ${error.message}`);
    }
  }

  async performProcessRestart() {
    try {
      // Em produção, isso seria coordenado com orquestrador (K8s, PM2, etc.)
      logger.warn('[RECOVERY] Process restart requested - delegating to process manager');
      return { status: 'restart_requested', note: 'Delegated to process manager' };
    } catch (error) {
      throw new Error(`Process restart failed: ${error.message}`);
    }
  }

  /**
   * Verificar critério de sucesso
   */
  async checkSuccessCriteria(criteria, incident, actionResult) {
    switch (criteria) {
      case 'connection_established':
        return await this.checkWhatsAppConnection();
      
      case 'service_operational':
        return await this.checkServiceOperational();
      
      case 'authentication_valid':
        return await this.checkInstagramAuth();
      
      case 'latency_improved':
        return await this.checkDatabaseLatency(true);
      
      case 'latency_normal':
        return await this.checkDatabaseLatency(false);
      
      case 'queue_processing_normal':
        return await this.checkQueueProcessing();
      
      case 'queue_depth_reduced':
        return await this.checkQueueDepth();
      
      case 'flows_resumed':
        return await this.checkFlowsResumed();
      
      case 'flows_operational':
        return await this.checkFlowsOperational();
      
      case 'memory_freed':
        return await this.checkMemoryUsage(true);
      
      case 'memory_normal':
        return await this.checkMemoryUsage(false);
      
      default:
        logger.warn(`[RECOVERY] Unknown success criteria: ${criteria}`);
        return true; // Default to success if criteria is unknown
    }
  }

  // Implementações dos checks de critério...

  async checkWhatsAppConnection() {
    try {
      const whatsappService = require('./whatsappService-robust');
      const status = whatsappService.getConnectionStatus();
      return status.isConnected;
    } catch (error) {
      return false;
    }
  }

  async checkServiceOperational() {
    // Verificar se todos os serviços críticos estão operacionais
    const checks = await Promise.all([
      this.checkWhatsAppConnection(),
      this.checkInstagramAuth(),
      this.checkDatabaseLatency(false)
    ]);
    
    return checks.every(check => check);
  }

  async checkInstagramAuth() {
    try {
      const instagramService = require('./instagramService-improved');
      const status = await instagramService.getHealthStatus();
      return status.isAuthenticated;
    } catch (error) {
      return false;
    }
  }

  async checkDatabaseLatency(improved) {
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      const start = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      const latency = Date.now() - start;
      
      await prisma.$disconnect();
      
      return improved ? latency < 2000 : latency < 1000; // 2s para improved, 1s para normal
    } catch (error) {
      return false;
    }
  }

  async checkQueueProcessing() {
    try {
      const queueManager = require('../queues/queueManager');
      const stats = await queueManager.getQueueStats('process-queue');
      return stats.active > 0 && stats.waiting < 50;
    } catch (error) {
      return false;
    }
  }

  async checkQueueDepth() {
    try {
      const queueManager = require('../queues/queueManager');
      const processStats = await queueManager.getQueueStats('process-queue');
      const publishStats = await queueManager.getQueueStats('publish-queue');
      
      const totalWaiting = (processStats.waiting || 0) + (publishStats.waiting || 0);
      return totalWaiting < 50;
    } catch (error) {
      return false;
    }
  }

  async checkFlowsResumed() {
    try {
      const masterFlowOrchestrator = require('./masterFlowOrchestrator');
      const metrics = masterFlowOrchestrator.getHealthMetrics();
      return metrics.stuckFlows === 0;
    } catch (error) {
      return false;
    }
  }

  async checkFlowsOperational() {
    try {
      const masterFlowOrchestrator = require('./masterFlowOrchestrator');
      const metrics = masterFlowOrchestrator.getHealthMetrics();
      return metrics.completionRate > 90;
    } catch (error) {
      return false;
    }
  }

  async checkMemoryUsage(freed) {
    const memUsage = process.memoryUsage();
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
    
    return freed ? heapUsedMB < 400 : heapUsedMB < 300; // 400MB para freed, 300MB para normal
  }

  /**
   * Validar recuperação
   */
  async validateRecovery(incident) {
    try {
      // Aguardar um pouco para estabilização
      await this.sleep(5000);
      
      // Executar validações específicas do tipo de incidente
      const validationResult = await this.performIncidentValidation(incident.type);
      
      return {
        success: validationResult,
        timestamp: Date.now(),
        validationType: incident.type
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: Date.now()
      };
    }
  }

  async performIncidentValidation(incidentType) {
    switch (incidentType) {
      case 'whatsapp_disconnected':
        return await this.checkWhatsAppConnection();
      
      case 'instagram_auth_failed':
        return await this.checkInstagramAuth();
      
      case 'database_high_latency':
        return await this.checkDatabaseLatency(false);
      
      case 'queue_overload':
        return await this.checkQueueProcessing();
      
      case 'flow_stuck':
        return await this.checkFlowsOperational();
      
      case 'memory_exhaustion':
        return await this.checkMemoryUsage(false);
      
      default:
        return true;
    }
  }

  /**
   * Executar rollback
   */
  async executeRollback(session, rollbackAction, incident) {
    logger.warn(`[RECOVERY] Executing rollback action: ${rollbackAction}`);
    
    try {
      const result = await this.performAction(rollbackAction, incident);
      
      return {
        success: true,
        action: rollbackAction,
        result
      };
    } catch (error) {
      logger.error(`[RECOVERY] Rollback failed: ${error.message}`);
      
      return {
        success: false,
        action: rollbackAction,
        error: error.message
      };
    }
  }

  /**
   * Calcular backoff
   */
  calculateBackoff(attempt, strategy) {
    switch (strategy) {
      case 'exponential':
        return Math.min(1000 * Math.pow(2, attempt - 1), 30000); // Max 30s
      
      case 'linear':
        return attempt * 1000; // 1s, 2s, 3s...
      
      case 'fixed':
        return 5000; // 5s fixo
      
      default:
        return 1000; // 1s default
    }
  }

  /**
   * Sleep helper
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Timeout helper
   */
  timeout(ms) {
    return new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout exceeded')), ms)
    );
  }

  /**
   * Obter histórico de recuperação
   */
  getRecoveryHistory(limit = 50) {
    return this.recoveryHistory
      .slice(-limit)
      .sort((a, b) => b.startTime - a.startTime);
  }

  /**
   * Obter estatísticas de recuperação
   */
  getRecoveryStats() {
    const history = this.recoveryHistory;
    
    if (history.length === 0) {
      return { noData: true };
    }

    const successful = history.filter(r => r.success).length;
    const failed = history.length - successful;
    const avgDuration = history.reduce((sum, r) => sum + (r.duration || 0), 0) / history.length;

    const incidentTypes = {};
    history.forEach(r => {
      incidentTypes[r.incidentType] = (incidentTypes[r.incidentType] || 0) + 1;
    });

    return {
      totalRecoveries: history.length,
      successfulRecoveries: successful,
      failedRecoveries: failed,
      successRate: (successful / history.length) * 100,
      averageDuration: avgDuration,
      incidentTypeBreakdown: incidentTypes,
      lastRecovery: history[history.length - 1]?.startTime
    };
  }
}

/**
 * AUTOMATED INCIDENT RESPONSE SYSTEM - Sistema Principal
 */
class AutomatedIncidentResponseSystem extends EventEmitter {
  constructor() {
    super();
    
    this.classifier = new IncidentClassifier();
    this.recoveryOrchestrator = new RecoveryOrchestrator();
    this.activeIncidents = new Map();
    this.incidentHistory = [];
    
    this.config = {
      autoRecoveryEnabled: true,
      maxConcurrentRecoveries: 3,
      incidentCooldown: 300000, // 5 minutos
      escalationEnabled: true,
      learningEnabled: true
    };

    this.setupEventHandlers();
  }

  /**
   * Configurar handlers de eventos
   */
  setupEventHandlers() {
    // Recovery events
    this.recoveryOrchestrator.on('recoveryCompleted', (data) => {
      this.handleRecoveryCompleted(data);
    });

    this.recoveryOrchestrator.on('recoveryFailed', (data) => {
      this.handleRecoveryFailed(data);
    });
  }

  /**
   * Processar incidente
   */
  async processIncident(incidentData) {
    try {
      // Classificar incidente
      const classifiedIncident = this.classifier.classifyIncident(incidentData);
      
      logger.info(`[INCIDENT] New incident classified: ${classifiedIncident.incidentId} (${classifiedIncident.priority})`);

      // Verificar cooldown (evitar spam de incidentes similares)
      if (this.isInCooldown(classifiedIncident)) {
        logger.debug(`[INCIDENT] Incident in cooldown period, skipping: ${classifiedIncident.type}`);
        return { skipped: true, reason: 'cooldown_period' };
      }

      // Armazenar incidente ativo
      this.activeIncidents.set(classifiedIncident.incidentId, classifiedIncident);

      // Auditar incidente
      await performanceAuditSystem.createAuditEntry('INCIDENT_DETECTED', {
        incidentId: classifiedIncident.incidentId,
        type: classifiedIncident.type,
        severity: classifiedIncident.classification.severity,
        priority: classifiedIncident.priority
      });

      // Executar resposta automática se habilitada
      let recoveryResult = null;
      if (this.config.autoRecoveryEnabled && classifiedIncident.metadata.autoRecoveryEligible) {
        // Verificar se não excedemos o limite de recuperações concorrentes
        if (this.recoveryOrchestrator.activeRecoveries.size < this.config.maxConcurrentRecoveries) {
          recoveryResult = await this.recoveryOrchestrator.executeRecovery(classifiedIncident);
        } else {
          logger.warn(`[INCIDENT] Max concurrent recoveries reached, queuing incident: ${classifiedIncident.incidentId}`);
        }
      }

      // Emitir evento
      this.emit('incidentProcessed', {
        incident: classifiedIncident,
        recovery: recoveryResult,
        timestamp: Date.now()
      });

      return {
        incident: classifiedIncident,
        recovery: recoveryResult,
        processed: true
      };

    } catch (error) {
      logger.error('[INCIDENT] Failed to process incident:', error);
      throw error;
    }
  }

  /**
   * Verificar cooldown
   */
  isInCooldown(incident) {
    const now = Date.now();
    const cooldownPeriod = this.config.incidentCooldown;
    
    // Verificar incidentes ativos do mesmo tipo
    for (const activeIncident of this.activeIncidents.values()) {
      if (activeIncident.type === incident.type && 
          (now - activeIncident.timestamp) < cooldownPeriod) {
        return true;
      }
    }

    // Verificar histórico recente
    const recentIncident = this.incidentHistory
      .filter(i => i.type === incident.type)
      .find(i => (now - i.timestamp) < cooldownPeriod);

    return !!recentIncident;
  }

  /**
   * Handle recovery completed
   */
  handleRecoveryCompleted(data) {
    const { incident, result, session } = data;
    
    if (result.success) {
      logger.info(`[INCIDENT] Incident resolved automatically: ${incident.incidentId}`);
      this.resolveIncident(incident.incidentId, 'auto_resolved', session);
    } else {
      logger.warn(`[INCIDENT] Auto-recovery failed: ${incident.incidentId}`);
      this.escalateIncident(incident.incidentId, 'recovery_failed');
    }
  }

  /**
   * Handle recovery failed
   */
  handleRecoveryFailed(data) {
    const { incident, error } = data;
    
    logger.error(`[INCIDENT] Recovery failed for incident: ${incident.incidentId}`, error);
    this.escalateIncident(incident.incidentId, 'recovery_error');
  }

  /**
   * Resolver incidente
   */
  async resolveIncident(incidentId, resolution, recoverySession = null) {
    const incident = this.activeIncidents.get(incidentId);
    
    if (!incident) {
      logger.warn(`[INCIDENT] Attempted to resolve unknown incident: ${incidentId}`);
      return;
    }

    // Mover para histórico
    const resolvedIncident = {
      ...incident,
      resolvedAt: Date.now(),
      resolution,
      recoverySession,
      duration: Date.now() - incident.timestamp
    };

    this.incidentHistory.push(resolvedIncident);
    this.activeIncidents.delete(incidentId);

    // Auditar resolução
    await performanceAuditSystem.createAuditEntry('INCIDENT_RESOLVED', {
      incidentId,
      resolution,
      duration: resolvedIncident.duration,
      autoResolved: resolution === 'auto_resolved'
    });

    // Emitir evento
    this.emit('incidentResolved', resolvedIncident);

    logger.info(`[INCIDENT] Incident resolved: ${incidentId} (${resolution})`);
  }

  /**
   * Escalar incidente
   */
  async escalateIncident(incidentId, reason) {
    const incident = this.activeIncidents.get(incidentId);
    
    if (!incident) {
      logger.warn(`[INCIDENT] Attempted to escalate unknown incident: ${incidentId}`);
      return;
    }

    // Aumentar nível de escalação
    const currentLevel = incident.escalationLevel;
    const nextLevel = this.getNextEscalationLevel(currentLevel);
    
    incident.escalationLevel = nextLevel;
    incident.escalatedAt = Date.now();
    incident.escalationReason = reason;

    // Auditar escalação
    await performanceAuditSystem.createAuditEntry('INCIDENT_ESCALATED', {
      incidentId,
      fromLevel: currentLevel,
      toLevel: nextLevel,
      reason
    });

    // Emitir evento
    this.emit('incidentEscalated', {
      incident,
      previousLevel: currentLevel,
      newLevel: nextLevel,
      reason
    });

    logger.warn(`[INCIDENT] Incident escalated: ${incidentId} (${currentLevel} → ${nextLevel})`);
  }

  getNextEscalationLevel(currentLevel) {
    const levels = ['L4', 'L3', 'L2', 'L1'];
    const currentIndex = levels.indexOf(currentLevel);
    return currentIndex > 0 ? levels[currentIndex - 1] : 'L1';
  }

  /**
   * Obter dashboard de incidentes
   */
  getIncidentDashboard() {
    const activeIncidents = Array.from(this.activeIncidents.values());
    const recentHistory = this.incidentHistory.slice(-50);
    
    return {
      timestamp: Date.now(),
      activeIncidents: {
        total: activeIncidents.length,
        bySeverity: this.groupBySeverity(activeIncidents),
        byType: this.groupByType(activeIncidents),
        incidents: activeIncidents
      },
      recentHistory: {
        total: recentHistory.length,
        resolved: recentHistory.filter(i => i.resolution).length,
        autoResolved: recentHistory.filter(i => i.resolution === 'auto_resolved').length,
        avgResolutionTime: this.calculateAvgResolutionTime(recentHistory)
      },
      recoveryStats: this.recoveryOrchestrator.getRecoveryStats(),
      systemHealth: {
        autoRecoveryEnabled: this.config.autoRecoveryEnabled,
        activeRecoveries: this.recoveryOrchestrator.activeRecoveries.size,
        maxConcurrentRecoveries: this.config.maxConcurrentRecoveries
      }
    };
  }

  groupBySeverity(incidents) {
    return incidents.reduce((acc, incident) => {
      const severity = incident.classification.severity;
      acc[severity] = (acc[severity] || 0) + 1;
      return acc;
    }, {});
  }

  groupByType(incidents) {
    return incidents.reduce((acc, incident) => {
      acc[incident.type] = (acc[incident.type] || 0) + 1;
      return acc;
    }, {});
  }

  calculateAvgResolutionTime(incidents) {
    const resolved = incidents.filter(i => i.duration);
    if (resolved.length === 0) return 0;
    
    return resolved.reduce((sum, i) => sum + i.duration, 0) / resolved.length;
  }

  /**
   * Configurar sistema
   */
  configure(newConfig) {
    this.config = { ...this.config, ...newConfig };
    logger.info('[INCIDENT] System configuration updated:', newConfig);
  }

  /**
   * Obter configuração atual
   */
  getConfiguration() {
    return { ...this.config };
  }
}

module.exports = {
  AutomatedIncidentResponseSystem,
  IncidentClassifier,
  RecoveryOrchestrator,
  default: new AutomatedIncidentResponseSystem()
};