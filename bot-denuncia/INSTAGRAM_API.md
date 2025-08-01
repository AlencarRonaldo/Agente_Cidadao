# 📱 Instagram Private API - Documentação Completa

## 🎯 Visão Geral

O Bot de Denúncias Cidadãs agora utiliza a **Instagram Private API** para publicação automática de denúncias aprovadas. Esta integração permite:

- 🤖 **Publicação automática** de denúncias aprovadas
- 🖼️ **Processamento de imagens** otimizado para Instagram
- 📍 **Geolocalização** baseada no bairro da denúncia
- 🏷️ **Hashtags automáticas** baseadas nos vereadores responsáveis
- ⚡ **Rate limiting** respeitando limites do Instagram
- 💾 **Sessão persistente** para evitar logins frequentes

## 🔧 Configuração

### 1. Dependências Instaladas

```bash
npm install instagram-private-api sharp jimp express-fileupload
```

### 2. Variáveis de Ambiente

Adicione no arquivo `.env`:

```env
# Instagram API (Instagram Private API)
INSTAGRAM_USERNAME=seu_usuario_instagram
INSTAGRAM_PASSWORD=sua_senha_instagram
```

### 3. Estrutura de Arquivos

```
src/
├── services/
│   ├── instagramService.js     # Serviço principal do Instagram
│   └── imageService.js         # Processamento de imagens
├── routes/
│   └── admin.js               # Endpoints administrativos
└── workers/
    └── publishWorker.js       # Worker de publicação

test-instagram.js              # Script de teste
INSTAGRAM_API.md              # Esta documentação
```

## 🚀 Funcionalidades

### 📤 Publicação Automática

```javascript
const resultado = await instagramService.publicar({
  texto: "🚨 DENÚNCIA CIDADÃ\n\nProblema na iluminação pública...",
  imagem: "/path/to/image.jpg",
  vereadores: [
    { nome: "João Silva", instagram: "@joaosilva" }
  ]
});
```

### 🖼️ Processamento de Imagens

```javascript
const processed = await imageService.processForInstagram(imagePath, {
  type: 'square',     // square, portrait, landscape, story
  quality: 85,        // 1-100
  addWatermark: true,
  watermarkText: 'Bot Denúncias SBC'
});
```

### 📊 Informações da Conta

```javascript
const accountInfo = await instagramService.getAccountInfo();
console.log({
  username: accountInfo.username,
  followers: accountInfo.followerCount,
  posts: accountInfo.mediaCount
});
```

## 🛠️ Endpoints Administrativos

### GET `/api/admin/instagram/status`
Verifica status da conexão Instagram

```json
{
  "success": true,
  "data": {
    "isLoggedIn": true,
    "username": "seu_usuario",
    "hasValidCredentials": true,
    "sessionExists": true
  }
}
```

### POST `/api/admin/instagram/test-connection`
Testa conexão e faz login

```json
{
  "success": true,
  "message": "Instagram connection successful",
  "data": {
    "username": "seu_usuario",
    "fullName": "Seu Nome",
    "followerCount": 1234,
    "followingCount": 567,
    "mediaCount": 89
  }
}
```

### GET `/api/admin/instagram/account-info`
Obtém informações detalhadas da conta

### GET `/api/admin/instagram/recent-posts?limit=10`
Lista posts recentes

### POST `/api/admin/instagram/test-post`
Publica um post de teste (multipart/form-data com imagem)

### POST `/api/admin/instagram/logout`
Faz logout e limpa sessão

## 🔒 Segurança e Rate Limiting

### 🛡️ Medidas de Segurança

1. **Sessão Persistente**: Evita logins frequentes que podem ser detectados
2. **Device Simulation**: Simula um dispositivo Android real
3. **Rate Limiting**: 5 segundos entre publicações
4. **Retry Logic**: Reagenda publicações em caso de rate limit
5. **Error Handling**: Trata erros de checkpoint e 2FA

### ⚡ Rate Limiting

```javascript
// Configuração automática
rateLimitDelay: 5000,        // 5 segundos entre posts
maxLoginAttempts: 3,         // Máximo 3 tentativas de login
sessionMaxAge: 24 * 60 * 60 * 1000  // Sessão válida por 24h
```

### 📋 Limits do Instagram

- **Posts por dia**: Máximo 50 (configurável)
- **Posts por hora**: Recomendado máximo 5
- **Intervalo mínimo**: 5 segundos entre posts
- **Tamanho da imagem**: Máximo 10MB
- **Dimensões**: Máximo 8000x8000 pixels

## 🖼️ Processamento de Imagens

### 📐 Formatos Suportados

- **Square**: 1080x1080 (feed padrão)
- **Portrait**: 1080x1350 (feed vertical)
- **Landscape**: 1080x566 (feed horizontal)
- **Story**: 1080x1920 (stories)

