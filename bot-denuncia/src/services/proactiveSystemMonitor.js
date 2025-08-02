/**
 * PROACTIVE SYSTEM MONITOR - Monitor Proativo do Sistema
 * 
 * Sistema de monitoramento proativo focado em:
 * - Prevenção de falhas antes que aconteçam
 * - Validação contínua de integridade do sistema
 * - Alertas antecipados para administradores
 * - Correlação inteligente de métricas
 * - Auto-correção de problemas identificados
 * 
 * @author System Reliability Engineer
 * @priority CRITICAL - Proactive Failure Prevention
 */

const EventEmitter = require('events');
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

/**
 * SYSTEM HEALTH PREDICTOR - Preditor de Saúde do Sistema
 */
class SystemHealthPredictor extends EventEmitter {
    constructor() {
        super();
        
        this.prisma = new PrismaClient();
        this.isRunning = false;
        this.intervals = new Map();
        
        // Configurações do sistema preditivo
        this.config = {
            predictionInterval: 60000,        // 1 minuto
            healthCheckInterval: 30000,       // 30 segundos
            alertCooldown: 300000,           // 5 minutos
            criticalThreshold: 0.8,          // 80% de probabilidade crítica
            warningThreshold: 0.6,           // 60% de probabilidade warning
            maxHistorySize: 1000,            // Máximo de entradas históricas
            enableProactiveFixes: true,      // Habilitar correções automáticas
            enablePredictiveMaintenance: true // Habilitar manutenção preditiva
        };

        // Métricas de saúde em tempo real
        this.systemMetrics = {
            database: {
                connectionPool: 0,
                queryLatency: 0,
                activeConnections: 0,
                failedQueries: 0,
                lastCheck: null
            },
            queues: {
                pendingJobs: 0,
                failedJobs: 0,
                processingRate: 0,
                workerHealth: 100,
                lastCheck: null
            },
            whatsapp: {
                connectionStatus: 'unknown',
                messageQueue: 0,
                responseTime: 0,
                errorRate: 0,
                lastCheck: null
            },
            instagram: {
                authStatus: 'unknown',
                riskScore: 0,
                postsToday: 0,
                dailyLimit: 0,
                lastCheck: null
            },
            system: {
                memoryUsage: 0,
                cpuUsage: 0,
                diskSpace: 0,
                activeHandles: 0,
                lastCheck: null
            }
        };

        // Histórico para análise preditiva
        this.metricsHistory = [];
        this.alertHistory = [];
        this.lastAlert = new Map();

        // Padrões de falha conhecidos
        this.failurePatterns = {
            databaseOverload: {
                pattern: 'database.connectionPool > 80 AND database.queryLatency > 1000',
                severity: 'critical',
                action: 'optimizeDatabaseConnections'
            },
            queueBacklog: {
                pattern: 'queues.pendingJobs > 100 AND queues.processingRate < 10',
                severity: 'warning',
                action: 'optimizeQueueWorkers'
            },
            whatsappInstability: {
                pattern: 'whatsapp.errorRate > 5 AND whatsapp.responseTime > 5000',
                severity: 'critical',
                action: 'restartWhatsAppConnection'
            },
            instagramRisk: {
                pattern: 'instagram.riskScore > 0.7 OR instagram.postsToday > instagram.dailyLimit * 0.8',
                severity: 'warning',
                action: 'slowDownInstagramPosting'
            },
            systemResourceExhaustion: {
                pattern: 'system.memoryUsage > 85 OR system.cpuUsage > 80',
                severity: 'critical',
                action: 'optimizeSystemResources'
            }
        };
    }

    /**
     * Iniciar sistema de monitoramento proativo
     */
    async start() {
        if (this.isRunning) {
            logger.warn('[PROACTIVE] Monitor already running');
            return;
        }

        logger.info('[PROACTIVE] Starting Proactive System Monitor...');

        try {
            // Configurar intervalos de monitoramento
            this.intervals.set('healthCheck', setInterval(() => {
                this.performHealthCheck();
            }, this.config.healthCheckInterval));

            this.intervals.set('prediction', setInterval(() => {
                this.runPredictiveAnalysis();
            }, this.config.predictionInterval));

            this.intervals.set('maintenance', setInterval(() => {
                this.runPredictiveMaintenance();
            }, 300000)); // 5 minutos

            this.isRunning = true;

            // Primeira execução imediata
            await this.performHealthCheck();
            
            this.emit('monitorStarted');
            logger.info('[PROACTIVE] Proactive monitoring started successfully');

        } catch (error) {
            logger.error('[PROACTIVE] Failed to start monitoring:', error);
            throw error;
        }
    }

