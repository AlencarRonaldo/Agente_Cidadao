# Sistema de Monitoramento e Feedback em Tempo Real

## Visão Geral

Sistema completo de monitoramento e feedback implementado para eliminar a confusão dos usuários sobre o processo de publicação. Fornece transparência total, alertas inteligentes e feedback em tempo real.

## 🎯 Problema Resolvido

**SITUAÇÃO ANTERIOR**: Usuário clicava em "Aprovar e Postar Agora" esperando publicação imediata, mas o sistema aplicava limite diário e agendava para horários específicos, gerando confusão.

**SOLUÇÃO IMPLEMENTADA**: Sistema completo de feedback em tempo real que informa exatamente o que acontece com cada ação do usuário.

## 🏗️ Arquitetura do Sistema

### Backend Services

#### 1. MonitoringService (`src/services/monitoringService.js`)
- **Função**: Serviço principal de monitoramento em tempo real
- **Responsabilidades**:
  - Coleta métricas do sistema em tempo real
  - Calcula health scores e estatísticas
  - Gera feedback inteligente para ações do usuário
  - Monitora fila de publicação e limites diários
- **Eventos Monitorados**:
  - `queued`: Denúncia adicionada à fila
  - `processing`: Iniciando processamento
  - `published`: Publicação bem-sucedida
  - `failed`: Falha na publicação
  - `rescheduled`: Reagendada por limite diário

#### 2. WebSocketService (`src/services/websocketService.js`)
- **Função**: Comunicação em tempo real com o frontend
- **Recursos**:
  - Autenticação JWT automática
  - Salas/canais temáticos
  - Reconexão automática
  - Broadcast para grupos específicos
- **Canais Disponíveis**:
  - `publication_events`: Eventos de publicação
  - `system_alerts`: Alertas do sistema
  - `system_status`: Status em tempo real
  - `admin_notifications`: Notificações administrativas

#### 3. LoggerService (`src/services/loggerService.js`)
- **Função**: Sistema de logs estruturados
- **Recursos**:
  - Logs estruturados em JSON
  - Múltiplos níveis (error, warn, info, debug, trace)
  - Rotação automática de arquivos
  - Logs específicos por contexto (publicação, sistema, usuário)
- **Arquivos de Log**:
  - `application.log`: Logs gerais
  - `errors.log`: Apenas erros
  - `publications.log`: Eventos de publicação
  - `security.log`: Eventos de segurança

#### 4. AlertService (`src/services/alertService.js`)
- **Função**: Sistema de alertas automáticos
- **Recursos**:
  - Regras de alerta configuráveis
  - Múltiplos canais (email, websocket, webhook)
  - Cooldown para evitar spam
  - Supressão temporária de alertas
- **Alertas Configurados**:
  - Taxa de erro elevada (>20%)
  - Fila congestionada (>50 itens)
  - Limite diário excedido
  - Saúde do sistema baixa (<50%)
  - Problemas de conectividade

### API Endpoints

#### Rotas de Monitoramento (`src/routes/monitoring.js`)
```
GET    /api/admin/monitoring/status          - Status completo do sistema
GET    /api/admin/monitoring/metrics         - Métricas detalhadas
GET    /api/admin/monitoring/alerts          - Alertas ativos
POST   /api/admin/monitoring/publication/feedback - Feedback de ações
GET    /api/admin/monitoring/publication/queue    - Status da fila
GET    /api/admin/monitoring/publication/history  - Histórico de publicações
GET    /api/admin/monitoring/health          - Verificação de saúde
GET    /api/admin/monitoring/logs            - Buscar logs
POST   /api/admin/monitoring/alerts/suppress - Suprimir alertas
```

### Frontend Components

#### 1. MonitoringDashboard (`admin-panel/src/components/MonitoringDashboard.js`)
- **Função**: Dashboard completo de monitoramento
- **Recursos**:
  - Métricas em tempo real
  - Gráficos interativos (Chart.js)
  - Alertas visuais
  - Conexão WebSocket automática
