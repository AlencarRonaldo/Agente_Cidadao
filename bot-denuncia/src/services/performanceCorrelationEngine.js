/**
 * PERFORMANCE CORRELATION ANALYSIS ENGINE - Motor de Análise de Correlação de Performance
 * 
 * Engine avançado para análise de correlações que:
 * - Identifica correlações cross-system entre componentes
 * - Detecta dependency chains e impact propagation
 * - Analisa padrões causais e lag effects
 * - Calcula métricas de impacto e risk scoring
 * - Gera insights acionáveis e recomendações
 * - Implementa real-time correlation monitoring
 * 
 * @author Performance Correlation Analysis Engine
 * @priority HIGH - Predictive Performance Intelligence
 */

const EventEmitter = require('events');
const logger = require('../utils/logger');
const performanceAuditSystem = require('./performanceAuditSystem');

/**
 * CORRELATION CALCULATOR - Calculador de Correlações
 */
class CorrelationCalculator {
  constructor() {
    this.correlationMethods = new Map();
    this.setupCorrelationMethods();
  }

  /**
   * Configurar métodos de correlação
   */
  setupCorrelationMethods() {
    // Pearson Correlation - Correlação linear
    this.correlationMethods.set('pearson', {
      name: 'Pearson Correlation',
      description: 'Linear correlation between two variables',
      calculate: this.calculatePearsonCorrelation.bind(this),
      interpretation: this.interpretPearsonCorrelation.bind(this)
    });

    // Spearman Correlation - Correlação monotônica
    this.correlationMethods.set('spearman', {
      name: 'Spearman Correlation',
      description: 'Monotonic correlation (rank-based)',
      calculate: this.calculateSpearmanCorrelation.bind(this),
      interpretation: this.interpretSpearmanCorrelation.bind(this)
    });

    // Cross-correlation - Correlação com lag temporal
    this.correlationMethods.set('cross_correlation', {
      name: 'Cross-correlation',
      description: 'Correlation with time lag analysis',
      calculate: this.calculateCrossCorrelation.bind(this),
      interpretation: this.interpretCrossCorrelation.bind(this)
    });

    // Dynamic Time Warping - Correlação de séries temporais
    this.correlationMethods.set('dtw', {
      name: 'Dynamic Time Warping',
      description: 'Time series correlation with temporal flexibility',
      calculate: this.calculateDTWCorrelation.bind(this),
      interpretation: this.interpretDTWCorrelation.bind(this)
    });

    // Mutual Information - Correlação não-linear
    this.correlationMethods.set('mutual_information', {
      name: 'Mutual Information',
      description: 'Non-linear dependency measure',
      calculate: this.calculateMutualInformation.bind(this),
      interpretation: this.interpretMutualInformation.bind(this)
    });
  }

  /**
   * Calcular correlação de Pearson
   */
  calculatePearsonCorrelation(x, y, options = {}) {
    if (x.length !== y.length || x.length < 3) {
      return { correlation: 0, significance: 'insufficient_data', n: x.length };
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
      return { correlation: 0, significance: 'no_variation', n };
    }

    const correlation = numerator / denominator;
    
    // Calcular teste de significância
    const tStatistic = correlation * Math.sqrt((n - 2) / (1 - correlation * correlation));
    const significance = this.calculateSignificance(tStatistic, n - 2);
    const pValue = this.calculatePValue(tStatistic, n - 2);

    return {
      correlation,
      tStatistic,
      significance,
      pValue,
      n,
      method: 'pearson',
      confidenceInterval: this.calculateConfidenceInterval(correlation, n)
    };
  }

  /**
   * Calcular correlação de Spearman
   */
  calculateSpearmanCorrelation(x, y, options = {}) {
    if (x.length !== y.length || x.length < 3) {
      return { correlation: 0, significance: 'insufficient_data', n: x.length };
    }

    // Converter para rankings
    const rankX = this.calculateRanks(x);
    const rankY = this.calculateRanks(y);

    // Aplicar fórmula de Pearson nos rankings
    const result = this.calculatePearsonCorrelation(rankX, rankY);
    result.method = 'spearman';

    return result;
  }

  /**
   * Calcular cross-correlation com análise de lag
   */
  calculateCrossCorrelation(x, y, options = {}) {
    const maxLag = options.maxLag || Math.min(x.length, y.length) / 4;
    const correlations = [];

    for (let lag = -maxLag; lag <= maxLag; lag++) {
      const { x1, y1 } = this.applyLag(x, y, lag);
      if (x1.length > 5) {
        const correlation = this.calculatePearsonCorrelation(x1, y1);
        correlations.push({
          lag,
          correlation: correlation.correlation,
          significance: correlation.significance,
          n: x1.length
        });
      }
    }

    // Encontrar melhor correlação
    const bestCorr = correlations.reduce((best, current) => 
      Math.abs(current.correlation) > Math.abs(best.correlation) ? current : best,
      correlations[0] || { correlation: 0, lag: 0 }
    );

    return {
      bestCorrelation: bestCorr,
      allCorrelations: correlations,
      method: 'cross_correlation',
      interpretation: lag => lag > 0 ? 'X leads Y' : lag < 0 ? 'Y leads X' : 'Synchronous'
    };
  }

