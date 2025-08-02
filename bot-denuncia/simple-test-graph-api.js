/**
 * Simple Graph API Test
 */

console.log('🔍 Testing Graph API Configuration...\n');

// Test environment variables
console.log('Environment Variables:');
console.log('INSTAGRAM_PRIMARY_API:', process.env.INSTAGRAM_PRIMARY_API);
console.log('INSTAGRAM_APP_ID:', process.env.INSTAGRAM_APP_ID ? 'Set' : 'Not Set');
console.log('INSTAGRAM_APP_SECRET:', process.env.INSTAGRAM_APP_SECRET ? 'Set' : 'Not Set');
console.log('GRAPH_API_VERSION:', process.env.GRAPH_API_VERSION);
console.log('INSTAGRAM_GRAPH_MOCK_MODE:', process.env.INSTAGRAM_GRAPH_MOCK_MODE);
console.log('');

// Test required modules
try {
    console.log('Testing module loading...');
    const logger = require('./src/utils/logger');
    console.log('✅ Logger loaded');
    
    const graphApiService = require('./src/services/instagramGraphApiService');
    console.log('✅ Graph API Service loaded');
    
    console.log('\n🎯 Basic configuration check passed!');
    console.log('Primary API is now set to:', process.env.INSTAGRAM_PRIMARY_API);
    
    if (process.env.INSTAGRAM_PRIMARY_API === 'GRAPH') {
        console.log('✅ Migration to Graph API as primary: SUCCESSFUL');
    } else {
        console.log('❌ Migration to Graph API as primary: FAILED');
    }
    
} catch (error) {
    console.error('❌ Module loading failed:', error.message);
}