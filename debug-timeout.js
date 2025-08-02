const { CONFIG } = require('./bot-denuncia/src/config/constants');

console.log('🔍 Debug de Timeout e Configurações:');
console.log('=====================================');

console.log('CONFIG completo:', JSON.stringify(CONFIG, null, 2));

if (CONFIG.TIMEOUT_CONVERSA) {
    console.log(`✅ TIMEOUT_CONVERSA encontrado: ${CONFIG.TIMEOUT_CONVERSA}ms`);
    console.log(`⏱️ Equivale a: ${CONFIG.TIMEOUT_CONVERSA/1000/60} minutos`);
} else {
    console.log('❌ TIMEOUT_CONVERSA não encontrado!');
}

if (CONFIG.MESSAGES) {
    console.log('✅ MESSAGES encontradas');
    console.log('📝 BEM_VINDO:', CONFIG.MESSAGES.BEM_VINDO.substring(0, 50) + '...');
} else {
    console.log('❌ MESSAGES não encontradas!');
}

if (CONFIG.ESTADOS_CONVERSA) {
    console.log('✅ ESTADOS_CONVERSA encontrados');
    console.log('🔄 Estados disponíveis:', Object.keys(CONFIG.ESTADOS_CONVERSA));
} else {
    console.log('❌ ESTADOS_CONVERSA não encontrados!');
}

if (CONFIG.QUICK_REPLIES) {
    console.log('✅ QUICK_REPLIES encontrados');
    console.log('📱 Menu principal:', CONFIG.QUICK_REPLIES.MENU_PRINCIPAL);
} else {
    console.log('❌ QUICK_REPLIES não encontrados!');
}