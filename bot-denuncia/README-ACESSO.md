# 🌐 COMO ACESSAR O SISTEMA

## 🚀 Para Iniciar o Sistema

Execute o comando:
```cmd
iniciar.bat
```

## 📊 Acessar o Dashboard

Após iniciar o sistema, abra seu navegador e acesse:

### **Dashboard Principal**
```
http://localhost:3355/admin
```

### **Outras URLs Úteis**
- **API Base**: http://localhost:3355
- **Health Check**: http://localhost:3355/health
- **Teste Dashboard**: http://localhost:3355/dashboard-test

## ⚠️ Importante

1. **O dashboard é servido pela API principal**
   - Não precisa iniciar o admin panel separadamente
   - Tudo roda na porta 3355

2. **Login do Admin**
   - Se pedir login, verifique as credenciais no banco de dados
   - Use o script `criar-admin.js` se precisar criar um novo admin

3. **Problemas Comuns**
   - **Página em branco**: Aguarde alguns segundos após iniciar
   - **Erro 404**: Certifique-se que o sistema iniciou corretamente
   - **Erro de conexão**: Verifique se a porta 3355 não está em uso

## 🛠️ Comandos Alternativos

### Apenas API (sem Workers):
```cmd
npm start
```

### Modo Desenvolvimento:
```cmd
npm run all:dev
```

### Verificar se está rodando:
```cmd
curl http://localhost:3355/health
```