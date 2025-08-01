# Sistema Inteligente de Monitoramento Multi-Camadas

Sistema abrangente de monitoramento com análise preditiva, resposta automática a incidentes e capacidades de auto-cura para a plataforma de denúncias WhatsApp-Instagram.

## 🎯 Visão Geral

O Sistema Inteligente de Monitoramento implementa observabilidade completa com:

- **Health Monitoring não-intrusivo** para todos os componentes do sistema
- **Análise preditiva baseada em ML** para detecção proativa de problemas
- **Dashboard em tempo real** com WebSocket e métricas correlacionadas
- **Resposta automática a incidentes** com capacidades de auto-cura
- **Engine de correlação de performance** com análise cross-system
- **Otimização contínua** com recomendações acionáveis

## 🏗️ Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                    Master Monitoring Orchestrator               │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ Health Monitor  │  │ Metrics Engine  │  │ ML Analysis     │  │
│  │ - WhatsApp      │  │ - Collection    │  │ - Anomalies     │  │
│  │ - Instagram     │  │ - Aggregation   │  │ - Trends        │  │
│  │ - Database      │  │ - Retention     │  │ - Predictions   │  │
│  │ - Queue System  │  │ - Correlation   │  │ - Seasonality   │  │
│  │ - Flow State    │  │ - Real-time     │  │ - Insights      │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ Incident System │  │ Dashboard       │  │ Correlation     │  │
│  │ - Classification│  │ - WebSocket     │  │ - Cross-system  │  │
│  │ - Auto-recovery │  │ - Real-time     │  │ - Lag Analysis  │  │
│  │ - Escalation    │  │ - Multi-layer   │  │ - Causality     │  │
│  │ - Learning      │  │ - Interactive   │  │ - Impact Paths  │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## 📊 Componentes Principais

### 1. Intelligent Health Monitor
**Arquivo**: `src/services/intelligentMonitoringSystem.js`

Monitora a saúde de todos os componentes do sistema com:
- Health checks não-intrusivos a cada 30 segundos
- Análise preditiva com ML para detecção de anomalias
- Thresholds inteligentes adaptáveis por componente
- Recuperação automática para serviços críticos

**Componentes Monitorados**:
- WhatsApp Connection (conexão, uptime, taxa de erro)
- Instagram API (autenticação, posts, risk score)
- PostgreSQL Database (latência, pool de conexões)
- Redis Queue System (profundidade, workers, throughput)
- Flow Orchestrator (taxa de completação, flows travados)
- System Resources (CPU, memória, disco, rede)

### 2. Metrics Aggregation Engine
**Arquivo**: `src/services/metricsAggregationEngine.js`

Sistema de coleta e agregação de métricas com:
- Coleta automática multi-source em intervalos otimizados
- Agregação inteligente com compressão temporal
- Políticas de retenção configuráveis
- Storage em Redis com cleanup automático

**Intervalos de Coleta**:
- **Real-time**: 5s (métricas críticas)
- **Frequent**: 30s (métricas importantes)
- **Regular**: 5min (métricas normais)
- **Periodic**: 1h (métricas de tendência)

**Políticas de Retenção**:
- **Real-time**: 24 horas
- **Hourly**: 1 semana
- **Daily**: 1 mês
- **Weekly**: 1 ano

### 3. ML Analysis Worker
**Arquivo**: `src/workers/mlAnalysisWorker.js`

Worker dedicado para análise de machine learning com:
- **Detecção de Anomalias**: Z-Score, MAD, IQR, método híbrido
- **Análise de Tendências**: Regressão linear, previsões, intervalos de confiança
- **Padrões Sazonais**: FFT, detecção de ciclos, análise harmônica
- **Correlação**: Pearson, Spearman, cross-correlation, DTW, informação mútua

### 4. Automated Incident Response
**Arquivo**: `src/services/automatedIncidentResponse.js`

Sistema inteligente de resposta automática com:
- **Classificação Automática**: Severidade, impacto, prioridade
- **Planos de Recuperação**: Estratégias sequenciais e paralelas
- **Auto-cura**: Reconnection, restart, scaling, failover
- **Escalação Inteligente**: Time-based, severity-based
- **Aprendizado**: Histórico, padrões, otimização

**Estratégias de Recuperação**:
- WhatsApp: soft reconnect → hard reconnect → full restart
- Instagram: refresh session → relogin → backup account
- Database: clear pool → restart connection → readonly mode
- Queue: scale workers → throttle input → pause processing
- Flow: retry flows → reset state → manual recovery
- System: force GC → restart process → horizontal scaling

