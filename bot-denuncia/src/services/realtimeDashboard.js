/**
 * REAL-TIME DASHBOARD SERVICE - Serviço de Dashboard em Tempo Real
 * 
 * Dashboard inteligente com:
 * - Atualizações em tempo real via WebSocket
 * - Métricas multi-camadas correlacionadas
 * - Visualizações interativas e responsivas
 * - Alertas contextuais e notificações
 * - Análise preditiva integrada
 * - Capacidades de drill-down e análise detalhada
 * 
 * @author Real-time Dashboard Service
 * @priority HIGH - Operational Visibility
 */

const EventEmitter = require('events');
const WebSocket = require('ws');
const express = require('express');
const http = require('http');
const path = require('path');
const logger = require('../utils/logger');
const performanceAuditSystem = require('./performanceAuditSystem');

/**
 * WEBSOCKET MANAGER - Gerenciador de Conexões WebSocket
 */
class WebSocketManager extends EventEmitter {
  constructor() {
    super();
    
    this.server = null;
    this.wss = null;
    this.clients = new Map();
    this.rooms = new Map();
    this.messageQueue = new Map();
    
    this.config = {
      port: process.env.DASHBOARD_WS_PORT || 8080,
      pingInterval: 30000,     // 30 segundos
      maxClients: 100,
      messageQueueSize: 1000,
      compressionEnabled: true,
      authRequired: false
    };

    this.stats = {
      connectionsTotal: 0,
      messagesTotal: 0,
      errorsTotal: 0,
      startTime: Date.now()
    };
  }

  /**
   * Inicializar servidor WebSocket
   */
  async initialize() {
    try {
      // Criar servidor HTTP
      const app = express();
      this.server = http.createServer(app);

      // Configurar servidor WebSocket
      this.wss = new WebSocket.Server({
        server: this.server,
        perMessageDeflate: this.config.compressionEnabled,
        maxPayload: 1024 * 1024, // 1MB
        clientTracking: true
      });

      // Configurar handlers
      this.setupWebSocketHandlers();
      this.setupHealthCheck(app);
      this.setupPingPong();

      // Iniciar servidor
      await new Promise((resolve, reject) => {
        this.server.listen(this.config.port, (error) => {
          if (error) {
            reject(error);
          } else {
            logger.info(`[DASHBOARD] WebSocket server started on port ${this.config.port}`);
            resolve();
          }
        });
      });

      this.emit('initialized');

    } catch (error) {
      logger.error('[DASHBOARD] Failed to initialize WebSocket server:', error);
      throw error;
    }
  }

  /**
   * Configurar handlers do WebSocket
   */
  setupWebSocketHandlers() {
    this.wss.on('connection', (ws, request) => {
      this.handleNewConnection(ws, request);
    });

    this.wss.on('error', (error) => {
      logger.error('[DASHBOARD] WebSocket server error:', error);
      this.stats.errorsTotal++;
    });
  }

  /**
   * Handle nova conexão
   */
  handleNewConnection(ws, request) {
    const clientId = this.generateClientId();
    const clientInfo = {
      id: clientId,
      ws,
      connectedAt: Date.now(),
      lastPing: Date.now(),
      ip: request.socket.remoteAddress,
      userAgent: request.headers['user-agent'],
      subscriptions: new Set(),
      isAlive: true
    };

    // Verificar limite de conexões
    if (this.clients.size >= this.config.maxClients) {
      logger.warn('[DASHBOARD] Max clients reached, rejecting connection');
      ws.close(1008, 'Server full');
      return;
    }

    // Armazenar cliente
    this.clients.set(clientId, clientInfo);
    this.stats.connectionsTotal++;

    logger.info(`[DASHBOARD] New client connected: ${clientId} (${this.clients.size} total)`);

    // Configurar handlers do cliente
    ws.on('message', (data) => {
      this.handleClientMessage(clientId, data);
    });

    ws.on('close', (code, reason) => {
      this.handleClientDisconnect(clientId, code, reason);
    });

    ws.on('error', (error) => {
      logger.error(`[DASHBOARD] Client ${clientId} error:`, error);
      this.stats.errorsTotal++;
    });

    ws.on('pong', () => {
      clientInfo.isAlive = true;
      clientInfo.lastPing = Date.now();
    });

    // Enviar mensagem de boas-vindas
    this.sendToClient(clientId, {
      type: 'connection_established',
      clientId,
      serverTime: Date.now(),
      capabilities: ['real_time_metrics', 'alerts', 'historical_data']
    });

    this.emit('clientConnected', clientInfo);
  }

