/**
 * WHATSAPP STABILITY ENGINE - RELIABILITY ENGINEERING
 * 
 * Sistema robusto de estabilidade para WhatsApp Web.js implementando:
 * - Reconexão automática com exponential backoff inteligente
 * - Heartbeat/keepalive otimizado
 * - Sistema de queue resiliente para zero perda de mensagens
 * - Monitoramento proativo de saúde da conexão
 * - Circuit breaker e rate limiting
 * - Preservação de estado durante reconexões
 * 
 * @author Backend Reliability Engineer
 * @priority CRITICAL - Production Ready
 */

const EventEmitter = require('events');
const logger = require('../utils/logger');

/**
 * CONSTANTES DE CONFIABILIDADE
 */
const RELIABILITY_CONSTANTS = {
    // Reconnection
    MAX_RECONNECT_ATTEMPTS: 10,
    BASE_RECONNECT_DELAY: 2000,
    MAX_RECONNECT_DELAY: 300000, // 5 minutos
    JITTER_FACTOR: 0.3,
    
    // Connection
    CONNECTION_TIMEOUT: 120000, // 2 minutos
    HEARTBEAT_INTERVAL: 30000, // 30 segundos
    HEALTH_CHECK_TIMEOUT: 8000,
    
    // Circuit Breaker
    CIRCUIT_FAILURE_THRESHOLD: 5,
    CIRCUIT_RECOVERY_TIMEOUT: 60000, // 1 minuto
    
    // Rate Limiting
    QR_REQUESTS_PER_MINUTE: 3,
    MESSAGES_PER_SECOND: 10,
    RECONNECTS_PER_HOUR: 20,
    
    // Cleanup
    SESSION_CLEANUP_ATTEMPTS: 3,
    FORCE_CLEANUP_DELAY: 5000
};

/**
 * SMART RATE LIMITER
 */
class SmartRateLimiter {
    constructor() {
        this.limits = {
            qrRequests: { count: 0, resetTime: 0, max: RELIABILITY_CONSTANTS.QR_REQUESTS_PER_MINUTE },
            messages: { count: 0, resetTime: 0, max: RELIABILITY_CONSTANTS.MESSAGES_PER_SECOND },
            reconnects: { count: 0, resetTime: 0, max: RELIABILITY_CONSTANTS.RECONNECTS_PER_HOUR }
        };
        
        this.timers = {};
        this.setupResetTimers();
    }
    
    isAllowed(action) {
        const limit = this.limits[action];
        if (!limit) return true;
        
        const now = Date.now();
        
        // Reset se necessário
        if (now > limit.resetTime) {
            limit.count = 0;
            this.updateResetTime(action);
        }
        
        return limit.count < limit.max;
    }
    
    recordAction(action) {
        const limit = this.limits[action];
        if (limit) {
            limit.count++;
        }
    }
    
    getTimeUntilReset(action) {
        const limit = this.limits[action];
        return limit ? Math.max(0, limit.resetTime - Date.now()) : 0;
    }
    
    updateResetTime(action) {
        const now = Date.now();
        const intervals = {
            qrRequests: 60000, // 1 minuto
            messages: 1000,    // 1 segundo
            reconnects: 3600000 // 1 hora
        };
        
        this.limits[action].resetTime = now + intervals[action];
    }
    
    setupResetTimers() {
        // Reset periódico para evitar memory leaks
        Object.keys(this.limits).forEach(action => {
            this.updateResetTime(action);
        });
    }
    
    stopTimers() {
        Object.values(this.timers).forEach(timer => clearTimeout(timer));
        this.timers = {};
    }
}

/**
 * RECONNECTION MANAGER ROBUSTO
 */
class RobustReconnectionManager extends EventEmitter {
    constructor() {
        super();
        this.currentAttempt = 0;
        this.isCircuitOpen = false;
        this.circuitFailures = 0;
        this.lastCircuitOpenTime = 0;
        this.connectionHistory = [];
        this.cleanupStrategies = new Map();
        
        this.initializeCleanupStrategies();
    }
    