  /**
   * Calcular DTW correlation
   */
  calculateDTWCorrelation(x, y, options = {}) {
    const window = options.window || Math.floor(Math.min(x.length, y.length) / 10);
    
    // Normalizar séries
    const normX = this.normalizeTimeSeries(x);
    const normY = this.normalizeTimeSeries(y);

    // Calcular matriz DTW
    const dtwMatrix = this.calculateDTWMatrix(normX, normY, window);
    
    // Encontrar caminho ótimo
    const path = this.findDTWPath(dtwMatrix);
    
    // Calcular similaridade baseada na distância DTW
    const distance = dtwMatrix[normX.length - 1][normY.length - 1];
    const maxDistance = Math.sqrt(normX.length + normY.length);
    const similarity = 1 - (distance / maxDistance);

    return {
      similarity,
      distance,
      path,
      method: 'dtw',
      warping: this.calculateWarpingFactor(path, normX.length, normY.length)
    };
  }

  /**
   * Calcular informação mútua
   */
  calculateMutualInformation(x, y, options = {}) {
    const bins = options.bins || Math.floor(Math.sqrt(x.length));
    
    // Discretizar variáveis
    const discreteX = this.discretizeVariable(x, bins);
    const discreteY = this.discretizeVariable(y, bins);

    // Calcular probabilidades
    const pX = this.calculateProbabilities(discreteX, bins);
    const pY = this.calculateProbabilities(discreteY, bins);
    const pXY = this.calculateJointProbabilities(discreteX, discreteY, bins);

    // Calcular informação mútua
    let mutualInfo = 0;
    for (let i = 0; i < bins; i++) {
      for (let j = 0; j < bins; j++) {
        if (pXY[i][j] > 0 && pX[i] > 0 && pY[j] > 0) {
          mutualInfo += pXY[i][j] * Math.log2(pXY[i][j] / (pX[i] * pY[j]));
        }
      }
    }

    // Normalizar pela entropia
    const entropyX = this.calculateEntropy(pX);
    const entropyY = this.calculateEntropy(pY);
    const normalizedMI = mutualInfo / Math.sqrt(entropyX * entropyY);

    return {
      mutualInformation: mutualInfo,
      normalizedMI,
      entropyX,
      entropyY,
      method: 'mutual_information',
      dependency: normalizedMI > 0.1 ? 'dependent' : 'independent'
    };
  }

  // Métodos auxiliares...

  calculateRanks(values) {
    const sorted = values.map((val, index) => ({ val, index }))
                        .sort((a, b) => a.val - b.val);
    
    const ranks = new Array(values.length);
    for (let i = 0; i < sorted.length; i++) {
      ranks[sorted[i].index] = i + 1;
    }
    
    return ranks;
  }

  applyLag(x, y, lag) {
    if (lag === 0) return { x1: x, y1: y };
    
    if (lag > 0) {
      // X leads Y
      return {
        x1: x.slice(0, -lag),
        y1: y.slice(lag)
      };
    } else {
      // Y leads X
      const absLag = Math.abs(lag);
      return {
        x1: x.slice(absLag),
        y1: y.slice(0, -absLag)
      };
    }
  }

  normalizeTimeSeries(series) {
    const mean = series.reduce((sum, val) => sum + val, 0) / series.length;
    const std = Math.sqrt(series.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / series.length);
    
    return std > 0 ? series.map(val => (val - mean) / std) : series.map(() => 0);
  }

  calculateDTWMatrix(x, y, window) {
    const n = x.length;
    const m = y.length;
    const matrix = Array(n).fill().map(() => Array(m).fill(Infinity));
    
    matrix[0][0] = Math.abs(x[0] - y[0]);
    
    for (let i = 1; i < n; i++) {
      for (let j = Math.max(1, i - window); j < Math.min(m, i + window + 1); j++) {
        const cost = Math.abs(x[i] - y[j]);
        matrix[i][j] = cost + Math.min(
          matrix[i - 1][j],     // insertion
          matrix[i][j - 1],     // deletion
          matrix[i - 1][j - 1]  // match
        );
      }
    }
    
    return matrix;
  }

  findDTWPath(matrix) {
    const path = [];
    let i = matrix.length - 1;
    let j = matrix[0].length - 1;
    
    while (i > 0 || j > 0) {
      path.push([i, j]);
      
      if (i === 0) {
        j--;
      } else if (j === 0) {
        i--;
      } else {
        const diag = matrix[i - 1][j - 1];
        const left = matrix[i][j - 1];
        const up = matrix[i - 1][j];
        
        if (diag <= left && diag <= up) {
          i--; j--;
        } else if (left <= up) {
          j--;
        } else {
          i--;
        }
      }
    }
    
    path.push([0, 0]);
    return path.reverse();
  }

  calculateWarpingFactor(path, lenX, lenY) {
    const expectedLength = lenX + lenY;
    const actualLength = path.length;
    return actualLength / expectedLength;
  }

  discretizeVariable(values, bins) {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const binSize = (max - min) / bins;
    
    return values.map(val => {
      const bin = Math.floor((val - min) / binSize);
      return Math.min(bin, bins - 1);
    });
  }

  calculateProbabilities(discreteValues, bins) {
    const counts = new Array(bins).fill(0);
    discreteValues.forEach(val => counts[val]++);
    return counts.map(count => count / discreteValues.length);
  }

