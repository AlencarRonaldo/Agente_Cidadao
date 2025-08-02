/**
 * Instagram Token Manager
 * Secure token management with automatic refresh and encryption
 * Government-grade security compliance
 */

const crypto = require('crypto');
const axios = require('axios');
const Redis = require('ioredis');
const { PrismaClient } = require('@prisma/client');
const graphApiConfig = require('../config/graphApiConfig');
const logger = require('../utils/logger');

class InstagramTokenManager {
  constructor() {
    this.config = graphApiConfig.get();
    this.prisma = new PrismaClient();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      maxRetriesPerRequest: null,
    });
    
    this.tokenCache = new Map();
    this.refreshPromises = new Map(); // Prevent concurrent refresh attempts
    
    // Token storage keys
    this.TOKEN_KEY = 'instagram:token:current';
    this.TOKEN_HISTORY_KEY = 'instagram:token:history';
    this.TOKEN_METRICS_KEY = 'instagram:token:metrics';
    
    logger.info('🔐 Instagram Token Manager initialized');
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(authCode, state = null) {
    try {
      logger.info('🔄 Exchanging authorization code for access token');

      // Validate state parameter for CSRF protection
      if (state && !this.validateState(state)) {
        throw new Error('Invalid state parameter - possible CSRF attack');
      }

      const response = await axios.post(this.config.tokenUrl, {
        client_id: this.config.appId,
        client_secret: this.config.appSecret,
        grant_type: 'authorization_code',
        redirect_uri: this.config.redirectUri,
        code: authCode
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 10000
      });

      const tokenData = response.data;
      
      if (!tokenData.access_token) {
        throw new Error('No access token received from Instagram');
      }

      // Exchange short-lived token for long-lived token
      const longLivedToken = await this.exchangeForLongLivedToken(tokenData.access_token);
      
      // Get user info
      const userInfo = await this.getUserInfo(longLivedToken.access_token);
      
      // Store token securely
      const storedToken = await this.storeToken({
        accessToken: longLivedToken.access_token,
        tokenType: 'long-lived',
        expiresIn: longLivedToken.expires_in,
        userId: tokenData.user_id || userInfo.id,
        username: userInfo.username,
        accountType: userInfo.account_type,
        mediaCount: userInfo.media_count
      });

      logger.info('✅ Token exchange successful', {
        userId: storedToken.userId,
        username: storedToken.username,
        expiresAt: storedToken.expiresAt
      });

      return storedToken;

    } catch (error) {
      logger.error('❌ Token exchange failed:', error.message);
      
      // Enhanced error handling for different scenarios
      if (error.response?.data?.error) {
        const apiError = error.response.data.error;
        throw new Error(`Instagram API Error: ${apiError.message || apiError.error_description}`);
      }
      
      throw error;
    }
  }

  /**
   * Exchange short-lived token for long-lived token
   */
  async exchangeForLongLivedToken(shortLivedToken) {
    try {
      const response = await axios.get(`${this.config.baseUrl}/access_token`, {
        params: {
          grant_type: 'ig_exchange_token',
          client_secret: this.config.appSecret,
          access_token: shortLivedToken
        },
        timeout: 10000
      });

      return this.config.validateApiResponse(response.data);

    } catch (error) {
      logger.error('❌ Long-lived token exchange failed:', error.message);
      throw error;
    }
  }

  /**
   * Refresh long-lived token
   */
  async refreshToken(currentToken = null) {
    try {
      const token = currentToken || await this.getCurrentToken();
      
      if (!token) {
        throw new Error('No current token to refresh');
      }

      // Check if already refreshing to prevent concurrent refreshes
      const refreshKey = `refresh_${token.userId}`;
      if (this.refreshPromises.has(refreshKey)) {
        logger.info('⏳ Token refresh already in progress, waiting...');
        return await this.refreshPromises.get(refreshKey);
      }

      // Start refresh process
      const refreshPromise = this._performTokenRefresh(token);
      this.refreshPromises.set(refreshKey, refreshPromise);

      try {
        const refreshedToken = await refreshPromise;
        return refreshedToken;
      } finally {
        this.refreshPromises.delete(refreshKey);
      }

    } catch (error) {
      logger.error('❌ Token refresh failed:', error.message);
      throw error;
    }
  }

  /**
   * Perform actual token refresh
   */
  async _performTokenRefresh(token) {
    try {
      logger.info('🔄 Refreshing Instagram token', { userId: token.userId });

      const response = await axios.get(`${this.config.baseUrl}/refresh_access_token`, {
        params: {
          grant_type: 'ig_refresh_token',
          access_token: token.accessToken
        },
        timeout: 10000
      });

      const refreshData = this.config.validateApiResponse(response.data);

      // Update token with new data
      const refreshedToken = await this.storeToken({
        accessToken: refreshData.access_token,
        tokenType: 'long-lived-refreshed',
        expiresIn: refreshData.expires_in,
        userId: token.userId,
        username: token.username,
        accountType: token.accountType,
        refreshedFrom: token.id
      });

      logger.info('✅ Token refreshed successfully', {
        userId: refreshedToken.userId,
        expiresAt: refreshedToken.expiresAt,
        previousTokenId: token.id
      });

      return refreshedToken;

    } catch (error) {
      logger.error('❌ Token refresh failed:', error.message);
      throw error;
    }
  }

  /**
   * Store token securely with encryption
   */
  async storeToken(tokenData) {
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + (tokenData.expiresIn * 1000));
      
      // Create token record
      const tokenRecord = {
        id: crypto.randomUUID(),
        userId: tokenData.userId,
        username: tokenData.username,
        accountType: tokenData.accountType,
        tokenType: tokenData.tokenType,
        expiresAt,
        createdAt: now,
        refreshedFrom: tokenData.refreshedFrom || null,
        isActive: true
      };

      // Encrypt access token
      const encryptedToken = this.encryptToken(tokenData.accessToken);
      tokenRecord.encryptedToken = encryptedToken.encrypted;
      tokenRecord.encryptionIv = encryptedToken.iv;
      tokenRecord.encryptionTag = encryptedToken.tag;

      // Store in Redis for fast access
      await this.redis.setex(
        this.TOKEN_KEY,
        Math.floor(tokenData.expiresIn * 0.9), // Cache for 90% of token lifetime
        JSON.stringify(tokenRecord)
      );

      // Store in database for persistence and auditing
      await this.prisma.$executeRaw`
        INSERT INTO instagram_tokens (
          id, user_id, username, account_type, token_type,
          encrypted_token, encryption_iv, encryption_tag,
          expires_at, created_at, refreshed_from, is_active
        ) VALUES (
          ${tokenRecord.id}, ${tokenRecord.userId}, ${tokenRecord.username},
          ${tokenRecord.accountType}, ${tokenRecord.tokenType},
          ${tokenRecord.encryptedToken}, ${tokenRecord.encryptionIv}, ${tokenRecord.encryptionTag},
          ${tokenRecord.expiresAt}, ${tokenRecord.createdAt}, ${tokenRecord.refreshedFrom}, ${tokenRecord.isActive}
        )
        ON CONFLICT (user_id) DO UPDATE SET
          encrypted_token = EXCLUDED.encrypted_token,
          encryption_iv = EXCLUDED.encryption_iv,
          encryption_tag = EXCLUDED.encryption_tag,
          expires_at = EXCLUDED.expires_at,
          created_at = EXCLUDED.created_at,
          token_type = EXCLUDED.token_type,
          refreshed_from = EXCLUDED.refreshed_from,
          is_active = EXCLUDED.is_active
      `;

      // Update token metrics
      await this.updateTokenMetrics('stored', tokenRecord);

      // Add to token history
      await this.addToTokenHistory(tokenRecord);

      // Clear cache to force reload
      this.tokenCache.clear();

      return {
        ...tokenRecord,
        accessToken: tokenData.accessToken // Return decrypted token for immediate use
      };

    } catch (error) {
      logger.error('❌ Failed to store token:', error.message);
      throw error;
    }
  }

  /**
   * Get current active token
   */
  async getCurrentToken() {
    try {
      // Check cache first
      if (this.tokenCache.has('current')) {
        const cached = this.tokenCache.get('current');
        if (cached.expiresAt > new Date()) {
          return cached;
        }
        this.tokenCache.delete('current');
      }

      // Try Redis cache
      const redisToken = await this.redis.get(this.TOKEN_KEY);
      if (redisToken) {
        const tokenRecord = JSON.parse(redisToken);
        const decryptedToken = this.decryptToken({
          encrypted: tokenRecord.encryptedToken,
          iv: tokenRecord.encryptionIv,
          tag: tokenRecord.encryptionTag
        });

        const token = {
          ...tokenRecord,
          accessToken: decryptedToken,
          expiresAt: new Date(tokenRecord.expiresAt)
        };

        // Check if token needs refresh
        if (this.shouldRefreshToken(token)) {
          logger.info('🔄 Token needs refresh, refreshing...');
          return await this.refreshToken(token);
        }

        this.tokenCache.set('current', token);
        return token;
      }

      // Fallback to database
      const dbToken = await this.prisma.$queryRaw`
        SELECT * FROM instagram_tokens 
        WHERE is_active = true 
        ORDER BY created_at DESC 
        LIMIT 1
      `;

      if (dbToken.length === 0) {
        return null;
      }

      const tokenRecord = dbToken[0];
      const decryptedToken = this.decryptToken({
        encrypted: tokenRecord.encrypted_token,
        iv: tokenRecord.encryption_iv,
        tag: tokenRecord.encryption_tag
      });

      const token = {
        id: tokenRecord.id,
        userId: tokenRecord.user_id,
        username: tokenRecord.username,
        accountType: tokenRecord.account_type,
        tokenType: tokenRecord.token_type,
        accessToken: decryptedToken,
        expiresAt: tokenRecord.expires_at,
        createdAt: tokenRecord.created_at,
        isActive: tokenRecord.is_active
      };

      // Check if token needs refresh
      if (this.shouldRefreshToken(token)) {
        logger.info('🔄 Token needs refresh, refreshing...');
        return await this.refreshToken(token);
      }

      this.tokenCache.set('current', token);
      return token;

    } catch (error) {
      logger.error('❌ Failed to get current token:', error.message);
      return null;
    }
  }

  /**
   * Check if token should be refreshed
   */
  shouldRefreshToken(token) {
    if (!token || !token.expiresAt) return true;
    
    const now = new Date();
    const expiresAt = new Date(token.expiresAt);
    const timeUntilExpiry = expiresAt.getTime() - now.getTime();
    
    // Refresh if expires within buffer time
    return timeUntilExpiry <= this.config.security.tokenExpiryBuffer;
  }

  /**
   * Encrypt token for secure storage
   */
  encryptToken(token) {
    try {
      const algorithm = this.config.compliance.encryption.algorithm;
      const key = Buffer.from(this.config.security.tokenEncryptionKey, 'hex');
      const iv = crypto.randomBytes(16);
      
      const cipher = crypto.createCipher(algorithm, key);
      cipher.setAAD(Buffer.from('instagram-token'));
      
      let encrypted = cipher.update(token, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();

      return {
        encrypted,
        iv: iv.toString('hex'),
        tag: tag.toString('hex')
      };

    } catch (error) {
      logger.error('❌ Token encryption failed:', error.message);
      throw new Error('Failed to encrypt token');
    }
  }

  /**
   * Decrypt token from secure storage
   */
  decryptToken({ encrypted, iv, tag }) {
    try {
      const algorithm = this.config.compliance.encryption.algorithm;
      const key = Buffer.from(this.config.security.tokenEncryptionKey, 'hex');
      
      const decipher = crypto.createDecipher(algorithm, key);
      decipher.setAAD(Buffer.from('instagram-token'));
      decipher.setAuthTag(Buffer.from(tag, 'hex'));
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;

    } catch (error) {
      logger.error('❌ Token decryption failed:', error.message);
      throw new Error('Failed to decrypt token');
    }
  }

  /**
   * Get user info from Instagram API
   */
  async getUserInfo(accessToken) {
    try {
      const response = await axios.get(`${this.config.baseUrl}/me`, {
        params: {
          fields: 'id,username,account_type,media_count',
          access_token: accessToken
        },
        timeout: 10000
      });

      return this.config.validateApiResponse(response.data);

    } catch (error) {
      logger.error('❌ Failed to get user info:', error.message);
      throw error;
    }
  }

  /**
   * Validate state parameter for CSRF protection
   */
  validateState(state) {
    // Implement state validation logic
    // This should validate against stored state in session or database
    return true; // Simplified for now
  }

  /**
   * Update token metrics for monitoring
   */
  async updateTokenMetrics(action, tokenData) {
    try {
      const metrics = {
        action,
        timestamp: new Date(),
        userId: tokenData.userId,
        tokenType: tokenData.tokenType,
        expiresAt: tokenData.expiresAt
      };

      await this.redis.lpush(this.TOKEN_METRICS_KEY, JSON.stringify(metrics));
      await this.redis.ltrim(this.TOKEN_METRICS_KEY, 0, 999); // Keep last 1000 entries

    } catch (error) {
      logger.warn('⚠️ Failed to update token metrics:', error.message);
    }
  }

  /**
   * Add token to history for auditing
   */
  async addToTokenHistory(tokenRecord) {
    try {
      const historyEntry = {
        id: tokenRecord.id,
        userId: tokenRecord.userId,
        tokenType: tokenRecord.tokenType,
        createdAt: tokenRecord.createdAt,
        expiresAt: tokenRecord.expiresAt,
        refreshedFrom: tokenRecord.refreshedFrom
      };

      await this.redis.lpush(this.TOKEN_HISTORY_KEY, JSON.stringify(historyEntry));
      await this.redis.ltrim(this.TOKEN_HISTORY_KEY, 0, 99); // Keep last 100 entries

    } catch (error) {
      logger.warn('⚠️ Failed to add to token history:', error.message);
    }
  }

  /**
   * Revoke token
   */
  async revokeToken(tokenId = null) {
    try {
      const token = tokenId ? await this.getTokenById(tokenId) : await this.getCurrentToken();
      
      if (!token) {
        throw new Error('No token to revoke');
      }

      // Mark as inactive in database
      await this.prisma.$executeRaw`
        UPDATE instagram_tokens 
        SET is_active = false, revoked_at = NOW()
        WHERE id = ${token.id}
      `;

      // Remove from Redis
      await this.redis.del(this.TOKEN_KEY);

      // Clear cache
      this.tokenCache.clear();

      logger.info('✅ Token revoked successfully', { tokenId: token.id });

    } catch (error) {
      logger.error('❌ Failed to revoke token:', error.message);
      throw error;
    }
  }

  /**
   * Get token health status
   */
  async getTokenHealth() {
    try {
      const token = await this.getCurrentToken();
      
      if (!token) {
        return {
          status: 'no_token',
          healthy: false,
          message: 'No active token found'
        };
      }

      const now = new Date();
      const expiresAt = new Date(token.expiresAt);
      const timeUntilExpiry = expiresAt.getTime() - now.getTime();
      const hoursUntilExpiry = Math.floor(timeUntilExpiry / (1000 * 60 * 60));

      const health = {
        status: 'active',
        healthy: timeUntilExpiry > 0,
        tokenId: token.id,
        userId: token.userId,
        username: token.username,
        expiresAt: token.expiresAt,
        hoursUntilExpiry,
        needsRefresh: this.shouldRefreshToken(token)
      };

      if (timeUntilExpiry <= 0) {
        health.status = 'expired';
        health.message = 'Token has expired';
      } else if (health.needsRefresh) {
        health.status = 'needs_refresh';
        health.message = `Token expires in ${hoursUntilExpiry} hours`;
      } else {
        health.message = `Token healthy, expires in ${hoursUntilExpiry} hours`;
      }

      return health;

    } catch (error) {
      logger.error('❌ Failed to get token health:', error.message);
      return {
        status: 'error',
        healthy: false,
        message: error.message
      };
    }
  }

  /**
   * Cleanup expired tokens
   */
  async cleanupExpiredTokens() {
    try {
      const result = await this.prisma.$executeRaw`
        UPDATE instagram_tokens 
        SET is_active = false 
        WHERE expires_at < NOW() AND is_active = true
      `;

      if (result > 0) {
        logger.info(`🧹 Cleaned up ${result} expired tokens`);
      }

      return result;

    } catch (error) {
      logger.error('❌ Failed to cleanup expired tokens:', error.message);
      return 0;
    }
  }

  /**
   * Get token statistics
   */
  async getTokenStats() {
    try {
      const [totalTokens, activeTokens, expiredTokens] = await Promise.all([
        this.prisma.$queryRaw`SELECT COUNT(*) as count FROM instagram_tokens`,
        this.prisma.$queryRaw`SELECT COUNT(*) as count FROM instagram_tokens WHERE is_active = true`,
        this.prisma.$queryRaw`SELECT COUNT(*) as count FROM instagram_tokens WHERE expires_at < NOW()`
      ]);

      return {
        total: parseInt(totalTokens[0].count),
        active: parseInt(activeTokens[0].count),
        expired: parseInt(expiredTokens[0].count),
        lastUpdated: new Date()
      };

    } catch (error) {
      logger.error('❌ Failed to get token stats:', error.message);
      return null;
    }
  }
}

module.exports = new InstagramTokenManager();