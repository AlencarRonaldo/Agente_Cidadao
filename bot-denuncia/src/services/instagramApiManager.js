/**
 * Instagram API Manager - Central coordinator for Private API and Graph API
 * Provides unified interface with intelligent routing and fallback capabilities
 */

const logger = require('../utils/logger');
const instagramService = require('./instagramService');
const instagramGraphApiService = require('./instagramGraphApiService');

class InstagramApiManager {
    constructor() {
        this.privateApiService = instagramService;
        this.graphApiService = instagramGraphApiService;
        
        this.config = {
            currentApi: process.env.INSTAGRAM_PRIMARY_API || 'GRAPH', // Changed to prioritize Graph API
            fallbackEnabled: process.env.INSTAGRAM_FALLBACK_ENABLED !== 'false',
            healthCheckInterval: 5 * 60 * 1000, // 5 minutes
            retryAttempts: 3,
            retryDelay: 1000,
            preferGraphApi: true // Flag for intelligent API selection
        };
        
        this.healthStatus = {
            PRIVATE: { healthy: false, lastCheck: null, error: null, accountInfo: null },
            GRAPH: { healthy: false, lastCheck: null, error: null, accountInfo: null }
        };
        
        this.stats = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            apiUsage: { PRIVATE: 0, GRAPH: 0 },
            lastReset: new Date()
        };
        
        // Start health monitoring
        this.startHealthMonitoring();
        
