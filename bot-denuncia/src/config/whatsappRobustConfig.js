/**
 * WHATSAPP ROBUST CONFIGURATION
 * 
 * Configurações robustas para WhatsApp Web.js com otimizações para produção
 * - Puppeteer settings otimizados
 * - Timeouts e limites calculados
 * - Flags de segurança e performance
 * - Configurações de retry e reconnection
 * 
 * @author Backend Reliability Engineer
 * @priority CRITICAL - Production Ready
 */

/**
 * CONFIGURAÇÃO ROBUSTA DO CLIENTE WHATSAPP
 */
const ROBUST_CLIENT_CONFIG = {
    authStrategy: null, // Será definido dinamicamente no serviço
    
    puppeteer: {
        ...require('../../puppeteer-config'), // Herdar configuração corrigida
        
        // Sobrescritas específicas para robustez
        timeout: 180000, // 3 minutos estendido
        protocolTimeout: 180000,
        slowMo: 0,
        pipe: false, // Usar WebSocket no Windows
        
        // Manter alguns args específicos de robustez se não conflitarem
        args: [
            // Herdar args do puppeteer-config e adicionar específicos
            ...require('../../puppeteer-config').args,
            
            // Adicionais para robustez (sem duplicar)
            '--aggressive-cache-discard',
            '--disable-background-networking',
            '--disable-renderer-backgrounding',
            
            // Chrome stability
            '--disable-blink-features=AutomationControlled',
            '--disable-features=TranslateUI,BlinkGenPropertyTrees',
            '--disable-ipc-flooding-protection',
            '--no-first-run',
            '--no-default-browser-check',
            '--disable-hang-monitor',
            '--disable-prompt-on-repost',
            
            // Viewport and display
            '--window-size=1366,768',
            '--start-maximized',
            
            // Additional stability flags
            '--disable-client-side-phishing-detection',
            '--disable-component-update',
            '--disable-domain-reliability',
            '--disable-logging',
            '--silent'
        ],
        
        // CORREÇÃO: Remover conflito com configuração herdada
        // timeout já definido acima como 180000
        
        // Performance settings
        defaultViewport: {
            width: 1366,
            height: 768,
            deviceScaleFactor: 1,
        },
        
        // User agent para evitar detecção
        executablePath: undefined, // Use system Chrome
        userDataDir: undefined // Será configurado dinamicamente
    },
    
    // WhatsApp Web.js specific settings
    takeoverOnConflict: true,
    takeoverTimeoutMs: 20000, // 20 segundos
    authTimeoutMs: 90000, // 90 segundos para auth
    qrMaxRetries: 5,
    restartOnAuthFail: true,
    
    // Session management
    session: undefined, // Será configurado dinamicamente
    
    // Additional stability settings
    proxyAuthentication: undefined,
    ffmpegPath: undefined,
    
    // Rate limiting
    markOnlineOnConnect: false, // Evita rate limiting
    
    // WhatsApp Web version (opcional)
    webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html'
    }
};

/**
 * CONFIGURAÇÕES DE CONFIABILIDADE
 */
