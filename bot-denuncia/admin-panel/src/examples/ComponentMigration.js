/**
 * Exemplos de migração de componentes existentes para usar o novo sistema de fallback
 * 
 * Este arquivo mostra como atualizar componentes que já usam o useIntegrationOrchestrator
 * para aproveitar as novas funcionalidades de fallback HTTP.
 */

import React from 'react';
import { useIntegrationOrchestrator, useAgendaData, useDashboardData } from '../hooks/useIntegrationOrchestrator';

// ANTES: Componente dependente do WebSocket
const OldDashboardComponent = () => {
  const {
    isConnected,
    globalState,
    error,
    connectionStatus
  } = useIntegrationOrchestrator({
    autoConnect: true,
    // Sem opções de fallback - falha se WebSocket não disponível
  });

  if (!isConnected) {
    return <div>Não conectado - nenhum dado disponível</div>;
  }

  return (
    <div>
      <div>Status: {connectionStatus.text}</div>
      <div>Dados: {JSON.stringify(globalState.dashboard)}</div>
    </div>
  );
};

// DEPOIS: Componente com fallback HTTP
const NewDashboardComponent = () => {
  const {
    isConnected,
    isHTTP,
    isWebSocket,
    isDegraded,
    globalState,
    error,
    connectionStatus,
    connectionMode
  } = useIntegrationOrchestrator({
    autoConnect: true,
    enableWebSocket: false, // Usar HTTP por padrão para maior confiabilidade
    fallbackMode: 'http',
    onError: (error) => {
      console.warn('[DASHBOARD] Erro de conexão:', error);
    }
  });

  // Renderizar mesmo sem conexão (modo degradado)
  return (
    <div>
      <div style={{ 
        padding: '8px', 
        backgroundColor: isConnected ? '#e8f5e8' : isDegraded ? '#fff3cd' : '#ffebee',
        borderRadius: '4px' 
      }}>
        Status: {connectionStatus.text} {connectionStatus.icon}
        {isConnected && (
          <span style={{ marginLeft: '8px', fontSize: '0.8em' }}>
            ({isWebSocket ? 'Tempo Real' : isHTTP ? 'Atualização 5s' : 'Modo Degradado'})
          </span>
        )}
      </div>

      {isDegraded && (
        <div style={{ 
          padding: '8px', 
          margin: '8px 0',
          backgroundColor: '#fff3cd',
          borderRadius: '4px'
        }}>
          ⚠️ Dados podem estar desatualizados. Sistema funcionando em modo offline.
        </div>
      )}

      <div>
        <h3>Dados do Dashboard:</h3>
        <pre>{JSON.stringify(globalState.dashboard, null, 2)}</pre>
      </div>

      {error && (
        <div style={{ color: 'red', margin: '8px 0' }}>
          Erro: {error.message}
        </div>
      )}
    </div>
  );
};

// EXEMPLO: Migração do PostingScheduleCard
const OldPostingScheduleCard = () => {
  const {
    agendaPostagens,
    isLoading,
    lastUpdate,
    onRefresh,
    isConnected,
    formatLastUpdate
  } = useAgendaData({
    enabled: true
    // Sem configurações de fallback
  });

  if (!isConnected) {
    return <div>Agenda indisponível - WebSocket desconectado</div>;
  }

  return (
    <div>
      <h3>Agenda de Postagens</h3>
      <div>Última atualização: {formatLastUpdate(lastUpdate)}</div>
      <div>Carregando: {isLoading ? 'Sim' : 'Não'}</div>
      <ul>
        {agendaPostagens.map((item, index) => (
          <li key={index}>{JSON.stringify(item)}</li>
        ))}
      </ul>
      <button onClick={onRefresh}>Atualizar</button>
    </div>
  );
};

