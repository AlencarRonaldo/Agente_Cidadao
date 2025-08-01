/**
 * ENHANCED LOGGER - Sistema de Logs Avançado
 * 
 * Sistema de logging estruturado com:
 * - Logs estruturados com metadados contextuais
 * - Múltiplos níveis de severidade
 * - Rotação automática de arquivos
 * - Filtragem e agregação inteligente
 * - Correlação de events por sessão/usuário
 * - Performance tracking integrado
 * - Exportação para sistemas externos
 * - Dashboard de monitoramento de logs
 * 
 * @author Observability Engineer
 * @priority HIGH - System Observability
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { format } = winston;

/**
 * INTELLIGENT LOGGING SYSTEM - Sistema Inteligente de Logging
 */
class IntelligentLoggingSystem {
    constructor() {
        this.sessionId = this.generateSessionId();
        this.contextStack = [];
        this.performanceMarkers = new Map();
        this.logBuffer = [];
        this.config = this.loadConfiguration();
        
        this.initializeLogger();
        this.setupLogProcessing();
    }

    /**
     * Carregar configuração do sistema de logs
     */
    loadConfiguration() {
        return {
            // Configurações básicas
            level: process.env.LOG_LEVEL || 'info',
            enableConsole: process.env.LOG_CONSOLE !== 'false',
            enableFile: process.env.LOG_FILE !== 'false',
            enableBuffer: process.env.LOG_BUFFER === 'true',
            
            // Configurações de arquivo
            logDirectory: process.env.LOG_DIR || path.join(process.cwd(), 'logs'),
            maxFileSize: parseInt(process.env.LOG_MAX_SIZE || '10485760'), // 10MB
            maxFiles: parseInt(process.env.LOG_MAX_FILES || '5'),
            
            // Configurações de performance
            enablePerformanceTracking: process.env.LOG_PERFORMANCE !== 'false',
            enableContextCorrelation: process.env.LOG_CORRELATION !== 'false',
            enableAggregation: process.env.LOG_AGGREGATION === 'true',
            
            // Configurações de filtragem
            sensitiveFields: ['password', 'token', 'secret', 'key', 'authorization'],
            excludePatterns: ['/health', '/ping', '/favicon.ico'],
            
            // Configurações de exportação
            enableElasticsearch: process.env.LOG_ELASTICSEARCH === 'true',
            elasticsearchUrl: process.env.ELASTICSEARCH_URL,
            enableWebhook: process.env.LOG_WEBHOOK === 'true',
            webhookUrl: process.env.LOG_WEBHOOK_URL,
            
            // Buffer settings
            bufferSize: parseInt(process.env.LOG_BUFFER_SIZE || '100'),
            flushInterval: parseInt(process.env.LOG_FLUSH_INTERVAL || '30000'), // 30 segundos
        };
    }

    /**
     * Inicializar sistema de logging
     */
    initializeLogger() {
        // Criar diretório de logs se não existir
        if (!fs.existsSync(this.config.logDirectory)) {
            fs.mkdirSync(this.config.logDirectory, { recursive: true });
        }

        // Formatos personalizados
        const consoleFormat = format.combine(
            format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            format.errors({ stack: true }),
            format.printf(({ timestamp, level, message, ...meta }) => {
                const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
                return `${timestamp} [${level.toUpperCase()}] ${message} ${metaStr}`;
            })
        );

        const fileFormat = format.combine(
            format.timestamp(),
            format.errors({ stack: true }),
            format.json(),
            format.printf((info) => {
                return JSON.stringify({
                    ...info,
                    sessionId: this.sessionId,
                    pid: process.pid,
                    hostname: require('os').hostname(),
                    context: this.getCurrentContext()
                });
            })
        );

        // Configurar transportes
        const transports = [];

        // Console transport
        if (this.config.enableConsole) {
            transports.push(new winston.transports.Console({
                format: consoleFormat,
                level: this.config.level
            }));
        }

        // File transports
        if (this.config.enableFile) {
            // Log geral
            transports.push(new winston.transports.File({
                filename: path.join(this.config.logDirectory, 'app.log'),
                format: fileFormat,
                level: this.config.level,
                maxsize: this.config.maxFileSize,
                maxFiles: this.config.maxFiles,
                tailable: true
            }));

            // Log de erros
            transports.push(new winston.transports.File({
                filename: path.join(this.config.logDirectory, 'error.log'),
                format: fileFormat,
                level: 'error',
                maxsize: this.config.maxFileSize,
                maxFiles: this.config.maxFiles,
                tailable: true
            }));

            // Log de performance
            if (this.config.enablePerformanceTracking) {
                transports.push(new winston.transports.File({
                    filename: path.join(this.config.logDirectory, 'performance.log'),
                    format: fileFormat,
                    level: 'debug',
                    maxsize: this.config.maxFileSize,
                    maxFiles: this.config.maxFiles,
                    tailable: true
                }));
            }

            // Log de auditoria
            transports.push(new winston.transports.File({
                filename: path.join(this.config.logDirectory, 'audit.log'),
                format: fileFormat,
                level: 'info',
                maxsize: this.config.maxFileSize,
                maxFiles: this.config.maxFiles,
                tailable: true
            }));
        }

        // Criar logger principal
        this.logger = winston.createLogger({
            level: this.config.level,
            transports,
            exitOnError: false,
            handleExceptions: true,
            handleRejections: true
        });

        // Logger especializado para auditoria
        this.auditLogger = winston.createLogger({
            level: 'info',
            format: fileFormat,
            transports: [
                new winston.transports.File({
                    filename: path.join(this.config.logDirectory, 'audit.log'),
                    maxsize: this.config.maxFileSize,
                    maxFiles: this.config.maxFiles,
                    tailable: true
                })
            ]
        });

        this.logger.info('Enhanced Logging System initialized', {
            sessionId: this.sessionId,
            config: this.sanitizeConfig(this.config)
        });
    }

