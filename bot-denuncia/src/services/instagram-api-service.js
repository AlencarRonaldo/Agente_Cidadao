/**
 * Instagram Graph API Service
 * Implements official Instagram Graph API with OAuth 2.0
 */

const axios = require('axios');
const logger = require('../utils/logger');

class InstagramApiService {
    constructor() {
        this.baseUrl = 'https://graph.instagram.com';
        this.version = 'v18.0';
        this.accessToken = process.env.INSTAGRAM_GRAPH_ACCESS_TOKEN || null;
        this.businessAccountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || null;
        this.clientId = process.env.GRAPH_API_CLIENT_ID || null;
        this.clientSecret = process.env.GRAPH_API_CLIENT_SECRET || null;
        
        // Mock mode for development
        this.mockMode = process.env.INSTAGRAM_GRAPH_MOCK_MODE === 'true';
        
        logger.info('[GRAPH_API] Instagram Graph API Service initialized', {
            mockMode: this.mockMode,
            hasToken: !!this.accessToken,
            hasBusinessAccount: !!this.businessAccountId
        });
    }
    
    /**
     * Test connection to Graph API
     */
    async testConnection() {
        try {
            if (this.mockMode) {
                logger.info('[GRAPH_API] Mock mode - simulating successful connection');
                return {
                    success: true,
                    message: 'Mock mode active - connection simulated',
                    accountInfo: {
                        id: 'mock_123456',
                        username: 'mock_user',
                        name: 'Mock Test Account',
                        followers_count: 1000,
                        media_count: 50
                    }
                };
            }
            
            if (!this.accessToken || !this.businessAccountId) {
                return {
                    success: false,
                    message: 'Graph API not configured. Access token or Business Account ID missing.',
                    configured: false
                };
            }
            
            // Test API with account info request
            const response = await axios.get(
                `${this.baseUrl}/${this.version}/${this.businessAccountId}`,
                {
                    params: {
                        fields: 'id,username,name,followers_count,media_count',
                        access_token: this.accessToken
                    }
                }
            );
            
            logger.info('[GRAPH_API] Connection test successful', {
                username: response.data.username
            });
            
            return {
                success: true,
                message: 'Connected to Instagram Graph API',
                accountInfo: response.data
            };
            
        } catch (error) {
            logger.error('[GRAPH_API] Connection test failed', {
                error: error.message,
                response: error.response?.data
            });
            
            return {
                success: false,
                message: error.response?.data?.error?.message || error.message,
                error: error.response?.data?.error || null
            };
        }
    }
    
    /**
     * Create media container (step 1 of publishing)
     */
    async createMediaContainer(imageUrl, caption = '') {
        try {
            if (this.mockMode) {
                logger.info('[GRAPH_API] Mock mode - creating media container');
                return {
                    id: `mock_container_${Date.now()}`,
                    status: 'IN_PROGRESS'
                };
            }
            
            const params = {
                image_url: imageUrl,
                caption: caption,
                access_token: this.accessToken
            };
            
            const response = await axios.post(
                `${this.baseUrl}/${this.version}/${this.businessAccountId}/media`,
                params
            );
            
            logger.info('[GRAPH_API] Media container created', {
                containerId: response.data.id
            });
            
            return response.data;
            
        } catch (error) {
            logger.error('[GRAPH_API] Failed to create media container', {
                error: error.message,
                response: error.response?.data
            });
            throw error;
        }
    }
    
    /**
     * Check media container status
     */
    async checkContainerStatus(containerId) {
        try {
            if (this.mockMode) {
                return {
                    id: containerId,
                    status: 'FINISHED',
                    status_code: 'FINISHED'
                };
            }
            
            const response = await axios.get(
                `${this.baseUrl}/${this.version}/${containerId}`,
                {
                    params: {
                        fields: 'id,status,status_code',
                        access_token: this.accessToken
                    }
                }
            );
            
            return response.data;
            
        } catch (error) {
            logger.error('[GRAPH_API] Failed to check container status', {
                containerId,
                error: error.message
            });
            throw error;
        }
    }
    
