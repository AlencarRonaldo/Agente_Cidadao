/**
 * Real-time Admin Service - Sistema de atualizações em tempo real para o painel administrativo
 * Implementa WebSockets, Server-Sent Events e push notifications
 */

const WebSocket = require('ws');
const EventEmitter = require('events');
const logger = require('../utils/logger');
const adminCacheService = require('./adminCacheService');
const jwt = require('jsonwebtoken');

class RealtimeAdminService extends EventEmitter {
  constructor() {
    super();
    this.wss = null;
    this.clients = new Map(); // Map<userId, Set<WebSocket>>
    this.subscriptions = new Map(); // Map<WebSocket, Set<subscription>>
    this.stats = {
      connectedClients: 0,
      messagessent: 0,
      subscriptions: 0
    };
    this.heartbeatInterval = null;
  }

  /**
   * Inicializar servidor WebSocket
   */
  initialize(server, port = 8081) {
    try {
      // Criar servidor WebSocket
      this.wss = new WebSocket.Server({
        server: server,
        path: '/admin/ws',
        clientTracking: true,
        perMessageDeflate: {
          zlibDeflateOptions: {
            level: 3,
            threshold: 1024,
          },
        },
      });

      // Configurar eventos do servidor
      this.wss.on('connection', (ws, req) => {
        this.handleConnection(ws, req);
      });

      this.wss.on('error', (error) => {
        logger.error('[REALTIME] Erro no servidor WebSocket:', error);
      });

      // Iniciar heartbeat
      this.startHeartbeat();

      // Configurar listeners de eventos
      this.setupEventListeners();

      logger.info(`[REALTIME] Servidor WebSocket iniciado na porta ${port}`);
      return true;
    } catch (error) {
      logger.error('[REALTIME] Falha ao inicializar WebSocket:', error);
      throw error;
    }
  }

  /**
   * Lidar com nova conexão WebSocket
   */
  async handleConnection(ws, req) {
    try {
      // Autenticar usuário
      const token = this.extractToken(req);
      if (!token) {
        ws.close(1008, 'Token de autenticação necessário');
        return;
      }

      const user = await this.authenticateUser(token);
      if (!user) {
        ws.close(1008, 'Token inválido');
        return;
      }

      // Configurar conexão
      ws.userId = user.id;
      ws.userEmail = user.email;
      ws.connectedAt = new Date();
      ws.isAlive = true;
      ws.subscriptions = new Set();

      // Adicionar às coleções
      if (!this.clients.has(user.id)) {
        this.clients.set(user.id, new Set());
      }
      this.clients.get(user.id).add(ws);
      this.subscriptions.set(ws, new Set());

      this.stats.connectedClients++;

      // Configurar eventos da conexão
      ws.on('message', (data) => this.handleMessage(ws, data));
      ws.on('close', () => this.handleDisconnection(ws));
      ws.on('pong', () => { ws.isAlive = true; });
      ws.on('error', (error) => {
        logger.error(`[REALTIME] Erro na conexão ${user.email}:`, error);
      });

      // Enviar mensagem de boas-vindas
      this.sendToClient(ws, {
        type: 'connection',
        data: {
          status: 'connected',
          userId: user.id,
          timestamp: new Date().toISOString(),
          availableSubscriptions: this.getAvailableSubscriptions()
        }
      });

      logger.info(`[REALTIME] Cliente conectado: ${user.email} (${this.stats.connectedClients} total)`);

    } catch (error) {
      logger.error('[REALTIME] Erro ao processar conexão:', error);
      ws.close(1011, 'Erro interno do servidor');
    }
  }

  /**
   * Extrair token de autenticação
   */
  extractToken(req) {
    const url = new URL(req.url, 'http://localhost');
    const token = url.searchParams.get('token') || 
                  req.headers.authorization?.replace('Bearer ', '');
    return token;
  }

