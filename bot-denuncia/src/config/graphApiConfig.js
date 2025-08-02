/**
 * Instagram Graph API Configuration
 * Government-grade security and reliability configurations
 */

const crypto = require('crypto');
const logger = require('../utils/logger');

class GraphApiConfig {
  constructor() {
    this.validateEnvironment();
    this.initializeConfig();
  }

  /**
   * Validate required environment variables
   */
  validateEnvironment() {
    const required = [
      'INSTAGRAM_APP_ID',
      'INSTAGRAM_APP_SECRET', 
      'INSTAGRAM_REDIRECT_URI',
      'GRAPH_API_VERSION'
    ];

    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required Instagram Graph API environment variables: ${missing.join(', ')}`);
    }

    // Validate format
    if (!process.env.INSTAGRAM_APP_ID.match(/^\d+$/)) {
      throw new Error('INSTAGRAM_APP_ID must be numeric');
    }

    if (!process.env.INSTAGRAM_REDIRECT_URI.startsWith('https://') && process.env.NODE_ENV === 'production') {
      throw new Error('INSTAGRAM_REDIRECT_URI must use HTTPS for production');
    }
    
    logger.info('✅ Instagram Graph API environment variables validated');
  }

  /**
   * Initialize configuration
   */
  initializeConfig() {
    this.config = {
      // Basic App Configuration
      appId: process.env.INSTAGRAM_APP_ID,
      appSecret: process.env.INSTAGRAM_APP_SECRET,
      redirectUri: process.env.INSTAGRAM_REDIRECT_URI,
      apiVersion: process.env.GRAPH_API_VERSION || 'v21.0',

      // API URLs - Using Facebook Login for better reliability  
      baseUrl: `https://graph.facebook.com/${process.env.GRAPH_API_VERSION || 'v21.0'}`,
      authUrl: `https://www.facebook.com/${process.env.GRAPH_API_VERSION || 'v21.0'}/dialog/oauth`,
      tokenUrl: `https://graph.facebook.com/${process.env.GRAPH_API_VERSION || 'v21.0'}/oauth/access_token`,
      
      // Scopes for government compliance system - UPDATED 2025
      // Using OFFICIAL Instagram Business API permissions (validated via Facebook Docs)
      // Configuração baseada em: https://developers.facebook.com/docs/facebook-login/permissions
      scopes: [
        'instagram_basic',              // ✅ OFICIAL 2025: Basic Instagram access
        'instagram_content_publish',    // ✅ OFICIAL 2025: Content publishing capability  
        'pages_read_engagement'         // ✅ OFICIAL 2025: Page engagement data access
      ],

      // Rate Limiting (Instagram Graph API limits)
      rateLimit: {
        // Per user limits
        userCallsPerHour: 200,
        userCallsPerDay: 5000,
        
        // App-level limits  
        appCallsPerHour: 200000,
        appCallsPerDay: 5000000,
        
        // Publishing limits
        postsPerDay: 25,
        postsPerHour: 5,
        
        // Request intervals
        minPostInterval: 12 * 60 * 1000, // 12 minutes between posts
        minApiInterval: 1000, // 1 second between API calls
        
        // Retry configuration
        maxRetries: 3,
        retryBackoffMs: 5000,
        retryMultiplier: 2
      },

      // Security Configuration
      security: {
        tokenEncryptionKey: this.generateEncryptionKey(),
        tokenExpiryBuffer: 7 * 24 * 60 * 60 * 1000, // 7 days before expiry
        maxTokenAge: 60 * 24 * 60 * 60 * 1000, // 60 days max
        webhookSecret: process.env.INSTAGRAM_WEBHOOK_SECRET,
        csrfTokenExpiry: 10 * 60 * 1000, // 10 minutes
      },

      // Media Configuration
      media: {
        maxImageSize: 8 * 1024 * 1024, // 8MB
        supportedFormats: ['image/jpeg', 'image/png'],
        supportedExtensions: ['.jpg', '.jpeg', '.png'],
        dimensions: {
          minWidth: 320,
          minHeight: 320, 
          maxWidth: 1440,
          maxHeight: 1440,
          aspectRatios: {
            square: { min: 0.8, max: 1.91 },
            landscape: { min: 1.91, max: 1.91 },
            portrait: { min: 0.8, max: 1.91 }
          }
        },
        processing: {
          quality: 85,
          progressive: true,
          optimizeForWeb: true
        }
      },

      // Monitoring & Logging
      monitoring: {
        logLevel: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        enableMetrics: true,
        enableTracing: true,
        alertThresholds: {
          errorRate: 0.05, // 5% error rate
          responseTime: 5000, // 5 seconds
          tokenExpiryWarning: 7 * 24 * 60 * 60 * 1000 // 7 days
        }
      },

      // Government Compliance
      compliance: {
        auditLogging: true,
        dataRetention: {
          tokenHistory: 90 * 24 * 60 * 60 * 1000, // 90 days
          apiLogs: 365 * 24 * 60 * 60 * 1000, // 1 year
          errorLogs: 2 * 365 * 24 * 60 * 60 * 1000 // 2 years
        },
        encryption: {
          algorithm: 'aes-256-gcm',
          keyRotationInterval: 30 * 24 * 60 * 60 * 1000 // 30 days
        }
      },

      // Environment-specific settings
      environment: {
        isDevelopment: process.env.NODE_ENV === 'development',
        isProduction: process.env.NODE_ENV === 'production',
        enableDebug: process.env.INSTAGRAM_DEBUG === 'true',
        mockMode: process.env.INSTAGRAM_MOCK_MODE === 'true'
      }
    };

