# 📱 Guia de Configuração Instagram Graph API

## ⚠️ Status Atual
- **App ID**: ✅ Configurado (1326356306161550)
- **App Secret**: ✅ Configurado
- **Business Account ID**: ✅ Configurado (4086465214956942)  
- **Access Token**: ❌ **INVÁLIDO/EXPIRADO** - Precisa gerar novo

## 🔧 Como Obter um Novo Access Token

### Método 1: Graph API Explorer (Mais Fácil)

1. **Acesse o Graph API Explorer**:
   - https://developers.facebook.com/tools/explorer/

2. **Selecione seu App**:
   - No dropdown superior, selecione seu app "Bot Denúncia Cidadã" (ID: 1326356306161550)

3. **Configure as Permissões**:
   - Clique em "Add Permissions"
   - Marque estas permissões:
     - `instagram_basic`
     - `instagram_content_publish`
     - `pages_show_list`
     - `pages_read_engagement`
     - `business_management`

4. **Gere o Token**:
   - Clique em "Generate Access Token"
   - Faça login com a conta do Facebook que gerencia o Instagram Business
   - Autorize as permissões

5. **Converta para Long-Lived Token**:
   ```
   https://graph.facebook.com/v18.0/oauth/access_token?
   grant_type=fb_exchange_token&
   client_id=1326356306161550&
   client_secret=e9a232cd8e07c6223f1b793a401cf5fb&
   fb_exchange_token=SEU_TOKEN_CURTO_AQUI
   ```

### Método 2: Via Dashboard do App

1. **Acesse o Facebook Developers**:
   - https://developers.facebook.com/apps/1326356306161550/

2. **Vá para Instagram Basic Display**:
   - Menu lateral → Instagram → Basic Display

3. **Gere um Token de Usuário**:
   - Adicione um Instagram Test User
   - Gere o token para o usuário
   - Copie o token gerado

### Método 3: Usando o Sistema Local

1. **Inicie o sistema**:
   ```bash
   npm start
   ```

2. **Acesse o Admin Panel**:
   - http://localhost:3001/admin
   - Faça login

3. **Vá para Instagram → Graph API**:
   - Clique em "Iniciar OAuth"
   - Siga o fluxo de autorização

## 📝 Após Obter o Token

1. **Atualize o arquivo `.env`**:
   ```env
   INSTAGRAM_ACCESS_TOKEN=SEU_NOVO_TOKEN_AQUI
   INSTAGRAM_GRAPH_ACCESS_TOKEN=SEU_NOVO_TOKEN_AQUI
   ```

2. **Teste novamente**:
   ```bash
   node test-graph-api.js
   ```

## 🔍 Verificar Token

Para verificar se seu token está funcionando:

```bash
curl -X GET "https://graph.instagram.com/v18.0/me?fields=id,username&access_token=SEU_TOKEN"
```

## ⏰ Renovação do Token

- Tokens de curta duração: Expiram em 1 hora
- Tokens de longa duração: Expiram em 60 dias
- Configure renovação automática no sistema

## 🚨 Segurança

**IMPORTANTE**: Após configurar o novo token:
1. Regenere o App Secret no Facebook Developers
2. Atualize o novo App Secret no `.env`
3. Nunca compartilhe tokens ou secrets publicamente

## 📞 Suporte

Se precisar de ajuda:
1. Verifique os logs em `logs/app.log`
2. Use o modo mock para desenvolvimento: `INSTAGRAM_GRAPH_MOCK_MODE=true`
3. Consulte a documentação oficial: https://developers.facebook.com/docs/instagram-api/