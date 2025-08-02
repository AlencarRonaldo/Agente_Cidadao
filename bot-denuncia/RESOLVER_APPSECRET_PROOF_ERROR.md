# 🔧 RESOLVER: "API calls from the server require an appsecret_proof argument"

## ⚠️ ERRO ATUAL
```
Page access tokens cannot be generated: API calls from the server require an appsecret_proof argument
You can try entering your own token instead.
```

**Causa**: O Graph API Explorer não consegue gerar Page Tokens automaticamente para apps em produção.

---

## ✅ SOLUÇÃO: Processo em 2 Etapas

### ETAPA 1: Gerar User Access Token

#### 1.1. No Graph API Explorer
🔗 **https://developers.facebook.com/tools/explorer/**

1. **Selecione seu App**: `Bot de Denúncias Vereadores` (1326356306161550)
2. **Mantenha**: "User Token" selecionado
3. **Adicione Permissões**:
   - ✅ instagram_basic
   - ✅ instagram_content_publish
   - ✅ pages_show_list
   - ✅ pages_read_engagement
   - ✅ business_management

4. **Clique em**: "Generate Access Token"
5. **Faça login** com a conta que administra o Instagram
6. **COPIE O USER TOKEN** gerado

### ETAPA 2: Obter Page Access Token via API

#### 2.1. Use o User Token para obter Page Token
No Graph API Explorer, com o **User Token** já configurado:

1. **Query para executar**:
   ```
   me/accounts?fields=access_token,name,id
   ```

2. **Clique em "Submit"**

3. **Resultado esperado**:
   ```json
   {
     "data": [
       {
         "access_token": "EAAxxxxxxx...sua_page_token_aqui...xxxZD",
         "name": "Nome da sua Página",
         "id": "ID_DA_PAGINA"
       }
     ]
   }
   ```

4. **COPIE O PAGE ACCESS TOKEN** da página conectada ao Instagram

---

## 🛠️ MÉTODO ALTERNATIVO: Via cURL

### Se o Graph API Explorer ainda não funcionar:

#### 1. Obter User Token via URL
Abra esta URL no navegador (substitua por sua URL de callback real se necessário):

```
https://www.facebook.com/v21.0/dialog/oauth?client_id=1326356306161550&redirect_uri=http://localhost:3001/admin/instagram/oauth/callback&scope=instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement,business_management&response_type=code&state=instagram_oauth
```

#### 2. Trocar Code por User Token
Após autorizar, você será redirecionado com um `code`. Use este cURL:

```bash
curl -X POST "https://graph.facebook.com/v21.0/oauth/access_token" \
  -d "client_id=1326356306161550" \
  -d "client_secret=e9a232cd8e07c6223f1b793a401cf5fb" \
  -d "redirect_uri=http://localhost:3001/admin/instagram/oauth/callback" \
  -d "code=SEU_CODE_AQUI"
```

#### 3. Obter Page Token com User Token
```bash
curl -X GET "https://graph.facebook.com/v21.0/me/accounts?access_token=SEU_USER_TOKEN_AQUI"
```

---

## 🔍 MÉTODO SIMPLES: Token de Teste

### Para desenvolvimento rápido:

#### 1. Graph API Explorer
1. Vá para: https://developers.facebook.com/tools/explorer/
2. Selecione seu app
3. **MUDE PARA**: "Page Token" no dropdown
4. Selecione manualmente sua página Facebook
5. Adicione as permissões Instagram
6. Gere o token

#### 2. Se aparecer lista de páginas
- Selecione a página conectada ao seu Instagram Business
- O token gerado será já um Page Token

---

## 📋 VERIFICAR CONFIGURAÇÃO DA PÁGINA

### Requisitos da Página Facebook:
1. **Página deve estar conectada ao Instagram Business**
2. **Você deve ser admin da página**
3. **Instagram deve ser conta Business/Creator**

### Como verificar:
1. **Facebook**: Vá em Business Manager ou Página
2. **Instagram**: Configurações → Conta → Mudar para conta profissional
3. **Conectar**: No Instagram, vá em Configurações → Conta → Contas vinculadas → Facebook

---

## ⚙️ CONFIGURAR appsecret_proof (Se ainda der erro)

### Opção 1: Desabilitar appsecret_proof no App
1. Facebook Developer Console
2. Seu App → Configurações → Avançado
3. **Desmarque**: "Require App Secret"

### Opção 2: Implementar appsecret_proof no código
Se quiser manter a segurança máxima, o sistema pode calcular o appsecret_proof:

```javascript
const crypto = require('crypto');

function generateAppSecretProof(accessToken, appSecret) {
  return crypto
    .createHmac('sha256', appSecret)
    .update(accessToken)
    .digest('hex');
}

// Uso:
const proof = generateAppSecretProof(accessToken, 'e9a232cd8e07c6223f1b793a401cf5fb');
```

---

## 📝 ATUALIZAR O SISTEMA

### Após obter ambos os tokens:

```env
# User Access Token (para autenticação geral)
INSTAGRAM_ACCESS_TOKEN=EAA...seu_user_token...ZD

# Page Access Token (para publicar no Instagram)
INSTAGRAM_GRAPH_ACCESS_TOKEN=EAA...seu_page_token...ZD

# Desabilitar mock mode
INSTAGRAM_GRAPH_MOCK_MODE=false
```

---

## 🧪 TESTAR OS TOKENS

### User Token:
```bash
curl "https://graph.facebook.com/v21.0/me?access_token=SEU_USER_TOKEN"
```

### Page Token:
```bash
curl "https://graph.facebook.com/v21.0/4086465214956942?fields=id,username&access_token=SEU_PAGE_TOKEN"
```

---

## 💡 DICAS IMPORTANTES

1. **User Token**: Para autenticação e obter Page Tokens
2. **Page Token**: Para publicar conteúdo no Instagram
3. **Ambos são necessários** para o sistema funcionar
4. **Page Token é mais específico** e tem permissões para publicação
5. **User Token pode ser convertido** para Long-Lived (60 dias)

---

## ❓ AINDA COM PROBLEMAS?

### Erro "Invalid OAuth access token":
- Gere novo User Token
- Verifique se App está ativo
- Confirme permissões Instagram

### Erro "Instagram account not found":
- Verifique se conta é Business/Creator
- Confirme se página Facebook está conectada
- Use Instagram Business Account ID correto

### Erro de permissões:
- Confirme todas as 5 permissões
- Verifique se você é admin da página
- Teste com conta que criou o app Facebook