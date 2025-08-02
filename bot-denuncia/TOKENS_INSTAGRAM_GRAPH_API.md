# 🔑 Tokens Necessários para Instagram Graph API

## 📋 Lista Completa de Tokens e IDs

### 1. **Facebook App ID** ✅
```
INSTAGRAM_APP_ID=1326356306161550
```
- **Onde obter**: Facebook Developer Console → Seu App → Configurações → Básico
- **Status**: ✅ Você já tem

### 2. **Facebook App Secret** ✅
```
INSTAGRAM_APP_SECRET=e9a232cd8e07c6223f1b793a401cf5fb
```
- **Onde obter**: Facebook Developer Console → Seu App → Configurações → Básico
- **Status**: ✅ Você já tem
- ⚠️ **IMPORTANTE**: Nunca compartilhe este token publicamente

### 3. **Instagram Business Account ID** ✅
```
INSTAGRAM_BUSINESS_ACCOUNT_ID=4086465214956942
```
- **Onde obter**: Graph API Explorer ou Business Manager
- **Status**: ✅ Você já tem

### 4. **Access Token (User Token)** ❌ **PRECISA GERAR NOVO**
```
INSTAGRAM_ACCESS_TOKEN=[PRECISA GERAR]
```
- **Tipo**: User Access Token com permissões do Instagram
- **Validade**: Expira em 60 dias (pode ser convertido para Long-Lived)
- **Permissões necessárias**:
  - `instagram_basic`
  - `instagram_content_publish`
  - `pages_show_list`
  - `pages_read_engagement`
  - `business_management`

### 5. **Page Access Token** ❌ **PRECISA GERAR**
```
INSTAGRAM_PAGE_ACCESS_TOKEN=[PRECISA GERAR]
```
- **Tipo**: Token da página Facebook conectada ao Instagram
- **Necessário para**: Publicar conteúdo no Instagram

---

## 🚀 Como Gerar os Tokens que Faltam

### Método 1: Graph API Explorer (Mais Rápido)

1. **Acesse o Graph API Explorer**
   - Link: https://developers.facebook.com/tools/explorer/

2. **Selecione seu App**
   - No dropdown superior, selecione: `Bot de Denúncias Vereadores`

3. **Configure as Permissões**
   - Clique em "Add Permissions"
   - Marque:
     - ✅ `instagram_basic`
     - ✅ `instagram_content_publish`
     - ✅ `pages_show_list`
     - ✅ `pages_read_engagement`
     - ✅ `business_management`

4. **Gere o Token**
   - Clique em "Generate Access Token"
   - Faça login com a conta que administra o Instagram Business

5. **Obtenha o Page Access Token**
   ```
   GET /me/accounts
   ```
   - Encontre sua página Facebook conectada
   - Copie o `access_token` da página

### Método 2: OAuth Flow (Produção)

1. **Configure o Redirect URI**
   ```
   INSTAGRAM_REDIRECT_URI=http://localhost:3001/admin/instagram/oauth/callback
   ```

2. **URL de Autorização**
   ```
   https://www.facebook.com/v21.0/dialog/oauth?
     client_id=1326356306161550&
     redirect_uri=http://localhost:3001/admin/instagram/oauth/callback&
     scope=instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement,business_management&
     response_type=code
   ```

3. **Troque o Code por Token**
   ```bash
   curl -X GET "https://graph.facebook.com/v21.0/oauth/access_token?
     client_id=1326356306161550&
     client_secret=e9a232cd8e07c6223f1b793a401cf5fb&
     redirect_uri=http://localhost:3001/admin/instagram/oauth/callback&
     code={CODE_RECEBIDO}"
   ```

---

## 🔄 Converter para Long-Lived Token (60+ dias)

### User Token Long-Lived
```bash
curl -X GET "https://graph.facebook.com/v21.0/oauth/access_token?
  grant_type=fb_exchange_token&
  client_id=1326356306161550&
  client_secret=e9a232cd8e07c6223f1b793a401cf5fb&
  fb_exchange_token={SHORT_LIVED_USER_TOKEN}"
```

### Page Token Long-Lived
```bash
curl -X GET "https://graph.facebook.com/v21.0/{USER_ID}/accounts?
  access_token={LONG_LIVED_USER_TOKEN}"
```

---

## 📝 Configuração Final no .env

Após obter todos os tokens, atualize o arquivo `.env`:

```env
# Instagram Graph API - Tokens Atualizados
INSTAGRAM_ACCESS_TOKEN=SEU_LONG_LIVED_USER_TOKEN_AQUI
INSTAGRAM_GRAPH_ACCESS_TOKEN=SEU_PAGE_ACCESS_TOKEN_AQUI

# Desabilitar Mock Mode
INSTAGRAM_GRAPH_MOCK_MODE=false
```

---

## 🧪 Testar os Tokens

### 1. Verificar User Token
```bash
curl -X GET "https://graph.facebook.com/v21.0/me?
  fields=id,name&
  access_token={USER_TOKEN}"
```

### 2. Verificar Page Token
```bash
curl -X GET "https://graph.facebook.com/v21.0/me/accounts?
  access_token={USER_TOKEN}"
```

### 3. Verificar Instagram Business Account
```bash
curl -X GET "https://graph.facebook.com/v21.0/4086465214956942?
  fields=id,username&
  access_token={PAGE_TOKEN}"
```

---

## ⚠️ Problemas Comuns

### Token Expirado
- **Sintoma**: Erro "Invalid OAuth access token"
- **Solução**: Gerar novo token seguindo os passos acima

### Permissões Insuficientes
- **Sintoma**: Erro "Insufficient permission to access this resource"
- **Solução**: Verificar se todas as permissões foram solicitadas

### App em Desenvolvimento
- **Sintoma**: Funciona apenas com usuários de teste
- **Solução**: Submeter app para revisão do Facebook

### Business Account não Conectado
- **Sintoma**: Erro "Instagram account is not a business account"
- **Solução**: Converter conta Instagram para Business no app mobile

---

## 🔐 Segurança

1. **Nunca commite tokens no Git**
2. **Use variáveis de ambiente**
3. **Rotacione tokens regularmente**
4. **Monitore uso de tokens no Facebook Developer Console**
5. **Configure webhooks para notificações de expiração**

---

## 📞 Suporte

- **Facebook Developer Docs**: https://developers.facebook.com/docs/instagram-api
- **Graph API Explorer**: https://developers.facebook.com/tools/explorer/
- **Token Debugger**: https://developers.facebook.com/tools/debug/accesstoken/