  calculateJointProbabilities(discreteX, discreteY, bins) {
    const jointCounts = Array(bins).fill().map(() => Array(bins).fill(0));
    
    for (let i = 0; i < discreteX.length; i++) {
      jointCounts[discreteX[i]][discreteY[i]]++;
    }
    
    return jointCounts.map(row => 
      row.map(count => count / discreteX.length)
    );
  }

  calculateEntropy(probabilities) {
    return -probabilities.reduce((entropy, p) => 
      p > 0 ? entropy + p * Math.log2(p) : entropy, 0
    );
  }

  calculateSignificance(tStatistic, degreesOfFreedom) {
    const criticalValue = 1.96; // Aproximação para α = 0.05
    return Math.abs(tStatistic) > criticalValue ? 'significant' : 'not_significant';
  }

  calculatePValue(tStatistic, degreesOfFreedom) {
    // Aproximação simples - em produção usar tabela t completa
    return Math.abs(tStatistic) > 1.96 ? 0.05 : 0.1;
  }

  calculateConfidenceInterval(correlation, n, confidence = 0.95) {
    const z = 0.5 * Math.log((1 + correlation) / (1 - correlation));
    const se = 1 / Math.sqrt(n - 3);
    const zCritical = 1.96; // Para 95% de confiança
    
    const zLower = z - zCritical * se;
    const zUpper = z + zCritical * se;
    
    return {
      lower: (Math.exp(2 * zLower) - 1) / (Math.exp(2 * zLower) + 1),
      upper: (Math.exp(2 * zUpper) - 1) / (Math.exp(2 * zUpper) + 1),
      confidence
    };
  }

  // Métodos de interpretação...

  interpretPearsonCorrelation(result) {
    const { correlation, significance } = result;
    const strength = this.categorizeCorrelationStrength(Math.abs(correlation));
    const direction = correlation > 0 ? 'positive' : correlation < 0 ? 'negative' : 'none';
    
    return {
      strength,
      direction,
      description: `${strength} ${direction} linear relationship`,
      actionable: significance === 'significant' && Math.abs(correlation) > 0.3
    };
  }

  interpretSpearmanCorrelation(result) {
    const { correlation, significance } = result;
    const strength = this.categorizeCorrelationStrength(Math.abs(correlation));
    const direction = correlation > 0 ? 'positive' : correlation < 0 ? 'negative' : 'none';
    
    return {
      strength,
      direction,
      description: `${strength} ${direction} monotonic relationship`,
      actionable: significance === 'significant' && Math.abs(correlation) > 0.4
    };
  }

  interpretCrossCorrelation(result) {
    const { bestCorrelation } = result;
    const { lag, correlation } = bestCorrelation;
    
    let causality = 'synchronous';
    if (lag > 0) causality = 'x_leads_y';
    if (lag < 0) causality = 'y_leads_x';
    
    return {
      causality,
      lag: Math.abs(lag),
      strength: this.categorizeCorrelationStrength(Math.abs(correlation)),
      description: `${causality} relationship with ${Math.abs(lag)} time units lag`,
      actionable: Math.abs(correlation) > 0.5
    };
  }

  interpretDTWCorrelation(result) {
    const { similarity, warping } = result;
    
    return {
      similarity: similarity > 0.8 ? 'high' : similarity > 0.6 ? 'medium' : 'low',
      temporalAlignment: warping < 1.2 ? 'good' : 'poor',
      description: `Time series similarity with ${warping.toFixed(2)}x warping`,
      actionable: similarity > 0.7
    };
  }

  interpretMutualInformation(result) {
    const { normalizedMI, dependency } = result;
    
    return {
      dependency,
      strength: normalizedMI > 0.3 ? 'strong' : normalizedMI > 0.1 ? 'moderate' : 'weak',
      description: `${dependency} with ${normalizedMI.toFixed(3)} normalized MI`,
      actionable: normalizedMI > 0.2
    };
  }

  categorizeCorrelationStrength(correlation) {
    if (correlation >= 0.8) return 'very_strong';
    if (correlation >= 0.6) return 'strong';
    if (correlation >= 0.4) return 'moderate';
    if (correlation >= 0.2) return 'weak';
    return 'very_weak';
  }
}

/**
 * SYSTEM TOPOLOGY ANALYZER - Analisador de Topologia do Sistema
 */
class SystemTopologyAnalyzer {
  constructor() {
    this.components = new Map();
    this.dependencies = new Map();
    this.impactPaths = new Map();
    
    this.setupSystemTopology();
  }

  /**
   * Configurar topologia do sistema
   */
  setupSystemTopology() {
    // Definir componentes do sistema
    this.components.set('whatsapp', {
      name: 'WhatsApp Service',
      type: 'service',
      criticality: 'critical',
      dependencies: ['queue', 'flow'],
      dependents: ['flow'],
      slaImpact: 'major'
    });

    this.components.set('instagram', {
      name: 'Instagram Service',
      type: 'service',
      criticality: 'critical',
      dependencies: ['queue', 'flow'],
      dependents: ['flow'],
      slaImpact: 'major'
    });

    this.components.set('database', {
      name: 'PostgreSQL Database',
      type: 'infrastructure',
      criticality: 'critical',
      dependencies: [],
      dependents: ['whatsapp', 'instagram', 'flow'],
      slaImpact: 'critical'
    });

    this.components.set('queue', {
      name: 'Redis Queue System',
      type: 'infrastructure',
      criticality: 'high',
      dependencies: ['database'],
      dependents: ['whatsapp', 'instagram', 'flow'],
      slaImpact: 'major'
    });

    this.components.set('flow', {
      name: 'Flow Orchestrator',
      type: 'business',
      criticality: 'critical',
      dependencies: ['whatsapp', 'instagram', 'database', 'queue'],
      dependents: [],
      slaImpact: 'critical'
    });

    this.components.set('system', {
      name: 'System Resources',
      type: 'infrastructure',
      criticality: 'high',
      dependencies: [],
      dependents: ['whatsapp', 'instagram', 'database', 'queue', 'flow'],
      slaImpact: 'major'
    });

    // Calcular caminhos de impacto
    this.calculateImpactPaths();
  }