    /**
     * Configurar processamento de logs
     */
    setupLogProcessing() {
        // Buffer flush interval
        if (this.config.enableBuffer) {
            setInterval(() => {
                this.flushBuffer();
            }, this.config.flushInterval);
        }

        // Cleanup de logs antigos
        setInterval(() => {
            this.cleanupOldLogs();
        }, 24 * 60 * 60 * 1000); // Daily

        // Process exit handlers
        process.on('exit', () => this.flushBuffer());
        process.on('SIGTERM', () => this.flushBuffer());
        process.on('SIGINT', () => this.flushBuffer());
    }

    /**
     * Gerar ID de sessão único
     */
    generateSessionId() {
        return `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    }

    /**
     * Sanitizar configuração para logs
     */
    sanitizeConfig(config) {
        const sanitized = { ...config };
        this.config.sensitiveFields.forEach(field => {
            if (sanitized[field]) {
                sanitized[field] = '***REDACTED***';
            }
        });
        return sanitized;
    }

    /**
     * Obter contexto atual
     */
    getCurrentContext() {
        return this.contextStack.length > 0 ? 
            this.contextStack[this.contextStack.length - 1] : null;
    }

    /**
     * Adicionar contexto
     */
    addContext(context) {
        this.contextStack.push({
            ...context,
            timestamp: Date.now(),
            id: crypto.randomBytes(8).toString('hex')
        });
        return this.contextStack.length - 1;
    }

    /**
     * Remover contexto
     */
    removeContext(index = -1) {
        if (index === -1) {
            return this.contextStack.pop();
        } else {
            return this.contextStack.splice(index, 1)[0];
        }
    }

    /**
     * Limpar todos os contextos
     */
    clearContext() {
        this.contextStack = [];
    }

    /**
     * Log com contexto automático
     */
    withContext(context, fn) {
        const contextIndex = this.addContext(context);
        try {
            return fn();
        } finally {
            this.removeContext(contextIndex);
        }
    }

    /**
     * Log de performance - iniciar timing
     */
    startTiming(label, metadata = {}) {
        const timingId = `${label}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        
        this.performanceMarkers.set(timingId, {
            label,
            startTime: process.hrtime.bigint(),
            timestamp: Date.now(),
            metadata
        });

        if (this.config.enablePerformanceTracking) {
            this.debug('Performance timing started', {
                timingId,
                label,
                metadata,
                category: 'performance'
            });
        }

        return timingId;
    }

    /**
     * Log de performance - finalizar timing
     */
    endTiming(timingId, additionalMetadata = {}) {
        const marker = this.performanceMarkers.get(timingId);
        
        if (!marker) {
            this.warn('Performance timing not found', { timingId });
            return null;
        }

        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - marker.startTime) / 1000000; // Convert to milliseconds
        
        const performanceData = {
            timingId,
            label: marker.label,
            duration,
            startTimestamp: marker.timestamp,
            endTimestamp: Date.now(),
            metadata: { ...marker.metadata, ...additionalMetadata },
            category: 'performance'
        };

        this.performanceMarkers.delete(timingId);

        if (this.config.enablePerformanceTracking) {
            this.info('Performance timing completed', performanceData);
        }

