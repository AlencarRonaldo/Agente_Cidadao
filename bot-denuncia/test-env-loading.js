/**
 * Test environment loading and Graph API configuration
 */

// Load environment variables explicitly
require('dotenv').config();

console.log('🔍 Testing Environment Loading and Graph API Configuration...\n');

// Test environment variables
console.log('Environment Variables:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('INSTAGRAM_PRIMARY_API:', process.env.INSTAGRAM_PRIMARY_API);
console.log('INSTAGRAM_APP_ID:', process.env.INSTAGRAM_APP_ID ? 'Set (' + process.env.INSTAGRAM_APP_ID + ')' : 'Not Set');
console.log('INSTAGRAM_APP_SECRET:', process.env.INSTAGRAM_APP_SECRET ? 'Set' : 'Not Set');
console.log('GRAPH_API_VERSION:', process.env.GRAPH_API_VERSION);
console.log('INSTAGRAM_GRAPH_MOCK_MODE:', process.env.INSTAGRAM_GRAPH_MOCK_MODE);
console.log('INSTAGRAM_REDIRECT_URI:', process.env.INSTAGRAM_REDIRECT_URI);
console.log('');

// Test required modules
try {
    console.log('Testing module loading...');
    const logger = require('./src/utils/logger');
    console.log('✅ Logger loaded');
    
    const graphApiConfig = require('./src/config/graphApiConfig');
    console.log('✅ Graph API Config loaded');
    
    const graphApiService = require('./src/services/instagramGraphApiService');
    console.log('✅ Graph API Service loaded');
    
    const instagramApiManager = require('./src/services/instagramApiManager');
    console.log('✅ Instagram API Manager loaded');
    
    console.log('\n🎯 Configuration Status:');
    console.log('Primary API:', process.env.INSTAGRAM_PRIMARY_API);
    console.log('Mock Mode:', process.env.INSTAGRAM_GRAPH_MOCK_MODE);
    
    if (process.env.INSTAGRAM_PRIMARY_API === 'GRAPH') {
        console.log('✅ Migration to Graph API as primary: SUCCESSFUL');
    } else {
        console.log('❌ Migration to Graph API as primary: FAILED');
        console.log('   Expected: GRAPH, Got:', process.env.INSTAGRAM_PRIMARY_API);
    }
    
    // Test API Manager status
    console.log('\n📊 Testing API Manager Status...');
    instagramApiManager.getApiStatus()
        .then(status => {
            console.log('Current API:', status.currentApi);
            console.log('Fallback Enabled:', status.config.fallbackEnabled);
            console.log('Graph API Health:', status.apis.GRAPH.healthy ? '✅ Healthy' : '❌ Unhealthy');
            if (status.apis.GRAPH.error) {
                console.log('Graph API Error:', status.apis.GRAPH.error);
            }
            console.log('Private API Health:', status.apis.PRIVATE.healthy ? '✅ Healthy' : '❌ Unhealthy');
            if (status.apis.PRIVATE.error) {
                console.log('Private API Error:', status.apis.PRIVATE.error);
            }
            
            console.log('\n🏁 Test completed successfully!');
        })
        .catch(error => {
            console.error('❌ API Manager status check failed:', error.message);
        });
    
} catch (error) {
    console.error('❌ Module loading failed:', error.message);
    console.error('Stack:', error.stack);
}