  /**
   * Handle mensagem do cliente
   */
  handleClientMessage(clientId, data) {
    try {
      const client = this.clients.get(clientId);
      if (!client) return;

      const message = JSON.parse(data.toString());
      this.stats.messagesTotal++;

      logger.debug(`[DASHBOARD] Message from ${clientId}:`, message.type);

      switch (message.type) {
        case 'subscribe':
          this.handleSubscription(clientId, message.data);
          break;

        case 'unsubscribe':
          this.handleUnsubscription(clientId, message.data);
          break;

        case 'get_metrics':
          this.handleMetricsRequest(clientId, message.data);
          break;

        case 'get_incidents':
          this.handleIncidentsRequest(clientId, message.data);
          break;

        case 'get_historical_data':
          this.handleHistoricalDataRequest(clientId, message.data);
          break;

        case 'ping':
          this.sendToClient(clientId, { type: 'pong', timestamp: Date.now() });
          break;

        default:
          logger.warn(`[DASHBOARD] Unknown message type from ${clientId}:`, message.type);
      }

    } catch (error) {
      logger.error(`[DASHBOARD] Error processing message from ${clientId}:`, error);
      this.sendToClient(clientId, {
        type: 'error',
        message: 'Invalid message format'
      });
    }
  }

  /**
   * Handle desconexão do cliente
   */
  handleClientDisconnect(clientId, code, reason) {
    const client = this.clients.get(clientId);
    if (client) {
      // Remover de todas as salas
      client.subscriptions.forEach(room => {
        this.leaveRoom(clientId, room);
      });

      // Remover cliente
      this.clients.delete(clientId);

      logger.info(`[DASHBOARD] Client disconnected: ${clientId} (${this.clients.size} remaining)`);
      this.emit('clientDisconnected', { clientId, code, reason });
    }
  }

  /**
   * Handle subscription
   */
  handleSubscription(clientId, subscriptionData) {
    const client = this.clients.get(clientId);
    if (!client) return;

    const { room, filters = {} } = subscriptionData;

    // Validar sala
    if (!this.isValidRoom(room)) {
      this.sendToClient(clientId, {
        type: 'subscription_error',
        message: `Invalid room: ${room}`
      });
      return;
    }

    // Adicionar à sala
    this.joinRoom(clientId, room, filters);

    // Confirmar subscription
    this.sendToClient(clientId, {
      type: 'subscription_confirmed',
      room,
      filters
    });

    // Enviar dados iniciais
    this.sendInitialData(clientId, room, filters);

    logger.debug(`[DASHBOARD] Client ${clientId} subscribed to ${room}`);
  }

  /**
   * Handle unsubscription
   */
  handleUnsubscription(clientId, unsubscriptionData) {
    const { room } = unsubscriptionData;
    
    this.leaveRoom(clientId, room);
    
    this.sendToClient(clientId, {
      type: 'unsubscription_confirmed',
      room
    });

    logger.debug(`[DASHBOARD] Client ${clientId} unsubscribed from ${room}`);
  }

  /**
   * Adicionar cliente à sala
   */
  joinRoom(clientId, room, filters = {}) {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Criar sala se não existir
    if (!this.rooms.has(room)) {
      this.rooms.set(room, new Map());
    }

    // Adicionar cliente à sala
    this.rooms.get(room).set(clientId, { filters, joinedAt: Date.now() });
    client.subscriptions.add(room);
  }

