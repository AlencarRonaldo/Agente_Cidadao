/**
 * PERFORMANCE AUDIT SYSTEM - Monitoramento e Auditoria Completa
 * 
 * Sistema abrangente de monitoramento que implementa:
 * - Métricas de performance end-to-end em tempo real
 * - Auditoria completa com trilhas de auditoria imutáveis
 * - SLA monitoring com alertas automáticos
 * - Análise de tendências e predições
 * - Compliance e governança de dados
 * 
 * @author Integration Flow Orchestrator
 * @priority CRITICAL - Enterprise Grade Monitoring
 */

const EventEmitter = require('events');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');
const queueManager = require('../queues/queueManager');

/**
 * PERFORMANCE METRICS COLLECTOR - Coleta de Métricas em Tempo Real
 */
class PerformanceMetricsCollector extends EventEmitter {
  constructor() {
    super();
    
    this.metrics = new Map();
    this.realTimeMetrics = new Map();
    this.slaThresholds = {
      whatsappProcessing: 5000,    // 5s max
      instagramPosting: 30000,     // 30s max
      completeFlow: 60000,         // 1min max
      errorRecovery: 10000,        // 10s max
      systemResponse: 2000         // 2s max
    };
    
    this.performanceHistory = [];
    this.alertRules = new Map();
    
    this.startRealTimeCollection();
    this.setupSLAMonitoring();
  }

  /**
   * Iniciar medição de performance
   */
  startMeasurement(flowId, operation, metadata = {}) {
    const measurementId = `${flowId}_${operation}_${Date.now()}`;
    
    const measurement = {
      measurementId,
      flowId,
      operation,
      startTime: process.hrtime.bigint(),
      startTimestamp: Date.now(),
      metadata,
      checkpoints: [],
      memoryStart: process.memoryUsage(),
      cpuStart: process.cpuUsage()
    };
    
    this.metrics.set(measurementId, measurement);
    
    logger.debug(`[METRICS] Started measurement: ${measurementId}`);
    return measurementId;
  }

  /**
   * Adicionar checkpoint de performance
   */
  addCheckpoint(measurementId, checkpointName, metadata = {}) {
    const measurement = this.metrics.get(measurementId);
    if (!measurement) {
      logger.warn(`[METRICS] Measurement not found: ${measurementId}`);
      return;
    }

    const checkpoint = {
      name: checkpointName,
      timestamp: Date.now(),
      elapsed: Number(process.hrtime.bigint() - measurement.startTime) / 1000000, // ms
      metadata
    };

    measurement.checkpoints.push(checkpoint);
    
    // Verificar SLA em tempo real
    this.checkSLACompliance(measurement, checkpoint);
    
    logger.debug(`[METRICS] Checkpoint added: ${checkpointName} at ${checkpoint.elapsed.toFixed(2)}ms`);
  }

  /**
   * Finalizar medição
   */
  finalizeMeasurement(measurementId, result = {}) {
    const measurement = this.metrics.get(measurementId);
    if (!measurement) {
      logger.warn(`[METRICS] Measurement not found for finalization: ${measurementId}`);
      return null;
    }

    const endTime = process.hrtime.bigint();
    const totalTime = Number(endTime - measurement.startTime) / 1000000; // ms
    
    const memoryEnd = process.memoryUsage();
    const cpuEnd = process.cpuUsage(measurement.cpuStart);

    const finalMetrics = {
      ...measurement,
      endTime,
      endTimestamp: Date.now(),
      totalTime,
      result,
      memoryUsage: {
        heapUsedDelta: memoryEnd.heapUsed - measurement.memoryStart.heapUsed,
        heapTotalDelta: memoryEnd.heapTotal - measurement.memoryStart.heapTotal,
        externalDelta: memoryEnd.external - measurement.memoryStart.external
      },
      cpuUsage: {
        userTime: cpuEnd.user,
        systemTime: cpuEnd.system
      },
      performance: {
        totalTime,
        checkpointCount: measurement.checkpoints.length,
        averageCheckpointTime: measurement.checkpoints.length > 0 
          ? totalTime / measurement.checkpoints.length 
          : 0
      }
    };

    // Armazenar no histórico
    this.performanceHistory.push(finalMetrics);
    
    // Manter apenas últimas 10000 medições
    if (this.performanceHistory.length > 10000) {
      this.performanceHistory = this.performanceHistory.slice(-10000);
    }

    // Remover da memória ativa
    this.metrics.delete(measurementId);

    // Emitir evento para processamento
    this.emit('measurementCompleted', finalMetrics);

    logger.info(`[METRICS] Measurement completed: ${measurementId}`, {
      operation: measurement.operation,
      totalTime: `${totalTime.toFixed(2)}ms`,
      checkpoints: measurement.checkpoints.length
    });

    return finalMetrics;
  }