- **Seções**:
  - Status geral do sistema
  - Fila de publicação em tempo real
  - Métricas de performance
  - Distribuição de status
  - Publicações por hora

#### 2. SmartNotifications (`admin-panel/src/components/SmartNotifications.js`)
- **Função**: Sistema de notificações inteligentes
- **Recursos**:
  - Badge com contagem não lidas
  - Categorização por tipo e severidade
  - Ações contextuais
  - Expansão para detalhes
  - Marcação como lida
- **Tipos de Notificação**:
  - Eventos de publicação
  - Alertas do sistema
  - Feedback de ações
  - Mudanças de status

#### 3. useRealtimeNotifications (`admin-panel/src/hooks/useRealtimeNotifications.js`)
- **Função**: Hook para gerenciar notificações em tempo real
- **Recursos**:
  - Conexão WebSocket automática
  - Reconexão inteligente
  - Filtragem de canais
  - Estado local das notificações
  - Callbacks para ações

### Worker Aprimorado

#### PublishWorker Integrado (`src/queues/publishWorker.js`)
- **Melhorias Implementadas**:
  - Logs estruturados com contexto
  - Feedback em tempo real via WebSocket
  - Verificação de limites antes da publicação
  - Reagendamento automático
  - Métricas de performance
  - Notificação de usuários específicos

## 🚀 Funcionalidades Principais

### 1. Dashboard em Tempo Real
- **Status do Sistema**: Saúde geral, fila, limites, taxa de sucesso
- **Métricas Visuais**: Gráficos de publicações por hora, distribuição de status
- **Alertas Ativos**: Lista de alertas com detalhes e ações
- **Performance**: Tempo médio, throughput, taxa de erro

### 2. Feedback Inteligente
Quando o usuário clica "Aprovar e Postar Agora":

```javascript
// Cenário 1: Publicação Imediata
{
  type: 'success',
  title: 'Publicado Imediatamente! ✅',
  message: 'A denúncia foi publicada no Instagram com sucesso.',
  details: { postUrl: '...', publishedAt: '...' }
}

// Cenário 2: Limite Diário Atingido
{
  type: 'warning',
  title: 'Adicionado à Fila de Publicação ⏳',
  message: 'Limite diário atingido (50/50). Sua denúncia foi adicionada à fila.',
  details: {
    queuePosition: 3,
    estimatedPublishTime: '2024-01-15T08:00:00Z',
    reason: 'daily_limit_reached'
  }
}
```

### 3. Alertas Predictivos
- **Alta Taxa de Erro**: Alertas quando >20% das publicações falham
- **Fila Congestionada**: Aviso quando >50 itens aguardando
- **Limite Próximo**: Notificação quando 90% do limite diário usado
- **Problemas de Conectividade**: Detecção de problemas com Instagram/Redis

### 4. Logs Estruturados
```json
{
  "timestamp": "2024-01-15T10:30:00.123Z",
  "level": "info",
  "message": "Denúncia DENC-001 publicada com sucesso",
  "service": "bot-denuncia",
  "operation": "publication",
  "denunciaId": "DENC-001",
  "userId": "user123",
  "metadata": {
    "processingTime": 2340,
    "postId": "ig_post_123",
    "bairro": "Centro"
  }
}
```

### 5. Notificações em Tempo Real
- **Eventos de Publicação**: Status em tempo real das publicações
- **Alertas do Sistema**: Problemas críticos notificados imediatamente
- **Feedback de Ações**: Resposta imediata às ações do usuário
- **Mudanças de Status**: Atualizações automáticas quando status muda

## 📊 Métricas Monitoradas

### Métricas de Publicação
- Total de publicações (diário/semanal/mensal)
- Taxa de sucesso (%)
- Tempo médio de processamento
- Publicações por hora
- Distribuição por status