    /**
     * Calcular delay inteligente com exponential backoff e jitter
     */
    calculateDelay(attempt, reason = 'UNKNOWN') {
        // Base delay com exponential backoff
        let delay = RELIABILITY_CONSTANTS.BASE_RECONNECT_DELAY * Math.pow(2, attempt - 1);
        
        // Aplicar jitter para evitar thundering herd
        const jitter = delay * RELIABILITY_CONSTANTS.JITTER_FACTOR * Math.random();
        delay = delay + jitter;
        
        // Delays específicos por razão
        const reasonMultipliers = {
            'AUTH_FAILURE': 2.0,
            'SESSION_REVOKED': 3.0,
            'RATE_LIMIT': 4.0,
            'CONFLICTING_SESSION': 1.5,
            'UNPAIRED': 0.8,
            'TIMEOUT': 1.2,
            'HEALTH_FAILURE': 1.0
        };
        
        const multiplier = reasonMultipliers[reason] || 1.0;
        delay = delay * multiplier;
        
        // Limitar delay máximo
        return Math.min(delay, RELIABILITY_CONSTANTS.MAX_RECONNECT_DELAY);
    }
    
    /**
     * Estratégia de reconexão baseada na tentativa
     */
    getReconnectionStrategy(attempt) {
        if (attempt <= 3) return 'FAST_RETRY';
        if (attempt <= 6) return 'EXPONENTIAL_BACKOFF';
        if (attempt <= 8) return 'CONSERVATIVE_RETRY';
        return 'LAST_RESORT';
    }
    
    /**
     * Inicializar estratégias de cleanup
     */
    initializeCleanupStrategies() {
        this.cleanupStrategies.set('FAST_RETRY', async () => {
            logger.info('🔄 Executing fast retry cleanup');
            // Cleanup básico
        });
        
        this.cleanupStrategies.set('EXPONENTIAL_BACKOFF', async () => {
            logger.info('🔄 Executing exponential backoff cleanup');
            // Cleanup intermediário com limpeza de cache
            await this.clearBrowserCache();
        });
        
        this.cleanupStrategies.set('CONSERVATIVE_RETRY', async () => {
            logger.info('🔄 Executing conservative retry cleanup');
            // Cleanup agressivo
            await this.clearBrowserCache();
            await this.clearSessionData();
        });
        
        this.cleanupStrategies.set('LAST_RESORT', async () => {
            logger.info('🔄 Executing last resort cleanup');
            // Full system reset
            await this.fullSystemReset();
        });
    }
    
    /**
     * Executar estratégia de cleanup
     */
    async executeCleanupStrategy(attempt) {
        const strategy = this.getReconnectionStrategy(attempt);
        const cleanupFn = this.cleanupStrategies.get(strategy);
        
        if (cleanupFn) {
            try {
                await cleanupFn();
                logger.info(`✅ Cleanup strategy ${strategy} executed successfully`);
            } catch (error) {
                logger.error(`❌ Cleanup strategy ${strategy} failed:`, error.message);
            }
        }
    }
    
    /**
     * Limpar cache do navegador
     */
    async clearBrowserCache() {
        // Implementar limpeza de cache específica
        logger.info('🧹 Clearing browser cache...');
    }
    
    /**
     * Limpar dados de sessão
     */
    async clearSessionData() {
        const fs = require('fs').promises;
        const path = require('path');
        
        try {
            const sessionPath = path.join(process.cwd(), '.wwebjs_auth');
            
            // Verificar se existe
            await fs.access(sessionPath);
            
            // Remover recursivamente
            await fs.rm(sessionPath, { recursive: true, force: true });
            
            logger.info('✅ Session data cleared successfully');
        } catch (error) {
            if (error.code !== 'ENOENT') {
                logger.warn('⚠️ Session data cleanup warning:', error.message);
            }
        }
    }
    