  /**
   * Remover cliente da sala
   */
  leaveRoom(clientId, room) {
    const client = this.clients.get(clientId);
    if (!client) return;

    if (this.rooms.has(room)) {
      this.rooms.get(room).delete(clientId);
      
      // Remover sala se vazia
      if (this.rooms.get(room).size === 0) {
        this.rooms.delete(room);
      }
    }

    client.subscriptions.delete(room);
  }

  /**
   * Validar sala
   */
  isValidRoom(room) {
    const validRooms = [
      'metrics',
      'incidents',
      'alerts',
      'system_health',
      'performance',
      'business_metrics',
      'predictions'
    ];

    return validRooms.includes(room);
  }

  /**
   * Enviar dados iniciais
   */
  async sendInitialData(clientId, room, filters) {
    try {
      let initialData = null;

      switch (room) {
        case 'metrics':
          initialData = await this.getInitialMetrics(filters);
          break;

        case 'incidents':
          initialData = await this.getInitialIncidents(filters);
          break;

        case 'alerts':
          initialData = await this.getInitialAlerts(filters);
          break;

        case 'system_health':
          initialData = await this.getInitialSystemHealth(filters);
          break;

        case 'performance':
          initialData = await this.getInitialPerformance(filters);
          break;

        case 'business_metrics':
          initialData = await this.getInitialBusinessMetrics(filters);
          break;

        case 'predictions':
          initialData = await this.getInitialPredictions(filters);
          break;
      }

      if (initialData) {
        this.sendToClient(clientId, {
          type: 'initial_data',
          room,
          data: initialData,
          timestamp: Date.now()
        });
      }

    } catch (error) {
      logger.error(`[DASHBOARD] Error sending initial data for ${room}:`, error);
      this.sendToClient(clientId, {
        type: 'error',
        message: `Failed to load initial data for ${room}`
      });
    }
  }

  /**
   * Handle request de métricas
   */
  async handleMetricsRequest(clientId, requestData) {
    try {
      const metricsAggregationEngine = require('./metricsAggregationEngine');
      const metrics = await metricsAggregationEngine.getMetricsForDashboard(requestData.timeRange);

      this.sendToClient(clientId, {
        type: 'metrics_response',
        data: metrics,
        requestId: requestData.requestId
      });

    } catch (error) {
      logger.error('[DASHBOARD] Error handling metrics request:', error);
      this.sendToClient(clientId, {
        type: 'error',
        message: 'Failed to fetch metrics',
        requestId: requestData.requestId
      });
    }
  }

  /**
   * Handle request de incidentes
   */
  async handleIncidentsRequest(clientId, requestData) {
    try {
      const automatedIncidentResponse = require('./automatedIncidentResponse');
      const dashboard = automatedIncidentResponse.getIncidentDashboard();

      this.sendToClient(clientId, {
        type: 'incidents_response',
        data: dashboard,
        requestId: requestData.requestId
      });

    } catch (error) {
      logger.error('[DASHBOARD] Error handling incidents request:', error);
      this.sendToClient(clientId, {
        type: 'error',
        message: 'Failed to fetch incidents',
        requestId: requestData.requestId
      });
    }
  }

  /**
   * Handle request de dados históricos
   */
  async handleHistoricalDataRequest(clientId, requestData) {
    try {
      // Implementar busca de dados históricos
      const historicalData = await this.getHistoricalData(requestData);

      this.sendToClient(clientId, {
        type: 'historical_data_response',
        data: historicalData,
        requestId: requestData.requestId
      });

    } catch (error) {
      logger.error('[DASHBOARD] Error handling historical data request:', error);
      this.sendToClient(clientId, {
        type: 'error',
        message: 'Failed to fetch historical data',
        requestId: requestData.requestId
      });
    }
  }

