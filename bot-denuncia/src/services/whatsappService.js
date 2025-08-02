const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');
const { PrismaClient } = require('@prisma/client');
const Bull = require('bull');
const prisma = new PrismaClient();
const { CONFIG } = require('../config/constants');
const { MESSAGES, QUICK_REPLIES, ESTADOS_CONVERSA, TIMEOUT_CONVERSA, CATEGORIAS_DENUNCIA } = CONFIG;
const textFilterService = require('./textFilterService');
const geoService = require('./geoService');
const vereadorService = require('./vereadorService');
const instagramApiManager = require('./instagramApiManager');
const uploadService = require('./uploadService');
const logger = require('../utils/logger');

// IMPORT STABILITY ENGINE - RELIABILITY ENGINEERING
const { WhatsAppStabilityEngine } = require('./whatsappStabilityEngine');
const { getRobustConfig, validateConfig } = require('../config/whatsappRobustConfig');

// Configurar fila de processamento
const processQueue = new Bull('process-queue', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
  },
});

class WhatsAppService {
    constructor() {
        this.client = null;
        this.isConnected = false;
        this.isConnecting = false;
        this.qrCode = null;
        this.connectionInfo = null;
        this.lastError = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 15; // Aumentado para 15 tentativas
        this.heartbeatInterval = null;
        this.initializationTimeout = null;
        this.isInitializing = false;
        this.lastSuccessfulConnection = null;
        this.connectionAttempts = 0;
        
        // STABILITY ENGINE INTEGRATION - PRODUCTION READY
        this.stabilityEngine = new WhatsAppStabilityEngine(this);
        this.stabilityEngineActive = false;
        
        // Auto-initialize stability engine and WhatsApp with session restoration
        if (process.env.WHATSAPP_AUTO_INIT === 'true') {
            setTimeout(async () => {
                try {
                    await this.stabilityEngine.initialize();
                    this.stabilityEngineActive = true;
                    logger.info('🛡️ Stability Engine activated successfully');
                    
                    // PRIORITY FIX: Auto-restore session on startup
                    await this.initializeWithSessionRestore();
                } catch (err) {
                    logger.warn('Auto-initialization failed:', err.message);
                }
            }, 8000); // Delay maior para garantir que todos os módulos estejam carregados
        }
    }

    async initialize() {
        try {
            if (this.isConnecting || this.isInitializing) {
                logger.info('⏳ WhatsApp já está conectando/inicializando, aguardando...');
                return { success: true, message: 'Já conectando' };
            }
            
            if (this.isConnected) {
                logger.info('✅ WhatsApp já está conectado');
                return { success: true, message: 'Já conectado' };
            }

            // PRIORITY FIX: Check for existing valid session before initializing
            const sessionCheck = await this.checkExistingSession();
            if (sessionCheck.hasValidSession) {
                logger.info('🔄 Sessão existente encontrada, tentando restaurar...');
                const restoreResult = await this.restoreExistingSession();
                if (restoreResult.success) {
                    return restoreResult;
                }
                logger.warn('⚠️ Falha ao restaurar sessão existente, criando nova conexão...');
            }

            // Reset completo antes de inicializar
            this.forceReset();
            
            this.isConnecting = true;
            this.isInitializing = true;
            this.lastError = null;
            this.qrCode = null;
            this.connectionAttempts++;
            
            logger.info(`🚀 Iniciando processo de conexão WhatsApp (tentativa ${this.connectionAttempts})...`);

            // Destruir cliente anterior se existir
            if (this.client) {
                logger.info('🗑️ Destruindo cliente anterior...');
                try {
                    await Promise.race([
                        this.client.destroy(),
                        new Promise((_, reject) => 
                            setTimeout(() => reject(new Error('Destroy timeout')), 5000)
                        )
                    ]);
                } catch (destroyError) {
                    logger.warn('⚠️ Erro ao destruir cliente anterior:', destroyError.message);
                }
                this.client = null;
            }

            // Aguardar um pouco para garantir que o cliente foi destruído
            await new Promise(resolve => setTimeout(resolve, 2000));

            logger.info('🔧 Criando novo cliente WhatsApp com configuração robusta...');
            
            // Obter configuração robusta baseada no ambiente
            const robustConfig = getRobustConfig();
            
            // Configurar auth strategy
            robustConfig.authStrategy = new LocalAuth({
                clientId: 'bot-denuncias-sbc'
            });
            
            // Validar configuração
            validateConfig(robustConfig);
            
            logger.info('✅ Configuração robusta validada', {
                environment: process.env.NODE_ENV || 'development',
                timeout: robustConfig.puppeteer.timeout,
                args: robustConfig.puppeteer.args.length,
                authTimeout: robustConfig.authTimeoutMs
            });
            
            this.client = new Client(robustConfig);

            this.setupEventListeners();

            logger.info('⚙️ Inicializando cliente WhatsApp...');
            
            // Extended timeout for WhatsApp Web loading - 90 seconds
            const initializePromise = this.client.initialize();
            const timeoutPromise = new Promise((_, reject) => {
                this.initializationTimeout = setTimeout(() => {
                    logger.error('⏰ Timeout na inicialização do WhatsApp após 90 segundos');
                    reject(new Error('WhatsApp initialization timeout after 90 seconds'));
                }, 90000); // 90 segundos - allows WhatsApp Web to fully load
            });
            
            try {
                logger.info('🔄 Aguardando inicialização...');
                await Promise.race([initializePromise, timeoutPromise]);
                
                logger.info('✅ WhatsApp client initialized successfully');
                
                // Cleanup do timeout
                if (this.initializationTimeout) {
                    clearTimeout(this.initializationTimeout);
                    this.initializationTimeout = null;
                }
                
                return { success: true, message: 'Inicialização iniciada com sucesso' };
                
            } catch (error) {
                logger.error('❌ Erro durante inicialização:', error.message);
                
                // Cleanup do timeout
                if (this.initializationTimeout) {
                    clearTimeout(this.initializationTimeout);
                    this.initializationTimeout = null;
                }
                
                // Reset do estado em caso de erro
                this.isInitializing = false;
                this.isConnecting = false;
                
                throw error;
            }

        } catch (error) {
            this.lastError = error.message;
            this.isConnecting = false;
            this.isInitializing = false;
            
            // Cleanup completo em caso de erro
            if (this.initializationTimeout) {
                clearTimeout(this.initializationTimeout);
                this.initializationTimeout = null;
            }
            
            logger.error('❌ Erro ao inicializar WhatsApp:', error);
            return { success: false, message: error.message };
        }
    }

