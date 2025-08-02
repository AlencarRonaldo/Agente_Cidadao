/**
 * Debug Token Authentication
 * Verifica por que o token não está funcionando
 */

const jwt = require('jsonwebtoken');

// Simular tokens que podem estar no localStorage
const testTokens = [
    // Token comum que pode estar sendo usado
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNsdHczdjY5NzAwMDBpbDUybTQ2cWo1ZDAiLCJlbWFpbCI6ImFkbWluQHRlc3RlLmNvbSIsInJvbGUiOiJBRE1JTiIsImlhdCI6MTczNTc1MTUwNCwiZXhwIjoxNzM1ODM3OTA0fQ.-0JdNyRb8jYHnAKVlYY8MaRN6rEf6S3oWjVJhj-R_ww',
    
    // Token que pode estar salvo
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImFkbWluQGV4YW1wbGUuY29tIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzM1NzUxNTA0fQ.abc123',
    
    // Token genérico para teste
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InRlc3QiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJyb2xlIjoiQURNSU4ifQ.test'
];

console.log('🔍 DEBUG: Problemas de Autenticação');
console.log('====================================\n');

// 1. Verificar se o servidor JWT está usando algum secret conhecido
const commonSecrets = [
    'sua-chave-jwt-super-secreta-para-producao-trocar-123456789',
    'jwt-secret',
    'secret',
    'admin-secret',
    'test-secret'
];

console.log('📋 Testando tokens comuns...\n');

testTokens.forEach((token, index) => {
    console.log(`Token ${index + 1}: ${token.substring(0, 50)}...`);
    
    // Testar com cada secret
    commonSecrets.forEach((secret, secretIndex) => {
        try {
            const decoded = jwt.verify(token, secret);
            console.log(`✅ SECRET ${secretIndex + 1} FUNCIONOU!`);
            console.log(`   Secret: "${secret}"`);
            console.log(`   Payload:`, decoded);
            console.log('');
        } catch (error) {
            // Falha esperada para a maioria
        }
    });
    
    // Verificar se o token está expirado (sem verificar assinatura)
    try {
        const decoded = jwt.decode(token);
        if (decoded) {
            console.log(`📊 Token ${index + 1} decodificado (sem verificar assinatura):`);
            console.log('   Payload:', decoded);
            
            if (decoded.exp) {
                const now = Math.floor(Date.now() / 1000);
                const expired = decoded.exp < now;
                console.log(`   Expiração: ${new Date(decoded.exp * 1000).toISOString()}`);
                console.log(`   Status: ${expired ? '❌ EXPIRADO' : '✅ VÁLIDO'}`);
            }
            console.log('');
        }
    } catch (error) {
        console.log(`❌ Token ${index + 1} malformado: ${error.message}\n`);
    }
});

// 2. Criar um token válido para teste
console.log('🔧 Criando token válido para teste...\n');

const jwtSecret = 'sua-chave-jwt-super-secreta-para-producao-trocar-123456789';

const testUser = {
    id: 'test-admin-id',
    email: 'admin@teste.com',
    role: 'ADMIN',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 horas
};

try {
    const validToken = jwt.sign(testUser, jwtSecret);
    console.log('✅ Token válido criado para teste:');
    console.log('=====================================');
    console.log(validToken);
    console.log('=====================================\n');
    
    console.log('💡 INSTRUÇÕES PARA TESTAR:');
    console.log('1. Abra o DevTools (F12) no navegador');
    console.log('2. Vá para a aba Application > Local Storage');
    console.log('3. Defina a chave "adminToken" com o valor acima');
    console.log('4. Defina a chave "adminUser" com:');
    console.log('   {"id":"test-admin-id","email":"admin@teste.com","role":"ADMIN"}');
    console.log('5. Recarregue a página (F5)');
    console.log('6. Teste o botão de aprovação novamente\n');
    
} catch (error) {
    console.log('❌ Erro ao criar token:', error.message);
}

// 3. Comando curl para testar
console.log('🧪 COMANDO CURL PARA TESTE:');
console.log('===========================');
console.log('curl -X POST "http://localhost:3355/api/admin/denuncias/cmdt4x12e00032w52lzl8jgtp/aprovar-e-postar" \\');
console.log('  -H "Content-Type: application/json" \\');
console.log(`  -H "Authorization: Bearer ${jwt.sign(testUser, jwtSecret)}" \\`);
console.log("  -d '{\"acao\":\"aprovar_e_postar\",\"confirmar_publicacao\":\"CONFIRMO_PUBLICACAO_IMEDIATA\",\"usuario_confirmacao\":\"admin\",\"motivo_urgencia\":\"teste de funcionalidade\"}'");
console.log('');