    /**
     * Parar sistema de monitoramento
     */
    async stop() {
        if (!this.isRunning) return;

        logger.info('[PROACTIVE] Stopping Proactive System Monitor...');
        
        this.intervals.forEach((interval) => clearInterval(interval));
        this.intervals.clear();

        await this.prisma.$disconnect();
        
        this.isRunning = false;
        this.emit('monitorStopped');
        logger.info('[PROACTIVE] Proactive monitoring stopped');
    }

    /**
     * Executar verificação de saúde completa
     */
    async performHealthCheck() {
        const timestamp = Date.now();
        
        try {
            // Coletar métricas de todos os componentes
            await Promise.all([
                this.checkDatabaseHealth(),
                this.checkQueueHealth(),
                this.checkWhatsAppHealth(),
                this.checkInstagramHealth(),
                this.checkSystemHealth()
            ]);

            // Adicionar timestamp a todas as métricas
            Object.values(this.systemMetrics).forEach(metric => {
                metric.lastCheck = timestamp;
            });

            // Armazenar no histórico
            this.addToHistory(this.systemMetrics, timestamp);

            // Analisar padrões de falha
            await this.analyzeFailurePatterns();

            this.emit('healthCheckCompleted', {
                metrics: this.systemMetrics,
                timestamp
            });

        } catch (error) {
            logger.error('[PROACTIVE] Health check failed:', error);
            this.emit('healthCheckFailed', { error: error.message, timestamp });
        }
    }

    /**
     * Verificar saúde do banco de dados
     */
    async checkDatabaseHealth() {
        try {
            const startTime = Date.now();
            
            // Teste básico de conexão
            await this.prisma.$queryRaw`SELECT 1 as test`;
            const queryLatency = Date.now() - startTime;

            // Obter informações de conexão
            const connectionInfo = await this.prisma.$queryRaw`
                SELECT 
                    count(*) as active_connections,
                    (SELECT setting FROM pg_settings WHERE name = 'max_connections') as max_connections
                FROM pg_stat_activity 
                WHERE state = 'active'
            `;

            const activeConnections = Number(connectionInfo[0].active_connections);
            const maxConnections = Number(connectionInfo[0].max_connections);
            const connectionPoolUsage = (activeConnections / maxConnections) * 100;

            // Verificar jobs falhados recentemente
            const failedQueriesCount = await this.prisma.denuncia.count({
                where: {
                    status: 'ERRO',
                    createdAt: {
                        gte: new Date(Date.now() - 3600000) // Última hora
                    }
                }
            });

            this.systemMetrics.database = {
                connectionPool: connectionPoolUsage,
                queryLatency,
                activeConnections,
                failedQueries: failedQueriesCount,
                lastCheck: Date.now()
            };

        } catch (error) {
            logger.error('[PROACTIVE] Database health check failed:', error);
            this.systemMetrics.database = {
                connectionPool: 100, // Assumir o pior
                queryLatency: 9999,
                activeConnections: 0,
                failedQueries: 999,
                lastCheck: Date.now(),
                error: error.message
            };
        }
    }

    /**
     * Verificar saúde das filas
     */
    async checkQueueHealth() {
        try {
            // Simular verificação de filas Redis/Bull
            // Em produção, isso consultaria as estatísticas reais das filas
            
            const pendingJobs = await this.prisma.denuncia.count({
                where: {
                    status: {
                        in: ['PENDENTE_MODERACAO', 'APROVADA']
                    }
                }
            });

            const failedJobs = await this.prisma.denuncia.count({
                where: {
                    status: 'ERRO',
                    updatedAt: {
                        gte: new Date(Date.now() - 3600000) // Última hora
                    }
                }
            });

            // Calcular taxa de processamento (simplificado)
            const recentlyProcessed = await this.prisma.denuncia.count({
                where: {
                    status: 'PUBLICADA',
                    publishedAt: {
                        gte: new Date(Date.now() - 3600000) // Última hora
                    }
                }
            });

            const processingRate = recentlyProcessed; // Posts por hora
            const workerHealth = failedJobs === 0 ? 100 : Math.max(0, 100 - (failedJobs * 10));

            this.systemMetrics.queues = {
                pendingJobs,
                failedJobs,
                processingRate,
                workerHealth,
                lastCheck: Date.now()
            };

        } catch (error) {
            logger.error('[PROACTIVE] Queue health check failed:', error);
            this.systemMetrics.queues = {
                pendingJobs: 999,
                failedJobs: 999,
                processingRate: 0,
                workerHealth: 0,
                lastCheck: Date.now(),
                error: error.message
            };
        }
    }