### 5. Real-time Dashboard
**Arquivo**: `src/services/realtimeDashboard.js`

Dashboard em tempo real com WebSocket:
- **Conexões WebSocket**: Até 100 clientes simultâneos
- **Salas Temáticas**: metrics, incidents, alerts, system_health
- **Filtros Inteligentes**: Por severidade, componente, tempo
- **Compressão**: Otimização automática de payload
- **Auto-reconnect**: Resilência a falhas de rede

**Porta WebSocket**: 8080 (configurável via `DASHBOARD_WS_PORT`)

### 6. Performance Correlation Engine
**Arquivo**: `src/services/performanceCorrelationEngine.js`

Engine de análise de correlação cross-system:
- **Métodos de Correlação**: Pearson, Spearman, Cross-correlation, DTW
- **Análise de Lag**: Relações causais com delay temporal
- **Topologia do Sistema**: Mapeamento de dependências e impactos
- **Insights Acionáveis**: Recomendações baseadas em correlações

### 7. Master Monitoring Orchestrator
**Arquivo**: `src/services/masterMonitoringOrchestrator.js`

Orquestrador central que coordena todos os componentes:
- **Service Registry**: Registro e lifecycle de serviços
- **Configuration Manager**: Configuração centralizada e hot-reload
- **Health Monitoring**: Monitoramento de saúde dos serviços
- **Graceful Startup/Shutdown**: Ordem de dependências
- **Error Handling**: Tratamento de erros críticos

## 🚀 Instalação e Configuração

### 1. Dependências
```bash
npm install ws ioredis @prisma/client
```

### 2. Variáveis de Ambiente
```bash
# Dashboard WebSocket
DASHBOARD_WS_PORT=8080

# Redis (opcional)
REDIS_HOST=localhost
REDIS_PORT=6379

# Monitoring Features
ENABLE_PREDICTIVE_ANALYTICS=true
ENABLE_AUTOMATED_RECOVERY=true
MONITORING_HEALTH_INTERVAL=30000
```

### 3. Inicialização
```javascript
const { initializeMonitoring } = require('./src/services/monitoringInitializer');

// Inicializar sistema de monitoramento
const orchestrator = await initializeMonitoring({
  config: {
    'monitoring.healthCheckInterval': 30000,
    'dashboard.websocket.port': 8080
  }
});

// Integrar com Express
const { integrateWithExpress } = require('./src/services/monitoringInitializer');
integrateWithExpress(app);
```

## 📡 Endpoints da API

### Health Checks
```http
GET /health                 # Health check básico
GET /health/ready           # Kubernetes readiness probe
GET /health/live            # Kubernetes liveness probe
GET /health/monitoring      # Status do sistema de monitoramento
```

### Métricas e Configuração
```http
GET /health/metrics         # Métricas do sistema
GET /health/config          # Configuração atual
POST /health/config         # Atualizar configuração
```

**Exemplo de atualização de configuração**:
```json
{
  "path": "monitoring.healthCheckInterval",
  "value": 60000
}
```

## 🔧 Configuração Avançada

### Configuração por Ambiente

**Produção**:
```javascript
{
  monitoring: {
    healthCheckInterval: 30000,        // 30s
    metricsCollectionInterval: 10000,  // 10s
    enablePredictiveAnalytics: true,
    enableAutomatedRecovery: true
  },
  security: {
    enableEncryption: true,
    enableDigitalSignature: true
  },
  alerting: {
    enabled: true,
    channels: ['log', 'webhook']
  }
}
```

**Desenvolvimento**:
```javascript
{
  monitoring: {
    healthCheckInterval: 15000,        // 15s
    metricsCollectionInterval: 5000,   // 5s
    enablePredictiveAnalytics: true,
    enableAutomatedRecovery: false     // Desabilitado para debug
  },
  security: {
    enableEncryption: false,
    enableDigitalSignature: false
  }
}
```

### Configuração de Thresholds
```javascript
slaThresholds: {
  whatsappProcessing: 5000,    // 5s max
  instagramPosting: 30000,     // 30s max
  completeFlow: 60000,         // 1min max
  errorRecovery: 10000,        // 10s max
  systemResponse: 2000         // 2s max
}
```

## 📈 Métricas Coletadas

