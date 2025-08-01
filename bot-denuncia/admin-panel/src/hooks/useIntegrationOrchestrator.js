/**
 * Integration Orchestrator Hook - Frontend Integration
 * 
 * Hook React para integração com o Integration Flow Orchestrator
 * Fornece state management global, WebSocket connectivity e error recovery
 * 
 * @author Integration Flow Orchestrator
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTheme } from '@mui/material';
import axios from 'axios';

// Configurações do sistema
const CONFIG = {
  // WebSocket (desabilitado por padrão)
  websocket: {
    enabled: false, // Desabilitado por padrão
    url: process.env.REACT_APP_WS_URL || 'ws://localhost:8081/admin/ws',
    reconnectInterval: 2000,
    maxReconnectAttempts: 3, // Reduzido para falhar mais rápido
    heartbeatInterval: 45000,
    connectionTimeout: 15000 // Aumentado para 15s
  },
  // HTTP Polling (fallback padrão)
  http: {
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3355/admin', // Porta correta
    pollingInterval: 10000, // 10 segundos - menos agressivo
    timeout: 8000
  }
};

/**
 * Hook principal para integração com o orchestrator
 */
export const useIntegrationOrchestrator = (options = {}) => {
  const {
    autoConnect = true,
    enableWebSocket = false, // WebSocket desabilitado por padrão
    subscriptions = ['dashboard_updates', 'agenda_updates', 'queue_updates'],
    enableMetrics = true,
    onError = null,
    onStateChange = null,
    fallbackMode = 'http' // 'http', 'websocket', 'auto'
  } = options;

  // State
  const [connectionState, setConnectionState] = useState('disconnected');
  const [connectionMode, setConnectionMode] = useState(fallbackMode); // 'websocket', 'http', 'degraded'
  const [globalState, setGlobalState] = useState({
    dashboard: { summary: null, lastUpdate: null, isLoading: true },
    agenda: { upcoming: [], lastUpdate: null, isLoading: true },
    queue: { status: null, processing: 0, pending: 0, failed: 0, lastUpdate: null },
    system: { health: 'unknown', connections: 0, performance: {}, lastHealthCheck: null },
    errors: [],
    version: 1
  });
  const [metrics, setMetrics] = useState({
    connectionUptime: 0,
    messagesReceived: 0,
    stateUpdates: 0,
    errorCount: 0,
    lastMessageTime: null
  });
  const [error, setError] = useState(null);

  // Refs
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const connectionStartTimeRef = useRef(null);
  const subscriptionsRef = useRef(new Set());
  const httpTimeoutRef = useRef(null);

  // Theme for error styling
  const theme = useTheme();

  /**
   * Conectar usando WebSocket ou HTTP polling
   */
  const connect = useCallback(async () => {
    if (connectionState === 'connected') {
      return;
    }

    setConnectionState('connecting');
    setError(null);

    // Determinar modo de conexão
    let mode = connectionMode;
    if (mode === 'auto') {
      mode = enableWebSocket && CONFIG.websocket.enabled ? 'websocket' : 'http';
    }

    try {
      if (mode === 'websocket' && enableWebSocket) {
        await connectWebSocket();
      } else {
        await connectHTTP();
      }
    } catch (error) {
      console.warn(`[INTEGRATION] Falha na conexão ${mode}:`, error);
      
      // Fallback automático para HTTP se WebSocket falhar
      if (mode === 'websocket') {
        console.log('[INTEGRATION] Tentando fallback para HTTP polling...');
        try {
          await connectHTTP();
        } catch (httpError) {
          handleConnectionFailure(httpError);
        }
      } else {
        handleConnectionFailure(error);
      }
    }
  }, [connectionState, connectionMode, enableWebSocket]);

  /**
   * Conectar via WebSocket
   */
  const connectWebSocket = useCallback(async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    // Obter token de autenticação
    const token = localStorage.getItem('adminToken');
    if (!token) {
      throw new Error('Token de autenticação não encontrado');
    }

    return new Promise((resolve, reject) => {
      // Criar conexão WebSocket
      const wsUrl = `${CONFIG.websocket.url}?token=${encodeURIComponent(token)}`;
      const ws = new WebSocket(wsUrl);

      // Timeout de conexão
      const connectionTimeout = setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          ws.close();
          reject(new Error('Timeout na conexão WebSocket'));
        }
      }, CONFIG.websocket.connectionTimeout);

      ws.onopen = () => {
        clearTimeout(connectionTimeout);
        wsRef.current = ws;
        setConnectionState('connected');
        setConnectionMode('websocket');
        reconnectAttemptsRef.current = 0;
        connectionStartTimeRef.current = Date.now();

        // Inscrever-se nos canais
        subscribeToChannels();

        // Iniciar heartbeat
        startHeartbeat();

        console.log('[INTEGRATION] WebSocket conectado');
        resolve();
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleMessage(message);
        } catch (error) {
          console.error('[INTEGRATION] Erro ao processar mensagem:', error);
        }
      };

      ws.onclose = (event) => {
        clearTimeout(connectionTimeout);
        setConnectionState('disconnected');
        stopHeartbeat();

        if (event.code !== 1000) { // Não foi fechamento normal
          console.warn('[INTEGRATION] Conexão WebSocket perdida, tentando fallback...', event);
          // Fallback automático para HTTP
          setTimeout(() => connectHTTP(), 1000);
        }
      };

      ws.onerror = (error) => {
        clearTimeout(connectionTimeout);
        console.error('[INTEGRATION] Erro no WebSocket:', error);
        reject(error);
      };
    });
  }, []);

  /**
   * Conectar via HTTP polling
   */
  const connectHTTP = useCallback(async () => {
    try {
      // Testar conectividade HTTP
      const token = localStorage.getItem('adminToken');
      if (!token) {
        throw new Error('Token de autenticação não encontrado');
      }

      const response = await axios.get(`${CONFIG.http.baseURL}/health`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: CONFIG.http.timeout
      });

      if (response.data) {
        setConnectionState('connected');
        setConnectionMode('http');
        reconnectAttemptsRef.current = 0;
        connectionStartTimeRef.current = Date.now();

        // Iniciar polling
        startHTTPPolling();

        console.log('[INTEGRATION] HTTP polling conectado');
      }
    } catch (error) {
      throw new Error(`Falha na conexão HTTP: ${error.message}`);
    }
  }, [startHTTPPolling]);

  /**
   * Lidar com falha de conexão
   */
  const handleConnectionFailure = useCallback((error) => {
    console.error('[INTEGRATION] Erro ao conectar:', error);
    setConnectionState('error');
    setConnectionMode('degraded');
    setError({
      type: 'connection',
      message: error.message,
      timestamp: Date.now()
    });
    
    // Modo degradado - dados estáticos
    setGlobalState(prev => ({
      ...prev,
      dashboard: { ...prev.dashboard, isLoading: false },
      agenda: { ...prev.agenda, isLoading: false },
      queue: { ...prev.queue, isLoading: false }
    }));
    
    if (onError) {
      onError(error);
    }
  }, [onError]);

  /**
   * Desconectar
   */
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (httpTimeoutRef.current) {
      clearTimeout(httpTimeoutRef.current);
    }

    stopHeartbeat();
    stopHTTPPolling();

    if (wsRef.current) {
      wsRef.current.close(1000, 'Desconexão solicitada pelo cliente');
      wsRef.current = null;
    }

    setConnectionState('disconnected');
    setConnectionMode('disconnected');
  }, [stopHTTPPolling]);

  /**
   * Processar mensagens recebidas
   */
  const handleMessage = useCallback((message) => {
    setMetrics(prev => ({
      ...prev,
      messagesReceived: prev.messagesReceived + 1,
      lastMessageTime: Date.now()
    }));

    switch (message.type) {
      case 'connection':
        handleConnectionMessage(message);
        break;

      case 'initial_state':
        handleInitialState(message);
        break;

      case 'state_update':
        handleStateUpdate(message);
        break;

      case 'cache_invalidated':
        handleCacheInvalidated(message);
        break;

      case 'denuncia_created':
      case 'denuncia_approved':
      case 'publication_scheduled':
      case 'publication_completed':
        handleFlowEvent(message);
        break;

      case 'system_alert':
        handleSystemAlert(message);
        break;

      case 'pong':
        // Heartbeat response
        break;

      case 'error':
        handleServerError(message);
        break;

      default:
        console.warn('[INTEGRATION] Tipo de mensagem desconhecido:', message.type);
    }
  }, [onStateChange]);

  /**
   * Lidar com mensagem de conexão
   */
  const handleConnectionMessage = useCallback((message) => {
    console.log('[INTEGRATION] Conectado com sucesso:', message.data);
  }, []);

  /**
   * Lidar com estado inicial
   */
  const handleInitialState = useCallback((message) => {
    const newState = message.data;
    setGlobalState(newState);
    
    setMetrics(prev => ({
      ...prev,
      stateUpdates: prev.stateUpdates + 1
    }));

    if (onStateChange) {
      onStateChange({ type: 'initial_state', state: newState });
    }

    console.log('[INTEGRATION] Estado inicial recebido');
  }, [onStateChange]);

  /**
   * Lidar com atualização de estado
   */
  const handleStateUpdate = useCallback((message) => {
    const { section, data } = message;
    
    setGlobalState(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        ...data,
        lastUpdate: message.timestamp
      },
      version: prev.version + 1
    }));

    setMetrics(prev => ({
      ...prev,
      stateUpdates: prev.stateUpdates + 1
    }));

    if (onStateChange) {
      onStateChange({ type: 'state_update', section, data, timestamp: message.timestamp });
    }

    console.log(`[INTEGRATION] Estado atualizado: ${section}`);
  }, [onStateChange]);

  /**
   * Lidar com invalidação de cache
   */
  const handleCacheInvalidated = useCallback((message) => {
    const { data } = message;
    
    if (data.shouldRefresh) {
      // Marcar seções afetadas como loading
      const affectedSections = ['dashboard', 'agenda', 'queue'];
      
      setGlobalState(prev => {
        const newState = { ...prev };
        affectedSections.forEach(section => {
          if (newState[section]) {
            newState[section] = {
              ...newState[section],
              isLoading: true
            };
          }
        });
        return newState;
      });

      // Solicitar dados atualizados
      requestDataRefresh(affectedSections);
    }
  }, []);

  /**
   * Lidar com eventos de fluxo
   */
  const handleFlowEvent = useCallback((message) => {
    const { type, data } = message;
    
    // Atualizar indicadores visuais baseado no evento
    switch (type) {
      case 'denuncia_created':
        // Incrementar contador de pendentes
        setGlobalState(prev => ({
          ...prev,
          queue: {
            ...prev.queue,
            pending: prev.queue.pending + 1
          }
        }));
        break;

      case 'denuncia_approved':
        // Mover de pendente para processando
        setGlobalState(prev => ({
          ...prev,
          queue: {
            ...prev.queue,
            pending: Math.max(0, prev.queue.pending - 1),
            processing: prev.queue.processing + 1
          }
        }));
        break;

      case 'publication_completed':
        // Mover de processando para completo
        setGlobalState(prev => ({
          ...prev,
          queue: {
            ...prev.queue,
            processing: Math.max(0, prev.queue.processing - 1)
          }
        }));
        break;
    }

    console.log(`[INTEGRATION] Evento de fluxo: ${type}`, data);
  }, []);

  /**
   * Lidar com alertas do sistema
   */
  const handleSystemAlert = useCallback((message) => {
    const { data } = message;
    
    setGlobalState(prev => ({
      ...prev,
      system: {
        ...prev.system,
        health: data.health || prev.system.health,
        lastAlert: {
          message: data.message,
          level: data.level,
          timestamp: message.timestamp
        }
      }
    }));

    // Mostrar notificação se crítico
    if (data.level === 'critical') {
      console.error('[INTEGRATION] Alerta crítico do sistema:', data.message);
    }
  }, []);

  /**
   * Lidar com erro do servidor
   */
  const handleServerError = useCallback((message) => {
    const serverError = {
      type: 'server',
      message: message.data.message,
      timestamp: Date.now()
    };

    setError(serverError);
    
    setMetrics(prev => ({
      ...prev,
      errorCount: prev.errorCount + 1
    }));

    if (onError) {
      onError(serverError);
    }
  }, [onError]);

  /**
   * Inscrever-se nos canais
   */
  const subscribeToChannels = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const message = {
        type: 'subscribe',
        data: { channels: subscriptions }
      };

      wsRef.current.send(JSON.stringify(message));
      subscriptions.forEach(channel => subscriptionsRef.current.add(channel));
      
      console.log('[INTEGRATION] Inscrito nos canais:', subscriptions);
    }
  }, [subscriptions]);

  /**
   * Solicitar atualização de dados
   */
  const requestDataRefresh = useCallback(async (sections = ['dashboard', 'agenda', 'queue']) => {
    if (connectionMode === 'websocket' && wsRef.current?.readyState === WebSocket.OPEN) {
      // Usar WebSocket
      sections.forEach(section => {
        const typeMap = {
          dashboard: 'dashboard_summary',
          agenda: 'agenda_upcoming',
          queue: 'queue_status'
        };

        const message = {
          type: 'request_data',
          data: { type: typeMap[section] }
        };

        wsRef.current.send(JSON.stringify(message));
      });
    } else if (connectionMode === 'http') {
      // Usar HTTP
      try {
        const token = localStorage.getItem('adminToken');
        if (!token) return;

        for (const section of sections) {
          const endpointMap = {
            dashboard: '/dashboard/summary',
            agenda: '/agenda/upcoming',
            queue: '/queue/status'
          };

          const response = await axios.get(`${CONFIG.http.baseURL}${endpointMap[section]}`, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: CONFIG.http.timeout
          });

          if (response.data) {
            handleMessage({
              type: 'state_update',
              section,
              data: response.data,
              timestamp: Date.now()
            });
          }
        }
      } catch (error) {
        console.warn('[INTEGRATION] Erro ao atualizar dados via HTTP:', error);
      }
    }
  }, [connectionMode]);

  /**
   * Agendar reconexão
   */
  const scheduleReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= CONFIG.websocket.maxReconnectAttempts) {
      console.log('[INTEGRATION] Máximo de tentativas atingido, usando fallback HTTP');
      connectHTTP().catch(error => {
        handleConnectionFailure(error);
      });
      return;
    }

    const delay = CONFIG.websocket.reconnectInterval * Math.pow(2, reconnectAttemptsRef.current);
    reconnectAttemptsRef.current++;

    reconnectTimeoutRef.current = setTimeout(() => {
      connect();
    }, delay);

    console.log(`[INTEGRATION] Reconectando em ${delay}ms (tentativa ${reconnectAttemptsRef.current})`);
  }, [connect, connectHTTP, handleConnectionFailure]);

  /**
   * Iniciar heartbeat
   */
  const startHeartbeat = useCallback(() => {
    heartbeatIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        const message = { type: 'ping', timestamp: Date.now() };
        wsRef.current.send(JSON.stringify(message));
      }
    }, CONFIG.websocket.heartbeatInterval);
  }, []);

  /**
   * Parar heartbeat
   */
  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  /**
   * Iniciar HTTP polling
   */
  const startHTTPPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    pollingIntervalRef.current = setInterval(async () => {
      try {
        const token = localStorage.getItem('adminToken');
        if (!token) return;

        // Buscar dados atualizados
        const response = await axios.get(`${CONFIG.http.baseURL}/dashboard/summary`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: CONFIG.http.timeout
        });

        if (response.data) {
          // Simular mensagem WebSocket para compatibilidade
          handleMessage({
            type: 'state_update',
            section: 'dashboard',
            data: response.data,
            timestamp: Date.now()
          });
        }
      } catch (error) {
        console.warn('[INTEGRATION] Erro no polling HTTP:', error);
        // Não falhar completamente, continuar tentando
      }
    }, CONFIG.http.pollingInterval);
  }, []);

  /**
   * Parar HTTP polling
   */
  const stopHTTPPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  /**
   * Atualizar métricas de uptime
   */
  useEffect(() => {
    if (connectionState === 'connected' && connectionStartTimeRef.current) {
      const updateUptime = () => {
        setMetrics(prev => ({
          ...prev,
          connectionUptime: Date.now() - connectionStartTimeRef.current
        }));
      };

      const uptimeInterval = setInterval(updateUptime, 1000);
      return () => clearInterval(uptimeInterval);
    }
  }, [connectionState]);

  /**
   * Auto-connect e cleanup
   */
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  /**
   * Formatadores e utilitários
   */
  const formatters = useMemo(() => ({
    formatUptime: (ms) => {
      const seconds = Math.floor(ms / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      
      if (hours > 0) return `${hours}h ${minutes % 60}m`;
      if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
      return `${seconds}s`;
    },
    
    formatLastUpdate: (timestamp) => {
      if (!timestamp) return 'Nunca';
      const diff = Date.now() - new Date(timestamp).getTime();
      const seconds = Math.floor(diff / 1000);
      
      if (seconds < 60) return `${seconds}s atrás`;
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return `${minutes}m atrás`;
      const hours = Math.floor(minutes / 60);
      return `${hours}h atrás`;
    }
  }), []);

  /**
   * Status da conexão com cores
   */
  const connectionStatus = useMemo(() => {
    const statusMap = {
      connected: { 
        color: theme.palette.success.main, 
        text: connectionMode === 'websocket' ? 'Conectado (WebSocket)' : 
              connectionMode === 'http' ? 'Conectado (HTTP)' : 'Conectado',
        icon: connectionMode === 'websocket' ? '🟢' : 
              connectionMode === 'http' ? '🔵' : '🟢'
      },
      connecting: { 
        color: theme.palette.warning.main, 
        text: 'Conectando...',
        icon: '🟡'
      },
      disconnected: { 
        color: theme.palette.error.main, 
        text: 'Desconectado',
        icon: '🔴'
      },
      error: { 
        color: theme.palette.error.main, 
        text: connectionMode === 'degraded' ? 'Modo Degradado' : 'Erro',
        icon: connectionMode === 'degraded' ? '⚠️' : '❌'
      }
    };

    return statusMap[connectionState] || statusMap.disconnected;
  }, [connectionState, connectionMode, theme]);

  // API pública do hook
  return {
    // Estado
    connectionState,
    connectionMode,
    globalState,
    metrics,
    error,
    connectionStatus,

    // Ações
    connect,
    disconnect,
    requestDataRefresh,

    // Utilitários
    formatters,
    
    // Status helpers
    isConnected: connectionState === 'connected',
    isWebSocket: connectionMode === 'websocket',
    isHTTP: connectionMode === 'http',
    isDegraded: connectionMode === 'degraded',
    isLoading: Object.values(globalState).some(section => section?.isLoading),
    hasError: !!error,
    
    // Seções específicas (para compatibilidade com componentes existentes)
    dashboardData: globalState.dashboard,
    agendaData: globalState.agenda,
    queueData: globalState.queue,
    systemData: globalState.system
  };
};