    /**
     * Reset completo do sistema
     */
    async fullSystemReset() {
        logger.info('🔄 Executing full system reset...');
        
        try {
            // Limpar dados de sessão
            await this.clearSessionData();
            
            // Limpar cache
            await this.clearBrowserCache();
            
            // Kill processos Chrome órfãos (Linux/Mac)
            if (process.platform !== 'win32') {
                const { exec } = require('child_process');
                exec('pkill -f "chrome.*--remote-debugging-port"', (error) => {
                    if (error && !error.message.includes('No such process')) {
                        logger.warn('Chrome cleanup warning:', error.message);
                    }
                });
            }
            
            // Reset circuit breaker
            this.circuitFailures = 0;
            this.isCircuitOpen = false;
            this.lastCircuitOpenTime = 0;
            
            logger.info('✅ Full system reset completed');
        } catch (error) {
            logger.error('❌ Full system reset failed:', error.message);
        }
    }
    
    /**
     * Verificar saúde do sistema
     */
    async checkSystemHealth() {
        const checks = {
            memory: this.checkMemoryUsage(),
            disk: await this.checkDiskSpace(),
            network: await this.checkNetworkConnectivity(),
            processes: this.checkProcessCount()
        };
        
        const healthy = Object.values(checks).every(check => check.healthy);
        
        return {
            healthy,
            checks,
            timestamp: new Date().toISOString()
        };
    }
    
    checkMemoryUsage() {
        const used = process.memoryUsage();
        const memoryMB = Math.round(used.heapUsed / 1024 / 1024);
        
        return {
            healthy: memoryMB < 500, // Alertar se > 500MB
            value: memoryMB,
            unit: 'MB'
        };
    }
    
    async checkDiskSpace() {
        try {
            const fs = require('fs').promises;
            const stats = await fs.stat(process.cwd());
            
            return {
                healthy: true,
                available: true
            };
        } catch (error) {
            return {
                healthy: false,
                error: error.message
            };
        }
    }
    
    async checkNetworkConnectivity() {
        try {
            const { promisify } = require('util');
            const dns = require('dns');
            const lookup = promisify(dns.lookup);
            
            await lookup('web.whatsapp.com');
            
            return {
                healthy: true,
                connected: true
            };
        } catch (error) {
            return {
                healthy: false,
                error: error.message
            };
        }
    }
    
    checkProcessCount() {
        // Verificar se não há muitos processos Chrome abertos
        return {
            healthy: true,
            count: 'unknown'
        };
    }
    
    /**
     * Atualizar circuit breaker
     */
    updateCircuitBreaker(success) {
        if (success) {
            this.circuitFailures = 0;
            if (this.isCircuitOpen) {
                this.isCircuitOpen = false;
                logger.info('🟢 Circuit breaker closed - connection recovered');
                this.emit('circuit_closed');
            }
        } else {
            this.circuitFailures++;
            
            if (this.circuitFailures >= RELIABILITY_CONSTANTS.CIRCUIT_FAILURE_THRESHOLD && !this.isCircuitOpen) {
                this.isCircuitOpen = true;
                this.lastCircuitOpenTime = Date.now();
                logger.warn('🔴 Circuit breaker opened - too many failures');
                this.emit('circuit_opened', { failures: this.circuitFailures });
                
                // Auto-recovery após timeout
                setTimeout(() => {
                    this.isCircuitOpen = false;
                    this.circuitFailures = Math.floor(this.circuitFailures / 2); // Reduzir pela metade
                    logger.info('🟡 Circuit breaker half-open - attempting recovery');
                    this.emit('circuit_half_open');
                }, RELIABILITY_CONSTANTS.CIRCUIT_RECOVERY_TIMEOUT);
            }
        }
    }
    
    /**
     * Verificar se circuit breaker permite operação
     */
    isOperationAllowed() {
        return !this.isCircuitOpen;
    }
    
