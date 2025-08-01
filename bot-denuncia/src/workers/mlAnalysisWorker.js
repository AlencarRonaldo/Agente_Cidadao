/**
 * ML ANALYSIS WORKER - Worker de Análise de Machine Learning
 * 
 * Worker dedicado para análise preditiva e detecção de anomalias:
 * - Detecção de anomalias usando algoritmos estatísticos
 * - Análise de tendências com regressão linear
 * - Detecção de padrões sazonais
 * - Análise de correlação entre métricas
 * - Predições baseadas em modelos de séries temporais
 * 
 * @author ML Analysis Worker
 * @priority HIGH - Predictive Analytics Engine
 */

const { parentPort } = require('worker_threads');

/**
 * ML ANALYSIS ENGINE - Motor de Análise de Machine Learning
 */
class MLAnalysisEngine {
  constructor() {
    this.models = new Map();
    this.analysisHistory = new Map();
    
    // Configurações dos algoritmos
    this.config = {
      anomalyDetection: {
        defaultThreshold: 2.0,
        minDataPoints: 10,
        windowSize: 50,
        sensitivity: 'medium' // low, medium, high
      },
      trendAnalysis: {
        minDataPoints: 5,
        confidenceThreshold: 0.5,
        predictionHorizon: 5
      },
      seasonalDetection: {
        minCycles: 2,
        defaultPeriod: 24,
        strengthThreshold: 0.3
      },
      correlationAnalysis: {
        minDataPoints: 10,
        significanceLevel: 0.05
      }
    };
  }

  /**
   * ANOMALY DETECTION - Detecção de Anomalias
   */
  
  /**
   * Detectar anomalias usando Z-Score e MAD (Median Absolute Deviation)
   */
  detectAnomalies(data, options = {}) {
    const threshold = options.threshold || this.config.anomalyDetection.defaultThreshold;
    const method = options.method || 'zscore'; // zscore, mad, iqr
    
    if (data.length < this.config.anomalyDetection.minDataPoints) {
      return { 
        anomalies: [], 
        baseline: null, 
        method: 'insufficient_data',
        message: `Need at least ${this.config.anomalyDetection.minDataPoints} data points`
      };
    }

    switch (method) {
      case 'zscore':
        return this.detectAnomaliesZScore(data, threshold);
      case 'mad':
        return this.detectAnomaliesMAD(data, threshold);
      case 'iqr':
        return this.detectAnomaliesIQR(data, threshold);
      case 'hybrid':
        return this.detectAnomaliesHybrid(data, threshold);
      default:
        return this.detectAnomaliesZScore(data, threshold);
    }
  }

  /**
   * Detecção de anomalias usando Z-Score
   */
  detectAnomaliesZScore(data, threshold) {
    const mean = this.calculateMean(data);
    const stdDev = this.calculateStandardDeviation(data, mean);
    
    if (stdDev === 0) {
      return { 
        anomalies: [], 
        baseline: { mean, stdDev, variance: 0 },
        method: 'zscore',
        message: 'No variation in data'
      };
    }

    const anomalies = [];
    data.forEach((value, index) => {
      const zScore = Math.abs((value - mean) / stdDev);
      if (zScore > threshold) {
        anomalies.push({
          index,
          value,
          zScore,
          severity: this.categorizeSeverity(zScore, threshold),
          deviation: value - mean,
          timestamp: index // Seria substituído por timestamp real
        });
      }
    });

    return {
      anomalies,
      baseline: { 
        mean, 
        stdDev, 
        variance: stdDev * stdDev 
      },
      method: 'zscore',
      threshold,
      anomalyRate: (anomalies.length / data.length) * 100
    };
  }