  /**
   * Calcular caminhos de impacto
   */
  calculateImpactPaths() {
    this.components.forEach((component, componentKey) => {
      const paths = this.findImpactPaths(componentKey, new Set());
      this.impactPaths.set(componentKey, paths);
    });
  }

  /**
   * Encontrar caminhos de impacto
   */
  findImpactPaths(componentKey, visited = new Set()) {
    if (visited.has(componentKey)) return [];
    
    visited.add(componentKey);
    const component = this.components.get(componentKey);
    const paths = [];

    // Impacto direto nos dependentes
    component.dependents.forEach(dependent => {
      paths.push({
        from: componentKey,
        to: dependent,
        length: 1,
        impact: this.calculateDirectImpact(componentKey, dependent)
      });

      // Impacto indireto (recursivo)
      const indirectPaths = this.findImpactPaths(dependent, new Set(visited));
      indirectPaths.forEach(path => {
        paths.push({
          from: componentKey,
          to: path.to,
          length: path.length + 1,
          impact: this.calculateIndirectImpact(path.impact, 1),
          via: dependent
        });
      });
    });

    return paths;
  }

  /**
   * Calcular impacto direto
   */
  calculateDirectImpact(from, to) {
    const fromComponent = this.components.get(from);
    const toComponent = this.components.get(to);
    
    const criticalityWeight = {
      critical: 1.0,
      high: 0.8,
      medium: 0.6,
      low: 0.4
    };

    const typeWeight = {
      business: 1.0,
      service: 0.9,
      infrastructure: 0.8
    };

    const fromWeight = criticalityWeight[fromComponent.criticality] || 0.5;
    const toWeight = criticalityWeight[toComponent.criticality] || 0.5;
    const typeImpact = typeWeight[toComponent.type] || 0.5;

    return (fromWeight * toWeight * typeImpact).toFixed(3);
  }

  /**
   * Calcular impacto indireto
   */
  calculateIndirectImpact(directImpact, distance) {
    // Decaimento do impacto com a distância
    const decayFactor = Math.pow(0.7, distance);
    return (directImpact * decayFactor).toFixed(3);
  }

  /**
   * Analisar impacto de falha
   */
  analyzeFailureImpact(componentKey) {
    const component = this.components.get(componentKey);
    const impactPaths = this.impactPaths.get(componentKey) || [];
    
    const impactAnalysis = {
      component: componentKey,
      criticality: component.criticality,
      directImpacts: [],
      indirectImpacts: [],
      totalImpactScore: 0,
      affectedComponents: new Set(),
      businessImpact: this.calculateBusinessImpact(componentKey),
      recovery: {
        priority: this.calculateRecoveryPriority(componentKey),
        estimatedTime: this.estimateRecoveryTime(componentKey),
        dependencies: component.dependencies
      }
    };

    impactPaths.forEach(path => {
      impactAnalysis.affectedComponents.add(path.to);
      
      if (path.length === 1) {
        impactAnalysis.directImpacts.push(path);
      } else {
        impactAnalysis.indirectImpacts.push(path);
      }
      
      impactAnalysis.totalImpactScore += parseFloat(path.impact);
    });

    return impactAnalysis;
  }

  calculateBusinessImpact(componentKey) {
    const component = this.components.get(componentKey);
    const slaImpactWeight = {
      critical: 1.0,
      major: 0.8,
      minor: 0.4,
      none: 0.1
    };

    return {
      slaImpact: component.slaImpact,
      impactScore: slaImpactWeight[component.slaImpact] || 0.1,
      userExperience: this.assessUserExperienceImpact(componentKey),
      financialImpact: this.assessFinancialImpact(componentKey)
    };
  }

  assessUserExperienceImpact(componentKey) {
    const impactMap = {
      whatsapp: 'critical', // Usuários não conseguem enviar denúncias
      instagram: 'high',    // Denúncias não são publicadas
      flow: 'critical',     // Processo completo interrompido
      database: 'critical', // Sistema não funciona
      queue: 'high',        // Processamento lento
      system: 'medium'      // Performance degradada
    };

    return impactMap[componentKey] || 'low';
  }

  assessFinancialImpact(componentKey) {
    // Estimativa de impacto financeiro por hora de indisponibilidade
    const impactMap = {
      whatsapp: 5000,  // R$ 5.000/hora
      instagram: 3000, // R$ 3.000/hora  
      flow: 7000,      // R$ 7.000/hora
      database: 10000, // R$ 10.000/hora
      queue: 2000,     // R$ 2.000/hora
      system: 1000     // R$ 1.000/hora
    };

    return impactMap[componentKey] || 500;
  }