    // Environment-specific adjustments
    if (this.config.environment.isDevelopment) {
      this.config.rateLimit.minPostInterval = 5 * 60 * 1000; // 5 minutes in dev
      this.config.monitoring.logLevel = 'debug';
    }

    if (this.config.environment.mockMode) {
      logger.warn('🔄 Instagram Graph API running in MOCK MODE');
    }

    logger.info('⚙️ Instagram Graph API configuration initialized', {
      apiVersion: this.config.apiVersion,
      environment: process.env.NODE_ENV,
      scopes: this.config.scopes.length,
      mockMode: this.config.environment.mockMode
    });
  }

  /**
   * Generate secure encryption key for token storage
   */
  generateEncryptionKey() {
    // Use environment key if provided, otherwise generate
    if (process.env.INSTAGRAM_TOKEN_ENCRYPTION_KEY) {
      return process.env.INSTAGRAM_TOKEN_ENCRYPTION_KEY;
    }

    // Generate and warn about missing key
    const key = crypto.randomBytes(32).toString('hex');
    logger.warn('⚠️ INSTAGRAM_TOKEN_ENCRYPTION_KEY not set, using generated key. Set this in production!');
    return key;
  }

  /**
   * Get configuration
   */
  get() {
    return this.config;
  }

  /**
   * Get OAuth authorization URL
   */
  getAuthUrl(state = null) {
    const params = new URLSearchParams({
      client_id: this.config.appId,
      redirect_uri: this.config.redirectUri,
      scope: this.config.scopes.join(','),
      response_type: 'code'
    });

    if (state) {
      params.append('state', state);
    }

    return `${this.config.authUrl}?${params.toString()}`;
  }

  /**
   * Validate API response for errors
   */
  validateApiResponse(response) {
    if (response.error) {
      const error = new Error(response.error.message || 'Instagram API Error');
      error.code = response.error.code;
      error.subcode = response.error.error_subcode;
      error.type = response.error.type;
      error.fbtrace_id = response.error.fbtrace_id;
      throw error;
    }
    return response;
  }

  /**
   * Get rate limit headers for response
   */
  getRateLimitHeaders(usage = {}) {
    return {
      'X-RateLimit-User-Calls-Remaining': usage.userCallsRemaining || 'unknown',
      'X-RateLimit-App-Calls-Remaining': usage.appCallsRemaining || 'unknown',
      'X-RateLimit-Reset-Time': usage.resetTime || 'unknown'
    };
  }

  /**
   * Check if request should be rate limited
   */
  shouldRateLimit(lastRequest, type = 'api') {
    if (!lastRequest) return false;

    const now = Date.now();
    const timeSinceLastRequest = now - lastRequest;

    switch (type) {
      case 'post':
        return timeSinceLastRequest < this.config.rateLimit.minPostInterval;
      case 'api':
      default:
        return timeSinceLastRequest < this.config.rateLimit.minApiInterval;
    }
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  calculateRetryDelay(attempt) {
    const baseDelay = this.config.rateLimit.retryBackoffMs;
    const multiplier = this.config.rateLimit.retryMultiplier;
    return baseDelay * Math.pow(multiplier, attempt - 1);
  }

  /**
   * Get webhook verification challenge response
   */
  verifyWebhook(mode, token, challenge) {
    const verifyToken = process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN;
    
    if (mode === 'subscribe' && token === verifyToken) {
      return challenge;
    }
    
    throw new Error('Webhook verification failed');
  }
}

// Export singleton instance
module.exports = new GraphApiConfig();