const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const monitoringService = require('./monitoringService');

class WebSocketService {
  constructor() {
    this.wss = null;
    this.clients = new Map(); // Map<userId, Set<WebSocket>>
    this.rooms = new Map(); // Map<roomName, Set<WebSocket>>
    
    this.setupMonitoringListeners();
  }

  /**
   * Inicializar servidor WebSocket
   */
  initialize(server) {
    this.wss = new WebSocket.Server({ 
      server,
      path: '/ws/monitoring'
    });

    this.wss.on('connection', (ws, req) => {
      console.log('Nova conexão WebSocket estabelecida');
      
      // Configurar handlers para nova conexão
      this.setupConnectionHandlers(ws, req);
    });

    console.log('Servidor WebSocket inicializado em /ws/monitoring');
  }

  /**
   * Configurar handlers para conexão
   */
  setupConnectionHandlers(ws, req) {
    let userId = null;
    let isAuthenticated = false;

    // Handler para mensagens recebidas
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message);
        await this.handleMessage(ws, data, userId);
      } catch (error) {
        console.error('Erro ao processar mensagem WebSocket:', error);
        this.sendError(ws, 'Formato de mensagem inválido');
      }
    });

    // Handler para autenticação
    ws.on('authenticate', async (token) => {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.id;
        isAuthenticated = true;
        
        // Adicionar cliente à lista de clientes autenticados
        this.addClient(userId, ws);
        
        // Enviar confirmação de autenticação
        this.sendMessage(ws, {
          type: 'auth_success',
          message: 'Autenticação realizada com sucesso',
          userId
        });

        // Enviar status inicial do sistema
        const systemStatus = await monitoringService.getPublicationSystemStatus();
        this.sendMessage(ws, {
          type: 'system_status',
          data: systemStatus
        });

      } catch (error) {
        console.error('Erro na autenticação WebSocket:', error);
        this.sendError(ws, 'Token inválido');
        ws.close(1008, 'Token inválido');
      }
    });

    // Handler para fechamento da conexão
    ws.on('close', () => {
      console.log(`Conexão WebSocket fechada - User: ${userId}`);
      if (userId) {
        this.removeClient(userId, ws);
      }
    });

    // Handler para erros
    ws.on('error', (error) => {
      console.error('Erro na conexão WebSocket:', error);
      if (userId) {
        this.removeClient(userId, ws);
      }
    });

    // Solicitar autenticação
    this.sendMessage(ws, {
      type: 'auth_required',
      message: 'Envie o token de autenticação'
    });
  }

  /**
   * Processar mensagens recebidas dos clientes
   */
  async handleMessage(ws, data, userId) {
    const { type, payload } = data;

    switch (type) {
      case 'authenticate':
        ws.emit('authenticate', payload.token);
        break;

      case 'subscribe':
        await this.handleSubscription(ws, payload, userId);
        break;

      case 'unsubscribe':
        await this.handleUnsubscription(ws, payload, userId);
        break;

      case 'get_status':
        await this.sendSystemStatus(ws);
        break;

      case 'get_metrics':
        await this.sendMetrics(ws, payload);
        break;

      case 'ping':
        this.sendMessage(ws, { type: 'pong', timestamp: Date.now() });
        break;

      default:
        this.sendError(ws, `Tipo de mensagem desconhecido: ${type}`);
    }
  }

  /**
   * Gerenciar inscrições em canais
   */
  async handleSubscription(ws, payload, userId) {
    const { channels = [] } = payload;
    
    for (const channel of channels) {
      if (this.isValidChannel(channel)) {
        this.addToRoom(channel, ws);
        
        // Enviar dados iniciais do canal
        await this.sendChannelInitialData(ws, channel);
      } else {
        this.sendError(ws, `Canal inválido: ${channel}`);
      }
    }

    this.sendMessage(ws, {
      type: 'subscription_success',
      channels: channels.filter(c => this.isValidChannel(c))
    });
  }

  /**
   * Gerenciar cancelamento de inscrições
   */
  async handleUnsubscription(ws, payload, userId) {
    const { channels = [] } = payload;
    
    for (const channel of channels) {
      this.removeFromRoom(channel, ws);
    }

    this.sendMessage(ws, {
      type: 'unsubscription_success',
      channels
    });
  }

  /**
   * Enviar status do sistema
   */
  async sendSystemStatus(ws) {
    try {
      const status = await monitoringService.getPublicationSystemStatus();
      this.sendMessage(ws, {
        type: 'system_status',
        data: status,
        timestamp: Date.now()
      });
    } catch (error) {
      this.sendError(ws, 'Erro ao obter status do sistema');
    }
  }

  /**
   * Enviar métricas
   */
  async sendMetrics(ws, payload = {}) {
    try {
      const { timeframe = '24h' } = payload;
      // Implementar lógica para obter métricas
      const metrics = {
        // Placeholder para métricas
        timeframe,
        data: {}
      };
      
      this.sendMessage(ws, {
        type: 'metrics',
        data: metrics,
        timestamp: Date.now()
      });
    } catch (error) {
      this.sendError(ws, 'Erro ao obter métricas');
    }
  }

  /**
   * Enviar dados iniciais do canal
   */
  async sendChannelInitialData(ws, channel) {
    switch (channel) {
      case 'publication_events':
        // Enviar eventos recentes de publicação
        break;
      
      case 'system_alerts':
        // Enviar alertas ativos
        break;
      
      case 'queue_status':
        const queueStatus = await monitoringService.getQueueStatistics();
        this.sendMessage(ws, {
          type: 'queue_status',
          data: queueStatus,
          channel
        });
        break;
    }
  }

  /**
   * Configurar listeners do serviço de monitoramento
   */
  setupMonitoringListeners() {
    // Listener para eventos de publicação
    monitoringService.on('publicationEvent', (eventData) => {
      this.broadcastToRoom('publication_events', {
        type: 'publication_event',
        data: eventData,
        timestamp: Date.now()
      });
    });

    // Listener para alertas do sistema
    monitoringService.on('alert', (alertData) => {
      this.broadcastToRoom('system_alerts', {
        type: 'system_alert',
        data: alertData,
        timestamp: Date.now()
      });

      // Notificar administradores sobre alertas críticos
      if (alertData.severity === 'critical') {
        this.notifyAdministrators({
          type: 'critical_alert',
          data: alertData
        });
      }
    });

    // Atualizar status do sistema periodicamente
    setInterval(async () => {
      try {
        const status = await monitoringService.getPublicationSystemStatus();
        this.broadcastToRoom('system_status', {
          type: 'system_status_update',
          data: status,
          timestamp: Date.now()
        });
      } catch (error) {
        console.error('Erro ao broadcast status:', error);
      }
    }, 30000); // A cada 30 segundos
  }

  /**
   * Gerenciamento de clientes
   */
  addClient(userId, ws) {
    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }
    this.clients.get(userId).add(ws);
    
    console.log(`Cliente adicionado: ${userId}, Total: ${this.clients.size}`);
  }

  removeClient(userId, ws) {
    if (this.clients.has(userId)) {
      this.clients.get(userId).delete(ws);
      
      if (this.clients.get(userId).size === 0) {
        this.clients.delete(userId);
      }
    }

    // Remover de todas as salas
    for (const [roomName, roomClients] of this.rooms) {
      roomClients.delete(ws);
      if (roomClients.size === 0) {
        this.rooms.delete(roomName);
      }
    }
  }

  /**
   * Gerenciamento de salas/canais
   */
  addToRoom(roomName, ws) {
    if (!this.rooms.has(roomName)) {
      this.rooms.set(roomName, new Set());
    }
    this.rooms.get(roomName).add(ws);
  }

  removeFromRoom(roomName, ws) {
    if (this.rooms.has(roomName)) {
      this.rooms.get(roomName).delete(ws);
      
      if (this.rooms.get(roomName).size === 0) {
        this.rooms.delete(roomName);
      }
    }
  }

  /**
   * Envio de mensagens
   */
  sendMessage(ws, message) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  sendError(ws, error) {
    this.sendMessage(ws, {
      type: 'error',
      error,
      timestamp: Date.now()
    });
  }

  /**
   * Broadcast para sala específica
   */
  broadcastToRoom(roomName, message) {
    const room = this.rooms.get(roomName);
    if (room) {
      const messageStr = JSON.stringify(message);
      room.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(messageStr);
        }
      });
    }
  }

  /**
   * Broadcast para cliente específico
   */
  sendToUser(userId, message) {
    const userClients = this.clients.get(userId);
    if (userClients) {
      const messageStr = JSON.stringify(message);
      userClients.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(messageStr);
        }
      });
    }
  }

  /**
   * Notificar administradores
   */
  async notifyAdministrators(message) {
    // Implementar lógica para identificar administradores
    // Por enquanto, broadcast para canal de administradores
    this.broadcastToRoom('admin_notifications', {
      ...message,
      timestamp: Date.now()
    });
  }

  /**
   * Broadcast geral
   */
  broadcast(message) {
    const messageStr = JSON.stringify({
      ...message,
      timestamp: Date.now()
    });

    this.wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }

  /**
   * Validação de canais
   */
  isValidChannel(channel) {
    const validChannels = [
      'publication_events',
      'system_alerts',
      'queue_status',
      'system_status',
      'performance_metrics',
      'admin_notifications'
    ];
    
    return validChannels.includes(channel);
  }

  /**
   * Notificação de feedback de publicação
   */
  async notifyPublicationFeedback(userId, denunciaId, feedback) {
    this.sendToUser(userId, {
      type: 'publication_feedback',
      data: {
        denunciaId,
        feedback
      },
      timestamp: Date.now()
    });
  }

  /**
   * Notificação de mudança de status
   */
  async notifyStatusChange(denunciaId, oldStatus, newStatus, metadata = {}) {
    const notification = {
      type: 'status_change',
      data: {
        denunciaId,
        oldStatus,
        newStatus,
        metadata
      },
      timestamp: Date.now()
    };

    // Broadcast para sala de eventos de publicação
    this.broadcastToRoom('publication_events', notification);
  }

  /**
   * Estatísticas do WebSocket
   */
  getStatistics() {
    return {
      totalConnections: this.wss ? this.wss.clients.size : 0,
      authenticatedClients: this.clients.size,
      activeRooms: this.rooms.size,
      roomDetails: Array.from(this.rooms.entries()).map(([name, clients]) => ({
        name,
        clientCount: clients.size
      }))
    };
  }

  /**
   * Cleanup e shutdown
   */
  shutdown() {
    if (this.wss) {
      this.wss.clients.forEach(client => {
        client.close(1001, 'Servidor sendo desligado');
      });
      this.wss.close();
    }
    
    this.clients.clear();
    this.rooms.clear();
    
    console.log('Servidor WebSocket desligado');
  }
}

// Singleton instance
const websocketService = new WebSocketService();

module.exports = websocketService;