    setupEventListeners() {
        // Listener para QR Code
        this.client.on('qr', async (qr) => {
            console.log('📱 QR CODE RECEBIDO!', qr.substring(0, 50) + '...');
            
            // Keep connecting state until ready - QR generation is part of connection process
            // this.isConnecting should remain true until authenticated
            this.isInitializing = false;
            
            try {
                // Gerar QR Code em base64 para o frontend
                const qrDataURL = await QRCode.toDataURL(qr, {
                    width: 300,
                    margin: 2,
                    color: {
                        dark: '#000000',
                        light: '#FFFFFF'
                    },
                    errorCorrectionLevel: 'M'
                });
                
                // Extrair apenas a parte base64 (sem o prefixo data:image/png;base64,)
                this.qrCode = qrDataURL.split(',')[1];
                
                console.log('✅ QR Code base64 gerado, tamanho:', this.qrCode?.length);
                
                // Também mostrar no terminal para debug
                qrcode.generate(qr, { small: true });
                
                logger.info('✅ QR Code gerado para WhatsApp (base64)', { length: this.qrCode?.length });
            } catch (error) {
                logger.error('❌ Erro ao gerar QR Code base64:', error);
                this.qrCode = null;
            }
        });

        this.client.on('ready', async () => {
            console.log('🟢 WhatsApp Client is ready!');
            this.isConnected = true;
            this.isConnecting = false;
            this.isInitializing = false;
            this.qrCode = null;
            this.reconnectAttempts = 0;
            this.connectionAttempts = 0;
            this.lastSuccessfulConnection = new Date();
            
            // Obter informações da conta
            try {
                const info = this.client.info;
                this.connectionInfo = {
                    wid: info.wid,
                    pushname: info.pushname,
                    phone: info.wid.user,
                    platform: info.platform,
                    connectedAt: new Date()
                };
                logger.info('WhatsApp conectado:', this.connectionInfo);
            } catch (error) {
                logger.error('Erro ao obter info do WhatsApp:', error);
            }

            // Limpar conversas expiradas a cada 30 minutos (menos agressivo)
            setInterval(() => this.cleanupExpiredConversations(), 30 * 60 * 1000);
            
            // Iniciar heartbeat para monitorar conexão
            this.startHeartbeat();
        });

        this.client.on('authenticated', () => {
            logger.info('WhatsApp autenticado com sucesso');
            this.isConnecting = true; // Still connecting until ready
            this.qrCode = null; // Clear QR code after authentication
        });

        this.client.on('auth_failure', (msg) => {
            logger.error('❌ Falha na autenticação WhatsApp:', msg);
            this.isConnected = false;
            this.isConnecting = false;
            this.isInitializing = false;
            this.lastError = `Auth failure: ${msg}`;
            this.qrCode = null;
        });

        // Event listener de auth_failure movido para dentro do bloco de disconnected para evitar duplicação

        this.client.on('disconnected', (reason) => {
            console.log(`🔴 WhatsApp desconectado: ${reason}`);
            this.isConnected = false;
            this.isConnecting = false;
            this.isInitializing = false;
            this.connectionInfo = null;
            this.lastError = `Desconectado: ${reason}`;
            logger.warn('WhatsApp desconectado:', reason);
            
            // Parar heartbeat
            this.stopHeartbeat();
            
            // Limpar timeout de inicialização se existir
            if (this.initializationTimeout) {
                clearTimeout(this.initializationTimeout);
                this.initializationTimeout = null;
            }
            
            // Lista de razões que permitem reconexão automática
            const allowedReconnectReasons = [
                'UNPAIRED', 'CONFLICTING_SESSION', 'UNLAUNCHED', 
                'OPENING', 'PAIRING', 'TIMEOUT', 'SMB_TOS_BLOCK'
            ];
            
            // Tentar reconectar automaticamente apenas se foi desconexão técnica e não manual
            if (reason !== 'LOGOUT' && reason !== 'NAVIGATION' && !this.isManualDisconnect) {
                logger.info(`🔄 Iniciando reconexão automática após desconexão: ${reason}`);
                // Delay escalonado baseado no motivo da desconexão
                const delay = this.getDisconnectDelay(reason);
                setTimeout(() => {
                    if (!this.isManualDisconnect) {
                        this.attemptReconnect();
                    }
                }, delay);
            } else {
                logger.info('🚫 Desconexão manual detectada, não tentando reconectar automaticamente');
            }
        });
        
        // Adicionar mais event listeners para melhor monitoramento
        this.client.on('loading_screen', (percent, message) => {
            console.log(`📋 WhatsApp carregando: ${percent}% - ${message}`);
            logger.debug(`WhatsApp carregando: ${percent}% - ${message}`);
        });
        
        this.client.on('change_state', (state) => {
            console.log(`🔄 WhatsApp mudou de estado: ${state}`);
            logger.info(`WhatsApp mudou de estado: ${state}`);
            
            if (state === 'CONNECTED') {
                this.isConnected = true;
                this.isConnecting = false;
                this.isInitializing = false;
                this.reconnectAttempts = 0;
            } else if (state === 'UNPAIRED' || state === 'UNLAUNCHED') {
                this.isConnected = false;
                // Keep connecting state - these states lead to QR generation
                if (!this.isConnecting && !this.isInitializing) {
                    this.isConnecting = true;
                }
            } else if (state === 'OPENING') {
                this.isConnecting = true;
                this.isInitializing = false;
            } else if (state === 'PAIRING') {
                // Keep connecting true during pairing - QR should be shown
                this.isConnecting = true;
                this.isInitializing = false;
            }
        });
        
        this.client.on('remote_session_saved', () => {
            logger.info('Sessão WhatsApp salva remotamente');
        });

        // Event listener para falhas de autenticação
        this.client.on('auth_failure', (msg) => {
            console.log('❌ Falha na autenticação WhatsApp:', msg);
            this.lastError = `Falha na autenticação: ${msg}`;
            this.isConnecting = false;
            this.isInitializing = false;
            logger.error('❌ Falha na autenticação WhatsApp:', msg);
            
            // Para falhas de autenticação, aguardar mais tempo antes de tentar novamente
            if (!this.isManualDisconnect) {
                setTimeout(() => this.attemptReconnect(), 15000); // 15 segundos
            }
        });

        this.client.on('message', (message) => this.handleMessage(message));
    }
    
    getDisconnectDelay(reason) {
        const delays = {
            'UNPAIRED': 8000,           // 8 segundos - comum, pode ser rápido
            'CONFLICTING_SESSION': 12000, // 12 segundos - conflito, aguardar mais
            'UNLAUNCHED': 5000,         // 5 segundos - não iniciado, rápido
            'OPENING': 10000,           // 10 segundos - tentando abrir
            'PAIRING': 7000,            // 7 segundos - emparelhando
            'TIMEOUT': 15000,           // 15 segundos - timeout, aguardar mais
            'SMB_TOS_BLOCK': 30000,     // 30 segundos - bloqueio, aguardar bastante
        };
        
        return delays[reason] || 10000; // Default: 10 segundos
    }

