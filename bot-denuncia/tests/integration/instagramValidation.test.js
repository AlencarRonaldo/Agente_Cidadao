/**
 * Instagram Validation Integration Tests
 * Comprehensive test suite for Instagram token validation and system health
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const InstagramTokenValidationOrchestrator = require('../../src/services/instagramTokenValidationOrchestrator');
const instagramApiManager = require('../../src/services/instagramApiManager');
const instagramService = require('../../src/services/instagramService');

describe('Instagram Token Validation & System Health Tests', () => {
    let orchestrator;
    
    beforeAll(async () => {
        orchestrator = new InstagramTokenValidationOrchestrator();
    });
    
    afterAll(async () => {
        if (orchestrator.service) {
            orchestrator.stop();
        }
    });

    describe('Environment Configuration Validation', () => {
        test('should validate environment variables are present', async () => {
            const result = await orchestrator.validateEnvironmentConfiguration();
            
            expect(result).toHaveProperty('success');
            expect(result).toHaveProperty('config');
            expect(result).toHaveProperty('issues');
            expect(result).toHaveProperty('recommendations');
            
            // Check that config structure is correct
            expect(result.config).toHaveProperty('privateApi');
            expect(result.config).toHaveProperty('graphApi');
            expect(result.config).toHaveProperty('apiManager');
            
            // Log issues for debugging
            if (result.issues.length > 0) {
                console.log('Configuration issues found:', result.issues);
            }
        });

        test('should identify missing credentials', async () => {
            // Temporarily remove env vars
            const originalUsername = process.env.INSTAGRAM_USERNAME;
            const originalToken = process.env.INSTAGRAM_GRAPH_ACCESS_TOKEN;
            
            delete process.env.INSTAGRAM_USERNAME;
            delete process.env.INSTAGRAM_GRAPH_ACCESS_TOKEN;
            
            const result = await orchestrator.validateEnvironmentConfiguration();
            
            expect(result.success).toBe(false);
            expect(result.issues.length).toBeGreaterThan(0);
            expect(result.recommendations.length).toBeGreaterThan(0);
            
            // Restore env vars
            if (originalUsername) process.env.INSTAGRAM_USERNAME = originalUsername;
            if (originalToken) process.env.INSTAGRAM_GRAPH_ACCESS_TOKEN = originalToken;
        });
    });

    describe('Private API Connection Tests', () => {
        test('should test Private API connection', async () => {
            const result = await orchestrator.validatePrivateApi();
            
            expect(result).toHaveProperty('success');
            expect(result).toHaveProperty('connection');
            expect(result).toHaveProperty('capabilities');
            expect(result).toHaveProperty('recommendations');
            
            // Check capabilities structure
            expect(result.capabilities).toHaveProperty('canLogin');
            expect(result.capabilities).toHaveProperty('hasCredentials');
            expect(result.capabilities).toHaveProperty('sessionAvailable');
            
            // If it fails, it should provide recommendations
            if (!result.success) {
                expect(result.recommendations.length).toBeGreaterThan(0);
                console.log('Private API issues:', result.connection.message);
            }
        });

        test('should handle Private API authentication errors gracefully', async () => {
            // This test should not throw errors, even if auth fails
            expect(async () => {
                await orchestrator.validatePrivateApi();
            }).not.toThrow();
        });
    });

    describe('Graph API Token Validation', () => {
        test('should test Graph API connection', async () => {
            const result = await orchestrator.validateGraphApi();
            
            expect(result).toHaveProperty('success');
            expect(result).toHaveProperty('connection');
            expect(result).toHaveProperty('capabilities');
            expect(result).toHaveProperty('recommendations');
            
            // Check capabilities
            expect(result.capabilities).toHaveProperty('hasToken');
            expect(result.capabilities).toHaveProperty('hasBusinessAccount');
            expect(result.capabilities).toHaveProperty('mockMode');
            
            // Should work in mock mode even without real tokens
            if (result.capabilities.mockMode) {
                expect(result.success).toBe(true);
            }
        });

        test('should detect token invalidation', async () => {
            const result = await orchestrator.checkTokenExpiration();
            
            expect(result).toHaveProperty('success');
            expect(result).toHaveProperty('tokenStatus');
            expect(result).toHaveProperty('issues');
            expect(result).toHaveProperty('recommendations');
            
            // Check token status structure
            expect(result.tokenStatus).toHaveProperty('graphApi');
            expect(result.tokenStatus).toHaveProperty('privateApi');
            
            // Should detect invalidated tokens
            if (result.tokenStatus.graphApi.isInvalidated) {
                expect(result.issues.length).toBeGreaterThan(0);
                expect(result.recommendations.some(rec => rec.type === 'TOKEN_INVALIDATED')).toBe(true);
            }
        });
    });

    describe('API Manager Integration Tests', () => {
        test('should test API Manager dual system', async () => {
            const result = await orchestrator.testApiManagerIntegration();
            
            expect(result).toHaveProperty('success');
            expect(result).toHaveProperty('apiStatus');
            expect(result).toHaveProperty('integration');
            expect(result).toHaveProperty('recommendations');
            
            // Check integration properties
            expect(result.integration).toHaveProperty('currentApi');
            expect(result.integration).toHaveProperty('fallbackEnabled');
            expect(result.integration).toHaveProperty('healthStatus');
            expect(result.integration).toHaveProperty('migrationReady');
            expect(result.integration).toHaveProperty('healthScore');
            
            // Health score should be a number between 0-100
            expect(typeof result.integration.healthScore).toBe('number');
            expect(result.integration.healthScore).toBeGreaterThanOrEqual(0);
            expect(result.integration.healthScore).toBeLessThanOrEqual(100);
        });

        test('should test fallback mechanisms', async () => {
            const result = await orchestrator.testFallbackMechanisms();
            
            expect(result).toHaveProperty('success');
            expect(result).toHaveProperty('fallbackTests');
            expect(result).toHaveProperty('configuration');
            expect(result).toHaveProperty('recommendations');
            
            // Check fallback tests structure
            expect(result.fallbackTests).toHaveProperty('configurationTest');
            expect(result.fallbackTests).toHaveProperty('automaticFallback');
            expect(result.fallbackTests).toHaveProperty('errorRecovery');
            expect(result.fallbackTests).toHaveProperty('contextPreservation');
        });
    });

    describe('Posting Pipeline Tests', () => {
        test('should test end-to-end posting pipeline (dry run)', async () => {
            const result = await orchestrator.testPostingPipeline();
            
            expect(result).toHaveProperty('success');
            expect(result).toHaveProperty('pipelineTests');
            expect(result).toHaveProperty('testData');
            expect(result).toHaveProperty('recommendations');
            
            // Check pipeline tests
            expect(result.pipelineTests).toHaveProperty('dataValidation');
            expect(result.pipelineTests).toHaveProperty('imageProcessing');
            expect(result.pipelineTests).toHaveProperty('contentGeneration');
            expect(result.pipelineTests).toHaveProperty('apiSelection');
            expect(result.pipelineTests).toHaveProperty('errorHandling');
            
            // Test data should be valid
            expect(result.testData).toHaveProperty('texto');
            expect(result.testData).toHaveProperty('imagePath');
            expect(result.testData).toHaveProperty('protocolo');
        });
    });

    describe('Humanization Engine Tests', () => {
        test('should test humanization engine functionality', async () => {
            const result = await orchestrator.testHumanizationEngine();
            
            expect(result).toHaveProperty('success');
            expect(result).toHaveProperty('humanizationTests');
            expect(result).toHaveProperty('recommendations');
            
            // Check humanization tests
            expect(result.humanizationTests).toHaveProperty('engineAvailable');
            expect(result.humanizationTests).toHaveProperty('riskAssessment');
            expect(result.humanizationTests).toHaveProperty('contentVariation');
            expect(result.humanizationTests).toHaveProperty('hashtagRotation');
            expect(result.humanizationTests).toHaveProperty('timingOptimization');
            expect(result.humanizationTests).toHaveProperty('behaviorTracking');
        });
    });

    describe('Performance Metrics Tests', () => {
        test('should measure API performance', async () => {
            const result = await orchestrator.measurePerformanceMetrics();
            
            expect(result).toHaveProperty('success');
            expect(result).toHaveProperty('metrics');
            expect(result).toHaveProperty('recommendations');
            expect(result).toHaveProperty('summary');
            
            // Check metrics structure
            expect(result.metrics).toHaveProperty('privateApi');
            expect(result.metrics).toHaveProperty('graphApi');
            expect(result.metrics).toHaveProperty('apiManager');
            
            // Each metric should have expected properties
            Object.values(result.metrics).forEach(metric => {
                expect(metric).toHaveProperty('available');
                // Response time might be null if API is unavailable
                if (metric.available) {
                    expect(typeof metric.responseTime).toBe('number');
                    expect(metric.responseTime).toBeGreaterThan(0);
                }
            });
            
            // Summary should include available APIs
            expect(Array.isArray(result.summary.availableApis)).toBe(true);
            expect(typeof result.summary.averageResponseTime).toBe('number');
        });
    });

    describe('Production Readiness Assessment', () => {
        test('should generate readiness assessment', async () => {
            // Mock some results for the assessment
            const mockResults = {
                environment: { success: true, issues: [] },
                privateApi: { success: false },
                graphApi: { success: true },
                apiManager: { success: true, integration: { healthScore: 75 } },
                fallbacks: { success: true },
                postingPipeline: { success: true },
                performance: { metrics: { privateApi: { responseTime: 500 }, graphApi: { responseTime: 300 } } }
            };
            
            // Temporarily override the service context
            const originalService = orchestrator.service;
            orchestrator.service = {
                getSnapshot: () => ({
                    context: { results: mockResults }
                })
            };
            
            const result = await orchestrator.generateReadinessAssessment();
            
            expect(result).toHaveProperty('success');
            expect(result).toHaveProperty('readiness');
            expect(result).toHaveProperty('timestamp');
            
            // Check readiness structure
            expect(result.readiness).toHaveProperty('overall');
            expect(result.readiness).toHaveProperty('score');
            expect(result.readiness).toHaveProperty('categories');
            expect(result.readiness).toHaveProperty('criticalIssues');
            expect(result.readiness).toHaveProperty('recommendations');
            expect(result.readiness).toHaveProperty('nextSteps');
            
            // Score should be between 0-100
            expect(typeof result.readiness.score).toBe('number');
            expect(result.readiness.score).toBeGreaterThanOrEqual(0);
            expect(result.readiness.score).toBeLessThanOrEqual(100);
            
            // Overall status should be one of expected values
            expect(['PRODUCTION_READY', 'READY_WITH_WARNINGS', 'NEEDS_CONFIGURATION', 'NOT_READY'])
                .toContain(result.readiness.overall);
            
            // Categories should have scores and weights
            Object.values(result.readiness.categories).forEach(category => {
                expect(category).toHaveProperty('score');
                expect(category).toHaveProperty('weight');
                expect(typeof category.score).toBe('number');
                expect(typeof category.weight).toBe('number');
            });
            
            // Restore original service
            orchestrator.service = originalService;
        });
    });

    describe('Full Orchestration Flow', () => {
        test('should complete full validation orchestration', async () => {
            const startTime = Date.now();
            
            const report = await orchestrator.startValidation({
                verbose: false
            });
            
            const duration = Date.now() - startTime;
            
            expect(report).toHaveProperty('summary');
            expect(report).toHaveProperty('results');
            expect(report).toHaveProperty('errors');
            expect(report).toHaveProperty('recommendations');
            expect(report).toHaveProperty('readinessAssessment');
            expect(report).toHaveProperty('timestamp');
            
            // Summary validation
            expect(report.summary).toHaveProperty('validationId');
            expect(report.summary).toHaveProperty('startTime');
            expect(report.summary).toHaveProperty('endTime');
            expect(report.summary).toHaveProperty('duration');
            expect(report.summary).toHaveProperty('success');
            expect(report.summary).toHaveProperty('completedSteps');
            expect(report.summary).toHaveProperty('totalSteps');
            expect(report.summary).toHaveProperty('errors');
            
            // Should complete within reasonable time (max 30 seconds)
            expect(duration).toBeLessThan(30000);
            
            // Should have attempted all steps
            expect(report.summary.completedSteps).toBeGreaterThan(0);
            expect(report.summary.totalSteps).toBe(12);
            
            console.log('Full validation completed:', {
                success: report.summary.success,
                duration: Math.round(duration / 1000) + 's',
                steps: `${report.summary.completedSteps}/${report.summary.totalSteps}`,
                errors: report.summary.errors,
                readiness: report.readinessAssessment?.readiness?.overall || 'Unknown'
            });
            
        }, 35000); // 35 second timeout for full test
    });

    describe('Error Recovery Tests', () => {
        test('should handle API failures gracefully', async () => {
            // Test with non-existent service
            const mockContext = {
                errors: [
                    { step: 'privateApi', error: 'Connection failed', timestamp: new Date().toISOString() },
                    { step: 'graphApi', error: 'Invalid token', timestamp: new Date().toISOString() }
                ],
                retryCount: 0,
                maxRetries: 3
            };
            
            const result = await orchestrator.attemptRecovery(mockContext);
            
            expect(result).toHaveProperty('success');
            expect(result).toHaveProperty('actions');
            expect(result).toHaveProperty('timestamp');
            
            // Should provide recovery actions
            expect(Array.isArray(result.actions)).toBe(true);
            expect(result.actions.length).toBeGreaterThan(0);
        });
    });

    describe('State Machine Tests', () => {
        test('should track validation progress correctly', async () => {
            const progressUpdates = [];
            
            // Create new orchestrator for this test
            const testOrchestrator = new InstagramTokenValidationOrchestrator();
            
            // Start validation and track progress
            const validationPromise = testOrchestrator.startValidation();
            
            // Monitor progress
            const progressInterval = setInterval(() => {
                const status = testOrchestrator.getCurrentStatus();
                if (status.context) {
                    progressUpdates.push({
                        state: status.status,
                        step: status.context.currentStep,
                        completed: status.context.completedSteps,
                        total: status.context.totalSteps
                    });
                }
            }, 100);
            
            await validationPromise;
            clearInterval(progressInterval);
            
            // Should have recorded progress updates
            expect(progressUpdates.length).toBeGreaterThan(0);
            
            // Progress should advance
            const firstUpdate = progressUpdates[0];
            const lastUpdate = progressUpdates[progressUpdates.length - 1];
            expect(lastUpdate.completed).toBeGreaterThanOrEqual(firstUpdate.completed);
            
            testOrchestrator.stop();
        }, 35000);
    });
});

describe('Instagram Services Direct Tests', () => {
    describe('Instagram API Manager', () => {
        test('should get API status', async () => {
            const status = await instagramApiManager.getApiStatus();
            
            expect(status).toHaveProperty('currentApi');
            expect(status).toHaveProperty('apis');
            expect(status).toHaveProperty('migrationReady');
            expect(status).toHaveProperty('healthScore');
            expect(status).toHaveProperty('stats');
            expect(status).toHaveProperty('config');
            
            // APIs should have health status
            expect(status.apis).toHaveProperty('PRIVATE');
            expect(status.apis).toHaveProperty('GRAPH');
            
            Object.values(status.apis).forEach(api => {
                expect(api).toHaveProperty('healthy');
                expect(api).toHaveProperty('lastCheck');
                expect(typeof api.healthy).toBe('boolean');
            });
        });

        test('should provide migration recommendations', async () => {
            const recommendations = instagramApiManager.getMigrationRecommendations();
            
            expect(Array.isArray(recommendations)).toBe(true);
            
            // Each recommendation should have required properties
            recommendations.forEach(rec => {
                expect(rec).toHaveProperty('type');
                expect(rec).toHaveProperty('priority');
                expect(rec).toHaveProperty('message');
                expect(rec).toHaveProperty('action');
            });
        });
    });

    describe('Instagram Service', () => {
        test('should get connection status', async () => {
            const status = await instagramService.getConnectionStatus();
            
            expect(status).toHaveProperty('isLoggedIn');
            expect(status).toHaveProperty('username');
            expect(status).toHaveProperty('hasValidCredentials');
            expect(status).toHaveProperty('sessionExists');
            expect(status).toHaveProperty('service');
            expect(status).toHaveProperty('credentialsConfigured');
            expect(status).toHaveProperty('canInitialize');
            
            expect(typeof status.isLoggedIn).toBe('boolean');
            expect(typeof status.hasValidCredentials).toBe('boolean');
            expect(typeof status.sessionExists).toBe('boolean');
        });

        test('should test connection with retries', async () => {
            const result = await instagramService.testConnection(1);
            
            expect(result).toHaveProperty('success');
            expect(typeof result.success).toBe('boolean');
            
            if (!result.success) {
                expect(result).toHaveProperty('message');
                expect(result).toHaveProperty('recommendation');
                console.log('Private API connection failed:', result.message);
            } else {
                expect(result).toHaveProperty('accountInfo');
            }
        });

        test('should get humanization status', async () => {
            const riskAssessment = instagramService.getRiskAssessment();
            const postingTime = instagramService.isOptimalPostingTime();
            
            // Risk assessment might not be available if humanization engine is missing
            if (!riskAssessment.error) {
                expect(riskAssessment).toHaveProperty('totalRisk');
                expect(typeof riskAssessment.totalRisk).toBe('number');
            }
            
            // Posting time check should always work
            expect(postingTime).toHaveProperty('isOptimal');
            expect(typeof postingTime.isOptimal).toBe('boolean');
        });
    });
});

describe('Mock Mode Tests', () => {
    test('should work in mock mode when real credentials unavailable', async () => {
        // Temporarily enable mock mode
        const originalMockMode = process.env.INSTAGRAM_GRAPH_MOCK_MODE;
        process.env.INSTAGRAM_GRAPH_MOCK_MODE = 'true';
        
        const orchestrator = new InstagramTokenValidationOrchestrator();
        const result = await orchestrator.validateGraphApi();
        
        // Should succeed in mock mode
        expect(result.success).toBe(true);
        expect(result.capabilities.mockMode).toBe(true);
        
        // Restore original setting
        if (originalMockMode) {
            process.env.INSTAGRAM_GRAPH_MOCK_MODE = originalMockMode;
        } else {
            delete process.env.INSTAGRAM_GRAPH_MOCK_MODE;
        }
    });
});