    /**
     * Verificar saúde do WhatsApp
     */
    async checkWhatsAppHealth() {
        try {
            // Tentar acessar o serviço WhatsApp
            const whatsappService = require('./whatsappService-robust');
            const connectionStatus = whatsappService.getConnectionStatus();
            
            this.systemMetrics.whatsapp = {
                connectionStatus: connectionStatus.isConnected ? 'connected' : 'disconnected',
                messageQueue: connectionStatus.messageQueue || 0,
                responseTime: connectionStatus.averageResponseTime || 0,
                errorRate: connectionStatus.errorRate || 0,
                lastCheck: Date.now()
            };

        } catch (error) {
            logger.warn('[PROACTIVE] WhatsApp health check failed:', error.message);
            this.systemMetrics.whatsapp = {
                connectionStatus: 'error',
                messageQueue: 0,
                responseTime: 9999,
                errorRate: 100,
                lastCheck: Date.now(),
                error: error.message
            };
        }
    }

    /**
     * Verificar saúde do Instagram
     */
    async checkInstagramHealth() {
        try {
            // Tentar acessar o Instagram API Manager
            const instagramApiManager = require('./instagramApiManager');
            const apiStatus = await instagramApiManager.getApiStatus();
            
            this.systemMetrics.instagram = {
                authStatus: apiStatus.apis[apiStatus.currentApi]?.healthy ? 'authenticated' : 'not_authenticated',
                currentApi: apiStatus.currentApi,
                healthScore: apiStatus.healthScore,
                migrationReady: apiStatus.migrationReady,
                apis: apiStatus.apis,
                lastCheck: Date.now()
            };

        } catch (error) {
            logger.warn('[PROACTIVE] Instagram health check failed:', error.message);
            this.systemMetrics.instagram = {
                authStatus: 'error',
                riskScore: 1.0,
                postsToday: 0,
                dailyLimit: 0,
                lastCheck: Date.now(),
                error: error.message
            };
        }
    }

    /**
     * Verificar saúde do sistema
     */
    async checkSystemHealth() {
        try {
            const memUsage = process.memoryUsage();
            const cpuUsage = process.cpuUsage();
            
            this.systemMetrics.system = {
                memoryUsage: (memUsage.heapUsed / memUsage.heapTotal) * 100,
                cpuUsage: (cpuUsage.user + cpuUsage.system) / 1000000, // Converter para segundos
                diskSpace: 50, // Simplificado
                activeHandles: process._getActiveHandles().length,
                lastCheck: Date.now()
            };

        } catch (error) {
            logger.error('[PROACTIVE] System health check failed:', error);
            this.systemMetrics.system = {
                memoryUsage: 100,
                cpuUsage: 100,
                diskSpace: 100,
                activeHandles: 999,
                lastCheck: Date.now(),
                error: error.message
            };
        }
    }

    /**
     * Adicionar métricas ao histórico
     */
    addToHistory(metrics, timestamp) {
        this.metricsHistory.push({
            timestamp,
            metrics: JSON.parse(JSON.stringify(metrics))
        });

        // Manter apenas o histórico necessário
        if (this.metricsHistory.length > this.config.maxHistorySize) {
            this.metricsHistory.shift();
        }
    }

    /**
     * Analisar padrões de falha
     */
    async analyzeFailurePatterns() {
        for (const [patternName, pattern] of Object.entries(this.failurePatterns)) {
            const riskScore = this.evaluatePattern(pattern.pattern);
            
            if (riskScore >= this.config.criticalThreshold) {
                await this.handleCriticalPattern(patternName, pattern, riskScore);
            } else if (riskScore >= this.config.warningThreshold) {
                await this.handleWarningPattern(patternName, pattern, riskScore);
            }
        }
    }

