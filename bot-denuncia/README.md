# 🤖 Bot de Denúncias Cidadãs

Sistema automatizado para receber, processar e publicar denúncias cidadãs via WhatsApp e Instagram.

## 🚀 Início Rápido

### 1. Configuração Automática
```bash
# Clone o repositório
cd bot-denuncia

# Execute a configuração automática
node setup-test.js
```

### 2. Iniciar Serviços
```bash
# Terminal 1 - Backend API
npm run dev

# Terminal 2 - Workers (filas)
npm run workers:dev

# Terminal 3 - Teste das rotas (opcional)
node test-routes.js
```

### 3. Acessar Admin Panel
- **Backend API**: http://localhost:3000
- **Login Admin**: admin@teste.com / Admin123!
- **Dashboard**: http://localhost:3000/api/admin/dashboard

## 📋 Funcionalidades

### ✅ Implementado
- ✅ Recepção de denúncias via WhatsApp
- ✅ Processamento automático com IA
- ✅ Sistema de aprovação/rejeição
- ✅ Fila de publicação no Instagram
- ✅ Admin panel completo com Material-UI
- ✅ Autenticação JWT com roles
- ✅ Rate limiting e segurança
- ✅ Sistema de relatórios
- ✅ Logs de auditoria

### 🔄 Em Desenvolvimento
- 🔄 Sistema real de upload de imagens
- 🔄 Integração Instagram API oficial
- 🔄 Testes automatizados completos

## 🏗️ Arquitetura

```
bot-denuncia/
├── src/
│   ├── controllers/     # Lógica de negócio
│   ├── middleware/      # Autenticação e validação
│   ├── routes/         # Endpoints da API
│   ├── services/       # Serviços (WhatsApp, Instagram)
│   ├── workers/        # Processamento assíncrono
│   └── utils/          # Utilitários
├── admin-panel/        # Interface web (React)
├── prisma/            # Schema e migrations
└── docs/              # Documentação
```

## 🛠️ Tecnologias

- **Backend**: Node.js, Express, Prisma ORM
- **Banco**: PostgreSQL
- **Filas**: Redis + BullMQ
- **Frontend**: React + Material-UI
- **Autenticação**: JWT
- **Integração**: WhatsApp Web.js, Instagram API

## 📊 Admin Panel

### Funcionalidades
- 📈 Dashboard com estatísticas
- 📋 Listagem e filtros de denúncias
- ✅ Aprovação/rejeição individual e em lote
- ✏️ Edição de denúncias
- 👥 Gestão de usuários
- 📊 Relatórios detalhados
- ⚙️ Monitoramento do sistema

### Roles de Usuário
- **ADMIN**: Acesso total
- **MODERADOR**: Moderar denúncias
- **VISUALIZADOR**: Apenas visualizar

## 🧪 Testes

### Guia Completo
Ver arquivo `TESTE_ADMIN.md` para instruções detalhadas de teste.

### Teste Rápido das Rotas
```bash
# Com o servidor rodando
node test-routes.js
```

### Testes Unitários
```bash
npm test
```

## 🔧 Configuração

### Variáveis de Ambiente
```env
# Application
NODE_ENV=development
PORT=3000

# JWT
JWT_SECRET=sua-chave-jwt-super-secreta
JWT_EXPIRES_IN=24h

# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/db"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# APIs
INSTAGRAM_USERNAME=sua_conta
INSTAGRAM_PASSWORD=sua_senha
```

### Dependências do Sistema
- Node.js 18+
- PostgreSQL 14+
- Redis 6+

## 📝 Scripts NPM

```bash
# Desenvolvimento
npm run dev           # Backend com hot reload
npm run workers:dev   # Workers com hot reload
npm run all:dev       # Backend + Workers juntos

# Produção
npm start            # Backend
npm run workers      # Workers
npm run all          # Backend + Workers juntos

# Banco de dados
npm run db:migrate   # Executar migrations
npm run db:seed      # Popular dados iniciais
npm run db:reset     # Reset completo

# Testes
npm test            # Testes unitários
npm run test:watch  # Testes em modo watch
```

## 🚨 Segurança

- ✅ Autenticação JWT
- ✅ Rate limiting por IP
- ✅ Validação de entrada
- ✅ Sanitização de dados
- ✅ Headers de segurança (Helmet)
- ✅ CORS configurado
- ✅ Logs de auditoria

## 📞 Suporte

### Logs
```bash
# Logs da aplicação
tail -f logs/app.log

# Logs do sistema
tail -f logs/system.log
```

### Ferramentas de Debug
- **Prisma Studio**: `npx prisma studio`
- **Redis CLI**: `redis-cli`
- **DevTools**: F12 no navegador

### Problemas Comuns
1. **Erro de conexão BD**: Verificar DATABASE_URL
2. **Erro Redis**: Verificar se Redis está rodando
3. **Erro 401**: Token expirado, fazer login novamente
4. **Erro CORS**: Verificar FRONTEND_URL no .env

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença ISC.

---

**Desenvolvido com ❤️ para facilitar a participação cidadã**