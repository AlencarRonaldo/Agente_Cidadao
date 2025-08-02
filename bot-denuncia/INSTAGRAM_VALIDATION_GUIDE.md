# Instagram Token Validation & System Health Check Guide

## Overview

This comprehensive validation system uses XState for reliable workflow orchestration to validate Instagram tokens, test system integrations, and assess production readiness. It provides zero message loss guarantees through intelligent error recovery and detailed health monitoring.

## Quick Start

### Run Complete Validation
```bash
npm run instagram:validate
```

This runs the full validation suite with detailed output and recommendations.

### Health Check Options
```bash
# Basic health check
npm run instagram:health

# Verbose output
npm run instagram:health -- --verbose

# Generate JSON report
npm run instagram:report

# Save detailed report to file
npm run instagram:health -- --format detailed --output health-report.txt

# Summary format only
npm run instagram:health -- --format summary
```

### Run Integration Tests
```bash
npm run instagram:test
```

## Validation Components

### 1. State Machine Orchestration

The system uses XState to manage a 12-step validation workflow:

1. **Initialization** - Setup validation environment
2. **Environment Validation** - Check .env configuration
3. **Private API Validation** - Test Instagram Private API connection
4. **Graph API Validation** - Test Instagram Graph API tokens
5. **Token Expiration Check** - Verify token validity and expiration
6. **Permission Validation** - Check API permissions and scopes
7. **API Manager Integration** - Test dual API system
8. **Fallback Mechanisms** - Verify intelligent fallback
9. **Posting Pipeline** - End-to-end pipeline test (dry run)
10. **Humanization Engine** - Test behavior simulation
11. **Performance Metrics** - Measure API response times
12. **Readiness Assessment** - Generate production readiness report

### 2. Error Recovery System

- **Automatic Retry Logic** - Intelligent retry with exponential backoff
- **Context Preservation** - Maintains state across recovery attempts
- **Graceful Degradation** - Continues validation even with partial failures
- **Actionable Recommendations** - Provides specific fix instructions

### 3. Zero Message Loss Architecture

- **State Machine Guarantees** - Atomic state transitions prevent data loss
- **Error Boundaries** - Isolated failure handling per validation step
- **Rollback Mechanisms** - Safe recovery from failed states
- **Comprehensive Logging** - Full audit trail for debugging

## Current System Status

Based on the analysis of your current Instagram integration:

### ✅ **Working Components**
- Instagram API Manager with dual API support
- Private API service with humanization engine
- Graph API service with mock mode capability
- Intelligent fallback mechanisms
- Comprehensive error handling

### ⚠️ **Known Issues**
- **Graph API Token**: Marked as `NEED_VALID_USER_TOKEN_NOT_BUSINESS_ID`
- **Mock Mode Active**: Graph API running in development mock mode
- **Token Invalidation**: Current tokens need refresh via OAuth

### 🔧 **Required Actions**
1. Complete OAuth flow for Graph API tokens
2. Update `INSTAGRAM_GRAPH_ACCESS_TOKEN` in .env
3. Disable mock mode for production (`INSTAGRAM_GRAPH_MOCK_MODE=false`)
4. Verify Instagram Business Account connection

## Validation Results Interpretation

### Production Readiness Scores

- **85-100%**: ✅ **PRODUCTION_READY** - System ready for live use
- **70-84%**: ⚠️ **READY_WITH_WARNINGS** - Minor issues to address
- **50-69%**: 🔧 **NEEDS_CONFIGURATION** - Configuration required
- **0-49%**: ❌ **NOT_READY** - Critical issues must be resolved

### Category Scoring (Weighted)

- **Configuration (25%)** - Environment variables and setup
- **Authentication (30%)** - API credentials and tokens
- **Connectivity (20%)** - Network and API connections
- **Reliability (15%)** - Fallback and error handling
- **Performance (10%)** - Response times and efficiency

## Common Issues & Solutions

### 1. Graph API Token Issues

**Problem**: `INSTAGRAM_GRAPH_ACCESS_TOKEN` marked as invalid

**Solution**:
```bash
# Check current token status
npm run instagram:health -- --verbose

# The validation will show specific token issues
# Follow OAuth flow to get new token
# Update .env with new token
# Re-run validation
npm run instagram:validate
```

### 2. Private API Checkpoint Required

**Problem**: Instagram requires checkpoint verification

**Solution**:
1. Log into Instagram app/website manually
2. Complete any security challenges
3. Restart the service
4. Consider migrating to Graph API for reliability

### 3. Mock Mode in Production

**Problem**: Graph API running in mock mode

**Solution**:
```bash
# Update .env file
INSTAGRAM_GRAPH_MOCK_MODE=false

# Re-run validation
npm run instagram:validate
```

### 4. No APIs Available  

**Problem**: Both Private and Graph APIs are down

**Solution**:
1. Fix Graph API token configuration first (most reliable)
2. Resolve Private API authentication issues
3. Ensure network connectivity
4. Check Instagram service status

## Advanced Usage

### Custom Validation

