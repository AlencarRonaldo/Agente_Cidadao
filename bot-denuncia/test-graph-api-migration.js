/**
 * Test Graph API Migration and Connectivity
 * Tests the new Graph API as primary API configuration
 */

const logger = require('./src/utils/logger');
const instagramApiManager = require('./src/services/instagramApiManager');
const instagramGraphApiService = require('./src/services/instagramGraphApiService');

async function testGraphApiMigration() {
    try {
        console.log('🔍 Testing Instagram Graph API Migration...\n');
        
        // Test 1: Check environment variables
        console.log('1. Environment Variables Check:');
        const requiredVars = [
            'INSTAGRAM_APP_ID', 
            'INSTAGRAM_APP_SECRET', 
            'INSTAGRAM_BUSINESS_ACCOUNT_ID',
            'GRAPH_API_VERSION',
            'INSTAGRAM_PRIMARY_API'
        ];
        
        const missingVars = requiredVars.filter(varName => !process.env[varName]);
        if (missingVars.length > 0) {
            console.log(`❌ Missing required variables: ${missingVars.join(', ')}`);
        } else {
            console.log('✅ All required environment variables present');
        }
        
        console.log(`   Primary API: ${process.env.INSTAGRAM_PRIMARY_API}`);
        console.log(`   Graph API Version: ${process.env.GRAPH_API_VERSION}`);
        console.log(`   Mock Mode: ${process.env.INSTAGRAM_GRAPH_MOCK_MODE}`);
        console.log('');
        
        // Test 2: Test Graph API Service Health
        console.log('2. Graph API Service Health Check:');
        const healthStatus = await instagramGraphApiService.getHealthStatus();
        console.log(`   Status: ${healthStatus.status}`);
        console.log(`   Token Health: ${healthStatus.token?.healthy ? '✅ Healthy' : '❌ Unhealthy'}`);
        if (healthStatus.token?.error) {
            console.log(`   Token Error: ${healthStatus.token.error}`);
        }
        console.log('');
        
        // Test 3: Test API Manager Configuration
        console.log('3. API Manager Configuration:');
        const apiStatus = await instagramApiManager.getApiStatus();
        console.log(`   Current Primary API: ${apiStatus.currentApi}`);
        console.log(`   Fallback Enabled: ${apiStatus.config.fallbackEnabled}`);
        console.log(`   Migration Ready: ${apiStatus.migrationReady ? '✅ Yes' : '❌ No'}`);
        console.log(`   Health Score: ${apiStatus.healthScore}/100`);
        console.log('');
        
        // Test 4: API Health Status
        console.log('4. Individual API Health:');
        console.log(`   Private API: ${apiStatus.apis.PRIVATE.healthy ? '✅ Healthy' : '❌ Unhealthy'}`);
        if (apiStatus.apis.PRIVATE.error) {
            console.log(`     Error: ${apiStatus.apis.PRIVATE.error}`);
        }
        
        console.log(`   Graph API: ${apiStatus.apis.GRAPH.healthy ? '✅ Healthy' : '❌ Unhealthy'}`);
        if (apiStatus.apis.GRAPH.error) {
            console.log(`     Error: ${apiStatus.apis.GRAPH.error}`);
        }
        console.log('');
        
        // Test 5: Get Migration Recommendations
        console.log('5. Migration Recommendations:');
        const recommendations = instagramApiManager.getMigrationRecommendations();
        if (recommendations.length === 0) {
            console.log('   ✅ No recommendations - system optimally configured');
        } else {
            recommendations.forEach((rec, index) => {
                console.log(`   ${index + 1}. [${rec.priority}] ${rec.message}`);
                console.log(`      Action: ${rec.action}`);
            });
        }
        console.log('');
        
        // Test 6: Test Mock Publication (if in mock mode)
        if (process.env.INSTAGRAM_GRAPH_MOCK_MODE === 'false') {
            console.log('6. Testing Graph API Connection (Real):');
            const connectionTest = await instagramGraphApiService.testConnection();
            console.log(`   Connection: ${connectionTest.success ? '✅ Success' : '❌ Failed'}`);
            if (connectionTest.error) {
                console.log(`   Error: ${connectionTest.error}`);
            }
            if (connectionTest.accountInfo) {
                console.log(`   Account: ${connectionTest.accountInfo.username} (${connectionTest.accountInfo.accountType})`);
            }
        } else {
            console.log('6. Testing Mock Publication:');
            const mockData = {
                texto: 'Teste de migração para Graph API - Sistema funcionando corretamente',
                imagem: 'https://via.placeholder.com/400x400.png?text=Teste+Graph+API',
                vereadores: ['@testvereador'],
                bairro: 'Centro'
            };
            
            const mockResult = await instagramGraphApiService.publicar(mockData);
            console.log(`   Mock Publication: ${mockResult.success ? '✅ Success' : '❌ Failed'}`);
            if (mockResult.postId) {
                console.log(`   Mock Post ID: ${mockResult.postId}`);
            }
            if (mockResult.error) {
                console.log(`   Error: ${mockResult.error}`);
            }
        }
        console.log('');
        
        // Test 7: Overall Migration Status
        console.log('7. Migration Status Summary:');
        const isConfigured = process.env.INSTAGRAM_PRIMARY_API === 'GRAPH';
        const hasValidConfig = !missingVars.length;
        const isHealthy = healthStatus.status === 'healthy' || process.env.INSTAGRAM_GRAPH_MOCK_MODE !== 'false';
        
        console.log(`   Configuration: ${isConfigured ? '✅ Graph API set as primary' : '❌ Still using Private API'}`);
        console.log(`   Environment: ${hasValidConfig ? '✅ Properly configured' : '❌ Missing variables'}`);
        console.log(`   Service Health: ${isHealthy ? '✅ Healthy' : '❌ Needs attention'}`);
        
        const migrationSuccess = isConfigured && hasValidConfig && isHealthy;
        console.log(`\n🎯 Migration Status: ${migrationSuccess ? '✅ SUCCESSFUL' : '❌ NEEDS ATTENTION'}`);
        
        if (!migrationSuccess) {
            console.log('\n📋 Next Steps Required:');
            if (!isConfigured) {
                console.log('   • Set INSTAGRAM_PRIMARY_API=GRAPH in .env file');
            }
            if (!hasValidConfig) {
                console.log('   • Configure missing environment variables');
            }
            if (!isHealthy && process.env.INSTAGRAM_GRAPH_MOCK_MODE === 'false') {
                console.log('   • Obtain valid Instagram Graph API access token');
                console.log('   • Follow token renewal documentation');
            }
        }
        
        return migrationSuccess;
        
    } catch (error) {
        console.error('❌ Migration test failed:', error.message);
        console.error('Stack:', error.stack);
        return false;
    }
}

// Run the test
testGraphApiMigration()
    .then(success => {
        console.log(`\n${success ? '✅' : '❌'} Graph API Migration Test ${success ? 'PASSED' : 'FAILED'}`);
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('❌ Test execution failed:', error);
        process.exit(1);
    });