/**
 * Criar Token Válido para o Sistema
 * Gera um token que funciona com o middleware de autenticação
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = 'sua-chave-jwt-super-secreta-para-producao-trocar-123456789';

// Criar token com a estrutura correta que o middleware espera
const tokenPayload = {
    userId: 'test-admin-id', // ← MIDDLEWARE ESPERA 'userId', não 'id'
    email: 'admin@teste.com',
    role: 'ADMIN',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 horas
};

const validToken = jwt.sign(tokenPayload, JWT_SECRET);

console.log('🎯 TOKEN VÁLIDO PARA O SISTEMA');
console.log('==============================');
console.log(validToken);
console.log('==============================\n');

console.log('📋 Payload do Token:');
console.log(JSON.stringify(tokenPayload, null, 2));
console.log('');

console.log('💡 COMO USAR:');
console.log('1. Copie o token acima');
console.log('2. No navegador, abra DevTools (F12)');
console.log('3. Vá para Application > Local Storage > http://localhost:3007');
console.log('4. Defina:');
console.log('   - Chave: "adminToken"');
console.log('   - Valor: [o token acima]');
console.log('5. Defina:');
console.log('   - Chave: "adminUser"');
console.log('   - Valor: {"id":"test-admin-id","email":"admin@teste.com","role":"ADMIN"}');
console.log('6. Recarregue a página (F5)');
console.log('7. Teste o botão de aprovação\n');

console.log('🧪 TESTE CURL:');
console.log('==============');
console.log(`curl -X POST "http://localhost:3355/api/admin/denuncias/cmdt4x12e00032w52lzl8jgtp/aprovar-e-postar" \\`);
console.log(`  -H "Content-Type: application/json" \\`);
console.log(`  -H "Authorization: Bearer ${validToken}" \\`);
console.log(`  -d '{"acao":"aprovar_e_postar","confirmar_publicacao":"CONFIRMO_PUBLICACAO_IMEDIATA","usuario_confirmacao":"admin","motivo_urgencia":"teste de funcionalidade do sistema"}'`);
console.log('');