    /**
     * Avaliar padrão de risco
     */
    evaluatePattern(patternExpression) {
        try {
            // Substituir variáveis pelos valores reais
            let expression = patternExpression;
            
            // Substituir referências às métricas
            expression = expression.replace(/database\.(\w+)/g, (match, prop) => {
                return this.systemMetrics.database[prop] || 0;
            });
            
            expression = expression.replace(/queues\.(\w+)/g, (match, prop) => {
                return this.systemMetrics.queues[prop] || 0;
            });
            
            expression = expression.replace(/whatsapp\.(\w+)/g, (match, prop) => {
                return this.systemMetrics.whatsapp[prop] || 0;
            });
            
            expression = expression.replace(/instagram\.(\w+)/g, (match, prop) => {
                return this.systemMetrics.instagram[prop] || 0;
            });
            
            expression = expression.replace(/system\.(\w+)/g, (match, prop) => {
                return this.systemMetrics.system[prop] || 0;
            });

            // Avaliar expressão (simplificado - em produção usaria um parser mais seguro)
            const result = this.evaluateSimpleExpression(expression);
            return result ? 1.0 : 0.0;
            
        } catch (error) {
            logger.error('[PROACTIVE] Pattern evaluation failed:', error);
            return 0.0;
        }
    }

    /**
     * Avaliar expressão simples
     */
    evaluateSimpleExpression(expression) {
        // Parser muito simples para expressões básicas
        // Em produção, usar uma biblioteca dedicada como mathjs
        
        try {
            // Substituir operadores lógicos
            expression = expression.replace(/\s+AND\s+/g, ' && ');
            expression = expression.replace(/\s+OR\s+/g, ' || ');
            
            // Avaliar (CUIDADO: Isso é inseguro em produção)
            // Aqui deveria usar um parser seguro
            return Function('return ' + expression)();
            
        } catch (error) {
            logger.warn('[PROACTIVE] Expression evaluation failed:', error.message);
            return false;
        }
    }

    /**
     * Lidar com padrão crítico
     */
    async handleCriticalPattern(patternName, pattern, riskScore) {
        const alertKey = `critical_${patternName}`;
        const lastAlertTime = this.lastAlert.get(alertKey) || 0;
        const now = Date.now();
        
        // Verificar cooldown
        if (now - lastAlertTime < this.config.alertCooldown) {
            return;
        }

        logger.error(`[PROACTIVE] CRITICAL PATTERN DETECTED: ${patternName} (risk: ${riskScore})`);
        
        // Executar ação automática se habilitada
        if (this.config.enableProactiveFixes && pattern.action) {
            try {
                await this.executeProactiveFix(pattern.action, patternName);
            } catch (error) {
                logger.error(`[PROACTIVE] Proactive fix failed for ${patternName}:`, error);
            }
        }

        // Emitir alerta
        this.emit('criticalAlert', {
            pattern: patternName,
            riskScore,
            metrics: this.systemMetrics,
            action: pattern.action,
            timestamp: now
        });

        this.lastAlert.set(alertKey, now);
        this.alertHistory.push({
            type: 'critical',
            pattern: patternName,
            riskScore,
            timestamp: now
        });
    }

    /**
     * Lidar com padrão de aviso
     */
    async handleWarningPattern(patternName, pattern, riskScore) {
        const alertKey = `warning_${patternName}`;
        const lastAlertTime = this.lastAlert.get(alertKey) || 0;
        const now = Date.now();
        
        // Verificar cooldown (menor para warnings)
        if (now - lastAlertTime < this.config.alertCooldown / 2) {
            return;
        }

        logger.warn(`[PROACTIVE] WARNING PATTERN DETECTED: ${patternName} (risk: ${riskScore})`);
        
        // Emitir alerta
        this.emit('warningAlert', {
            pattern: patternName,
            riskScore,
            metrics: this.systemMetrics,
            action: pattern.action,
            timestamp: now
        });

        this.lastAlert.set(alertKey, now);
        this.alertHistory.push({
            type: 'warning',
            pattern: patternName,
            riskScore,
            timestamp: now
        });
    }

