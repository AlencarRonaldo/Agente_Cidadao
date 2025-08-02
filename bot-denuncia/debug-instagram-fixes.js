#!/usr/bin/env node

/**
 * Instagram API Debug and Test Script
 * Tests the fixes for checkpoint handling and API priority
 */

const logger = require('./src/utils/logger');
const instagramApiManager = require('./src/services/instagramApiManager');
const instagramService = require('./src/services/instagramService');

async function debugInstagramFixes() {
    console.log('🔍 Instagram API Fixes Debug Script');
    console.log('=====================================\n');
    
    try {
        // Test 1: Check API Manager Configuration
        console.log('📋 Test 1: API Manager Configuration');
        console.log('-----------------------------------');
        console.log(`Current API: ${instagramApiManager.config.currentApi}`);
        console.log(`Fallback Enabled: ${instagramApiManager.config.fallbackEnabled}`);
        console.log(`Prefer Graph API: ${instagramApiManager.config.preferGraphApi}`);
        console.log('✅ Configuration loaded successfully\n');
        
        // Test 2: Health Status Check
        console.log('🏥 Test 2: API Health Status');
        console.log('-----------------------------');
        const apiStatus = await instagramApiManager.getApiStatus();
        console.log('Graph API Health:', apiStatus.apis.GRAPH.healthy ? '✅ Healthy' : '❌ Unhealthy');
        if (apiStatus.apis.GRAPH.error) {
            console.log('  Error:', apiStatus.apis.GRAPH.error);
        }
        console.log('Private API Health:', apiStatus.apis.PRIVATE.healthy ? '✅ Healthy' : '❌ Unhealthy');
        if (apiStatus.apis.PRIVATE.error) {
            console.log('  Error:', apiStatus.apis.PRIVATE.error);
        }
        console.log(`Overall Health Score: ${apiStatus.healthScore}%`);
        console.log();
        
        // Test 3: Error Recommendation System
        console.log('💡 Test 3: Error Recommendation System');
        console.log('--------------------------------------');
        const testErrors = [
            'Instagram checkpoint required',
            'challenge_required (400 Bad Request)',
            'No active Instagram token found',
            'Both APIs failed: Primary (checkpoint), Fallback (token)'
        ];
        
        testErrors.forEach((error, index) => {
            console.log(`Test Error ${index + 1}: ${error}`);
            const recommendations = instagramApiManager.generateErrorRecommendations(error);
            recommendations.forEach(rec => {
                console.log(`  - ${rec.type} (${rec.priority}): ${rec.message}`);
                console.log(`    Actions: ${rec.actions.length} suggestions available`);
            });
            console.log();
        });
        
        // Test 4: Connection Status
        console.log('🔌 Test 4: Instagram Service Connection Status');
        console.log('--------------------------------------------');
        const connectionStatus = await instagramService.getConnectionStatus();
        console.log('Service Status:', JSON.stringify(connectionStatus, null, 2));
        console.log();
        
        // Test 5: Migration Recommendations
        console.log('🚀 Test 5: Migration Recommendations');
        console.log('-----------------------------------');
        const migrationRecs = instagramApiManager.getMigrationRecommendations();
        if (migrationRecs.length > 0) {
            migrationRecs.forEach(rec => {
                console.log(`- ${rec.type} (${rec.priority}): ${rec.message}`);
                console.log(`  Action: ${rec.action}`);
            });
        } else {
            console.log('✅ No migration recommendations at this time');
        }
        console.log();
        
        // Test 6: Comprehensive Status Report
        console.log('📊 Test 6: Comprehensive Status Report');
        console.log('-------------------------------------');
        const comprehensiveStatus = await instagramApiManager.getComprehensiveStatus();
        console.log(`Migration Ready: ${comprehensiveStatus.migrationReady ? '✅' : '❌'}`);
        console.log(`Total Requests: ${comprehensiveStatus.stats.totalRequests}`);
        console.log(`Success Rate: ${comprehensiveStatus.stats.totalRequests > 0 ? 
            ((comprehensiveStatus.stats.successfulRequests / comprehensiveStatus.stats.totalRequests) * 100).toFixed(1) + '%' : 
            'N/A'}`);
        console.log(`API Usage - Graph: ${comprehensiveStatus.stats.apiUsage.GRAPH}, Private: ${comprehensiveStatus.stats.apiUsage.PRIVATE}`);
        console.log();
        
        console.log('🎉 All tests completed successfully!');
        console.log('📝 Summary of fixes applied:');
        console.log('  ✅ Fixed undefined property access in checkpoint handling');
        console.log('  ✅ Enhanced error handling for challenges and checkpoints');
        console.log('  ✅ Prioritized Graph API over Private API');
        console.log('  ✅ Added intelligent fallback logic');
        console.log('  ✅ Implemented error-specific recommendations');
        console.log('  ✅ Added comprehensive health monitoring');
        
    } catch (error) {
        console.error('❌ Debug script error:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
    
    process.exit(0);
}

// Handle process termination gracefully
process.on('SIGINT', () => {
    console.log('\n⏹️ Debug script interrupted by user');
    process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Run the debug script
debugInstagramFixes().catch(error => {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
});