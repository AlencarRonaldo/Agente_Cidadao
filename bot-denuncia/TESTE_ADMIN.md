# 🧪 Guia de Testes - Admin Panel

## 🚀 Configuração Rápida (RECOMENDADO)

```bash
# Na pasta raiz do projeto
cd D:\SITES\bot_agente\bot-denuncia

# Execute o script de configuração automática
node setup-test.js
```

## 📋 Pré-requisitos Manuais

### 1. Configurar Ambiente
```bash
# Na pasta raiz do projeto
cd D:\SITES\bot_agente\bot-denuncia

# Instalar dependências
npm install

# Configurar banco
npx prisma generate
npx prisma db push

# Instalar dependências do admin panel (se necessário)
cd admin-panel
npm install
cd ..
```

### 2. Configurar Variáveis de Ambiente
Arquivo `.env` (já configurado se usou setup-test.js):
```env
# Application
NODE_ENV=development
PORT=3000

# JWT Authentication
JWT_SECRET=sua-chave-jwt-super-secreta-para-producao-trocar-123456789
JWT_EXPIRES_IN=24h

# PostgreSQL Database
DATABASE_URL="postgresql://admin:secret@localhost:5432/botdenuncia"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_URL="redis://localhost:6379"

# Frontend URLs
FRONTEND_URL=http://localhost:3001
ADMIN_PANEL_URL=http://localhost:3001

# Instagram API (simulação para testes)
INSTAGRAM_USERNAME=conta_teste_instagram
INSTAGRAM_PASSWORD=senha_teste_instagram
```

## 🚀 Iniciar Serviços

### Terminal 1 - Backend API
```bash
npm run dev
```

### Terminal 2 - Workers (Filas)
```bash
npm run workers:dev
```

### Terminal 3 - Admin Panel Frontend
```bash
cd admin-panel
npm start
```

### Terminal 4 - Redis (se não estiver rodando)
```bash
redis-server
```

### Terminal 5 - PostgreSQL (se não estiver rodando)
```bash
# No Windows com PostgreSQL instalado
pg_ctl -D "C:\Program Files\PostgreSQL\15\data" start
```

## 👤 Criar Usuário Admin Inicial

### Método 1: Via API (Recomendado)
```bash
curl -X POST http://localhost:3000/api/admin/usuarios \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Admin Teste",
    "email": "admin@teste.com",
    "senha": "Admin123!",
    "role": "ADMIN"
  }'
```

### Método 2: Via Script de Seed
Adicionar no arquivo `prisma/seed.js`:
```javascript
// Criar usuário admin
const bcrypt = require('bcryptjs');

const adminPassword = await bcrypt.hash('Admin123!', 12);

await prisma.adminUser.create({
  data: {
    nome: 'Admin Teste',
    email: 'admin@teste.com',
    senha: adminPassword,
    role: 'ADMIN',
    ativo: true
  }
});
```

Depois executar:
```bash
npx prisma db seed
```

## 🧪 Casos de Teste

### 1. 🔐 Teste de Autenticação

#### 1.1 Login Válido
1. Acesse: `http://localhost:3001`
2. Faça login com:
   - **Email**: admin@teste.com
   - **Senha**: Admin123!
3. **Resultado Esperado**: Dashboard carregado com sucesso

#### 1.2 Login Inválido
1. Tente fazer login com senha errada
2. **Resultado Esperado**: Mensagem de erro "Credenciais inválidas"

#### 1.3 Rate Limiting de Login
1. Tente fazer login com senha errada 6 vezes seguidas
2. **Resultado Esperado**: Bloqueio por 15 minutos após 5 tentativas

### 2. 📊 Teste do Dashboard

#### 2.1 Carregar Estatísticas
1. Após login, verifique se o dashboard mostra:
   - Total de denúncias
   - Denúncias pendentes
   - Denúncias publicadas
   - Gráficos de distribuição
2. **Resultado Esperado**: Dados carregados sem erro

### 3. 📋 Teste da Lista de Denúncias

#### 3.1 Criar Denúncias de Teste
Execute no backend (opcional, para ter dados):
```javascript
// Criar denúncias de teste via Prisma Studio ou script
```

#### 3.2 Filtros e Busca
1. **Filtro por Status**: Selecione diferentes status
2. **Busca por Texto**: Digite palavras-chave
3. **Filtro por Bairro**: Digite nome de bairro
4. **Filtro por Data**: Selecione período
5. **Resultado Esperado**: Lista filtrada corretamente

#### 3.3 Paginação
1. Se houver mais de 20 denúncias, teste a paginação
2. **Resultado Esperado**: Navegação entre páginas funciona

### 4. ✅ Teste de Aprovação de Denúncias

#### 4.1 Aprovação Individual
1. Clique no ícone ✅ verde em uma denúncia
2. Adicione observações (opcional)
3. Clique em "Aprovar"
4. **Resultado Esperado**: 
   - Status muda para "Aprovada (Admin)"
   - Denúncia vai para fila de publicação

#### 4.2 Aprovação em Lote
1. Selecione múltiplas denúncias (checkbox)
2. Clique em "Aprovar Selecionados"
3. Confirme a ação
4. **Resultado Esperado**: Todas selecionadas são aprovadas

### 5. ❌ Teste de Rejeição de Denúncias

