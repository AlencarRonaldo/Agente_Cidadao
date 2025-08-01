const winston = require('winston');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Criar diretório de logs se não existir
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Definir níveis de log personalizados
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
  trace: 4
};

const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue',
  trace: 'magenta'
};

// Formato personalizado para logs estruturados
const structuredFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf((info) => {
    const { timestamp, level, message, service, userId, denunciaId, operation, metadata, stack, ...rest } = info;
    
    const logEntry = {
      timestamp,
      level,
      message,
      service: service || 'bot-denuncia',
      ...(userId && { userId }),
      ...(denunciaId && { denunciaId }),
      ...(operation && { operation }),
      ...(metadata && { metadata }),
      ...(stack && { stack }),
      ...rest
    };
    
    return JSON.stringify(logEntry, null, 2);
  })
);

// Formato simplificado para console
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.colorize({ colors: logColors }),
  winston.format.printf((info) => {
    const { timestamp, level, message, service, userId, denunciaId, operation } = info;
    
    let prefix = `${timestamp} [${level}]`;
    if (service) prefix += ` [${service}]`;
    if (operation) prefix += ` [${operation}]`;
    if (denunciaId) prefix += ` [${denunciaId}]`;
    if (userId) prefix += ` [User:${userId}]`;
    
    return `${prefix}: ${message}`;
  })
);

// Configurar logger principal
const logger = winston.createLogger({
  levels: logLevels,
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: {
    service: 'bot-denuncia',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    // Console (desenvolvimento)
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'production' ? structuredFormat : consoleFormat,
      silent: process.env.NODE_ENV === 'test'
    }),
    
    // Arquivo de logs gerais
    new winston.transports.File({
      filename: path.join(logsDir, 'application.log'),
      format: structuredFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true
    }),
    
    // Arquivo específico para erros
    new winston.transports.File({
      filename: path.join(logsDir, 'errors.log'),
      level: 'error',
      format: structuredFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10,
      tailable: true
    }),
    
    // Arquivo específico para eventos de publicação
    new winston.transports.File({
      filename: path.join(logsDir, 'publications.log'),
      format: structuredFormat,
      maxsize: 5 * 1024 * 1024, // 5MB
      maxFiles: 10,
      tailable: true,
      // Filtrar apenas logs relacionados a publicação
      filter: (info) => {
        return info.operation && info.operation.includes('publication');
      }
    })
  ],
  
  // Handler para exceções não capturadas
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log'),
      format: structuredFormat
    })
  ],
  
  // Handler para promise rejections não tratadas
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log'),
      format: structuredFormat
    })
  ]
});

winston.addColors(logColors);

class LoggerService {
  constructor() {
    this.logger = logger;
    this.context = {};
  }

  /**
   * Definir contexto global para os logs
   */
  setContext(context) {
    this.context = { ...this.context, ...context };
  }

  /**
   * Limpar contexto
   */
  clearContext() {
    this.context = {};
  }

  /**
   * Criar logger com contexto específico
   */
  child(context) {
    const childLogger = Object.create(this);
    childLogger.context = { ...this.context, ...context };
    return childLogger;
  }

  /**
   * Log de informação
   */
  info(message, metadata = {}) {
    this.logger.info(message, {
      ...this.context,
      ...metadata,
      severity: 'info'
    });
  }

  /**
   * Log de aviso
   */
  warn(message, metadata = {}) {
    this.logger.warn(message, {
      ...this.context,
      ...metadata,
      severity: 'warning'
    });
  }

  /**
   * Log de erro
   */
  error(message, error = null, metadata = {}) {
    const errorMetadata = {
      ...this.context,
      ...metadata,
      severity: 'error'
    };

    if (error) {
      if (error instanceof Error) {
        errorMetadata.error = {
          name: error.name,
          message: error.message,
          stack: error.stack,
          code: error.code
        };
      } else {
        errorMetadata.error = error;
      }
    }

    this.logger.error(message, errorMetadata);
  }

  /**
   * Log de debug
   */
  debug(message, metadata = {}) {
    this.logger.debug(message, {
      ...this.context,
      ...metadata,
      severity: 'debug'
    });
  }

  /**
   * Log de trace (mais detalhado)
   */
  trace(message, metadata = {}) {
    this.logger.trace(message, {
      ...this.context,
      ...metadata,
      severity: 'trace'
    });
  }