const RELIABILITY_CONFIG = {
    // Connection timeouts
    CONNECTION_TIMEOUT: 120000, // 2 minutos
    AUTH_TIMEOUT: 90000, // 90 segundos
    QR_TIMEOUT: 60000, // 60 segundos
    READY_TIMEOUT: 30000, // 30 segundos após auth
    
    // Reconnection settings
    MAX_RECONNECT_ATTEMPTS: 12, // Aumentado
    BASE_RECONNECT_DELAY: 3000, // 3 segundos base
    MAX_RECONNECT_DELAY: 300000, // 5 minutos máximo
    JITTER_FACTOR: 0.25, // 25% jitter
    EXPONENTIAL_BASE: 1.8, // Base para exponential backoff
    
    // Health monitoring
    HEARTBEAT_INTERVAL: 45000, // 45 segundos
    HEALTH_CHECK_TIMEOUT: 10000, // 10 segundos
    MESSAGE_FLOW_TIMEOUT: 600000, // 10 minutos sem mensagens = warning
    CONNECTION_UPTIME_MIN: 30000, // 30 segundos mínimo antes de considerar estável
    
    // Circuit breaker
    CIRCUIT_FAILURE_THRESHOLD: 5, // 5 falhas consecutivas
    CIRCUIT_RECOVERY_TIMEOUT: 120000, // 2 minutos
    CIRCUIT_HALF_OPEN_CALLS: 3, // 3 chamadas no estado half-open
    
    // Rate limiting
    RATE_LIMITS: {
        QR_REQUESTS: { max: 5, window: 300000 }, // 5 QRs per 5 minutes
        MESSAGES: { max: 50, window: 60000 }, // 50 messages per minute
        RECONNECTS: { max: 10, window: 3600000 }, // 10 reconnects per hour
        HEALTH_CHECKS: { max: 100, window: 60000 } // 100 health checks per minute
    },
    
    // Cleanup strategies
    CLEANUP_STRATEGIES: {
        FAST_RETRY: {
            sessionCleanup: false,
            cacheCleanup: false,
            processCleanup: false,
            delay: 2000
        },
        EXPONENTIAL_BACKOFF: {
            sessionCleanup: false,
            cacheCleanup: true,
            processCleanup: false,
            delay: 5000
        },
        CONSERVATIVE_RETRY: {
            sessionCleanup: true,
            cacheCleanup: true,
            processCleanup: true,
            delay: 15000
        },
        LAST_RESORT: {
            sessionCleanup: true,
            cacheCleanup: true,
            processCleanup: true,
            fullReset: true,
            delay: 30000
        }
    },
    
    // Performance monitoring
    PERFORMANCE_THRESHOLDS: {
        MEMORY_WARNING_MB: 500,
        MEMORY_CRITICAL_MB: 800,
        RESPONSE_TIME_WARNING_MS: 5000,
        RESPONSE_TIME_CRITICAL_MS: 10000,
        CPU_WARNING_PERCENT: 70,
        CPU_CRITICAL_PERCENT: 90
    },
    
    // Logging levels
    LOG_LEVELS: {
        CONNECTION: 'info',
        RECONNECTION: 'info',
        HEALTH: 'debug',
        PERFORMANCE: 'warn',
        ERRORS: 'error',
        CIRCUIT_BREAKER: 'warn'
    }
};

/**
 * CONFIGURAÇÕES DE MONITORAMENTO
 */
const MONITORING_CONFIG = {
    // Métricas coletadas
    METRICS: {
        CONNECTION_TIME: true,
        MESSAGE_COUNT: true,
        ERROR_COUNT: true,
        RECONNECTION_COUNT: true,
        HEALTH_CHECK_COUNT: true,
        PERFORMANCE_METRICS: true
    },
    
    // Alertas
    ALERTS: {
        ENABLED: true,
        CHANNELS: ['log', 'webhook'], // 'email', 'slack', 'webhook'
        THRESHOLDS: {
            CONSECUTIVE_FAILURES: 3,
            HIGH_RECONNECTION_RATE: 5, // por hora
            LOW_SUCCESS_RATE: 80, // porcentagem
            HIGH_RESPONSE_TIME: 8000 // ms
        }
    },
    
    // Webhook notifications (se habilitado)
    WEBHOOK: {
        URL: process.env.WHATSAPP_WEBHOOK_URL || null,
        TIMEOUT: 5000,
        RETRY_ATTEMPTS: 2,
        EVENTS: [
            'max_reconnections_reached',
            'circuit_breaker_opened',
            'performance_degraded',
            'auth_failure_repeated'
        ]
    },
    
    // Retention de dados
    DATA_RETENTION: {
        METRICS_DAYS: 7,
        LOGS_DAYS: 30,
        PERFORMANCE_DAYS: 3
    }
};

