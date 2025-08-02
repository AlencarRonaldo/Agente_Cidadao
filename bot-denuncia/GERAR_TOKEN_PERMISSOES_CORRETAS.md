# 🔑 GERAR TOKEN COM PERMISSÕES INSTAGRAM CORRETAS

## ❌ PROBLEMA IDENTIFICADO

Seu token atual não tem as **permissões específicas do Instagram**:

**Permissões em falta:**
- ❌ `instagram_basic` 
- ❌ `instagram_content_publish`

**Permissões presentes:**
- ✅ `pages_show_list`
- ✅ `business_management`

## 📋 COMO GERAR NOVO TOKEN (5 minutos)

### 1️⃣ Acesse o Graph API Explorer
- URL: https://developers.facebook.com/tools/explorer/
- Faça login com sua conta

### 2️⃣ Configure seu App
- Selecione seu app: **ID 1326356306161550**
- Clique no dropdown e selecione seu app

### 3️⃣ **IMPORTANTE**: Marque TODAS essas permissões
Clique em "Add a permission" e marque:

**📱 Instagram (OBRIGATÓRIAS):**
- ✅ `instagram_basic`
- ✅ `instagram_content_publish`

**📄 Páginas (JÁ TEM, mas confirme):**
- ✅ `pages_show_list`
- ✅ `pages_read_engagement` 
- ✅ `pages_manage_posts`
- ✅ `business_management`

### 4️⃣ Gerar o Token
1. Clique em **"Generate Access Token"**
2. **IMPORTANTE**: Quando aparecer a tela de permissões:
   - Autorize **TODAS** as permissões
   - Selecione a página **"Voz do Povo"**
   - Se perguntado sobre Instagram, **AUTORIZE**
3. Copie o token gerado

### 5️⃣ Converter para Long-lived Token
```bash
# Cole no navegador (substitua SEU_TOKEN_AQUI):
https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=1326356306161550&client_secret=e9a232cd8e07c6223f1b793a401cf5fb&fb_exchange_token=SEU_TOKEN_AQUI
```

### 6️⃣ Atualizar .env
```env
INSTAGRAM_GRAPH_ACCESS_TOKEN=SEU_NOVO_TOKEN_LONGO_AQUI
```

## 🧪 TESTAR NOVO TOKEN

Execute para verificar:
```bash
node get-page-token.js
```

Deve mostrar:
```
🎯 ✅ INSTAGRAM BUSINESS ACCOUNT ENCONTRADO!
📱 ID: 17841XXXXXXXXX
📸 Username: @vozdopovobot
```

## 🚀 SOLUÇÃO RÁPIDA (AGORA)

Enquanto gera o novo token, use a **Private API**:

```bash
# Edite .env:
INSTAGRAM_PRIMARY_API=PRIVATE

# Reinicie o sistema - funcionará imediatamente!
```

## ⚠️ DICAS IMPORTANTES

1. **Certifique-se** de autorizar TODAS as permissões solicitadas
2. **Não pule** a seleção da página "Voz do Povo"
3. **Se der erro**, desconecte e reconecte o Instagram à página primeiro
4. **Token válido** dura 60 dias

## 🎯 APÓS SUCESSO

Com o token correto, você terá:
- ✅ Graph API funcionando
- ✅ Private API como backup  
- ✅ Sistema 100% confiável
- ✅ Postagens automáticas estáveis

**Tempo estimado**: 5 minutos para gerar + 1 minuto para testar