/**
 * Hook específico para agenda (compatibilidade com PostingScheduleCard)
 */
export const useAgendaData = (options = {}) => {
  const { enabled = true, ...restOptions } = options;
  
  const orchestratorResult = useIntegrationOrchestrator({
    subscriptions: enabled ? ['agenda_updates'] : [],
    ...restOptions
  });

  const refreshAgenda = useCallback(() => {
    if (enabled && orchestratorResult.requestDataRefresh) {
      orchestratorResult.requestDataRefresh(['agenda']);
    }
  }, [enabled, orchestratorResult.requestDataRefresh]);

  // Return null object when disabled
  if (!enabled) {
    return {
      agendaPostagens: [],
      isLoading: false,
      lastUpdate: null,
      onRefresh: () => {},
      isConnected: false,
      formatLastUpdate: () => 'Desabilitado'
    };
  }

  const { agendaData, isConnected, formatters } = orchestratorResult;

  return {
    agendaPostagens: agendaData?.upcoming || [],
    isLoading: agendaData?.isLoading || false,
    lastUpdate: agendaData?.lastUpdate,
    onRefresh: refreshAgenda,
    isConnected,
    formatLastUpdate: formatters?.formatLastUpdate || (() => 'N/A')
  };
};

/**
 * Hook específico para dashboard
 */
export const useDashboardData = (options = {}) => {
  const { dashboardData, queueData, systemData, isConnected, requestDataRefresh, formatters } = useIntegrationOrchestrator({
    subscriptions: ['dashboard_updates', 'queue_updates', 'system_alerts'],
    ...options
  });

  const refreshDashboard = useCallback(() => {
    requestDataRefresh(['dashboard', 'queue']);
  }, [requestDataRefresh]);

  return {
    summary: dashboardData?.summary,
    queueStatus: queueData,
    systemHealth: systemData?.health,
    isLoading: dashboardData?.isLoading || queueData?.isLoading,
    lastUpdate: dashboardData?.lastUpdate,
    onRefresh: refreshDashboard,
    isConnected,
    formatLastUpdate: formatters.formatLastUpdate
  };
};

export default useIntegrationOrchestrator;