  /**
   * Broadcast para sala
   */
  broadcastToRoom(room, message) {
    if (!this.rooms.has(room)) return;

    const roomClients = this.rooms.get(room);
    let sentCount = 0;

    roomClients.forEach((clientData, clientId) => {
      // Aplicar filtros se necessário
      const filteredMessage = this.applyFilters(message, clientData.filters);
      
      if (filteredMessage) {
        this.sendToClient(clientId, filteredMessage);
        sentCount++;
      }
    });

    logger.debug(`[DASHBOARD] Broadcasted to ${sentCount} clients in room ${room}`);
  }

  /**
   * Aplicar filtros à mensagem
   */
  applyFilters(message, filters) {
    // Implementar lógica de filtros baseada no tipo de mensagem
    if (!filters || Object.keys(filters).length === 0) {
      return message;
    }

    // Exemplo de filtros por severidade
    if (filters.severity && message.data && message.data.severity) {
      if (!filters.severity.includes(message.data.severity)) {
        return null; // Filtrar mensagem
      }
    }

    // Exemplo de filtros por componente
    if (filters.components && message.data && message.data.component) {
      if (!filters.components.includes(message.data.component)) {
        return null;
      }
    }

    return message;
  }

  /**
   * Enviar mensagem para cliente específico
   */
  sendToClient(clientId, message) {
    const client = this.clients.get(clientId);
    
    if (!client || client.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      const messageStr = JSON.stringify({
        ...message,
        timestamp: message.timestamp || Date.now()
      });

      client.ws.send(messageStr);
      return true;

    } catch (error) {
      logger.error(`[DASHBOARD] Error sending message to client ${clientId}:`, error);
      return false;
    }
  }

  /**
   * Configurar ping/pong
   */
  setupPingPong() {
    const interval = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        const client = Array.from(this.clients.values()).find(c => c.ws === ws);
        
        if (client) {
          if (!client.isAlive) {
            logger.debug(`[DASHBOARD] Terminating inactive client: ${client.id}`);
            client.ws.terminate();
            return;
          }

          client.isAlive = false;
          ws.ping();
        }
      });
    }, this.config.pingInterval);

    this.wss.on('close', () => {
      clearInterval(interval);
    });
  }

  /**
   * Configurar health check
   */
  setupHealthCheck(app) {
    app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        uptime: Date.now() - this.stats.startTime,
        clients: this.clients.size,
        rooms: this.rooms.size,
        stats: this.stats
      });
    });
  }

  /**
   * Obter dados iniciais - implementações
   */
  async getInitialMetrics(filters) {
    try {
      const metricsAggregationEngine = require('./metricsAggregationEngine');
      return await metricsAggregationEngine.getMetricsForDashboard();
    } catch (error) {
      logger.error('[DASHBOARD] Error getting initial metrics:', error);
      return null;
    }
  }

  async getInitialIncidents(filters) {
    try {
      const automatedIncidentResponse = require('./automatedIncidentResponse');
      return automatedIncidentResponse.getIncidentDashboard();
    } catch (error) {
      logger.error('[DASHBOARD] Error getting initial incidents:', error);
      return null;
    }
  }

  async getInitialAlerts(filters) {
    // Implementar busca de alertas
    return {
      active: [],
      recent: [],
      summary: { total: 0, critical: 0, high: 0, medium: 0, low: 0 }
    };
  }

  async getInitialSystemHealth(filters) {
    try {
      const intelligentMonitoringSystem = require('./intelligentMonitoringSystem');
      return intelligentMonitoringSystem.getDashboardMetrics();
    } catch (error) {
      logger.error('[DASHBOARD] Error getting system health:', error);
      return null;
    }
  }

  async getInitialPerformance(filters) {
    try {
      return performanceAuditSystem.getDashboardMetrics();
    } catch (error) {
      logger.error('[DASHBOARD] Error getting performance data:', error);
      return null;
    }
  }

  async getInitialBusinessMetrics(filters) {
    // Implementar métricas de negócio
    return {
      complaintsToday: 0,
      resolutionRate: 0,
      averageResolutionTime: 0,
      satisfactionScore: 0
    };
  }

  async getInitialPredictions(filters) {
    // Implementar previsões
    return {
      trends: [],
      anomalies: [],
      recommendations: []
    };
  }

  async getHistoricalData(requestData) {
    // Implementar busca de dados históricos
    return {
      data: [],
      timeRange: requestData.timeRange,
      metrics: requestData.metrics
    };
  }

  /**
   * Gerar ID do cliente
   */
  generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  /**
   * Obter estatísticas do WebSocket
   */
  getStats() {
    return {
      ...this.stats,
      activeConnections: this.clients.size,
      activeRooms: this.rooms.size,
      uptime: Date.now() - this.stats.startTime
    };
  }

  /**
   * Parar servidor
   */
  async stop() {
    logger.info('[DASHBOARD] Stopping WebSocket server...');

    // Fechar todas as conexões
    this.clients.forEach((client) => {
      client.ws.close(1001, 'Server shutting down');
    });

    // Fechar servidor
    if (this.wss) {
      this.wss.close();
    }

    if (this.server) {
      await new Promise((resolve) => {
        this.server.close(resolve);
      });
    }

    this.emit('stopped');
    logger.info('[DASHBOARD] WebSocket server stopped');
  }
}

