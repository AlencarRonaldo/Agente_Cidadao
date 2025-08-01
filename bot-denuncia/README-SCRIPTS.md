# 🚀 Scripts de Execução

## Scripts Principais

### 📋 `iniciar-sistema.bat`
**Script principal com menu interativo**
- ✅ Verificações automáticas (Node.js, npm, dependências)
- 🎯 Menu com opções de inicialização
- 📊 Verificação de status dos serviços
- 🛑 Opção para parar serviços

**Opções disponíveis:**
1. 🌐 Apenas API (porta 3355)
2. ⚙️ Apenas Workers
3. 🚀 API + Workers (RECOMENDADO)
4. 🔧 Modo Desenvolvimento
5. 📊 Verificar Status
6. 🛑 Parar Serviços

### ⚡ `dev-rapido.bat`
**Para desenvolvimento rápido**
- Inicia diretamente em modo desenvolvimento
- Auto-restart ativado
- Sem menus, direto ao ponto

### 🏭 `producao.bat`
**Para ambiente de produção**
- Verificações rigorosas de ambiente
- Configuração otimizada para produção
- Deploy automático do banco de dados
- NODE_ENV=production

## Scripts NPM Disponíveis

```bash
npm start          # API apenas (produção)
npm run dev        # API com auto-restart
npm run workers    # Workers apenas
npm run workers:dev # Workers com auto-restart
npm run all        # API + Workers (produção)
npm run all:dev    # API + Workers (desenvolvimento)
```

## URLs de Acesso

- 📊 **Dashboard Admin**: http://localhost:3355/admin
- 🔗 **Health Check**: http://localhost:3355/health
- 📋 **API Base**: http://localhost:3355/

## Dicas de Uso

### Para Desenvolvimento
```cmd
dev-rapido.bat
```

### Para Produção
```cmd
producao.bat
```

### Para Configuração Personalizada
```cmd
iniciar-sistema.bat
```

## Solução de Problemas

### ❌ "Node.js não encontrado"
- Instale Node.js: https://nodejs.org/
- Reinicie o terminal após instalação

### ❌ "Erro ao instalar dependências"
```cmd
npm cache clean --force
npm install
```

### ❌ "Porta já em uso"
- Pare outros serviços na porta 3355
- Ou altere a porta no arquivo .env

### ❌ "Erro de banco de dados"
```cmd
npx prisma migrate reset --force
npx prisma migrate dev
```