    /**
     * Executar correção proativa
     */
    async executeProactiveFix(action, patternName) {
        logger.info(`[PROACTIVE] Executing proactive fix: ${action} for pattern: ${patternName}`);

        switch (action) {
            case 'optimizeDatabaseConnections':
                await this.optimizeDatabaseConnections();
                break;
                
            case 'optimizeQueueWorkers':
                await this.optimizeQueueWorkers();
                break;
                
            case 'restartWhatsAppConnection':
                await this.restartWhatsAppConnection();
                break;
                
            case 'slowDownInstagramPosting':
                await this.slowDownInstagramPosting();
                break;
                
            case 'optimizeSystemResources':
                await this.optimizeSystemResources();
                break;
                
            default:
                logger.warn(`[PROACTIVE] Unknown action: ${action}`);
        }
    }

    /**
     * Otimizar conexões do banco de dados
     */
    async optimizeDatabaseConnections() {
        try {
            // Desconectar e reconectar para limpar pool
            await this.prisma.$disconnect();
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Forçar garbage collection se disponível
            if (global.gc) {
                global.gc();
            }
            
            logger.info('[PROACTIVE] Database connections optimized');
            
        } catch (error) {
            logger.error('[PROACTIVE] Database optimization failed:', error);
        }
    }

    /**
     * Otimizar workers das filas
     */
    async optimizeQueueWorkers() {
        try {
            // Em um sistema real, isso reiniciaria workers ou ajustaria concorrência
            logger.info('[PROACTIVE] Queue workers optimization triggered');
            
            // Placeholder para otimização real
            this.emit('queueOptimizationTriggered');
            
        } catch (error) {
            logger.error('[PROACTIVE] Queue optimization failed:', error);
        }
    }

    /**
     * Reiniciar conexão WhatsApp
     */
    async restartWhatsAppConnection() {
        try {
            const whatsappService = require('./whatsappService-robust');
            await whatsappService.forceReconnect();
            
            logger.info('[PROACTIVE] WhatsApp connection restarted');
            
        } catch (error) {
            logger.error('[PROACTIVE] WhatsApp restart failed:', error);
        }
    }

    /**
     * Diminuir velocidade do Instagram
     */
    async slowDownInstagramPosting() {
        try {
            const instagramApiManager = require('./instagramApiManager');
            
            // Test connection and get migration recommendations if needed
            const connectionTest = await instagramApiManager.testConnection();
            if (!connectionTest.success) {
                const recommendations = await instagramApiManager.getMigrationRecommendations();
                logger.warn('[PROACTIVE] Instagram connection failed, checking migration options', {
                    migrationReady: recommendations.migrationReady,
                    recommendations: recommendations.recommendations
                });
            }
            
            logger.info('[PROACTIVE] Instagram posting monitoring active');
            
        } catch (error) {
            logger.error('[PROACTIVE] Instagram slow down failed:', error);
        }
    }

    /**
     * Otimizar recursos do sistema
     */
    async optimizeSystemResources() {
        try {
            // Forçar garbage collection
            if (global.gc) {
                global.gc();
            }
            
            // Limpar caches se disponível
            this.emit('systemOptimizationTriggered');
            
            logger.info('[PROACTIVE] System resources optimized');
            
        } catch (error) {
            logger.error('[PROACTIVE] System optimization failed:', error);
        }
    }

    /**
     * Executar análise preditiva
     */
    async runPredictiveAnalysis() {
        if (this.metricsHistory.length < 10) {
            return; // Precisa de dados suficientes
        }

        try {
            // Análise de tendências simples
            const recentMetrics = this.metricsHistory.slice(-10);
            
            // Analisar tendência de conexões do banco
            const dbConnections = recentMetrics.map(m => m.metrics.database.connectionPool);
            const dbTrend = this.calculateTrend(dbConnections);
            
            if (dbTrend.slope > 5) { // Crescimento de 5% por intervalo
                this.emit('predictiveWarning', {
                    component: 'database',
                    metric: 'connectionPool',
                    trend: dbTrend,
                    prediction: 'Database connection pool may reach capacity soon',
                    timestamp: Date.now()
                });
            }

            // Analisar tendência de memória
            const memUsage = recentMetrics.map(m => m.metrics.system.memoryUsage);
            const memTrend = this.calculateTrend(memUsage);
            
            if (memTrend.slope > 2) { // Crescimento de 2% por intervalo
                this.emit('predictiveWarning', {
                    component: 'system',
                    metric: 'memoryUsage',
                    trend: memTrend,
                    prediction: 'Memory usage is trending upward - potential memory leak',
                    timestamp: Date.now()
                });
            }

        } catch (error) {
            logger.error('[PROACTIVE] Predictive analysis failed:', error);
        }
    }