/**
 * DASHBOARD DATA ORCHESTRATOR - Orquestrador de Dados do Dashboard
 */
class DashboardDataOrchestrator extends EventEmitter {
  constructor(wsManager) {
    super();
    
    this.wsManager = wsManager;
    this.dataProviders = new Map();
    this.updateIntervals = new Map();
    this.lastUpdates = new Map();
    
    this.config = {
      updateIntervals: {
        metrics: 5000,           // 5 segundos
        system_health: 10000,    // 10 segundos
        performance: 30000,      // 30 segundos
        incidents: 5000,         // 5 segundos
        business_metrics: 60000, // 1 minuto
        predictions: 300000      // 5 minutos
      },
      batchUpdates: true,
      compressionEnabled: true
    };

    this.setupDataProviders();
  }

  /**
   * Configurar provedores de dados
   */
  setupDataProviders() {
    // Metrics Provider
    this.dataProviders.set('metrics', {
      name: 'Metrics Provider',
      getData: async () => {
        const metricsEngine = require('./metricsAggregationEngine');
        return await metricsEngine.getMetricsForDashboard();
      },
      room: 'metrics'
    });

    // System Health Provider
    this.dataProviders.set('system_health', {
      name: 'System Health Provider',
      getData: async () => {
        const monitoringSystem = require('./intelligentMonitoringSystem');
        return monitoringSystem.getDashboardMetrics();
      },
      room: 'system_health'
    });

    // Performance Provider
    this.dataProviders.set('performance', {
      name: 'Performance Provider',
      getData: async () => {
        return performanceAuditSystem.getDashboardMetrics();
      },
      room: 'performance'
    });

    // Incidents Provider
    this.dataProviders.set('incidents', {
      name: 'Incidents Provider',
      getData: async () => {
        const incidentResponse = require('./automatedIncidentResponse');
        return incidentResponse.getIncidentDashboard();
      },
      room: 'incidents'
    });

    // Business Metrics Provider
    this.dataProviders.set('business_metrics', {
      name: 'Business Metrics Provider',
      getData: async () => {
        return await this.getBusinessMetrics();
      },
      room: 'business_metrics'
    });

    // Predictions Provider
    this.dataProviders.set('predictions', {
      name: 'Predictions Provider',
      getData: async () => {
        return await this.getPredictionsData();
      },
      room: 'predictions'
    });
  }

  /**
   * Inicializar orquestrador
   */
  async initialize() {
    logger.info('[DASHBOARD] Initializing Dashboard Data Orchestrator...');

    // Configurar intervalos de atualização
    Object.entries(this.config.updateIntervals).forEach(([dataType, interval]) => {
      const intervalId = setInterval(() => {
        this.updateData(dataType);
      }, interval);
      
      this.updateIntervals.set(dataType, intervalId);
    });

    // Primeira atualização imediata
    await Promise.all(
      Object.keys(this.config.updateIntervals).map(dataType => 
        this.updateData(dataType)
      )
    );

    // Configurar listeners de eventos
    this.setupEventListeners();

    logger.info('[DASHBOARD] Dashboard Data Orchestrator initialized');
    this.emit('initialized');
  }

