import { useState, useEffect, useRef, useCallback } from 'react';

const useRealtimeNotifications = (token, options = {}) => {
  const {
    channels = ['publication_events', 'system_alerts'],
    autoReconnect = true,
    reconnectInterval = 5000,
    maxReconnectAttempts = 10
  } = options;

  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [connectionError, setConnectionError] = useState(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const isConnectingRef = useRef(false);

  // Configurar conexão WebSocket
  const connect = useCallback(() => {
    if (isConnectingRef.current || !token) return;
    
    isConnectingRef.current = true;
    setConnectionError(null);

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/monitoring`;
      
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('Conexão WebSocket estabelecida');
        setConnected(true);
        setReconnectAttempts(0);
        isConnectingRef.current = false;
        
        // Autenticar
        wsRef.current.send(JSON.stringify({
          type: 'authenticate',
          payload: { token }
        }));
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleMessage(data);
        } catch (error) {
          console.error('Erro ao processar mensagem WebSocket:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('Conexão WebSocket fechada:', event.code, event.reason);
        setConnected(false);
        isConnectingRef.current = false;
        
        if (autoReconnect && reconnectAttempts < maxReconnectAttempts) {
          scheduleReconnect();
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('Erro WebSocket:', error);
        setConnectionError(error);
        isConnectingRef.current = false;
      };

    } catch (error) {
      console.error('Erro ao criar conexão WebSocket:', error);
      setConnectionError(error);
      isConnectingRef.current = false;
    }
  }, [token, autoReconnect, reconnectAttempts, maxReconnectAttempts]);

  // Agendar reconexão
  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    const delay = Math.min(reconnectInterval * Math.pow(2, reconnectAttempts), 30000);
    
    reconnectTimeoutRef.current = setTimeout(() => {
      setReconnectAttempts(prev => prev + 1);
      connect();
    }, delay);
  }, [connect, reconnectInterval, reconnectAttempts]);

  // Processar mensagens recebidas
  const handleMessage = useCallback((data) => {
    switch (data.type) {
      case 'auth_success':
        console.log('Autenticação WebSocket bem-sucedida');
        
        // Inscrever-se nos canais solicitados
        wsRef.current.send(JSON.stringify({
          type: 'subscribe',
          payload: { channels }
        }));
        break;

      case 'publication_event':
        addNotification({
          id: `pub-${Date.now()}`,
          type: 'publication',
          severity: data.data.event === 'failed' ? 'error' : 'info',
          title: getPublicationEventTitle(data.data),
          message: getPublicationEventMessage(data.data),
          timestamp: new Date(),
          data: data.data
        });
        break;

      case 'system_alert':
        addNotification({
          id: `alert-${Date.now()}`,
          type: 'alert',
          severity: data.data.severity,
          title: data.data.title || 'Alerta do Sistema',
          message: data.data.message,
          timestamp: new Date(),
          data: data.data
        });
        break;

      case 'publication_feedback':
        addNotification({
          id: `feedback-${Date.now()}`,
          type: 'feedback',
          severity: data.data.feedback.type,
          title: data.data.feedback.title,
          message: data.data.feedback.message,
          timestamp: new Date(),
          data: data.data,
          autoHide: true
        });
        break;

      case 'status_change':
        addNotification({
          id: `status-${Date.now()}`,
          type: 'status_change',
          severity: 'info',
          title: 'Status Alterado',
          message: `Denúncia ${data.data.denunciaId}: ${data.data.oldStatus} → ${data.data.newStatus}`,
          timestamp: new Date(),
          data: data.data
        });
        break;

      case 'error':
        console.error('Erro do servidor WebSocket:', data.error);
        setConnectionError(new Error(data.error));
        break;

      default:
        console.log('Mensagem WebSocket não tratada:', data.type);
    }
  }, [channels]);

  // Adicionar notificação
  const addNotification = useCallback((notification) => {
    setNotifications(prev => {
      // Evitar duplicatas
      const exists = prev.some(n => n.id === notification.id);
      if (exists) return prev;

      // Adicionar nova notificação no topo
      const updated = [notification, ...prev];
      
      // Manter apenas as 50 mais recentes
      return updated.slice(0, 50);
    });

    // Auto-remover se configurado
    if (notification.autoHide) {
      setTimeout(() => {
        removeNotification(notification.id);
      }, 5000);
    }
  }, []);

  // Remover notificação
  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // Limpar todas as notificações
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Marcar notificação como lida
  const markAsRead = useCallback((id) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  }, []);

  // Marcar todas como lidas
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  // Desconectar manualmente
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Desconexão manual');
    }
    
    setConnected(false);
    setReconnectAttempts(0);
  }, []);

  // Enviar mensagem
  const sendMessage = useCallback((message) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);

  // Helpers para formatação de mensagens
  const getPublicationEventTitle = (eventData) => {
    switch (eventData.event) {
      case 'queued': return 'Adicionado à Fila';
      case 'processing': return 'Processando';
      case 'published': return 'Publicado com Sucesso';
      case 'failed': return 'Falha na Publicação';
      default: return 'Evento de Publicação';
    }
  };

  const getPublicationEventMessage = (eventData) => {
    const denunciaId = eventData.denunciaId;
    
    switch (eventData.event) {
      case 'queued':
        return `Denúncia ${denunciaId} foi adicionada à fila de publicação.`;
      case 'processing':
        return `Processando publicação da denúncia ${denunciaId}.`;
      case 'published':
        return `Denúncia ${denunciaId} foi publicada no Instagram.`;
      case 'failed':
        return `Falha ao publicar denúncia ${denunciaId}. ${eventData.metadata?.error || ''}`;
      default:
        return `Evento ${eventData.event} para denúncia ${denunciaId}.`;
    }
  };

  // Estatísticas das notificações
  const getNotificationStats = useCallback(() => {
    const unread = notifications.filter(n => !n.read);
    const byType = notifications.reduce((acc, n) => {
      acc[n.type] = (acc[n.type] || 0) + 1;
      return acc;
    }, {});
    const bySeverity = notifications.reduce((acc, n) => {
      acc[n.severity] = (acc[n.severity] || 0) + 1;
      return acc;
    }, {});

    return {
      total: notifications.length,
      unread: unread.length,
      byType,
      bySeverity
    };
  }, [notifications]);

  // Efeito principal
  useEffect(() => {
    if (token) {
      connect();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [token, connect]);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    // Estado da conexão
    connected,
    connectionError,
    reconnectAttempts,
    isReconnecting: reconnectAttempts > 0 && !connected,
    
    // Notificações
    notifications,
    unreadCount: notifications.filter(n => !n.read).length,
    stats: getNotificationStats(),
    
    // Ações
    connect,
    disconnect,
    sendMessage,
    addNotification,
    removeNotification,
    clearNotifications,
    markAsRead,
    markAllAsRead
  };
};

export default useRealtimeNotifications;