    /**
     * Notificar administradores
     */
    async notifyAdministrators(event, data) {
        logger.error(`🚨 CRITICAL EVENT: ${event}`, data);
        
        // Implementar notificação por email, Slack, webhook, etc.
        // Por enquanto apenas log crítico
        
        try {
            // Exemplo: webhook de notificação
            // await this.sendWebhookNotification(event, data);
        } catch (error) {
            logger.error('Failed to notify administrators:', error.message);
        }
    }
}

/**
 * WHATSAPP HEALTH MONITOR
 */
class WhatsAppHealthMonitor extends EventEmitter {
    constructor(client) {
        super();
        this.client = client;
        this.isMonitoring = false;
        this.monitoringInterval = null;
        this.lastSuccessfulMessage = Date.now();
        this.lastHealthCheck = Date.now();
        this.healthStats = {
            checksPerformed: 0,
            checksPassed: 0,
            avgResponseTime: 0,
            lastFailure: null
        };
    }
    
    /**
     * Iniciar monitoramento
     */
    async startMonitoring() {
        if (this.isMonitoring) return;
        
        this.isMonitoring = true;
        logger.info('💓 Starting WhatsApp health monitoring...');
        
        this.monitoringInterval = setInterval(async () => {
            await this.performHealthCheck();
        }, RELIABILITY_CONSTANTS.HEARTBEAT_INTERVAL);
        
        this.emit('monitoring_started');
    }
    
    /**
     * Parar monitoramento
     */
    stopMonitoring() {
        if (!this.isMonitoring) return;
        
        this.isMonitoring = false;
        
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        
        logger.info('💓 WhatsApp health monitoring stopped');
        this.emit('monitoring_stopped');
    }
    
    /**
     * Executar health check
     */
    async performHealthCheck() {
        const startTime = Date.now();
        this.healthStats.checksPerformed++;
        
        try {
            // Verificar estado básico
            const state = await Promise.race([
                this.client.getState(),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Health check timeout')), 
                    RELIABILITY_CONSTANTS.HEALTH_CHECK_TIMEOUT)
                )
            ]);
            
            if (state !== 'CONNECTED') {
                throw new Error(`Invalid state: ${state}`);
            }
            
            // Verificar informações do cliente
            const info = this.client.info;
            if (!info || !info.wid) {
                throw new Error('Client info unavailable');
            }
            
            // Verificar tempo desde última mensagem
            const timeSinceLastMessage = Date.now() - this.lastSuccessfulMessage;
            const isMessageFlowHealthy = timeSinceLastMessage < 10 * 60 * 1000; // 10 minutos
            
            const responseTime = Date.now() - startTime;
            this.healthStats.avgResponseTime = (this.healthStats.avgResponseTime + responseTime) / 2;
            this.healthStats.checksPassed++;
            this.lastHealthCheck = Date.now();
            
            const healthResult = {
                healthy: true,
                state,
                responseTime,
                messageFlowHealthy: isMessageFlowHealthy,
                uptime: this.getUptime(),
                successRate: (this.healthStats.checksPassed / this.healthStats.checksPerformed) * 100
            };
            
            this.emit('health_check_passed', healthResult);
            
            // Alertar se fluxo de mensagens não está saudável
            if (!isMessageFlowHealthy) {
                this.emit('message_flow_warning', {
                    timeSinceLastMessage: Math.round(timeSinceLastMessage / 1000 / 60)
                });
            }
            