const NewPostingScheduleCard = () => {
  // Usar o hook específico com configurações padrão otimizadas
  const agenda = useAgendaData({
    enabled: true,
    // Herda configurações padrão do useIntegrationOrchestrator:
    // - enableWebSocket: false (HTTP por padrão)
    // - fallbackMode: 'http'
    // - autoConnect: true
  });

  // O hook agora retorna dados mesmo sem conexão
  return (
    <div>
      <h3>Agenda de Postagens</h3>
      
      {/* Indicador visual do status */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px',
        marginBottom: '12px'
      }}>
        <span>Status: {agenda.isConnected ? '🟢 Online' : '🔴 Offline'}</span>
        <span>•</span>
        <span>Última atualização: {agenda.formatLastUpdate(agenda.lastUpdate)}</span>
        {agenda.isLoading && <span>• ⏳ Carregando...</span>}
      </div>

      {/* Lista de postagens */}
      <div>
        {agenda.agendaPostagens.length > 0 ? (
          <ul>
            {agenda.agendaPostagens.map((item, index) => (
              <li key={index}>
                <div>{item.titulo || 'Postagem sem título'}</div>
                <div style={{ fontSize: '0.8em', color: '#666' }}>
                  {item.data || 'Data não definida'}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div style={{ 
            padding: '20px',
            textAlign: 'center',
            backgroundColor: '#f5f5f5',
            borderRadius: '4px'
          }}>
            {agenda.isConnected ? 
              '📅 Nenhuma postagem agendada' : 
              '📅 Dados da agenda não disponíveis offline'
            }
          </div>
        )}
      </div>

      {/* Botão de atualização */}
      <button 
        onClick={agenda.onRefresh}
        disabled={!agenda.isConnected}
        style={{
          marginTop: '12px',
          padding: '8px 16px',
          backgroundColor: agenda.isConnected ? '#2196f3' : '#ccc',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: agenda.isConnected ? 'pointer' : 'not-allowed'
        }}
      >
        {agenda.isLoading ? 'Atualizando...' : 'Atualizar Agenda'}
      </button>
    </div>
  );
};

// EXEMPLO: Componente de status global do sistema
const SystemStatusBar = () => {
  const integration = useIntegrationOrchestrator({
    autoConnect: true,
    enableWebSocket: false, // HTTP confiável
    fallbackMode: 'http',
    enableMetrics: true
  });

  const getStatusInfo = () => {
    if (integration.isConnected) {
      if (integration.isWebSocket) {
        return { text: 'Sistema Online (Tempo Real)', color: '#4caf50', icon: '🟢' };
      } else if (integration.isHTTP) {
        return { text: 'Sistema Online (HTTP)', color: '#2196f3', icon: '🔵' };
      }
    } else if (integration.isDegraded) {
      return { text: 'Modo Offline', color: '#ff9800', icon: '⚠️' };
    }
    return { text: 'Sistema Indisponível', color: '#f44336', icon: '🔴' };
  };

  const statusInfo = getStatusInfo();

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      padding: '8px 16px',
      backgroundColor: statusInfo.color,
      color: 'white',
      fontSize: '0.9em',
      borderRadius: '0 0 0 8px',
      zIndex: 1000
    }}>
      {statusInfo.icon} {statusInfo.text}
      {integration.metrics && integration.isConnected && (
        <span style={{ marginLeft: '8px', fontSize: '0.8em' }}>
          (Uptime: {integration.formatters.formatUptime(integration.metrics.connectionUptime)})
        </span>
      )}
    </div>
  );
};

// EXEMPLO: Hook personalizado para dados específicos
const useSystemHealth = () => {
  const integration = useIntegrationOrchestrator({
    autoConnect: true,
    enableWebSocket: false,
    fallbackMode: 'http',
    subscriptions: ['system_alerts'], // Apenas alertas do sistema
  });

  return {
    isSystemHealthy: integration.isConnected && !integration.hasError,
    systemStatus: integration.systemData?.health || 'unknown',
    connectionMode: integration.connectionMode,
    lastHealthCheck: integration.systemData?.lastHealthCheck,
    alerts: integration.systemData?.lastAlert,
    canReceiveAlerts: integration.isConnected,
    isRealTime: integration.isWebSocket
  };
};

// Uso do hook personalizado
const SystemHealthIndicator = () => {
  const health = useSystemHealth();

  return (
    <div style={{
      padding: '12px',
      border: `2px solid ${health.isSystemHealthy ? '#4caf50' : '#f44336'}`,
      borderRadius: '8px',
      margin: '12px 0'
    }}>
      <h4>Saúde do Sistema</h4>
      <div>Status: {health.systemStatus}</div>
      <div>Conexão: {health.connectionMode}</div>
      <div>Alertas em tempo real: {health.canReceiveAlerts ? 'Ativo' : 'Inativo'}</div>
      {health.alerts && (
        <div style={{ 
          marginTop: '8px',
          padding: '8px',
          backgroundColor: '#fff3cd',
          borderRadius: '4px'
        }}>
          ⚠️ Último alerta: {health.alerts.message}
        </div>
      )}
    </div>
  );
};

export {
  OldDashboardComponent,
  NewDashboardComponent,
  OldPostingScheduleCard,
  NewPostingScheduleCard,
  SystemStatusBar,
  SystemHealthIndicator,
  useSystemHealth
};