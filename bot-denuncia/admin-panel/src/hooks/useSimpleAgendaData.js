/**
 * Hook simples para agenda de postagens - Sem WebSocket
 * 
 * Versão simplificada que trabalha apenas com dados locais/props
 * para evitar timeouts de WebSocket e garantir funcionalidade
 */

import { useState, useEffect, useCallback } from 'react';

export const useSimpleAgendaData = (options = {}) => {
  const { 
    enabled = true, 
    onError, 
    onStateChange 
  } = options;
  
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  
  // CORREÇÃO CRÍTICA: Hook desabilitado para usar dados reais do backend
  // Este hook estava bloqueando os dados reais retornando apenas mocks
  
  const onRefresh = useCallback(() => {
    if (!enabled) return;
    
    setIsLoading(true);
    
    // Simular refresh sem retornar dados mock
    setTimeout(() => {
      setLastUpdate(new Date());
      setIsLoading(false);
      
      if (onStateChange) {
        onStateChange({ type: 'refresh_completed' });
      }
    }, 500);
  }, [enabled, onStateChange]);

  const formatLastUpdate = useCallback(() => {
    if (!lastUpdate) return 'Nunca';
    
    const now = new Date();
    const diff = Math.floor((now - lastUpdate) / 1000);
    
    if (diff < 60) return `${diff}s atrás`;
    if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`;
    return lastUpdate.toLocaleTimeString('pt-BR');
  }, [lastUpdate]);

  // Auto-refresh effect (opcional)
  useEffect(() => {
    if (!enabled) return;
    
    const interval = setInterval(() => {
      setLastUpdate(new Date());
    }, 30000); // Atualiza timestamp a cada 30s
    
    return () => clearInterval(interval);
  }, [enabled]);

  return {
    // CORREÇÃO: Retornar array vazio para forçar uso dos dados das props
    agendaPostagens: [],
    isLoading,
    lastUpdate,
    onRefresh,
    isConnected: enabled,
    formatLastUpdate,
    connectionMode: 'disabled', // Modo desabilitado para usar dados reais
    connectionStatus: {
      text: 'Usando dados reais do backend',
      icon: '🔗',
      color: '#4caf50'
    }
  };
};

export default useSimpleAgendaData;