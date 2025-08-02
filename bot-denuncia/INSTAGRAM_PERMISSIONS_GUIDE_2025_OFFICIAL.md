# 🔐 GUIA OFICIAL: Permissões Instagram Graph API 2025

## ✅ CONFIRMAÇÃO: Permissões São REAIS e OFICIAIS

**Status das permissões questionadas:**
- ✅ `instagram_basic` - **OFICIAL** na documentação Meta
- ✅ `instagram_content_publish` - **OFICIAL** na documentação Meta

**Fonte:** [Meta for Developers - Permissions Reference](https://developers.facebook.com/docs/permissions)

## 🔍 PROBLEMA IDENTIFICADO

**Situação atual do sistema:**
```
Permissões no token atual:
❌ instagram_basic          (EM FALTA)
❌ instagram_content_publish (EM FALTA)
✅ pages_show_list          (OK)
✅ business_management      (OK)
```

**Por que o Graph API Explorer não mostra essas permissões:**
- Limitação conhecida do Graph API Explorer 2025
- Instagram permissions não aparecem na interface
- **SOLUÇÃO:** Usar URLs de autorização diretas

## 🚀 SOLUÇÃO RÁPIDA (5 minutos)

### Método 1: Script Automatizado (RECOMENDADO)

1. **Gerar URL de autorização:**
```bash
node generate-instagram-token-2025.js
```

2. **Acessar URL gerada no navegador:**
   - URL já configurada com todas as permissões corretas
   - Inclui `instagram_basic` e `instagram_content_publish`

3. **Autorizar permissões:**
   - Faça login com conta Facebook Business
   - **IMPORTANTE:** Autorize TODAS as permissões
   - Selecione página "Voz do Povo"

4. **Trocar código por token:**
```bash
node exchange-authorization-code.js CODIGO_DE_AUTORIZACAO
```

### Método 2: URL Manual

**URL de autorização completa:**
```
https://www.facebook.com/v21.0/dialog/oauth?
client_id=1326356306161550&
redirect_uri=https%3A%2F%2Flocalhost%3A3001%2Fadmin%2Finstagram%2Foauth%2Fcallback&
scope=instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement,business_management&
response_type=code
```

## 📋 PERMISSÕES OFICIAIS COMPLETAS (2025)

### Permissões Obrigatórias
```yaml
instagram_basic:
  description: "Basic Instagram Business account access"
  official_docs: "Meta Permissions Reference"
  required_for: "All Instagram API operations"
  dependencies: ["pages_read_user_content", "pages_show_list"]

instagram_content_publish:
  description: "Publish content to Instagram Business account"
  official_docs: "Meta Permissions Reference"
  required_for: "Creating posts, photos, videos"
  dependencies: ["instagram_basic", "pages_read_engagement", "pages_show_list"]

pages_show_list:
  description: "Show list of Facebook Pages"
  required_for: "Access to Page-connected Instagram accounts"

pages_read_engagement:
  description: "Read Page engagement data"
  required_for: "Instagram content publishing"

business_management:
  description: "Business management features"
  required_for: "Business account operations"
```

### Permissões Opcionais
```yaml
instagram_manage_insights:
  description: "Access Instagram insights and analytics"
  
instagram_manage_comments:
  description: "Manage Instagram comments"
  
pages_manage_posts:
  description: "Manage Page posts"
```

## 🔧 CONFIGURAÇÃO DO SISTEMA

### Variáveis de Ambiente (.env)
```env
# App Configuration (JÁ CONFIGURADO)
INSTAGRAM_APP_ID=1326356306161550
INSTAGRAM_APP_SECRET=e9a232cd8e07c6223f1b793a401cf5fb
INSTAGRAM_REDIRECT_URI=https://localhost:3001/admin/instagram/oauth/callback
GRAPH_API_VERSION=v21.0

# Token (ATUALIZAR APÓS GERAR NOVO)
INSTAGRAM_GRAPH_ACCESS_TOKEN=SEU_NOVO_TOKEN_AQUI
INSTAGRAM_BUSINESS_ACCOUNT_ID=4086465214956942

# Sistema (JÁ CONFIGURADO)
INSTAGRAM_PRIMARY_API=GRAPH
INSTAGRAM_FALLBACK_ENABLED=true
```

### Scopes no Sistema (graphApiConfig.js)
```javascript
scopes: [
  'instagram_basic',           // ✅ OFICIAL
  'instagram_content_publish', // ✅ OFICIAL
  'pages_show_list',          // ✅ OFICIAL
  'pages_read_engagement'     // ✅ OFICIAL
]
```

## 🧪 VALIDAÇÃO PÓS-CONFIGURAÇÃO

### 1. Testar Token
```bash
node get-page-token.js
```

**Saída esperada:**
```
🎯 ✅ INSTAGRAM BUSINESS ACCOUNT ENCONTRADO!
📱 ID: 17841XXXXXXXXX
📸 Username: @vozdopovobot

Permissões necessárias vs ativas:
✅ instagram_basic
✅ instagram_content_publish
✅ pages_show_list
✅ business_management
```

### 2. Testar Publicação
```bash
node test-graph-api-token.js
```

## 📚 DOCUMENTAÇÃO OFICIAL

### Meta for Developers
- **Permissions Reference:** https://developers.facebook.com/docs/permissions
- **Instagram Graph API:** https://developers.facebook.com/docs/instagram-api/
- **Content Publishing:** https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/content-publishing/

### Dependências das Permissões
```
instagram_basic
├── pages_read_user_content
└── pages_show_list

instagram_content_publish
├── instagram_basic
├── pages_read_engagement
└── pages_show_list
```

## ⚠️ PROBLEMAS CONHECIDOS E SOLUÇÕES

### Problem 1: Graph API Explorer não mostra Instagram permissions
**Solução:** Usar URLs de autorização diretas (método implementado)

### Problem 2: "Application does not have permission"
**Solução:** Verificar se todas as permissões foram autorizadas no processo OAuth

### Problem 3: Token expira rapidamente
**Solução:** Usar long-lived tokens (60 dias) - implementado no script

### Problem 4: Instagram Business Account não encontrado
**Solução:** 
1. Verificar se Instagram está conectado à página Facebook
2. Confirmar que é conta Business (não Creator)
3. Verificar permissões `pages_show_list` e `instagram_basic`

## 🎯 CHECKLIST DE SUCESSO

- [ ] ✅ Permissões `instagram_basic` e `instagram_content_publish` confirmadas como OFICIAIS
- [ ] ✅ URL de autorização gerada com todas as permissões
- [ ] ✅ Token obtido e convertido para long-lived
- [ ] ✅ Instagram Business Account descoberto
- [ ] ✅ Sistema configurado com novo token
- [ ] ✅ Testes de publicação funcionando

## 📞 SUPORTE

**Se ainda tiver problemas:**
1. Execute: `node get-page-token.js` para diagnóstico
2. Verifique logs em `logs/app.log`
3. Confirme que Instagram está conectado à página Facebook
4. Verifique se é conta Instagram Business (não Creator)

---

**Última atualização:** 2 de agosto de 2025  
**API Version:** v21.0  
**Status:** ✅ Permissões confirmadas como oficiais e funcionais