### WhatsApp Metrics
- `connection_status`: Status de conexão (0/1)
- `messages_sent`: Mensagens enviadas
- `messages_received`: Mensagens recebidas
- `response_time`: Tempo de resposta médio (ms)
- `error_rate`: Taxa de erro (%)
- `connection_uptime`: Uptime da conexão (%)
- `reconnection_count`: Número de reconexões

### Instagram Metrics
- `authentication_status`: Status de autenticação (0/1)
- `posts_count`: Número de posts hoje
- `success_rate`: Taxa de sucesso de posts (%)
- `risk_score`: Score de risco (0-1)
- `api_response_time`: Tempo de resposta da API (ms)
- `humanization_score`: Score de humanização (0-1)
- `daily_limit_usage`: Uso do limite diário (%)

### Database Metrics
- `connection_count`: Conexões ativas
- `query_duration`: Duração média de queries (ms)
- `cache_hit_ratio`: Taxa de cache hit (%)
- `lock_wait_time`: Tempo de espera por locks (ms)

### Queue Metrics
- `queue_depth`: Profundidade da fila
- `processing_rate`: Taxa de processamento (%)
- `worker_count`: Número de workers ativos
- `failed_jobs_rate`: Taxa de jobs falhados (%)
- `throughput`: Throughput (jobs/min)

### Business Metrics
- `complaints_processed`: Denúncias processadas hoje
- `resolution_time`: Tempo médio de resolução (ms)
- `citizen_satisfaction`: Score de satisfação (0-5)
- `efficiency_score`: Score de eficiência (%)

## 🤖 Machine Learning e Análise Preditiva

### Detecção de Anomalias
- **Z-Score**: Detecção baseada em desvio padrão
- **MAD (Median Absolute Deviation)**: Robusto a outliers
- **IQR (Interquartile Range)**: Baseado em quartis
- **Método Híbrido**: Combinação de múltiplos métodos

### Análise de Tendências
- **Regressão Linear**: Tendências e previsões
- **Intervalos de Confiança**: Incerteza das previsões
- **Teste de Estacionariedade**: Estabilidade das séries
- **Análise de Resíduos**: Qualidade do modelo

### Padrões Sazonais
- **Detecção de Ciclos**: Padrões horários, diários, semanais
- **Análise Harmônica**: Componentes de frequência
- **Força Sazonal**: Intensidade dos padrões
- **Previsão Sazonal**: Projeções baseadas em padrões

### Correlação Cross-System
- **Correlação de Pearson**: Relações lineares
- **Correlação de Spearman**: Relações monotônicas
- **Cross-correlation**: Análise de lag temporal
- **Dynamic Time Warping**: Correlação de séries temporais
- **Informação Mútua**: Dependências não-lineares

## 🚨 Sistema de Alertas e Incidentes

### Classificação de Incidentes
- **Critical**: Falha de componente crítico, impacto alto
- **High**: Degradação significativa, SLA em risco
- **Medium**: Problemas menores, monitoramento necessário
- **Low**: Anomalias detectadas, investigação recomendada

### Planos de Resposta Automática
1. **Immediate Actions**: Ações imediatas (0-30s)
2. **Short-term Actions**: Ações de curto prazo (30s-5min)
3. **Long-term Actions**: Ações de longo prazo (5min+)
4. **Rollback Plan**: Plano de rollback se necessário

### Escalação Automática
- **Level 1**: 5 minutos sem resolução
- **Level 2**: 15 minutos sem resolução
- **Level 3**: 30 minutos sem resolução
- **Level 4**: 1 hora sem resolução

## 📊 Dashboard em Tempo Real

### Conexão WebSocket
```javascript
const ws = new WebSocket('ws://localhost:8080');

// Subscribir a métricas
ws.send(JSON.stringify({
  type: 'subscribe',
  data: {
    room: 'metrics',
    filters: {
      components: ['whatsapp', 'instagram'],
      severity: ['critical', 'high']
    }
  }
}));

// Receber atualizações
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Metrics update:', data);
};
```

### Salas Disponíveis
- **metrics**: Métricas em tempo real
- **incidents**: Incidentes ativos e histórico
- **alerts**: Alertas e notificações
- **system_health**: Saúde do sistema
- **performance**: Métricas de performance
- **business_metrics**: Métricas de negócio
- **predictions**: Análises preditivas

## 🧪 Testes

### Executar Testes
```bash
npm test src/tests/monitoringSystem.test.js
```

### Cobertura de Testes
- ✅ Inicialização do sistema
- ✅ Service registry e lifecycle
- ✅ Configuration management
- ✅ Health monitoring
- ✅ Error handling
- ✅ Performance tests
- ✅ Integration tests
- ✅ Graceful shutdown