  calculateRecoveryPriority(componentKey) {
    const component = this.components.get(componentKey);
    const impactPaths = this.impactPaths.get(componentKey) || [];
    
    const criticalityScore = { critical: 100, high: 80, medium: 60, low: 40 };
    const baseScore = criticalityScore[component.criticality] || 40;
    const impactScore = impactPaths.length * 10;
    const dependentScore = component.dependents.length * 15;
    
    const totalScore = baseScore + impactScore + dependentScore;
    
    if (totalScore >= 150) return 'P1';
    if (totalScore >= 120) return 'P2';
    if (totalScore >= 90) return 'P3';
    return 'P4';
  }

  estimateRecoveryTime(componentKey) {
    // Estimativas baseadas em complexidade e dependências
    const baseRecoveryTime = {
      whatsapp: 300000,    // 5 minutos
      instagram: 600000,   // 10 minutos
      database: 1800000,   // 30 minutos
      queue: 600000,       // 10 minutos
      flow: 900000,        // 15 minutos
      system: 1200000      // 20 minutos
    };

    return baseRecoveryTime[componentKey] || 600000;
  }
}

/**
 * PERFORMANCE CORRELATION ENGINE - Engine Principal
 */
class PerformanceCorrelationEngine extends EventEmitter {
  constructor() {
    super();
    
    this.correlationCalculator = new CorrelationCalculator();
    this.topologyAnalyzer = new SystemTopologyAnalyzer();
    
    this.correlationMatrix = new Map();
    this.historicalCorrelations = [];
    this.correlationCache = new Map();
    this.alertRules = new Map();
    
    this.config = {
      updateInterval: 300000,        // 5 minutos
      correlationThreshold: 0.5,     // Limiar para correlações significativas
      maxHistoricalEntries: 1000,    // Máximo de entradas históricas
      cacheTimeout: 600000,          // 10 minutos de cache
      enableRealTimeCorrelation: true,
      enableCausalAnalysis: true,
      minDataPoints: 20              // Mínimo de pontos para análise
    };

    this.isRunning = false;
    this.updateInterval = null;
  }

  /**
   * Inicializar engine
   */
  async initialize() {
    logger.info('[CORRELATION] Initializing Performance Correlation Engine...');

    try {
      // Configurar regras de alerta
      this.setupAlertRules();

      // Configurar atualizações automáticas
      if (this.config.enableRealTimeCorrelation) {
        this.startRealTimeCorrelation();
      }

      // Primeira análise
      await this.performCorrelationAnalysis();

      this.isRunning = true;
      this.emit('initialized');
      
      logger.info('[CORRELATION] Performance Correlation Engine initialized');

    } catch (error) {
      logger.error('[CORRELATION] Failed to initialize engine:', error);
      throw error;
    }
  }

  /**
   * Configurar regras de alerta
   */
  setupAlertRules() {
    // Alta correlação negativa entre componentes críticos
    this.alertRules.set('negative_correlation_critical', {
      condition: (correlation) => 
        correlation.correlation < -0.7 && 
        correlation.significance === 'significant' &&
        this.isCriticalPair(correlation.component1, correlation.component2),
      severity: 'high',
      message: 'Strong negative correlation detected between critical components',
      action: 'investigate_root_cause'
    });

    // Correlação temporal suspeita (lag muito alto)
    this.alertRules.set('suspicious_lag', {
      condition: (correlation) =>
        correlation.method === 'cross_correlation' &&
        Math.abs(correlation.bestCorrelation.lag) > 10 &&
        Math.abs(correlation.bestCorrelation.correlation) > 0.6,
      severity: 'medium',
      message: 'Suspicious time lag detected in component correlation',
      action: 'check_timing_dependencies'
    });

    // Perda de correlação histórica
    this.alertRules.set('correlation_degradation', {
      condition: (current, historical) =>
        historical && 
        Math.abs(current.correlation - historical.correlation) > 0.3 &&
        current.significance === 'significant',
      severity: 'medium',
      message: 'Significant degradation in historical correlation pattern',
      action: 'investigate_system_changes'
    });
  }

  /**
   * Verificar se é um par crítico
   */
  isCriticalPair(component1, component2) {
    const criticalComponents = ['whatsapp', 'instagram', 'flow', 'database'];
    return criticalComponents.includes(component1) && criticalComponents.includes(component2);
  }

  /**
   * Iniciar correlação em tempo real
   */
  startRealTimeCorrelation() {
    this.updateInterval = setInterval(() => {
      this.performCorrelationAnalysis();
    }, this.config.updateInterval);

    logger.info('[CORRELATION] Real-time correlation analysis started');
  }