  /**
   * Log específico para eventos de publicação
   */
  logPublication(event, denunciaId, metadata = {}) {
    const publicationLogger = this.child({
      operation: 'publication',
      denunciaId,
      component: 'publication_system'
    });

    const eventMessages = {
      'queued': `Denúncia ${denunciaId} adicionada à fila de publicação`,
      'processing': `Iniciando processamento da denúncia ${denunciaId}`,
      'published': `Denúncia ${denunciaId} publicada com sucesso`,
      'failed': `Falha na publicação da denúncia ${denunciaId}`,
      'scheduled': `Denúncia ${denunciaId} agendada para publicação`,
      'approved': `Denúncia ${denunciaId} aprovada para publicação`,
      'rejected': `Denúncia ${denunciaId} rejeitada`
    };

    const message = eventMessages[event] || `Evento ${event} para denúncia ${denunciaId}`;
    const level = event === 'failed' ? 'error' : (event === 'rejected' ? 'warn' : 'info');

    publicationLogger[level](message, {
      event,
      ...metadata,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log de métricas de performance
   */
  logPerformance(operation, duration, metadata = {}) {
    const performanceLogger = this.child({
      operation: 'performance',
      component: 'metrics'
    });

    performanceLogger.info(`Performance: ${operation}`, {
      duration,
      ...metadata,
      performance: {
        operation,
        duration,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Log de eventos de sistema
   */
  logSystemEvent(event, severity = 'info', metadata = {}) {
    const systemLogger = this.child({
      operation: 'system',
      component: 'monitoring'
    });

    systemLogger[severity](`Sistema: ${event}`, {
      event,
      ...metadata,
      system: {
        event,
        timestamp: new Date().toISOString(),
        severity
      }
    });
  }

  /**
   * Log de eventos de usuário
   */
  logUserAction(userId, action, metadata = {}) {
    const userLogger = this.child({
      operation: 'user_action',
      userId,
      component: 'admin_panel'
    });

    userLogger.info(`Ação do usuário: ${action}`, {
      action,
      ...metadata,
      userAction: {
        userId,
        action,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Log de eventos de segurança
   */
  logSecurity(event, severity = 'warn', metadata = {}) {
    const securityLogger = this.child({
      operation: 'security',
      component: 'auth'
    });

    securityLogger[severity](`Segurança: ${event}`, {
      event,
      ...metadata,
      security: {
        event,
        timestamp: new Date().toISOString(),
        severity
      }
    });
  }

  /**
   * Log estruturado para análise posterior
   */
  logStructured(category, data) {
    const structuredLogger = this.child({
      operation: 'structured',
      category,
      component: 'analytics'
    });

    structuredLogger.info(`Dados estruturados: ${category}`, {
      category,
      data,
      structured: {
        category,
        timestamp: new Date().toISOString(),
        data
      }
    });
  }

  /**
   * Salvar log crítico no banco de dados
   */
  async logCritical(message, metadata = {}) {
    // Log normal
    this.error(message, null, { ...metadata, critical: true });

    // Salvar também no banco para alertas críticos
    try {
      await prisma.systemLog.create({
        data: {
          level: 'CRITICAL',
          message,
          metadata: JSON.stringify(metadata),
          timestamp: new Date(),
          component: metadata.component || 'system',
          operation: metadata.operation || 'unknown'
        }
      });
    } catch (error) {
      // Se falhar ao salvar no banco, pelo menos loggar o erro
      this.logger.error('Falha ao salvar log crítico no banco', {
        originalMessage: message,
        error: error.message
      });
    }
  }

  /**
   * Obter estatísticas de logs
   */
  async getLogStats(timeframe = '24h') {
    const hours = parseInt(timeframe.replace('h', ''));
    const startTime = new Date();
    startTime.setHours(startTime.getHours() - hours);

    try {
      const stats = await prisma.systemLog.groupBy({
        by: ['level'],
        where: {
          timestamp: {
            gte: startTime
          }
        },
        _count: true
      });

      return stats.reduce((acc, stat) => {
        acc[stat.level.toLowerCase()] = stat._count;
        return acc;
      }, {});
    } catch (error) {
      this.error('Erro ao obter estatísticas de logs', error);
      return {};
    }
  }

  /**
   * Buscar logs com filtros
   */
  async searchLogs(filters = {}) {
    const {
      level,
      component,
      operation,
      startDate,
      endDate,
      limit = 100,
      offset = 0
    } = filters;

    const where = {};
    
    if (level) where.level = level.toUpperCase();
    if (component) where.component = component;
    if (operation) where.operation = operation;
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate);
      if (endDate) where.timestamp.lte = new Date(endDate);
    }

    try {
      const logs = await prisma.systemLog.findMany({
        where,
        orderBy: {
          timestamp: 'desc'
        },
        take: limit,
        skip: offset
      });

      return logs.map(log => ({
        ...log,
        metadata: JSON.parse(log.metadata || '{}')
      }));
    } catch (error) {
      this.error('Erro ao buscar logs', error);
      return [];
    }
  }

  /**
   * Middleware para Express
   */
  expressMiddleware() {
    return (req, res, next) => {
      const startTime = Date.now();
      
      // Adicionar logger ao request
      req.logger = this.child({
        requestId: req.get('X-Request-ID') || `req-${Date.now()}`,
        userId: req.user?.id,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      // Log da requisição
      req.logger.info(`${req.method} ${req.originalUrl}`, {
        method: req.method,
        url: req.originalUrl,
        query: req.query,
        body: req.method !== 'GET' ? req.body : undefined
      });

      // Log da resposta
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        const level = res.statusCode >= 400 ? 'warn' : 'info';
        
        req.logger[level](`${req.method} ${req.originalUrl} - ${res.statusCode}`, {
          method: req.method,
          url: req.originalUrl,
          statusCode: res.statusCode,
          duration,
          responseTime: duration
        });
      });

      next();
    };
  }
}

// Criar instância singleton
const loggerService = new LoggerService();

// Configurar tratamento global de erros
process.on('uncaughtException', (error) => {
  loggerService.logCritical('Exceção não capturada', {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    }
  });
});

process.on('unhandledRejection', (reason, promise) => {
  loggerService.logCritical('Promise rejection não tratada', {
    reason: reason instanceof Error ? {
      name: reason.name,
      message: reason.message,
      stack: reason.stack
    } : reason,
    promise: promise.toString()
  });
});

module.exports = loggerService;