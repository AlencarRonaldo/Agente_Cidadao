# 📱 GUIA DE CONFIGURAÇÃO DO INSTAGRAM

## 🎯 Visão Geral

O bot utiliza a biblioteca `instagram-private-api` para publicar automaticamente as denúncias aprovadas no Instagram. Este guia detalha como configurar e usar o serviço de Instagram.

---

## ⚠️ IMPORTANTES CONSIDERAÇÕES

### 🔐 Segurança
- **NUNCA** use sua conta pessoal principal
- Crie uma conta específica para o bot
- Use senhas fortes e únicas
- Configure 2FA na conta (pode exigir intervenção manual)

### 📋 Limitações do Instagram
- **Rate Limits**: 5 segundos entre posts (configurável)
- **API Privada**: Não é oficialmente suportada pelo Instagram
- **Checkpoints**: Instagram pode solicitar verificações humanas
- **Suspensão**: Contas podem ser suspensas por uso automatizado

---

## 🛠️ CONFIGURAÇÃO INICIAL

### 1. Criar Conta do Instagram
```
1. Acesse instagram.com
2. Crie uma nova conta:
   - Username: bot_denuncia_sbc (ou similar)
   - Email: bot@seudominio.com
   - Senha: Senha123!Strong (mude para algo seguro)
   - Nome: "Denúncias SBC"
   - Bio: "Bot oficial para denúncias cidadãs"
```

### 2. Configurar Variáveis de Ambiente
```bash
# No arquivo .env
INSTAGRAM_USERNAME=bot_denuncia_sbc
INSTAGRAM_PASSWORD=SuaSenhaSegura123!

# OU export no terminal
export INSTAGRAM_USERNAME="bot_denuncia_sbc"
export INSTAGRAM_PASSWORD="SuaSenhaSegura123!"
```

### 3. Primeira Execução
```bash
# Testar conexão
node test-instagram.js

# Ou via API
curl -X POST http://localhost:3000/api/admin/instagram/test \
  -H "Authorization: Bearer SEU_TOKEN"
```

---

## 🔧 FUNCIONALIDADES DISPONÍVEIS

### 📤 Publicação Automática
```javascript
// Exemplo de uso interno
const result = await instagramService.publicar({
  texto: "🕳️ DENÚNCIA CIDADÃ\n\nBuraco na Rua das Flores...",
  imagem: "/path/to/image.jpg",
  vereadores: ["@renatao_o_amigo_da_periferia", "@perycartola"]
});
```

### 📊 Informações da Conta
```javascript
// Via serviço
const info = await instagramService.getAccountInfo();
console.log(info);
// {
//   username: "bot_denuncia_sbc",
//   followerCount: 150,
//   mediaCount: 45,
//   isVerified: false
// }
```

### 📋 Posts Recentes
```javascript
const posts = await instagramService.getRecentPosts(5);
console.log(posts);
// Array com últimos 5 posts
```

---

## 🏗️ ARQUITETURA DO SERVIÇO

### 📁 Arquivos Principais
```
src/services/instagramService.js    # Serviço principal
instagram-session.json              # Sessão salva (auto-gerado)
test-instagram.js                   # Script de teste
```

### 🔄 Fluxo de Publicação
```
1. Worker detecta denúncia aprovada
2. Prepara imagem (redimensiona para 1080x1080)
3. Gera caption com hashtags
4. Verifica rate limit (5s entre posts)
5. Publica no Instagram
6. Salva resultado no banco
```

### 💾 Gerenciamento de Sessão
- **Auto-save**: Sessão é salva automaticamente após login
- **Auto-load**: Sessão é carregada na inicialização
- **Expiração**: Sessões expiram após 24h
- **Re-login**: Automático quando necessário

---

## 🎨 PERSONALIZAÇÃO

### 📝 Caption Template
```javascript
// Localizado em: src/services/smartAnalysisService.js
function gerarCaption(analise, textoOriginal) {
  let caption = `${emoji} DENÚNCIA CIDADÃ\n\n`;
  caption += `${textoOriginal}\n\n`;
  
  if (vereadores.length > 0) {
    caption += `📢 VEREADORES DA REGIÃO:\n`;
    caption += `${vereadores.join(' ')}\n\n`;
  }
  
  caption += `👥 MORADORES: Curtam e compartilhem!\n`;
  caption += `🏛️ PODER PÚBLICO: Esperamos providências!\n\n`;
  caption += hashtagsUnicas.join(' ');
  
  return caption;
}
```

### 🏷️ Hashtags Automáticas
```javascript
// Hashtags base (sempre incluídas)
const hashtagsBase = [
  '#DenunciaCidada',
  '#FiscalizaSBC', 
  '#SaoBernardoDoCampo',
  '#ProblemasUrbanos',
  '#CidadeMelhor',
  '#ABC'
];

// Hashtags por categoria
const hashtagsCategoria = {
  'VIA_PUBLICA': ['#ViasPublicas', '#Asfalto'],
  'ILUMINACAO': ['#IluminacaoPublica', '#Seguranca'],
  'LIMPEZA': ['#LimpezaUrbana', '#MeioAmbiente']
};
```

### 📍 Localização Automática
```javascript
// Bairros detectados automaticamente
const bairros = [
  'Centro', 'Assunção', 'Baeta Neves', 
  'Rudge Ramos', 'Taboão', 'Demarchi',
  'Ferrazópolis', 'Alves Dias', 'Anchieta',
  // ... mais bairros
];
```

---

## 🚨 RESOLUÇÃO DE PROBLEMAS