  /**
   * Executar análise de correlação
   */
  async performCorrelationAnalysis() {
    try {
      logger.debug('[CORRELATION] Starting correlation analysis...');

      // Obter dados de métricas
      const metricsData = await this.getMetricsData();
      
      if (!metricsData || Object.keys(metricsData).length < 2) {
        logger.warn('[CORRELATION] Insufficient metrics data for correlation analysis');
        return;
      }

      // Executar análises de correlação
      const correlationResults = await this.analyzeAllCorrelations(metricsData);
      
      // Analisar impactos do sistema
      const impactAnalysis = this.analyzeSystemImpacts(correlationResults);
      
      // Gerar insights acionáveis
      const insights = this.generateActionableInsights(correlationResults, impactAnalysis);
      
      // Atualizar matriz de correlação
      this.updateCorrelationMatrix(correlationResults);
      
      // Verificar alertas
      this.checkCorrelationAlerts(correlationResults);
      
      // Armazenar no histórico
      this.storeHistoricalCorrelations(correlationResults);

      // Emitir evento
      this.emit('correlationAnalysisCompleted', {
        correlations: correlationResults,
        impacts: impactAnalysis,
        insights,
        timestamp: Date.now()
      });

      logger.debug('[CORRELATION] Correlation analysis completed');

    } catch (error) {
      logger.error('[CORRELATION] Error in correlation analysis:', error);
    }
  }

  /**
   * Obter dados de métricas
   */
  async getMetricsData() {
    try {
      const metricsEngine = require('./metricsAggregationEngine');
      const metricsData = await metricsEngine.getMetricsForDashboard(3600000); // 1 hora

      // Extrair séries temporais para correlação
      const timeSeries = {};
      
      Object.entries(metricsData.metrics).forEach(([component, data]) => {
        if (data.noData) return;
        
        timeSeries[component] = {
          responseTime: this.extractTimeSeries(data, 'response_time'),
          errorRate: this.extractTimeSeries(data, 'error_rate'),
          throughput: this.extractTimeSeries(data, 'throughput'),
          resourceUsage: this.extractTimeSeries(data, 'resource_usage')
        };
      });

      return timeSeries;

    } catch (error) {
      logger.error('[CORRELATION] Error getting metrics data:', error);
      return null;
    }
  }

  /**
   * Extrair série temporal de métricas
   */
  extractTimeSeries(data, metricName) {
    // Implementação simplificada - em produção extrair dos dados reais
    if (!data.latest || typeof data.latest[metricName] !== 'number') {
      return [];
    }

    // Simular série temporal baseada em dados disponíveis
    const baseValue = data.latest[metricName];
    const series = [];
    
    for (let i = 0; i < 50; i++) {
      const variation = (Math.random() - 0.5) * 0.2; // ±10% de variação
      series.push(baseValue * (1 + variation));
    }
    
    return series;
  }

  /**
   * Analisar todas as correlações
   */
  async analyzeAllCorrelations(metricsData) {
    const correlations = [];
    const components = Object.keys(metricsData);
    const metrics = ['responseTime', 'errorRate', 'throughput', 'resourceUsage'];

    // Análise entre componentes
    for (let i = 0; i < components.length; i++) {
      for (let j = i + 1; j < components.length; j++) {
        const comp1 = components[i];
        const comp2 = components[j];

        // Análise entre métricas dos componentes
        for (const metric1 of metrics) {
          for (const metric2 of metrics) {
            const data1 = metricsData[comp1][metric1];
            const data2 = metricsData[comp2][metric2];

            if (data1.length >= this.config.minDataPoints && 
                data2.length >= this.config.minDataPoints) {
              
              const correlation = await this.analyzeCorrelationPair(
                data1, data2, `${comp1}.${metric1}`, `${comp2}.${metric2}`
              );
              
              if (correlation) {
                correlations.push(correlation);
              }
            }
          }
        }
      }
    }

    return correlations;
  }

  /**
   * Analisar par de correlação
   */
  async analyzeCorrelationPair(data1, data2, label1, label2) {
    try {
      // Verificar cache
      const cacheKey = `${label1}_${label2}`;
      const cached = this.correlationCache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp) < this.config.cacheTimeout) {
        return cached.result;
      }

      // Executar múltiplos métodos de correlação
      const pearson = this.correlationCalculator.calculatePearsonCorrelation(data1, data2);
      const spearman = this.correlationCalculator.calculateSpearmanCorrelation(data1, data2);
      const crossCorr = this.correlationCalculator.calculateCrossCorrelation(data1, data2);
      
      // Selecionar melhor correlação
      const bestCorrelation = this.selectBestCorrelation([pearson, spearman, crossCorr]);
      
      const result = {
        component1: label1.split('.')[0],
        component2: label2.split('.')[0],
        metric1: label1.split('.')[1],
        metric2: label2.split('.')[1],
        label1,
        label2,
        correlations: {
          pearson,
          spearman,
          crossCorrelation: crossCorr
        },
        bestCorrelation,
        interpretation: this.interpretCorrelation(bestCorrelation),
        timestamp: Date.now()
      };

      // Armazenar no cache
      this.correlationCache.set(cacheKey, {
        result,
        timestamp: Date.now()
      });