        return performanceData;
    }

    /**
     * Log estruturado base
     */
    log(level, message, metadata = {}) {
        const logEntry = {
            message,
            level,
            timestamp: new Date().toISOString(),
            ...this.sanitizeMetadata(metadata)
        };

        // Adicionar ao buffer se habilitado
        if (this.config.enableBuffer) {
            this.logBuffer.push(logEntry);
            
            if (this.logBuffer.length >= this.config.bufferSize) {
                this.flushBuffer();
            }
        }

        // Log imediato
        this.logger.log(level, message, metadata);

        // Processar para sistemas externos
        this.processExternalLogging(logEntry);
    }

    /**
     * Sanitizar metadados sensíveis
     */
    sanitizeMetadata(metadata) {
        if (typeof metadata !== 'object' || metadata === null) {
            return metadata;
        }

        const sanitized = { ...metadata };
        
        const sanitizeValue = (obj, key, value) => {
            if (this.config.sensitiveFields.some(field => 
                key.toLowerCase().includes(field.toLowerCase())
            )) {
                return '***REDACTED***';
            }
            
            if (typeof value === 'object' && value !== null) {
                return this.sanitizeMetadata(value);
            }
            
            return value;
        };

        Object.keys(sanitized).forEach(key => {
            sanitized[key] = sanitizeValue(sanitized, key, sanitized[key]);
        });

        return sanitized;
    }

    /**
     * Processar logging para sistemas externos
     */
    async processExternalLogging(logEntry) {
        // Elasticsearch
        if (this.config.enableElasticsearch && this.config.elasticsearchUrl) {
            try {
                await this.sendToElasticsearch(logEntry);
            } catch (error) {
                // Não logar erros de Elasticsearch para evitar loops
                console.error('Failed to send log to Elasticsearch:', error.message);
            }
        }

        // Webhook
        if (this.config.enableWebhook && this.config.webhookUrl) {
            try {
                await this.sendToWebhook(logEntry);
            } catch (error) {
                console.error('Failed to send log to webhook:', error.message);
            }
        }
    }

    /**
     * Enviar para Elasticsearch
     */
    async sendToElasticsearch(logEntry) {
        const axios = require('axios');
        
        const indexName = `bot-denuncia-logs-${new Date().toISOString().slice(0, 7)}`; // Monthly index
        const url = `${this.config.elasticsearchUrl}/${indexName}/_doc`;

        await axios.post(url, {
            ...logEntry,
            '@timestamp': new Date().toISOString(),
            application: 'bot-denuncia',
            environment: process.env.NODE_ENV || 'development'
        }, {
            timeout: 5000,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }

    /**
     * Enviar para webhook
     */
    async sendToWebhook(logEntry) {
        const axios = require('axios');
        
        await axios.post(this.config.webhookUrl, {
            event: 'log_entry',
            data: logEntry,
            application: 'bot-denuncia',
            timestamp: new Date().toISOString()
        }, {
            timeout: 5000,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }

    /**
     * Flush buffer de logs
     */
    flushBuffer() {
        if (this.logBuffer.length === 0) return;

        const bufferCopy = [...this.logBuffer];
        this.logBuffer = [];

        // Processar buffer em lote
        this.debug('Flushing log buffer', {
            count: bufferCopy.length,
            category: 'system'
        });

        // Aqui você poderia implementar processamento em lote
        // Por exemplo, envio em lote para Elasticsearch
    }

    /**
     * Limpar logs antigos
     */
    cleanupOldLogs() {
        const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 dias
        const now = Date.now();

        try {
            const files = fs.readdirSync(this.config.logDirectory);
            
            files.forEach(file => {
                const filePath = path.join(this.config.logDirectory, file);
                const stats = fs.statSync(filePath);
                
                if (now - stats.mtime.getTime() > maxAge) {
                    fs.unlinkSync(filePath);
                    this.info('Old log file deleted', { file, age: now - stats.mtime.getTime() });
                }
            });
        } catch (error) {
            this.error('Failed to cleanup old logs', { error: error.message });
        }
    }

    // Métodos de logging específicos por nível

    /**
     * Log de debug
     */
    debug(message, metadata = {}) {
        this.log('debug', message, { ...metadata, category: metadata.category || 'debug' });
    }

    /**
     * Log de informação
     */
    info(message, metadata = {}) {
        this.log('info', message, { ...metadata, category: metadata.category || 'info' });
    }

    /**
     * Log de aviso
     */
    warn(message, metadata = {}) {
        this.log('warn', message, { ...metadata, category: metadata.category || 'warning' });
    }

    /**
     * Log de erro
     */
    error(message, metadata = {}) {
        this.log('error', message, { ...metadata, category: metadata.category || 'error' });
    }

    /**
     * Log crítico
     */
    critical(message, metadata = {}) {
        this.log('error', `CRITICAL: ${message}`, { 
            ...metadata, 
            category: 'critical',
            severity: 'critical'
        });
    }

    // Métodos especializados

    /**
     * Log de auditoria
     */
    audit(action, userId, metadata = {}) {
        const auditEntry = {
            action,
            userId,
            timestamp: new Date().toISOString(),
            sessionId: this.sessionId,
            ip: metadata.ip,
            userAgent: metadata.userAgent,
            ...metadata,
            category: 'audit'
        };

        this.auditLogger.info('Audit log entry', auditEntry);
        this.info(`AUDIT: ${action}`, auditEntry);
    }

    /**
     * Log de segurança
     */
    security(event, level = 'warn', metadata = {}) {
        this.log(level, `SECURITY: ${event}`, {
            ...metadata,
            category: 'security',
            securityEvent: true
        });
    }

    /**
     * Log de transação
     */
    transaction(transactionId, operation, status, metadata = {}) {
        this.info(`TRANSACTION: ${operation} - ${status}`, {
            transactionId,
            operation,
            status,
            ...metadata,
            category: 'transaction'
        });
    }

    /**
     * Log de sistema
     */
    system(component, event, metadata = {}) {
        this.info(`SYSTEM: ${component} - ${event}`, {
            component,
            event,
            ...metadata,
            category: 'system'
        });
    }

    /**
     * Log de integração
     */
    integration(service, operation, status, metadata = {}) {
        this.info(`INTEGRATION: ${service} - ${operation} - ${status}`, {
            service,
            operation,
            status,
            ...metadata,
            category: 'integration'
        });
    }

    /**
     * Log de API
     */
    api(method, endpoint, statusCode, responseTime, metadata = {}) {
        const level = statusCode >= 400 ? 'warn' : 'info';
        
        this.log(level, `API: ${method} ${endpoint} - ${statusCode}`, {
            method,
            endpoint,
            statusCode,
            responseTime,
            ...metadata,
            category: 'api'
        });
    }

    /**
     * Log de database
     */
    database(operation, table, duration, metadata = {}) {
        this.debug(`DATABASE: ${operation} on ${table}`, {
            operation,
            table,
            duration,
            ...metadata,
            category: 'database'
        });
    }

    /**
     * Obter estatísticas do logger
     */
    getLoggerStats() {
        return {
            sessionId: this.sessionId,
            bufferSize: this.logBuffer.length,
            activeTimings: this.performanceMarkers.size,
            contextStack: this.contextStack.length,
            configuration: this.sanitizeConfig(this.config),
            uptime: Date.now() - parseInt(this.sessionId.split('-')[0])
        };
    }

    /**
     * Buscar logs por critério
     */
    async searchLogs(criteria = {}) {
        // Esta seria uma implementação mais complexa em produção
        // Aqui é um placeholder para busca em arquivos de log
        
        const {
            level,
            category,
            startDate,
            endDate,
            limit = 100,
            query
        } = criteria;

        // Implementação simplificada - em produção usaria Elasticsearch ou similar
        return {
            total: 0,
            logs: [],
            query: criteria
        };
    }

    /**
     * Exportar logs
     */
    async exportLogs(format = 'json', criteria = {}) {
        const logs = await this.searchLogs(criteria);
        
        switch (format.toLowerCase()) {
            case 'csv':
                return this.convertToCSV(logs.logs);
            case 'json':
                return JSON.stringify(logs, null, 2);
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    }

    /**
     * Converter logs para CSV
     */
    convertToCSV(logs) {
        if (logs.length === 0) return '';
        
        const headers = Object.keys(logs[0]);
        const csvRows = [headers.join(',')];
        
        logs.forEach(log => {
            const values = headers.map(header => {
                const value = log[header];
                return typeof value === 'object' ? JSON.stringify(value) : String(value);
            });
            csvRows.push(values.join(','));
        });
        
        return csvRows.join('\n');
    }

    /**
     * Configurar nível de log dinamicamente
     */
    setLogLevel(level) {
        this.config.level = level;
        this.logger.level = level;
        this.info('Log level changed', { newLevel: level });
    }

    /**
     * Fechar sistema de logging
     */
    close() {
        this.flushBuffer();
        this.logger.close();
        this.auditLogger.close();
        this.info('Enhanced Logging System closed');
    }
}

module.exports = new IntelligentLoggingSystem();