#### 5.1 Rejeição Individual
1. Clique no ícone ❌ vermelho
2. **Obrigatório**: Digite motivo da rejeição
3. Adicione observações (opcional)
4. Clique em "Rejeitar"
5. **Resultado Esperado**: Status muda para "Rejeitada (Admin)"

#### 5.2 Rejeição sem Motivo
1. Tente rejeitar sem digitar motivo
2. **Resultado Esperado**: Botão "Rejeitar" fica desabilitado

### 6. ✏️ Teste de Edição de Denúncias

#### 6.1 Edição Individual
1. Clique no ícone ✏️ de editar
2. Modifique o texto filtrado
3. Adicione observações
4. Clique em "Salvar"
5. **Resultado Esperado**: Texto atualizado, campo "editadaPorAdmin" = true

### 7. 👁️ Teste de Visualização

#### 7.1 Modal de Detalhes
1. Clique no ícone 👁️ de visualizar
2. **Resultado Esperado**: Modal com todos os dados:
   - Protocolo
   - Status com chip colorido
   - Texto original e filtrado
   - Endereço e bairro
   - Vereadores mencionados
   - Score do bot

### 8. 👥 Teste de Gestão de Usuários (Admin)

#### 8.1 Criar Novo Usuário
1. Vá para seção de usuários (se implementada na UI)
2. Ou use API diretamente:
```bash
curl -X POST http://localhost:3000/api/admin/usuarios \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -d '{
    "nome": "Moderador Teste",
    "email": "mod@teste.com", 
    "senha": "Mod123!",
    "role": "MODERADOR"
  }'
```

### 9. 📊 Teste de Relatórios

#### 9.1 Relatório Geral
```bash
curl -X GET "http://localhost:3000/api/admin/relatorios?tipo=geral" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

#### 9.2 Relatório por Bairros  
```bash
curl -X GET "http://localhost:3000/api/admin/relatorios?tipo=bairros" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

### 10. 🔧 Teste do Sistema

#### 10.1 Status do Sistema
```bash
curl -X GET http://localhost:3000/api/admin/sistema/status \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```
**Resultado Esperado**: Status do banco, Redis e filas

## 🚨 Cenários de Erro para Testar

### 1. Token Expirado
1. Deixe o painel aberto por mais de 24h
2. Tente fazer uma ação
3. **Resultado Esperado**: Redirecionamento para login

### 2. Permissões Insuficientes
1. Faça login com usuário VISUALIZADOR
2. Tente aprovar uma denúncia
3. **Resultado Esperado**: Erro 403 - Permissão insuficiente

### 3. Rate Limit da API
1. Faça 101 requisições em 15 minutos
2. **Resultado Esperado**: Erro 429 - Rate limit excedido

### 4. Conexão com Banco Perdida
1. Pare o PostgreSQL
2. Tente carregar o dashboard
3. **Resultado Esperado**: Erro de conexão tratado graciosamente

## 📱 Teste Responsivo

### 1. Mobile
1. Abra DevTools (F12)
2. Selecione modo mobile
3. Teste todas as funcionalidades
4. **Resultado Esperado**: Interface adaptada e funcional

### 2. Tablet
1. Teste em resolução de tablet
2. **Resultado Esperado**: Layout adequado

## ⚡ Teste de Performance

### 1. Lista Grande
1. Crie 1000+ denúncias de teste
2. Teste paginação e filtros
3. **Resultado Esperado**: Carregamento rápido (<2s)

### 2. Ações em Lote
1. Selecione 50 itens
2. Execute ação em lote
3. **Resultado Esperado**: Processamento eficiente

## 🔍 Ferramentas de Debug

### 1. Logs do Backend
```bash
# Acompanhar logs em tempo real
tail -f logs/app.log
```

### 2. DevTools do Browser
1. F12 → Network: Verificar requisições
2. F12 → Console: Ver erros JavaScript
3. F12 → Application → Local Storage: Ver token JWT

### 3. Prisma Studio
```bash
npx prisma studio
```
Acesse: `http://localhost:5555`

### 4. Redis CLI
```bash
redis-cli
> KEYS *
> GET key_name
```

## ✅ Checklist de Testes

- [ ] Login/Logout funcionando
- [ ] Dashboard carregando estatísticas
- [ ] Lista de denúncias com filtros
- [ ] Aprovação individual e em lote
- [ ] Rejeição individual e em lote  
- [ ] Edição de denúncias
- [ ] Visualização detalhada
- [ ] Paginação funcionando
- [ ] Rate limiting ativo
- [ ] Validação de inputs
- [ ] Tratamento de erros
- [ ] Interface responsiva
- [ ] Logs de auditoria
- [ ] Permissões por role
- [ ] Token refresh automático

## 🐛 Problemas Comuns

### 1. Erro de CORS
**Solução**: Verificar se frontend está na lista de origens permitidas

### 2. Erro 401 - Token Inválido
**Solução**: Fazer logout e login novamente

### 3. Erro de Conexão com Banco
**Solução**: Verificar se PostgreSQL está rodando e DATABASE_URL está correto

### 4. Erro 500 - Servidor
**Solução**: Verificar logs do backend para detalhes específicos

### 5. Interface Não Carrega
**Solução**: Verificar se admin-panel está rodando na porta 3001

## 📞 Suporte
Se encontrar problemas, verifique:
1. Todos os serviços estão rodando
2. Variáveis de ambiente estão corretas
3. Dependências estão instaladas
4. Banco de dados foi migrado e populado