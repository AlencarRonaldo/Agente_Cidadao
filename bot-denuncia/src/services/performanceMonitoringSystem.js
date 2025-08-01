/**
 * PERFORMANCE MONITORING SYSTEM
 * 
 * Sistema avançado de monitoramento de performance com:
 * - Métricas em tempo real
 * - Alertas automáticos
 * - Análise de tendências
 * - Otimização automática
 * - Relatórios detalhados
 * 
 * @author Integration Flow Orchestrator
 * @priority HIGH - Production Monitoring
 */

const EventEmitter = require('events');
const os = require('os');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * METRICS COLLECTOR
 * Coleta métricas do sistema e aplicação
 */
class MetricsCollector extends EventEmitter {
  constructor() {
    super();
    this.metrics = new Map();
    this.timeSeries = new Map();
    this.alerts = [];
    this.thresholds = {
      cpu: { warning: 70, critical: 90 },
      memory: { warning: 80, critical: 95 },
      responseTime: { warning: 1000, critical: 5000 },
      errorRate: { warning: 1, critical: 5 },
      queueSize: { warning: 100, critical: 500 }
    };
    this.collectionInterval = null;
    this.retentionPeriod = 24 * 60 * 60 * 1000; // 24 horas
  }

  /**
   * Inicializar coleta de métricas
   */
  start() {
    logger.info('[METRICS] Iniciando coleta de métricas...');
    
    // Coleta a cada 10 segundos
    this.collectionInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, 10000);

    // Limpeza de dados antigos a cada hora
    setInterval(() => {
      this.cleanupOldMetrics();
    }, 60 * 60 * 1000);