### 🎨 Recursos Avançados

```javascript
// Colagem de múltiplas imagens
const collage = await imageService.createCollage(imagePaths, {
  layout: 'grid',        // grid, horizontal, vertical
  backgroundColor: '#ffffff',
  spacing: 10
});

// Otimização automática
const optimized = await imageService.optimizeImage(imagePath, {
  quality: 85,
  format: 'jpeg',
  progressive: true,
  removeMetadata: true
});

// Criação de miniatura
const thumbnail = await imageService.createThumbnail(imagePath, 200);
```

## 🧪 Testando a Integração

### 1. Executar Script de Teste

```bash
node test-instagram.js
```

O script testa:
- ✅ Verificação de credenciais
- ✅ Conexão com Instagram
- ✅ Informações da conta
- ✅ Posts recentes
- ✅ Processamento de imagem
- ⚠️ Publicação de teste (desabilitada por segurança)

### 2. Teste Através do Admin Panel

1. Acesse: `http://localhost:3334/admin`
2. Faça login como admin
3. Teste os endpoints Instagram via API

### 3. Logs Detalhados

```bash
# Monitorar logs do Instagram
tail -f logs/combined.log | grep "Instagram"
```

## ⚙️ Configuração Avançada

### 🔄 Worker de Publicação

O `publishWorker.js` gerencia automaticamente:

```javascript
// Horários de publicação (configurável)
CONFIG.HORARIOS_PUBLICACAO = ['08:00', '12:00', '18:00'];

// Máximo de posts por dia
CONFIG.MAX_POSTS_PER_DAY = 50;

// Delay entre posts
const delayBetweenPosts = 5 * 60 * 1000; // 5 minutos
```

### 📱 Formato do Post

```javascript
function formatarPost(denuncia) {
  return `🚨 DENÚNCIA CIDADÃ

${denuncia.textoFiltrado || denuncia.texto}

📍 Local: ${denuncia.bairro}
🏛️ Vereadores da região:
${denuncia.vereadores.join(' ')}

#DenunciaCidada #SaoBernardodoCampo #FiscalizacaoCidada
Protocolo: ${denuncia.protocolo}`;
}
```

### 🏷️ Hashtags Automáticas

- `#DenunciaCidada`
- `#SaoBernardodoCampo`
- `#FiscalizacaoCidada`
- `#TransparenciaPublica`
- Hashtags dos vereadores (baseado no Instagram)
- Hashtag do bairro (sem espaços)

## 🚨 Tratamento de Erros

### 🔐 Checkpoint Challenge
```javascript
if (error instanceof IgCheckpointError) {
  // Tenta resolver automaticamente
  await error.challenge.auto();
}
```

### 🔑 Two-Factor Authentication
```javascript
if (error instanceof IgLoginTwoFactorRequiredError) {
  // Logs aviso para intervenção manual
  logger.warn('2FA required - manual intervention needed');
}
```

### ⏰ Rate Limit
```javascript
if (error.message.includes('rate limit')) {
  // Reagenda para 1 hora depois
  await publishQueue.add('publish-post', job.data, {
    delay: 3600 * 1000
  });
}
```

## 📈 Monitoramento

### 📊 Métricas Disponíveis

```javascript
// Status da conexão
const status = await instagramService.getConnectionStatus();

// Posts recentes
const posts = await instagramService.getRecentPosts(10);

// Informações da conta
const account = await instagramService.getAccountInfo();
```

### 🔍 Logs Importantes

```javascript
// Logs de sucesso
logger.info('✅ Instagram post published successfully!');

// Logs de rate limiting
logger.info('⏳ Rate limiting: waiting 5000ms before next post');

// Logs de erro
logger.error('❌ Failed to publish Instagram post:', error.message);
```

## 🚀 Próximos Passos

1. **Configure as credenciais** no arquivo `.env`
2. **Execute o teste** com `node test-instagram.js`
3. **Teste via Admin Panel** os endpoints disponíveis
4. **Monitore os logs** para verificar funcionamento
5. **Ajuste configurações** conforme necessário

## ⚠️ Avisos Importantes

1. **Credenciais Seguras**: Mantenha usuário e senha em local seguro
2. **Rate Limiting**: Respeite os limites para evitar bloqueios
3. **Conteúdo**: Certifique-se que o conteúdo respeita as diretrizes do Instagram
4. **Backup**: Mantenha backup das sessões e configurações
5. **Monitoramento**: Monitore regularmente os logs para detectar problemas

## 📞 Suporte

Em caso de problemas:

1. Verifique os logs em `logs/combined.log`
2. Execute `node test-instagram.js` para diagnóstico
3. Verifique se as credenciais estão corretas
4. Confirme se o Instagram não solicitou verificação adicional

---

**✅ Sistema pronto para produção com Instagram Private API integrada!**