  /**
   * Autenticar usuário via JWT
   */
  async authenticateUser(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      return decoded; // Assumindo que o token contém { id, email, role }
    } catch (error) {
      logger.warn('[REALTIME] Token inválido:', error.message);
      return null;
    }
  }

  /**
   * Processar mensagens dos clientes
   */
  handleMessage(ws, data) {
    try {
      const message = JSON.parse(data.toString());
      
      switch (message.type) {
        case 'subscribe':
          this.handleSubscription(ws, message.data);
          break;
        case 'unsubscribe':
          this.handleUnsubscription(ws, message.data);
          break;
        case 'ping':
          this.sendToClient(ws, { type: 'pong', timestamp: new Date().toISOString() });
          break;
        case 'request_data':
          this.handleDataRequest(ws, message.data);
          break;
        default:
          logger.warn(`[REALTIME] Tipo de mensagem desconhecido: ${message.type}`);
      }
    } catch (error) {
      logger.error('[REALTIME] Erro ao processar mensagem:', error);
      this.sendToClient(ws, {
        type: 'error',
        data: { message: 'Formato de mensagem inválido' }
      });
    }
  }

  /**
   * Processar inscrição em canais
   */
  handleSubscription(ws, subscriptionData) {
    const { channels = [] } = subscriptionData;
    
    channels.forEach(channel => {
      if (this.isValidChannel(channel)) {
        ws.subscriptions.add(channel);
        this.subscriptions.get(ws).add(channel);
        this.stats.subscriptions++;
        
        logger.debug(`[REALTIME] ${ws.userEmail} inscrito em: ${channel}`);
        
        // Enviar dados iniciais se disponível
        this.sendInitialData(ws, channel);
      }
    });
    
    this.sendToClient(ws, {
      type: 'subscription_confirmed',
      data: {
        channels: Array.from(ws.subscriptions),
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Processar desinscrição
   */
  handleUnsubscription(ws, unsubscriptionData) {
    const { channels = [] } = unsubscriptionData;
    
    channels.forEach(channel => {
      ws.subscriptions.delete(channel);
      this.subscriptions.get(ws).delete(channel);
      this.stats.subscriptions--;
      
      logger.debug(`[REALTIME] ${ws.userEmail} desinscrito de: ${channel}`);
    });
    
    this.sendToClient(ws, {
      type: 'unsubscription_confirmed',
      data: {
        channels: Array.from(ws.subscriptions),
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Processar solicitação de dados específicos
   */
  async handleDataRequest(ws, requestData) {
    const { type, params = {} } = requestData;
    
    try {
      let data = null;
      
      switch (type) {
        case 'dashboard_summary':
          data = await adminCacheService.get('dashboard:main', 'dashboard.summary');
          break;
        case 'agenda_upcoming':
          data = await adminCacheService.get('agenda:upcoming', 'agenda.upcoming');
          break;
        case 'queue_status':
          data = await adminCacheService.get('dashboard:fila-status', 'dashboard.filaStatus');
          break;
        default:
          throw new Error(`Tipo de dados desconhecido: ${type}`);
      }
      
      this.sendToClient(ws, {
        type: 'data_response',
        data: {
          requestType: type,
          data: data,
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      logger.error(`[REALTIME] Erro ao buscar dados ${type}:`, error);
      this.sendToClient(ws, {
        type: 'error',
        data: {
          message: `Erro ao buscar ${type}`,
          requestType: type
        }
      });
    }
  }

  /**
   * Enviar dados iniciais após inscrição
   */
  async sendInitialData(ws, channel) {
    try {
      let data = null;
      
      switch (channel) {
        case 'dashboard_updates':
          data = await adminCacheService.get('dashboard:main', 'dashboard.summary');
          break;
        case 'agenda_updates':
          data = await adminCacheService.get('agenda:upcoming', 'agenda.upcoming');
          break;
        case 'queue_updates':
          data = await adminCacheService.get('dashboard:fila-status', 'dashboard.filaStatus');
          break;
      }
      
      if (data) {
        this.sendToClient(ws, {
          type: 'initial_data',
          channel: channel,
          data: data,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      logger.error(`[REALTIME] Erro ao enviar dados iniciais para ${channel}:`, error);
    }
  }

  /**
   * Lidar com desconexão
   */
  handleDisconnection(ws) {
    try {
      // Remover das coleções
      if (ws.userId && this.clients.has(ws.userId)) {
        const userConnections = this.clients.get(ws.userId);
        userConnections.delete(ws);
        
        if (userConnections.size === 0) {
          this.clients.delete(ws.userId);
        }
      }
      
      // Limpar inscrições
      if (this.subscriptions.has(ws)) {
        const wsSubscriptions = this.subscriptions.get(ws);
        this.stats.subscriptions -= wsSubscriptions.size;
        this.subscriptions.delete(ws);
      }
      
      this.stats.connectedClients--;
      
      logger.info(`[REALTIME] Cliente desconectado: ${ws.userEmail || 'unknown'} (${this.stats.connectedClients} restantes)`);
      
    } catch (error) {
      logger.error('[REALTIME] Erro ao processar desconexão:', error);
    }
  }

  /**
   * Configurar listeners de eventos do sistema
   */
  setupEventListeners() {
    // Escutar eventos de invalidação de cache
    adminCacheService.on('cache:invalidated', (data) => {
      this.broadcastCacheUpdate(data);
    });
    
    // Escutar eventos de sistema (se existirem outros emitters)
    this.on('denuncia:created', (data) => {
      this.broadcastToChannel('dashboard_updates', {
        type: 'denuncia_created',
        data: data,
        timestamp: new Date().toISOString()
      });
    });
    
    this.on('denuncia:approved', (data) => {
      this.broadcastToChannel('agenda_updates', {
        type: 'denuncia_approved',
        data: data,
        timestamp: new Date().toISOString()
      });
    });
    
    this.on('publication:scheduled', (data) => {
      this.broadcastToChannel('agenda_updates', {
        type: 'publication_scheduled',
        data: data,
        timestamp: new Date().toISOString()
      });
    });
    
    this.on('publication:completed', (data) => {
      this.broadcastToChannel('dashboard_updates', {
        type: 'publication_completed',
        data: data,
        timestamp: new Date().toISOString()
      });
    });
  }

  /**
   * Transmitir atualização de cache
   */
  broadcastCacheUpdate(data) {
    const { pattern, keys } = data;
    
    // Mapear padrões de cache para canais
    const channelMap = {
      'dashboard:*': 'dashboard_updates',
      'agenda:*': 'agenda_updates',
      'list:*': 'list_updates'
    };
    
    for (const [cachePattern, channel] of Object.entries(channelMap)) {
      if (pattern.includes(cachePattern.replace('*', '')) || pattern === '*') {
        this.broadcastToChannel(channel, {
          type: 'cache_invalidated',
          data: {
            pattern,
            affectedKeys: keys,
            shouldRefresh: true
          },
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  /**
   * Transmitir mensagem para canal específico
   */
  broadcastToChannel(channel, message) {
    let sentCount = 0;
    
    this.subscriptions.forEach((channels, ws) => {
      if (channels.has(channel) && ws.readyState === WebSocket.OPEN) {
        this.sendToClient(ws, {
          ...message,
          channel: channel
        });
        sentCount++;
      }
    });
    
    if (sentCount > 0) {
      logger.debug(`[REALTIME] Mensagem enviada para ${sentCount} clientes no canal ${channel}`);
    }
    
    return sentCount;
  }

  /**
   * Transmitir para usuário específico
   */
  broadcastToUser(userId, message) {
    const userConnections = this.clients.get(userId);
    if (!userConnections) return 0;
    
    let sentCount = 0;
    userConnections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        this.sendToClient(ws, message);
        sentCount++;
      }
    });
    
    return sentCount;
  }

  /**
   * Enviar mensagem para cliente específico
   */
  sendToClient(ws, message) {
    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
        this.stats.messagesSet++;
        return true;
      }
    } catch (error) {
      logger.error('[REALTIME] Erro ao enviar mensagem:', error);
    }
    return false;
  }

  /**
   * Validar canal de inscrição
   */
  isValidChannel(channel) {
    const validChannels = [
      'dashboard_updates',
      'agenda_updates',
      'queue_updates',
      'list_updates',
      'system_alerts'
    ];
    return validChannels.includes(channel);
  }

  /**
   * Obter canais disponíveis
   */
  getAvailableSubscriptions() {
    return [
      {
        channel: 'dashboard_updates',
        description: 'Atualizações do dashboard principal',
        refreshRate: '30s'
      },
      {
        channel: 'agenda_updates', 
        description: 'Atualizações da agenda de publicações',
        refreshRate: '15s'
      },
      {
        channel: 'queue_updates',
        description: 'Status da fila de processamento',
        refreshRate: '10s'
      },
      {
        channel: 'list_updates',
        description: 'Atualizações nas listagens',
        refreshRate: '60s'
      },
      {
        channel: 'system_alerts',
        description: 'Alertas do sistema',
        refreshRate: 'instant'
      }
    ];
  }

  /**
   * Iniciar heartbeat para manter conexões ativas
   */
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
          logger.warn(`[REALTIME] Conexão inativa detectada: ${ws.userEmail}`);
          return ws.terminate();
        }
        
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000); // A cada 30 segundos
  }

  /**
   * Obter estatísticas do serviço
   */
  getStats() {
    return {
      ...this.stats,
      activeConnections: this.wss ? this.wss.clients.size : 0,
      channelSubscriptions: this.getChannelStats(),
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Obter estatísticas por canal
   */
  getChannelStats() {
    const channelStats = {};
    
    this.subscriptions.forEach((channels) => {
      channels.forEach(channel => {
        channelStats[channel] = (channelStats[channel] || 0) + 1;
      });
    });
    
    return channelStats;
  }

  /**
   * Finalizar serviço
   */
  async shutdown() {
    try {
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
      }
      
      if (this.wss) {
        // Notificar clientes sobre desconexão
        this.wss.clients.forEach(ws => {
          if (ws.readyState === WebSocket.OPEN) {
            this.sendToClient(ws, {
              type: 'server_shutdown',
              data: {
                message: 'Servidor sendo reiniciado',
                timestamp: new Date().toISOString()
              }
            });
            ws.close(1001, 'Servidor sendo reiniciado');
          }
        });
        
        await new Promise(resolve => {
          this.wss.close(resolve);
        });
      }
      
      this.clients.clear();
      this.subscriptions.clear();
      
      logger.info('[REALTIME] Serviço finalizado');
    } catch (error) {
      logger.error('[REALTIME] Erro ao finalizar serviço:', error);
    }
  }
}

// Singleton instance
const realtimeAdminService = new RealtimeAdminService();

module.exports = realtimeAdminService;