  /**
   * Detecção de anomalias usando MAD (Median Absolute Deviation)
   */
  detectAnomaliesMAD(data, threshold) {
    const median = this.calculateMedian(data);
    const deviations = data.map(value => Math.abs(value - median));
    const mad = this.calculateMedian(deviations);
    
    if (mad === 0) {
      return { 
        anomalies: [], 
        baseline: { median, mad },
        method: 'mad',
        message: 'No variation in data'
      };
    }

    const anomalies = [];
    data.forEach((value, index) => {
      const modifiedZScore = 0.6745 * (value - median) / mad;
      if (Math.abs(modifiedZScore) > threshold) {
        anomalies.push({
          index,
          value,
          modifiedZScore,
          severity: this.categorizeSeverity(Math.abs(modifiedZScore), threshold),
          deviation: value - median,
          timestamp: index
        });
      }
    });

    return {
      anomalies,
      baseline: { median, mad },
      method: 'mad',
      threshold,
      anomalyRate: (anomalies.length / data.length) * 100
    };
  }

  /**
   * Detecção de anomalias usando IQR (Interquartile Range)
   */
  detectAnomaliesIQR(data, multiplier = 1.5) {
    const sortedData = data.slice().sort((a, b) => a - b);
    const q1Index = Math.floor(sortedData.length * 0.25);
    const q3Index = Math.floor(sortedData.length * 0.75);
    
    const q1 = sortedData[q1Index];
    const q3 = sortedData[q3Index];
    const iqr = q3 - q1;
    
    const lowerBound = q1 - multiplier * iqr;
    const upperBound = q3 + multiplier * iqr;
    
    const anomalies = [];
    data.forEach((value, index) => {
      if (value < lowerBound || value > upperBound) {
        const severity = value < lowerBound ? 'low_outlier' : 'high_outlier';
        anomalies.push({
          index,
          value,
          severity,
          lowerBound,
          upperBound,
          deviation: value < lowerBound ? lowerBound - value : value - upperBound,
          timestamp: index
        });
      }
    });

    return {
      anomalies,
      baseline: { q1, q3, iqr, lowerBound, upperBound },
      method: 'iqr',
      multiplier,
      anomalyRate: (anomalies.length / data.length) * 100
    };
  }

  /**
   * Detecção híbrida combinando múltodos métodos
   */
  detectAnomaliesHybrid(data, threshold) {
    const zscoreResult = this.detectAnomaliesZScore(data, threshold);
    const madResult = this.detectAnomaliesMAD(data, threshold);
    const iqrResult = this.detectAnomaliesIQR(data);

    // Combinar anomalias detectadas por diferentes métodos
    const anomaliesMap = new Map();
    
    // Adicionar anomalias do Z-Score
    zscoreResult.anomalies.forEach(anomaly => {
      anomaliesMap.set(anomaly.index, {
        ...anomaly,
        methods: ['zscore'],
        confidence: this.calculateConfidence(anomaly.zScore, threshold)
      });
    });

    // Adicionar/combinar anomalias do MAD
    madResult.anomalies.forEach(anomaly => {
      if (anomaliesMap.has(anomaly.index)) {
        const existing = anomaliesMap.get(anomaly.index);
        existing.methods.push('mad');
        existing.confidence = Math.max(existing.confidence, this.calculateConfidence(Math.abs(anomaly.modifiedZScore), threshold));
      } else {
        anomaliesMap.set(anomaly.index, {
          ...anomaly,
          methods: ['mad'],
          confidence: this.calculateConfidence(Math.abs(anomaly.modifiedZScore), threshold)
        });
      }
    });

    // Adicionar/combinar anomalias do IQR
    iqrResult.anomalies.forEach(anomaly => {
      if (anomaliesMap.has(anomaly.index)) {
        const existing = anomaliesMap.get(anomaly.index);
        existing.methods.push('iqr');
        existing.confidence = Math.max(existing.confidence, 0.7); // IQR tem confiança fixa
      }
    });

    const hybridAnomalies = Array.from(anomaliesMap.values())
      .sort((a, b) => b.confidence - a.confidence);

    return {
      anomalies: hybridAnomalies,
      baseline: {
        zscore: zscoreResult.baseline,
        mad: madResult.baseline,
        iqr: iqrResult.baseline
      },
      method: 'hybrid',
      methodsUsed: ['zscore', 'mad', 'iqr'],
      anomalyRate: (hybridAnomalies.length / data.length) * 100
    };
  }

  /**
   * TREND ANALYSIS - Análise de Tendências
   */
  
