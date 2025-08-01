const fs = require('fs');
const path = require('path');

// Garantir que o diretório de logs existe
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Logger simples sem dependências externas
class SimpleLogger {
  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  _formatMessage(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...data
    };
    
    if (this.isDevelopment) {
      // Console colorido para desenvolvimento
      const colors = {
        INFO: '\x1b[36m',
        WARN: '\x1b[33m',
        ERROR: '\x1b[31m',
        DEBUG: '\x1b[90m',
        FATAL: '\x1b[35m'
      };
      const color = colors[level.toUpperCase()] || '\x1b[0m';
      const reset = '\x1b[0m';
      
      console.log(`${color}[${timestamp}] ${level.toUpperCase()}: ${message}${reset}`);
      if (Object.keys(data).length > 0) {
        console.log(`${color}${JSON.stringify(data, null, 2)}${reset}`);
      }
    } else {
      // Log para arquivo em produção
      const logLine = JSON.stringify(logEntry) + '\n';
      fs.appendFileSync(path.join(logsDir, 'app.log'), logLine);
      
      if (level === 'error' || level === 'fatal') {
        fs.appendFileSync(path.join(logsDir, 'error.log'), logLine);
      }
    }
  }

  info(message, data = {}) {
    this._formatMessage('info', message, data);
  }

  warn(message, data = {}) {
    this._formatMessage('warn', message, data);
  }

  error(message, data = {}) {
    this._formatMessage('error', message, data);
  }

  debug(message, data = {}) {
    this._formatMessage('debug', message, data);
  }

  fatal(message, data = {}) {
    this._formatMessage('fatal', message, data);
  }

  audit(action, details = {}) {
    this.info(`AUDIT: ${action}`, {
      type: 'AUDIT',
      action,
      ...details
    });
  }
}

const logger = new SimpleLogger();

// Tratamento de erros não capturadas
process.on('uncaughtException', (err) => {
  logger.fatal('Uncaught Exception', { error: err.message, stack: err.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
});

module.exports = logger;