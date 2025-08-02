# 🔗 COMO CONECTAR INSTAGRAM À PÁGINA DO FACEBOOK

## ⚠️ SITUAÇÃO ATUAL

Seu token está **VÁLIDO** ✅, mas a página "Voz do Povo" não tem uma conta Instagram Business conectada.

**Descobertas:**
- ✅ Token válido para: Ronaldo Carvalho
- ✅ Página Facebook: Voz do Povo (ID: 737063212824344)
- ❌ Instagram Business: Não conectado

## 📋 PASSOS PARA CONECTAR (5 minutos)

### 1️⃣ Converter Instagram para Conta Business
1. Abra o Instagram no celular
2. Vá em **Configurações** → **Conta**
3. Toque em **"Mudar para conta profissional"**
4. Escolha **"Empresa"**
5. Conecte à página "Voz do Povo" do Facebook

### 2️⃣ Conectar Instagram à Página Facebook
1. No Facebook, acesse sua página "Voz do Povo"
2. Vá em **Configurações** → **Instagram**
3. Clique em **"Conectar conta"**
4. Faça login com @vozdopovobot
5. Autorize a conexão

### 3️⃣ Via Facebook Business Suite (Alternativa)
1. Acesse: https://business.facebook.com
2. Selecione sua página "Voz do Povo"
3. Vá em **Configurações** → **Contas** → **Instagram**
4. Clique em **"Conectar conta Instagram"**

## 🔍 APÓS CONECTAR

Execute novamente o comando para descobrir o ID:
```bash
node discover-instagram-id.js
```

Você verá algo como:
```
📄 Página: Voz do Povo
   ✅ Instagram Business Account encontrada!
   📱 Instagram ID: 17841400000000000
   📸 Username: @vozdopovobot
```

## 📝 ATUALIZAR .ENV

Após obter o ID, atualize seu .env:
```env
INSTAGRAM_BUSINESS_ID=17841400000000000  # Use o ID descoberto
INSTAGRAM_BUSINESS_ACCOUNT_ID=17841400000000000
```

## 🚀 SOLUÇÃO TEMPORÁRIA

Enquanto não conecta, use a **Private API**:

```bash
# Edite .env:
INSTAGRAM_PRIMARY_API=PRIVATE

# O sistema funcionará com:
Username: vozdopovobot
Password: Vozdopovo@bot1
```

## ✅ BENEFÍCIOS DA CONEXÃO

1. **API Oficial**: Mais estável e confiável
2. **Sem limites**: Menos restrições que Private API
3. **Analytics**: Acesso a métricas e insights
4. **Suporte**: Suporte oficial do Facebook

## 💡 DICA IMPORTANTE

Se @vozdopovobot já é uma conta business mas não aparece conectada:
1. Desconecte qualquer conexão antiga
2. Reconecte seguindo os passos acima
3. Certifique-se de usar o mesmo login do Facebook admin

**Tempo estimado**: 5 minutos para conectar + 1 minuto para testar