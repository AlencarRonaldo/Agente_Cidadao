# WebSocket Fallback Implementation

## Resumo das Mudanças

Este documento descreve as modificações realizadas no hook `useIntegrationOrchestrator` para resolver problemas de timeout na conexão WebSocket e implementar um sistema robusto de fallback.

## Problemas Identificados

### 1. WebSocket Timeout
- **Problema**: Timeout de 10 segundos muito baixo
- **Solução**: Aumentado para 15 segundos e implementado fallback automático

### 2. URL WebSocket Incorreta
- **Problema**: `ws://localhost:8081/admin/ws` pode não estar disponível
- **Solução**: Fallback automático para HTTP polling quando WebSocket falha

### 3. Dependência Obrigatória do WebSocket
- **Problema**: Sistema falhava completamente sem WebSocket
- **Solução**: WebSocket desabilitado por padrão, HTTP polling como fallback

### 4. Ausência de Modo Degradado
- **Problema**: Nenhum plano B quando conectividade falha
- **Solução**: Modo degradado com dados estáticos/cache local

## Novas Funcionalidades

### 1. Múltiplos Modos de Conexão

```javascript
const CONFIG = {
  // WebSocket (desabilitado por padrão)
  websocket: {
    enabled: false,
    url: 'ws://localhost:8081/admin/ws',
    reconnectInterval: 2000,
    maxReconnectAttempts: 3,
    heartbeatInterval: 45000,
    connectionTimeout: 15000 // Aumentado para 15s
  },
  // HTTP Polling (fallback padrão)
  http: {
    baseURL: 'http://localhost:8081/admin/api',
    pollingInterval: 5000, // 5 segundos
    timeout: 10000
  }
};
```

### 2. Configurações do Hook

```javascript
const integration = useIntegrationOrchestrator({
  autoConnect: true,
  enableWebSocket: false, // WebSocket desabilitado por padrão
  fallbackMode: 'http', // 'http', 'websocket', 'auto'
  subscriptions: ['dashboard_updates', 'agenda_updates', 'queue_updates'],
  enableMetrics: true,
  onError: (error) => console.log('Erro:', error),
  onStateChange: (change) => console.log('Mudança:', change)
});
```

### 3. Estados de Conexão

- **`websocket`**: Conectado via WebSocket (tempo real)
- **`http`**: Conectado via HTTP polling (5 segundos)
- **`degraded`**: Modo degradado (sem conectividade)
- **`disconnected`**: Desconectado

### 4. Fallback Automático

1. **Tentativa WebSocket** (se habilitado)
   - Timeout após 15 segundos
   - Máximo 3 tentativas de reconexão

2. **Fallback HTTP Polling**
   - Polling a cada 5 segundos
   - Endpoints REST para dados

3. **Modo Degradado**
   - Dados estáticos/cache local
   - Interface funcional sem atualizações

## API do Hook Atualizada

### Novos Status Helpers

```javascript
const {
  // Estados existentes
  connectionState,
  globalState,
  metrics,
  error,
  
  // Novos estados
  connectionMode, // 'websocket', 'http', 'degraded'
  
  // Novos helpers
  isWebSocket,     // true se conectado via WebSocket
  isHTTP,          // true se conectado via HTTP
  isDegraded,      // true se em modo degradado
  
  // Ações existentes
  connect,
  disconnect,
  requestDataRefresh
} = useIntegrationOrchestrator(options);
```

### Status Visual Atualizado

```javascript
connectionStatus = {
  color: theme.palette.success.main,
  text: 'Conectado (HTTP)', // Indica o modo
  icon: '🔵' // Azul para HTTP, Verde para WebSocket
}
```

## Exemplos de Uso

### 1. Modo Padrão (HTTP Polling)

```javascript
const Dashboard = () => {
  const integration = useIntegrationOrchestrator({
    autoConnect: true,
    // enableWebSocket: false por padrão
    fallbackMode: 'http'
  });

  return (
    <div>
      Status: {integration.connectionStatus.text}
      Modo: {integration.isHTTP ? 'HTTP' : integration.isWebSocket ? 'WebSocket' : 'Degradado'}
    </div>
  );
};
```

### 2. WebSocket com Fallback

```javascript
const Dashboard = () => {
  const integration = useIntegrationOrchestrator({
    autoConnect: true,
    enableWebSocket: true, // Tentar WebSocket primeiro
    fallbackMode: 'auto', // Fallback automático
    onError: (error) => console.log('Erro:', error)
  });

  return (
    <div>
      Status: {integration.connectionStatus.text} {integration.connectionStatus.icon}
      {integration.isDegraded && (
        <div>⚠️ Sistema em modo degradado</div>
      )}
    </div>
  );
};
```

### 3. Modo Produção

```javascript
const ProductionDashboard = () => {
  const integration = useIntegrationOrchestrator({
    autoConnect: true,
    enableWebSocket: true, // Tentar tempo real
    fallbackMode: 'auto', // Fallback inteligente
    onError: (error) => {
      // Log para monitoramento
      console.error('[PROD] Erro de integração:', error);
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
      <div style={{ backgroundColor: getStatusColor() }}>
        {integration.connectionStatus.text}
        {integration.isConnected && (
          <span>({integration.isWebSocket ? 'Tempo Real' : 'Polling 5s'})</span>
        )}
      </div>
    </div>
  );
};
```

## Configuração de Variáveis de Ambiente

```env
# WebSocket (opcional)
REACT_APP_WS_URL=ws://localhost:8081/admin/ws

# HTTP API (obrigatório para fallback)
REACT_APP_API_URL=http://localhost:8081/admin/api
```

## Endpoints HTTP Necessários

Para o funcionamento do fallback HTTP, os seguintes endpoints devem estar disponíveis:

```
GET /admin/api/health           # Health check
GET /admin/api/dashboard/summary # Dados do dashboard
GET /admin/api/agenda/upcoming   # Agenda de postagens
GET /admin/api/queue/status      # Status da fila
```

## Benefícios

1. **Resiliência**: Sistema funciona mesmo sem WebSocket
2. **Performance**: HTTP polling eficiente (5s)
3. **Experiência do Usuário**: Feedback visual do modo de conexão
4. **Modo Degradado**: Interface funcional sem conectividade
5. **Fallback Automático**: Transição transparente entre modos
6. **Configuração Flexível**: Adaptável para diferentes ambientes

## Compatibilidade

- ✅ Todos os componentes existentes continuam funcionando
- ✅ API do hook mantida (apenas adições)
- ✅ Configurações opcionais (padrões seguros)
- ✅ Fallback automático transparente

## Monitoramento

O hook fornece métricas detalhadas:

```javascript
const { metrics } = useIntegrationOrchestrator();

console.log({
  connectionUptime: metrics.connectionUptime,
  messagesReceived: metrics.messagesReceived,
  stateUpdates: metrics.stateUpdates,
  errorCount: metrics.errorCount
});
```

## Próximos Passos

1. **Implementar endpoints HTTP** no backend
2. **Configurar variáveis de ambiente** adequadas
3. **Testar cenários de fallback** em ambiente de desenvolvimento
4. **Implementar logs de monitoramento** em produção
5. **Documentar endpoints da API** para a equipe backend