/**
 * CONFIGURAÇÕES ESPECÍFICAS POR AMBIENTE
 */
const ENVIRONMENT_CONFIGS = {
    development: {
        puppeteer: {
            ...ROBUST_CLIENT_CONFIG.puppeteer,
            headless: false, // Debug mode
            devtools: true,
            slowMo: 100
        },
        reliability: {
            ...RELIABILITY_CONFIG,
            MAX_RECONNECT_ATTEMPTS: 5,
            HEARTBEAT_INTERVAL: 30000
        }
    },
    
    production: {
        puppeteer: {
            ...ROBUST_CLIENT_CONFIG.puppeteer,
            headless: true,
            args: [
                ...ROBUST_CLIENT_CONFIG.puppeteer.args,
                '--disable-logging',
                '--silent',
                '--disable-dev-shm-usage'
            ]
        },
        reliability: {
            ...RELIABILITY_CONFIG,
            MAX_RECONNECT_ATTEMPTS: 15,
            HEARTBEAT_INTERVAL: 60000
        }
    },
    
    test: {
        puppeteer: {
            ...ROBUST_CLIENT_CONFIG.puppeteer,
            headless: true,
            timeout: 30000
        },
        reliability: {
            ...RELIABILITY_CONFIG,
            MAX_RECONNECT_ATTEMPTS: 3,
            HEARTBEAT_INTERVAL: 10000
        }
    }
};

/**
 * FUNÇÃO PARA OBTER CONFIGURAÇÃO BASEADA NO AMBIENTE
 */
function getRobustConfig(environment = process.env.NODE_ENV || 'development') {
    const baseConfig = { ...ROBUST_CLIENT_CONFIG };
    const envConfig = ENVIRONMENT_CONFIGS[environment] || ENVIRONMENT_CONFIGS.development;
    
    // Merge configurations
    return {
        ...baseConfig,
        ...envConfig,
        puppeteer: {
            ...baseConfig.puppeteer,
            ...(envConfig.puppeteer || {})
        }
    };
}

/**
 * FUNÇÃO PARA VALIDAR CONFIGURAÇÃO
 */
function validateConfig(config) {
    const required = ['puppeteer', 'takeoverOnConflict', 'authTimeoutMs'];
    
    for (const field of required) {
        if (!(field in config)) {
            throw new Error(`Missing required config field: ${field}`);
        }
    }
    
    // Validar timeouts
    if (config.authTimeoutMs < 30000) {
        console.warn('⚠️ authTimeoutMs is very low, may cause connection issues');
    }
    
    if (config.puppeteer.timeout < 60000) {
        console.warn('⚠️ Puppeteer timeout is very low, may cause initialization issues');
    }
    
    return true;
}

/**
 * CONFIGURAÇÃO DE LOGS ESTRUTURADOS
 */
const LOGGING_CONFIG = {
    FORMAT: 'json',
    LEVELS: {
        error: 0,
        warn: 1,
        info: 2,
        debug: 3,
        trace: 4
    },
    TRANSPORTS: {
        console: {
            enabled: true,
            level: process.env.LOG_LEVEL || 'info',
            colorize: true
        },
        file: {
            enabled: true,
            level: 'info',
            filename: 'logs/whatsapp-stability.log',
            maxSize: '10m',
            maxFiles: 5
        },
        error_file: {
            enabled: true,
            level: 'error',
            filename: 'logs/whatsapp-errors.log',
            maxSize: '10m',
            maxFiles: 10
        }
    }
};

module.exports = {
    ROBUST_CLIENT_CONFIG,
    RELIABILITY_CONFIG,
    MONITORING_CONFIG,
    ENVIRONMENT_CONFIGS,
    LOGGING_CONFIG,
    getRobustConfig,
    validateConfig
};