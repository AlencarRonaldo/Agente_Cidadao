/**
 * Exemplo de uso do useIntegrationOrchestrator com fallback HTTP
 * 
 * Este arquivo demonstra como usar o hook de integração com as novas
 * funcionalidades de fallback e modo degradado.
 */

import React from 'react';
import { useIntegrationOrchestrator } from '../hooks/useIntegrationOrchestrator';

// Exemplo 1: Uso padrão (HTTP polling por padrão)
export const DashboardWithHTTPFallback = () => {
  const {
    isConnected,
    isHTTP,
    isWebSocket,
    isDegraded,
    connectionStatus,
    dashboardData,
    error,
    connect,
    disconnect
  } = useIntegrationOrchestrator({
    autoConnect: true,
    // enableWebSocket: false, // WebSocket desabilitado por padrão
    fallbackMode: 'http', // Usar HTTP polling como padrão
    onError: (error) => {
      console.log('Erro de conexão:', error);
    }
  });

  return (
    <div>
      <h2>Dashboard com Fallback HTTP</h2>
      <div>
        Status: {connectionStatus.text} {connectionStatus.icon}
      </div>
      <div>
        Modo: {isHTTP ? 'HTTP Polling' : isWebSocket ? 'WebSocket' : isDegraded ? 'Degradado' : 'Desconhecido'}
      </div>
      {error && (
        <div style={{ color: 'red' }}>
          Erro: {error.message}
        </div>
      )}
      <div>
        Dados: {JSON.stringify(dashboardData, null, 2)}
      </div>
      <button onClick={connect}>Conectar</button>
      <button onClick={disconnect}>Desconectar</button>
    </div>
  );
};

// Exemplo 2: Tentativa WebSocket com fallback automático
export const DashboardWithWebSocketFallback = () => {
  const integration = useIntegrationOrchestrator({
    autoConnect: true,
    enableWebSocket: true, // Tentar WebSocket primeiro
    fallbackMode: 'auto', // Fallback automático para HTTP se WebSocket falhar
    onError: (error) => {
      console.log('Erro de conexão:', error);
    },
    onStateChange: (change) => {
      console.log('Estado alterado:', change);
    }
  });

  return (
    <div>
      <h2>Dashboard com WebSocket + Fallback</h2>
      <div>
        Status: {integration.connectionStatus.text} {integration.connectionStatus.icon}
      </div>
      <div>
        Modo: {integration.connectionMode}
      </div>
      {integration.error && (
        <div style={{ color: 'red' }}>
          Erro: {integration.error.message}
        </div>
      )}
      <div>
        <h3>Dados Dashboard:</h3>
        <pre>{JSON.stringify(integration.dashboardData, null, 2)}</pre>
      </div>
      <div>
        <h3>Status da Fila:</h3>
        <pre>{JSON.stringify(integration.queueData, null, 2)}</pre>
      </div>
      <button onClick={integration.connect}>Reconectar</button>
      <button onClick={() => integration.requestDataRefresh()}>Atualizar Dados</button>
    </div>
  );
};

// Exemplo 3: Modo degradado (sem conectividade)
export const DashboardDegraded = () => {
  const integration = useIntegrationOrchestrator({
    autoConnect: false, // Não conectar automaticamente
    enableWebSocket: false,
    fallbackMode: 'http'
  });

  return (
    <div>
      <h2>Dashboard em Modo Degradado</h2>
      <div>
        Status: {integration.connectionStatus.text} {integration.connectionStatus.icon}
      </div>
      <div>
        Conectado: {integration.isConnected ? 'Sim' : 'Não'}
      </div>
      <div>
        Modo: {integration.connectionMode}
      </div>
      <div>
        <p>Este componente funciona mesmo sem conectividade!</p>
        <p>Os dados são exibidos no estado inicial/cache local.</p>
      </div>
      <div>
        <h3>Dados (Estado Inicial):</h3>
        <pre>{JSON.stringify(integration.globalState, null, 2)}</pre>
      </div>
      <button onClick={integration.connect}>Tentar Conectar</button>
    </div>
  );
};

// Exemplo 4: Configuração para produção
export const ProductionDashboard = () => {
  const integration = useIntegrationOrchestrator({
    autoConnect: true,
    enableWebSocket: true, // Tentar WebSocket se disponível
    fallbackMode: 'auto', // Fallback inteligente
    subscriptions: ['dashboard_updates', 'queue_updates'], // Apenas dados necessários
    enableMetrics: true,
    onError: (error) => {
      // Log para sistema de monitoramento
      console.error('[DASHBOARD] Erro de integração:', error);
      // Enviar para Sentry, LogRocket, etc.
    },
    onStateChange: (change) => {
      // Analytics de uso
      console.log('[DASHBOARD] Estado alterado:', change.type);
    }
  });

  const getStatusColor = () => {
    if (integration.isConnected) {
      return integration.isWebSocket ? '#4caf50' : '#2196f3';
    }
    return integration.isDegraded ? '#ff9800' : '#f44336';
  };

  return (
    <div>
      <h2>Dashboard Produção</h2>
      <div style={{ 
        padding: '10px', 
        backgroundColor: getStatusColor(), 
        color: 'white', 
        borderRadius: '4px' 
      }}>
        {integration.connectionStatus.text} {integration.connectionStatus.icon}
        {integration.isConnected && (
          <span style={{ marginLeft: '10px', fontSize: '0.8em' }}>
            ({integration.isWebSocket ? 'Tempo Real' : 'Polling 5s'})
          </span>
        )}
      </div>
      
      {integration.isDegraded && (
        <div style={{ 
          padding: '10px', 
          backgroundColor: '#fff3cd', 
          border: '1px solid #ffeaa7',
          borderRadius: '4px',
          margin: '10px 0'
        }}>
          ⚠️ Sistema funcionando em modo degradado. Algumas funcionalidades podem estar limitadas.
        </div>
      )}

      <div style={{ marginTop: '20px' }}>
        <h3>Resumo do Sistema</h3>
        <div>Conectado: {integration.isConnected ? '✅' : '❌'}</div>
        <div>Carregando: {integration.isLoading ? '⏳' : '✅'}</div>
        <div>Erros: {integration.hasError ? '❌' : '✅'}</div>
        <div>Modo: {integration.connectionMode}</div>
        {integration.metrics && (
          <div>
            <h4>Métricas:</h4>
            <div>Uptime: {integration.formatters.formatUptime(integration.metrics.connectionUptime)}</div>
            <div>Mensagens: {integration.metrics.messagesReceived}</div>
            <div>Atualizações: {integration.metrics.stateUpdates}</div>
            <div>Erros: {integration.metrics.errorCount}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default {
  DashboardWithHTTPFallback,
  DashboardWithWebSocketFallback,
  DashboardDegraded,
  ProductionDashboard
};