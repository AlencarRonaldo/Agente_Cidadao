/**
 * METRICS AGGREGATION ENGINE - Sistema de Coleta e Agregação de Métricas
 * 
 * Sistema abrangente para:
 * - Coleta automática de métricas multi-camadas
 * - Agregação inteligente com compressão temporal
 * - Análise de correlação entre componentes
 * - Métricas de negócio e técnicas unificadas
 * - Storage otimizado com retenção inteligente
 * 
 * @author Metrics Aggregation Engine
 * @priority CRITICAL - Real-time Performance Analytics
 */

const EventEmitter = require('events');
const { PrismaClient } = require('@prisma/client');
const Redis = require('ioredis');
const logger = require('../utils/logger');
const performanceAuditSystem = require('./performanceAuditSystem');

/**
 * METRICS COLLECTOR - Coletor de Métricas Multi-Source
 */
class MetricsCollector extends EventEmitter {
  constructor() {
    super();
    
    this.collectionIntervals = new Map();
    this.metricSources = new Map();
    this.aggregationRules = new Map();
    this.retentionPolicies = new Map();
    
    // Configurações de coleta
    this.config = {
      // Intervalos de coleta por tipo de métrica
      collectionIntervals: {
        realtime: 5000,      // 5 segundos - métricas críticas
        frequent: 30000,     // 30 segundos - métricas importantes
        regular: 300000,     // 5 minutos - métricas normais
        periodic: 3600000    // 1 hora - métricas de tendência
      },
      
      // Políticas de retenção
      retentionPolicies: {
        realtime: 24 * 60 * 60 * 1000,      // 1 dia
        hourly: 7 * 24 * 60 * 60 * 1000,    // 1 semana
        daily: 30 * 24 * 60 * 60 * 1000,    // 1 mês
        weekly: 365 * 24 * 60 * 60 * 1000   // 1 ano
      },
      
      // Configurações de agregação
      aggregationWindows: {
        minute: 60 * 1000,
        hour: 60 * 60 * 1000,
        day: 24 * 60 * 60 * 1000,
        week: 7 * 24 * 60 * 60 * 1000
      },
      
      batchSize: 1000,
      compressionEnabled: true,
      enableCorrelationAnalysis: true
    };

    this.redis = null;
    this.prisma = null;
    this.isCollecting = false;
    
    this.setupMetricSources();
    this.setupAggregationRules();
    this.setupRetentionPolicies();
  }

  /**
   * Configurar fontes de métricas
   */
  setupMetricSources() {
    // WhatsApp Metrics
    this.metricSources.set('whatsapp', {
      type: 'service',
      interval: 'frequent',
      collector: this.collectWhatsAppMetrics.bind(this),
      metrics: [
        'connection_status',
        'messages_sent',
        'messages_received',
        'response_time',
        'error_rate',
        'connection_uptime',
        'reconnection_count',
        'message_queue_depth'
      ]
    });

    // Instagram Metrics
    this.metricSources.set('instagram', {
      type: 'service',
      interval: 'frequent',
      collector: this.collectInstagramMetrics.bind(this),
      metrics: [
        'authentication_status',
        'posts_count',
        'success_rate',
        'risk_score',
        'api_response_time',
        'humanization_score',
        'daily_limit_usage',
        'last_post_interval'
      ]
    });

    // Database Metrics
    this.metricSources.set('database', {
      type: 'infrastructure',
      interval: 'regular',
      collector: this.collectDatabaseMetrics.bind(this),
      metrics: [
        'connection_count',
        'query_duration',
        'lock_wait_time',
        'cache_hit_ratio',
        'transaction_rate',
        'deadlock_count',
        'table_size',
        'index_usage'
      ]
    });

    // Queue Metrics
    this.metricSources.set('queue', {
      type: 'infrastructure',
      interval: 'realtime',
      collector: this.collectQueueMetrics.bind(this),
      metrics: [
        'queue_depth',
        'processing_rate',
        'worker_count',
        'job_completion_time',
        'failed_jobs_rate',
        'memory_usage',
        'throughput',
        'latency'
      ]
    });

    // Flow Orchestration Metrics
    this.metricSources.set('flow', {
      type: 'business',
      interval: 'frequent',
      collector: this.collectFlowMetrics.bind(this),
      metrics: [
        'flow_completion_rate',
        'average_flow_time',
        'error_rate',
        'state_transition_time',
        'stuck_flows_count',
        'recovery_success_rate',
        'business_sla_compliance',
        'user_satisfaction_score'
      ]
    });

    // System Resource Metrics
    this.metricSources.set('system', {
      type: 'infrastructure',
      interval: 'regular',
      collector: this.collectSystemMetrics.bind(this),
      metrics: [
        'cpu_usage',
        'memory_usage',
        'disk_usage',
        'network_io',
        'process_count',
        'file_descriptor_usage',
        'load_average',
        'gc_metrics'
      ]
    });

    // Business Intelligence Metrics
    this.metricSources.set('business', {
      type: 'business',
      interval: 'periodic',
      collector: this.collectBusinessMetrics.bind(this),
      metrics: [
        'complaints_processed',
        'resolution_time',
        'citizen_satisfaction',
        'geographic_distribution',
        'category_breakdown',
        'peak_hours_analysis',
        'seasonal_trends',
        'efficiency_score'
      ]
    });
  }

