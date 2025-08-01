# 📱 GUIA DE CONFIGURAÇÃO DO WHATSAPP

## 🎯 Visão Geral

O bot utiliza a biblioteca `whatsapp-web.js` para receber denúncias via WhatsApp. Este guia detalha como configurar e testar o serviço.

---

## ⚠️ IMPORTANTES CONSIDERAÇÕES

### 🔐 Segurança
- **Número Dedicado**: Use um número de telefone específico para o bot
- **WhatsApp Business**: Recomendado para uso profissional
- **Backup**: Mantenha backup da sessão do WhatsApp

### 📋 Limitações do WhatsApp Web
- **Dependência de Conexão**: Precisa manter o celular conectado inicialmente
- **QR Code**: Necessário escaneamento periódico para autenticação
- **Rate Limits**: WhatsApp tem limites de mensagens por período

---

## 🛠️ CONFIGURAÇÃO INICIAL

### 1. Preparar Número do WhatsApp
```
1. Use um número dedicado para o bot
2. Instale WhatsApp neste número
3. Configure como WhatsApp Business (recomendado)
4. Defina nome: "Bot Denúncias SBC" (ou similar)
5. Adicione bio: "Bot oficial para denúncias cidadãs"
```

### 2. Estrutura de Arquivos
```
bot-denuncia/
├── src/services/whatsappService.js  # Serviço principal
├── src/config/constants.js          # Mensagens e estados
├── .wwebjs_auth/                    # Sessão (auto-gerado)
└── .wwebjs_cache/                   # Cache (auto-gerado)
```

### 3. Dependências Necessárias
```bash
# Já incluídas no package.json
npm install whatsapp-web.js qrcode-terminal
```

---

## 🚀 INICIALIZAÇÃO

### 1. Iniciar o Serviço
```bash
# Terminal 1 - Backend com WhatsApp
npm run dev

# ou separadamente
node src/index.js
```

### 2. Escaneamento do QR Code
```bash
# O QR Code aparecerá no terminal
# Use o WhatsApp do celular para escanear:
# WhatsApp > Menu (⋮) > Dispositivos conectados > Conectar dispositivo
```

### 3. Confirmação de Conexão
```bash
# Quando conectado, verá:
✅ WhatsApp Client is ready!
```

---

## 🔧 FUNCIONALIDADES DISPONÍVEIS

### 📋 Menu Principal
O bot oferece as seguintes opções:
1. **Fazer Denúncia** - Iniciar nova denúncia
2. **Minhas Denúncias** - Consultar status
3. **Bairros Atendidos** - Lista de regiões
4. **Ajuda** - Instruções de uso

### 🎯 Fluxo de Denúncia
```
1. Usuário: "1" ou "fazer denúncia"
2. Bot: Solicita descrição do problema
3. Usuário: Descreve o problema (min. 10 caracteres)
4. Bot: Solicita endereço/localização
5. Usuário: Informa endereço
6. Bot: Solicita foto do problema
7. Usuário: Envia imagem
8. Bot: Mostra resumo e pede confirmação
9. Usuário: Confirma ✅
10. Bot: Gera protocolo e processa
```

### 🤖 Processamento Inteligente
- **Filtro de Texto**: Remove conteúdo inadequado
- **Análise de Bairro**: Valida localização
- **Seleção de Vereadores**: Automaticamente por região
- **Geração de Protocolo**: Único para cada denúncia

---

## 🧪 COMO TESTAR

### 1. Teste Básico de Conexão
```bash
# Envie mensagem para o número do bot
Mensagem: "Olá"
Resposta esperada: Menu principal com opções
```

### 2. Teste Completo de Denúncia
```bash
# Passo a passo:
1. Envie: "1" ou "fazer denúncia"
2. Envie: "Buraco na rua da esquina muito perigoso"
3. Envie: "Rua das Flores, 123, Centro"
4. Envie: [foto do problema]
5. Envie: "✅ confirmar e enviar"

# Resultado esperado:
- Protocolo gerado (ex: DEN-ABC123-XYZ)
- Denúncia salva no banco
- Adicionada à fila de processamento
```