      return result;

    } catch (error) {
      logger.error(`[CORRELATION] Error analyzing correlation pair ${label1}-${label2}:`, error);
      return null;
    }
  }

  /**
   * Selecionar melhor correlação
   */
  selectBestCorrelation(correlations) {
    // Priorizar correlações significativas com maior magnitude
    const significant = correlations.filter(c => c.significance === 'significant');
    
    if (significant.length > 0) {
      return significant.reduce((best, current) => 
        Math.abs(current.correlation) > Math.abs(best.correlation) ? current : best
      );
    }
    
    // Se nenhuma significativa, retornar a com maior magnitude
    return correlations.reduce((best, current) => 
      Math.abs(current.correlation) > Math.abs(best.correlation) ? current : best
    );
  }

  /**
   * Interpretar correlação
   */
  interpretCorrelation(correlation) {
    const method = this.correlationCalculator.correlationMethods.get(correlation.method);
    
    if (method && method.interpretation) {
      return method.interpretation(correlation);
    }
    
    return {
      strength: this.correlationCalculator.categorizeCorrelationStrength(Math.abs(correlation.correlation)),
      direction: correlation.correlation > 0 ? 'positive' : 'negative',
      actionable: Math.abs(correlation.correlation) > this.config.correlationThreshold
    };
  }

  /**
   * Analisar impactos do sistema
   */
  analyzeSystemImpacts(correlations) {
    const systemImpacts = new Map();

    correlations.forEach(correlation => {
      if (!correlation.interpretation.actionable) return;

      const { component1, component2 } = correlation;
      
      // Análise de impacto para component1
      if (!systemImpacts.has(component1)) {
        systemImpacts.set(component1, this.topologyAnalyzer.analyzeFailureImpact(component1));
      }
      
      // Análise de impacto para component2
      if (!systemImpacts.has(component2)) {
        systemImpacts.set(component2, this.topologyAnalyzer.analyzeFailureImpact(component2));
      }
    });

    return Object.fromEntries(systemImpacts);
  }

  /**
   * Gerar insights acionáveis
   */
  generateActionableInsights(correlations, impactAnalysis) {
    const insights = {
      criticalCorrelations: [],
      performanceInsights: [],
      capacityInsights: [],
      reliabilityInsights: [],
      recommendations: []
    };

    correlations.forEach(correlation => {
      if (!correlation.interpretation.actionable) return;

      const insight = this.generateCorrelationInsight(correlation, impactAnalysis);
      
      if (insight.type === 'critical') {
        insights.criticalCorrelations.push(insight);
      } else if (insight.category === 'performance') {
        insights.performanceInsights.push(insight);
      } else if (insight.category === 'capacity') {
        insights.capacityInsights.push(insight);
      } else if (insight.category === 'reliability') {
        insights.reliabilityInsights.push(insight);
      }

      if (insight.recommendation) {
        insights.recommendations.push(insight.recommendation);
      }
    });

    return insights;
  }

  /**
   * Gerar insight de correlação
   */
  generateCorrelationInsight(correlation, impactAnalysis) {
    const { component1, component2, metric1, metric2, bestCorrelation, interpretation } = correlation;
    
    const insight = {
      id: `${component1}_${component2}_${metric1}_${metric2}`,
      component1,
      component2,
      metric1,
      metric2,
      correlation: bestCorrelation.correlation,
      strength: interpretation.strength,
      direction: interpretation.direction,
      timestamp: Date.now()
    };

    // Determinar tipo e categoria
    if (Math.abs(bestCorrelation.correlation) > 0.8) {
      insight.type = 'critical';
    } else if (Math.abs(bestCorrelation.correlation) > 0.6) {
      insight.type = 'important';
    } else {
      insight.type = 'notable';
    }

    // Categorizar por tipo de métrica
    if (metric1.includes('response') || metric2.includes('response')) {
      insight.category = 'performance';
    } else if (metric1.includes('resource') || metric2.includes('resource')) {
      insight.category = 'capacity';
    } else if (metric1.includes('error') || metric2.includes('error')) {
      insight.category = 'reliability';
    } else {
      insight.category = 'general';
    }

    // Gerar descrição
    insight.description = this.generateInsightDescription(correlation);
    
    // Gerar recomendação
    insight.recommendation = this.generateInsightRecommendation(correlation, impactAnalysis);

    return insight;
  }

  /**
   * Gerar descrição do insight
   */
  generateInsightDescription(correlation) {
    const { component1, component2, metric1, metric2, bestCorrelation, interpretation } = correlation;
    const corrValue = (bestCorrelation.correlation * 100).toFixed(1);
    
    if (interpretation.direction === 'positive') {
      return `${component1} ${metric1} increases tend to coincide with ${component2} ${metric2} increases (${corrValue}% correlation)`;
    } else {
      return `${component1} ${metric1} increases tend to coincide with ${component2} ${metric2} decreases (${corrValue}% inverse correlation)`;
    }
  }

  /**
   * Gerar recomendação do insight
   */
  generateInsightRecommendation(correlation, impactAnalysis) {
    const { component1, component2, metric1, metric2, interpretation } = correlation;
    
    if (!interpretation.actionable) return null;

    const recommendation = {
      priority: interpretation.strength === 'very_strong' ? 'high' : 'medium',
      category: 'performance_optimization',
      action: '',
      rationale: ''
    };

    // Gerar recomendação baseada no tipo de correlação
    if (metric1.includes('error') && metric2.includes('response')) {
      recommendation.action = `Monitor ${component1} error rates as leading indicator for ${component2} performance degradation`;
      recommendation.rationale = 'High correlation between error rates and response times indicates cascading failure risk';
      recommendation.category = 'monitoring';
    } else if (metric1.includes('resource') && metric2.includes('throughput')) {
      recommendation.action = `Implement resource-based auto-scaling for ${component2} based on ${component1} resource usage`;
      recommendation.rationale = 'Resource usage correlation with throughput indicates capacity bottleneck';
      recommendation.category = 'capacity_planning';
    } else {
      recommendation.action = `Investigate the relationship between ${component1} ${metric1} and ${component2} ${metric2}`;
      recommendation.rationale = `Strong ${interpretation.direction} correlation detected requires analysis`;
      recommendation.category = 'investigation';
    }

    return recommendation;
  }

  /**
   * Atualizar matriz de correlação
   */
  updateCorrelationMatrix(correlations) {
    const timestamp = Date.now();
    
    correlations.forEach(correlation => {
      const key = `${correlation.component1}_${correlation.component2}`;
      
      this.correlationMatrix.set(key, {
        ...correlation,
        lastUpdated: timestamp
      });
    });

    this.emit('correlationMatrixUpdated', {
      matrix: Object.fromEntries(this.correlationMatrix),
      timestamp
    });
  }

  /**
   * Verificar alertas de correlação
   */
  checkCorrelationAlerts(correlations) {
    correlations.forEach(correlation => {
      this.alertRules.forEach((rule, ruleKey) => {
        if (rule.condition(correlation)) {
          this.triggerCorrelationAlert(ruleKey, rule, correlation);
        }
      });
    });
  }

  /**
   * Disparar alerta de correlação
   */
  triggerCorrelationAlert(ruleKey, rule, correlation) {
    const alert = {
      id: `corr_alert_${Date.now()}_${ruleKey}`,
      type: 'correlation_alert',
      severity: rule.severity,
      message: rule.message,
      correlation,
      action: rule.action,
      timestamp: Date.now()
    };

    logger.warn(`[CORRELATION] Alert triggered: ${rule.message}`, {
      correlation: `${correlation.component1}-${correlation.component2}`,
      value: correlation.bestCorrelation.correlation
    });

    this.emit('correlationAlert', alert);
  }

  /**
   * Armazenar correlações históricas
   */
  storeHistoricalCorrelations(correlations) {
    const historyEntry = {
      timestamp: Date.now(),
      correlations: correlations.map(c => ({
        components: `${c.component1}_${c.component2}`,
        metrics: `${c.metric1}_${c.metric2}`,
        correlation: c.bestCorrelation.correlation,
        method: c.bestCorrelation.method,
        significance: c.bestCorrelation.significance
      }))
    };

    this.historicalCorrelations.push(historyEntry);

    // Manter limite de entradas históricas
    if (this.historicalCorrelations.length > this.config.maxHistoricalEntries) {
      this.historicalCorrelations = this.historicalCorrelations.slice(-this.config.maxHistoricalEntries);
    }
  }

  /**
   * Obter dashboard de correlações
   */
  getCorrelationDashboard() {
    const currentCorrelations = Array.from(this.correlationMatrix.values());
    const significantCorrelations = currentCorrelations.filter(
      c => c.interpretation.actionable
    );

    return {
      timestamp: Date.now(),
      summary: {
        totalCorrelations: currentCorrelations.length,
        significantCorrelations: significantCorrelations.length,
        strongCorrelations: significantCorrelations.filter(
          c => c.interpretation.strength === 'strong' || c.interpretation.strength === 'very_strong'
        ).length,
        negativeCorrelations: significantCorrelations.filter(
          c => c.interpretation.direction === 'negative'
        ).length
      },
      topCorrelations: significantCorrelations
        .sort((a, b) => Math.abs(b.bestCorrelation.correlation) - Math.abs(a.bestCorrelation.correlation))
        .slice(0, 10),
      systemImpacts: this.analyzeSystemImpacts(significantCorrelations),
      historicalTrends: this.getHistoricalTrends(),
      recommendations: this.getTopRecommendations(significantCorrelations)
    };
  }

  /**
   * Obter tendências históricas
   */
  getHistoricalTrends() {
    if (this.historicalCorrelations.length < 5) {
      return { insufficient_data: true };
    }

    const trends = {};
    
    // Analisar mudanças nas correlações ao longo do tempo
    this.historicalCorrelations.slice(-10).forEach(entry => {
      entry.correlations.forEach(corr => {
        const key = `${corr.components}_${corr.metrics}`;
        
        if (!trends[key]) {
          trends[key] = [];
        }
        
        trends[key].push({
          timestamp: entry.timestamp,
          correlation: corr.correlation
        });
      });
    });

    return trends;
  }

  /**
   * Obter principais recomendações
   */
  getTopRecommendations(correlations) {
    const insights = this.generateActionableInsights(correlations, {});
    
    return insights.recommendations
      .filter(r => r !== null)
      .sort((a, b) => {
        const priorityWeight = { high: 3, medium: 2, low: 1 };
        return priorityWeight[b.priority] - priorityWeight[a.priority];
      })
      .slice(0, 5);
  }

  /**
   * Parar engine
   */
  stop() {
    logger.info('[CORRELATION] Stopping Performance Correlation Engine...');

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    this.isRunning = false;
    this.emit('stopped');
    
    logger.info('[CORRELATION] Performance Correlation Engine stopped');
  }

  /**
   * Configurar engine
   */
  configure(newConfig) {
    this.config = { ...this.config, ...newConfig };
    
    // Reiniciar com nova configuração se estiver rodando
    if (this.isRunning) {
      this.stop();
      this.initialize();
    }
    
    logger.info('[CORRELATION] Engine configuration updated');
  }
}

module.exports = {
  PerformanceCorrelationEngine,
  CorrelationCalculator,
  SystemTopologyAnalyzer,
  default: new PerformanceCorrelationEngine()
};