### Métricas de Performance
- Tempo médio de processamento
- Tempo médio na fila
- Throughput (publicações/hora)
- Pico da fila
- Taxa de erro

### Métricas de Sistema
- Saúde geral (score 0-100)
- Uso de recursos (CPU, memória)
- Conexões WebSocket ativas
- Alertas ativos por severidade

## 🔧 Configuração e Instalação

### Variáveis de Ambiente
```env
# Monitoramento
LOG_LEVEL=info
DAILY_PUBLICATION_LIMIT=100

# Email para alertas
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=alerts@exemplo.com
SMTP_PASSWORD=senha_app
SMTP_FROM=noreply@bot-denuncia.com

# Webhook para alertas (opcional)
ALERT_WEBHOOK_URL=https://webhook.site/uuid

# WebSocket
WS_PORT=3001
```

### Dependências Adicionais
```json
{
  "winston": "^3.10.0",
  "ws": "^8.14.0",
  "nodemailer": "^6.9.0",
  "chart.js": "^4.4.0",
  "react-chartjs-2": "^5.2.0"
}
```

### Inicialização
```javascript
// server.js
const websocketService = require('./src/services/websocketService');
const alertService = require('./src/services/alertService');
const loggerService = require('./src/services/loggerService');

// Inicializar WebSocket
websocketService.initialize(server);

// Middleware de logs
app.use(loggerService.expressMiddleware());

// Rotas de monitoramento
app.use('/api/admin/monitoring', require('./src/routes/monitoring'));
```

## 🎯 Benefícios Implementados

### Para Administradores
1. **Visibilidade Total**: Dashboard completo do sistema
2. **Alertas Proativos**: Problemas identificados antes de afetar usuários
3. **Debugging Facilitado**: Logs estruturados e pesquisáveis
4. **Métricas de Performance**: Acompanhar tendências e otimizar

### Para Usuários Finais
1. **Feedback Claro**: Sabem exatamente o que acontece com suas ações
2. **Expectativas Gerenciadas**: Informações precisas sobre timing
3. **Transparência**: Visibilidade do processo de publicação
4. **Experiência Melhorada**: Menos confusão e frustração

### Para o Sistema
1. **Monitoramento Proativo**: Detecta problemas antes que causem impacto
2. **Debugging Rápido**: Logs estruturados facilitam investigação
3. **Métricas de Qualidade**: Dados para tomada de decisão
4. **Escalabilidade**: Sistema preparado para crescimento

## 🔄 Fluxo de Feedback Implementado

### Cenário: Usuário clica "Aprovar e Postar Agora"

1. **Frontend**: Envia requisição para aprovar denúncia
2. **Backend**: Processa aprovação e adiciona à fila
3. **Worker**: Recebe job e verifica limites
4. **Feedback Imediato**: Sistema gera feedback baseado na situação:
   - Limite OK → "Publicando agora..."
   - Limite excedido → "Adicionado à fila - posição #3, estimativa: 2h"
5. **WebSocket**: Envia feedback em tempo real para o usuário
6. **Notificação**: Usuário recebe notificação explicando exatamente o que aconteceu
7. **Updates**: Conforme o processo avança, usuário recebe atualizações

## 📈 Próximos Passos Sugeridos

1. **Machine Learning**: Predição inteligente de horários de publicação
2. **Analytics Avançados**: Relatórios automáticos para gestão
3. **Mobile App**: Notificações push para administradores
4. **Integração Slack/Teams**: Alertas em canais de comunicação
5. **Dashboard Público**: Métricas básicas para transparência

## 🏁 Conclusão

O sistema implementado resolve completamente o problema original de falta de transparência no processo de publicação. Agora os usuários têm feedback claro e imediato sobre suas ações, eliminando confusão e melhorando significativamente a experiência do usuário.

O sistema é escalável, monitora proativamente problemas e fornece todas as ferramentas necessárias para manter alta disponibilidade e qualidade do serviço.