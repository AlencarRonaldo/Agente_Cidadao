require('dotenv').config();
const instagramService = require('./src/services/instagramService');
const logger = require('./src/utils/logger');

async function testInstagramConnection() {
  try {
    console.log('🔍 TESTE: Verificando conexão com Instagram...\n');
    
    console.log('1. Configurações:');
    console.log('   - Username:', process.env.INSTAGRAM_USERNAME || 'NÃO CONFIGURADO');
    console.log('   - Password:', process.env.INSTAGRAM_PASSWORD ? '***CONFIGURADO***' : 'NÃO CONFIGURADO');
    console.log('');
    
    console.log('2. Testando inicialização...');
    const initResult = await instagramService.initialize();
    console.log('   - Resultado:', initResult ? '✅ Sucesso' : '❌ Falha');
    console.log('');
    
    console.log('3. Testando conexão...');
    const testResult = await instagramService.testConnection();
    console.log('   - Resultado:');
    console.log('     - Success:', testResult.success ? '✅' : '❌');
    console.log('     - Message:', testResult.message);
    if (testResult.accountInfo) {
      console.log('     - Account Info:', testResult.accountInfo);
    }
    if (testResult.details) {
      console.log('     - Details:', testResult.details);
    }
    
  } catch (error) {
    console.error('❌ Erro durante teste:', error.message);
    console.error('Stack:', error.stack);
  }
}

testInstagramConnection();