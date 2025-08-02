# 🚀 GUIA RÁPIDO: Gerar Token Instagram Graph API

## ⚠️ ERRO ATUAL
```
"Invalid OAuth access token - Cannot parse access token"
```
**Causa**: Token expirado, inválido ou mal formatado

---

## 📋 MÉTODO 1: Graph API Explorer (MAIS FÁCIL - 5 MINUTOS)

### Passo 1: Abrir Graph API Explorer
🔗 **Link direto**: https://developers.facebook.com/tools/explorer/

### Passo 2: Configurar
1. **No topo da página**, selecione:
   - **Facebook App**: `Bot de Denúncias Vereadores` (ou seu app ID: 1326356306161550)
   - **User or Page**: Mantenha "User Token" por enquanto

### Passo 3: Adicionar Permissões
1. Clique no botão **"Add Permissions"** (ou "Permissões")
2. Na janela que abrir, marque TODAS estas permissões:
   - ✅ **instagram_basic**
   - ✅ **instagram_content_publish**
   - ✅ **pages_show_list**
   - ✅ **pages_read_engagement**
   - ✅ **business_management**

### Passo 4: Gerar o Token
1. Clique no botão azul **"Generate Access Token"**
2. Uma janela do Facebook vai abrir
3. Faça login com a conta que administra o Instagram Business
4. Aceite todas as permissões solicitadas

### Passo 5: Copiar o User Token
1. O token aparecerá no campo "Access Token"
2. **COPIE ESTE TOKEN** (é o User Access Token)
3. Exemplo de formato correto:
   ```
   EAAxxxxxxxxxx...muito_longo...xxxZD
   ```

### Passo 6: Obter o Page Token
1. No mesmo Graph API Explorer
2. Na caixa de query, digite:
   ```
   me/accounts
   ```
3. Clique em **"Submit"**
4. Procure sua página Facebook conectada ao Instagram
5. Copie o valor de **"access_token"** da página

---

## 📋 MÉTODO 2: Token Debugger (Se já tem um token)

### Verificar Token Existente
🔗 **Link**: https://developers.facebook.com/tools/debug/accesstoken/

1. Cole seu token atual
2. Clique em "Debug"
3. Verifique:
   - **App ID**: Deve ser 1326356306161550
   - **Expires**: Se expirou, gere novo
   - **Scopes**: Deve ter as 5 permissões listadas

---

## 🔧 MÉTODO 3: Gerar via cURL (Avançado)

### 1. Obter Code de Autorização
Abra este link no navegador:
```
https://www.facebook.com/v21.0/dialog/oauth?client_id=1326356306161550&redirect_uri=http://localhost:3001/admin/instagram/oauth/callback&scope=instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement,business_management&response_type=code
```

### 2. Trocar Code por Token
```bash
curl -X POST "https://graph.facebook.com/v21.0/oauth/access_token" \
  -d "client_id=1326356306161550" \
  -d "client_secret=e9a232cd8e07c6223f1b793a401cf5fb" \
  -d "redirect_uri=http://localhost:3001/admin/instagram/oauth/callback" \
  -d "code=SEU_CODE_AQUI"
```

---

## ✅ ATUALIZAR O SISTEMA

### 1. Edite o arquivo `.env`
```env
# Substitua pelos tokens reais obtidos
INSTAGRAM_ACCESS_TOKEN=EAA...seu_user_token_aqui...ZD
INSTAGRAM_GRAPH_ACCESS_TOKEN=EAA...seu_page_token_aqui...ZD

# Desative o mock mode
INSTAGRAM_GRAPH_MOCK_MODE=false
```

### 2. Reinicie o Backend
```bash
# Pare o servidor (Ctrl+C) e reinicie
npm run dev
```

---

## 🧪 TESTAR O TOKEN

### Teste Rápido no Graph API Explorer
1. Cole seu novo token
2. Execute esta query:
   ```
   me?fields=id,name
   ```
3. Deve retornar seu nome e ID

### Teste via cURL
```bash
curl -X GET "https://graph.facebook.com/v21.0/me?fields=id,name&access_token=SEU_TOKEN_AQUI"
```

---

## ❓ PROBLEMAS COMUNS

### 1. "Token mal formatado"
- **Causa**: Token incompleto ou com espaços
- **Solução**: Copie o token completo sem espaços extras

### 2. "Permissões insuficientes"
- **Causa**: Faltam permissões no token
- **Solução**: Gere novo token com TODAS as 5 permissões

### 3. "App não autorizado"
- **Causa**: App em modo desenvolvimento
- **Solução**: Adicione usuários de teste no Facebook App

### 4. "Conta não é Business"
- **Causa**: Instagram não está como conta Business
- **Solução**: No app Instagram mobile, vá em Configurações → Conta → Mudar para conta profissional

---

## 📞 LINKS ÚTEIS

- **Graph API Explorer**: https://developers.facebook.com/tools/explorer/
- **Token Debugger**: https://developers.facebook.com/tools/debug/accesstoken/
- **Documentação**: https://developers.facebook.com/docs/instagram-api/getting-started

---

## 💡 DICA IMPORTANTE

Após gerar o token, você pode convertê-lo para **Long-Lived Token** (dura 60 dias):

```bash
curl -X GET "https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=1326356306161550&client_secret=e9a232cd8e07c6223f1b793a401cf5fb&fb_exchange_token=SEU_TOKEN_CURTO_AQUI"
```

Isso evita ter que gerar novo token frequentemente!