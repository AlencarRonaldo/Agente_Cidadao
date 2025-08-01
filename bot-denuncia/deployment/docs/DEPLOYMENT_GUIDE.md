# Sistema de Deployment Orchestrator
## Guia Completo de Deployment Zero-Downtime

### 📋 Índice
1. [Visão Geral](#visão-geral)
2. [Arquitetura do Sistema](#arquitetura-do-sistema)
3. [Pré-requisitos](#pré-requisitos)
4. [Configuração Inicial](#configuração-inicial)
5. [Execução de Deploy](#execução-de-deploy)
6. [Monitoramento e Saúde](#monitoramento-e-saúde)
7. [Rollback e Recuperação](#rollback-e-recuperação)
8. [Troubleshooting](#troubleshooting)
9. [Manutenção](#manutenção)

---

## 🎯 Visão Geral

O Sistema de Deployment Orchestrator implementa uma estratégia completa de **Blue-Green Deployment** com **Zero-Downtime**, incluindo:

- ✅ **Health Checks Automáticos**: Validação contínua da saúde do sistema
- 🔄 **Rollback Automático**: Recuperação automática em caso de falhas
- 📊 **Monitoring em Tempo Real**: Observabilidade completa com alertas
- 🗄️ **Migration Sem Downtime**: Evolução de schema sem interrupção
- ⚖️ **Load Balancer Inteligente**: Distribuição de tráfego com nginx
- 📝 **Documentação Automática**: Geração de documentação e relatórios

### 🏗️ Componentes Principais

```
deployment/
├── scripts/                 # Scripts de automação
│   ├── deploy.sh           # Script principal de deploy
│   ├── orchestrator.js     # Orquestrador completo
│   ├── nginx-manager.sh    # Gerenciamento do load balancer
│   └── migration-manager.js # Gerenciamento de migrações
├── services/               # Serviços internos
│   └── rollbackSystem.js   # Sistema de rollback automático
├── monitoring/             # Configurações de monitoramento
│   ├── prometheus.yml      # Métricas
│   ├── alert_rules.yml     # Regras de alerta
│   └── grafana/           # Dashboards
└── nginx/                 # Configuração do proxy
    ├── nginx.conf         # Configuração principal
    └── conf.d/            # Configurações dinâmicas
```

---

## 🏛️ Arquitetura do Sistema

### Blue-Green Deployment Strategy

```mermaid
graph TD
    A[Load Balancer<br/>Nginx] --> B[Blue Environment<br/>Ativo]
    A --> C[Green Environment<br/>Standby]
    
    B --> D[App Blue<br/>Container]
    C --> E[App Green<br/>Container]
    
    D --> F[Database<br/>PostgreSQL]
    E --> F
    
    D --> G[Redis<br/>Cache/Queue]
    E --> G
    
    H[Health Monitor] --> B
    H --> C
    
    I[Rollback System] --> H
    I --> A
    
    J[Monitoring<br/>Prometheus/Grafana] --> D
    J --> E
    J --> F
    J --> G
```

### Fluxo de Deployment

1. **Pré-validação**: Verifica saúde do sistema e pré-requisitos
2. **Build**: Constrói nova versão da aplicação
3. **Migration**: Executa migrações de banco sem downtime
4. **Deploy**: Atualiza ambiente standby (Green/Blue)
5. **Health Check**: Valida saúde do novo deployment
6. **Traffic Switch**: Redireciona tráfego para novo ambiente
7. **Post-validation**: Validação final e testes
8. **Cleanup**: Limpeza de recursos antigos

---

## 🔧 Pré-requisitos

### Sistema Operacional
- Linux/Unix (Ubuntu 20.04+ recomendado)
- Docker 20.10+
- Docker Compose 2.0+
- Node.js 20+
- PostgreSQL 15+
- Redis 7+

### Recursos Mínimos
- **RAM**: 4GB disponível
- **Disco**: 20GB livres
- **CPU**: 2 cores
- **Rede**: Conexão estável

### Dependências de Software
```bash
# Instalar dependências no Ubuntu
sudo apt update
sudo apt install -y curl jq nginx-utils postgresql-client redis-tools

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

---

## ⚙️ Configuração Inicial

### 1. Variáveis de Ambiente

Crie o arquivo `deployment/.env`:

```bash
# Database Configuration
DATABASE_URL=postgresql://admin:secret@postgres:5432/botdenuncia
POSTGRES_USER=admin
POSTGRES_PASSWORD=secret
POSTGRES_DB=botdenuncia

# Redis Configuration
REDIS_URL=redis://redis:6379
REDIS_PASSWORD=redispassword

# Application Configuration
NODE_ENV=production
PORT=3000
HEALTH_CHECK_PORT=3001

# Deployment Configuration
DEPLOYMENT_TIMEOUT=1800000  # 30 minutos
HEALTH_CHECK_TIMEOUT=300000 # 5 minutos
ROLLBACK_THRESHOLD=3        # Falhas consecutivas para rollback

# Monitoring Configuration
PROMETHEUS_RETENTION=200h
GRAFANA_ADMIN_PASSWORD=admin123

# Notification Configuration (opcional)
SLACK_WEBHOOK_URL=https://hooks.slack.com/your-webhook
NOTIFICATION_WEBHOOK_URL=https://your-notification-service.com/webhook

# SSL Configuration (para produção)
SSL_CERT_PATH=/etc/nginx/ssl/cert.pem
SSL_KEY_PATH=/etc/nginx/ssl/key.pem
```

### 2. Preparação dos Diretórios

```bash
# Criar estrutura de diretórios
mkdir -p deployment/{state,backups,reports,logs}
mkdir -p logs/{nginx,postgres,redis}
mkdir -p uploads/{images,thumbnails}

# Definir permissões
chmod -R 755 deployment/
chmod +x deployment/scripts/*.sh
chmod +x deployment/scripts/*.js
```

### 3. Configuração de SSL (Produção)

```bash
# Gerar certificados auto-assinados para teste
mkdir -p deployment/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout deployment/ssl/key.pem \
    -out deployment/ssl/cert.pem \
    -subj "/C=BR/ST=SP/L=SaoPaulo/O=BotDenuncia/CN=localhost"
```

---

## 🚀 Execução de Deploy

### Deploy Básico

```bash
# Deploy usando script bash (recomendado para produção)
./deployment/scripts/deploy.sh

# Deploy usando orquestrador JavaScript (mais features)
node deployment/scripts/orchestrator.js deploy

# Deploy para ambiente específico
./deployment/scripts/deploy.sh green
```

### Deploy com Configurações Avançadas

```bash
# Deploy com validação extra
VALIDATE_DEPLOYMENT=true ./deployment/scripts/deploy.sh

# Deploy com testes E2E
RUN_E2E_TESTS=true node deployment/scripts/orchestrator.js deploy

# Deploy com notificações Slack
SLACK_WEBHOOK_URL="your-webhook" ./deployment/scripts/deploy.sh
```

### Deployment Canary

```bash
# Deploy canary (10% do tráfego)
./deployment/scripts/nginx-manager.sh canary green 10

# Aumentar para 50%
./deployment/scripts/nginx-manager.sh canary green 50

# Switch completo após validação
./deployment/scripts/nginx-manager.sh switch green
```

### Deployment Progressivo

```bash
# Deploy progressivo em 5 etapas com 5min entre cada
./deployment/scripts/nginx-manager.sh progressive green 5 300
```

---

## 📊 Monitoramento e Saúde

### Health Check Endpoints

```bash
# Health check simples (para load balancer)
curl http://localhost/health/simple

# Health check detalhado
curl http://localhost/health?detailed=true

# Health check de deployment
curl http://localhost/health/deployment

# Histórico de saúde
curl http://localhost/health/history

# Métricas do sistema
curl http://localhost/health/metrics
```

### Dashboards de Monitoramento

#### Prometheus (Métricas)
- **URL**: http://localhost:9090
- **Queries úteis**:
  ```promql
  # Taxa de erro HTTP
  rate(http_requests_total{status=~"5.."}[5m])
  
  # Tempo de resposta médio
  avg_over_time(http_request_duration_seconds[5m])
  
  # Uso de memória
  process_resident_memory_bytes / 1024 / 1024
  
  # Status de saúde
  up{job=~"bot-denuncia-.*"}
  ```

#### Grafana (Visualização)
- **URL**: http://localhost:3001
- **Login**: admin / admin123
- **Dashboards disponíveis**:
  - System Overview
  - Application Performance
  - Database Metrics
  - Business Metrics

#### Kibana (Logs)
- **URL**: http://localhost:5601
- **Índices**: `bot-denuncia-*`, `bot-denuncia-alerts-*`

### Alertas Configurados

#### Críticos (Ação Imediata)
- 🔴 **ApplicationDown**: Aplicação não responde
- 🔴 **DatabaseDown**: Banco de dados inacessível
- 🔴 **RedisDown**: Redis inacessível
- 🔴 **WhatsAppDisconnected**: Serviço WhatsApp desconectado

#### Avisos (Monitorar)
- 🟡 **HighResponseTime**: Tempo de resposta > 5s
- 🟡 **HighMemoryUsage**: Uso de memória > 85%
- 🟡 **HighQueueSize**: Fila com > 1000 itens
- 🟡 **HighErrorRate**: Taxa de erro > 5%

### Comandos de Monitoramento

```bash
# Status geral do sistema
./deployment/scripts/orchestrator.js status

# Status do deployment
./deployment/scripts/orchestrator.js health

# Status do rollback system
curl http://localhost:8080/status

# Logs em tempo real
docker-compose -f deployment/docker-compose.production.yml logs -f app-blue
```

---

## 🔄 Rollback e Recuperação

### Rollback Automático

O sistema executa rollback automático quando:
- 3 health checks consecutivos falham
- Taxa de erro HTTP > 10%
- Resposta de health check > 30s
- Falha na validação pós-deployment

### Rollback Manual

```bash
# Rollback usando orquestrador
node deployment/scripts/orchestrator.js rollback

# Rollback usando script de deploy
./deployment/scripts/deploy.sh rollback

# Rollback de emergência via nginx
./deployment/scripts/nginx-manager.sh rollback

# Rollback de migração de banco
node deployment/scripts/migration-manager.js rollback
```

### Verificação de Rollback

```bash
# Status do sistema de rollback
curl http://localhost:8080/status

# Histórico de rollbacks
curl http://localhost:8080/history

# Forçar validação de saúde
curl -X POST http://localhost:8080/validate
```

### Recuperação de Desastres

#### Restauração de Backup de Banco

```bash
# Listar backups disponíveis
ls -la deployment/backups/

# Restaurar backup específico
docker exec -i bot-denuncia-db psql -U admin -d botdenuncia < deployment/backups/backup_latest.sql

# Verificar integridade após restauração
node deployment/scripts/migration-manager.js validate
```

#### Recuperação de Container

```bash
# Recriar containers com problemas
docker-compose -f deployment/docker-compose.production.yml up -d --force-recreate app-blue

# Verificar logs
docker-compose -f deployment/docker-compose.production.yml logs app-blue

# Testar saúde
curl http://app-blue:3001/health
```

---

## 🔍 Troubleshooting

### Problemas Comuns

#### 1. Deploy Falha no Health Check

**Sintomas**: Deploy falha na fase de validação de saúde
```bash
# Verificar logs do container
docker logs bot-denuncia-blue

# Testar health check diretamente
curl -v http://app-blue:3001/health

# Verificar conectividade de banco
docker exec bot-denuncia-blue npm run db:test
```

**Soluções**:
- Verificar variáveis de ambiente
- Confirmar conectividade com banco/redis
- Validar permissões de arquivos

#### 2. Nginx Não Consegue Rotear Tráfego

**Sintomas**: Erro 502/503 no load balancer
```bash
# Testar configuração nginx
docker exec bot-denuncia-lb nginx -t

# Verificar logs nginx
docker logs bot-denuncia-lb

# Verificar upstream configuration
cat deployment/nginx/conf.d/upstream.conf
```

**Soluções**:
- Recarregar configuração nginx
- Verificar containers de aplicação
- Validar configuração de rede

#### 3. Migração de Banco Falha

**Sintomas**: Erro durante migração
```bash
# Verificar status das migrações
npx prisma migrate status

# Logs detalhados de migração
node deployment/scripts/migration-manager.js status

# Verificar conectividade
npx prisma db push --preview-feature
```

**Soluções**:
- Verificar permissões de banco
- Confirmar schema compatibility
- Restaurar backup e tentar novamente

#### 4. Container Não Inicia

**Sintomas**: Container em loop de restart
```bash
# Verificar status containers
docker-compose -f deployment/docker-compose.production.yml ps

# Logs detalhados
docker-compose -f deployment/docker-compose.production.yml logs --tail=100 app-blue

# Verificar recursos do sistema
docker stats
```

**Soluções**:
- Verificar recursos disponíveis
- Validar configuração ambiente
- Verificar dependências

### Comandos de Diagnóstico

```bash
# Health check completo
curl -s http://localhost/health | jq .

# Status de todos os serviços
docker-compose -f deployment/docker-compose.production.yml ps

# Uso de recursos
docker stats --no-stream

# Verificar logs de erro
grep -r "ERROR" logs/

# Verificar conectividade de rede
docker network inspect bot-denuncia-network
```

### Logs Importantes

#### Locais de Log
```bash
# Logs da aplicação
logs/app.log
logs/error.log

# Logs do nginx
logs/nginx/access.log
logs/nginx/error.log

# Logs do sistema
/var/log/syslog

# Logs do Docker
docker logs <container_name>
```

#### Análise de Logs
```bash
# Erros recentes
tail -f logs/error.log | jq .

# Análise de performance
awk '{print $NF}' logs/nginx/access.log | sort -n | tail -10

# Contagem de erros por tipo
grep "ERROR" logs/app.log | jq -r '.error' | sort | uniq -c
```

---

## 🔧 Manutenção

### Manutenção Preventiva

#### Daily Tasks
```bash
#!/bin/bash
# daily-maintenance.sh

# Verificar saúde geral
curl -f http://localhost/health/simple || exit 1

# Limpar logs antigos
find logs/ -name "*.log" -mtime +7 -delete

# Limpar backups antigos
find deployment/backups/ -name "backup_*.sql*" -mtime +30 -delete

# Verificar espaço em disco
df -h | awk '$5 > 85 {print "WARNING: " $0}'

# Verificar memória
free -m | awk 'NR==2{printf "Memory Usage: %s/%sMB (%.2f%%)\n", $3,$2,$3*100/$2 }'
```

#### Weekly Tasks
```bash
#!/bin/bash
# weekly-maintenance.sh

# Atualizar imagens Docker
docker-compose -f deployment/docker-compose.production.yml pull

# Otimizar banco de dados
docker exec bot-denuncia-db psql -U admin -d botdenuncia -c "VACUUM ANALYZE;"

# Verificar integridade de backups
node deployment/scripts/migration-manager.js validate-backups

# Gerar relatório de performance
node deployment/scripts/performance-report.js > reports/weekly-$(date +%Y%m%d).json
```

### Atualizações de Sistema

#### Atualização da Aplicação
```bash
# 1. Backup antes da atualização
node deployment/scripts/migration-manager.js backup

# 2. Deploy da nova versão
VERSION=v2.1.0 ./deployment/scripts/deploy.sh

# 3. Verificar deploy
curl http://localhost/health

# 4. Monitorar por 24h
watch -n 60 'curl -s http://localhost/health/simple'
```

#### Atualização de Dependências
```bash
# Atualizar dependências Node.js
npm audit
npm update

# Atualizar imagens base Docker
docker pull node:20-alpine
docker pull postgres:15-alpine
docker pull redis:7-alpine
docker pull nginx:alpine

# Rebuild com novas dependências
docker-compose -f deployment/docker-compose.production.yml build --no-cache
```

### Configurações de Segurança

#### SSL/TLS
```bash
# Renovar certificados (Let's Encrypt)
certbot renew --nginx

# Verificar validade do certificado
openssl x509 -in deployment/ssl/cert.pem -text -noout | grep "Not After"

# Testar configuração SSL
curl -I https://localhost
```

#### Firewall
```bash
# Configurar UFW (Ubuntu)
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw deny 5432/tcp   # PostgreSQL (apenas local)
sudo ufw deny 6379/tcp   # Redis (apenas local)
sudo ufw enable
```

#### Backup e Recuperação
```bash
# Backup completo diário
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)

# Backup banco
docker exec bot-denuncia-db pg_dump -U admin botdenuncia | gzip > backup_db_$DATE.sql.gz

# Backup uploads
tar -czf backup_uploads_$DATE.tar.gz uploads/

# Backup configurações
tar -czf backup_config_$DATE.tar.gz deployment/ --exclude=deployment/backups

# Upload para storage remoto (AWS S3, etc.)
# aws s3 cp backup_*.gz s3://your-backup-bucket/
```

### Monitoramento de Performance

#### Métricas Chave
- **Response Time**: < 2s (95th percentile)
- **Error Rate**: < 1%
- **Memory Usage**: < 80%
- **CPU Usage**: < 70%
- **Disk Usage**: < 80%
- **Database Connections**: < 80% do pool

#### Otimizações
```bash
# Otimizar configuração PostgreSQL
echo "shared_preload_libraries = 'pg_stat_statements'" >> postgresql.conf
echo "max_connections = 200" >> postgresql.conf
echo "shared_buffers = 256MB" >> postgresql.conf

# Otimizar Redis
echo "maxmemory 512mb" >> redis.conf
echo "maxmemory-policy allkeys-lru" >> redis.conf

# Otimizar Nginx
echo "worker_processes auto;" >> nginx.conf
echo "worker_connections 4096;" >> nginx.conf
```

---

## 📚 Recursos Adicionais

### Documentação de APIs

#### Health Check API
```yaml
openapi: 3.0.0
info:
  title: Bot Denuncia Health API
  version: 1.0.0
paths:
  /health:
    get:
      summary: Comprehensive health check
      parameters:
        - name: detailed
          in: query
          schema:
            type: boolean
      responses:
        200:
          description: System is healthy
        503:
          description: System is unhealthy
```

### Scripts Utilitários

#### Status Dashboard
```bash
#!/bin/bash
# dashboard.sh - Status dashboard simples

clear
echo "=== Bot Denuncia System Status ==="
echo "Date: $(date)"
echo

# System Health
echo "🏥 HEALTH STATUS"
HEALTH=$(curl -s http://localhost/health/simple | jq -r '.status // "error"')
echo "   Overall: $HEALTH"

# Environment Status
ACTIVE_ENV=$(curl -s http://localhost:8080/status | jq -r '.currentEnvironment // "unknown"')
echo "   Active Environment: $ACTIVE_ENV"

# Resource Usage
echo
echo "💻 RESOURCE USAGE"
echo "   $(free -h | awk 'NR==2{printf "Memory: %s/%s (%.2f%%)", $3,$2,$3*100/$2 }')"
echo "   $(df -h / | awk 'NR==2{printf "Disk: %s/%s (%s)", $3,$2,$5}')"

# Service Status
echo
echo "🐳 CONTAINERS"
docker-compose -f deployment/docker-compose.production.yml ps --format "table {{.Name}}\t{{.Status}}"

# Recent Deployments
echo
echo "🚀 RECENT DEPLOYMENTS"
ls -lt deployment/reports/ | head -5
```

### Referências

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Redis Documentation](https://redis.io/documentation)

---

## 📞 Suporte

Para suporte técnico:

1. **Logs**: Sempre colete logs relevantes
2. **Health Check**: Execute verificação de saúde
3. **Ambiente**: Documente configuração do ambiente
4. **Reprodução**: Descreva passos para reproduzir problema

### Checklist de Troubleshooting

- [ ] Verificar logs de aplicação
- [ ] Testar health checks
- [ ] Verificar conectividade de rede
- [ ] Confirmar recursos disponíveis
- [ ] Validar configurações
- [ ] Testar em ambiente isolado
- [ ] Verificar dependências externas
- [ ] Confirmar permissões de arquivo/diretório

---

*Última atualização: $(date)*