### Testes de Performance
- Inicialização < 30 segundos
- Health checks concorrentes
- Operações < 1 segundo
- Graceful shutdown < 30 segundos

## 🔒 Segurança e Compliance

### Audit Trail
- **Criptografia**: AES-256-CBC para dados sensíveis
- **Assinatura Digital**: HMAC-SHA256 para integridade
- **Chain de Integridade**: Hash linking entre entradas
- **Retenção**: 365 dias configurável

### Mascaramento de Dados
- Campos sensíveis automaticamente mascarados
- Logs sanitizados antes do armazenamento
- Compliance com LGPD/GDPR

## 📚 Logs e Debugging

### Estrutura de Logs
```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "info",
  "component": "MONITORING",
  "message": "Health check completed",
  "metadata": {
    "components": 6,
    "healthy": 5,
    "degraded": 1,
    "duration": "150ms"
  }
}
```

### Níveis de Log
- **ERROR**: Erros críticos e falhas
- **WARN**: Avisos e degradações
- **INFO**: Informações importantes
- **DEBUG**: Informações detalhadas (desenvolvimento)

## 🎯 Métricas de SLA

### Targets Operacionais
- **Uptime**: 99.9% (8.7h/ano downtime)
- **Response Time**: API < 200ms, Health checks < 2s
- **Error Rate**: < 0.1% para operações críticas
- **Recovery Time**: < 5 minutos para serviços críticos
- **Detection Time**: < 30 segundos para problemas críticos

### Métricas de Qualidade
- **MTTD (Mean Time to Detection)**: < 30 segundos
- **MTTR (Mean Time to Recovery)**: < 5 minutos
- **MTBF (Mean Time Between Failures)**: > 720 horas
- **Alert Accuracy**: > 95% true positives

## 🔧 Troubleshooting

### Problemas Comuns

**1. Sistema não inicializa**
```bash
# Verificar logs
tail -f logs/app.log | grep MONITORING

# Verificar dependências
curl http://localhost:6379  # Redis
psql -c "SELECT 1"          # PostgreSQL
```

**2. WebSocket não conecta**
```bash
# Verificar porta
netstat -tulpn | grep 8080

# Testar conexão
curl -i -N -H "Connection: Upgrade" \
     -H "Upgrade: websocket" \
     -H "Sec-WebSocket-Key: x3JJHMbDL1EzLkh9GBhXDw==" \
     -H "Sec-WebSocket-Version: 13" \
     http://localhost:8080/
```

**3. Métricas não coletadas**
```javascript
// Verificar status dos coletores
const status = orchestrator.getSystemStatus();
console.log(status.services);
```

**4. Alertas não disparados**
```javascript
// Verificar configuração de alertas
const config = orchestrator.getConfiguration();
console.log(config.alerting);
```

## 📞 Suporte e Contribuição

### Estrutura do Projeto
```
src/services/
├── intelligentMonitoringSystem.js     # Health Monitor principal
├── metricsAggregationEngine.js        # Coleta de métricas
├── automatedIncidentResponse.js       # Resposta a incidentes
├── realtimeDashboard.js              # Dashboard WebSocket
├── performanceCorrelationEngine.js   # Análise de correlação
├── masterMonitoringOrchestrator.js   # Orquestrador central
└── monitoringInitializer.js          # Inicializador do sistema

src/workers/
└── mlAnalysisWorker.js               # Worker de ML

src/tests/
└── monitoringSystem.test.js          # Testes abrangentes
```

### Desenvolvimento
1. Fork do repositório
2. Criar branch para feature: `git checkout -b feature/nova-funcionalidade`
3. Implementar com testes: `npm test`
4. Commit: `git commit -m "feat: nova funcionalidade"`
5. Push: `git push origin feature/nova-funcionalidade`
6. Pull Request

### Próximas Funcionalidades
- [ ] Integração com Grafana/Prometheus
- [ ] Alerting via Slack/Discord/Teams
- [ ] Machine Learning avançado (LSTM, Random Forest)
- [ ] Análise de logs com NLP
- [ ] Deployment automatizado com Kubernetes
- [ ] Mobile app para monitoramento

---

**Sistema Inteligente de Monitoramento v1.0.0**  
Desenvolvido para a plataforma de denúncias WhatsApp-Instagram  
© 2024 - Sistema de Monitoramento Preditivo com Auto-cura