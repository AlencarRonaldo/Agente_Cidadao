/**
 * Instagram Graph API Service
 * Government-grade secure service for Instagram content publishing
 * Replaces instagram-private-api with official Graph API
 */

const axios = require('axios');
const Redis = require('ioredis');
const { PrismaClient } = require('@prisma/client');
const graphApiConfig = require('../config/graphApiConfig');
const tokenManager = require('./instagramTokenManager');
const imageHostingService = require('./imageHostingService');
const logger = require('../utils/logger');

class InstagramGraphApiService {
  constructor() {
    this.config = graphApiConfig.get();
    this.prisma = new PrismaClient();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      maxRetriesPerRequest: null,
    });

    // Rate limiting state
    this.rateLimitState = {
      lastApiCall: 0,
      lastPostCall: 0,
      apiCallsThisHour: 0,
      postsToday: 0,
      hourlyResetTime: Date.now() + (60 * 60 * 1000),
      dailyResetTime: Date.now() + (24 * 60 * 60 * 1000)
    };

    // Request tracking for government compliance
    this.requestAudit = [];

    logger.info('📸 Instagram Graph API Service initialized', {
      apiVersion: this.config.apiVersion,
      mockMode: this.config.environment.mockMode
    });
  }

  /**
   * Initialize OAuth flow - get authorization URL
   */
  async initializeOAuth(state = null) {
    try {
      // Generate secure state parameter if not provided
      if (!state) {
        state = this.generateSecureState();
        // Store state in Redis for validation
        await this.redis.setex(`oauth:state:${state}`, 600, JSON.stringify({
          created: Date.now(),
          ip: 'system'
        }));
      }

      const authUrl = this.config.getAuthUrl(state);
      
      logger.info('🔗 OAuth authorization URL generated', { state });
      
      return {
        success: true,
        authUrl,
        state,
        expiresIn: 600 // 10 minutes
      };

    } catch (error) {
      logger.error('❌ Failed to initialize OAuth:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Complete OAuth flow with authorization code
   */
  async completeOAuth(authCode, state) {
    try {
      logger.info('🔄 Completing OAuth flow', { state });

      // Validate state parameter
      const storedState = await this.redis.get(`oauth:state:${state}`);
      if (!storedState) {
        throw new Error('Invalid or expired state parameter');
      }

      // Clean up state
      await this.redis.del(`oauth:state:${state}`);

      // Exchange code for token
      const tokenResult = await tokenManager.exchangeCodeForToken(authCode, state);

      // Audit log the OAuth completion
      await this.auditLog('oauth_completed', {
        userId: tokenResult.userId,
        username: tokenResult.username,
        accountType: tokenResult.accountType
      });

      logger.info('✅ OAuth flow completed successfully', {
        userId: tokenResult.userId,
        username: tokenResult.username
      });

      return {
        success: true,
        user: {
          id: tokenResult.userId,
          username: tokenResult.username,
          accountType: tokenResult.accountType
        },
        tokenExpiresAt: tokenResult.expiresAt
      };

    } catch (error) {
      logger.error('❌ OAuth completion failed:', error.message);
      await this.auditLog('oauth_failed', { error: error.message });
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Publish post to Instagram (main method compatible with existing system)
   */
  async publicar({ texto, imagem, vereadores, bairro }) {
    const startTime = Date.now();
    
    try {
      logger.info('📤 Starting Instagram Graph API publication', {
        hasText: !!texto,
        hasImage: !!imagem,
        vereadores: vereadores?.length || 0,
        bairro
      });

      // Mock mode for testing
      if (this.config.environment.mockMode) {
        return await this.mockPublication({ texto, imagem, vereadores, bairro });
      }

      // Validate inputs
      if (!texto || !imagem) {
        throw new Error('Text and image are required for publication');
      }

      // Get current token
      const token = await tokenManager.getCurrentToken();
      if (!token) {
        throw new Error('No active Instagram token found. Please re-authenticate.');
      }

      // Check rate limits
      await this.enforceRateLimit('post');

      // Process and upload image to hosting service
      const imageResult = await imageHostingService.uploadImageForGraphApi(imagem, {
        bairro,
        vereadores: vereadores?.length || 0,
        source: 'citizen_complaint'
      });

      if (!imageResult.success) {
        throw new Error(`Image processing failed: ${imageResult.error}`);
      }

      // Prepare caption with hashtags
      const processedCaption = this.processCaptionWithHashtags(texto, vereadores, bairro);

      // Create container for the media
      const containerResult = await this.createMediaContainer(
        token.accessToken,
        imageResult.publicUrl,
        processedCaption
      );

      if (!containerResult.success) {
        throw new Error(`Failed to create media container: ${containerResult.error}`);
      }

      // Publish the container
      const publishResult = await this.publishMediaContainer(
        token.accessToken,
        containerResult.containerId
      );

      if (!publishResult.success) {
        throw new Error(`Failed to publish media: ${publishResult.error}`);
      }

      const processingTime = Date.now() - startTime;
      
      // Audit log successful publication
      await this.auditLog('post_published', {
        postId: publishResult.mediaId,
        userId: token.userId,
        processingTime,
        imageId: imageResult.imageId,
        containerId: containerResult.containerId
      });

      // Update rate limit counters
      this.updateRateLimitCounters('post');

      logger.info('✅ Instagram post published successfully via Graph API', {
        mediaId: publishResult.mediaId,
        permalink: publishResult.permalink,
        processingTime
      });

      return {
        success: true,
        postId: publishResult.mediaId,
        postUrl: publishResult.permalink,
        timestamp: new Date().toISOString(),
        processingTime,
        imageId: imageResult.imageId,
        containerId: containerResult.containerId
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      logger.error('❌ Instagram Graph API publication failed:', {
        message: error.message,
        processingTime,
        stack: error.stack
      });

      // Audit log failed publication
      await this.auditLog('post_failed', {
        error: error.message,
        processingTime,
        inputs: { hasText: !!texto, hasImage: !!imagem }
      });

      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        processingTime
      };
    }
  }

  /**
   * Create media container
   */
  async createMediaContainer(accessToken, imageUrl, caption) {
    try {
      const response = await this.makeApiRequest('POST', '/me/media', {
        image_url: imageUrl,
        caption: caption,
        access_token: accessToken
      });

      return {
        success: true,
        containerId: response.id
      };

    } catch (error) {
      logger.error('❌ Failed to create media container:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Publish media container
   */
  async publishMediaContainer(accessToken, containerId) {
    try {
      const response = await this.makeApiRequest('POST', '/me/media_publish', {
        creation_id: containerId,
        access_token: accessToken
      });

      // Get media permalink
      const mediaInfo = await this.getMediaInfo(accessToken, response.id);

      return {
        success: true,
        mediaId: response.id,
        permalink: mediaInfo.permalink
      };

    } catch (error) {
      logger.error('❌ Failed to publish media container:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get media information
   */
  async getMediaInfo(accessToken, mediaId) {
    try {
      const response = await this.makeApiRequest('GET', `/${mediaId}`, {
        fields: 'id,media_type,media_url,permalink,caption,timestamp',
        access_token: accessToken
      });

      return response;

    } catch (error) {
      logger.error('❌ Failed to get media info:', error.message);
      return null;
    }
  }

  /**
   * Make API request with error handling and rate limiting
   */
  async makeApiRequest(method, endpoint, params = {}, retries = 0) {
    try {
      await this.enforceRateLimit('api');

      const url = `${this.config.baseUrl}${endpoint}`;
      const config = {
        method,
        url,
        timeout: 30000,
        headers: {
          'User-Agent': 'BotDenuncia/1.0 Government-System',
          'X-Request-ID': this.generateRequestId()
        }
      };

      if (method === 'GET') {
        config.params = params;
      } else {
        config.data = params;
        config.headers['Content-Type'] = 'application/x-www-form-urlencoded';
      }

      logger.debug('🌐 Making Graph API request', {
        method,
        endpoint,
        hasAccessToken: !!params.access_token
      });

      const response = await axios(config);
      
      // Validate response
      this.config.validateApiResponse(response.data);

      // Update rate limit counters
      this.updateRateLimitCounters('api');

      // Audit successful API call
      await this.auditApiCall(endpoint, method, 'success', response.status);

      return response.data;

    } catch (error) {
      // Audit failed API call
      await this.auditApiCall(endpoint, method, 'error', error.response?.status);

      // Handle rate limit errors
      if (error.response?.status === 429) {
        const retryAfter = error.response.headers['retry-after'] || 60;
        logger.warn(`⏳ Rate limited, waiting ${retryAfter}s before retry`, {
          endpoint,
          retryAfter
        });
        
        if (retries < this.config.rateLimit.maxRetries) {
          await this.sleep(retryAfter * 1000);
          return this.makeApiRequest(method, endpoint, params, retries + 1);
        }
      }

      // Handle other errors
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error.message || 'Instagram API Error');
      }

      throw error;
    }
  }

  /**
   * Process caption with hashtags
   */
  processCaptionWithHashtags(texto, vereadores, bairro) {
    let caption = texto;

    // Generate hashtags based on vereadores and location
    const hashtags = this.generateHashtags(vereadores, bairro);
    
    if (hashtags.length > 0) {
      caption += '\n\n' + hashtags.join(' ');
    }

    // Ensure caption doesn't exceed Instagram limits (2200 characters)
    if (caption.length > 2200) {
      const maxTextLength = 2200 - (hashtags.join(' ').length + 10);
      caption = texto.substring(0, maxTextLength) + '...\n\n' + hashtags.join(' ');
    }

    return caption;
  }

  /**
   * Generate hashtags for the post
   */
  generateHashtags(vereadores, bairro) {
    const hashtags = [
      '#DenunciaCidada',
      '#SaoBernardodoCampo',
      '#FiscalizacaoCidada',
      '#TransparenciaPublica'
    ];

    // Add neighborhood hashtag
    if (bairro) {
      const cleanBairro = bairro.replace(/\s+/g, '').replace(/[^\w]/g, '');
      hashtags.push(`#${cleanBairro}`);
    }

    // Add vereador hashtags
    if (vereadores && Array.isArray(vereadores)) {
      vereadores.slice(0, 3).forEach(vereador => { // Limit to 3 vereadores
        try {
          let handle = '';
          if (typeof vereador === 'string') {
            handle = vereador.replace('@', '').replace(/\s+/g, '').toLowerCase();
          } else if (vereador && typeof vereador === 'object') {
            handle = (vereador.instagram || vereador.nome || '')
              .replace('@', '')
              .replace(/\s+/g, '')
              .toLowerCase();
          }
          
          if (handle && handle.length > 0) {
            hashtags.push(`#${handle}`);
          }
        } catch (error) {
          logger.warn('⚠️ Error processing vereador hashtag:', vereador);
        }
      });
    }

    // Limit total hashtags to 30 (Instagram limit)
    const uniqueHashtags = [...new Set(hashtags)];
    return uniqueHashtags.slice(0, 30);
  }

  /**
   * Enforce rate limiting
   */
  async enforceRateLimit(type = 'api') {
    const now = Date.now();

    // Reset counters if needed
    if (now >= this.rateLimitState.hourlyResetTime) {
      this.rateLimitState.apiCallsThisHour = 0;
      this.rateLimitState.hourlyResetTime = now + (60 * 60 * 1000);
    }

    if (now >= this.rateLimitState.dailyResetTime) {
      this.rateLimitState.postsToday = 0;
      this.rateLimitState.dailyResetTime = now + (24 * 60 * 60 * 1000);
    }

    // Check rate limits
    if (type === 'post') {
      // Check posts per day limit
      if (this.rateLimitState.postsToday >= this.config.rateLimit.postsPerDay) {
        throw new Error(`Daily post limit exceeded (${this.config.rateLimit.postsPerDay})`);
      }

      // Check minimum interval between posts
      const timeSinceLastPost = now - this.rateLimitState.lastPostCall;
      if (timeSinceLastPost < this.config.rateLimit.minPostInterval) {
        const waitTime = this.config.rateLimit.minPostInterval - timeSinceLastPost;
        logger.info(`⏳ Waiting ${Math.round(waitTime/1000)}s between posts (rate limiting)`);
        await this.sleep(waitTime);
      }
    }

    // Check API calls per hour
    if (this.rateLimitState.apiCallsThisHour >= this.config.rateLimit.userCallsPerHour) {
      throw new Error(`Hourly API call limit exceeded (${this.config.rateLimit.userCallsPerHour})`);
    }

    // Check minimum interval between API calls
    const timeSinceLastApi = now - this.rateLimitState.lastApiCall;
    if (timeSinceLastApi < this.config.rateLimit.minApiInterval) {
      const waitTime = this.config.rateLimit.minApiInterval - timeSinceLastApi;
      await this.sleep(waitTime);
    }
  }

  /**
   * Update rate limit counters
   */
  updateRateLimitCounters(type) {
    const now = Date.now();
    
    if (type === 'post') {
      this.rateLimitState.lastPostCall = now;
      this.rateLimitState.postsToday++;
    }
    
    this.rateLimitState.lastApiCall = now;
    this.rateLimitState.apiCallsThisHour++;
  }

  /**
   * Mock publication for testing
   */
  async mockPublication({ texto, imagem, vereadores, bairro }) {
    await this.sleep(1000 + Math.random() * 2000); // Simulate API delay

    const mockId = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    logger.info('🔄 Mock publication completed', {
      mockId,
      texto: texto?.substring(0, 50) + '...',
      vereadores: vereadores?.length || 0
    });

    return {
      success: true,
      postId: mockId,
      postUrl: `https://www.instagram.com/p/${mockId}/`,
      timestamp: new Date().toISOString(),
      processingTime: 1500,
      mock: true
    };
  }

  /**
   * Get account information
   */
  async getAccountInfo() {
    try {
      const token = await tokenManager.getCurrentToken();
      if (!token) {
        throw new Error('No active token found');
      }

      const response = await this.makeApiRequest('GET', '/me', {
        fields: 'id,username,account_type,media_count',
        access_token: token.accessToken
      });

      return {
        id: response.id,
        username: response.username,
        accountType: response.account_type,
        mediaCount: response.media_count,
        tokenExpiresAt: token.expiresAt
      };

    } catch (error) {
      logger.error('❌ Failed to get account info:', error.message);
      return null;
    }
  }

  /**
   * Get recent posts
   */
  async getRecentPosts(limit = 10) {
    try {
      const token = await tokenManager.getCurrentToken();
      if (!token) {
        throw new Error('No active token found');
      }

      const response = await this.makeApiRequest('GET', '/me/media', {
        fields: 'id,media_type,media_url,permalink,caption,timestamp',
        limit: Math.min(limit, 25), // Instagram API limit
        access_token: token.accessToken
      });

      return response.data.map(post => ({
        id: post.id,
        mediaType: post.media_type,
        mediaUrl: post.media_url,
        permalink: post.permalink,
        caption: post.caption,
        timestamp: post.timestamp
      }));

    } catch (error) {
      logger.error('❌ Failed to get recent posts:', error.message);
      return [];
    }
  }

  /**
   * Get service health status
   */
  async getHealthStatus() {
    try {
      const tokenHealth = await tokenManager.getTokenHealth();
      const imageHostingStats = await imageHostingService.getHostingStats();
      
      return {
        service: 'instagram_graph_api',
        status: tokenHealth.healthy ? 'healthy' : 'degraded',
        token: tokenHealth,
        imageHosting: imageHostingStats,
        rateLimit: {
          apiCallsThisHour: this.rateLimitState.apiCallsThisHour,
          postsToday: this.rateLimitState.postsToday,
          limits: {
            apiCallsPerHour: this.config.rateLimit.userCallsPerHour,
            postsPerDay: this.config.rateLimit.postsPerDay
          }
        },
        lastChecked: new Date().toISOString()
      };

    } catch (error) {
      logger.error('❌ Failed to get health status:', error.message);
      return {
        service: 'instagram_graph_api',
        status: 'error',
        error: error.message,
        lastChecked: new Date().toISOString()
      };
    }
  }

  /**
   * Utility functions
   */
  generateSecureState() {
    return require('crypto').randomBytes(32).toString('hex');
  }

  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Audit logging for government compliance
   */
  async auditLog(action, data) {
    try {
      const auditEntry = {
        timestamp: new Date().toISOString(),
        action,
        data,
        service: 'instagram_graph_api'
      };

      // Store in Redis for immediate access
      await this.redis.lpush('audit:instagram', JSON.stringify(auditEntry));
      await this.redis.ltrim('audit:instagram', 0, 9999); // Keep last 10k entries

      // Also log to main logger for persistent storage
      logger.info(`[AUDIT] ${action}`, data);

    } catch (error) {
      logger.error('❌ Failed to write audit log:', error.message);
    }
  }

  /**
   * API call auditing
   */
  async auditApiCall(endpoint, method, status, statusCode) {
    try {
      const entry = {
        timestamp: new Date().toISOString(),
        endpoint,
        method,
        status,
        statusCode,
        service: 'instagram_graph_api'
      };

      await this.redis.lpush('audit:api_calls', JSON.stringify(entry));
      await this.redis.ltrim('audit:api_calls', 0, 4999); // Keep last 5k entries

    } catch (error) {
      logger.warn('⚠️ Failed to audit API call:', error.message);
    }
  }

  /**
   * Get audit statistics
   */
  async getAuditStats() {
    try {
      const [auditCount, apiCallCount] = await Promise.all([
        this.redis.llen('audit:instagram'),
        this.redis.llen('audit:api_calls')
      ]);

      return {
        totalAuditEntries: auditCount,
        totalApiCalls: apiCallCount,
        lastUpdated: new Date().toISOString()
      };

    } catch (error) {
      logger.error('❌ Failed to get audit stats:', error.message);
      return null;
    }
  }

  /**
   * Test connection to Instagram API
   */
  async testConnection() {
    try {
      logger.info('🔍 Testing Instagram Graph API connection...');

      const accountInfo = await this.getAccountInfo();
      
      if (accountInfo) {
        logger.info('✅ Instagram Graph API connection successful', {
          username: accountInfo.username,
          accountType: accountInfo.accountType
        });
        
        return {
          success: true,
          accountInfo,
          message: 'Connection successful'
        };
      } else {
        throw new Error('Failed to retrieve account information');
      }

    } catch (error) {
      logger.error('❌ Instagram Graph API connection test failed:', error.message);
      
      return {
        success: false,
        error: error.message,
        message: 'Connection failed'
      };
    }
  }
}

module.exports = new InstagramGraphApiService();