    async attemptReconnect() {
        if (this.isConnecting || this.isInitializing) {
            logger.info('🔄 Reconexão já em andamento, aguardando...');
            return;
        }
        
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            logger.info(`🔄 Tentativa de reconexão ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
            
            // Parar heartbeat durante reconexão
            this.stopHeartbeat();
            
            // Limpar timeouts ativos
            if (this.initializationTimeout) {
                clearTimeout(this.initializationTimeout);
                this.initializationTimeout = null;
            }
            
            // Estratégia de limpeza progressiva baseada no número de tentativas
            try {
                if (this.client) {
                    logger.info('🗑️ Destruindo cliente anterior...');
                    
                    // Timeout mais generoso para destruição
                    await Promise.race([
                        this.client.destroy(),
                        new Promise((_, reject) => 
                            setTimeout(() => reject(new Error('Destroy timeout')), 10000)
                        )
                    ]);
                    
                    logger.info('✅ Cliente anterior destruído com sucesso');
                }
            } catch (error) {
                logger.warn('⚠️ Erro ao destruir cliente anterior:', error.message);
            } finally {
                this.client = null;
            }
            
            // Reset completo do estado
            this.isConnected = false;
            this.isConnecting = false;
            this.isInitializing = false;
            this.qrCode = null;
            this.connectionInfo = null;
            
            // Estratégia de delay inteligente
            let delay;
            if (this.reconnectAttempts <= 3) {
                // Primeiras 3 tentativas: delay curto
                delay = 3000 + (this.reconnectAttempts * 2000); // 3s, 5s, 7s
            } else if (this.reconnectAttempts <= 8) {
                // Tentativas intermediárias: exponential backoff
                delay = Math.min(8000 * Math.pow(1.5, this.reconnectAttempts - 4), 45000);
            } else {
                // Últimas tentativas: delay longo
                delay = 60000; // 1 minuto
            }
            
            logger.info(`⏰ Aguardando ${Math.round(delay/1000)}s antes da reconexão... (Estratégia: ${this.getReconnectStrategy()})`);
            
            setTimeout(async () => {
                try {
                    // Verificar se não foi cancelado enquanto aguardava
                    if (this.isConnected || this.isConnecting) {
                        logger.info('❌ Reconexão cancelada: já conectado');
                        return;
                    }
                    
                    logger.info(`🚀 Iniciando tentativa de reconexão ${this.reconnectAttempts}`);
                    await this.initialize();
                    
                    // Se chegou aqui, a inicialização foi bem-sucedida
                    logger.info(`✅ Reconexão ${this.reconnectAttempts} iniciada com sucesso`);
                    
                } catch (error) {
                    logger.error(`❌ Erro na tentativa de reconexão ${this.reconnectAttempts}:`, error.message);
                    this.lastError = `Reconexão ${this.reconnectAttempts} falhou: ${error.message}`;
                    
                    // Tentar novamente se ainda há tentativas disponíveis
                    if (this.reconnectAttempts < this.maxReconnectAttempts) {
                        logger.info('📝 Agendando próxima tentativa de reconexão...');
                        setTimeout(() => this.attemptReconnect(), 2000);
                    } else {
                        logger.error('🚫 Máximo de tentativas de reconexão atingido');
                        this.handleMaxReconnectAttemptsReached();
                    }
                }
            }, delay);
        } else {
            this.handleMaxReconnectAttemptsReached();
        }
    }
    
    getReconnectStrategy() {
        if (this.reconnectAttempts <= 3) return 'Rápida';
        if (this.reconnectAttempts <= 8) return 'Exponencial';
        return 'Conservadora';
    }
    
    handleMaxReconnectAttemptsReached() {
        logger.error('🚫 Máximo de tentativas de reconexão atingido. Reset em 10 minutos.');
        this.lastError = 'Máximo de tentativas de reconexão atingido. Aguarde reset automático.';
        
        // Reset das tentativas após 10 minutos (mais tempo para estabilizar)
        setTimeout(() => {
            logger.info('🔄 Contador de reconexão resetado. Tentativas disponíveis novamente.');
            this.reconnectAttempts = 0;
            this.connectionAttempts = 0;
            this.lastError = null;
            
            // Tentar uma reconexão após o reset se ainda não estiver conectado
            if (!this.isConnected && !this.isConnecting) {
                logger.info('🔄 Iniciando tentativa de reconexão após reset...');
                setTimeout(() => this.attemptReconnect(), 5000);
            }
        }, 10 * 60 * 1000); // 10 minutos
    }

    startHeartbeat() {
        // Verificar conexão a cada 45 segundos (mais estável) com monitoramento de sessão
        this.heartbeatInterval = setInterval(async () => {
            try {
                if (this.isConnected && this.client && !this.isInitializing) {
                    // Verificação mais robusta do estado
                    const healthCheck = await this.checkConnectionHealth();
                    
                    if (!healthCheck.healthy) {
                        logger.warn(`WhatsApp heartbeat falhou: ${healthCheck.reason}. Iniciando reconexão...`);
                        this.isConnected = false;
                        this.attemptReconnect();
                    } else {
                        logger.debug('✅ WhatsApp heartbeat: Conexão saudável');
                        // Reset dos contadores quando conexão está OK
                        this.reconnectAttempts = 0;
                        this.connectionAttempts = 0;
                        this.lastSuccessfulConnection = new Date();
                        
                        // PRIORITY FIX: Session health monitoring
                        await this.monitorSessionHealth();
                    }
                } else if (this.isInitializing) {
                    logger.debug('🔄 WhatsApp heartbeat: Inicializando, aguardando...');
                } else if (!this.isConnected && !this.isConnecting) {
                    logger.debug('⚠️ WhatsApp heartbeat: Não conectado, verificando reconexão...');
                    
                    // PRIORITY FIX: Check for session restoration opportunity
                    await this.checkSessionRestorationOpportunity();
                }
            } catch (error) {
                logger.warn('Erro no heartbeat WhatsApp:', error.message);
                if (this.isConnected && !this.isInitializing) {
                    this.isConnected = false;
                    this.attemptReconnect();
                }
            }
        }, 45 * 1000); // 45 segundos
    }

    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
            logger.info('WhatsApp heartbeat parado');
        }
    }

    async disconnect() {
        try {
            logger.info('🔴 Iniciando desconexão manual do WhatsApp...');
            
            // Parar todos os processos
            this.stopHeartbeat();
            
            // Limpar timeouts ativos
            if (this.initializationTimeout) {
                clearTimeout(this.initializationTimeout);
                this.initializationTimeout = null;
            }
            
            // Marcar como desconexão manual para evitar reconexão automática
            this.isManualDisconnect = true;
            
            if (this.client) {
                logger.info('🗑️ Destruindo cliente WhatsApp...');
                
                // Timeout mais generoso para desconexão manual
                await Promise.race([
                    this.client.destroy(),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Destroy timeout')), 15000)
                    )
                ]).catch(error => {
                    logger.warn('⚠️ Client destroy timeout or error:', error.message);
                });
                
                this.client = null;
                logger.info('✅ Cliente WhatsApp destruído');
            }
            
            // Reset completo do estado
            this.isConnected = false;
            this.isConnecting = false;
            this.isInitializing = false;
            this.qrCode = null;
            this.connectionInfo = null;
            this.reconnectAttempts = 0;
            this.connectionAttempts = 0;
            this.lastError = null;
            this.lastSuccessfulConnection = null;
            
            // Resetar flag de desconexão manual após um tempo
            setTimeout(() => {
                this.isManualDisconnect = false;
            }, 30000); // 30 segundos
            
            logger.info('✅ WhatsApp desconectado manualmente com sucesso');
            return { success: true, message: 'Desconectado com sucesso' };
            
        } catch (error) {
            logger.error('❌ Erro ao desconectar WhatsApp:', error);
            
            // Forçar reset do estado mesmo com erro
            this.forceReset();
            
            return { success: false, message: error.message };
        }
    }
    
    forceReset() {
        logger.warn('⚠️ Forçando reset completo do WhatsApp Service...');
        
        // Parar todos os timers
        this.stopHeartbeat();
        if (this.initializationTimeout) {
            clearTimeout(this.initializationTimeout);
            this.initializationTimeout = null;
        }
        
        // Reset de todas as variáveis
        this.client = null;
        this.isConnected = false;
        this.isConnecting = false;
        this.isInitializing = false;
        this.qrCode = null;
        this.connectionInfo = null;
        this.reconnectAttempts = 0;
        this.connectionAttempts = 0;
        this.lastError = null;
        this.lastSuccessfulConnection = null;
        this.isManualDisconnect = false;
        this.sessionRestored = false;
        
        logger.info('✅ Reset forçado concluído');
    }
    
    // Método para limpar sessões antigas e forçar novo QR
    async forceNewSession() {
        try {
            logger.info('🧹 Forçando nova sessão WhatsApp...');
            
            // Reset completo
            await this.disconnect();
            
            // Aguardar um pouco
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Limpar dados de sessão locais (se existirem)
            const fs = require('fs');
            const path = require('path');
            
            try {
                const sessionPath = path.join(process.cwd(), '.wwebjs_auth');
                if (fs.existsSync(sessionPath)) {
                    logger.info('🗑️ Removendo dados de sessão antiga...');
                    fs.rmSync(sessionPath, { recursive: true, force: true });
                    logger.info('✅ Dados de sessão removidos');
                }
            } catch (cleanupError) {
                logger.warn('⚠️ Erro ao limpar sessão antiga:', cleanupError.message);
            }
            
            // Aguardar mais um pouco
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Tentar conectar novamente
            return await this.initialize();
            
        } catch (error) {
            logger.error('❌ Erro ao forçar nova sessão:', error);
            return { success: false, message: error.message };
        }
    }
    
    // Método para teste rápido de conectividade
    async quickHealthCheck() {
        try {
            if (!this.isConnected || !this.client || this.isInitializing) {
                return { 
                    healthy: false, 
                    reason: 'Não conectado',
                    status: this.isInitializing ? 'Inicializando' : 'Desconectado'
                };
            }
            
            // Teste básico mais rápido
            const info = this.client.info;
            if (!info || !info.wid) {
                return { healthy: false, reason: 'Info do cliente indisponível' };
            }
            
            return { 
                healthy: true, 
                phone: info.wid.user,
                platform: info.platform,
                uptime: this.getConnectionUptime()
            };
            
        } catch (error) {
            return { healthy: false, reason: error.message };
        }
    }
    
    // Método para obter estatísticas detalhadas com Stability Engine
    getDetailedStats() {
        const basicStats = {
            ...this.getConnectionStatus(),
            strategies: {
                current: this.getReconnectStrategy(),
                maxAttempts: this.maxReconnectAttempts,
                nextResetIn: this.reconnectAttempts >= this.maxReconnectAttempts ? '10 minutos' : 'N/A'
            },
            timings: {
                lastConnection: this.lastSuccessfulConnection,
                uptime: this.getConnectionUptime(),
                heartbeatActive: !!this.heartbeatInterval
            },
            flags: {
                isManualDisconnect: this.isManualDisconnect || false,
                hasInitTimeout: !!this.initializationTimeout
            }
        };
        
        // Integrar estatísticas do Stability Engine se ativo
        if (this.stabilityEngineActive && this.stabilityEngine) {
            const engineStats = this.stabilityEngine.getEngineStats();
            return {
                ...basicStats,
                stabilityEngine: {
                    active: this.stabilityEngineActive,
                    ...engineStats
                }
            };
        }
        
        return {
            ...basicStats,
            stabilityEngine: {
                active: false,
                message: 'Stability Engine not active'
            }
        };
    }
    
    /**
     * STABILITY ENGINE CONTROL METHODS
     */
    
    // Ativar Stability Engine
    async activateStabilityEngine() {
        if (this.stabilityEngineActive) {
            logger.warn('⚠️ Stability Engine already active');
            return { success: false, message: 'Already active' };
        }
        
        try {
            await this.stabilityEngine.initialize();
            this.stabilityEngineActive = true;
            
            logger.info('🛡️ Stability Engine activated successfully');
            return { success: true, message: 'Stability Engine activated' };
            
        } catch (error) {
            logger.error('❌ Failed to activate Stability Engine:', error.message);
            return { success: false, message: error.message };
        }
    }
    
    // Desativar Stability Engine
    async deactivateStabilityEngine() {
        if (!this.stabilityEngineActive) {
            logger.warn('⚠️ Stability Engine not active');
            return { success: false, message: 'Not active' };
        }
        
        try {
            await this.stabilityEngine.shutdown();
            this.stabilityEngineActive = false;
            
            logger.info('🛡️ Stability Engine deactivated successfully');
            return { success: true, message: 'Stability Engine deactivated' };
            
        } catch (error) {
            logger.error('❌ Failed to deactivate Stability Engine:', error.message);
            return { success: false, message: error.message };
        }
    }
    
    // Forçar reconexão com Stability Engine
    async forceReconnectWithStability(reason = 'MANUAL') {
        if (!this.stabilityEngineActive) {
            logger.warn('⚠️ Stability Engine not active, using standard reconnection');
            return await this.attemptReconnect();
        }
        
        try {
            await this.stabilityEngine.forceReconnectWithStability(reason);
            return { success: true, message: 'Stability reconnection initiated' };
        } catch (error) {
            logger.error('❌ Stability reconnection failed:', error.message);
            return { success: false, message: error.message };
        }
    }
    
    // Obter estatísticas completas do engine
    getStabilityEngineStats() {
        if (!this.stabilityEngineActive || !this.stabilityEngine) {
            return {
                active: false,
                message: 'Stability Engine not active'
            };
        }
        
        return this.stabilityEngine.getEngineStats();
    }

    getConnectionStatus() {
        return {
            isConnected: this.isConnected,
            isConnecting: this.isConnecting,
            isInitializing: this.isInitializing,
            qrCode: this.qrCode,
            connectionInfo: this.connectionInfo,
            lastError: this.lastError,
            reconnectAttempts: this.reconnectAttempts,
            maxReconnectAttempts: this.maxReconnectAttempts,
            connectionAttempts: this.connectionAttempts,
            hasClient: !!this.client,
            hasHeartbeat: !!this.heartbeatInterval,
            uptime: this.getConnectionUptime(),
            lastSuccessfulConnection: this.lastSuccessfulConnection,
            healthStatus: this.isConnected ? 'Conectado' : this.isConnecting ? 'Conectando' : this.isInitializing ? 'Inicializando' : 'Desconectado',
            // Session restoration information
            restored: this.sessionRestored || false,
            sessionAge: this.getSessionAge()
        };
    }
    
    // Helper method to get session age
    getSessionAge() {
        try {
            const fs = require('fs');
            const path = require('path');
            
            const sessionPath = path.join(process.cwd(), '.wwebjs_auth');
            const clientSessionPath = path.join(sessionPath, 'session-bot-denuncias-sbc');
            
            if (fs.existsSync(clientSessionPath)) {
                const sessionStats = fs.statSync(clientSessionPath);
                const sessionAge = Date.now() - sessionStats.mtime.getTime();
                return Math.round(sessionAge / (60 * 60 * 1000)); // hours
            }
            
            return null;
        } catch (error) {
            return null;
        }
    }
    
    getConnectionUptime() {
        if (!this.connectionInfo || !this.connectionInfo.connectedAt) return 0;
        return Date.now() - this.connectionInfo.connectedAt.getTime();
    }

    /**
     * SESSION PERSISTENCE METHODS - CRITICAL FIX FOR QR CODE ISSUE
     */
    
    // Check if there's an existing valid session stored locally
    async checkExistingSession() {
        try {
            const fs = require('fs');
            const path = require('path');
            
            const sessionPath = path.join(process.cwd(), '.wwebjs_auth');
            const clientSessionPath = path.join(sessionPath, 'session-bot-denuncias-sbc');
            
            logger.info(`🔍 Verificando sessão existente em: ${sessionPath}`);
            
            // Check if session directory exists
            if (!fs.existsSync(sessionPath) || !fs.existsSync(clientSessionPath)) {
                logger.info('📂 Nenhuma sessão existente encontrada');
                return { 
                    hasValidSession: false, 
                    reason: 'Diretório de sessão não existe' 
                };
            }
            
            // Check session files
            const sessionFiles = fs.readdirSync(clientSessionPath);
            const hasSessionFiles = sessionFiles.length > 0;
            
            if (!hasSessionFiles) {
                logger.info('📁 Diretório de sessão vazio');
                return { 
                    hasValidSession: false, 
                    reason: 'Diretório de sessão vazio' 
                };
            }
            
            // Check session age (sessions older than 7 days should be considered invalid)
            const sessionStats = fs.statSync(clientSessionPath);
            const sessionAge = Date.now() - sessionStats.mtime.getTime();
            const maxSessionAge = 7 * 24 * 60 * 60 * 1000; // 7 days
            
            if (sessionAge > maxSessionAge) {
                logger.warn(`⏰ Sessão muito antiga (${Math.round(sessionAge / (24 * 60 * 60 * 1000))} dias), considerando inválida`);
                return { 
                    hasValidSession: false, 
                    reason: 'Sessão muito antiga' 
                };
            }
            
            logger.info(`✅ Sessão válida encontrada (${sessionFiles.length} arquivos, ${Math.round(sessionAge / (60 * 60 * 1000))} horas)`);
            return { 
                hasValidSession: true, 
                sessionPath: clientSessionPath,
                fileCount: sessionFiles.length,
                ageHours: Math.round(sessionAge / (60 * 60 * 1000))
            };
            
        } catch (error) {
            logger.error('❌ Erro ao verificar sessão existente:', error.message);
            return { 
                hasValidSession: false, 
                reason: `Erro: ${error.message}` 
            };
        }
    }
    
    // Restore an existing session without showing QR code
    async restoreExistingSession() {
        try {
            logger.info('🔄 Iniciando restauração de sessão existente...');
            
            // Set states for restoration
            this.isConnecting = true;
            this.isInitializing = true;
            this.lastError = null;
            this.qrCode = null; // Important: no QR code for session restoration
            
            // Destroy any existing client
            if (this.client) {
                try {
                    await Promise.race([
                        this.client.destroy(),
                        new Promise((_, reject) => 
                            setTimeout(() => reject(new Error('Destroy timeout')), 5000)
                        )
                    ]);
                } catch (destroyError) {
                    logger.warn('⚠️ Erro ao destruir cliente anterior:', destroyError.message);
                }
                this.client = null;
            }
            
            // Wait a bit for cleanup
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Get robust config
            const robustConfig = getRobustConfig();
            robustConfig.authStrategy = new LocalAuth({
                clientId: 'bot-denuncias-sbc'
            });
            validateConfig(robustConfig);
            
            logger.info('🔧 Criando cliente para restauração de sessão...');
            this.client = new Client(robustConfig);
            this.setupEventListeners();
            
            // Initialize with session restoration timeout (shorter than new connection)
            const initializePromise = this.client.initialize();
            const timeoutPromise = new Promise((_, reject) => {
                this.initializationTimeout = setTimeout(() => {
                    logger.error('⏰ Timeout na restauração de sessão após 45 segundos');
                    reject(new Error('Session restoration timeout'));
                }, 45000); // 45 seconds for session restoration
            });
            
            try {
                await Promise.race([initializePromise, timeoutPromise]);
                
                // If we get here without QR code, session was restored successfully
                if (this.initializationTimeout) {
                    clearTimeout(this.initializationTimeout);
                    this.initializationTimeout = null;
                }
                
                logger.info('✅ Sessão restaurada com sucesso!');
                this.sessionRestored = true; // Mark session as restored
                return { 
                    success: true, 
                    message: 'Sessão restaurada automaticamente',
                    restored: true 
                };
                
            } catch (error) {
                logger.warn('⚠️ Falha na restauração da sessão:', error.message);
                
                if (this.initializationTimeout) {
                    clearTimeout(this.initializationTimeout);
                    this.initializationTimeout = null;
                }
                
                // Reset states for fresh connection
                this.isInitializing = false;
                this.isConnecting = false;
                
                return { 
                    success: false, 
                    message: 'Falha na restauração da sessão',
                    restored: false 
                };
            }
            
        } catch (error) {
            logger.error('❌ Erro na restauração de sessão:', error.message);
            this.isInitializing = false;
            this.isConnecting = false;
            
            return { 
                success: false, 
                message: `Erro na restauração: ${error.message}`,
                restored: false 
            };
        }
    }
    
    // Validate if current session is still healthy
    async validateCurrentSession() {
        try {
            if (!this.isConnected || !this.client) {
                return { valid: false, reason: 'Não conectado' };
            }
            
            // Quick health check
            const healthCheck = await this.quickHealthCheck();
            if (!healthCheck.healthy) {
                return { valid: false, reason: healthCheck.reason };
            }
            
            // Try to get account info as validation
            try {
                const info = this.client.info;
                if (!info || !info.wid) {
                    return { valid: false, reason: 'Info da conta indisponível' };
                }
                
                return { 
                    valid: true, 
                    phone: info.wid.user,
                    platform: info.platform 
                };
                
            } catch (infoError) {
                return { valid: false, reason: `Erro ao obter info: ${infoError.message}` };
            }
            
        } catch (error) {
            return { valid: false, reason: `Erro na validação: ${error.message}` };
        }
    }
    
    // Initialize with automatic session restoration for system startup
    async initializeWithSessionRestore() {
        try {
            logger.info('🔄 Iniciando WhatsApp com restauração automática de sessão...');
            
            // Check if already connected
            if (this.isConnected) {
                logger.info('✅ WhatsApp já está conectado');
                return { success: true, message: 'Já conectado', restored: false };
            }
            
            // Check for existing session
            const sessionCheck = await this.checkExistingSession();
            
            if (sessionCheck.hasValidSession) {
                logger.info('🔍 Sessão válida encontrada, tentando restaurar automaticamente...');
                
                const restoreResult = await this.restoreExistingSession();
                
                if (restoreResult.success) {
                    logger.info('✅ Sessão restaurada automaticamente no startup!');
                    this.sessionRestored = true; // Mark session as restored
                    return {
                        success: true,
                        message: 'Sessão restaurada automaticamente',
                        restored: true,
                        sessionInfo: sessionCheck
                    };
                } else {
                    logger.warn('⚠️ Falha na restauração automática, aguardando QR manual');
                    return {
                        success: false,
                        message: 'Falha na restauração automática da sessão',
                        restored: false,
                        requiresQR: true
                    };
                }
            } else {
                logger.info('📱 Nenhuma sessão válida encontrada, aguardando conexão manual');
                return {
                    success: false,
                    message: 'Nenhuma sessão encontrada - conexão manual necessária',
                    restored: false,
                    requiresQR: true,
                    reason: sessionCheck.reason
                };
            }
            
        } catch (error) {
            logger.error('❌ Erro na inicialização com restauração:', error.message);
            return {
                success: false,
                message: `Erro na inicialização: ${error.message}`,
                restored: false,
                requiresQR: true
            };
        }
    }
    
    // Monitor session health during heartbeat
    async monitorSessionHealth() {
        try {
            // Check session validation
            const sessionValidation = await this.validateCurrentSession();
            
            if (!sessionValidation.valid) {
                logger.warn(`⚠️ Sessão não está válida: ${sessionValidation.reason}`);
                return;
            }
            
            // Check session age and warn if getting old (> 5 days)
            const sessionAge = this.getSessionAge();
            if (sessionAge && sessionAge > 120) { // 5 days in hours
                logger.warn(`⏰ Sessão está ficando antiga (${Math.round(sessionAge/24)} dias). Considere reconectar em breve.`);
            }
            
            // Log healthy session periodically (every 10 heartbeats = ~7.5 minutes)
            this.sessionHealthCheckCount = (this.sessionHealthCheckCount || 0) + 1;
            if (this.sessionHealthCheckCount % 10 === 0) {
                logger.info(`💚 Sessão WhatsApp saudável - Idade: ${sessionAge ? Math.round(sessionAge) + 'h' : 'N/A'}, Telefone: ${sessionValidation.phone || 'N/A'}`);
            }
            
        } catch (error) {
            logger.warn('Erro no monitoramento de sessão:', error.message);
        }
    }
    
    // Check if there's an opportunity to restore session when disconnected
    async checkSessionRestorationOpportunity() {
        try {
            // Only check every 5 minutes to avoid spam
            const now = Date.now();
            this.lastSessionRestorationCheck = this.lastSessionRestorationCheck || 0;
            
            if (now - this.lastSessionRestorationCheck < 5 * 60 * 1000) {
                return; // Too soon
            }
            
            this.lastSessionRestorationCheck = now;
            
            // Check if there's a valid session
            const sessionCheck = await this.checkExistingSession();
            
            if (sessionCheck.hasValidSession) {
                logger.info('🔍 Oportunidade de restauração de sessão detectada durante heartbeat');
                
                // Only attempt if we've been disconnected for a while (to avoid conflicts)
                if (this.lastSuccessfulConnection) {
                    const timeSinceLastConnection = now - this.lastSuccessfulConnection.getTime();
                    
                    if (timeSinceLastConnection > 5 * 60 * 1000) { // 5 minutes
                        logger.info('⚡ Tentando restauração automática de sessão...');
                        
                        const restoreResult = await this.initializeWithSessionRestore();
                        
                        if (restoreResult.success && restoreResult.restored) {
                            logger.info('✅ Sessão restaurada automaticamente pelo heartbeat!');
                        } else {
                            logger.info('ℹ️ Restauração automática falhou, aguardando intervenção manual');
                        }
                    }
                }
            }
            
        } catch (error) {
            logger.warn('Erro ao verificar oportunidade de restauração:', error.message);
        }
    }
    
    async checkConnectionHealth() {
        try {
            if (!this.client || !this.isConnected || this.isInitializing) {
                return { healthy: false, reason: 'Cliente não conectado ou inicializando' };
            }
            
            // Teste mais abrangente de conectividade
            const tests = [];
            
            // Teste 1: Estado do cliente
            const statePromise = Promise.race([
                this.client.getState(),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('State timeout')), 8000)
                )
            ]);
            tests.push(statePromise);
            
            try {
                const state = await statePromise;
                
                if (state !== 'CONNECTED') {
                    return { healthy: false, reason: `Estado: ${state}` };
                }
                
                // Teste 2: Verificar se pode obter informações básicas
                try {
                    const info = this.client.info;
                    if (!info || !info.wid) {
                        return { healthy: false, reason: 'Informações do cliente indisponíveis' };
                    }
                } catch (infoError) {
                    return { healthy: false, reason: `Erro ao obter info: ${infoError.message}` };
                }
                
                // Teste 3: Verificar uptime da conexão
                if (this.lastSuccessfulConnection) {
                    const uptime = Date.now() - this.lastSuccessfulConnection.getTime();
                    if (uptime < 10000) { // Menos de 10 segundos, pode estar instável
                        return { healthy: true, state, warning: 'Conexão recente' };
                    }
                }
                
                return { healthy: true, state, uptime: this.getConnectionUptime() };
                
            } catch (error) {
                return { healthy: false, reason: `Teste de estado falhou: ${error.message}` };
            }
            
        } catch (error) {
            return { healthy: false, reason: `Health check error: ${error.message}` };
        }
    }

    async getAccountInfo() {
        try {
            if (!this.isConnected || !this.client) {
                return null;
            }

            const info = this.client.info;
            const chats = await this.client.getChats();
            const contacts = await this.client.getContacts();

            return {
                phone: info.wid.user,
                pushname: info.pushname,
                platform: info.platform,
                connectedAt: this.connectionInfo?.connectedAt,
                totalChats: chats.length,
                totalContacts: contacts.length,
                battery: info.battery || 'N/A',
                plugged: info.plugged || false
            };
        } catch (error) {
            logger.error('Erro ao obter informações da conta:', error);
            return null;
        }
    }

    async sendTestMessage(phoneNumber, message = 'Teste de conexão do Bot de Denúncias Cidadãs 🤖') {
        try {
            if (!this.isConnected || !this.client) {
                throw new Error('WhatsApp não está conectado');
            }

            // Formatar número
            const formattedNumber = phoneNumber.includes('@') ? phoneNumber : `${phoneNumber}@c.us`;
            
            await this.client.sendMessage(formattedNumber, message);
            
            logger.info(`Mensagem de teste enviada para ${phoneNumber}`);
            return { success: true, message: 'Mensagem enviada com sucesso' };
        } catch (error) {
            logger.error('Erro ao enviar mensagem de teste:', error);
            return { success: false, message: error.message };
        }
    }

    async handleMessage(message) {
        const from = message.from;
        const body = message.body.trim(); // Manter case original para processamento, mas usar lower para comparação de comandos
        const lowerBody = body.toLowerCase();
        const messageType = message.type;

        console.log(`📱 Mensagem recebida de ${from}: "${body}" (tipo: ${messageType})`);

        try {
            let conversa = await prisma.conversaUsuario.findUnique({
                where: { phoneNumber: from },
            });

            if (!conversa) {
                conversa = await this.criarNovaConversa(from);
                // Enviar menu principal para nova conversa
                await this.enviarMenuPrincipal(from);
                return; // Primeira interação é apenas o menu
            } else {
                // Verificar timeout da conversa baseado na última interação
                const now = new Date();
                const tempoInativo = now.getTime() - conversa.ultimaInteracao.getTime();
                const minutosInativo = Math.round(tempoInativo/1000/60);
                
                console.log(`📊 Conversa existente - Estado: ${conversa.estado}, Inativa por: ${minutosInativo} min, Timeout: ${TIMEOUT_CONVERSA/1000/60} min`);
                
                if (tempoInativo > TIMEOUT_CONVERSA) {
                    console.log(`⏰ Conversa expirada para ${from}, inativa por ${minutosInativo} minutos`);
                    await this.client.sendMessage(from, MESSAGES.CONVERSA_EXPIRADA);
                    
                    // Deletar conversa antiga antes de criar nova
                    await prisma.conversaUsuario.delete({
                        where: { id: conversa.id }
                    });
                    
                    conversa = await this.criarNovaConversa(from);
                    // Enviar menu após reset por timeout
                    await this.enviarMenuPrincipal(from);
                    return;
                } else {
                    // Estender o expiresAt sempre que houver interação
                    const novoExpiresAt = new Date(now.getTime() + TIMEOUT_CONVERSA);
                    await prisma.conversaUsuario.update({
                        where: { id: conversa.id },
                        data: { 
                            ultimaInteracao: now,
                            expiresAt: novoExpiresAt
                        },
                    });
                    console.log(`🔄 Conversa atualizada, novo timeout em ${new Date(novoExpiresAt).toLocaleTimeString()}`);
                }
            }

            // Conversa agora já tem ultimaInteracao definida

            switch (conversa.estado) {
                case ESTADOS_CONVERSA.INICIAL:
                    await this.handleEstadoInicial(conversa, lowerBody, message);
                    break;
                case ESTADOS_CONVERSA.SELECIONANDO_CATEGORIA:
                    await this.handleSelecionandoCategoria(conversa, message);
                    break;
                case ESTADOS_CONVERSA.SELECIONANDO_SUBCATEGORIA:
                    await this.handleSelecionandoSubcategoria(conversa, message);
                    break;
                case ESTADOS_CONVERSA.AGUARDANDO_PROBLEMA:
                    await this.handleAguardandoProblema(conversa, body);
                    break;
                case ESTADOS_CONVERSA.AGUARDANDO_ENDERECO:
                    await this.handleAguardandoEndereco(conversa, body);
                    break;
                case ESTADOS_CONVERSA.AGUARDANDO_FOTO:
                    await this.handleAguardandoFoto(conversa, message);
                    break;
                case ESTADOS_CONVERSA.AGUARDANDO_CONFIRMACAO:
                    await this.handleAguardandoConfirmacao(conversa, lowerBody, message);
                    break;
                case ESTADOS_CONVERSA.DENUNCIA_PROCESSADA:
                    await this.handleDenunciaProcessada(conversa, lowerBody, message);
                    break;
                case ESTADOS_CONVERSA.FINALIZADO:
                    await this.handleAtendimentoFinalizado(conversa, message);
                    break;
                // Outros estados serão implementados nas próximas etapas
                default:
                    // Resposta padrão para estados não implementados ou inesperados
                    await this.client.sendMessage(from, MESSAGES.ERRO_GERAL);
                    await this.enviarMenuPrincipal(from);
                    break;
            }

        } catch (error) {
            console.error("Erro ao processar mensagem:", error);
            await this.client.sendMessage(from, MESSAGES.ERRO_GERAL);
        }
    }

    async handleEstadoInicial(conversa, messageBody, message) {
        const from = conversa.phoneNumber;
        
        // Verificar se é resposta de interação com List ou Button
        if (message.selectedListId || message.selectedButtonId) {
            const selectedId = message.selectedListId || message.selectedButtonId;
            
            if (selectedId === 'fazer_denuncia') {
                await this.enviarListaCategorias(from, conversa.id);
                return;
            } else if (selectedId === 'minhas_denuncias') {
                await prisma.conversaUsuario.update({
                    where: { id: conversa.id },
                    data: { estado: ESTADOS_CONVERSA.CONSULTANDO_STATUS },
                });
                await this.client.sendMessage(from, MESSAGES.CONSULTA_STATUS.replace('{lista_denuncias}', 'Nenhuma denúncia encontrada.'));
                return;
            } else if (selectedId === 'bairros_atendidos') {
                await this.client.sendMessage(from, 'Lista de bairros atendidos: (Funcionalidade em desenvolvimento)');
                await this.enviarMenuPrincipal(from);
                return;
            } else if (selectedId === 'ajuda') {
                await this.client.sendMessage(from, MESSAGES.AJUDA_COMPLETA);
                await this.enviarMenuPrincipal(from);
                return;
            }
        }
        
        // Fallback para texto simples (compatibilidade)
        if (messageBody.includes('denúncia') || messageBody.includes('fazer denúncia') || messageBody === '1') {
            await this.enviarListaCategorias(from, conversa.id);
        } else if (messageBody.includes('minhas denúncias') || messageBody === '2') {
            await prisma.conversaUsuario.update({
                where: { id: conversa.id },
                data: { estado: ESTADOS_CONVERSA.CONSULTANDO_STATUS },
            });
            await this.client.sendMessage(from, MESSAGES.CONSULTA_STATUS.replace('{lista_denuncias}', 'Nenhuma denúncia encontrada.'));
        } else if (messageBody.includes('bairros atendidos') || messageBody === '3') {
            await this.client.sendMessage(from, 'Lista de bairros atendidos: (Funcionalidade em desenvolvimento)');
            await this.enviarMenuPrincipal(from);
        } else if (messageBody.includes('ajuda') || messageBody === '4') {
            await this.client.sendMessage(from, MESSAGES.AJUDA_COMPLETA);
            await this.enviarMenuPrincipal(from);
        } else {
            await this.client.sendMessage(from, MESSAGES.FORMATO_INVALIDO.replace('{instrucao_especifica}', 'Por favor, selecione uma opção válida do menu.'));
            await this.enviarMenuPrincipal(from);
        }
    }

    async handleAguardandoProblema(conversa, messageBody) {
        const from = conversa.phoneNumber;
        const { filteredText, score, rejected, moderationDetails } = textFilterService.analyze(messageBody);

        if (rejected) {
            await this.client.sendMessage(from, `❌ *Conteúdo inadequado detectado.*\n${moderationDetails.join('\n')}\nPor favor, tente novamente com uma descrição mais apropriada.`);
            await prisma.conversaUsuario.update({
                where: { id: conversa.id },
                data: { estado: ESTADOS_CONVERSA.INICIAL },
            });
            await this.enviarMenuPrincipal(from);
            return;
        }

        if (messageBody.length > 10) { // Validação simples: problema deve ter mais de 10 caracteres
            await prisma.conversaUsuario.update({
                where: { id: conversa.id },
                data: { 
                    estado: ESTADOS_CONVERSA.AGUARDANDO_ENDERECO,
                    problemaTemp: filteredText, // Salva o texto filtrado
                    dadosTemp: { ...conversa.dadosTemp, scoreBot: score, motivoRejeicaoBot: moderationDetails.join('\n') } // Salva score e detalhes
                },
            });
            // Construir mensagem do endereço incluindo categoria se disponível
            let mensagemEndereco = MESSAGES.SOLICITAR_ENDERECO.replace('{problema}', filteredText);
            
            if (conversa.dadosTemp?.categoriaCompleta) {
                mensagemEndereco = `🚨 *NOVA DENÚNCIA - PASSO 4/4*

✅ *Tipo:* ${conversa.dadosTemp.categoriaCompleta}
✅ *Descrição:* "${filteredText}"

📍 Agora preciso do *endereço COMPLETO* onde está o problema:

💡 *Exemplo:* Rua das Flores, 123 - Centro - São Bernardo do Campo`;
            }
            
            await this.client.sendMessage(from, mensagemEndereco);
        } else {
            await this.client.sendMessage(from, MESSAGES.FORMATO_INVALIDO.replace('{instrucao_especifica}', 'Por favor, descreva o problema com mais detalhes (mínimo 10 caracteres).'));
        }
    }

    async handleAguardandoEndereco(conversa, messageBody) {
        const from = conversa.phoneNumber;
        const { bairro, encontrado, sugestoes } = await geoService.parseAddress(messageBody);

        if (encontrado) {
            await prisma.conversaUsuario.update({
                where: { id: conversa.id },
                data: {
                    estado: ESTADOS_CONVERSA.AGUARDANDO_FOTO,
                    enderecoTemp: messageBody,
                    bairroTemp: bairro,
                },
            });
            // Construir mensagem de confirmação de endereço incluindo categoria
            let mensagemEnderecoAceito;
            if (conversa.dadosTemp?.categoriaCompleta) {
                mensagemEnderecoAceito = `✅ *ENDEREÇO CONFIRMADO*

🚨 *Tipo:* ${conversa.dadosTemp.categoriaCompleta}
📝 *Descrição:* "${conversa.problemaTemp}"
📍 *Endereço:* ${messageBody}
🏘️ *Bairro identificado:* ${bairro}

📸 *Agora envie uma FOTO do problema para finalizar sua denúncia:*

💡 *Dica:* A foto ajuda os vereadores a entenderem melhor a situação.`;
            } else {
                mensagemEnderecoAceito = MESSAGES.ENDERECO_ACEITO
                    .replace('{problema}', conversa.problemaTemp)
                    .replace('{endereco}', messageBody)
                    .replace('{bairro}', bairro);
            }
            
            await this.client.sendMessage(from, mensagemEnderecoAceito);
        } else {
            let sugestoesMsg = sugestoes.length > 0 ? sugestoes.map(s => `- ${s}`).join('\n') : 'Nenhuma sugestão encontrada.';
            await this.client.sendMessage(from, MESSAGES.BAIRRO_NAO_ENCONTRADO
                .replace('{bairro_informado}', messageBody)
                .replace('{sugestoes_bairros}', sugestoesMsg));
            // Permanece no estado AGUARDANDO_ENDERECO para nova tentativa
        }
    }

    async handleAguardandoFoto(conversa, message) {
        const from = conversa.phoneNumber;

        if (message.hasMedia && message.type === 'image') {
            try {
                // Processar upload real da imagem usando uploadService
                const media = await message.downloadMedia();
                const fileBuffer = Buffer.from(media.data, 'base64');
                const mimeType = media.mimetype;
                
                const uploadResult = await uploadService.processWhatsAppImage(
                    fileBuffer, 
                    mimeType, 
                    `denuncia-${conversa.id}-${Date.now()}`
                );
                
                const imageUrl = uploadResult.url;

                // Busca vereadores com base no bairro temporário
                const vereadores = await vereadorService.selecionarParaDenuncia(conversa.bairroTemp);
                const listaVereadores = vereadores.map(v => `@${v.instagram.replace('@', '')}`).join(', ');

                await prisma.conversaUsuario.update({
                    where: { id: conversa.id },
                    data: {
                        estado: ESTADOS_CONVERSA.AGUARDANDO_CONFIRMACAO,
                        imagemTemp: imageUrl,
                        dadosTemp: { 
                            ...conversa.dadosTemp, 
                            vereadoresMencionados: vereadores.map(v => v.instagram),
                            uploadInfo: {
                                filename: uploadResult.filename,
                                size: uploadResult.size,
                                thumbnailUrl: uploadResult.thumbnailUrl
                            }
                        }
                    },
                });

                // Construir mensagem de confirmação incluindo categoria
                let mensagemConfirmacao;
                if (conversa.dadosTemp?.categoriaCompleta) {
                    mensagemConfirmacao = `📋 *CONFIRME SUA DENÚNCIA*

🚨 *Tipo:* ${conversa.dadosTemp.categoriaCompleta}
📝 *Descrição:* "${conversa.problemaTemp}"
📍 *Endereço:* ${conversa.enderecoTemp}
🏘️ *Bairro:* ${conversa.bairroTemp}
📸 *Foto:* Recebida ✅ (${Math.round(uploadResult.size/1024)}KB)

👥 *Vereadores que serão mencionados:*
${listaVereadores}`;
                } else {
                    mensagemConfirmacao = MESSAGES.CONFIRMACAO_DENUNCIA
                        .replace('{problema}', conversa.problemaTemp)
                        .replace('{endereco}', conversa.enderecoTemp)
                        .replace('{bairro}', conversa.bairroTemp)
                        .replace('{lista_vereadores}', listaVereadores);
                }

                await this.client.sendMessage(from, mensagemConfirmacao);

                // Enviar opções de confirmação em texto
                const confirmationMessage = `*Escolha uma opção digitando o número:*
1️⃣ Confirmar e Enviar
2️⃣ Editar
3️⃣ Cancelar

Digite 1, 2 ou 3.`;
                await this.client.sendMessage(from, confirmationMessage);

            } catch (uploadError) {
                console.error('❌ Erro ao processar upload da imagem:', uploadError);
                await this.client.sendMessage(from, 
                    `❌ *Erro ao processar a imagem*
                    
Não foi possível processar sua foto. Tente novamente com uma imagem menor ou de melhor qualidade.

💡 *Dicas:*
• Verifique se a imagem não está corrompida
• Tente uma foto com tamanho menor que 5MB
• Certifique-se de que é uma imagem válida (JPG/PNG)`);
            }
        } else {
            await this.client.sendMessage(from, MESSAGES.FORMATO_INVALIDO.replace('{instrucao_especifica}', 'Por favor, envie uma imagem do problema.'));
        }
    }

    async handleAguardandoConfirmacao(conversa, messageBody, message) {
        const from = conversa.phoneNumber;
        
        // Verificar botões interativos primeiro
        if (message?.selectedButtonId) {
            const selectedId = message.selectedButtonId;
            
            if (selectedId === 'confirmar_enviar') {
                await this.processarConfirmacaoDenuncia(conversa, from);
                return;
            } else if (selectedId === 'editar_denuncia') {
                await this.reiniciarFluxoDenuncia(conversa, from);
                return;
            } else if (selectedId === 'cancelar_denuncia') {
                await this.cancelarDenuncia(conversa, from);
                return;
            }
        }
        
        // Processar por número ou texto
        const numero = parseInt(messageBody.trim());
        
        if (numero === 1 || messageBody.includes('confirmar') || messageBody.includes('enviar')) {
            await this.processarConfirmacaoDenuncia(conversa, from);
        } else if (numero === 2 || messageBody.includes('editar')) {
            await this.reiniciarFluxoDenuncia(conversa, from);
        } else if (numero === 3 || messageBody.includes('cancelar')) {
            await this.cancelarDenuncia(conversa, from);
        } else {
            await this.client.sendMessage(from, MESSAGES.FORMATO_INVALIDO.replace('{instrucao_especifica}', 'Por favor, digite 1 para Confirmar, 2 para Editar ou 3 para Cancelar.'));
        }
    }

    async processarConfirmacaoDenuncia(conversa, from) {
        try {
            const protocolo = this.gerarProtocolo();
            const now = new Date();

            // Incluir dados das categorias selecionadas na denúncia
            const dadosCompletos = {
                ...conversa.dadosTemp,
                vereadoresMencionados: conversa.dadosTemp?.vereadoresMencionados || [],
                categoriaEscolhida: conversa.dadosTemp?.categoriaSelecionada,
                subcategoriaEscolhida: conversa.dadosTemp?.subcategoriaSelecionada,
                tipoCompleto: conversa.dadosTemp?.categoriaCompleta
            };

            const novaDenuncia = await prisma.denuncia.create({
                data: {
                    protocolo: protocolo,
                    texto: conversa.problemaTemp,
                    textoFiltrado: conversa.problemaTemp, // Será processado pelo worker
                    endereco: conversa.enderecoTemp,
                    bairro: conversa.bairroTemp,
                    imagemUrl: conversa.imagemTemp,
                    status: 'RECEBIDA', // Status inicial
                    vereadores: dadosCompletos.vereadoresMencionados,
                    conversaCompleta: dadosCompletos,
                    tempoConversa: Math.floor((now.getTime() - conversa.createdAt.getTime()) / (1000 * 60)),
                    phoneNumber: from,
                },
            });

            // Adicionar à fila de processamento
            await processQueue.add('process-denuncia', {
                denunciaId: novaDenuncia.id
            }, {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 2000
                }
            });

            logger.info(`Denúncia ${protocolo} adicionada à fila de processamento`);

            await prisma.conversaUsuario.update({
                where: { id: conversa.id },
                data: { estado: ESTADOS_CONVERSA.DENUNCIA_PROCESSADA },
            });

            await this.client.sendMessage(from, MESSAGES.DENUNCIA_ENVIADA
                .replace('{protocolo}', protocolo)
                .replace('{data_hora}', now.toLocaleString('pt-BR')));

            // Aguardar 3 segundos antes de enviar mensagem de agradecimento
            setTimeout(async () => {
                try {
                    // Enviar mensagem de agradecimento e finalizar atendimento
                    await this.client.sendMessage(from, MESSAGES.AGRADECIMENTO_FINAL);
                    
                    // Atualizar estado para FINALIZADO
                    await prisma.conversaUsuario.update({
                        where: { id: conversa.id },
                        data: { estado: ESTADOS_CONVERSA.FINALIZADO },
                    });
                    
                    // Agendar limpeza da conversa em 5 minutos
                    setTimeout(async () => {
                        try {
                            await prisma.conversaUsuario.delete({
                                where: { id: conversa.id }
                            });
                            logger.info(`🧹 Conversa finalizada removida automaticamente: ${from}`);
                        } catch (error) {
                            logger.warn(`⚠️ Erro ao remover conversa finalizada: ${error.message}`);
                        }
                    }, 5 * 60 * 1000); // 5 minutos
                    
                    logger.info(`✅ Atendimento finalizado automaticamente para ${from} - Protocolo: ${protocolo}`);
                    
                } catch (error) {
                    logger.error(`❌ Erro ao finalizar atendimento para ${from}:`, error);
                }
            }, 3000); // 3 segundos

        } catch (error) {
            console.error('Erro ao processar confirmação da denúncia:', error);
            await this.client.sendMessage(from, MESSAGES.ERRO_GERAL);
        }
    }

    async reiniciarFluxoDenuncia(conversa, from) {
        try {
            await prisma.conversaUsuario.update({
                where: { id: conversa.id },
                data: { estado: ESTADOS_CONVERSA.INICIAL },
            });
            await this.client.sendMessage(from, 'Ok, vamos editar sua denúncia. Por favor, comece novamente.');
            await this.enviarMenuPrincipal(from);
        } catch (error) {
            console.error('Erro ao reiniciar fluxo de denúncia:', error);
            await this.client.sendMessage(from, MESSAGES.ERRO_GERAL);
        }
    }

    async cancelarDenuncia(conversa, from) {
        try {
            await prisma.conversaUsuario.delete({
                where: { id: conversa.id },
            });
            await this.client.sendMessage(from, 'Denúncia cancelada. Se precisar, inicie uma nova conversa.');
        } catch (error) {
            console.error('Erro ao cancelar denúncia:', error);
            await this.client.sendMessage(from, MESSAGES.ERRO_GERAL);
        }
    }

    async handleDenunciaProcessada(conversa, messageBody, message) {
        const from = conversa.phoneNumber;
        
        // Verificar botões interativos primeiro
        if (message?.selectedButtonId) {
            const selectedId = message.selectedButtonId;
            
            if (selectedId === 'nova_denuncia') {
                await prisma.conversaUsuario.update({
                    where: { id: conversa.id },
                    data: { estado: ESTADOS_CONVERSA.INICIAL },
                });
                await this.enviarMenuPrincipal(from);
                return;
            } else if (selectedId === 'ver_status') {
                await this.client.sendMessage(from, 'Funcionalidade de consulta de status em desenvolvimento.');
                await this.enviarMenuPrincipal(from);
                return;
            } else if (selectedId === 'menu_principal_final') {
                await prisma.conversaUsuario.update({
                    where: { id: conversa.id },
                    data: { estado: ESTADOS_CONVERSA.INICIAL },
                });
                await this.enviarMenuPrincipal(from);
                return;
            }
        }
        
        // Processar por número ou texto
        const numero = parseInt(messageBody.trim());
        
        if (numero === 1 || messageBody.includes('nova denúncia') || messageBody.includes('nova denuncia')) {
            await prisma.conversaUsuario.update({
                where: { id: conversa.id },
                data: { estado: ESTADOS_CONVERSA.INICIAL },
            });
            await this.enviarMenuPrincipal(from);
        } else if (numero === 2 || messageBody.includes('ver status') || messageBody.includes('status')) {
            await this.client.sendMessage(from, 'Funcionalidade de consulta de status em desenvolvimento.');
            await this.enviarMenuPrincipal(from);
        } else if (numero === 3 || messageBody.includes('menu principal') || messageBody.includes('menu')) {
            await prisma.conversaUsuario.update({
                where: { id: conversa.id },
                data: { estado: ESTADOS_CONVERSA.INICIAL },
            });
            await this.enviarMenuPrincipal(from);
        } else {
            await this.client.sendMessage(from, MESSAGES.FORMATO_INVALIDO.replace('{instrucao_especifica}', 'Por favor, digite 1 para Nova Denúncia, 2 para Ver Status ou 3 para Menu Principal.'));
        }
    }

    async handleAtendimentoFinalizado(conversa, message) {
        const from = conversa.phoneNumber;
        
        try {
            // Informar que o atendimento foi encerrado
            await this.client.sendMessage(from, `📞 *Atendimento Encerrado*\n\nSeu atendimento foi finalizado com sucesso!\n\n💬 Para iniciar um novo atendimento, envie qualquer mensagem.`);
            
            // Remover a conversa para permitir nova interação
            await prisma.conversaUsuario.delete({
                where: { id: conversa.id }
            });
            
            logger.info(`🔄 Usuário ${from} tentou interagir após finalização - conversa resetada`);
            
            // Aguardar um pouco e iniciar nova conversa
            setTimeout(async () => {
                try {
                    const novaConversa = await this.criarNovaConversa(from);
                    await this.enviarMenuPrincipal(from);
                } catch (error) {
                    logger.error(`❌ Erro ao reiniciar conversa para ${from}:`, error);
                }
            }, 2000);
            
        } catch (error) {
            logger.error(`❌ Erro ao processar atendimento finalizado para ${from}:`, error);
            // Fallback: remover conversa e permitir reinício
            try {
                await prisma.conversaUsuario.delete({
                    where: { id: conversa.id }
                });
            } catch (deleteError) {
                logger.error(`❌ Erro ao deletar conversa finalizada:`, deleteError);
            }
        }
    }

    gerarProtocolo() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 7);
        return `DEN-${timestamp}-${random}`.toUpperCase();
    }

    // Função para limpar conversas expiradas (executada periodicamente)
    async cleanupExpiredConversations() {
        try {
            const now = new Date();
            
            // Buscar conversas que realmente expiraram
            const conversasExpiradas = await prisma.conversaUsuario.findMany({
                where: {
                    expiresAt: {
                        lt: now
                    }
                },
                select: {
                    id: true,
                    phoneNumber: true,
                    estado: true,
                    expiresAt: true,
                    ultimaInteracao: true
                }
            });
            
            if (conversasExpiradas.length > 0) {
                console.log(`🧹 Limpando ${conversasExpiradas.length} conversas expiradas:`);
                conversasExpiradas.forEach(conv => {
                    const minutosExpirados = Math.round((now.getTime() - conv.expiresAt.getTime()) / 1000 / 60);
                    console.log(`  - ${conv.phoneNumber} (${conv.estado}) expirou há ${minutosExpirados} min`);
                });
                
                await prisma.conversaUsuario.deleteMany({
                    where: {
                        id: {
                            in: conversasExpiradas.map(c => c.id)
                        }
                    }
                });
                
                console.log(`✅ ${conversasExpiradas.length} conversas expiradas removidas`);
            } else {
                console.log('🧹 Nenhuma conversa expirada para limpar');
            }
        } catch (error) {
            console.error('❌ Erro na limpeza de conversas:', error);
        }
    }

    async criarNovaConversa(phoneNumber) {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + TIMEOUT_CONVERSA);
        
        console.log(`Criando nova conversa para ${phoneNumber}`);
        
        return prisma.conversaUsuario.create({
            data: {
                phoneNumber,
                estado: 'INICIAL',
                expiresAt,
                ultimaInteracao: now,
                createdAt: now,
                updatedAt: now
            },
        });
    }

    async enviarMenuPrincipal(to) {
        try {
            const menuMessage = `${MESSAGES.BEM_VINDO}

*Escolha uma opção digitando o número:*
1️⃣ Fazer Denúncia
2️⃣ Minhas Denúncias  
3️⃣ Bairros Atendidos
4️⃣ Ajuda

Digite o número da opção desejada (1, 2, 3 ou 4).`;

            await this.client.sendMessage(to, menuMessage);
        } catch (error) {
            console.error('Erro ao enviar menu principal:', error);
            await this.client.sendMessage(to, 'Digite "Olá" para ver o menu.');
        }
    }

    async enviarListaCategorias(to, conversaId) {
        try {
            await prisma.conversaUsuario.update({
                where: { id: conversaId },
                data: { estado: ESTADOS_CONVERSA.SELECIONANDO_CATEGORIA },
            });

            let mensagem = `🚨 *NOVA DENÚNCIA - PASSO 1/4*

📋 Selecione a categoria digitando o número:

`;

            const categorias = Object.entries(CATEGORIAS_DENUNCIA);
            categorias.forEach(([key, categoria], index) => {
                mensagem += `${index + 1}️⃣ **${categoria.titulo}**
`;
            });

            mensagem += `
Digite o número da categoria (1 a ${categorias.length}).`;

            await this.client.sendMessage(to, mensagem);
        } catch (error) {
            console.error('Erro ao enviar categorias:', error);
            await this.client.sendMessage(to, MESSAGES.ERRO_GERAL);
        }
    }

    async handleSelecionandoCategoria(conversa, message) {
        const from = conversa.phoneNumber;
        
        try {
            const numeroCategoria = parseInt(message.body?.trim());
            const categorias = Object.entries(CATEGORIAS_DENUNCIA);
            
            if (numeroCategoria >= 1 && numeroCategoria <= categorias.length) {
                const [categoriaKey, categoria] = categorias[numeroCategoria - 1];
                
                await prisma.conversaUsuario.update({
                    where: { id: conversa.id },
                    data: { 
                        estado: ESTADOS_CONVERSA.SELECIONANDO_SUBCATEGORIA,
                        dadosTemp: { 
                            ...conversa.dadosTemp, 
                            categoriaSelecionada: categoriaKey,
                            categoriaTitulo: categoria.titulo
                        }
                    },
                });

                await this.enviarListaSubcategorias(from, categoriaKey, categoria);
            } else {
                await this.client.sendMessage(from, 'Por favor, digite um número válido da categoria (1 a ' + categorias.length + ').');
                await this.enviarListaCategorias(from, conversa.id);
            }
        } catch (error) {
            console.error('Erro ao processar categoria:', error);
            await this.client.sendMessage(from, MESSAGES.ERRO_GERAL);
        }
    }

    async enviarListaSubcategorias(to, categoriaKey, categoria) {
        try {
            let mensagem = `🚨 *NOVA DENÚNCIA - PASSO 2/4*

${categoria.titulo} selecionada ✅

📋 Escolha o problema específico digitando o número:

`;

            const subcategorias = Object.entries(categoria.subcategorias);
            subcategorias.forEach(([subKey, subTitulo], index) => {
                mensagem += `${index + 1}️⃣ ${subTitulo}
`;
            });

            mensagem += `
Digite o número do problema (1 a ${subcategorias.length}).
Ou digite 0 para voltar às categorias.`;

            await this.client.sendMessage(to, mensagem);
        } catch (error) {
            console.error('Erro ao enviar subcategorias:', error);
            await this.client.sendMessage(to, MESSAGES.ERRO_GERAL);
        }
    }

    async handleSelecionandoSubcategoria(conversa, message) {
        const from = conversa.phoneNumber;
        
        try {
            const numeroEscolha = parseInt(message.body?.trim());
            
            if (numeroEscolha === 0) {
                await this.enviarListaCategorias(from, conversa.id);
                return;
            }

            const categoriaKey = conversa.dadosTemp?.categoriaSelecionada;
            const categoria = CATEGORIAS_DENUNCIA[categoriaKey];
            
            if (categoria) {
                const subcategorias = Object.entries(categoria.subcategorias);
                
                if (numeroEscolha >= 1 && numeroEscolha <= subcategorias.length) {
                    const [subcategoriaKey, subcategoria] = subcategorias[numeroEscolha - 1];
                    
                    await prisma.conversaUsuario.update({
                        where: { id: conversa.id },
                        data: { 
                            estado: ESTADOS_CONVERSA.AGUARDANDO_PROBLEMA,
                            dadosTemp: { 
                                ...conversa.dadosTemp, 
                                subcategoriaSelecionada: subcategoriaKey,
                                subcategoriaTitulo: subcategoria,
                                categoriaCompleta: `${categoria.titulo} > ${subcategoria}`
                            }
                        },
                    });

                    const mensagemProblema = `🚨 *NOVA DENÚNCIA - PASSO 3/4*

✅ *Categoria:* ${categoria.titulo}
✅ *Problema:* ${subcategoria}

📝 Agora descreva com detalhes o problema específico:

💡 *Dica:* Seja específico! Quanto mais detalhes, melhor será o atendimento.`;

                    await this.client.sendMessage(from, mensagemProblema);
                } else {
                    await this.client.sendMessage(from, 'Por favor, digite um número válido do problema (1 a ' + subcategorias.length + ') ou 0 para voltar.');
                }
            } else {
                await this.client.sendMessage(from, 'Erro ao processar categoria. Digite 0 para voltar.');
            }
        } catch (error) {
            console.error('Erro ao processar subcategoria:', error);
            await this.client.sendMessage(from, MESSAGES.ERRO_GERAL);
        }
    }
}

module.exports = new WhatsAppService();