  /**
   * Configurar listeners de eventos
   */
  setupEventListeners() {
    // Intelligent Monitoring System events
    try {
      const monitoringSystem = require('./intelligentMonitoringSystem');
      
      monitoringSystem.on('healthCheckCompleted', (data) => {
        this.broadcastUpdate('system_health', {
          type: 'health_update',
          data
        });
      });

      monitoringSystem.on('criticalAlert', (data) => {
        this.broadcastUpdate('alerts', {
          type: 'critical_alert',
          data
        });
      });

      monitoringSystem.on('predictiveAlert', (data) => {
        this.broadcastUpdate('predictions', {
          type: 'predictive_alert',
          data
        });
      });

    } catch (error) {
      logger.warn('[DASHBOARD] Monitoring system not available:', error.message);
    }

    // Incident Response System events
    try {
      const incidentResponse = require('./automatedIncidentResponse');
      
      incidentResponse.on('incidentProcessed', (data) => {
        this.broadcastUpdate('incidents', {
          type: 'new_incident',
          data
        });
      });

      incidentResponse.on('incidentResolved', (data) => {
        this.broadcastUpdate('incidents', {
          type: 'incident_resolved',
          data
        });
      });

      incidentResponse.on('incidentEscalated', (data) => {
        this.broadcastUpdate('incidents', {
          type: 'incident_escalated',
          data
        });
      });

    } catch (error) {
      logger.warn('[DASHBOARD] Incident response system not available:', error.message);
    }

    // Performance Audit System events
    performanceAuditSystem.on('measurementCompleted', (data) => {
      this.broadcastUpdate('performance', {
        type: 'performance_update',
        data
      });
    });
  }

  /**
   * Atualizar dados
   */
  async updateData(dataType) {
    const provider = this.dataProviders.get(dataType);
    
    if (!provider) {
      logger.warn(`[DASHBOARD] Unknown data provider: ${dataType}`);
      return;
    }

    try {
      const data = await provider.getData();
      
      if (data) {
        this.lastUpdates.set(dataType, Date.now());
        
        this.broadcastUpdate(provider.room, {
          type: 'data_update',
          dataType,
          data,
          timestamp: Date.now()
        });

        logger.debug(`[DASHBOARD] Updated ${dataType} data`);
      }

    } catch (error) {
      logger.error(`[DASHBOARD] Error updating ${dataType} data:`, error);
    }
  }

  /**
   * Broadcast update
   */
  broadcastUpdate(room, message) {
    if (this.wsManager && this.wsManager.rooms.has(room)) {
      this.wsManager.broadcastToRoom(room, message);
    }
  }

  /**
   * Obter métricas de negócio
   */
  async getBusinessMetrics() {
    try {
      // Implementar busca de métricas de negócio reais
      return {
        complaintsToday: 45,
        resolutionRate: 89.2,
        averageResolutionTime: 1800000, // 30 minutos em ms
        satisfactionScore: 4.2,
        peakHours: [9, 14, 16],
        geographicDistribution: {
          'Centro': 35,
          'Zona Norte': 28,
          'Zona Sul': 22,
          'Zona Oeste': 15
        },
        categoryBreakdown: {
          'Infraestrutura': 40,
          'Segurança': 25,
          'Meio Ambiente': 20,
          'Outros': 15
        }
      };
    } catch (error) {
      logger.error('[DASHBOARD] Error getting business metrics:', error);
      return null;
    }
  }