### ❌ Erro: "Login Failed"
```bash
# Verificar credenciais
echo $INSTAGRAM_USERNAME
echo $INSTAGRAM_PASSWORD

# Tentar login manual
node -e "
const ig = require('./src/services/instagramService');
ig.testConnection().then(console.log);
"
```

### ⚠️ Checkpoint Required
```
1. Instagram detectou automação
2. Acesse a conta manualmente
3. Complete a verificação solicitada
4. Aguarde 24h antes de usar o bot novamente
```

### 🔄 Sessão Expirada
```bash
# Limpar sessão e refazer login
rm instagram-session.json
node test-instagram.js
```

### 📱 2FA Ativado
```javascript
// Desabilitar 2FA temporariamente OU
// Implementar handler manual:

if (error instanceof IgLoginTwoFactorRequiredError) {
  const code = prompt('Digite o código 2FA:');
  await ig.account.twoFactorLogin({
    username,
    verificationCode: code,
    twoFactorIdentifier: error.response.body.two_factor_info.two_factor_identifier,
  });
}
```

---

## 🧪 TESTES E DESENVOLVIMENTO

### 🔍 Script de Teste Básico
```javascript
// test-instagram.js
const instagramService = require('./src/services/instagramService');

async function testInstagram() {
  console.log('🧪 Testando conexão Instagram...');
  
  try {
    // Testar conexão
    const status = await instagramService.testConnection();
    console.log('Status:', status);
    
    if (status.success) {
      // Obter informações da conta
      const info = await instagramService.getAccountInfo();
      console.log('Conta:', info);
      
      // Listar posts recentes
      const posts = await instagramService.getRecentPosts(3);
      console.log('Posts recentes:', posts.length);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

testInstagram();
```

### 📤 Teste de Publicação
```javascript
// CUIDADO: Isso publica no Instagram real!
const testPost = {
  texto: "🧪 TESTE - Post automático do bot de denúncias",
  imagem: "./test-image.jpg", // Imagem de teste
  vereadores: ["@teste"]
};

const result = await instagramService.publicar(testPost);
console.log('Resultado:', result);
```

---

## 📊 MONITORAMENTO

### 📈 Métricas Importantes
```javascript
// Verificar status
const metrics = {
  isConnected: await instagramService.getConnectionStatus(),
  rateLimitStatus: instagramService.lastPostTime,
  sessionAge: await instagramService.sessionExists(),
  accountInfo: await instagramService.getAccountInfo()
};
```

### 📝 Logs Relevantes
```bash
# Filtrar logs do Instagram
tail -f logs/app.log | grep "Instagram"

# Verificar erros específicos
grep -i "instagram" logs/app.log | grep -i "error"
```

---

## ⚙️ CONFIGURAÇÕES AVANÇADAS

### 🎛️ Rate Limiting
```javascript
// Em instagramService.js
this.rateLimitDelay = 5000; // 5 segundos (padrão)

// Para contas verificadas ou com mais seguidores:
this.rateLimitDelay = 3000; // 3 segundos

// Para contas novas ou suspeitas:
this.rateLimitDelay = 10000; // 10 segundos
```

### 🖼️ Processamento de Imagem
```javascript
// Qualidade da imagem
const processedBuffer = await sharp(imagePath)
  .resize(1080, 1080, {
    fit: 'cover',           // Cortar para caber
    position: 'center'      // Centralizar corte
  })
  .jpeg({ 
    quality: 85,           // 85% qualidade (padrão)
    progressive: true      // JPEG progressivo
  })
  .toBuffer();
```

### 🗂️ Backup de Sessão
```bash
# Fazer backup da sessão
cp instagram-session.json instagram-session.backup.json

# Restaurar em caso de problemas
cp instagram-session.backup.json instagram-session.json
```

---

## 🚀 PRODUÇÃO

### 🔒 Segurança em Produção
```bash
# Usar variáveis de ambiente seguras
export INSTAGRAM_USERNAME="conta_producao"
export INSTAGRAM_PASSWORD="$(cat /secure/instagram_password)"

# Ou usar gerenciador de secrets
# AWS Secrets Manager, HashiCorp Vault, etc.
```

### 📊 Monitoramento
```yaml
# Alertas recomendados
alerts:
  - login_failures > 3
  - posts_failed > 5
  - rate_limit_exceeded
  - checkpoint_required
  - session_expired
```

### 🔄 Backup e Recovery
```bash
# Backup diário da sessão
0 2 * * * cp /app/instagram-session.json /backup/instagram-session-$(date +%Y%m%d).json

# Limpeza de backups antigos (manter 7 dias)
0 3 * * * find /backup -name "instagram-session-*.json" -mtime +7 -delete
```

---

## 📞 SUPORTE

### 🔧 Debug Mode
```bash
# Habilitar logs detalhados
DEBUG=instagram* node src/index.js

# Ou via environment
export DEBUG="instagram*"
npm run dev
```

### 📋 Checklist de Problemas
- [ ] Credenciais corretas no .env
- [ ] Conta não suspensa
- [ ] Sem 2FA ativo
- [ ] Internet estável
- [ ] Rate limit respeitado
- [ ] Sessão não expirada

### 🆘 Contatos
- **Instagram Business**: help.instagram.com
- **Documentação API**: github.com/dilame/instagram-private-api
- **Issues do Projeto**: [link para seu repositório]

---

**⚠️ LEMBRETE IMPORTANTE**
Este serviço usa a API privada do Instagram, que não é oficialmente suportada. Use com responsabilidade e sempre monitore a conta para evitar suspensões.

**Última atualização:** 25/07/2025