    /**
     * Calcular tendência simples
     */
    calculateTrend(values) {
        if (values.length < 2) return { slope: 0, r2: 0 };
        
        const n = values.length;
        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
        
        for (let i = 0; i < n; i++) {
            sumX += i;
            sumY += values[i];
            sumXY += i * values[i];
            sumX2 += i * i;
        }
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        
        // Calcular R²
        const yMean = sumY / n;
        let ssRes = 0, ssTot = 0;
        
        for (let i = 0; i < n; i++) {
            const predicted = slope * i + intercept;
            ssRes += Math.pow(values[i] - predicted, 2);
            ssTot += Math.pow(values[i] - yMean, 2);
        }
        
        const r2 = 1 - (ssRes / ssTot);
        
        return { slope, intercept, r2 };
    }

    /**
     * Executar manutenção preditiva
     */
    async runPredictiveMaintenance() {
        if (!this.config.enablePredictiveMaintenance) {
            return;
        }

        try {
            // Limpeza preventiva de logs antigos
            await this.cleanupOldAlerts();
            
            // Otimização preventiva se uso de memória estiver alto
            if (this.systemMetrics.system.memoryUsage > 70) {
                await this.optimizeSystemResources();
            }
            
            // Verificação preventiva de jobs falhos
            if (this.systemMetrics.queues.failedJobs > 5) {
                this.emit('maintenanceRequired', {
                    type: 'queue_cleanup',
                    failedJobs: this.systemMetrics.queues.failedJobs,
                    timestamp: Date.now()
                });
            }

        } catch (error) {
            logger.error('[PROACTIVE] Predictive maintenance failed:', error);
        }
    }

    /**
     * Limpar alertas antigos
     */
    async cleanupOldAlerts() {
        const oneHourAgo = Date.now() - 3600000;
        this.alertHistory = this.alertHistory.filter(alert => alert.timestamp > oneHourAgo);
    }

    /**
     * Obter métricas atuais do sistema
     */
    getCurrentMetrics() {
        return {
            timestamp: Date.now(),
            isRunning: this.isRunning,
            metrics: this.systemMetrics,
            alertHistory: this.alertHistory.slice(-10), // Últimos 10 alertas
            configuration: this.config
        };
    }

    /**
     * Obter status de saúde geral
     */
    getOverallHealthStatus() {
        const components = Object.keys(this.systemMetrics);
        let healthyCount = 0;
        let warningCount = 0;
        let criticalCount = 0;

        components.forEach(component => {
            const metrics = this.systemMetrics[component];
            if (metrics.error) {
                criticalCount++;
            } else {
                // Lógica simplificada de avaliação de saúde
                const isHealthy = this.isComponentHealthy(component, metrics);
                if (isHealthy) {
                    healthyCount++;
                } else {
                    warningCount++;
                }
            }
        });

        let overallStatus = 'healthy';
        if (criticalCount > 0) {
            overallStatus = 'critical';
        } else if (warningCount > healthyCount) {
            overallStatus = 'degraded';
        }

        return {
            status: overallStatus,
            components: {
                healthy: healthyCount,
                warning: warningCount,
                critical: criticalCount,
                total: components.length
            },
            timestamp: Date.now()
        };
    }

    /**
     * Verificar se componente está saudável
     */
    isComponentHealthy(component, metrics) {
        switch (component) {
            case 'database':
                return metrics.connectionPool < 80 && metrics.queryLatency < 1000;
            case 'queues':
                return metrics.pendingJobs < 50 && metrics.processingRate > 5;
            case 'whatsapp':
                return metrics.connectionStatus === 'connected' && metrics.errorRate < 5;
            case 'instagram':
                return metrics.authStatus === 'authenticated' && metrics.riskScore < 0.7;
            case 'system':
                return metrics.memoryUsage < 80 && metrics.cpuUsage < 70;
            default:
                return true;
        }
    }
}

module.exports = new SystemHealthPredictor();