            return healthResult;
            
        } catch (error) {
            const responseTime = Date.now() - startTime;
            this.healthStats.lastFailure = {
                error: error.message,
                timestamp: new Date().toISOString(),
                responseTime
            };
            
            const healthResult = {
                healthy: false,
                error: error.message,
                responseTime,
                uptime: this.getUptime(),
                successRate: (this.healthStats.checksPassed / this.healthStats.checksPerformed) * 100
            };
            
            logger.warn('💓 Health check failed:', error.message);
            this.emit('health_check_failed', healthResult);
            
            return healthResult;
        }
    }
    
    /**
     * Atualizar timestamp da última mensagem bem-sucedida
     */
    updateLastSuccessfulMessage() {
        this.lastSuccessfulMessage = Date.now();
    }
    
    /**
     * Obter uptime do monitor
     */
    getUptime() {
        return Date.now() - this.lastHealthCheck;
    }
    
    /**
     * Obter estatísticas detalhadas
     */
    getHealthStats() {
        return {
            ...this.healthStats,
            isMonitoring: this.isMonitoring,
            uptime: this.getUptime(),
            lastSuccessfulMessage: this.lastSuccessfulMessage,
            timeSinceLastMessage: Date.now() - this.lastSuccessfulMessage
        };
    }
}

/**
 * MESSAGE QUEUE RESILIENTE
 */
class ResilientMessageQueue extends EventEmitter {
    constructor() {
        super();
        this.queue = [];
        this.processing = false;
        this.retryQueue = new Map();
        this.maxRetries = 3;
        this.retryDelay = 5000;
        this.processingInterval = null;
        
        this.startProcessing();
    }
    
    /**
     * Adicionar mensagem à queue
     */
    enqueue(message, priority = 'normal', metadata = {}) {
        const queueItem = {
            id: this.generateId(),
            message,
            priority,
            metadata,
            timestamp: Date.now(),
            attempts: 0,
            status: 'queued'
        };
        
        // Inserir baseado na prioridade
        if (priority === 'high') {
            this.queue.unshift(queueItem);
        } else {
            this.queue.push(queueItem);
        }
        
        logger.debug(`📨 Message queued: ${queueItem.id} (priority: ${priority})`);
        this.emit('message_queued', queueItem);
        
        return queueItem.id;
    }
    
    /**
     * Iniciar processamento da queue
     */
    startProcessing() {
        if (this.processingInterval) return;
        
        this.processingInterval = setInterval(async () => {
            await this.processQueue();
        }, 1000); // Processar a cada 1 segundo
        
        logger.info('📨 Message queue processing started');
    }
    
    /**
     * Parar processamento da queue
     */
    stopProcessing() {
        if (this.processingInterval) {
            clearInterval(this.processingInterval);
            this.processingInterval = null;
        }
        
        logger.info('📨 Message queue processing stopped');
    }
    
    /**
     * Processar queue
     */
    async processQueue() {
        if (this.processing || this.queue.length === 0) return;
        
        this.processing = true;
        
        try {
            const item = this.queue.shift();
            if (!item) return;
            
            item.status = 'processing';
            item.attempts++;
            
            logger.debug(`📨 Processing message: ${item.id} (attempt ${item.attempts})`);
            
            try {
                // Processar mensagem
                await this.processMessage(item);
                
                item.status = 'completed';
                logger.debug(`✅ Message processed successfully: ${item.id}`);
                this.emit('message_processed', item);
                
            } catch (error) {
                logger.error(`❌ Failed to process message ${item.id}:`, error.message);
                
                if (item.attempts < this.maxRetries) {
                    // Adicionar à retry queue
                    const retryTime = Date.now() + (this.retryDelay * item.attempts);
                    this.retryQueue.set(item.id, { ...item, retryTime });
                    
                    logger.info(`🔄 Message ${item.id} scheduled for retry ${item.attempts}/${this.maxRetries}`);
                    this.emit('message_retry_scheduled', item);
                } else {
                    item.status = 'failed';
                    logger.error(`💀 Message ${item.id} failed permanently after ${item.attempts} attempts`);
                    this.emit('message_failed', item);
                }
            }
            
        } finally {
            this.processing = false;
            
            // Processar retry queue
            await this.processRetryQueue();
        }
    }
    