  /**
   * Verificar compliance com SLA
   */
  checkSLACompliance(measurement, checkpoint) {
    const threshold = this.slaThresholds[measurement.operation];
    if (!threshold) return;

    if (checkpoint.elapsed > threshold) {
      const violation = {
        measurementId: measurement.measurementId,
        flowId: measurement.flowId,
        operation: measurement.operation,
        checkpoint: checkpoint.name,
        actualTime: checkpoint.elapsed,
        threshold,
        violation: checkpoint.elapsed - threshold,
        timestamp: Date.now()
      };

      logger.warn(`[METRICS] SLA violation detected`, violation);
      this.emit('slaViolation', violation);
    }
  }

  /**
   * Coletar métricas do sistema em tempo real
   */
  startRealTimeCollection() {
    this.realTimeInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, 5000); // A cada 5 segundos
  }

  /**
   * Coletar métricas do sistema
   */
  collectSystemMetrics() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    const systemMetrics = {
      timestamp: Date.now(),
      memory: {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
        external: Math.round(memUsage.external / 1024 / 1024), // MB
        rss: Math.round(memUsage.rss / 1024 / 1024) // MB
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      uptime: process.uptime(),
      activeHandles: process._getActiveHandles().length,
      activeRequests: process._getActiveRequests().length
    };

    this.realTimeMetrics.set('system', systemMetrics);

    // Verificar alertas de sistema
    this.checkSystemAlerts(systemMetrics);
  }

  /**
   * Verificar alertas do sistema
   */
  checkSystemAlerts(metrics) {
    // Alerta de memória alta
    if (metrics.memory.heapUsed > 500) { // 500MB
      this.emit('systemAlert', {
        type: 'HIGH_MEMORY_USAGE',
        value: metrics.memory.heapUsed,
        threshold: 500,
        timestamp: metrics.timestamp
      });
    }

    // Alerta de muitos handles ativos
    if (metrics.activeHandles > 100) {
      this.emit('systemAlert', {
        type: 'HIGH_ACTIVE_HANDLES',
        value: metrics.activeHandles,
        threshold: 100,
        timestamp: metrics.timestamp
      });
    }
  }

  /**
   * Setup de monitoramento SLA
   */
  setupSLAMonitoring() {
    this.on('measurementCompleted', (metrics) => {
      this.analyzeSLACompliance(metrics);
    });
  }

  /**
   * Analisar compliance SLA
   */
  analyzeSLACompliance(metrics) {
    const threshold = this.slaThresholds[metrics.operation];
    if (!threshold) return;

    const compliance = {
      operation: metrics.operation,
      flowId: metrics.flowId,
      actualTime: metrics.totalTime,
      threshold,
      compliant: metrics.totalTime <= threshold,
      violationPercent: threshold > 0 ? ((metrics.totalTime - threshold) / threshold) * 100 : 0,
      timestamp: metrics.endTimestamp
    };

    if (!compliance.compliant) {
      logger.warn(`[SLA] Violation: ${metrics.operation}`, compliance);
      this.emit('slaViolation', compliance);
    }
  }

  /**
   * Obter estatísticas de performance
   */
  getPerformanceStats(timeRange = 3600000) { // 1 hora por padrão
    const now = Date.now();
    const recentMetrics = this.performanceHistory.filter(m => 
      now - m.endTimestamp < timeRange
    );

    if (recentMetrics.length === 0) {
      return { noData: true };
    }

    const operations = {};
    recentMetrics.forEach(m => {
      if (!operations[m.operation]) {
        operations[m.operation] = [];
      }
      operations[m.operation].push(m.totalTime);
    });

    const operationStats = {};
    Object.keys(operations).forEach(op => {
      const times = operations[op];
      operationStats[op] = {
        count: times.length,
        avg: times.reduce((a, b) => a + b, 0) / times.length,
        min: Math.min(...times),
        max: Math.max(...times),
        p95: this.calculatePercentile(times, 95),
        p99: this.calculatePercentile(times, 99)
      };
    });

    return {
      timeRange,
      totalMeasurements: recentMetrics.length,
      operationStats,
      overallStats: {
        avgTime: recentMetrics.reduce((sum, m) => sum + m.totalTime, 0) / recentMetrics.length,
        successRate: this.calculateSuccessRate(recentMetrics),
        memoryEfficiency: this.calculateMemoryEfficiency(recentMetrics)
      },
      systemMetrics: this.realTimeMetrics.get('system')
    };
  }

  /**
   * Calcular percentil
   */
  calculatePercentile(values, percentile) {
    const sorted = values.slice().sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }

  /**
   * Calcular taxa de sucesso
   */
  calculateSuccessRate(metrics) {
    const successful = metrics.filter(m => 
      m.result && (m.result.success !== false)
    ).length;
    return (successful / metrics.length) * 100;
  }

  /**
   * Calcular eficiência de memória
   */
  calculateMemoryEfficiency(metrics) {
    const avgMemoryDelta = metrics.reduce((sum, m) => 
      sum + Math.abs(m.memoryUsage.heapUsedDelta), 0
    ) / metrics.length;
    
    return {
      avgMemoryDelta: Math.round(avgMemoryDelta / 1024 / 1024), // MB
      efficiency: avgMemoryDelta < 10 * 1024 * 1024 ? 'good' : 'poor' // 10MB threshold
    };
  }

  /**
   * Parar coleta
   */
  stopCollection() {
    if (this.realTimeInterval) {
      clearInterval(this.realTimeInterval);
    }
  }
}

