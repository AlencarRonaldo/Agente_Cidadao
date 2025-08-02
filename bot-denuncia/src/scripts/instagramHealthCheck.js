#!/usr/bin/env node

/**
 * Instagram Health Check CLI Tool
 * Comprehensive system health validation with XState orchestration
 * Usage: node src/scripts/instagramHealthCheck.js [options]
 */

const path = require('path');
const fs = require('fs').promises;

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const logger = require('../utils/logger');
const InstagramTokenValidationOrchestrator = require('../services/instagramTokenValidationOrchestrator');

class InstagramHealthCheckCLI {
    constructor() {
        this.orchestrator = new InstagramTokenValidationOrchestrator();
        this.options = {
            verbose: false,
            outputFile: null,
            format: 'detailed', // detailed, summary, json
            exitOnError: true
        };
    }

    /**
     * Parse command line arguments
     */
    parseArguments() {
        const args = process.argv.slice(2);
        
        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            
            switch (arg) {
                case '--verbose':
                case '-v':
                    this.options.verbose = true;
                    break;
                case '--output':
                case '-o':
                    this.options.outputFile = args[++i];
                    break;
                case '--format':
                case '-f':
                    this.options.format = args[++i];
                    break;
                case '--no-exit':
                    this.options.exitOnError = false;
                    break;
                case '--help':
                case '-h':
                    this.showHelp();
                    process.exit(0);
                    break;
                default:
                    if (arg.startsWith('-')) {
                        console.error(`Unknown option: ${arg}`);
                        this.showHelp();
                        process.exit(1);
                    }
            }
        }
    }

    /**
     * Show help information
     */
    showHelp() {
        console.log(`
Instagram Health Check Tool
===========================

Usage: node src/scripts/instagramHealthCheck.js [options]

Options:
  -v, --verbose          Enable verbose logging
  -o, --output <file>    Save report to file
  -f, --format <format>  Output format (detailed, summary, json)
  --no-exit              Don't exit with error code on failure
  -h, --help             Show this help message

Examples:
  node src/scripts/instagramHealthCheck.js
  node src/scripts/instagramHealthCheck.js --verbose --output health-report.json --format json
  node src/scripts/instagramHealthCheck.js --format summary --no-exit

Description:
  This tool performs comprehensive health checks on the Instagram integration:
  - Environment configuration validation
  - Private API connection testing
  - Graph API token validation
  - API Manager integration testing
  - Fallback mechanism verification
  - Performance metrics measurement
  - Production readiness assessment
        `);
    }

    /**
     * Run the health check
     */
    async run() {
        try {
            this.parseArguments();
            
            console.log('🚀 Instagram Health Check Starting...');
            console.log('=====================================\n');
            
            if (this.options.verbose) {
                console.log('Configuration:');
                console.log(`- Verbose logging: ${this.options.verbose}`);
                console.log(`- Output file: ${this.options.outputFile || 'None'}`);
                console.log(`- Format: ${this.options.format}`);
                console.log(`- Exit on error: ${this.options.exitOnError}\n`);
            }

            // Start validation orchestration with progress tracking
            const startTime = Date.now();
            let lastProgress = 0;
            
            // Setup progress monitoring
            const progressInterval = setInterval(() => {
                const status = this.orchestrator.getCurrentStatus();
                if (status.context && status.context.completedSteps !== lastProgress) {
                    lastProgress = status.context.completedSteps;
                    const progressPercent = Math.round((lastProgress / status.context.totalSteps) * 100);
                    console.log(`📊 Progress: ${progressPercent}% (${lastProgress}/${status.context.totalSteps}) - ${status.context.currentStep}`);
                }
            }, 1000);

            // Run validation
            const report = await this.orchestrator.startValidation({
                verbose: this.options.verbose
            });

            clearInterval(progressInterval);
            
            const duration = Date.now() - startTime;
            
            console.log('\n✅ Instagram Health Check Completed!');
            console.log('====================================\n');
            
            // Display results based on format
            await this.displayResults(report, duration);
            
            // Save to file if requested
            if (this.options.outputFile) {
                await this.saveReport(report);
            }
            
            // Exit with appropriate code
            const exitCode = report.summary.success ? 0 : 1;
            if (this.options.exitOnError) {
                process.exit(exitCode);
            }
            
            return exitCode;
            
        } catch (error) {
            console.error('\n❌ Health Check Failed!');
            console.error('======================');
            console.error('Error:', error.message);
            
            if (this.options.verbose) {
                console.error('\nStack trace:');
                console.error(error.stack);
            }
            
            if (this.options.exitOnError) {
                process.exit(1);
            }
            
            return 1;
        }
    }

    /**
     * Display results based on format
     */
    async displayResults(report, duration) {
        switch (this.options.format) {
            case 'json':
                console.log(JSON.stringify(report, null, 2));
                break;
            case 'summary':
                this.displaySummary(report, duration);
                break;
            case 'detailed':
            default:
                this.displayDetailed(report, duration);
                break;
        }
    }

    /**
     * Display summary format
     */
    displaySummary(report, duration) {
        const { summary, readinessAssessment } = report;
        
        console.log(`📋 Validation Summary`);
        console.log(`Duration: ${Math.round(duration / 1000)}s`);
        console.log(`Success: ${summary.success ? '✅' : '❌'}`);
        console.log(`Completed Steps: ${summary.completedSteps}/${summary.totalSteps}`);
        console.log(`Errors: ${summary.errors}`);
        
        if (readinessAssessment) {
            console.log(`\n🎯 Production Readiness: ${readinessAssessment.readiness.overall}`);
            console.log(`Score: ${Math.round(readinessAssessment.readiness.score)}%`);
            console.log(`Critical Issues: ${readinessAssessment.readiness.criticalIssues.length}`);
        }
        
        if (summary.errors > 0) {
            console.log('\n❌ Errors:');
            report.errors.forEach(error => {
                console.log(`- ${error.step}: ${error.error}`);
            });
        }
    }

    /**
     * Display detailed format
     */
    displayDetailed(report, duration) {
        const { summary, results, readinessAssessment } = report;
        
        console.log(`📋 Detailed Validation Report`);
        console.log(`Validation ID: ${summary.validationId}`);
        console.log(`Duration: ${Math.round(duration / 1000)}s`);
        console.log(`Overall Success: ${summary.success ? '✅' : '❌'}`);
        console.log(`Steps Completed: ${summary.completedSteps}/${summary.totalSteps}`);
        
        console.log('\n🔧 Environment Configuration:');
        if (results.environment) {
            console.log(`- Success: ${results.environment.success ? '✅' : '❌'}`);
            console.log(`- Issues: ${results.environment.issues?.length || 0}`);
            if (results.environment.config) {
                console.log(`- Private API Configured: ${results.environment.config.privateApi.configured ? '✅' : '❌'}`);
                console.log(`- Graph API Token: ${results.environment.config.graphApi.hasAccessToken ? '✅' : '❌'}`);
                console.log(`- Mock Mode: ${results.environment.config.graphApi.mockMode ? '⚠️  Enabled' : '✅ Disabled'}`);
            }
        }
        
        console.log('\n📱 Private API Status:');
        if (results.privateApi) {
            console.log(`- Connection: ${results.privateApi.success ? '✅' : '❌'}`);
            console.log(`- Has Credentials: ${results.privateApi.capabilities?.hasCredentials ? '✅' : '❌'}`);
            console.log(`- Session Available: ${results.privateApi.capabilities?.sessionAvailable ? '✅' : '❌'}`);
        }
        
        console.log('\n🌐 Graph API Status:');
        if (results.graphApi) {
            console.log(`- Connection: ${results.graphApi.success ? '✅' : '❌'}`);
            console.log(`- Has Token: ${results.graphApi.capabilities?.hasToken ? '✅' : '❌'}`);
            console.log(`- Business Account: ${results.graphApi.capabilities?.hasBusinessAccount ? '✅' : '❌'}`);
            console.log(`- Mock Mode: ${results.graphApi.capabilities?.mockMode ? '⚠️  Active' : '✅ Inactive'}`);
        }
        
        console.log('\n🔄 API Manager Integration:');
        if (results.apiManager) {
            console.log(`- Integration: ${results.apiManager.success ? '✅' : '❌'}`);
            console.log(`- Health Score: ${results.apiManager.integration?.healthScore || 0}%`);
            console.log(`- Migration Ready: ${results.apiManager.integration?.migrationReady ? '✅' : '❌'}`);
            console.log(`- Current API: ${results.apiManager.integration?.currentApi || 'Unknown'}`);
            console.log(`- Fallback Enabled: ${results.apiManager.integration?.fallbackEnabled ? '✅' : '❌'}`);
        }
        
        console.log('\n⚡ Performance Metrics:');
        if (results.performance) {
            const metrics = results.performance.metrics;
            console.log(`- Private API: ${metrics.privateApi.available ? '✅' : '❌'} (${metrics.privateApi.responseTime || 'N/A'}ms)`);
            console.log(`- Graph API: ${metrics.graphApi.available ? '✅' : '❌'} (${metrics.graphApi.responseTime || 'N/A'}ms)`);
            console.log(`- API Manager: ${metrics.apiManager.available ? '✅' : '❌'} (${metrics.apiManager.responseTime || 'N/A'}ms)`);
        }
        
        console.log('\n🤖 Humanization Engine:');
        if (results.humanization) {
            const tests = results.humanization.humanizationTests;
            console.log(`- Engine Available: ${tests.engineAvailable ? '✅' : '❌'}`);
            console.log(`- Risk Assessment: ${tests.riskAssessment ? '✅' : '❌'}`);
            console.log(`- Content Variation: ${tests.contentVariation ? '✅' : '❌'}`);
            console.log(`- Hashtag Rotation: ${tests.hashtagRotation ? '✅' : '❌'}`);
            console.log(`- Timing Optimization: ${tests.timingOptimization ? '✅' : '❌'}`);
        }
        
        if (readinessAssessment) {
            console.log('\n🎯 Production Readiness Assessment:');
            const readiness = readinessAssessment.readiness;
            console.log(`- Overall Status: ${this.getReadinessEmoji(readiness.overall)} ${readiness.overall}`);
            console.log(`- Overall Score: ${Math.round(readiness.score)}%`);
            
            console.log('\n📊 Category Scores:');
            Object.entries(readiness.categories).forEach(([category, data]) => {
                const score = Math.round(data.score);
                const emoji = score >= 80 ? '✅' : score >= 60 ? '⚠️' : '❌';
                console.log(`- ${category.charAt(0).toUpperCase() + category.slice(1)}: ${emoji} ${score}%`);
            });
            
            if (readiness.criticalIssues.length > 0) {
                console.log('\n🚨 Critical Issues:');
                readiness.criticalIssues.forEach(issue => {
                    console.log(`- ${issue}`);
                });
            }
            
            if (readiness.nextSteps.length > 0) {
                console.log('\n📝 Next Steps:');
                readiness.nextSteps.forEach((step, index) => {
                    console.log(`${index + 1}. ${step}`);
                });
            }
        }
        
        if (report.errors.length > 0) {
            console.log('\n❌ Errors Encountered:');
            report.errors.forEach(error => {
                console.log(`- ${error.step}: ${error.error} (${error.timestamp})`);
            });
        }
        
        // Show recommendations
        const allRecommendations = this.getAllRecommendations(report);
        if (allRecommendations.length > 0) {
            console.log('\n💡 Recommendations:');
            allRecommendations.forEach((rec, index) => {
                const priorityEmoji = rec.priority === 'CRITICAL' ? '🚨' : rec.priority === 'HIGH' ? '⚠️' : 'ℹ️';
                console.log(`${index + 1}. ${priorityEmoji} [${rec.priority}] ${rec.message}`);
                if (rec.actions && Array.isArray(rec.actions)) {
                    rec.actions.forEach(action => {
                        console.log(`   → ${action}`);
                    });
                } else if (rec.action) {
                    console.log(`   → ${rec.action}`);
                }
            });
        }
    }

    /**
     * Get readiness status emoji
     */
    getReadinessEmoji(status) {
        switch (status) {
            case 'PRODUCTION_READY': return '✅';
            case 'READY_WITH_WARNINGS': return '⚠️';
            case 'NEEDS_CONFIGURATION': return '🔧';
            case 'NOT_READY': return '❌';
            default: return '❓';
        }
    }

    /**
     * Get all recommendations from the report
     */
    getAllRecommendations(report) {
        const recommendations = [];
        
        // Collect recommendations from all result steps
        Object.values(report.results).forEach(result => {
            if (result?.recommendations) {
                recommendations.push(...result.recommendations);
            }
        });
        
        // Add readiness recommendations
        if (report.readinessAssessment?.readiness?.recommendations) {
            recommendations.push(...report.readinessAssessment.readiness.recommendations);
        }
        
        // Sort by priority and remove duplicates
        const priorityOrder = { 'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3, 'INFO': 4 };
        return recommendations
            .filter((rec, index, arr) => arr.findIndex(r => r.message === rec.message) === index)
            .sort((a, b) => (priorityOrder[a.priority] || 5) - (priorityOrder[b.priority] || 5));
    }

    /**
     * Save report to file
     */
    async saveReport(report) {
        try {
            const content = this.options.format === 'json' 
                ? JSON.stringify(report, null, 2)
                : this.formatReportForFile(report);
                
            await fs.writeFile(this.options.outputFile, content, 'utf8');
            console.log(`\n💾 Report saved to: ${this.options.outputFile}`);
        } catch (error) {
            console.error(`\n❌ Failed to save report: ${error.message}`);
        }
    }

    /**
     * Format report for file output
     */
    formatReportForFile(report) {
        const lines = [];
        lines.push('Instagram Health Check Report');
        lines.push('============================');
        lines.push('');
        lines.push(`Generated: ${new Date().toISOString()}`);
        lines.push(`Validation ID: ${report.summary.validationId}`);
        lines.push(`Duration: ${Math.round((new Date(report.summary.endTime) - new Date(report.summary.startTime)) / 1000)}s`);
        lines.push(`Success: ${report.summary.success ? 'YES' : 'NO'}`);
        lines.push(`Steps: ${report.summary.completedSteps}/${report.summary.totalSteps}`);
        lines.push(`Errors: ${report.summary.errors}`);
        lines.push('');
        
        if (report.readinessAssessment) {
            const readiness = report.readinessAssessment.readiness;
            lines.push('Production Readiness');
            lines.push('-------------------');
            lines.push(`Status: ${readiness.overall}`);
            lines.push(`Score: ${Math.round(readiness.score)}%`);
            lines.push('');
            
            lines.push('Category Scores:');
            Object.entries(readiness.categories).forEach(([category, data]) => {
                lines.push(`- ${category}: ${Math.round(data.score)}%`);
            });
            lines.push('');
            
            if (readiness.criticalIssues.length > 0) {
                lines.push('Critical Issues:');
                readiness.criticalIssues.forEach(issue => {
                    lines.push(`- ${issue}`);
                });
                lines.push('');
            }
        }
        
        if (report.errors.length > 0) {
            lines.push('Errors:');
            report.errors.forEach(error => {
                lines.push(`- ${error.step}: ${error.error}`);
            });
            lines.push('');
        }
        
        const recommendations = this.getAllRecommendations(report);
        if (recommendations.length > 0) {
            lines.push('Recommendations:');
            recommendations.forEach((rec, index) => {
                lines.push(`${index + 1}. [${rec.priority}] ${rec.message}`);
                if (rec.actions && Array.isArray(rec.actions)) {
                    rec.actions.forEach(action => {
                        lines.push(`   - ${action}`);
                    });
                } else if (rec.action) {
                    lines.push(`   - ${rec.action}`);
                }
            });
        }
        
        return lines.join('\n');
    }
}

// Run CLI if called directly
if (require.main === module) {
    const cli = new InstagramHealthCheckCLI();
    cli.run().catch(error => {
        console.error('Unexpected error:', error);
        process.exit(1);
    });
}

module.exports = InstagramHealthCheckCLI;