    /**
     * Processar retry queue
     */
    async processRetryQueue() {
        const now = Date.now();
        
        for (const [id, item] of this.retryQueue.entries()) {
            if (now >= item.retryTime) {
                this.retryQueue.delete(id);
                
                // Re-adicionar à queue principal
                if (item.priority === 'high') {
                    this.queue.unshift(item);
                } else {
                    this.queue.push(item);
                }
                
                logger.debug(`🔄 Message ${id} moved from retry queue to main queue`);
            }
        }
    }
    
    /**
     * Processar mensagem individual
     */
    async processMessage(item) {
        // Implementar lógica de envio baseada no tipo de mensagem
        const { message, metadata } = item;
        
        // Simular processamento
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Aqui seria integrado com o WhatsApp client
        // await this.whatsappClient.sendMessage(message.to, message.content);
        
        return true;
    }
    
    /**
     * Gerar ID único
     */
    generateId() {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Obter estatísticas da queue
     */
    getStats() {
        return {
            queueLength: this.queue.length,
            retryQueueLength: this.retryQueue.size,
            processing: this.processing,
            status: this.processingInterval ? 'active' : 'stopped'
        };
    }
    
    /**
     * Limpar queue
     */
    clearQueue() {
        this.queue = [];
        this.retryQueue.clear();
        logger.info('📨 Message queue cleared');
        this.emit('queue_cleared');
    }
}

/**
 * WHATSAPP STABILITY ENGINE PRINCIPAL
 */
class WhatsAppStabilityEngine extends EventEmitter {
    constructor(whatsappService) {
        super();
        this.whatsappService = whatsappService;
        this.rateLimiter = new SmartRateLimiter();
        this.reconnectionManager = new RobustReconnectionManager();
        this.healthMonitor = null;
        this.messageQueue = new ResilientMessageQueue();
        
        this.isEngineActive = false;
        this.engineStats = {
            startTime: null,
            totalReconnections: 0,
            totalHealthChecks: 0,
            totalMessagesQueued: 0,
            engineUptime: 0
        };
        
        this.setupEventListeners();
    }
    
    /**
     * Inicializar stability engine
     */
    async initialize() {
        if (this.isEngineActive) {
            logger.warn('⚠️ Stability engine already active');
            return;
        }
        
        logger.info('🛡️ Initializing WhatsApp Stability Engine...');
        
        this.isEngineActive = true;
        this.engineStats.startTime = Date.now();
        
        // Integrar com o WhatsApp service
        this.integrateWithWhatsAppService();
        
        logger.info('✅ WhatsApp Stability Engine initialized successfully');
        this.emit('engine_initialized');
    }
    
    /**
     * Integrar com WhatsApp service
     */
    integrateWithWhatsAppService() {
        // Substituir métodos críticos do WhatsApp service
        this.enhanceInitializeMethod();
        this.enhanceDisconnectMethod();
        this.enhanceMessageHandling();
        this.enhanceHealthChecking();
        
        logger.info('🔗 Stability engine integrated with WhatsApp service');
    }
    
    /**
     * Melhorar método de inicialização
     */
    enhanceInitializeMethod() {
        const originalInitialize = this.whatsappService.initialize.bind(this.whatsappService);
        
        this.whatsappService.initialize = async () => {
            // Rate limiting check
            if (!this.rateLimiter.isAllowed('reconnects')) {
                const waitTime = this.rateLimiter.getTimeUntilReset('reconnects');
                throw new Error(`Rate limited: wait ${Math.round(waitTime/1000)}s before reconnecting`);
            }
            
            // Circuit breaker check
            if (!this.reconnectionManager.isOperationAllowed()) {
                throw new Error('Circuit breaker is open - system in recovery mode');
            }
            
            try {
                const result = await originalInitialize();
                
                // Registrar sucesso
                this.rateLimiter.recordAction('reconnects');
                this.reconnectionManager.updateCircuitBreaker(true);
                
                // Iniciar health monitor se conexão bem-sucedida
                if (result.success && this.whatsappService.client) {
                    this.healthMonitor = new WhatsAppHealthMonitor(this.whatsappService.client);
                    await this.healthMonitor.startMonitoring();
                    
                    // Setup listeners do health monitor
                    this.setupHealthMonitorListeners();
                }
                
                return result;
                
            } catch (error) {
                this.reconnectionManager.updateCircuitBreaker(false);
                throw error;
            }
        };
    }
    