        logger.info('[INSTAGRAM_MANAGER] Instagram API Manager initialized', {
            currentApi: this.config.currentApi,
            fallbackEnabled: this.config.fallbackEnabled
        });
    }
    
    /**
     * Publish a post to Instagram using the best available API
     */
    async publicar(denunciaData, options = {}) {
        const startTime = Date.now();
        this.stats.totalRequests++;
        
        try {
            logger.info('[INSTAGRAM_MANAGER] Publishing post', {
                currentApi: this.config.currentApi,
                hasImage: !!denunciaData.imagePath,
                protocol: denunciaData.protocolo,
                preferGraphApi: this.config.preferGraphApi
            });
            
            // Perform health checks before attempting publication
            await this.performHealthChecks();
            
            let result;
            let apiUsed = this.config.currentApi;
            let primaryError = null;
            
            // Intelligent API selection: prefer Graph API if both are healthy
            if (this.config.preferGraphApi && 
                this.healthStatus.GRAPH.healthy && 
                this.healthStatus.PRIVATE.healthy &&
                this.config.currentApi === 'PRIVATE') {
                
                logger.info('[INSTAGRAM_MANAGER] Both APIs healthy, preferring Graph API over Private API');
                apiUsed = 'GRAPH';
            }
            
            // Try primary/preferred API first
            try {
                result = await this.executeWithApi(apiUsed, 'publicar', denunciaData, options);
                this.stats.apiUsage[apiUsed]++;
                
                logger.info('[INSTAGRAM_MANAGER] Post published successfully', {
                    api: apiUsed,
                    duration: Date.now() - startTime,
                    postId: result.postId || result.id
                });
                
            } catch (error) {
                primaryError = error;
                logger.warn('[INSTAGRAM_MANAGER] Primary API failed', {
                    api: apiUsed,
                    error: error.message,
                    isCheckpointError: error.message.includes('checkpoint'),
                    isChallengeError: error.message.includes('challenge'),
                    isAuthError: error.message.includes('auth') || error.message.includes('login')
                });
                
                // Try fallback API if enabled and different from primary
                if (this.config.fallbackEnabled) {
                    const fallbackApi = apiUsed === 'PRIVATE' ? 'GRAPH' : 'PRIVATE';
                    
                    // Only try fallback if it's healthy and different from what we just tried
                    if (this.healthStatus[fallbackApi].healthy && fallbackApi !== apiUsed) {
                        logger.info('[INSTAGRAM_MANAGER] Trying fallback API', { 
                            fallbackApi,
                            reason: error.message.includes('checkpoint') ? 'checkpoint_error' : 
                                   error.message.includes('challenge') ? 'challenge_error' : 'api_error'
                        });
                        
                        try {
                            result = await this.executeWithApi(fallbackApi, 'publicar', denunciaData, options);
                            apiUsed = fallbackApi;
                            this.stats.apiUsage[apiUsed]++;
                            
                            logger.info('[INSTAGRAM_MANAGER] Fallback API succeeded', {
                                api: fallbackApi,
                                duration: Date.now() - startTime,
                                primaryErrorType: primaryError.message.includes('checkpoint') ? 'checkpoint' : 
                                                 primaryError.message.includes('challenge') ? 'challenge' : 'other'
                            });
                            
                        } catch (fallbackError) {
                            logger.error('[INSTAGRAM_MANAGER] Both APIs failed', {
                                primaryApi: apiUsed === fallbackApi ? this.config.currentApi : apiUsed,
                                fallbackApi: fallbackApi,
                                primaryError: primaryError.message,
                                fallbackError: fallbackError.message
                            });
                            
                            // Determine the most helpful error message
                            let errorMessage = 'Both Instagram APIs failed. ';
                            if (primaryError.message.includes('checkpoint') && fallbackError.message.includes('token')) {
                                errorMessage += 'Private API needs checkpoint verification, Graph API needs token setup.';
                            } else if (primaryError.message.includes('token') && fallbackError.message.includes('checkpoint')) {
                                errorMessage += 'Graph API needs token setup, Private API needs checkpoint verification.';
                            } else {
                                errorMessage += `Primary: ${primaryError.message}, Fallback: ${fallbackError.message}`;
                            }
                            
                            throw new Error(errorMessage);
                        }
                    } else {
                        // No healthy fallback available
                        throw primaryError;
                    }
                } else {
                    throw primaryError;
                }
            }
            
            this.stats.successfulRequests++;
            
            return {
                success: true,
                data: result,
                apiUsed,
                duration: Date.now() - startTime,
                message: `Post published successfully via ${apiUsed} API`,
                fallbackUsed: apiUsed !== this.config.currentApi
            };
            
        } catch (error) {
            this.stats.failedRequests++;
            
            logger.error('[INSTAGRAM_MANAGER] Failed to publish post', {
                error: error.message,
                duration: Date.now() - startTime,
                protocol: denunciaData.protocolo,
                healthStatus: {
                    graph: this.healthStatus.GRAPH.healthy,
                    private: this.healthStatus.PRIVATE.healthy
                }
            });
            
            return {
                success: false,
                error: error.message,
                duration: Date.now() - startTime,
                message: 'Failed to publish post',
                healthStatus: {
                    GRAPH: this.healthStatus.GRAPH.healthy,
                    PRIVATE: this.healthStatus.PRIVATE.healthy
                },
                recommendations: this.generateErrorRecommendations(error.message)
            };
        }
    }
    
    /**
     * Execute method with specific API
     */
    async executeWithApi(apiType, method, ...args) {
        const service = apiType === 'GRAPH' ? this.graphApiService : this.privateApiService;
        
        if (apiType === 'GRAPH' && method === 'publicar') {
            // Adapt data for Graph API - use the same interface as Private API
            const [denunciaData, options] = args;
            
            // The Graph API service expects the same format as Private API
            const graphData = {
                texto: denunciaData.texto || this.buildCaption(denunciaData),
                imagem: denunciaData.imagePath || denunciaData.imagem,
                vereadores: denunciaData.vereadores || [],
                bairro: denunciaData.bairro || denunciaData.endereco
            };
            
            const result = await service.publicar(graphData);
            
            if (!result.success) {
                throw new Error(result.error || 'Graph API failed');
            }
            
            return {
                postId: result.postId,
                permalink: result.postUrl,
                message: 'Published via Graph API',
                success: true
            };
        } else {
            // Use Private API directly
            return await service[method](...args);
        }
    }
    
    /**
     * Build caption for Instagram post
     */
    buildCaption(denunciaData) {
        let caption = `🚨 DENÚNCIA CIDADÃ\n\n`;
        
        if (denunciaData.texto) {
            caption += `📝 ${denunciaData.texto}\n\n`;
        }
        
        if (denunciaData.endereco) {
            caption += `📍 Local: ${denunciaData.endereco}`;
            if (denunciaData.bairro) {
                caption += `, ${denunciaData.bairro}`;
            }
            caption += '\n\n';
        }
        
        caption += `🔖 Protocolo: ${denunciaData.protocolo}\n`;
        caption += `📅 ${new Date().toLocaleDateString('pt-BR')}\n\n`;
        caption += `#DenunciaCidada #TransparenciaPublica #VozDoPovo`;
        
        return caption;
    }
    
    /**
     * Get current API status
     */
    async getApiStatus() {
        await this.performHealthChecks();
        
        const migrationReady = this.healthStatus.PRIVATE.healthy && this.healthStatus.GRAPH.healthy;
        const healthScore = this.calculateHealthScore();
        
        return {
            currentApi: this.config.currentApi,
            apis: { ...this.healthStatus },
            migrationReady,
            healthScore,
            stats: { ...this.stats },
            config: {
                fallbackEnabled: this.config.fallbackEnabled,
                healthCheckInterval: this.config.healthCheckInterval
            }
        };
    }
    
    /**
     * Migrate to different API
     */
    async migrateToApi(targetApi, options = {}) {
        if (!['PRIVATE', 'GRAPH'].includes(targetApi)) {
            throw new Error('Invalid target API. Must be PRIVATE or GRAPH');
        }
        
        if (targetApi === this.config.currentApi) {
            return {
                success: true,
                message: `Already using ${targetApi} API`,
                currentApi: targetApi
            };
        }
        
        logger.info('[INSTAGRAM_MANAGER] Starting API migration', {
            from: this.config.currentApi,
            to: targetApi,
            testPublication: options.testPublication
        });
        
        // Check target API health
        await this.performHealthChecks();
        
        if (!this.healthStatus[targetApi].healthy) {
            throw new Error(`Target API (${targetApi}) is not healthy. Configure it first.`);
        }
        
        // Perform test publication if requested
        if (options.testPublication) {
            const testData = {
                protocolo: `TEST-${Date.now()}`,
                texto: 'Teste de migração de API - Esta é uma publicação de teste.',
                imagePath: 'https://via.placeholder.com/400x400.jpg?text=Teste+API',
                endereco: 'Teste',
                bairro: 'Teste'
            };
            
            try {
                const testResult = await this.executeWithApi(targetApi, 'publicar', testData);
                logger.info('[INSTAGRAM_MANAGER] Test publication successful', {
                    api: targetApi,
                    postId: testResult.postId
                });
            } catch (testError) {
                logger.error('[INSTAGRAM_MANAGER] Test publication failed', {
                    api: targetApi,
                    error: testError.message
                });
                throw new Error(`Migration test failed: ${testError.message}`);
            }
        }
        
        // Update configuration
        const previousApi = this.config.currentApi;
        this.config.currentApi = targetApi;
        
        // Update environment variable (in production, this would be persisted)
        process.env.INSTAGRAM_PRIMARY_API = targetApi;
        
        logger.info('[INSTAGRAM_MANAGER] API migration completed', {
            from: previousApi,
            to: targetApi
        });
        
        return {
            success: true,
            message: `Successfully migrated from ${previousApi} to ${targetApi} API`,
            currentApi: targetApi,
            previousApi
        };
    }
    
    /**
     * Start health monitoring
     */
    startHealthMonitoring() {
        // Initial health check
        this.performHealthChecks();
        
        // Set up periodic health checks
        setInterval(() => {
            this.performHealthChecks().catch(error => {
                logger.error('[INSTAGRAM_MANAGER] Health check failed', { error: error.message });
            });
        }, this.config.healthCheckInterval);
        
        logger.info('[INSTAGRAM_MANAGER] Health monitoring started', {
            interval: this.config.healthCheckInterval
        });
    }
    
    /**
     * Perform health checks on both APIs
     */
    async performHealthChecks() {
        const promises = [
            this.checkApiHealth('PRIVATE'),
            this.checkApiHealth('GRAPH')
        ];
        
        await Promise.allSettled(promises);
    }
    
    /**
     * Check health of specific API
     */
    async checkApiHealth(apiType) {
        const startTime = Date.now();
        
        try {
            let result;
            let accountInfo = null;
            
            if (apiType === 'PRIVATE') {
                // Check Private API
                result = await this.privateApiService.verificarConexao();
                if (result.success && result.accountInfo) {
                    accountInfo = result.accountInfo;
                }
            } else {
                // Check Graph API
                result = await this.graphApiService.testConnection();
                if (result.success && result.accountInfo) {
                    accountInfo = result.accountInfo;
                }
            }
            
            this.healthStatus[apiType] = {
                healthy: result.success,
                lastCheck: new Date(),
                error: result.success ? null : result.message,
                accountInfo: accountInfo,
                responseTime: Date.now() - startTime
            };
            
            logger.debug(`[INSTAGRAM_MANAGER] ${apiType} API health check completed`, {
                healthy: result.success,
                responseTime: Date.now() - startTime
            });
            
        } catch (error) {
            this.healthStatus[apiType] = {
                healthy: false,
                lastCheck: new Date(),
                error: error.message,
                accountInfo: null,
                responseTime: Date.now() - startTime
            };
            
            logger.warn(`[INSTAGRAM_MANAGER] ${apiType} API health check failed`, {
                error: error.message,
                responseTime: Date.now() - startTime
            });
        }
    }
    
    /**
     * Calculate overall health score
     */
    calculateHealthScore() {
        let score = 0;
        let factors = 0;
        
        // API Health (40%)
        if (this.healthStatus.PRIVATE.healthy) {
            score += 20;
        }
        if (this.healthStatus.GRAPH.healthy) {
            score += 20;
        }
        factors += 40;
        
        // Success Rate (30%)
        const successRate = this.stats.totalRequests > 0 
            ? (this.stats.successfulRequests / this.stats.totalRequests) * 100 
            : 0;
        score += (successRate * 0.3);
        factors += 30;
        
        // Response Time (20%)
        const avgResponseTime = Math.min(
            (this.healthStatus.PRIVATE.responseTime || 0 + this.healthStatus.GRAPH.responseTime || 0) / 2,
            5000
        );
        const responseScore = Math.max(0, (5000 - avgResponseTime) / 5000 * 100);
        score += (responseScore * 0.2);
        factors += 20;
        
        // Configuration Completeness (10%)
        const configScore = this.config.fallbackEnabled ? 10 : 5;
        score += configScore;
        factors += 10;
        
        return Math.round(Math.min(100, (score / factors) * 100));
    }
    
    /**
     * Get migration recommendations
     */
    getMigrationRecommendations() {
        const recommendations = [];
        
        // Check if Graph API is configured but not active
        if (this.healthStatus.GRAPH.healthy && this.config.currentApi === 'PRIVATE') {
            recommendations.push({
                type: 'MIGRATION_READY',
                priority: 'HIGH',
                message: 'Graph API está configurado e funcional. Consider migrar para a API oficial.',
                action: 'Migrar para Graph API'
            });
        }
        
        // Check if Private API has issues
        if (!this.healthStatus.PRIVATE.healthy && this.config.currentApi === 'PRIVATE') {
            recommendations.push({
                type: 'API_ISSUE',
                priority: 'CRITICAL',
                message: 'Private API apresenta problemas. Verifique as credenciais ou migre para Graph API.',
                action: 'Verificar configuração'
            });
        }
        
        // Check success rate
        const successRate = this.stats.totalRequests > 0 
            ? (this.stats.successfulRequests / this.stats.totalRequests) * 100 
            : 100;
            
        if (successRate < 90 && this.stats.totalRequests > 10) {
            recommendations.push({
                type: 'PERFORMANCE',
                priority: 'MEDIUM',
                message: `Taxa de sucesso baixa (${successRate.toFixed(1)}%). Consider ativar fallback ou migrar API.`,
                action: 'Revisar configuração'
            });
        }
        
        // Check if no fallback is configured
        if (!this.config.fallbackEnabled && this.healthStatus.GRAPH.healthy && this.healthStatus.PRIVATE.healthy) {
            recommendations.push({
                type: 'RELIABILITY',
                priority: 'MEDIUM',
                message: 'Ambas APIs estão funcionais. Consider ativar fallback para maior confiabilidade.',
                action: 'Ativar fallback'
            });
        }
        
        return recommendations;
    }
    
    /**
     * Reset statistics
     */
    resetStats() {
        this.stats = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            apiUsage: { PRIVATE: 0, GRAPH: 0 },
            lastReset: new Date()
        };
        
        logger.info('[INSTAGRAM_MANAGER] Statistics reset');
    }
    
    /**
     * Generate error-specific recommendations
     */
    generateErrorRecommendations(errorMessage) {
        const recommendations = [];
        
        if (errorMessage.includes('checkpoint')) {
            recommendations.push({
                type: 'CHECKPOINT_REQUIRED',
                priority: 'CRITICAL',
                message: 'Instagram Private API requires checkpoint verification',
                actions: [
                    'Log into Instagram app/website manually',
                    'Complete any security challenges or verifications',
                    'Restart the bot service after verification',
                    'Consider migrating to Graph API for better reliability'
                ]
            });
        }
        
        if (errorMessage.includes('challenge')) {
            recommendations.push({
                type: 'CHALLENGE_REQUIRED', 
                priority: 'CRITICAL',
                message: 'Instagram requires additional verification',
                actions: [
                    'Complete challenge via Instagram app/website',
                    'Verify account phone number or email',
                    'Check for suspicious activity notifications',
                    'Use Graph API to avoid Private API challenges'
                ]
            });
        }
        
        if (errorMessage.includes('token')) {
            recommendations.push({
                type: 'TOKEN_REQUIRED',
                priority: 'HIGH', 
                message: 'Instagram Graph API needs valid access token',
                actions: [
                    'Complete OAuth flow to get new access token',
                    'Check if existing token has expired',
                    'Verify app permissions and scopes',
                    'Ensure Instagram Business/Creator account is connected'
                ]
            });
        }
        
        if (errorMessage.includes('Both APIs failed')) {
            recommendations.push({
                type: 'SYSTEM_OUTAGE',
                priority: 'CRITICAL',
                message: 'All Instagram APIs are unavailable',
                actions: [
                    'Check Instagram server status',
                    'Verify network connectivity',
                    'Review account configurations for both APIs',
                    'Wait for Instagram service restoration',
                    'Enable monitoring alerts for API recovery'
                ]
            });
        }
        
        return recommendations;
    }
    
    /**
     * Test connection to Instagram APIs - orchestrator compatibility method
     */
    async testConnection() {
        try {
            await this.performHealthChecks();
            
            const hasHealthyApi = this.healthStatus.PRIVATE.healthy || this.healthStatus.GRAPH.healthy;
            
            return {
                success: hasHealthyApi,
                message: hasHealthyApi ? 'At least one API is healthy' : 'No healthy APIs available',
                healthStatus: {
                    PRIVATE: this.healthStatus.PRIVATE.healthy,
                    GRAPH: this.healthStatus.GRAPH.healthy
                },
                accountInfo: this.healthStatus.GRAPH.accountInfo || this.healthStatus.PRIVATE.accountInfo || null
            };
        } catch (error) {
            logger.error('[INSTAGRAM_MANAGER] testConnection failed', { error: error.message });
            return {
                success: false,
                message: error.message,
                healthStatus: {
                    PRIVATE: false,
                    GRAPH: false
                }
            };
        }
    }

    /**
     * Get status - orchestrator compatibility method (alias for getApiStatus)
     */
    async getStatus() {
        return await this.getApiStatus();
    }

    /**
     * Get comprehensive status for monitoring
     */
    async getComprehensiveStatus() {
        const apiStatus = await this.getApiStatus();
        const recommendations = this.getMigrationRecommendations();
        
        return {
            ...apiStatus,
            recommendations,
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        };
    }
}

// Export singleton instance
const instagramApiManager = new InstagramApiManager();
module.exports = instagramApiManager;