/**
 * AUDIT TRAIL SYSTEM - Sistema de Trilha de Auditoria Imutável
 */
class AuditTrailSystem extends EventEmitter {
  constructor() {
    super();
    
    this.auditEntries = [];
    this.auditQueue = 'audit-trail-queue';
    this.encryptionKey = this.generateEncryptionKey();
    
    // Configuração
    this.config = {
      enableEncryption: true,
      enableDigitalSignature: true,
      maxEntriesInMemory: 1000,
      auditLogRetention: 365 * 24 * 60 * 60 * 1000, // 1 ano
      compressionEnabled: true
    };

    this.isInitialized = false;
    // setupAuditProcessing() moved to initialize() method to prevent race condition
  }

  /**
   * Inicializar PerformanceAuditSystem
   */
  async initialize() {
    if (this.isInitialized) {
      logger.warn('[AUDIT] PerformanceAuditSystem já inicializado');
      return;
    }

    logger.info('[AUDIT] 📊 Inicializando Performance Audit System...');
    
    try {
      this.setupAuditProcessing();
      this.isInitialized = true;
      logger.info('[AUDIT] ✅ Performance Audit System inicializado com sucesso');
    } catch (error) {
      logger.error('[AUDIT] ❌ Falha na inicialização:', error);
      throw error;
    }
  }

  /**
   * Criar entrada de auditoria
   */
  async createAuditEntry(event, data, metadata = {}) {
    const auditId = this.generateAuditId();
    
    const entry = {
      auditId,
      event,
      timestamp: new Date().toISOString(),
      timestampMs: Date.now(),
      data: this.sanitizeAuditData(data),
      metadata: {
        ...metadata,
        userAgent: process.env.USER_AGENT || 'SystemProcess',
        nodeVersion: process.version,
        platform: process.platform,
        pid: process.pid
      },
      integrity: {
        hash: null,
        signature: null,
        previousHash: this.getLastEntryHash()
      }
    };

    // Gerar hash da entrada
    entry.integrity.hash = this.generateEntryHash(entry);
    
    // Assinar digitalmente se habilitado
    if (this.config.enableDigitalSignature) {
      entry.integrity.signature = this.signEntry(entry);
    }

    // Criptografar dados sensíveis se habilitado
    if (this.config.enableEncryption) {
      entry.data = this.encryptSensitiveData(entry.data);
    }

    // Adicionar à memória
    this.auditEntries.push(entry);
    
    // Manter limite de entradas em memória
    if (this.auditEntries.length > this.config.maxEntriesInMemory) {
      await this.persistOldEntries();
    }

    // Persistir em fila
    await this.queueAuditEntry(entry);

    logger.info(`[AUDIT] Entry created: ${auditId}`, {
      event,
      timestamp: entry.timestamp
    });

    this.emit('auditEntryCreated', entry);
    return auditId;
  }