    /**
     * Wait for container to be ready
     */
    async waitForContainerReady(containerId, maxAttempts = 10) {
        for (let i = 0; i < maxAttempts; i++) {
            const status = await this.checkContainerStatus(containerId);
            
            if (status.status_code === 'FINISHED') {
                return true;
            }
            
            if (status.status_code === 'ERROR') {
                throw new Error(`Container processing failed: ${status.status}`);
            }
            
            // Wait 2 seconds before next check
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        throw new Error('Container processing timeout');
    }
    
    /**
     * Publish media (step 2 of publishing)
     */
    async publishMedia(containerId) {
        try {
            if (this.mockMode) {
                logger.info('[GRAPH_API] Mock mode - publishing media');
                return {
                    id: `mock_post_${Date.now()}`,
                    permalink: `https://www.instagram.com/p/mock_${Date.now()}/`
                };
            }
            
            const response = await axios.post(
                `${this.baseUrl}/${this.version}/${this.businessAccountId}/media_publish`,
                {
                    creation_id: containerId,
                    access_token: this.accessToken
                }
            );
            
            // Get post details
            const postDetails = await this.getMediaDetails(response.data.id);
            
            logger.info('[GRAPH_API] Media published successfully', {
                mediaId: response.data.id,
                permalink: postDetails.permalink
            });
            
            return {
                id: response.data.id,
                permalink: postDetails.permalink
            };
            
        } catch (error) {
            logger.error('[GRAPH_API] Failed to publish media', {
                containerId,
                error: error.message,
                response: error.response?.data
            });
            throw error;
        }
    }
    
    /**
     * Get media details
     */
    async getMediaDetails(mediaId) {
        try {
            if (this.mockMode) {
                return {
                    id: mediaId,
                    permalink: `https://www.instagram.com/p/${mediaId}/`,
                    timestamp: new Date().toISOString()
                };
            }
            
            const response = await axios.get(
                `${this.baseUrl}/${this.version}/${mediaId}`,
                {
                    params: {
                        fields: 'id,permalink,timestamp,caption',
                        access_token: this.accessToken
                    }
                }
            );
            
            return response.data;
            
        } catch (error) {
            logger.error('[GRAPH_API] Failed to get media details', {
                mediaId,
                error: error.message
            });
            throw error;
        }
    }
    
    /**
     * Main method to post to Instagram
     */
    async postToInstagram(imageUrl, caption = '') {
        try {
            logger.info('[GRAPH_API] Starting Instagram post', {
                mockMode: this.mockMode,
                hasImage: !!imageUrl,
                captionLength: caption.length
            });
            
            // Step 1: Create media container
            const container = await this.createMediaContainer(imageUrl, caption);
            
            // Step 2: Wait for container to be ready
            await this.waitForContainerReady(container.id);
            
            // Step 3: Publish media
            const publishResult = await this.publishMedia(container.id);
            
            return {
                success: true,
                mediaId: publishResult.id,
                permalink: publishResult.permalink,
                message: 'Post published successfully via Graph API'
            };
            
        } catch (error) {
            logger.error('[GRAPH_API] Failed to post to Instagram', {
                error: error.message,
                stack: error.stack
            });
            
            return {
                success: false,
                error: error.message,
                details: error.response?.data?.error || null
            };
        }
    }
    
    /**
     * Get recent posts
     */
    async getRecentPosts(limit = 10) {
        try {
            if (this.mockMode) {
                return Array(limit).fill(null).map((_, i) => ({
                    id: `mock_post_${i}`,
                    caption: `Mock post ${i}`,
                    permalink: `https://www.instagram.com/p/mock_${i}/`,
                    timestamp: new Date(Date.now() - i * 86400000).toISOString()
                }));
            }
            
            const response = await axios.get(
                `${this.baseUrl}/${this.version}/${this.businessAccountId}/media`,
                {
                    params: {
                        fields: 'id,caption,permalink,timestamp,media_type',
                        limit: limit,
                        access_token: this.accessToken
                    }
                }
            );
            
            return response.data.data || [];
            
        } catch (error) {
            logger.error('[GRAPH_API] Failed to get recent posts', {
                error: error.message
            });
            return [];
        }
    }
    
    /**
     * Get health status
     */
    async getHealthStatus() {
        const connectionTest = await this.testConnection();
        
        return {
            status: connectionTest.success ? 'healthy' : 'unhealthy',
            configured: !!this.accessToken && !!this.businessAccountId,
            mockMode: this.mockMode,
            lastCheck: new Date(),
            error: connectionTest.success ? null : connectionTest.message,
            accountInfo: connectionTest.accountInfo || null
        };
    }
    
    /**
     * Initialize OAuth flow
     */
    async initializeOAuth() {
        try {
            if (!this.clientId) {
                return {
                    success: false,
                    error: 'Client ID not configured'
                };
            }
            
            const state = Buffer.from(Math.random().toString()).toString('base64');
            const redirectUri = process.env.GRAPH_API_REDIRECT_URI || 'http://localhost:3001/admin/instagram/oauth/callback';
            
            const authUrl = `https://www.instagram.com/oauth/authorize?` +
                `client_id=${this.clientId}` +
                `&redirect_uri=${encodeURIComponent(redirectUri)}` +
                `&scope=instagram_business_basic,instagram_business_content_publish,instagram_manage_insights` +
                `&response_type=code` +
                `&state=${state}`;
            
            return {
                success: true,
                authUrl,
                state,
                expiresIn: 300 // 5 minutes
            };
            
        } catch (error) {
            logger.error('[GRAPH_API] Failed to initialize OAuth', {
                error: error.message
            });
            
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Complete OAuth flow
     */
    async completeOAuth(code, state) {
        try {
            if (!this.clientId || !this.clientSecret) {
                return {
                    success: false,
                    error: 'Client credentials not configured'
                };
            }
            
            const redirectUri = process.env.GRAPH_API_REDIRECT_URI || 'http://localhost:3001/admin/instagram/oauth/callback';
            
            // Exchange code for access token
            const tokenResponse = await axios.post(
                'https://api.instagram.com/oauth/access_token',
                {
                    client_id: this.clientId,
                    client_secret: this.clientSecret,
                    grant_type: 'authorization_code',
                    redirect_uri: redirectUri,
                    code: code
                }
            );
            
            const { access_token, user_id } = tokenResponse.data;
            
            // Exchange short-lived token for long-lived token
            const longLivedResponse = await axios.get(
                `${this.baseUrl}/access_token`,
                {
                    params: {
                        grant_type: 'ig_exchange_token',
                        client_secret: this.clientSecret,
                        access_token: access_token
                    }
                }
            );
            
            const longLivedToken = longLivedResponse.data.access_token;
            const expiresIn = longLivedResponse.data.expires_in;
            
            // Get user info
            const userResponse = await axios.get(
                `${this.baseUrl}/${this.version}/${user_id}`,
                {
                    params: {
                        fields: 'id,username,account_type',
                        access_token: longLivedToken
                    }
                }
            );
            
            // Update service configuration
            this.accessToken = longLivedToken;
            this.businessAccountId = user_id;
            
            return {
                success: true,
                user: userResponse.data,
                tokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
                message: 'OAuth completed successfully'
            };
            
        } catch (error) {
            logger.error('[GRAPH_API] Failed to complete OAuth', {
                error: error.message,
                response: error.response?.data
            });
            
            return {
                success: false,
                error: error.response?.data?.error_message || error.message
            };
        }
    }
}

// Export singleton instance
module.exports = InstagramApiService;