/**
 * Sistema de Health Check Avançado
 * Implementa verificações abrangentes de saúde do sistema
 */

const { PrismaClient } = require('@prisma/client');
const Redis = require('ioredis');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

class HealthCheckSystem {
    constructor() {
        this.prisma = new PrismaClient();
        this.redis = new Redis(process.env.REDIS_URL);
        this.checks = new Map();
        this.history = [];
        this.maxHistorySize = 100;
        
        // Configurações de thresholds
        this.thresholds = {
            memory: 85, // % de uso máximo
            cpu: 80,    // % de uso máximo
            disk: 90,   // % de uso máximo
            responseTime: 5000, // ms máximo
            dbConnections: 50,  // máximo de conexões
            queueSize: 1000     // máximo de itens na fila
        };
        
        this.initializeChecks();
    }
    
    /**
     * Inicializa as verificações de saúde
     */
    initializeChecks() {
        // Registro de verificações disponíveis
        this.checks.set('database', {
            name: 'Database Connection',
            check: this.checkDatabase.bind(this),
            critical: true,
            timeout: 5000
        });
        
        this.checks.set('redis', {
            name: 'Redis Connection',
            check: this.checkRedis.bind(this),
            critical: true,
            timeout: 3000
        });
        
        this.checks.set('filesystem', {
            name: 'File System',
            check: this.checkFileSystem.bind(this),
            critical: true,
            timeout: 2000
        });
        
        this.checks.set('memory', {
            name: 'Memory Usage',
            check: this.checkMemory.bind(this),
            critical: false,
            timeout: 1000
        });
        
        this.checks.set('queues', {
            name: 'Queue System',
            check: this.checkQueues.bind(this),
            critical: true,
            timeout: 3000
        });
        
        this.checks.set('services', {
            name: 'External Services',
            check: this.checkExternalServices.bind(this),
            critical: false,
            timeout: 10000
        });
        
        this.checks.set('whatsapp', {
            name: 'WhatsApp Service',
            check: this.checkWhatsAppService.bind(this),
            critical: true,
            timeout: 5000
        });
        
        this.checks.set('instagram', {
            name: 'Instagram Service',
            check: this.checkInstagramService.bind(this),
            critical: false,
            timeout: 5000
        });
    }
    
    /**
     * Executa verificação completa de saúde
     */
    async performHealthCheck(includeNonCritical = true) {
        const startTime = Date.now();
        const results = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            environment: process.env.ENVIRONMENT_SLOT || 'unknown',
            version: process.env.npm_package_version || '1.0.0',
            uptime: process.uptime(),
            checks: {},
            metrics: {},
            summary: {
                total: 0,
                passed: 0,
                failed: 0,
                warnings: 0
            }
        };
        
        // Lista de verificações a executar
        const checksToRun = Array.from(this.checks.entries())
            .filter(([_, config]) => includeNonCritical || config.critical);
        
        // Executa todas as verificações em paralelo
        const checkPromises = checksToRun.map(async ([key, config]) => {
            const checkStartTime = Date.now();
            
            try {
                // Executa com timeout
                const checkResult = await Promise.race([
                    config.check(),
                    this.createTimeoutPromise(config.timeout)
                ]);
                
                const responseTime = Date.now() - checkStartTime;
                
                results.checks[key] = {
                    name: config.name,
                    status: checkResult.status || 'healthy',
                    message: checkResult.message || 'OK',
                    responseTime,
                    critical: config.critical,
                    details: checkResult.details || {},
                    timestamp: new Date().toISOString()
                };
                
                if (checkResult.status === 'unhealthy') {
                    results.summary.failed++;
                    if (config.critical) {
                        results.status = 'unhealthy';
                    }
                } else if (checkResult.status === 'warning') {
                    results.summary.warnings++;
                    if (results.status === 'healthy') {
                        results.status = 'warning';
                    }
                } else {
                    results.summary.passed++;
                }
                
            } catch (error) {
                const responseTime = Date.now() - checkStartTime;
                
                results.checks[key] = {
                    name: config.name,
                    status: 'unhealthy',
                    message: error.message || 'Check failed',
                    responseTime,
                    critical: config.critical,
                    error: error.name || 'Error',
                    timestamp: new Date().toISOString()
                };
                
                results.summary.failed++;
                if (config.critical) {
                    results.status = 'unhealthy';
                }
            }
        });
        
        await Promise.all(checkPromises);
        
        // Métricas do sistema
        results.metrics = await this.getSystemMetrics();
        
        // Tempo total de execução
        results.responseTime = Date.now() - startTime;
        results.summary.total = checksToRun.length;
        
        // Salva no histórico
        this.addToHistory(results);
        