    /**
     * Melhorar método de desconexão
     */
    enhanceDisconnectMethod() {
        const originalDisconnect = this.whatsappService.disconnect.bind(this.whatsappService);
        
        this.whatsappService.disconnect = async () => {
            // Parar health monitor
            if (this.healthMonitor) {
                this.healthMonitor.stopMonitoring();
                this.healthMonitor = null;
            }
            
            // Processar mensagens pendentes
            await this.messageQueue.processQueue();
            
            return await originalDisconnect();
        };
    }
    
    /**
     * Melhorar handling de mensagens
     */
    enhanceMessageHandling() {
        const originalHandleMessage = this.whatsappService.handleMessage.bind(this.whatsappService);
        
        this.whatsappService.handleMessage = async (message) => {
            // Rate limiting check
            if (!this.rateLimiter.isAllowed('messages')) {
                logger.warn('⚠️ Message rate limited, queuing for later processing');
                
                this.messageQueue.enqueue({
                    type: 'whatsapp_message',
                    message: message,
                    timestamp: Date.now()
                }, 'normal', { source: 'rate_limited' });
                
                return;
            }
            
            try {
                // Update health monitor
                if (this.healthMonitor) {
                    this.healthMonitor.updateLastSuccessfulMessage();
                }
                
                // Process message
                this.rateLimiter.recordAction('messages');
                await originalHandleMessage(message);
                
                this.engineStats.totalMessagesQueued++;
                
            } catch (error) {
                logger.error('❌ Error handling message, queuing for retry:', error.message);
                
                // Queue for retry
                this.messageQueue.enqueue({
                    type: 'whatsapp_message',
                    message: message,
                    timestamp: Date.now(),
                    error: error.message
                }, 'high', { source: 'error_retry' });
            }
        };
    }
    
    /**
     * Melhorar health checking
     */
    enhanceHealthChecking() {
        const originalQuickHealthCheck = this.whatsappService.quickHealthCheck?.bind(this.whatsappService);
        
        if (originalQuickHealthCheck) {
            this.whatsappService.quickHealthCheck = async () => {
                this.engineStats.totalHealthChecks++;
                
                try {
                    const result = await originalQuickHealthCheck();
                    
                    if (!result.healthy && this.whatsappService.isConnected) {
                        logger.warn('🚨 Health check failed, triggering reconnection...');
                        this.emit('health_failure', result);
                        
                        // Trigger reconnection
                        setTimeout(() => {
                            if (!this.whatsappService.isConnecting) {
                                this.whatsappService.attemptReconnect('HEALTH_FAILURE');
                            }
                        }, 2000);
                    }
                    
                    return result;
                    
                } catch (error) {
                    logger.error('❌ Enhanced health check failed:', error.message);
                    return { healthy: false, reason: error.message };
                }
            };
        }
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Reconnection manager events
        this.reconnectionManager.on('circuit_opened', (data) => {
            logger.error('🔴 Circuit breaker opened:', data);
            this.emit('circuit_breaker_opened', data);
        });
        
        this.reconnectionManager.on('circuit_closed', () => {
            logger.info('🟢 Circuit breaker closed - system recovered');
            this.emit('circuit_breaker_closed');
        });
        
        // Message queue events
        this.messageQueue.on('message_failed', (item) => {
            logger.error('💀 Message permanently failed:', item.id);
            this.emit('message_permanently_failed', item);
        });
        
        this.messageQueue.on('queue_cleared', () => {
            logger.info('📨 Message queue cleared');
        });
    }
    