### 3. Teste de Validações
```bash
# Teste texto muito curto:
Envie: "buraco"
Resposta: Pedirá mais detalhes (min. 10 caracteres)

# Teste bairro inválido:
Envie: "Rua Inexistente, Bairro Falso"
Resposta: Lista de sugestões de bairros válidos

# Teste sem imagem:
Envie: texto quando pedir foto
Resposta: Pedirá especificamente uma imagem
```

---

## 📊 MONITORAMENTO

### 📈 Logs do WhatsApp
```bash
# Ver logs em tempo real
tail -f logs/app.log | grep "WhatsApp"

# Filtrar por erros
grep -i "error" logs/app.log | grep -i "whatsapp"
```

### 🔍 Status da Conexão
```javascript
// Verificar programaticamente
const whatsappService = require('./src/services/whatsappService');
console.log('WhatsApp conectado:', whatsappService.client.info);
```

### 📱 Estados das Conversas
```sql
-- Verificar conversas ativas
SELECT phoneNumber, estado, ultimaInteracao 
FROM ConversaUsuario 
WHERE expiresAt > NOW();

-- Contar por estado
SELECT estado, COUNT(*) as total 
FROM ConversaUsuario 
GROUP BY estado;
```

---

## ⚙️ CONFIGURAÇÕES AVANÇADAS

### 🎛️ Timeout de Conversa
```javascript
// Em src/config/constants.js
const TIMEOUT_CONVERSA = 15 * 60 * 1000; // 15 minutos (padrão)

// Para conversas mais longas:
const TIMEOUT_CONVERSA = 30 * 60 * 1000; // 30 minutos
```

### 🖼️ Configuração de Mídia
```javascript
// Em whatsappService.js
// Suporta: image, audio, video, document
if (message.hasMedia && message.type === 'image') {
    const media = await message.downloadMedia();
    // Processar imagem...
}
```

### 📝 Personalizar Mensagens
```javascript
// Em src/config/constants.js
const MESSAGES = {
    BEM_VINDO: `🤖 *Bot de Denúncias Cidadãs*
    
Olá! Eu sou o assistente virtual para denúncias em São Bernardo do Campo.

*Selecione uma opção:*
1️⃣ Fazer Denúncia
2️⃣ Minhas Denúncias  
3️⃣ Bairros Atendidos
4️⃣ Ajuda

Digite o número da opção desejada.`,

    INICIAR_DENUNCIA: `📝 *Descreva o problema*

Por favor, conte com detalhes qual é o problema que você gostaria de denunciar.

*Exemplo:*
"Buraco grande na Rua das Flores causando acidentes"

Seja específico para que possamos ajudar melhor! 🙏`,

    // ... outras mensagens
};
```

---

## 🚨 RESOLUÇÃO DE PROBLEMAS

### ❌ Erro: "Could not connect to WhatsApp"
```bash
# Soluções:
1. Verificar se o celular está conectado à internet
2. Escanear novo QR Code
3. Verificar se WhatsApp não está aberto no celular
4. Reiniciar o serviço

# Comandos:
pkill -f "node.*whatsapp"  # Matar processo
rm -rf .wwebjs_auth/       # Limpar sessão
npm run dev                # Reiniciar
```

### ⚠️ QR Code não aparece
```bash
# Verificar dependências
npm install puppeteer --save

# Verificar logs
DEBUG=whatsapp* npm run dev

# Forçar headless=false para debug
puppeteer: {
    headless: false,  // Mostra navegador
    args: ['--no-sandbox']
}
```

### 🔄 Sessão expirada frequentemente
```bash
# Manter sessão mais tempo
# Em whatsappService.js:
authStrategy: new LocalAuth({
    clientId: "bot-denuncias-sbc",
    dataPath: "./whatsapp-session"
})
```