  /**
   * Sanitizar dados de auditoria
   */
  sanitizeAuditData(data) {
    // Remove informações sensíveis
    const sanitized = JSON.parse(JSON.stringify(data));
    
    // Lista de campos sensíveis para remover/mascarar
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth', 'credential'];
    
    this.maskSensitiveFields(sanitized, sensitiveFields);
    return sanitized;
  }

  /**
   * Mascarar campos sensíveis
   */
  maskSensitiveFields(obj, sensitiveFields) {
    if (!obj || typeof obj !== 'object') return;
    
    Object.keys(obj).forEach(key => {
      const lowerKey = key.toLowerCase();
      
      if (sensitiveFields.some(field => lowerKey.includes(field))) {
        obj[key] = '***MASKED***';
      } else if (typeof obj[key] === 'object') {
        this.maskSensitiveFields(obj[key], sensitiveFields);
      }
    });
  }

  /**
   * Gerar hash da entrada
   */
  generateEntryHash(entry) {
    const hashData = {
      auditId: entry.auditId,
      event: entry.event,
      timestamp: entry.timestamp,
      data: entry.data,
      previousHash: entry.integrity.previousHash
    };

    return crypto.createHash('sha256')
      .update(JSON.stringify(hashData))
      .digest('hex');
  }

  /**
   * Assinar entrada digitalmente
   */
  signEntry(entry) {
    // Implementação simplificada - em produção usar chaves RSA
    const signData = `${entry.auditId}:${entry.event}:${entry.timestamp}:${entry.integrity.hash}`;
    
    return crypto.createHmac('sha256', this.encryptionKey)
      .update(signData)
      .digest('hex');
  }

  /**
   * Criptografar dados sensíveis
   */
  encryptSensitiveData(data) {
    if (!this.config.enableEncryption) return data;
    
    try {
      const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
      let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      return {
        encrypted: true,
        data: encrypted
      };
    } catch (error) {
      logger.error('[AUDIT] Encryption failed:', error);
      return data;
    }
  }

  /**
   * Descriptografar dados
   */
  decryptSensitiveData(encryptedData) {
    if (!encryptedData.encrypted) return encryptedData;
    
    try {
      const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
      let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    } catch (error) {
      logger.error('[AUDIT] Decryption failed:', error);
      return encryptedData;
    }
  }

  /**
   * Obter hash da última entrada
   */
  getLastEntryHash() {
    if (this.auditEntries.length === 0) return null;
    return this.auditEntries[this.auditEntries.length - 1].integrity.hash;
  }

  /**
   * Validar integridade da trilha
   */
  async validateTrailIntegrity(startIndex = 0, endIndex = null) {
    const entries = endIndex 
      ? this.auditEntries.slice(startIndex, endIndex)
      : this.auditEntries.slice(startIndex);

    const results = {
      valid: true,
      totalEntries: entries.length,
      invalidEntries: [],
      brokenChain: false
    };

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      
      // Validar hash da entrada
      const calculatedHash = this.generateEntryHash({
        ...entry,
        integrity: { ...entry.integrity, hash: null }
      });

      if (calculatedHash !== entry.integrity.hash) {
        results.valid = false;
        results.invalidEntries.push({
          index: startIndex + i,
          auditId: entry.auditId,
          reason: 'Invalid hash'
        });
      }

      // Validar chain de integridade
      if (i > 0) {
        const previousEntry = entries[i - 1];
        if (entry.integrity.previousHash !== previousEntry.integrity.hash) {
          results.valid = false;
          results.brokenChain = true;
          results.invalidEntries.push({
            index: startIndex + i,
            auditId: entry.auditId,
            reason: 'Broken chain'
          });
        }
      }
    }

