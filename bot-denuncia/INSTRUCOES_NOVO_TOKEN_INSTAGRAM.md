# 🔑 INSTRUÇÕES PARA OBTER NOVO TOKEN INSTAGRAM GRAPH API

## ⚠️ SITUAÇÃO ATUAL

Seu token Instagram Graph API expirou porque houve logout da sessão. Isso é normal e acontece quando:
- O usuário faz logout do Facebook/Instagram
- O token expira após 60 dias
- As permissões são revogadas

**Status Atual**: Token inválido - "The session is invalid because the user logged out"

## 📋 COMO OBTER NOVO TOKEN (10 minutos)

### 1️⃣ Acesse o Facebook Developer
- URL: https://developers.facebook.com/
- Faça login com a conta que gerencia o Instagram Business

### 2️⃣ Vá para seu App
- App ID: `1326356306161550`
- Nome: Seu app de integração Instagram

### 3️⃣ Graph API Explorer
1. No menu lateral, clique em **"Tools"** → **"Graph API Explorer"**
2. Selecione seu app no dropdown superior
3. Clique em **"Generate Access Token"**

### 4️⃣ Configure as Permissões
Marque as seguintes permissões necessárias:
- ✅ `instagram_basic`
- ✅ `instagram_content_publish`
- ✅ `pages_show_list`
- ✅ `pages_read_engagement`
- ✅ `business_management`

### 5️⃣ Gere o Token
1. Clique em **"Generate Token"**
2. Autorize todas as permissões solicitadas
3. Selecione a página/conta Instagram Business
4. Copie o token gerado

### 6️⃣ Token de Longa Duração (Recomendado)
Para converter em token de longa duração (60 dias):

```
https://graph.facebook.com/v21.0/oauth/access_token?
grant_type=fb_exchange_token&
client_id=1326356306161550&
client_secret=e9a232cd8e07c6223f1b793a401cf5fb&
fb_exchange_token=SEU_TOKEN_CURTO_AQUI
```

### 7️⃣ Atualize o .env
```env
INSTAGRAM_GRAPH_ACCESS_TOKEN=SEU_NOVO_TOKEN_AQUI
```

## 🚀 ALTERNATIVA RÁPIDA: USAR PRIVATE API

Enquanto não obtém o novo token Graph API, o sistema já está configurado para usar a Private API como fallback:

```env
# Já configurado no seu .env:
INSTAGRAM_USERNAME=vozdopovobot
INSTAGRAM_PASSWORD=Vozdopovo@bot1
INSTAGRAM_PRIMARY_API=PRIVATE  # Mude temporariamente para PRIVATE
```

Para ativar a Private API temporariamente:
1. Edite `.env`: `INSTAGRAM_PRIMARY_API=PRIVATE`
2. Reinicie o sistema
3. O sistema usará automaticamente a Private API

## ✅ VERIFICAÇÃO APÓS NOVO TOKEN

Execute este comando para verificar o novo token:
```bash
node test-graph-api-token.js
```

## 📊 STATUS DO SISTEMA

**Com Graph API (token expirado)**:
- ❌ Graph API: Token inválido
- ✅ Private API: Funcional (fallback)
- ✅ Sistema: Operacional via fallback

**Após novo token**:
- ✅ Graph API: Principal
- ✅ Private API: Fallback
- ✅ Sistema: 100% operacional

## 💡 DICAS IMPORTANTES

1. **Tokens de Página vs Usuário**: Use sempre tokens de página para maior durabilidade
2. **Webhook**: Configure webhooks para renovação automática de tokens
3. **Monitoramento**: Implemente alertas para tokens próximos da expiração

O sistema continuará funcionando com a Private API até você obter o novo token!