    this.collectSystemMetrics(); // Coleta inicial
  }

  /**
   * Parar coleta de métricas
   */
  stop() {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
    }
    logger.info('[METRICS] Coleta de métricas parada');
  }

  /**
   * Coletar métricas do sistema
   */
  async collectSystemMetrics() {
    const timestamp = Date.now();
    
    try {
      // Métricas de CPU
      const cpuUsage = await this.getCpuUsage();
      
      // Métricas de memória
      const memoryUsage = this.getMemoryUsage();
      
      // Métricas de processo
      const processMetrics = this.getProcessMetrics();
      
      // Métricas de rede (se disponível)
      const networkMetrics = await this.getNetworkMetrics();

      const systemMetrics = {
        timestamp,
        cpu: cpuUsage,
        memory: memoryUsage,
        process: processMetrics,
        network: networkMetrics,
        load: os.loadavg(),
        uptime: os.uptime()
      };

      this.storeMetric('system', systemMetrics);
      this.checkThresholds('system', systemMetrics);
      this.emit('metricsCollected', systemMetrics);

    } catch (error) {
      logger.error('[METRICS] Erro na coleta de métricas do sistema:', error);
    }
  }

  /**
   * Obter uso de CPU
   */
  async getCpuUsage() {
    return new Promise((resolve) => {
      const startMeasure = process.cpuUsage();
      const startTime = process.hrtime.bigint();

      setTimeout(() => {
        const endMeasure = process.cpuUsage(startMeasure);
        const endTime = process.hrtime.bigint();
        
        const totalTime = Number(endTime - startTime) / 1000000; // Convert to ms
        const cpuPercent = ((endMeasure.user + endMeasure.system) / 1000) / totalTime * 100;
        
        resolve({
          percent: Math.min(100, Math.max(0, cpuPercent)),
          user: endMeasure.user,
          system: endMeasure.system
        });
      }, 100);
    });
  }

  /**
   * Obter uso de memória
   */
  getMemoryUsage() {
    const processMemory = process.memoryUsage();
    const systemMemory = {
      total: os.totalmem(),
      free: os.freemem(),
      used: os.totalmem() - os.freemem()
    };

    return {
      process: {
        heapUsed: processMemory.heapUsed,
        heapTotal: processMemory.heapTotal,
        external: processMemory.external,
        rss: processMemory.rss,
        heapPercent: (processMemory.heapUsed / processMemory.heapTotal) * 100
      },
      system: {
        ...systemMemory,
        percent: (systemMemory.used / systemMemory.total) * 100
      }
    };
  }

  /**
   * Obter métricas de processo
   */
  getProcessMetrics() {
    return {
      pid: process.pid,
      ppid: process.ppid,
      uptime: process.uptime(),
      version: process.version,
      platform: process.platform,
      arch: process.arch
    };
  }

  /**
   * Obter métricas de rede (placeholder)
   */
  async getNetworkMetrics() {
    // Implementação básica - pode ser expandida
    return {
      interfaces: Object.keys(os.networkInterfaces()).length,
      // Adicionar métricas de tráfego se disponível
    };
  }

  /**
   * Registrar métrica de aplicação
   */
  recordApplicationMetric(category, name, value, metadata = {}) {
    const timestamp = Date.now();
    const metric = {
      timestamp,
      category,
      name,
      value,
      metadata
    };

    this.storeMetric(`app_${category}_${name}`, metric);
    this.emit('applicationMetric', metric);

    // Verificar thresholds se definidos
    if (this.thresholds[name]) {
      this.checkThresholds(name, { [name]: value }, metadata);
    }
  }

  /**
   * Armazenar métrica
   */
  storeMetric(key, data) {
    // Armazenar valor atual
    this.metrics.set(key, data);

    // Armazenar série temporal
    if (!this.timeSeries.has(key)) {
      this.timeSeries.set(key, []);
    }
    
    const series = this.timeSeries.get(key);
    series.push(data);

    // Limitar tamanho da série (últimas 1000 entradas)
    if (series.length > 1000) {
      series.shift();
    }
  }

  /**
   * Verificar thresholds e gerar alertas
   */
  checkThresholds(category, data, metadata = {}) {
    Object.entries(this.thresholds).forEach(([metric, threshold]) => {
      const value = this.extractValue(data, metric);
      if (value === null || value === undefined) return;

      let level = null;
      if (value >= threshold.critical) {
        level = 'critical';
      } else if (value >= threshold.warning) {
        level = 'warning';
      }

      if (level) {
        this.generateAlert(category, metric, value, level, threshold, metadata);
      }
    });
  }

  /**
   * Extrair valor da métrica
   */
  extractValue(data, metric) {
    switch (metric) {
      case 'cpu':
        return data.cpu?.percent;
      case 'memory':
        return data.memory?.system?.percent || data.memory?.process?.heapPercent;
      case 'responseTime':
        return data.responseTime;
      case 'errorRate':
        return data.errorRate;
      case 'queueSize':
        return data.queueSize;
      default:
        return data[metric];
    }
  }

  /**
   * Gerar alerta
   */
  generateAlert(category, metric, value, level, threshold, metadata) {
    const alert = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      category,
      metric,
      value,
      level,
      threshold,
      metadata,
      resolved: false
    };

    this.alerts.push(alert);

    // Limitar número de alertas (últimos 500)
    if (this.alerts.length > 500) {
      this.alerts.shift();
    }

    logger.warn(`[METRICS] Alerta ${level}: ${metric} = ${value} (threshold: ${threshold[level]})`, {
      category,
      metadata
    });

    this.emit('alert', alert);
  }

  /**
   * Resolver alerta
   */
  resolveAlert(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = Date.now();
      this.emit('alertResolved', alert);
    }
  }

  /**
   * Obter métricas atuais
   */
  getCurrentMetrics() {
    const result = {};
    for (const [key, value] of this.metrics.entries()) {
      result[key] = value;
    }
    return result;
  }

  /**
   * Obter série temporal
   */
  getTimeSeries(key, startTime = null, endTime = null) {
    const series = this.timeSeries.get(key) || [];
    
    if (!startTime && !endTime) {
      return series;
    }

    return series.filter(point => {
      return (!startTime || point.timestamp >= startTime) &&
             (!endTime || point.timestamp <= endTime);
    });
  }

  /**
   * Obter alertas ativos
   */
  getActiveAlerts() {
    return this.alerts.filter(alert => !alert.resolved);
  }

  /**
   * Obter estatísticas
   */
  getStatistics(key, period = 3600000) { // 1 hora por padrão
    const series = this.getTimeSeries(key, Date.now() - period);
    
    if (series.length === 0) {
      return { count: 0 };
    }

    const values = series.map(point => {
      if (typeof point.value === 'number') return point.value;
      if (point.cpu?.percent) return point.cpu.percent;
      if (point.memory?.system?.percent) return point.memory.system.percent;
      return 0;
    }).filter(v => v !== null && v !== undefined);

    if (values.length === 0) {
      return { count: series.length };
    }

    const sum = values.reduce((a, b) => a + b, 0);
    const sortedValues = values.sort((a, b) => a - b);

    return {
      count: values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      avg: sum / values.length,
      median: sortedValues[Math.floor(sortedValues.length / 2)],
      p95: sortedValues[Math.floor(sortedValues.length * 0.95)],
      p99: sortedValues[Math.floor(sortedValues.length * 0.99)]
    };
  }

  /**
   * Limpeza de métricas antigas
   */
  cleanupOldMetrics() {
    const cutoff = Date.now() - this.retentionPeriod;
    let cleaned = 0;

    for (const [key, series] of this.timeSeries.entries()) {
      const originalLength = series.length;
      this.timeSeries.set(key, series.filter(point => point.timestamp > cutoff));
      cleaned += originalLength - series.length;
    }

    // Limpar alertas antigos
    const originalAlerts = this.alerts.length;
    this.alerts = this.alerts.filter(alert => alert.timestamp > cutoff);
    cleaned += originalAlerts - this.alerts.length;

    if (cleaned > 0) {
      logger.info(`[METRICS] Limpeza: ${cleaned} entradas antigas removidas`);
    }
  }

  /**
   * Definir threshold customizado
   */
  setThreshold(metric, warning, critical) {
    this.thresholds[metric] = { warning, critical };
    logger.info(`[METRICS] Threshold atualizado: ${metric} (warning: ${warning}, critical: ${critical})`);
  }
}