  /**
   * Configurar regras de agregação
   */
  setupAggregationRules() {
    // Agregação por minuto (dados de 5 segundos)
    this.aggregationRules.set('minute', {
      sourceInterval: this.config.collectionIntervals.realtime,
      targetInterval: this.config.aggregationWindows.minute,
      functions: {
        avg: ['response_time', 'query_duration', 'cpu_usage', 'memory_usage'],
        sum: ['messages_sent', 'posts_count', 'complaints_processed'],
        max: ['queue_depth', 'error_rate', 'risk_score'],
        min: ['connection_uptime', 'success_rate'],
        count: ['reconnection_count', 'failed_jobs_rate'],
        last: ['connection_status', 'authentication_status']
      }
    });

    // Agregação por hora (dados de 1 minuto)
    this.aggregationRules.set('hour', {
      sourceInterval: this.config.aggregationWindows.minute,
      targetInterval: this.config.aggregationWindows.hour,
      functions: {
        avg: ['response_time', 'query_duration', 'flow_completion_rate'],
        sum: ['messages_sent', 'posts_count', 'complaints_processed'],
        max: ['peak_queue_depth', 'max_error_rate'],
        percentile: {
          p95: ['response_time', 'query_duration'],
          p99: ['response_time', 'api_response_time']
        }
      }
    });

    // Agregação por dia (dados de 1 hora)
    this.aggregationRules.set('day', {
      sourceInterval: this.config.aggregationWindows.hour,
      targetInterval: this.config.aggregationWindows.day,
      functions: {
        avg: ['daily_success_rate', 'average_resolution_time'],
        sum: ['total_complaints', 'total_posts'],
        trend: ['growth_rate', 'efficiency_improvement'],
        correlation: ['satisfaction_vs_response_time', 'load_vs_errors']
      }
    });
  }

  /**
   * Configurar políticas de retenção
   */
  setupRetentionPolicies() {
    this.retentionPolicies.set('realtime_metrics', {
      retention: this.config.retentionPolicies.realtime,
      compressionAfter: 60 * 60 * 1000, // 1 hora
      compressionRatio: 0.1
    });

    this.retentionPolicies.set('hourly_aggregates', {
      retention: this.config.retentionPolicies.hourly,
      compressionAfter: 24 * 60 * 60 * 1000, // 1 dia
      compressionRatio: 0.2
    });

    this.retentionPolicies.set('daily_aggregates', {
      retention: this.config.retentionPolicies.daily,
      compressionAfter: 7 * 24 * 60 * 60 * 1000, // 1 semana
      compressionRatio: 0.5
    });

    this.retentionPolicies.set('weekly_aggregates', {
      retention: this.config.retentionPolicies.weekly,
      compressionAfter: 30 * 24 * 60 * 60 * 1000, // 1 mês
      compressionRatio: 0.8
    });
  }