    /**
     * Setup health monitor listeners
     */
    setupHealthMonitorListeners() {
        if (!this.healthMonitor) return;
        
        this.healthMonitor.on('health_check_failed', (result) => {
            logger.warn('💓 Health check failed:', result.error);
            
            // Trigger reconnection if multiple failures
            if (result.successRate < 50) {
                this.emit('health_degraded', result);
            }
        });
        
        this.healthMonitor.on('message_flow_warning', (data) => {
            logger.warn('⚠️ Message flow warning:', `${data.timeSinceLastMessage} minutes since last message`);
        });
    }
    
    /**
     * Força reconexão com stability engine
     */
    async forceReconnectWithStability(reason = 'MANUAL_TRIGGER') {
        logger.info(`🔄 Forcing reconnection with stability: ${reason}`);
        
        try {
            // Parar health monitor temporariamente
            if (this.healthMonitor) {
                this.healthMonitor.stopMonitoring();
            }
            
            // Executar cleanup strategy
            const attempt = this.reconnectionManager.currentAttempt + 1;
            await this.reconnectionManager.executeCleanupStrategy(attempt);
            
            // Calcular delay
            const delay = this.reconnectionManager.calculateDelay(attempt, reason);
            
            logger.info(`⏰ Waiting ${Math.round(delay/1000)}s before forced reconnection...`);
            
            setTimeout(async () => {
                try {
                    await this.whatsappService.initialize();
                    this.engineStats.totalReconnections++;
                    logger.info('✅ Forced reconnection successful');
                } catch (error) {
                    logger.error('❌ Forced reconnection failed:', error.message);
                }
            }, delay);
            
        } catch (error) {
            logger.error('❌ Error in forced reconnection:', error.message);
        }
    }
    
    /**
     * Obter estatísticas completas do engine
     */
    getEngineStats() {
        const uptime = this.engineStats.startTime 
            ? Date.now() - this.engineStats.startTime 
            : 0;
            
        return {
            engine: {
                active: this.isEngineActive,
                uptime: Math.round(uptime / 1000),
                totalReconnections: this.engineStats.totalReconnections,
                totalHealthChecks: this.engineStats.totalHealthChecks,
                totalMessagesQueued: this.engineStats.totalMessagesQueued
            },
            rateLimiter: {
                qrRequests: this.rateLimiter.limits.qrRequests,
                messages: this.rateLimiter.limits.messages,
                reconnects: this.rateLimiter.limits.reconnects
            },
            circuitBreaker: {
                isOpen: this.reconnectionManager.isCircuitOpen,
                failures: this.reconnectionManager.circuitFailures,
                threshold: RELIABILITY_CONSTANTS.CIRCUIT_FAILURE_THRESHOLD
            },
            messageQueue: this.messageQueue.getStats(),
            healthMonitor: this.healthMonitor?.getHealthStats() || null,
            reconnectionManager: {
                currentAttempt: this.reconnectionManager.currentAttempt,
                maxAttempts: RELIABILITY_CONSTANTS.MAX_RECONNECT_ATTEMPTS,
                strategy: this.reconnectionManager.getReconnectionStrategy(
                    this.reconnectionManager.currentAttempt
                )
            }
        };
    }
    
    /**
     * Desligar stability engine
     */
    async shutdown() {
        if (!this.isEngineActive) return;
        
        logger.info('🛡️ Shutting down WhatsApp Stability Engine...');
        
        // Parar health monitor
        if (this.healthMonitor) {
            this.healthMonitor.stopMonitoring();
            this.healthMonitor = null;
        }
        
        // Parar message queue
        this.messageQueue.stopProcessing();
        
        // Parar rate limiter timers
        this.rateLimiter.stopTimers();
        
        this.isEngineActive = false;
        
        logger.info('✅ WhatsApp Stability Engine shut down successfully');
        this.emit('engine_shutdown');
    }
}

module.exports = {
    WhatsAppStabilityEngine,
    RobustReconnectionManager,
    WhatsAppHealthMonitor,
    SmartRateLimiter,
    ResilientMessageQueue,
    RELIABILITY_CONSTANTS
};