### 📱 Mensagens não chegam
```bash
# Verificar rate limits
# WhatsApp limita mensagens por período

# Implementar delay entre mensagens:
await new Promise(resolve => setTimeout(resolve, 1000));
await client.sendMessage(to, message);
```

---

## 🧪 SCRIPTS DE TESTE

### 📋 Teste Automatizado
```javascript
// test-whatsapp.js
const { Client } = require('whatsapp-web.js');

async function testWhatsApp() {
    console.log('🧪 Testando WhatsApp...');
    
    // Verificar se serviço está rodando
    try {
        const response = await fetch('http://localhost:3000/health');
        console.log('✅ Servidor rodando');
    } catch (error) {
        console.log('❌ Servidor offline');
        return;
    }
    
    // Testar banco de dados
    const prisma = require('./src/config/database');
    try {
        await prisma.$queryRaw`SELECT 1`;
        console.log('✅ Banco conectado');
    } catch (error) {
        console.log('❌ Erro no banco:', error.message);
    }
    
    console.log('📱 Teste manual necessário: envie mensagem para o bot');
}

testWhatsApp();
```

### 🔍 Monitor de Conversas
```javascript
// monitor-conversations.js
const prisma = require('./src/config/database');

async function monitorConversations() {
    const conversas = await prisma.conversaUsuario.findMany({
        orderBy: { ultimaInteracao: 'desc' }
    });
    
    console.log('\n📊 CONVERSAS ATIVAS:');
    conversas.forEach(conv => {
        console.log(`📱 ${conv.phoneNumber} - ${conv.estado} - ${conv.ultimaInteracao}`);
    });
    
    const denuncias = await prisma.denuncia.count();
    console.log(`\n📋 Total de denúncias: ${denuncias}`);
}

setInterval(monitorConversations, 30000); // A cada 30s
```

---

## 🔒 SEGURANÇA EM PRODUÇÃO

### 🛡️ Configurações Seguras
```javascript
// Configuração para produção
new Client({
    authStrategy: new LocalAuth({
        clientId: process.env.WHATSAPP_CLIENT_ID || "bot-production",
        dataPath: process.env.WHATSAPP_DATA_PATH || "./secure-session"
    }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ]
    }
});
```

### 📂 Backup da Sessão
```bash
# Backup diário da sessão
0 2 * * * cp -r /app/.wwebjs_auth /backup/whatsapp-session-$(date +%Y%m%d)

# Limpeza de backups antigos (manter 7 dias)
0 3 * * * find /backup -name "whatsapp-session-*" -mtime +7 -exec rm -rf {} \;
```

### 🚨 Alertas de Monitoramento
```yaml
# Alertas recomendados
alerts:
  - whatsapp_disconnected > 5min
  - messages_failed > 10
  - qr_code_expired
  - session_invalid
  - conversation_timeout_high
```

---

## 📞 NÚMEROS DE TESTE

### 🧪 Para Desenvolvimento
```
Seu próprio número: Teste básico
Número de equipe: Teste de integração
WhatsApp Business API: Teste de produção
```

### 📱 Comandos de Teste Rápido
```
"1" - Fazer denúncia
"2" - Consultar denúncias
"ajuda" - Menu de ajuda
"menu" - Voltar ao menu principal
```

---

## 📋 CHECKLIST DE CONFIGURAÇÃO

- [ ] WhatsApp instalado no número dedicado
- [ ] Dependências instaladas (`npm install`)
- [ ] Redis rodando (para filas)
- [ ] PostgreSQL conectado
- [ ] QR Code escaneado
- [ ] Primeira mensagem teste enviada
- [ ] Denúncia completa testada
- [ ] Logs funcionando
- [ ] Backup configurado

---

**⚠️ LEMBRETE IMPORTANTE**
O WhatsApp Web requer que o celular permaneça conectado à internet. Para uso em produção, considere usar WhatsApp Business API oficial para maior estabilidade.

**Última atualização:** 25/07/2025