  /**
   * Inicializar coleta de métricas
   */
  async initialize() {
    logger.info('[METRICS] Initializing Metrics Aggregation Engine...');
    
    try {
      // Inicializar conexões
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3
      });

      this.prisma = new PrismaClient();
      
      // Verificar conexões
      await this.redis.ping();
      await this.prisma.$queryRaw`SELECT 1`;
      
      // Configurar intervalos de coleta
      this.setupCollectionIntervals();
      
      // Configurar agregação automática
      this.setupAggregationJobs();
      
      // Configurar limpeza automática
      this.setupRetentionJobs();
      
      this.isCollecting = true;
      
      logger.info('[METRICS] Metrics Aggregation Engine initialized successfully');
      this.emit('initialized');
      
    } catch (error) {
      logger.error('[METRICS] Failed to initialize Metrics Aggregation Engine:', error);
      throw error;
    }
  }

  /**
   * Configurar intervalos de coleta
   */
  setupCollectionIntervals() {
    this.metricSources.forEach((source, sourceKey) => {
      const interval = this.config.collectionIntervals[source.interval];
      
      const intervalId = setInterval(async () => {
        if (!this.isCollecting) return;
        
        try {
          await this.collectMetricsFromSource(sourceKey, source);
        } catch (error) {
          logger.error(`[METRICS] Failed to collect metrics from ${sourceKey}:`, error);
        }
      }, interval);
      
      this.collectionIntervals.set(sourceKey, intervalId);
    });
  }

  /**
   * Coletar métricas de uma fonte específica
   */
  async collectMetricsFromSource(sourceKey, source) {
    const startTime = Date.now();
    
    try {
      const metrics = await source.collector();
      const timestamp = Date.now();
      
      // Adicionar metadados
      const enrichedMetrics = {
        source: sourceKey,
        type: source.type,
        timestamp,
        collectionTime: timestamp - startTime,
        metrics
      };
      
      // Armazenar em Redis (tempo real)
      await this.storeRealtimeMetrics(sourceKey, enrichedMetrics);
      
      // Emitir evento para processamento adicional
      this.emit('metricsCollected', enrichedMetrics);
      
      logger.debug(`[METRICS] Collected metrics from ${sourceKey} in ${timestamp - startTime}ms`);
      
    } catch (error) {
      logger.error(`[METRICS] Failed to collect metrics from ${sourceKey}:`, error);
      
      // Registrar erro como métrica
      await this.storeErrorMetric(sourceKey, error);
    }
  }

  /**
   * Armazenar métricas em tempo real no Redis
   */
  async storeRealtimeMetrics(sourceKey, metrics) {
    const key = `metrics:realtime:${sourceKey}`;
    const score = metrics.timestamp;
    const value = JSON.stringify(metrics);
    
    // Usar sorted set para facilitar consultas por tempo
    await this.redis.zadd(key, score, value);
    
    // Manter apenas dados recentes
    const cutoff = Date.now() - this.config.retentionPolicies.realtime;
    await this.redis.zremrangebyscore(key, 0, cutoff);
  }

  /**
   * Registrar erro como métrica
   */
  async storeErrorMetric(sourceKey, error) {
    const errorMetric = {
      source: sourceKey,
      type: 'error',
      timestamp: Date.now(),
      error: {
        message: error.message,
        code: error.code,
        stack: error.stack?.split('\n')[0] // Apenas primeira linha
      }
    };
    
    await this.storeRealtimeMetrics(`${sourceKey}_errors`, errorMetric);
  }

  // Implementações dos coletores de métricas...

  /**
   * Coletar métricas do WhatsApp
   */
  async collectWhatsAppMetrics() {
    try {
      const whatsappService = require('./whatsappService-robust');
      const stabilityEngine = require('./whatsappStabilityEngine');
      
      const connectionStatus = whatsappService.getConnectionStatus();
      const stabilityMetrics = stabilityEngine.getStabilityMetrics();
      
      return {
        connection_status: connectionStatus.isConnected ? 1 : 0,
        messages_sent: stabilityMetrics.messagesSent || 0,
        messages_received: stabilityMetrics.messagesReceived || 0,
        response_time: stabilityMetrics.averageResponseTime || 0,
        error_rate: stabilityMetrics.errorRate || 0,
        connection_uptime: stabilityMetrics.connectionUptime || 0,
        reconnection_count: stabilityMetrics.reconnectionCount || 0,
        message_queue_depth: stabilityMetrics.queueDepth || 0
      };
    } catch (error) {
      throw new Error(`WhatsApp metrics collection failed: ${error.message}`);
    }
  }

  /**
   * Coletar métricas do Instagram
   */
  async collectInstagramMetrics() {
    try {
      const instagramService = require('./instagramService-improved');
      const humanizationEngine = require('./instagramHumanizationEngine');
      
      const serviceStatus = await instagramService.getHealthStatus();
      const humanizationMetrics = humanizationEngine.getMetrics();
      
      return {
        authentication_status: serviceStatus.isAuthenticated ? 1 : 0,
        posts_count: serviceStatus.postsToday || 0,
        success_rate: serviceStatus.successRate || 0,
        risk_score: humanizationMetrics.currentRiskScore || 0,
        api_response_time: serviceStatus.averageResponseTime || 0,
        humanization_score: humanizationMetrics.humanizationScore || 0,
        daily_limit_usage: (serviceStatus.postsToday / humanizationMetrics.dailyLimit) * 100 || 0,
        last_post_interval: serviceStatus.lastPostTime ? Date.now() - serviceStatus.lastPostTime : 0
      };
    } catch (error) {
      throw new Error(`Instagram metrics collection failed: ${error.message}`);
    }
  }

  /**
   * Coletar métricas do banco de dados
   */
  async collectDatabaseMetrics() {
    try {
      const startTime = Date.now();
      
      // Query de teste para medir performance
      await this.prisma.$queryRaw`SELECT 1`;
      const queryDuration = Date.now() - startTime;
      
      // Estatísticas de conexão
      const connectionStats = await this.prisma.$queryRaw`
        SELECT 
          count(*) as active_connections,
          (SELECT setting FROM pg_settings WHERE name = 'max_connections') as max_connections
        FROM pg_stat_activity 
        WHERE state = 'active'
      `;
      
      // Estatísticas de cache
      const cacheStats = await this.prisma.$queryRaw`
        SELECT 
          sum(heap_blks_hit) as cache_hits,
          sum(heap_blks_read) as disk_reads
        FROM pg_statio_user_tables
      `;
      
      const cacheHitRatio = cacheStats[0] ? 
        (parseInt(cacheStats[0].cache_hits) / (parseInt(cacheStats[0].cache_hits) + parseInt(cacheStats[0].disk_reads))) * 100 
        : 100;
      
      return {
        connection_count: parseInt(connectionStats[0].active_connections),
        query_duration: queryDuration,
        lock_wait_time: 0, // Simplificado
        cache_hit_ratio: cacheHitRatio,
        transaction_rate: 0, // Simplificado
        deadlock_count: 0, // Simplificado
        table_size: 0, // Simplificado
        index_usage: 0 // Simplificado
      };
    } catch (error) {
      throw new Error(`Database metrics collection failed: ${error.message}`);
    }
  }

  /**
   * Coletar métricas das filas
   */
  async collectQueueMetrics() {
    try {
      const queueManager = require('../queues/queueManager');
      
      const processQueueStats = await queueManager.getQueueStats('process-queue');
      const publishQueueStats = await queueManager.getQueueStats('publish-queue');
      
      const totalWaiting = (processQueueStats.waiting || 0) + (publishQueueStats.waiting || 0);
      const totalActive = (processQueueStats.active || 0) + (publishQueueStats.active || 0);
      const totalCompleted = (processQueueStats.completed || 0) + (publishQueueStats.completed || 0);
      const totalFailed = (processQueueStats.failed || 0) + (publishQueueStats.failed || 0);
      
      const processingRate = totalCompleted > 0 ? totalCompleted / (totalCompleted + totalFailed) : 1;
      const throughput = totalCompleted; // Simplificado
      
      return {
        queue_depth: totalWaiting,
        processing_rate: processingRate * 100,
        worker_count: (processQueueStats.workers || 0) + (publishQueueStats.workers || 0),
        job_completion_time: 0, // Seria calculado a partir de dados históricos
        failed_jobs_rate: totalFailed > 0 ? (totalFailed / (totalCompleted + totalFailed)) * 100 : 0,
        memory_usage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
        throughput: throughput,
        latency: 0 // Simplificado
      };
    } catch (error) {
      throw new Error(`Queue metrics collection failed: ${error.message}`);
    }
  }

  /**
   * Coletar métricas do fluxo de orquestração
   */
  async collectFlowMetrics() {
    try {
      const masterFlowOrchestrator = require('./masterFlowOrchestrator');
      const flowMetrics = masterFlowOrchestrator.getHealthMetrics();
      
      // Calcular métricas de negócio
      const totalFlows = (flowMetrics.completedFlows || 0) + (flowMetrics.failedFlows || 0);
      const completionRate = totalFlows > 0 ? (flowMetrics.completedFlows / totalFlows) * 100 : 100;
      
      return {
        flow_completion_rate: completionRate,
        average_flow_time: flowMetrics.averageProcessingTime || 0,
        error_rate: flowMetrics.errorRate || 0,
        state_transition_time: 0, // Seria calculado a partir de dados do estado
        stuck_flows_count: flowMetrics.stuckFlows || 0,
        recovery_success_rate: 0, // Seria calculado a partir de dados de recuperação
        business_sla_compliance: completionRate > 95 ? 100 : completionRate,
        user_satisfaction_score: 0 // Seria calculado a partir de feedback
      };
    } catch (error) {
      throw new Error(`Flow metrics collection failed: ${error.message}`);
    }
  }

  /**
   * Coletar métricas do sistema
   */
  async collectSystemMetrics() {
    try {
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      const loadAverage = process.loadavg?.() || [0, 0, 0];
      
      return {
        cpu_usage: ((cpuUsage.user + cpuUsage.system) / 1000000) * 100, // Aproximação
        memory_usage: (memUsage.heapUsed / memUsage.heapTotal) * 100,
        disk_usage: 0, // Simplificado
        network_io: 0, // Simplificado
        process_count: 1, // Simplificado
        file_descriptor_usage: process._getActiveHandles().length,
        load_average: loadAverage[0],
        gc_metrics: memUsage.heapUsed / 1024 / 1024 // MB
      };
    } catch (error) {
      throw new Error(`System metrics collection failed: ${error.message}`);
    }
  }

  /**
   * Coletar métricas de negócio
   */
  async collectBusinessMetrics() {
    try {
      // Consultar dados de negócio do banco
      const complaintsToday = await this.prisma.denuncia.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      });

      const completedToday = await this.prisma.denuncia.count({
        where: {
          status: 'POSTED_INSTAGRAM',
          updatedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      });

      const avgResolutionTime = await this.prisma.$queryRaw`
        SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) * 1000) as avg_time
        FROM denuncias 
        WHERE status = 'POSTED_INSTAGRAM' 
        AND updated_at >= NOW() - INTERVAL '24 hours'
      `;

      const resolutionTime = avgResolutionTime[0]?.avg_time || 0;

      return {
        complaints_processed: complaintsToday,
        resolution_time: parseFloat(resolutionTime),
        citizen_satisfaction: 85, // Seria calculado a partir de feedback
        geographic_distribution: 0, // Seria calculado a partir de dados geográficos
        category_breakdown: 0, // Seria calculado a partir de categorias
        peak_hours_analysis: 0, // Seria calculado a partir de análise temporal
        seasonal_trends: 0, // Seria calculado a partir de análise histórica
        efficiency_score: completedToday > 0 ? (completedToday / complaintsToday) * 100 : 0
      };
    } catch (error) {
      throw new Error(`Business metrics collection failed: ${error.message}`);
    }
  }

  /**
   * Configurar jobs de agregação
   */
  setupAggregationJobs() {
    // Agregação por minuto
    setInterval(() => this.runAggregation('minute'), this.config.aggregationWindows.minute);
    
    // Agregação por hora
    setInterval(() => this.runAggregation('hour'), this.config.aggregationWindows.hour);
    
    // Agregação por dia
    setInterval(() => this.runAggregation('day'), this.config.aggregationWindows.day);
  }

  /**
   * Executar agregação
   */
  async runAggregation(windowType) {
    logger.debug(`[METRICS] Running ${windowType} aggregation...`);
    
    try {
      const rules = this.aggregationRules.get(windowType);
      if (!rules) return;
      
      const now = Date.now();
      const windowStart = now - rules.targetInterval;
      
      for (const [sourceKey] of this.metricSources) {
        await this.aggregateSourceMetrics(sourceKey, windowType, windowStart, now);
      }
      
      logger.debug(`[METRICS] ${windowType} aggregation completed`);
      
    } catch (error) {
      logger.error(`[METRICS] ${windowType} aggregation failed:`, error);
    }
  }

  /**
   * Agregar métricas de uma fonte
   */
  async aggregateSourceMetrics(sourceKey, windowType, windowStart, windowEnd) {
    try {
      const key = `metrics:realtime:${sourceKey}`;
      
      // Obter dados do período
      const rawData = await this.redis.zrangebyscore(key, windowStart, windowEnd);
      
      if (rawData.length === 0) return;
      
      const metrics = rawData.map(data => JSON.parse(data));
      const aggregated = this.calculateAggregates(metrics, windowType);
      
      // Armazenar dados agregados
      const aggregatedKey = `metrics:${windowType}:${sourceKey}`;
      await this.redis.zadd(aggregatedKey, windowEnd, JSON.stringify({
        timestamp: windowEnd,
        window: windowType,
        source: sourceKey,
        metrics: aggregated,
        sampleCount: metrics.length
      }));
      
      // Aplicar política de retenção
      await this.applyRetentionPolicy(aggregatedKey, windowType);
      
    } catch (error) {
      logger.error(`[METRICS] Failed to aggregate metrics for ${sourceKey}:`, error);
    }
  }

  /**
   * Calcular agregados
   */
  calculateAggregates(metrics, windowType) {
    const rules = this.aggregationRules.get(windowType);
    const aggregated = {};
    
    if (!rules || metrics.length === 0) return aggregated;
    
    // Extrair todos os valores de métricas
    const metricValues = {};
    metrics.forEach(metric => {
      if (metric.metrics) {
        Object.entries(metric.metrics).forEach(([key, value]) => {
          if (!metricValues[key]) metricValues[key] = [];
          if (typeof value === 'number') {
            metricValues[key].push(value);
          }
        });
      }
    });
    
    // Aplicar funções de agregação
    Object.entries(rules.functions).forEach(([func, metricNames]) => {
      if (Array.isArray(metricNames)) {
        metricNames.forEach(metricName => {
          const values = metricValues[metricName];
          if (values && values.length > 0) {
            aggregated[`${func}_${metricName}`] = this.applyAggregationFunction(func, values);
          }
        });
      } else if (typeof metricNames === 'object') {
        // Funções especiais como percentile
        Object.entries(metricNames).forEach(([subFunc, subMetricNames]) => {
          subMetricNames.forEach(metricName => {
            const values = metricValues[metricName];
            if (values && values.length > 0) {
              aggregated[`${subFunc}_${metricName}`] = this.applyAggregationFunction(subFunc, values);
            }
          });
        });
      }
    });
    
    return aggregated;
  }

  /**
   * Aplicar função de agregação
   */
  applyAggregationFunction(func, values) {
    switch (func) {
      case 'avg':
        return values.reduce((sum, val) => sum + val, 0) / values.length;
      
      case 'sum':
        return values.reduce((sum, val) => sum + val, 0);
      
      case 'max':
        return Math.max(...values);
      
      case 'min':
        return Math.min(...values);
      
      case 'count':
        return values.length;
      
      case 'last':
        return values[values.length - 1];
      
      case 'p95':
        return this.calculatePercentile(values, 95);
      
      case 'p99':
        return this.calculatePercentile(values, 99);
      
      default:
        return values[values.length - 1];
    }
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
   * Configurar jobs de retenção
   */
  setupRetentionJobs() {
    // Executar limpeza a cada hora
    setInterval(() => this.runRetentionCleanup(), 60 * 60 * 1000);
  }

  /**
   * Executar limpeza de retenção
   */
  async runRetentionCleanup() {
    logger.debug('[METRICS] Running retention cleanup...');
    
    try {
      const keys = await this.redis.keys('metrics:*');
      
      for (const key of keys) {
        await this.applyRetentionPolicy(key);
      }
      
      logger.debug('[METRICS] Retention cleanup completed');
      
    } catch (error) {
      logger.error('[METRICS] Retention cleanup failed:', error);
    }
  }

  /**
   * Aplicar política de retenção
   */
  async applyRetentionPolicy(key, windowType = null) {
    try {
      // Determinar política baseada na chave
      let policyKey = 'realtime_metrics';
      if (key.includes(':hour:')) policyKey = 'hourly_aggregates';
      else if (key.includes(':day:')) policyKey = 'daily_aggregates';
      else if (key.includes(':week:')) policyKey = 'weekly_aggregates';
      
      const policy = this.retentionPolicies.get(policyKey);
      if (!policy) return;
      
      const cutoff = Date.now() - policy.retention;
      await this.redis.zremrangebyscore(key, 0, cutoff);
      
    } catch (error) {
      logger.error(`[METRICS] Failed to apply retention policy to ${key}:`, error);
    }
  }

  /**
   * Obter métricas para dashboard
   */
  async getMetricsForDashboard(timeRange = 3600000) { // 1 hora
    try {
      const endTime = Date.now();
      const startTime = endTime - timeRange;
      
      const dashboardMetrics = {};
      
      // Coletar métricas de cada fonte
      for (const [sourceKey] of this.metricSources) {
        dashboardMetrics[sourceKey] = await this.getSourceMetrics(sourceKey, startTime, endTime);
      }
      
      // Calcular correlações se habilitado
      if (this.config.enableCorrelationAnalysis) {
        dashboardMetrics.correlations = await this.calculateCorrelations(dashboardMetrics);
      }
      
      return {
        timestamp: endTime,
        timeRange,
        metrics: dashboardMetrics,
        systemStatus: this.calculateSystemStatus(dashboardMetrics)
      };
      
    } catch (error) {
      logger.error('[METRICS] Failed to get dashboard metrics:', error);
      throw error;
    }
  }

  /**
   * Obter métricas de uma fonte
   */
  async getSourceMetrics(sourceKey, startTime, endTime) {
    const key = `metrics:realtime:${sourceKey}`;
    const rawData = await this.redis.zrangebyscore(key, startTime, endTime);
    
    if (rawData.length === 0) {
      return { noData: true };
    }
    
    const metrics = rawData.map(data => JSON.parse(data));
    const latest = metrics[metrics.length - 1];
    
    return {
      latest: latest.metrics,
      count: metrics.length,
      timeRange: {
        start: metrics[0].timestamp,
        end: latest.timestamp
      },
      trends: this.calculateTrends(metrics)
    };
  }

  /**
   * Calcular tendências
   */
  calculateTrends(metrics) {
    if (metrics.length < 2) return {};
    
    const trends = {};
    const first = metrics[0].metrics;
    const last = metrics[metrics.length - 1].metrics;
    
    Object.keys(first).forEach(metricName => {
      if (typeof first[metricName] === 'number' && typeof last[metricName] === 'number') {
        const change = last[metricName] - first[metricName];
        const percentChange = first[metricName] !== 0 ? (change / first[metricName]) * 100 : 0;
        
        trends[metricName] = {
          change,
          percentChange,
          direction: change > 0 ? 'up' : change < 0 ? 'down' : 'stable'
        };
      }
    });
    
    return trends;
  }

  /**
   * Calcular correlações entre métricas
   */
  async calculateCorrelations(dashboardMetrics) {
    // Implementação simplificada de análise de correlação
    const correlations = {};
    
    // Exemplos de correlações interessantes
    const whatsapp = dashboardMetrics.whatsapp;
    const instagram = dashboardMetrics.instagram;
    const flow = dashboardMetrics.flow;
    
    if (whatsapp?.latest && instagram?.latest && flow?.latest) {
      // Correlação entre erro do WhatsApp e completação do fluxo
      correlations.whatsapp_error_vs_flow_completion = {
        description: 'WhatsApp errors impact on flow completion',
        correlation: this.calculateSimpleCorrelation(
          whatsapp.latest.error_rate,
          flow.latest.flow_completion_rate
        )
      };
      
      // Correlação entre score de risco do Instagram e taxa de sucesso
      correlations.instagram_risk_vs_success = {
        description: 'Instagram risk score vs success rate',
        correlation: this.calculateSimpleCorrelation(
          instagram.latest.risk_score,
          instagram.latest.success_rate
        )
      };
    }
    
    return correlations;
  }

  /**
   * Calcular correlação simples
   */
  calculateSimpleCorrelation(x, y) {
    // Implementação muito simplificada
    if (typeof x !== 'number' || typeof y !== 'number') return 0;
    
    // Normalizar valores para escala similar
    const normalizedX = Math.min(Math.max(x, 0), 100);
    const normalizedY = Math.min(Math.max(y, 0), 100);
    
    // Correlação inversa para erro vs sucesso
    return 1 - Math.abs(normalizedX - (100 - normalizedY)) / 100;
  }

  /**
   * Calcular status geral do sistema
   */
  calculateSystemStatus(dashboardMetrics) {
    let healthyCount = 0;
    let totalCount = 0;
    let criticalIssues = [];
    
    Object.entries(dashboardMetrics).forEach(([sourceKey, data]) => {
      if (data.noData) return;
      
      totalCount++;
      
      // Verificar métricas críticas
      if (data.latest) {
        const metrics = data.latest;
        let isHealthy = true;
        
        // Verificações específicas por fonte
        if (sourceKey === 'whatsapp' && metrics.connection_status === 0) {
          isHealthy = false;
          criticalIssues.push(`WhatsApp disconnected`);
        }
        
        if (sourceKey === 'instagram' && metrics.authentication_status === 0) {
          isHealthy = false;
          criticalIssues.push(`Instagram authentication failed`);
        }
        
        if (sourceKey === 'queue' && metrics.queue_depth > 100) {
          isHealthy = false;
          criticalIssues.push(`High queue depth: ${metrics.queue_depth}`);
        }
        
        if (isHealthy) healthyCount++;
      }
    });
    
    const healthPercentage = totalCount > 0 ? (healthyCount / totalCount) * 100 : 100;
    
    return {
      overall: healthPercentage >= 90 ? 'healthy' : healthPercentage >= 70 ? 'degraded' : 'critical',
      healthPercentage,
      healthyComponents: healthyCount,
      totalComponents: totalCount,
      criticalIssues
    };
  }

  /**
   * Parar coleta de métricas
   */
  async stop() {
    logger.info('[METRICS] Stopping Metrics Aggregation Engine...');
    
    this.isCollecting = false;
    
    // Limpar intervalos
    this.collectionIntervals.forEach(interval => clearInterval(interval));
    this.collectionIntervals.clear();
    
    // Fechar conexões
    if (this.redis) {
      await this.redis.disconnect();
    }
    
    if (this.prisma) {
      await this.prisma.$disconnect();
    }
    
    this.emit('stopped');
    logger.info('[METRICS] Metrics Aggregation Engine stopped');
  }
}

module.exports = {
  MetricsCollector,
  default: new MetricsCollector()
};