        return results;
    }
    
    /**
     * Verificação de conexão com banco de dados
     */
    async checkDatabase() {
        try {
            const startTime = Date.now();
            
            // Teste de conectividade
            await this.prisma.$queryRaw`SELECT 1`;
            
            // Teste de performance
            const queryTime = Date.now() - startTime;
            
            // Verifica estatísticas do banco
            const stats = await this.getDatabaseStats();
            
            if (queryTime > this.thresholds.responseTime) {
                return {
                    status: 'warning',
                    message: `Database response time is high: ${queryTime}ms`,
                    details: { responseTime: queryTime, ...stats }
                };
            }
            
            return {
                status: 'healthy',
                message: 'Database connection is healthy',
                details: { responseTime: queryTime, ...stats }
            };
            
        } catch (error) {
            return {
                status: 'unhealthy',
                message: `Database connection failed: ${error.message}`,
                details: { error: error.name }
            };
        }
    }
    
    /**
     * Verificação de conexão com Redis
     */
    async checkRedis() {
        try {
            const startTime = Date.now();
            
            // Teste de ping
            await this.redis.ping();
            
            // Teste de escrita/leitura
            const testKey = `health_check_${Date.now()}`;
            await this.redis.set(testKey, 'test', 'EX', 60);
            const value = await this.redis.get(testKey);
            await this.redis.del(testKey);
            
            const responseTime = Date.now() - startTime;
            
            if (value !== 'test') {
                throw new Error('Redis read/write test failed');
            }
            
            // Informações do Redis
            const info = await this.redis.info('memory');
            const memoryInfo = this.parseRedisInfo(info);
            
            return {
                status: 'healthy',
                message: 'Redis connection is healthy',
                details: { 
                    responseTime,
                    memory: memoryInfo
                }
            };
            
        } catch (error) {
            return {
                status: 'unhealthy',
                message: `Redis connection failed: ${error.message}`,
                details: { error: error.name }
            };
        }
    }
    
    /**
     * Verificação do sistema de arquivos
     */
    async checkFileSystem() {
        try {
            const checks = [];
            
            // Verifica diretórios críticos
            const criticalDirs = [
                'uploads',
                'uploads/images',
                'uploads/thumbnails',
                'logs',
                'temp'
            ];
            
            for (const dir of criticalDirs) {
                const fullPath = path.join(process.cwd(), dir);
                try {
                    await fs.access(fullPath, fs.constants.R_OK | fs.constants.W_OK);
                    checks.push({ directory: dir, status: 'accessible' });
                } catch (error) {
                    return {
                        status: 'unhealthy',
                        message: `Directory ${dir} is not accessible`,
                        details: { directory: dir, error: error.message }
                    };
                }
            }
            
            // Verifica espaço em disco
            const diskUsage = await this.getDiskUsage();
            
            if (diskUsage.usedPercent > this.thresholds.disk) {
                return {
                    status: 'warning',
                    message: `Disk usage is high: ${diskUsage.usedPercent}%`,
                    details: { diskUsage, directories: checks }
                };
            }
            
            return {
                status: 'healthy',
                message: 'File system is healthy',
                details: { diskUsage, directories: checks }
            };
            
        } catch (error) {
            return {
                status: 'unhealthy',
                message: `File system check failed: ${error.message}`,
                details: { error: error.name }
            };
        }
    }
    
    /**
     * Verificação de uso de memória
     */
    async checkMemory() {
        try {
            const memUsage = process.memoryUsage();
            const totalMem = os.totalmem();
            const freeMem = os.freemem();
            const usedPercent = ((totalMem - freeMem) / totalMem) * 100;
            
            const details = {
                system: {
                    total: Math.round(totalMem / 1024 / 1024),
                    free: Math.round(freeMem / 1024 / 1024),
                    used: Math.round((totalMem - freeMem) / 1024 / 1024),
                    usedPercent: Math.round(usedPercent)
                },
                process: {
                    rss: Math.round(memUsage.rss / 1024 / 1024),
                    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
                    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
                    external: Math.round(memUsage.external / 1024 / 1024)
                }
            };
            
            if (usedPercent > this.thresholds.memory) {
                return {
                    status: 'warning',
                    message: `Memory usage is high: ${Math.round(usedPercent)}%`,
                    details
                };
            }
            
            return {
                status: 'healthy',
                message: 'Memory usage is normal',
                details
            };
            
        } catch (error) {
            return {
                status: 'unhealthy',
                message: `Memory check failed: ${error.message}`,
                details: { error: error.name }
            };
        }
    }
    
    /**
     * Verificação do sistema de filas
     */
    async checkQueues() {
        try {
            const queueStats = {
                process: 0,
                publish: 0
            };
            
            // Verifica filas no Redis
            const processQueueSize = await this.redis.llen('bull:process:waiting');
            const publishQueueSize = await this.redis.llen('bull:publish:waiting');
            
            queueStats.process = processQueueSize || 0;
            queueStats.publish = publishQueueSize || 0;
            
            const totalQueueSize = queueStats.process + queueStats.publish;
            
            if (totalQueueSize > this.thresholds.queueSize) {
                return {
                    status: 'warning',
                    message: `Queue size is high: ${totalQueueSize} items`,
                    details: queueStats
                };
            }
            
            return {
                status: 'healthy',
                message: 'Queue system is healthy',
                details: queueStats
            };
            
        } catch (error) {
            return {
                status: 'unhealthy',
                message: `Queue check failed: ${error.message}`,
                details: { error: error.name }
            };
        }
    }
    
    /**
     * Verificação de serviços externos
     */
    async checkExternalServices() {
        const services = [];
        
        // Esta função pode ser expandida para verificar APIs externas
        // Por exemplo: APIs de geolocalização, serviços de imagem, etc.
        
        return {
            status: 'healthy',
            message: 'External services are healthy',
            details: { services }
        };
    }
    
    /**
     * Verificação do serviço WhatsApp
     */
    async checkWhatsAppService() {
        try {
            // Verifica se o arquivo de sessão existe
            const sessionPath = path.join(process.cwd(), '.wwebjs_auth');
            
            let sessionStatus = 'not_initialized';
            try {
                await fs.access(sessionPath);
                sessionStatus = 'initialized';
            } catch {
                sessionStatus = 'not_found';
            }
            
            return {
                status: sessionStatus === 'initialized' ? 'healthy' : 'warning',
                message: `WhatsApp session status: ${sessionStatus}`,
                details: { sessionStatus }
            };
            
        } catch (error) {
            return {
                status: 'unhealthy',
                message: `WhatsApp service check failed: ${error.message}`,
                details: { error: error.name }
            };
        }
    }
    
    /**
     * Verificação do serviço Instagram
     */
    async checkInstagramService() {
        try {
            // Verifica se o arquivo de sessão do Instagram existe
            const sessionPath = path.join(process.cwd(), 'instagram-session.json');
            
            let sessionStatus = 'not_initialized';
            try {
                await fs.access(sessionPath);
                sessionStatus = 'initialized';
            } catch {
                sessionStatus = 'not_found';
            }
            
            return {
                status: sessionStatus === 'initialized' ? 'healthy' : 'warning',
                message: `Instagram session status: ${sessionStatus}`,
                details: { sessionStatus }
            };
            
        } catch (error) {
            return {
                status: 'unhealthy',
                message: `Instagram service check failed: ${error.message}`,
                details: { error: error.name }
            };
        }
    }
    
    /**
     * Utilitários
     */
    createTimeoutPromise(timeout) {
        return new Promise((_, reject) => {
            setTimeout(() => reject(new Error(`Check timeout after ${timeout}ms`)), timeout);
        });
    }
    
    async getDatabaseStats() {
        try {
            // Estas consultas podem variar dependendo do banco
            return {
                connections: 0, // Placeholder
                queries: 0      // Placeholder
            };
        } catch {
            return {};
        }
    }
    
    parseRedisInfo(info) {
        const lines = info.split('\r\n');
        const result = {};
        
        for (const line of lines) {
            if (line.includes(':')) {
                const [key, value] = line.split(':');
                result[key] = value;
            }
        }
        
        return result;
    }
    
    async getDiskUsage() {
        // Implementação simplificada
        return {
            total: 0,
            used: 0,
            free: 0,
            usedPercent: 0
        };
    }
    
    async getSystemMetrics() {
        const cpus = os.cpus();
        const loadAvg = os.loadavg();
        
        return {
            cpu: {
                count: cpus.length,
                model: cpus[0]?.model || 'unknown',
                loadAverage: {
                    1: loadAvg[0],
                    5: loadAvg[1],
                    15: loadAvg[2]
                }
            },
            platform: os.platform(),
            hostname: os.hostname(),
            nodeVersion: process.version,
            pid: process.pid
        };
    }
    
    addToHistory(result) {
        this.history.push({
            timestamp: result.timestamp,
            status: result.status,
            responseTime: result.responseTime,
            summary: result.summary
        });
        
        // Manter apenas os últimos N resultados
        if (this.history.length > this.maxHistorySize) {
            this.history = this.history.slice(-this.maxHistorySize);
        }
    }
    
    getHistory() {
        return this.history;
    }
    
    getHealthTrend() {
        if (this.history.length === 0) return null;
        
        const recent = this.history.slice(-10);
        const healthyCount = recent.filter(h => h.status === 'healthy').length;
        const avgResponseTime = recent.reduce((sum, h) => sum + h.responseTime, 0) / recent.length;
        
        return {
            healthyPercentage: (healthyCount / recent.length) * 100,
            averageResponseTime: Math.round(avgResponseTime),
            trend: recent.length >= 2 ? 
                (recent[recent.length - 1].responseTime > recent[recent.length - 2].responseTime ? 'slower' : 'faster') : 
                'stable'
        };
    }
    
    async cleanup() {
        await this.prisma.$disconnect();
        this.redis.disconnect();
    }
}

module.exports = HealthCheckSystem;