/**
 * PERFORMANCE ANALYZER
 * Análise avançada de performance
 */
class PerformanceAnalyzer {
  constructor(metricsCollector) {
    this.metricsCollector = metricsCollector;
    this.analysisInterval = null;
    this.patterns = new Map();
    this.recommendations = [];
  }

  /**
   * Iniciar análise
   */
  start() {
    logger.info('[PERFORMANCE] Iniciando análise de performance...');
    
    // Análise a cada 5 minutos
    this.analysisInterval = setInterval(() => {
      this.performAnalysis();
    }, 5 * 60 * 1000);

    // Análise inicial após 1 minuto
    setTimeout(() => {
      this.performAnalysis();
    }, 60000);
  }

  /**
   * Parar análise
   */
  stop() {
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = null;
    }
    logger.info('[PERFORMANCE] Análise de performance parada');
  }

  /**
   * Realizar análise completa
   */
  async performAnalysis() {
    try {
      logger.debug('[PERFORMANCE] Executando análise de performance...');

      // Análise de tendências
      await this.analyzeTrends();

      // Análise de padrões
      await this.analyzePatterns();

      // Análise de correlações
      await this.analyzeCorrelations();

      // Gerar recomendações
      await this.generateRecommendations();

      logger.debug('[PERFORMANCE] Análise de performance concluída');

    } catch (error) {
      logger.error('[PERFORMANCE] Erro na análise de performance:', error);
    }
  }

  /**
   * Analisar tendências
   */
  async analyzeTrends() {
    const period = 30 * 60 * 1000; // 30 minutos
    const metrics = ['system', 'app_flow_processing', 'app_cache_performance'];

    for (const metric of metrics) {
      const stats = this.metricsCollector.getStatistics(metric, period);
      
      if (stats.count > 10) {
        const trend = this.calculateTrend(metric, period);
        
        if (Math.abs(trend) > 0.1) { // Trend significativo
          this.patterns.set(`trend_${metric}`, {
            type: 'trend',
            metric,
            direction: trend > 0 ? 'increasing' : 'decreasing',
            magnitude: Math.abs(trend),
            period,
            timestamp: Date.now()
          });
        }
      }
    }
  }

  /**
   * Calcular tendência
   */
  calculateTrend(metric, period) {
    const series = this.metricsCollector.getTimeSeries(metric, Date.now() - period);
    
    if (series.length < 5) return 0;

    // Regressão linear simples
    const n = series.length;
    const sumX = series.reduce((sum, _, i) => sum + i, 0);
    const sumY = series.reduce((sum, point) => {
      const value = this.extractNumericValue(point);
      return sum + (value || 0);
    }, 0);
    
    const sumXY = series.reduce((sum, point, i) => {
      const value = this.extractNumericValue(point);
      return sum + (i * (value || 0));
    }, 0);
    
    const sumXX = series.reduce((sum, _, i) => sum + (i * i), 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope / (sumY / n); // Normalizar pelo valor médio
  }

  /**
   * Extrair valor numérico
   */
  extractNumericValue(point) {
    if (typeof point.value === 'number') return point.value;
    if (point.cpu?.percent) return point.cpu.percent;
    if (point.memory?.system?.percent) return point.memory.system.percent;
    if (point.responseTime) return point.responseTime;
    return 0;
  }

  /**
   * Analisar padrões
   */
  async analyzePatterns() {
    // Detectar picos de uso
    await this.detectSpikes();
    
    // Detectar padrões cíclicos
    await this.detectCyclicalPatterns();
    
    // Detectar anomalias
    await this.detectAnomalies();
  }

  /**
   * Detectar picos
   */
  async detectSpikes() {
    const metrics = ['system'];
    const period = 60 * 60 * 1000; // 1 hora

    for (const metric of metrics) {
      const series = this.metricsCollector.getTimeSeries(metric, Date.now() - period);
      const stats = this.metricsCollector.getStatistics(metric, period);

      if (stats.count > 10) {
        const threshold = stats.avg + (2 * (stats.p95 - stats.avg)); // 2 desvios padrão

        const spikes = series.filter(point => {
          const value = this.extractNumericValue(point);
          return value > threshold;
        });

        if (spikes.length > 0) {
          this.patterns.set(`spikes_${metric}`, {
            type: 'spikes',
            metric,
            count: spikes.length,
            threshold,
            avgValue: stats.avg,
            maxSpike: Math.max(...spikes.map(s => this.extractNumericValue(s))),
            timestamp: Date.now()
          });
        }
      }
    }
  }

  /**
   * Detectar padrões cíclicos
   */
  async detectCyclicalPatterns() {
    // Implementação básica - pode ser expandida com FFT
    const period = 24 * 60 * 60 * 1000; // 24 horas
    const series = this.metricsCollector.getTimeSeries('system', Date.now() - period);

    if (series.length > 100) {
      // Dividir em períodos de 1 hora e calcular médias
      const hourlyAverages = [];
      const hoursInDay = 24;
      const pointsPerHour = Math.floor(series.length / hoursInDay);

      for (let i = 0; i < hoursInDay; i++) {
        const start = i * pointsPerHour;
        const end = Math.min(start + pointsPerHour, series.length);
        const hourData = series.slice(start, end);
        
        if (hourData.length > 0) {
          const avg = hourData.reduce((sum, point) => {
            return sum + this.extractNumericValue(point);
          }, 0) / hourData.length;
          
          hourlyAverages.push(avg);
        }
      }

      // Detectar padrão (muito simplificado)
      const maxHour = hourlyAverages.indexOf(Math.max(...hourlyAverages));
      const minHour = hourlyAverages.indexOf(Math.min(...hourlyAverages));

      this.patterns.set('daily_cycle', {
        type: 'cyclical',
        pattern: 'daily',
        peakHour: maxHour,
        lowHour: minHour,
        variance: this.calculateVariance(hourlyAverages),
        timestamp: Date.now()
      });
    }
  }

  /**
   * Calcular variância
   */
  calculateVariance(values) {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDifferences = values.map(val => Math.pow(val - mean, 2));
    return squaredDifferences.reduce((sum, diff) => sum + diff, 0) / values.length;
  }

  /**
   * Detectar anomalias
   */
  async detectAnomalies() {
    const period = 60 * 60 * 1000; // 1 hora
    const recentSeries = this.metricsCollector.getTimeSeries('system', Date.now() - period);
    const historicalSeries = this.metricsCollector.getTimeSeries('system', Date.now() - (7 * 24 * 60 * 60 * 1000), Date.now() - period);

    if (recentSeries.length > 10 && historicalSeries.length > 100) {
      const recentAvg = this.calculateAverage(recentSeries);
      const historicalAvg = this.calculateAverage(historicalSeries);
      const historicalStdDev = this.calculateStandardDeviation(historicalSeries);

      const deviation = Math.abs(recentAvg - historicalAvg) / historicalStdDev;

      if (deviation > 2) { // Anomalia significativa
        this.patterns.set('anomaly_current', {
          type: 'anomaly',
          metric: 'system',
          deviation,
          recentAvg,
          historicalAvg,
          severity: deviation > 3 ? 'high' : 'medium',
          timestamp: Date.now()
        });
      }
    }
  }

  /**
   * Calcular média
   */
  calculateAverage(series) {
    const values = series.map(point => this.extractNumericValue(point));
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Calcular desvio padrão
   */
  calculateStandardDeviation(series) {
    const values = series.map(point => this.extractNumericValue(point));
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDifferences = values.map(val => Math.pow(val - mean, 2));
    const variance = squaredDifferences.reduce((sum, diff) => sum + diff, 0) / values.length;
    return Math.sqrt(variance);
  }

  /**
   * Analisar correlações
   */
  async analyzeCorrelations() {
    // Correlação entre CPU e tempo de resposta
    const cpuSeries = this.metricsCollector.getTimeSeries('system', Date.now() - (60 * 60 * 1000));
    const responseSeries = this.metricsCollector.getTimeSeries('app_flow_processing', Date.now() - (60 * 60 * 1000));

    if (cpuSeries.length > 10 && responseSeries.length > 10) {
      const correlation = this.calculateCorrelation(
        cpuSeries.map(p => p.cpu?.percent || 0),
        responseSeries.map(p => p.responseTime || 0)
      );

      if (Math.abs(correlation) > 0.7) {
        this.patterns.set('correlation_cpu_response', {
          type: 'correlation',
          metrics: ['cpu', 'responseTime'],
          correlation,
          strength: Math.abs(correlation) > 0.9 ? 'strong' : 'moderate',
          timestamp: Date.now()
        });
      }
    }
  }

  /**
   * Calcular correlação
   */
  calculateCorrelation(x, y) {
    const n = Math.min(x.length, y.length);
    if (n < 2) return 0;

    const xTrimmed = x.slice(0, n);
    const yTrimmed = y.slice(0, n);

    const sumX = xTrimmed.reduce((sum, val) => sum + val, 0);
    const sumY = yTrimmed.reduce((sum, val) => sum + val, 0);
    const sumXY = xTrimmed.reduce((sum, val, i) => sum + (val * yTrimmed[i]), 0);
    const sumXX = xTrimmed.reduce((sum, val) => sum + (val * val), 0);
    const sumYY = yTrimmed.reduce((sum, val) => sum + (val * val), 0);

    const numerator = (n * sumXY) - (sumX * sumY);
    const denominator = Math.sqrt(((n * sumXX) - (sumX * sumX)) * ((n * sumYY) - (sumY * sumY)));

    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Gerar recomendações
   */
  async generateRecommendations() {
    this.recommendations = [];

    // Analisar padrões e gerar recomendações
    for (const [key, pattern] of this.patterns.entries()) {
      const recommendations = this.generateRecommendationsForPattern(pattern);
      this.recommendations.push(...recommendations);
    }

    // Analisar alertas ativos
    const activeAlerts = this.metricsCollector.getActiveAlerts();
    for (const alert of activeAlerts) {
      const recommendations = this.generateRecommendationsForAlert(alert);
      this.recommendations.push(...recommendations);
    }

    // Limitar número de recomendações
    this.recommendations = this.recommendations
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 20);

    if (this.recommendations.length > 0) {
      logger.info(`[PERFORMANCE] ${this.recommendations.length} recomendações geradas`);
    }
  }

  /**
   * Gerar recomendações para padrão
   */
  generateRecommendationsForPattern(pattern) {
    const recommendations = [];

    switch (pattern.type) {
      case 'trend':
        if (pattern.direction === 'increasing' && pattern.magnitude > 0.2) {
          recommendations.push({
            id: crypto.randomUUID(),
            type: 'optimization',
            priority: 8,
            title: `Tendência crescente detectada em ${pattern.metric}`,
            description: `O ${pattern.metric} está aumentando consistentemente. Considere otimizações.`,
            actions: [
              'Revisar uso de recursos',
              'Implementar cache adicional',
              'Otimizar queries/operações'
            ],
            timestamp: Date.now()
          });
        }
        break;

      case 'spikes':
        if (pattern.count > 5) {
          recommendations.push({
            id: crypto.randomUUID(),
            type: 'stability',
            priority: 7,
            title: `Picos frequentes detectados em ${pattern.metric}`,
            description: `${pattern.count} picos detectados. Sistema pode estar instável.`,
            actions: [
              'Implementar rate limiting',
              'Configurar auto-scaling',
              'Investigar causa dos picos'
            ],
            timestamp: Date.now()
          });
        }
        break;

      case 'anomaly':
        recommendations.push({
          id: crypto.randomUUID(),
          type: 'investigation',
          priority: pattern.severity === 'high' ? 9 : 6,
          title: `Anomalia detectada em ${pattern.metric}`,
          description: `Comportamento anômalo com desvio de ${pattern.deviation.toFixed(2)} sigma.`,
          actions: [
            'Investigar mudanças recentes',
            'Verificar logs de erro',
            'Monitorar comportamento'
            ],
          timestamp: Date.now()
        });
        break;

      case 'correlation':
        if (pattern.strength === 'strong') {
          recommendations.push({
            id: crypto.randomUUID(),
            type: 'insight',
            priority: 5,
            title: `Correlação forte entre ${pattern.metrics.join(' e ')}`,
            description: `Correlação de ${pattern.correlation.toFixed(2)} detectada.`,
            actions: [
              'Usar para previsão de capacidade',
              'Implementar alertas preditivos',
              'Otimizar componentes relacionados'
            ],
            timestamp: Date.now()
          });
        }
        break;
    }

    return recommendations;
  }

  /**
   * Gerar recomendações para alerta
   */
  generateRecommendationsForAlert(alert) {
    const recommendations = [];

    switch (alert.metric) {
      case 'cpu':
        recommendations.push({
          id: crypto.randomUUID(),
          type: 'resource',
          priority: alert.level === 'critical' ? 10 : 7,
          title: `Alto uso de CPU: ${alert.value.toFixed(1)}%`,
          description: `CPU acima do threshold ${alert.level} (${alert.threshold[alert.level]}%)`,
          actions: [
            'Revisar processos consumindo CPU',
            'Otimizar algoritmos',
            'Considerar scaling horizontal'
          ],
          timestamp: Date.now()
        });
        break;

      case 'memory':
        recommendations.push({
          id: crypto.randomUUID(),
          type: 'resource',
          priority: alert.level === 'critical' ? 10 : 7,
          title: `Alto uso de memória: ${alert.value.toFixed(1)}%`,
          description: `Memória acima do threshold ${alert.level} (${alert.threshold[alert.level]}%)`,
          actions: [
            'Investigar vazamentos de memória',
            'Otimizar cache',
            'Aumentar recursos disponíveis'
          ],
          timestamp: Date.now()
        });
        break;

      case 'responseTime':
        recommendations.push({
          id: crypto.randomUUID(),
          type: 'performance',
          priority: alert.level === 'critical' ? 9 : 6,
          title: `Tempo de resposta alto: ${alert.value}ms`,
          description: `Tempo de resposta acima do threshold ${alert.level} (${alert.threshold[alert.level]}ms)`,
          actions: [
            'Otimizar queries de banco',
            'Implementar cache',
            'Revisar gargalos de rede'
          ],
          timestamp: Date.now()
        });
        break;
    }

    return recommendations;
  }

  /**
   * Obter padrões detectados
   */
  getPatterns() {
    return Array.from(this.patterns.entries()).map(([key, pattern]) => ({
      key,
      ...pattern
    }));
  }

  /**
   * Obter recomendações
   */
  getRecommendations() {
    return [...this.recommendations];
  }
}

/**
 * PERFORMANCE MONITORING SYSTEM - Classe Principal
 */
class PerformanceMonitoringSystem extends EventEmitter {
  constructor() {
    super();
    this.metricsCollector = new MetricsCollector();
    this.performanceAnalyzer = new PerformanceAnalyzer(this.metricsCollector);
    this.reportGenerator = null;
    this.isRunning = false;
  }

  /**
   * Inicializar sistema de monitoramento
   */
  async initialize() {
    if (this.isRunning) {
      logger.warn('[PERF_MONITOR] Sistema já está rodando');
      return;
    }

    logger.info('[PERF_MONITOR] Inicializando sistema de monitoramento de performance...');

    try {
      // Inicializar componentes
      this.metricsCollector.start();
      this.performanceAnalyzer.start();

      // Setup event forwarding
      this.setupEventForwarding();

      this.isRunning = true;
      logger.info('[PERF_MONITOR] Sistema de monitoramento inicializado com sucesso');

      this.emit('initialized');

    } catch (error) {
      logger.error('[PERF_MONITOR] Erro na inicialização:', error);
      throw error;
    }
  }

  /**
   * Setup event forwarding
   */
  setupEventForwarding() {
    this.metricsCollector.on('alert', (alert) => {
      this.emit('alert', alert);
    });

    this.metricsCollector.on('metricsCollected', (metrics) => {
      this.emit('metricsCollected', metrics);
    });
  }

  /**
   * Registrar métrica de aplicação
   */
  recordMetric(category, name, value, metadata = {}) {
    this.metricsCollector.recordApplicationMetric(category, name, value, metadata);
  }

  /**
   * Registrar tempo de operação
   */
  recordOperationTime(operation, startTime, metadata = {}) {
    const duration = Date.now() - startTime;
    this.recordMetric('performance', `${operation}_time`, duration, {
      operation,
      ...metadata
    });
  }

  /**
   * Registrar contador
   */
  recordCounter(name, increment = 1, metadata = {}) {
    const current = this.metricsCollector.getCurrentMetrics()[`app_counter_${name}`];
    const newValue = (current?.value || 0) + increment;
    this.recordMetric('counter', name, newValue, metadata);
  }

  /**
   * Registrar gauge
   */
  recordGauge(name, value, metadata = {}) {
    this.recordMetric('gauge', name, value, metadata);
  }

  /**
   * Obter métricas atuais
   */
  getCurrentMetrics() {
    return this.metricsCollector.getCurrentMetrics();
  }

  /**
   * Obter estatísticas
   */
  getStatistics(metric, period) {
    return this.metricsCollector.getStatistics(metric, period);
  }

  /**
   * Obter alertas ativos
   */
  getActiveAlerts() {
    return this.metricsCollector.getActiveAlerts();
  }

  /**
   * Obter padrões detectados
   */
  getDetectedPatterns() {
    return this.performanceAnalyzer.getPatterns();
  }

  /**
   * Obter recomendações
   */
  getRecommendations() {
    return this.performanceAnalyzer.getRecommendations();
  }

  /**
   * Definir threshold personalizado
   */
  setThreshold(metric, warning, critical) {
    this.metricsCollector.setThreshold(metric, warning, critical);
  }

  /**
   * Gerar relatório
   */
  async generateReport(period = 24 * 60 * 60 * 1000) {
    const report = {
      timestamp: Date.now(),
      period,
      summary: {
        systemHealth: 'healthy', // Será calculado
        totalAlerts: this.metricsCollector.alerts.length,
        activeAlerts: this.getActiveAlerts().length,
        patterns: this.getDetectedPatterns().length,
        recommendations: this.getRecommendations().length
      },
      metrics: {},
      alerts: this.getActiveAlerts(),
      patterns: this.getDetectedPatterns(),
      recommendations: this.getRecommendations()
    };

    // Calcular estatísticas para métricas principais
    const mainMetrics = ['system', 'app_flow_processing', 'app_cache_performance'];
    for (const metric of mainMetrics) {
      report.metrics[metric] = this.getStatistics(metric, period);
    }

    // Determinar saúde geral do sistema
    const criticalAlerts = this.getActiveAlerts().filter(a => a.level === 'critical');
    const highSeverityPatterns = this.getDetectedPatterns().filter(p => p.severity === 'high');
    
    if (criticalAlerts.length > 0 || highSeverityPatterns.length > 0) {
      report.summary.systemHealth = 'critical';
    } else if (this.getActiveAlerts().length > 0) {
      report.summary.systemHealth = 'warning';
    }

    return report;
  }

  /**
   * Salvar relatório
   */
  async saveReport(report, filename = null) {
    try {
      const reportsDir = path.join(process.cwd(), 'reports', 'performance');
      await fs.mkdir(reportsDir, { recursive: true });

      const reportFilename = filename || `performance-report-${Date.now()}.json`;
      const filepath = path.join(reportsDir, reportFilename);

      await fs.writeFile(filepath, JSON.stringify(report, null, 2));
      
      logger.info(`[PERF_MONITOR] Relatório salvo: ${reportFilename}`);
      return filepath;

    } catch (error) {
      logger.error('[PERF_MONITOR] Erro ao salvar relatório:', error);
      throw error;
    }
  }

  /**
   * Parar sistema de monitoramento
   */
  async shutdown() {
    if (!this.isRunning) {
      return;
    }

    logger.info('[PERF_MONITOR] Parando sistema de monitoramento...');

    try {
      // Gerar relatório final
      const finalReport = await this.generateReport();
      await this.saveReport(finalReport, `final-report-${Date.now()}.json`);

      // Parar componentes
      this.performanceAnalyzer.stop();
      this.metricsCollector.stop();

      this.isRunning = false;
      this.removeAllListeners();

      logger.info('[PERF_MONITOR] Sistema de monitoramento parado');

    } catch (error) {
      logger.error('[PERF_MONITOR] Erro ao parar sistema:', error);
    }
  }
}

// Singleton instance
const performanceMonitoringSystem = new PerformanceMonitoringSystem();

module.exports = performanceMonitoringSystem;