# 🚀 Comandos Úteis - Bot Denúncia

## 🏁 **Início Rápido**

### 1. Configuração Inicial (Execute uma vez)
```bash
# Configurar automaticamente
node setup-test.js

# Ou manualmente
npm install
docker-compose up -d
npx prisma db push
```

### 2. Iniciar Sistema (3 terminais)
```bash
# Terminal 1 - Backend
npm run dev

# Terminal 2 - Workers
npm run workers:dev

# Terminal 3 - Teste (opcional)
node test-routes.js
```

## 🐳 **Docker Commands**

### Gerenciar Containers
```bash
# Iniciar todos os serviços
docker-compose up -d

# Parar todos os serviços
docker-compose down

# Reiniciar serviços
docker-compose restart

# Ver status
docker-compose ps

# Ver logs em tempo real
docker-compose logs -f

# Ver logs específicos
docker logs bot-denuncia-db
docker logs bot-denuncia-redis
```

### Limpeza e Reset
```bash
# Parar e remover volumes (APAGA DADOS!)
docker-compose down -v

# Limpar imagens não utilizadas
docker image prune

# Limpar tudo (containers, volumes, networks)
docker system prune -a --volumes
```

## 💾 **Banco de Dados**

### Prisma Commands
```bash
# Gerar client Prisma
npx prisma generate

# Sincronizar schema com banco
npx prisma db push

# Ver dados no Prisma Studio
npx prisma studio

# Reset completo do banco
npx prisma migrate reset --force
```

### Conectar ao PostgreSQL
```bash
# Via psql (se instalado)
psql -h localhost -U admin -d botdenuncia -p 5432

# Via Docker
docker exec -it bot-denuncia-db psql -U admin -d botdenuncia

# Backup do banco
docker exec bot-denuncia-db pg_dump -U admin botdenuncia > backup.sql

# Restaurar backup
docker exec -i bot-denuncia-db psql -U admin -d botdenuncia < backup.sql
```

## 📦 **Redis Commands**

### Conectar e Gerenciar
```bash
# Via redis-cli (se instalado)
redis-cli -h localhost -p 6379

# Via Docker
docker exec -it bot-denuncia-redis redis-cli

# Ver todas as chaves
docker exec -it bot-denuncia-redis redis-cli KEYS "*"

# Limpar cache
docker exec -it bot-denuncia-redis redis-cli FLUSHALL

# Monitor em tempo real
docker exec -it bot-denuncia-redis redis-cli MONITOR
```

## 🔧 **NPM Scripts**

### Desenvolvimento
```bash
npm run dev           # Backend com nodemon
npm run workers:dev   # Workers com nodemon
npm run all:dev       # Backend + Workers juntos
```

### Produção
```bash
npm start            # Backend produção
npm run workers      # Workers produção
npm run all          # Backend + Workers produção
```

### Banco de Dados
```bash
npm run db:migrate   # Executar migrations
npm run db:seed      # Popular dados iniciais
npm run db:reset     # Reset completo
```

### Testes
```bash
npm test            # Testes unitários
npm run test:watch  # Testes em modo watch
node test-routes.js # Teste manual das rotas
```

## 🧪 **Testes e Debug**

### Testar API
```bash
# Teste completo das rotas
node test-routes.js

# Teste de login específico
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@teste.com","senha":"Admin123!"}'

# Teste do dashboard (substitua TOKEN)
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/api/admin/dashboard
```

### Debug e Logs
```bash
# Ver logs da aplicação
tail -f logs/app.log

# Ver logs do Docker
docker-compose logs -f postgres
docker-compose logs -f redis

# Debug com node inspector
node --inspect src/index.js
```

## 👥 **Gerenciar Usuários**

### Criar Usuário Admin (via API)
```bash
# Primeiro, faça login e obtenha o token
TOKEN=$(curl -s -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@teste.com","senha":"Admin123!"}' | \
  jq -r '.token')

# Criar novo usuário
curl -X POST http://localhost:3000/api/admin/usuarios \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "nome": "Moderador Teste",
    "email": "mod@teste.com",
    "senha": "Mod123!",
    "role": "MODERADOR"
  }'
```

### Listar Usuários
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/admin/usuarios
```

## 📊 **Monitoramento**

### Status do Sistema
```bash
# Status geral
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/admin/sistema/status

# Verificar filas
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/admin/sistema/status | jq '.data.queues'

# Estatísticas do dashboard
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/admin/dashboard | jq '.data.resumo'
```

### Relatórios
```bash
# Relatório geral
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/admin/relatorios?tipo=geral"

# Relatório por bairros
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/admin/relatorios?tipo=bairros"
```

## 🔄 **Backup e Restore**

### Backup Completo
```bash
#!/bin/bash
# Script de backup
DATE=$(date +%Y%m%d_%H%M%S)

# Backup do banco
docker exec bot-denuncia-db pg_dump -U admin botdenuncia > "backup_db_$DATE.sql"

# Backup dos uploads (se existir)
tar -czf "backup_uploads_$DATE.tar.gz" uploads/

# Backup das configurações
cp .env "backup_env_$DATE"

echo "Backup concluído: backup_*_$DATE.*"
```

### Restore
```bash
# Restaurar banco (CUIDADO: substitui dados)
docker exec -i bot-denuncia-db psql -U admin -d botdenuncia < backup_db_YYYYMMDD_HHMMSS.sql

# Restaurar uploads
tar -xzf backup_uploads_YYYYMMDD_HHMMSS.tar.gz
```

## 🚨 **Troubleshooting**

### Problemas Comuns

#### Porta ocupada
```bash
# Ver processo usando porta 3000
netstat -ano | findstr :3000
# ou
lsof -i :3000

# Matar processo (substitua PID)
taskkill /PID 1234 /F
```

#### Problemas de Docker
```bash
# Reiniciar Docker Desktop
# Ou via linha de comando:

# Parar todos os containers
docker stop $(docker ps -aq)

# Remover containers órfãos
docker container prune

# Limpar volumes órfãos
docker volume prune
```

#### Problemas de Banco
```bash
# Resetar banco completamente
docker-compose down -v
docker-compose up -d
npx prisma db push
node setup-test.js
```

#### Problemas de Dependências
```bash
# Limpar cache npm
npm cache clean --force

# Reinstalar dependências
rm -rf node_modules package-lock.json
npm install

# Ou usar yarn
yarn cache clean
rm -rf node_modules yarn.lock
yarn install
```

## 📝 **Desenvolvimento**

### Adicionar Nova Dependência
```bash
# Dependência de produção
npm install nome-da-lib

# Dependência de desenvolvimento
npm install -D nome-da-lib

# Atualizar dependências
npm update
```

### Git Workflow
```bash
# Status
git status

# Adicionar arquivos (cuidado com credenciais!)
git add .

# Commit
git commit -m "feat: descrição da mudança"

# Push
git push origin main
```

---

**💡 Dica**: Salve este arquivo como referência rápida!
**⚠️ Lembre-se**: Sempre verifique se os containers Docker estão rodando antes de iniciar a aplicação.