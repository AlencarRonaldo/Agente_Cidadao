#!/usr/bin/env node

/**
 * Instagram Validation Runner
 * Quick script to run comprehensive Instagram system validation
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const InstagramHealthCheckCLI = require('./instagramHealthCheck');

async function main() {
    console.log(`
🚀 Instagram Token Validation & System Health Check
===================================================

This tool will perform a comprehensive validation of your Instagram integration:

✅ Environment Configuration Check
✅ Private API Connection Testing  
✅ Graph API Token Validation
✅ Permission & Scope Verification
✅ API Manager Integration Testing
✅ Intelligent Fallback Mechanisms
✅ End-to-End Posting Pipeline (Dry Run)
✅ Humanization Engine Testing
✅ Performance Metrics Collection
✅ Production Readiness Assessment

Starting validation process...
`);

    const cli = new InstagramHealthCheckCLI();
    
    // Set default options for the runner
    cli.options = {
        verbose: true,
        format: 'detailed',
        exitOnError: false,
        outputFile: null
    };

    try {
        const exitCode = await cli.run();
        
        console.log('\n📋 Summary:');
        console.log('===========');
        
        if (exitCode === 0) {
            console.log('✅ Validation completed successfully!');
            console.log('🎯 Your Instagram integration is ready for use.');
        } else {
            console.log('⚠️  Validation completed with issues.');
            console.log('🔧 Please review the recommendations above and fix the identified issues.');
        }
        
        console.log('\n💡 Next Steps:');
        console.log('- If you see token issues, run the OAuth flow to get new tokens');
        console.log('- If Private API has checkpoint issues, complete verification via Instagram app');
        console.log('- Monitor the system regularly using this health check tool');
        console.log('- Consider using Graph API as primary for better reliability');
        
        return exitCode;
        
    } catch (error) {
        console.error('\n❌ Validation failed with error:', error.message);
        return 1;
    }
}

// Run if called directly
if (require.main === module) {
    main().then(exitCode => {
        process.exit(exitCode);
    }).catch(error => {
        console.error('Unexpected error:', error);
        process.exit(1);
    });
}

module.exports = main;