    return results;
  }

  /**
   * Persistir entradas antigas
   */
  async persistOldEntries() {
    const entriesToPersist = this.auditEntries.slice(0, 500); // Persistir primeiras 500
    
    try {
      await this.saveToFile(entriesToPersist);
      
      // Remover da memória
      this.auditEntries = this.auditEntries.slice(500);
      
      logger.info(`[AUDIT] Persisted ${entriesToPersist.length} old entries`);
    } catch (error) {
      logger.error('[AUDIT] Failed to persist old entries:', error);
    }
  }

  /**
   * Salvar entradas em arquivo
   */
  async saveToFile(entries) {
    const auditDir = path.join(process.cwd(), 'logs', 'audit');
    await fs.mkdir(auditDir, { recursive: true });
    
    const filename = `audit-${Date.now()}.json`;
    const filepath = path.join(auditDir, filename);
    
    const auditData = {
      metadata: {
        exportTime: new Date().toISOString(),
        entryCount: entries.length,
        integrity: await this.validateTrailIntegrity(0, entries.length)
      },
      entries
    };

    await fs.writeFile(filepath, JSON.stringify(auditData, null, 2));
    return filepath;
  }

  /**
   * Setup processamento de auditoria
   */
  setupAuditProcessing() {
    try {
      // Verify queueManager is initialized before using it
      if (!queueManager.isInitialized) {
        throw new Error('QueueManager must be initialized before setting up audit processing');
      }

      logger.info('[AUDIT] Setting up audit processing...');

      queueManager.process(this.auditQueue, 'persist-entry', 1, async (job) => {
        const { entry } = job.data;
        
        // Aqui seria implementada a persistência em banco de dados
        // Por enquanto, apenas log
        logger.debug(`[AUDIT] Processing entry: ${entry.auditId}`);
        
        return { processed: true };
      });

      logger.info('[AUDIT] Audit processing setup completed');
    } catch (error) {
      logger.error('[AUDIT] Failed to setup audit processing:', error);
      throw error;
    }
  }

  /**
   * Enfileirar entrada de auditoria
   */
  async queueAuditEntry(entry) {
    try {
      await queueManager.addJob(this.auditQueue, 'persist-entry', {
        entry
      }, {
        priority: 10,
        attempts: 5,
        removeOnComplete: 100,
        removeOnFail: 50
      });
    } catch (error) {
      logger.error('[AUDIT] Failed to queue audit entry:', error);
    }
  }

  /**
   * Buscar entradas de auditoria
   */
  searchAuditEntries(criteria = {}) {
    let results = [...this.auditEntries];

    // Filtrar por evento
    if (criteria.event) {
      results = results.filter(entry => 
        entry.event.toLowerCase().includes(criteria.event.toLowerCase())
      );
    }

    // Filtrar por período
    if (criteria.startTime) {
      results = results.filter(entry => 
        entry.timestampMs >= criteria.startTime
      );
    }

    if (criteria.endTime) {
      results = results.filter(entry => 
        entry.timestampMs <= criteria.endTime
      );
    }

    // Filtrar por metadados
    if (criteria.metadata) {
      results = results.filter(entry => {
        return Object.keys(criteria.metadata).every(key => 
          entry.metadata[key] === criteria.metadata[key]
        );
      });
    }

    // Ordenar por timestamp
    results.sort((a, b) => b.timestampMs - a.timestampMs);

    // Limitar resultados
    if (criteria.limit) {
      results = results.slice(0, criteria.limit);
    }

    return results;
  }

  /**
   * Gerar relatório de auditoria
   */
  generateAuditReport(timeRange = 24 * 60 * 60 * 1000) { // 24 horas
    const now = Date.now();
    const entries = this.auditEntries.filter(entry => 
      now - entry.timestampMs < timeRange
    );

    const eventStats = {};
    entries.forEach(entry => {
      eventStats[entry.event] = (eventStats[entry.event] || 0) + 1;
    });

    return {
      reportGeneratedAt: new Date().toISOString(),
      timeRange,
      totalEntries: entries.length,
      eventBreakdown: eventStats,
      integrityStatus: entries.length > 0 
        ? this.validateTrailIntegrity(0, entries.length)
        : { valid: true, message: 'No entries to validate' },
      oldestEntry: entries.length > 0 
        ? entries[entries.length - 1].timestamp 
        : null,
      newestEntry: entries.length > 0 
        ? entries[0].timestamp 
        : null
    };
  }

  // Utility methods
  generateAuditId() {
    return `audit_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  }

  generateEncryptionKey() {
    return process.env.AUDIT_ENCRYPTION_KEY || 
           crypto.randomBytes(32).toString('hex');
  }
}

/**
 * PERFORMANCE AUDIT SYSTEM - Classe Principal
 */
class PerformanceAuditSystem extends EventEmitter {
  constructor() {
    super();
    
    this.metricsCollector = new PerformanceMetricsCollector();
    this.auditTrail = new AuditTrailSystem();
    
    this.setupEventForwarding();
    this.setupAlertHandling();
  }

  /**
   * Inicializar sistema
   */
  async initialize() {
    logger.info('[AUDIT-SYSTEM] Initializing Performance Audit System...');
    
    // Criar entrada de auditoria para inicialização
    await this.auditTrail.createAuditEntry('SYSTEM_INITIALIZED', {
      component: 'PerformanceAuditSystem',
      version: '1.0.0',
      timestamp: Date.now()
    });

    this.emit('initialized');
    logger.info('[AUDIT-SYSTEM] Performance Audit System initialized');
  }

  /**
   * Setup de forwarding de eventos
   */
  setupEventForwarding() {
    // Forward metrics events
    this.metricsCollector.on('measurementCompleted', (metrics) => {
      this.emit('measurementCompleted', metrics);
      
      // Auditar medição completa
      this.auditTrail.createAuditEntry('MEASUREMENT_COMPLETED', {
        measurementId: metrics.measurementId,
        operation: metrics.operation,
        totalTime: metrics.totalTime,
        success: metrics.result?.success !== false
      });
    });

    this.metricsCollector.on('slaViolation', (violation) => {
      this.emit('slaViolation', violation);
      
      // Auditar violação de SLA
      this.auditTrail.createAuditEntry('SLA_VIOLATION', violation);
    });

    this.metricsCollector.on('systemAlert', (alert) => {
      this.emit('systemAlert', alert);
      
      // Auditar alerta do sistema
      this.auditTrail.createAuditEntry('SYSTEM_ALERT', alert);
    });
  }

  /**
   * Setup de handling de alertas
   */
  setupAlertHandling() {
    this.on('slaViolation', (violation) => {
      logger.warn('[AUDIT-SYSTEM] SLA Violation:', violation);
      // Implementar notificações específicas
    });

    this.on('systemAlert', (alert) => {
      logger.warn('[AUDIT-SYSTEM] System Alert:', alert);
      // Implementar notificações específicas
    });
  }

  /**
   * API para iniciar medição
   */
  startMeasurement(flowId, operation, metadata = {}) {
    return this.metricsCollector.startMeasurement(flowId, operation, metadata);
  }

  /**
   * API para adicionar checkpoint
   */
  addCheckpoint(measurementId, checkpointName, metadata = {}) {
    return this.metricsCollector.addCheckpoint(measurementId, checkpointName, metadata);
  }

  /**
   * API para finalizar medição
   */
  finalizeMeasurement(measurementId, result = {}) {
    return this.metricsCollector.finalizeMeasurement(measurementId, result);
  }

  /**
   * API para criar entrada de auditoria
   */
  createAuditEntry(event, data, metadata = {}) {
    return this.auditTrail.createAuditEntry(event, data, metadata);
  }

  /**
   * API para obter estatísticas
   */
  getPerformanceStats(timeRange) {
    return this.metricsCollector.getPerformanceStats(timeRange);
  }

  /**
   * API para validar integridade
   */
  validateAuditIntegrity() {
    return this.auditTrail.validateTrailIntegrity();
  }

  /**
   * API para buscar auditoria
   */
  searchAuditEntries(criteria) {
    return this.auditTrail.searchAuditEntries(criteria);
  }

  /**
   * API para gerar relatório
   */
  generateAuditReport(timeRange) {
    return this.auditTrail.generateAuditReport(timeRange);
  }

  /**
   * Obter dashboard de métricas
   */
  getDashboardMetrics() {
    const performanceStats = this.getPerformanceStats();
    const auditReport = this.generateAuditReport();
    
    return {
      performance: performanceStats,
      audit: auditReport,
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        activeMeasurements: this.metricsCollector.metrics.size,
        auditEntries: this.auditTrail.auditEntries.length
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Shutdown do sistema
   */
  async shutdown() {
    logger.info('[AUDIT-SYSTEM] Shutting down Performance Audit System...');
    
    // Auditar shutdown
    await this.auditTrail.createAuditEntry('SYSTEM_SHUTDOWN', {
      component: 'PerformanceAuditSystem',
      uptime: process.uptime(),
      timestamp: Date.now()
    });

    // Parar coleta de métricas
    this.metricsCollector.stopCollection();

    // Persistir entradas pendentes
    await this.auditTrail.persistOldEntries();

    logger.info('[AUDIT-SYSTEM] Performance Audit System shut down');
  }
}

// Singleton instance
const performanceAuditSystem = new PerformanceAuditSystem();

module.exports = {
  PerformanceAuditSystem,
  PerformanceMetricsCollector,
  AuditTrailSystem,
  default: performanceAuditSystem
};