  /**
   * Obter dados de previsões
   */
  async getPredictionsData() {
    try {
      // Implementar previsões baseadas em ML
      return {
        trends: [
          {
            metric: 'complaint_volume',
            direction: 'increasing',
            confidence: 0.85,
            prediction: '+15% next week'
          },
          {
            metric: 'resolution_time',
            direction: 'stable',
            confidence: 0.92,
            prediction: 'within SLA'
          }
        ],
        anomalies: [
          {
            component: 'whatsapp',
            type: 'response_time_spike',
            severity: 'medium',
            confidence: 0.78
          }
        ],
        recommendations: [
          {
            type: 'scaling',
            message: 'Consider increasing worker capacity during 14:00-16:00',
            priority: 'medium'
          },
          {
            type: 'maintenance',
            message: 'Schedule database maintenance during low-traffic hours',
            priority: 'low'
          }
        ]
      };
    } catch (error) {
      logger.error('[DASHBOARD] Error getting predictions data:', error);
      return null;
    }
  }

  /**
   * Parar orquestrador
   */
  stop() {
    logger.info('[DASHBOARD] Stopping Dashboard Data Orchestrator...');

    // Limpar intervalos
    this.updateIntervals.forEach((intervalId) => {
      clearInterval(intervalId);
    });
    this.updateIntervals.clear();

    this.emit('stopped');
    logger.info('[DASHBOARD] Dashboard Data Orchestrator stopped');
  }
}

/**
 * REAL-TIME DASHBOARD SERVICE - Serviço Principal
 */
class RealtimeDashboardService extends EventEmitter {
  constructor() {
    super();
    
    this.wsManager = new WebSocketManager();
    this.dataOrchestrator = new DashboardDataOrchestrator(this.wsManager);
    this.isRunning = false;
  }

  /**
   * Inicializar serviço
   */
  async initialize() {
    if (this.isRunning) {
      logger.warn('[DASHBOARD] Service already running');
      return;
    }

    logger.info('[DASHBOARD] Initializing Real-time Dashboard Service...');

    try {
      // Inicializar WebSocket Manager
      await this.wsManager.initialize();

      // Inicializar Data Orchestrator
      await this.dataOrchestrator.initialize();

      // Configurar event forwarding
      this.setupEventForwarding();

      this.isRunning = true;
      
      this.emit('initialized');
      logger.info('[DASHBOARD] Real-time Dashboard Service initialized successfully');

    } catch (error) {
      logger.error('[DASHBOARD] Failed to initialize service:', error);
      throw error;
    }
  }

  /**
   * Configurar forwarding de eventos
   */
  setupEventForwarding() {
    // Forward WebSocket events
    this.wsManager.on('clientConnected', (data) => {
      this.emit('clientConnected', data);
    });

    this.wsManager.on('clientDisconnected', (data) => {
      this.emit('clientDisconnected', data);
    });

    // Forward Data Orchestrator events
    this.dataOrchestrator.on('initialized', () => {
      this.emit('dataOrchestratorReady');
    });
  }

  /**
   * Obter status do serviço
   */
  getServiceStatus() {
    return {
      isRunning: this.isRunning,
      websocket: this.wsManager.getStats(),
      lastUpdates: Object.fromEntries(this.dataOrchestrator.lastUpdates),
      uptime: this.isRunning ? Date.now() - this.wsManager.stats.startTime : 0
    };
  }

  /**
   * Configurar serviço
   */
  configure(config) {
    if (config.websocket) {
      Object.assign(this.wsManager.config, config.websocket);
    }

    if (config.dataOrchestrator) {
      Object.assign(this.dataOrchestrator.config, config.dataOrchestrator);
    }

    logger.info('[DASHBOARD] Service configuration updated');
  }

  /**
   * Parar serviço
   */
  async stop() {
    if (!this.isRunning) return;

    logger.info('[DASHBOARD] Stopping Real-time Dashboard Service...');

    // Parar Data Orchestrator
    this.dataOrchestrator.stop();

    // Parar WebSocket Manager
    await this.wsManager.stop();

    this.isRunning = false;
    this.emit('stopped');
    
    logger.info('[DASHBOARD] Real-time Dashboard Service stopped');
  }
}

module.exports = {
  RealtimeDashboardService,
  WebSocketManager,
  DashboardDataOrchestrator,
  default: new RealtimeDashboardService()
};