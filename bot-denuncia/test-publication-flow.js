/**
 * Test Complete Publication Flow with Graph API as Primary
 */

require('dotenv').config();
const logger = require('./src/utils/logger');
const instagramApiManager = require('./src/services/instagramApiManager');

async function testPublicationFlow() {
    try {
        console.log('🧪 Testing Complete Publication Flow with Graph API as Primary\n');
        
        // Test data for publication
        const testDenunciaData = {
            protocolo: `TEST-FLOW-${Date.now()}`,
            texto: `🚨 TESTE DE MIGRAÇÃO PARA GRAPH API
            
Esta é uma publicação de teste para verificar o funcionamento completo do sistema com Instagram Graph API como API principal.

📝 Funcionalidades testadas:
- Configuração Graph API ✅
- Sistema de fallback ✅
- Processamento de imagem ✅
- Geração de hashtags ✅

📍 Local: Sistema de Testes
🏢 Responsáveis: @testvereador1 @testvereador2

#DenunciaCidada #SaoBernardodoCampo #TransparenciaPublica #TesteGraphAPI`,
            
            imagePath: 'https://via.placeholder.com/600x600.png?text=TESTE+GRAPH+API+MIGRATION',
            imagem: 'https://via.placeholder.com/600x600.png?text=TESTE+GRAPH+API+MIGRATION',
            endereco: 'Rua de Teste, 123',
            bairro: 'Centro',
            vereadores: [
                { nome: 'Vereador Teste 1', instagram: '@testvereador1' },
                { nome: 'Vereador Teste 2', instagram: '@testvereador2' }
            ]
        };
        
        console.log('📋 Test Data:');
        console.log(`   Protocol: ${testDenunciaData.protocolo}`);
        console.log(`   Location: ${testDenunciaData.endereco}, ${testDenunciaData.bairro}`);
        console.log(`   Vereadores: ${testDenunciaData.vereadores.length}`);
        console.log(`   Has Image: ${!!testDenunciaData.imagePath}`);
        console.log('');
        
        // Step 1: Check API Manager Status
        console.log('1. 📊 Checking API Manager Status...');
        const apiStatus = await instagramApiManager.getApiStatus();
        console.log(`   Primary API: ${apiStatus.currentApi}`);
        console.log(`   Graph API Health: ${apiStatus.apis.GRAPH.healthy ? '✅ Healthy' : '❌ Unhealthy'}`);
        console.log(`   Private API Health: ${apiStatus.apis.PRIVATE.healthy ? '✅ Healthy' : '❌ Unhealthy'}`);
        console.log(`   Fallback Enabled: ${apiStatus.config.fallbackEnabled ? '✅ Yes' : '❌ No'}`);
        console.log('');
        
        // Step 2: Test Publication Flow
        console.log('2. 🚀 Testing Publication Flow...');
        console.log('   Attempting publication with Graph API as primary...');
        
        const startTime = Date.now();
        const publicationResult = await instagramApiManager.publicar(testDenunciaData, {
            testMode: true,
            skipActualPosting: false // Set to true to avoid actual posting
        });
        const duration = Date.now() - startTime;
        
        console.log(`   Duration: ${duration}ms`);
        console.log(`   Success: ${publicationResult.success ? '✅ Yes' : '❌ No'}`);
        console.log(`   API Used: ${publicationResult.apiUsed || 'Unknown'}`);
        
        if (publicationResult.success) {
            console.log(`   Post ID: ${publicationResult.data?.postId || 'N/A'}`);
            console.log(`   Post URL: ${publicationResult.data?.permalink || publicationResult.data?.postUrl || 'N/A'}`);
            console.log(`   Message: ${publicationResult.message}`);
        } else {
            console.log(`   Error: ${publicationResult.error}`);
        }
        console.log('');
        
        // Step 3: Analyze Results
        console.log('3. 📈 Flow Analysis:');
        
        if (publicationResult.success) {
            if (publicationResult.apiUsed === 'GRAPH') {
                console.log('   ✅ PERFECT: Graph API worked as primary');
            } else if (publicationResult.apiUsed === 'PRIVATE') {
                console.log('   ⚠️  FALLBACK: Private API used (Graph API failed)');
                console.log('   → This indicates Graph API token needs attention');
            }
        } else {
            console.log('   ❌ FAILED: Both APIs failed');
            console.log('   → Check configuration and credentials');
        }
        
        // Step 4: Get Updated Statistics
        console.log('');
        console.log('4. 📊 Updated Statistics:');
        const updatedStatus = await instagramApiManager.getApiStatus();
        console.log(`   Total Requests: ${updatedStatus.stats.totalRequests}`);
        console.log(`   Successful: ${updatedStatus.stats.successfulRequests}`);
        console.log(`   Failed: ${updatedStatus.stats.failedRequests}`);
        console.log(`   Graph API Usage: ${updatedStatus.stats.apiUsage.GRAPH}`);
        console.log(`   Private API Usage: ${updatedStatus.stats.apiUsage.PRIVATE}`);
        
        const successRate = updatedStatus.stats.totalRequests > 0 
            ? (updatedStatus.stats.successfulRequests / updatedStatus.stats.totalRequests * 100).toFixed(1)
            : 0;
        console.log(`   Success Rate: ${successRate}%`);
        
        // Step 5: Migration Assessment
        console.log('');
        console.log('5. 🎯 Migration Assessment:');
        
        const migrationSuccess = (
            apiStatus.currentApi === 'GRAPH' &&
            publicationResult.success &&
            successRate >= 100
        );
        
        console.log(`   Primary API Configuration: ${apiStatus.currentApi === 'GRAPH' ? '✅ Graph API' : '❌ Not Graph API'}`);
        console.log(`   Publication Success: ${publicationResult.success ? '✅ Success' : '❌ Failed'}`);
        console.log(`   System Reliability: ${successRate >= 100 ? '✅ 100%' : `⚠️ ${successRate}%`}`);
        
        console.log(`\n🏁 MIGRATION STATUS: ${migrationSuccess ? '✅ SUCCESSFUL' : '⚠️ NEEDS ATTENTION'}`);
        
        if (!migrationSuccess) {
            console.log('\n📋 Recommended Actions:');
            if (apiStatus.currentApi !== 'GRAPH') {
                console.log('   • Verify INSTAGRAM_PRIMARY_API=GRAPH in .env');
            }
            if (!publicationResult.success) {
                console.log('   • Check API credentials and tokens');
                console.log('   • Review INSTAGRAM_GRAPH_API_TOKEN_GUIDE.md');
            }
            if (publicationResult.apiUsed === 'PRIVATE') {
                console.log('   • Renew Instagram Graph API access token');
                console.log('   • Follow token renewal guide');
            }
        } else {
            console.log('\n🎉 System successfully migrated to Graph API as primary!');
            console.log('   • Publications will use Graph API by default');
            console.log('   • Private API available as fallback');
            console.log('   • Monitor token expiration (60 days)');
        }
        
        return migrationSuccess;
        
    } catch (error) {
        console.error('❌ Publication flow test failed:', error.message);
        console.error('Stack:', error.stack);
        return false;
    }
}

// Run the test
testPublicationFlow()
    .then(success => {
        console.log(`\n${success ? '✅' : '❌'} Publication Flow Test ${success ? 'PASSED' : 'FAILED'}`);
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('❌ Test execution failed:', error);
        process.exit(1);
    });