```javascript
const InstagramTokenValidationOrchestrator = require('./src/services/instagramTokenValidationOrchestrator');

const orchestrator = new InstagramTokenValidationOrchestrator();

// Run specific validation steps
const envResult = await orchestrator.validateEnvironmentConfiguration();
const apiResult = await orchestrator.testApiManagerIntegration();

// Run full validation with custom options
const report = await orchestrator.startValidation({
    verbose: true
});

console.log('Readiness:', report.readinessAssessment.readiness.overall);
```

### Monitoring Integration

```javascript
// Monitor validation progress
const orchestrator = new InstagramTokenValidationOrchestrator();
const validationPromise = orchestrator.startValidation();

setInterval(() => {
    const status = orchestrator.getCurrentStatus();
    console.log(`Progress: ${status.context.completedSteps}/${status.context.totalSteps}`);
    console.log(`Current: ${status.context.currentStep}`);
}, 1000);

const report = await validationPromise;
```

### CI/CD Integration

```yaml
# GitHub Actions example
- name: Validate Instagram Integration
  run: |
    npm run instagram:health -- --format json --output instagram-health.json
    # Parse JSON report for CI decisions
    # Fail build if critical issues found
```

## API Reference

### InstagramTokenValidationOrchestrator

Main orchestration class with XState machine.

#### Methods

- `startValidation(options)` - Run complete validation
- `getCurrentStatus()` - Get current validation state
- `stop()` - Stop validation orchestration
- `validateEnvironmentConfiguration()` - Check environment setup
- `validatePrivateApi()` - Test Private API connection
- `validateGraphApi()` - Test Graph API tokens
- `testApiManagerIntegration()` - Test dual API system
- `generateReadinessAssessment()` - Create production readiness report

#### Events

The state machine emits events for each validation step completion and error.

### InstagramHealthCheckCLI

Command-line interface for health checks.

#### Options

- `--verbose, -v` - Enable detailed logging
- `--output, -o <file>` - Save report to file
- `--format, -f <format>` - Output format (detailed, summary, json)
- `--no-exit` - Don't exit with error code on failure
- `--help, -h` - Show help information

## Integration with Existing System

### API Manager Integration

The validation system integrates seamlessly with your existing `instagramApiManager`:

```javascript
// Get current API status
const status = await instagramApiManager.getApiStatus();

// Get migration recommendations  
const recs = instagramApiManager.getMigrationRecommendations();

// The validation system uses these same methods
```

### Humanization Engine Testing

Validates your humanization engine capabilities:

```javascript
// Test risk assessment
const risk = instagramService.getRiskAssessment();

// Test optimal posting times
const timing = instagramService.isOptimalPostingTime();

// The validation system tests all humanization features
```

## Best Practices

### 1. Regular Health Checks

Run health checks regularly in production:

```bash
# Daily health check
npm run instagram:health -- --format summary

# Weekly detailed report
npm run instagram:report
```

### 2. Pre-Deployment Validation

Always validate before deploying:

```bash
# Ensure production readiness
npm run instagram:validate

# Should show PRODUCTION_READY status
```

### 3. Monitor Key Metrics

- **Health Score**: Should be >80% for production
- **Response Times**: APIs should respond <2 seconds
- **Token Expiration**: Monitor token validity
- **Fallback Status**: Ensure fallback APIs are healthy

### 4. Error Handling

The validation system provides detailed error context:

```javascript
// Error structure
{
    step: 'graphApi',
    error: 'Invalid access token',
    timestamp: '2025-01-01T12:00:00.000Z',
    recommendations: [
        {
            type: 'TOKEN_REQUIRED',
            priority: 'CRITICAL',
            message: 'Access token needs refresh',
            actions: ['Complete OAuth flow', 'Update environment variable']
        }
    ]
}
```

## Troubleshooting

### Common Command Issues

```bash
# If scripts don't work, try direct execution
node src/scripts/runInstagramValidation.js

# Check if dependencies are installed
npm install

# Verify XState is available
node -e "console.log(require('xstate').createMachine)"
```

### Environment Issues

```bash
# Check environment loading
node -e "require('dotenv').config(); console.log(process.env.INSTAGRAM_USERNAME)"

# Verify file paths
ls -la src/services/instagram*
```

### Permission Issues

```bash
# Make scripts executable (Unix/Linux/macOS)
chmod +x src/scripts/*.js

# Windows equivalent - ensure Node.js can execute
node --version
```

## Contributing

When extending the validation system:

1. **Add New Validation Steps**: Extend the XState machine
2. **Maintain State Isolation**: Each step should be atomic
3. **Provide Recommendations**: Always include actionable guidance
4. **Test Error Scenarios**: Ensure graceful failure handling
5. **Update Documentation**: Keep this guide current

## Support

For issues with the validation system:

1. Run `npm run instagram:health -- --verbose` for detailed diagnostics
2. Check the generated recommendations
3. Verify environment configuration
4. Review the integration test results

The validation system is designed to be self-diagnosing and provide clear guidance for resolving any issues detected.