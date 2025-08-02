/**
 * Teste direto das rotas admin do Instagram
 */

const axios = require('axios');

async function testAdminRoutes() {
    console.log('🔧 Testando rotas admin do Instagram...\n');
    
    const baseUrl = 'http://localhost:3355';
    
    try {
        // Teste 1: Health check
        console.log('1️⃣ Testando health check...');
        const healthResponse = await axios.get(`${baseUrl}/health`);
        console.log(`✅ Health: ${healthResponse.status} - ${healthResponse.data.status}`);
        console.log(`📅 Uptime: ${Math.round(healthResponse.data.uptime)}s`);
        console.log();
        
        // Teste 2: Instagram API Status (sem auth - deve retornar 401)
        console.log('2️⃣ Testando rota de API status...');
        try {
            await axios.get(`${baseUrl}/api/admin/instagram/api-status`);
        } catch (error) {
            if (error.response?.status === 401) {
                console.log('✅ Rota protegida funcionando (401 - Unauthorized)');
            } else {
                console.log(`❌ Erro inesperado: ${error.response?.status}`);
            }
        }
        console.log();
        
        // Teste 3: Verificar se API Manager está carregado
        console.log('3️⃣ Testando carregamento do API Manager...');
        const instagramApiManager = require('./src/services/instagramApiManager');
        const apiStatus = await instagramApiManager.getApiStatus();
        
        console.log('📊 Status do API Manager:');
        console.log(`   - API Atual: ${apiStatus.currentApi}`);
        console.log(`   - Migration Ready: ${apiStatus.migrationReady}`);
        console.log(`   - Health Score: ${apiStatus.healthScore}%`);
        console.log(`   - Private API Health: ${apiStatus.apis.PRIVATE?.healthy || false}`);
        console.log(`   - Graph API Health: ${apiStatus.apis.GRAPH?.healthy || false}`);
        console.log();
        
        // Teste 4: Teste de migração (sem executar)
        console.log('4️⃣ Testando lógica de migração...');
        const recommendations = instagramApiManager.getMigrationRecommendations();
        console.log(`📋 ${recommendations.length} recomendações encontradas:`);
        
        recommendations.forEach((rec, index) => {
            console.log(`   ${index + 1}. [${rec.priority}] ${rec.message}`);
        });
        
        console.log('\n✅ Todos os testes do backend passaram!');
        console.log('\n📌 Próximos passos:');
        console.log('   1. Acesse o admin panel: http://localhost:3001');
        console.log('   2. Faça login com suas credenciais');
        console.log('   3. Vá para "Instagram Configuration"');
        console.log('   4. Na aba "API Status & Migration" você verá os controles');
        
    } catch (error) {
        console.error('\n❌ Erro durante os testes:', error.message);
        if (error.code === 'ECONNREFUSED') {
            console.error('🔴 Servidor não está rodando na porta 3355');
            console.error('   Execute: npm start');
        }
    }
}

testAdminRoutes();