  /**
   * Analisar tendência usando regressão linear
   */
  analyzeTrend(data, options = {}) {
    if (data.length < this.config.trendAnalysis.minDataPoints) {
      return { 
        slope: 0, 
        r2: 0, 
        predictions: [],
        message: `Need at least ${this.config.trendAnalysis.minDataPoints} data points`
      };
    }

    const n = data.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = data;

    // Calcular coeficientes da regressão linear
    const regression = this.calculateLinearRegression(x, y);
    
    // Gerar previsões
    const predictions = this.generatePredictions(regression, n, options.horizon || this.config.trendAnalysis.predictionHorizon);
    
    // Calcular intervalos de confiança
    const confidenceIntervals = this.calculateConfidenceIntervals(x, y, regression, predictions);
    
    // Analisar padrões de tendência
    const trendPattern = this.analyzeTrendPattern(data, regression);
    
    return {
      ...regression,
      predictions: predictions.map((pred, i) => ({
        ...pred,
        confidenceInterval: confidenceIntervals[i]
      })),
      trendPattern,
      dataQuality: this.assessDataQuality(data),
      recommendation: this.generateTrendRecommendation(regression, trendPattern)
    };
  }

  /**
   * Calcular regressão linear
   */
  calculateLinearRegression(x, y) {
    const n = x.length;
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumX2 = x.reduce((sum, val) => sum + val * val, 0);
    const sumY2 = y.reduce((sum, val) => sum + val * val, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calcular R²
    const yMean = sumY / n;
    const ssRes = y.reduce((sum, val, i) => sum + Math.pow(val - (slope * x[i] + intercept), 2), 0);
    const ssTot = y.reduce((sum, val) => sum + Math.pow(val - yMean, 2), 0);
    const r2 = ssTot !== 0 ? 1 - (ssRes / ssTot) : 0;

    // Calcular erro padrão
    const standardError = Math.sqrt(ssRes / (n - 2));

    return { 
      slope, 
      intercept, 
      r2, 
      standardError,
      n,
      correlation: this.calculateCorrelation(x, y)
    };
  }

  /**
   * Gerar previsões
   */
  generatePredictions(regression, dataLength, horizon) {
    const predictions = [];
    
    for (let i = 1; i <= horizon; i++) {
      const xValue = dataLength + i - 1;
      const predictedValue = regression.slope * xValue + regression.intercept;
      
      predictions.push({
        period: dataLength + i,
        value: predictedValue,
        confidence: Math.max(0, regression.r2),
        xValue,
        trend: regression.slope > 0 ? 'increasing' : regression.slope < 0 ? 'decreasing' : 'stable'
      });
    }

    return predictions;
  }

  /**
   * SEASONAL PATTERN DETECTION - Detecção de Padrões Sazonais
   */
  
  /**
   * Detectar padrões sazonais
   */
  detectSeasonalPatterns(data, options = {}) {
    const period = options.period || this.config.seasonalDetection.defaultPeriod;
    
    if (data.length < period * this.config.seasonalDetection.minCycles) {
      return { 
        patterns: [], 
        strength: 0,
        message: `Need at least ${period * this.config.seasonalDetection.minCycles} data points for period ${period}`
      };
    }

    // Dividir dados em períodos
    const cycles = this.extractCycles(data, period);
    
    if (cycles.length < this.config.seasonalDetection.minCycles) {
      return { patterns: [], strength: 0, message: 'Insufficient complete cycles' };
    }

    // Calcular padrão médio
    const seasonalPattern = this.calculateSeasonalPattern(cycles, period);
    
    // Calcular força do padrão sazonal
    const strength = this.calculateSeasonalStrength(data, seasonalPattern, period);
    
    // Detectar anomalias sazonais
    const seasonalAnomalies = this.detectSeasonalAnomalies(data, seasonalPattern, period);
    
    // Análise de harmônicos
    const harmonics = this.analyzeHarmonics(seasonalPattern);
    
    return {
      patterns: seasonalPattern,
      strength,
      period,
      cycles: cycles.length,
      seasonalAnomalies,
      harmonics,
      forecast: this.generateSeasonalForecast(seasonalPattern, 1), // 1 período à frente
      quality: strength > this.config.seasonalDetection.strengthThreshold ? 'good' : 'poor'
    };
  }

  /**
   * Extrair ciclos dos dados
   */
  extractCycles(data, period) {
    const cycles = [];
    
    for (let i = 0; i < data.length; i += period) {
      const cycle = data.slice(i, i + period);
      if (cycle.length === period) {
        cycles.push(cycle);
      }
    }
    
    return cycles;
  }

  /**
   * Calcular padrão sazonal médio
   */
  calculateSeasonalPattern(cycles, period) {
    const pattern = new Array(period).fill(0);
    
    for (let pos = 0; pos < period; pos++) {
      const values = cycles.map(cycle => cycle[pos]).filter(val => val !== undefined);
      if (values.length > 0) {
        pattern[pos] = values.reduce((sum, val) => sum + val, 0) / values.length;
      }
    }
    
    return pattern;
  }

  /**
   * Calcular força do padrão sazonal
   */
  calculateSeasonalStrength(data, seasonalPattern, period) {
    const overallMean = this.calculateMean(data);
    
    // Variância do padrão sazonal
    const patternVariance = seasonalPattern.reduce((sum, val) => sum + Math.pow(val - overallMean, 2), 0) / seasonalPattern.length;
    
    // Variância total dos dados
    const dataVariance = data.reduce((sum, val) => sum + Math.pow(val - overallMean, 2), 0) / data.length;
    
    return dataVariance > 0 ? patternVariance / dataVariance : 0;
  }

  /**
   * CORRELATION ANALYSIS - Análise de Correlação
   */
  
  /**
   * Calcular correlação entre duas séries
   */
  calculateCorrelation(x, y) {
    if (x.length !== y.length || x.length < this.config.correlationAnalysis.minDataPoints) {
      return { correlation: 0, significance: 'insufficient_data' };
    }

    const n = x.length;
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumX2 = x.reduce((sum, val) => sum + val * val, 0);
    const sumY2 = y.reduce((sum, val) => sum + val * val, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    if (denominator === 0) {
      return { correlation: 0, significance: 'no_variation' };
    }

    const correlation = numerator / denominator;
    
    // Calcular significância (teste t)
    const tStatistic = correlation * Math.sqrt((n - 2) / (1 - correlation * correlation));
    const significance = this.calculateSignificance(tStatistic, n - 2);

    return {
      correlation,
      tStatistic,
      significance,
      strength: this.categorizeCorrelationStrength(Math.abs(correlation)),
      direction: correlation > 0 ? 'positive' : correlation < 0 ? 'negative' : 'none'
    };
  }

  /**
   * UTILITY METHODS - Métodos Utilitários
   */
  
  calculateMean(data) {
    return data.reduce((sum, val) => sum + val, 0) / data.length;
  }

  calculateMedian(data) {
    const sorted = data.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  calculateStandardDeviation(data, mean = null) {
    if (mean === null) mean = this.calculateMean(data);
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
    return Math.sqrt(variance);
  }

  categorizeSeverity(score, threshold) {
    if (score > threshold * 2) return 'critical';
    if (score > threshold * 1.5) return 'high';
    if (score > threshold) return 'medium';
    return 'low';
  }

  calculateConfidence(score, threshold) {
    return Math.min(1, score / threshold);
  }

  categorizeCorrelationStrength(correlation) {
    if (correlation >= 0.8) return 'very_strong';
    if (correlation >= 0.6) return 'strong';
    if (correlation >= 0.4) return 'moderate';
    if (correlation >= 0.2) return 'weak';
    return 'very_weak';
  }

  calculateSignificance(tStatistic, degreesOfFreedom) {
    // Implementação simplificada - em produção usar tabela t completa
    const criticalValue = 1.96; // Para α = 0.05
    return Math.abs(tStatistic) > criticalValue ? 'significant' : 'not_significant';
  }

  assessDataQuality(data) {
    const nullCount = data.filter(val => val === null || val === undefined).length;
    const outlierCount = this.detectAnomaliesZScore(data, 2.0).anomalies.length;
    
    return {
      completeness: ((data.length - nullCount) / data.length) * 100,
      outlierRate: (outlierCount / data.length) * 100,
      variance: this.calculateStandardDeviation(data),
      quality: nullCount === 0 && outlierCount < data.length * 0.05 ? 'good' : 'fair'
    };
  }

  generateTrendRecommendation(regression, trendPattern) {
    if (regression.r2 < 0.3) {
      return { type: 'warning', message: 'Low prediction confidence. Consider more data or different model.' };
    }
    
    if (Math.abs(regression.slope) < 0.01) {
      return { type: 'info', message: 'Stable trend detected. Monitor for changes.' };
    }
    
    if (regression.slope > 0) {
      return { type: 'positive', message: 'Positive trend detected. Growth expected to continue.' };
    } else {
      return { type: 'negative', message: 'Negative trend detected. Intervention may be needed.' };
    }
  }

  calculateConfidenceIntervals(x, y, regression, predictions) {
    // Implementação simplificada de intervalos de confiança
    return predictions.map(pred => ({
      lower: pred.value - 1.96 * regression.standardError,
      upper: pred.value + 1.96 * regression.standardError,
      confidence: 0.95
    }));
  }

  analyzeTrendPattern(data, regression) {
    const residuals = data.map((val, i) => val - (regression.slope * i + regression.intercept));
    const residualTrend = this.analyzeTrend(residuals);
    
    return {
      linearity: regression.r2,
      residualPattern: residualTrend.slope < 0.01 ? 'random' : 'systematic',
      volatility: this.calculateStandardDeviation(residuals),
      stationarity: this.testStationarity(data)
    };
  }

  testStationarity(data) {
    // Teste simples de estacionariedade
    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));
    
    const mean1 = this.calculateMean(firstHalf);
    const mean2 = this.calculateMean(secondHalf);
    const var1 = this.calculateStandardDeviation(firstHalf);
    const var2 = this.calculateStandardDeviation(secondHalf);
    
    const meanDiff = Math.abs(mean1 - mean2) / Math.max(mean1, mean2);
    const varDiff = Math.abs(var1 - var2) / Math.max(var1, var2);
    
    return meanDiff < 0.1 && varDiff < 0.2 ? 'stationary' : 'non_stationary';
  }

  detectSeasonalAnomalies(data, seasonalPattern, period) {
    const anomalies = [];
    
    for (let i = 0; i < data.length; i++) {
      const seasonalIndex = i % period;
      const expectedValue = seasonalPattern[seasonalIndex];
      const actualValue = data[i];
      const deviation = Math.abs(actualValue - expectedValue);
      const relativeDeviation = expectedValue !== 0 ? deviation / expectedValue : 0;
      
      if (relativeDeviation > 0.3) { // 30% deviation threshold
        anomalies.push({
          index: i,
          actualValue,
          expectedValue,
          deviation,
          relativeDeviation,
          seasonalIndex
        });
      }
    }
    
    return anomalies;
  }

  analyzeHarmonics(seasonalPattern) {
    // Análise simplificada de harmônicos (FFT seria ideal)
    const harmonics = [];
    const n = seasonalPattern.length;
    
    for (let k = 1; k <= Math.floor(n / 2); k++) {
      let real = 0, imag = 0;
      
      for (let i = 0; i < n; i++) {
        const angle = (2 * Math.PI * k * i) / n;
        real += seasonalPattern[i] * Math.cos(angle);
        imag += seasonalPattern[i] * Math.sin(angle);
      }
      
      const magnitude = Math.sqrt(real * real + imag * imag);
      const phase = Math.atan2(imag, real);
      
      harmonics.push({
        frequency: k,
        magnitude,
        phase,
        period: n / k
      });
    }
    
    return harmonics.sort((a, b) => b.magnitude - a.magnitude).slice(0, 3); // Top 3
  }

  generateSeasonalForecast(seasonalPattern, periods) {
    const forecast = [];
    
    for (let p = 0; p < periods; p++) {
      const periodForecast = seasonalPattern.map((value, index) => ({
        index: index + p * seasonalPattern.length,
        value,
        confidence: 0.8, // Confiança baseada em padrão sazonal
        type: 'seasonal'
      }));
      
      forecast.push(...periodForecast);
    }
    
    return forecast;
  }

  /**
   * MAIN PROCESSING METHOD - Método Principal de Processamento
   */
  async processAnalysis(task) {
    const { type, data, options = {} } = task;

    try {
      switch (type) {
        case 'anomaly_detection':
          return this.detectAnomalies(data, options);
        
        case 'trend_analysis':
          return this.analyzeTrend(data, options);
        
        case 'seasonal_patterns':
          return this.detectSeasonalPatterns(data, options);
        
        case 'correlation_analysis':
          if (!options.secondSeries) {
            throw new Error('Correlation analysis requires secondSeries in options');
          }
          return this.calculateCorrelation(data, options.secondSeries);
        
        case 'comprehensive_analysis':
          return {
            anomalies: this.detectAnomalies(data, options),
            trend: this.analyzeTrend(data, options),
            seasonal: this.detectSeasonalPatterns(data, options),
            dataQuality: this.assessDataQuality(data),
            summary: this.generateAnalysisSummary(data, options)
          };
        
        default:
          throw new Error(`Unknown analysis type: ${type}`);
      }
    } catch (error) {
      throw new Error(`Analysis failed: ${error.message}`);
    }
  }

  generateAnalysisSummary(data, options) {
    const anomalies = this.detectAnomalies(data, options);
    const trend = this.analyzeTrend(data, options);
    const seasonal = this.detectSeasonalPatterns(data, options);
    
    return {
      dataPoints: data.length,
      anomalyRate: anomalies.anomalyRate || 0,
      trendDirection: trend.slope > 0 ? 'increasing' : trend.slope < 0 ? 'decreasing' : 'stable',
      trendStrength: trend.r2 || 0,
      seasonalStrength: seasonal.strength || 0,
      overallHealth: this.calculateOverallHealth(anomalies, trend, seasonal),
      recommendations: this.generateRecommendations(anomalies, trend, seasonal)
    };
  }

  calculateOverallHealth(anomalies, trend, seasonal) {
    let healthScore = 100;
    
    // Penalizar por anomalias
    if (anomalies.anomalyRate > 10) healthScore -= 30;
    else if (anomalies.anomalyRate > 5) healthScore -= 15;
    
    // Considerar estabilidade da tendência
    if (trend.r2 < 0.3) healthScore -= 10;
    
    // Considerar variabilidade sazonal
    if (seasonal.strength > 0.8) healthScore -= 5; // Muito sazonal pode ser problemático
    
    if (healthScore >= 80) return 'excellent';
    if (healthScore >= 60) return 'good';
    if (healthScore >= 40) return 'fair';
    return 'poor';
  }

  generateRecommendations(anomalies, trend, seasonal) {
    const recommendations = [];
    
    if (anomalies.anomalyRate > 5) {
      recommendations.push({
        type: 'alert',
        message: 'High anomaly rate detected. Investigate potential issues.',
        priority: 'high'
      });
    }
    
    if (trend.r2 > 0.7 && Math.abs(trend.slope) > 0.1) {
      recommendations.push({
        type: 'trend',
        message: `Strong ${trend.slope > 0 ? 'positive' : 'negative'} trend detected. Plan accordingly.`,
        priority: 'medium'
      });
    }
    
    if (seasonal.strength > 0.5) {
      recommendations.push({
        type: 'seasonal',
        message: 'Strong seasonal pattern detected. Use for capacity planning.',
        priority: 'low'
      });
    }
    
    return recommendations;
  }
}

// Inicializar engine
const mlEngine = new MLAnalysisEngine();

// Processar mensagens do thread principal
parentPort.on('message', async (task) => {
  try {
    const result = await mlEngine.processAnalysis(task);
    parentPort.postMessage({
      success: true,
      taskId: task.taskId,
      result
    });
  } catch (error) {
    parentPort.postMessage({
      success: false,
      taskId: task.taskId,
      error: error.message,
      stack: error.stack
    });
  }
});

// Sinalizar que o worker está pronto
parentPort.postMessage({
  type: 'worker_ready',
  timestamp: Date.now()
});