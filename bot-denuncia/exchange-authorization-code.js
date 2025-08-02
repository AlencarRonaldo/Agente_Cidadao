/**
 * TROCAR CÓDIGO DE AUTORIZAÇÃO POR TOKEN
 * 
 * Execute: node exchange-authorization-code.js CODIGO_DE_AUTORIZACAO_AQUI
 */

require('dotenv').config();
const InstagramTokenGenerator2025 = require('./generate-instagram-token-2025');

async function exchangeCodeForToken() {
    const authCode = process.argv[2];
    
    if (!authCode) {
        console.log('❌ ERRO: Código de autorização não fornecido');
        console.log('');
        console.log('📋 USO CORRETO:');
        console.log('   node exchange-authorization-code.js CODIGO_DE_AUTORIZACAO');
        console.log('');
        console.log('💡 COMO OBTER O CÓDIGO:');
        console.log('   1. Execute: node generate-instagram-token-2025.js');
        console.log('   2. Acesse a URL gerada no navegador');
        console.log('   3. Complete a autorização');
        console.log('   4. Copie o código da URL de retorno');
        console.log('   5. Execute este script com o código');
        return;
    }
    
    console.log('🔄 TROCANDO CÓDIGO POR TOKEN...');
    console.log('===============================\n');
    
    const generator = new InstagramTokenGenerator2025();
    
    try {
        // Trocar código por token
        const tokenResult = await generator.exchangeCodeForToken(authCode);
        
        if (tokenResult.success) {
            // Validar token e permissões
            await generator.validateToken(tokenResult.token);
        } else {
            console.log('\n❌ FALHA na obtenção do token');
            console.log('   Verifique se o código de autorização está correto');
            console.log('   Códigos expiram rapidamente - gere um novo se necessário');
        }
        
    } catch (error) {
        console.error('\n❌ ERRO no processo:', error.message);
        console.log('\n💡 SOLUÇÃO:');
        console.log('   1. Verifique se o código está correto');
        console.log('   2. Gere um novo código se este expirou');
        console.log('   3. Execute: node generate-instagram-token-2025.js');
    }
}

// Executar
exchangeCodeForToken().catch(console.error);