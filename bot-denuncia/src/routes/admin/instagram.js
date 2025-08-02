/**
 * Instagram Graph API Admin Routes
 * Administrative endpoints for Instagram Graph API management
 * Government-grade security and monitoring
 */

const express = require('express');
const rateLimit = require('express-rate-limit');
const instagramGraphApiService = require('../../services/instagramGraphApiService');
const tokenManager = require('../../services/instagramTokenManager');
const imageHostingService = require('../../services/imageHostingService');
const migrationManager = require('../../services/instagramMigrationManager');
const auth = require('../../middleware/auth');
const logger = require('../../utils/logger');

const router = express.Router();

// Rate limiting for admin endpoints
const adminRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many admin requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(adminRateLimit);
router.use(auth); // Require authentication for all routes

/**
 * OAuth Management
 */

// Get OAuth authorization URL
router.get('/oauth/init', async (req, res) => {
  try {
    logger.info('Admin initiated OAuth flow', { userId: req.user?.id });

    const result = await instagramGraphApiService.initializeOAuth();

    if (result.success) {
      res.json({
        success: true,
        authUrl: result.authUrl,
        state: result.state,
        expiresIn: result.expiresIn,
        message: 'Authorization URL generated successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        message: 'Failed to generate authorization URL'
      });
    }

  } catch (error) {
    logger.error('❌ OAuth initialization failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Internal server error'
    });
  }
});

// Complete OAuth flow
router.post('/oauth/complete', async (req, res) => {
  try {
    const { code, state } = req.body;

    if (!code || !state) {
      return res.status(400).json({
        success: false,
        message: 'Authorization code and state are required'
      });
    }

    logger.info('Admin completing OAuth flow', { 
      userId: req.user?.id,
      state: state.substring(0, 8) + '...' // Log partial state for security
    });

    const result = await instagramGraphApiService.completeOAuth(code, state);

    if (result.success) {
      res.json({
        success: true,
        user: result.user,
        tokenExpiresAt: result.tokenExpiresAt,
        message: 'OAuth completed successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        message: 'OAuth completion failed'
      });
    }

  } catch (error) {
    logger.error('❌ OAuth completion failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Internal server error'
    });
  }
});

/**
 * Token Management
 */

// Get token health status
router.get('/token/health', async (req, res) => {
  try {
    const health = await tokenManager.getTokenHealth();
    
    res.json({
      success: true,
      data: health,
      message: 'Token health retrieved successfully'
    });

  } catch (error) {
    logger.error('❌ Failed to get token health:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to retrieve token health'
    });
  }
});

// Refresh token manually
router.post('/token/refresh', async (req, res) => {
  try {
    logger.info('Admin manually refreshing token', { userId: req.user?.id });

    const refreshedToken = await tokenManager.refreshToken();

    if (refreshedToken) {
      res.json({
        success: true,
        data: {
          tokenId: refreshedToken.id,
          userId: refreshedToken.userId,
          username: refreshedToken.username,
          expiresAt: refreshedToken.expiresAt
        },
        message: 'Token refreshed successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'No token available to refresh'
      });
    }

  } catch (error) {
    logger.error('❌ Token refresh failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Token refresh failed'
    });
  }
});

// Revoke token
router.post('/token/revoke', async (req, res) => {
  try {
    logger.warn('Admin revoking Instagram token', { userId: req.user?.id });

    await tokenManager.revokeToken();

    res.json({
      success: true,
      message: 'Token revoked successfully'
    });

  } catch (error) {
    logger.error('❌ Token revocation failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Token revocation failed'
    });
  }
});

// Get token statistics
router.get('/token/stats', async (req, res) => {
  try {
    const stats = await tokenManager.getTokenStats();
    
    res.json({
      success: true,
      data: stats,
      message: 'Token statistics retrieved successfully'
    });

  } catch (error) {
    logger.error('❌ Failed to get token stats:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to retrieve token statistics'
    });
  }
});

/**
 * Service Health and Status
 */

// Get overall service health
router.get('/health', async (req, res) => {
  try {
    const health = await instagramGraphApiService.getHealthStatus();
    
    res.json({
      success: true,
      data: health,
      message: 'Service health retrieved successfully'
    });

  } catch (error) {
    logger.error('❌ Failed to get service health:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to retrieve service health'
    });
  }
});

// Test connection
router.post('/test-connection', async (req, res) => {
  try {
    logger.info('Admin testing Instagram Graph API connection', { userId: req.user?.id });

    const result = await instagramGraphApiService.testConnection();

    res.json({
      success: result.success,
      data: result.accountInfo,
      message: result.message,
      error: result.error
    });

  } catch (error) {
    logger.error('❌ Connection test failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Connection test failed'
    });
  }
});

// Get account information
router.get('/account', async (req, res) => {
  try {
    const accountInfo = await instagramGraphApiService.getAccountInfo();

    if (accountInfo) {
      res.json({
        success: true,
        data: accountInfo,
        message: 'Account information retrieved successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'No account information available'
      });
    }

  } catch (error) {
    logger.error('❌ Failed to get account info:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to retrieve account information'
    });
  }
});

// Get recent posts
router.get('/posts/recent', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 25);
    const posts = await instagramGraphApiService.getRecentPosts(limit);

    res.json({
      success: true,
      data: posts,
      count: posts.length,
      message: 'Recent posts retrieved successfully'
    });

  } catch (error) {
    logger.error('❌ Failed to get recent posts:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to retrieve recent posts'
    });
  }
});

/**
 * Image Hosting Management
 */

// Get image hosting statistics  
router.get('/images/stats', async (req, res) => {
  try {
    const stats = await imageHostingService.getHostingStats();
    
    res.json({
      success: true,
      data: stats,
      message: 'Image hosting statistics retrieved successfully'
    });

  } catch (error) {
    logger.error('❌ Failed to get image hosting stats:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to retrieve image hosting statistics'
    });
  }
});

// Cleanup expired images
router.post('/images/cleanup', async (req, res) => {
  try {
    logger.info('Admin initiating image cleanup', { userId: req.user?.id });

    const result = await imageHostingService.cleanupExpiredImages();

    res.json({
      success: true,
      data: result,
      message: 'Image cleanup completed successfully'
    });

  } catch (error) {
    logger.error('❌ Image cleanup failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Image cleanup failed'
    });
  }
});

/**
 * Migration Management
 */

// Get migration status
router.get('/migration/status', async (req, res) => {
  try {
    const status = await migrationManager.getCurrentPhase();
    const stats = await migrationManager.getMigrationStats();
    
    res.json({
      success: true,
      data: {
        status,
        stats
      },
      message: 'Migration status retrieved successfully'
    });

  } catch (error) {
    logger.error('❌ Failed to get migration status:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to retrieve migration status'
    });
  }
});

// Start testing phase
router.post('/migration/start-testing', async (req, res) => {
  try {
    logger.info('Admin starting migration testing phase', { userId: req.user?.id });

    const result = await migrationManager.startTesting();

    res.json({
      success: result.success,
      data: result,
      message: result.success ? 'Testing phase started successfully' : 'Failed to start testing phase',
      error: result.error
    });

  } catch (error) {
    logger.error('❌ Failed to start testing phase:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to start testing phase'
    });
  }
});

// Start rollout phase
router.post('/migration/start-rollout', async (req, res) => {
  try {
    logger.info('Admin starting migration rollout phase', { userId: req.user?.id });

    const result = await migrationManager.startRollout();

    res.json({
      success: result.success,
      data: result,
      message: result.success ? 'Rollout phase started successfully' : 'Failed to start rollout phase',
      error: result.error
    });

  } catch (error) {
    logger.error('❌ Failed to start rollout phase:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to start rollout phase'
    });
  }
});

// Complete migration
router.post('/migration/complete', async (req, res) => {
  try {
    logger.info('Admin completing migration to Graph API', { userId: req.user?.id });

    const result = await migrationManager.completeMigration();

    res.json({
      success: result.success,
      data: result,
      message: result.success ? 'Migration completed successfully' : 'Failed to complete migration',
      error: result.error
    });

  } catch (error) {
    logger.error('❌ Failed to complete migration:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to complete migration'
    });
  }
});

// Rollback migration
router.post('/migration/rollback', async (req, res) => {
  try {
    const { reason } = req.body;
    
    logger.warn('Admin initiating migration rollback', { 
      userId: req.user?.id,
      reason
    });

    const result = await migrationManager.rollback(reason || 'Manual admin rollback');

    res.json({
      success: result.success,
      data: result,
      message: result.success ? 'Rollback completed successfully' : 'Rollback failed',
      error: result.error
    });

  } catch (error) {
    logger.error('❌ Rollback failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Rollback failed'
    });
  }
});

// Manage test users
router.post('/migration/test-users/add', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const success = await migrationManager.addTestUser(userId);

    res.json({
      success,
      message: success ? 'Test user added successfully' : 'Failed to add test user'
    });

  } catch (error) {
    logger.error('❌ Failed to add test user:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to add test user'
    });
  }
});

router.post('/migration/test-users/remove', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const success = await migrationManager.removeTestUser(userId);

    res.json({
      success,
      message: success ? 'Test user removed successfully' : 'Failed to remove test user'
    });

  } catch (error) {
    logger.error('❌ Failed to remove test user:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to remove test user'
    });
  }
});

/**
 * Audit and Monitoring
 */

// Get audit statistics
router.get('/audit/stats', async (req, res) => {
  try {
    const stats = await instagramGraphApiService.getAuditStats();
    
    res.json({
      success: true,
      data: stats,
      message: 'Audit statistics retrieved successfully'
    });

  } catch (error) {
    logger.error('❌ Failed to get audit stats:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to retrieve audit statistics'
    });
  }
});

/**
 * Emergency Controls
 */

// Emergency stop (switch to private API immediately)
router.post('/emergency/stop', async (req, res) => {
  try {
    const { reason } = req.body;
    
    logger.error('🚨 EMERGENCY STOP initiated by admin', { 
      userId: req.user?.id,
      reason
    });

    // Force rollback to private API
    const result = await migrationManager.rollback(`EMERGENCY STOP: ${reason || 'Admin emergency action'}`);

    res.json({
      success: result.success,
      data: result,
      message: 'Emergency stop executed',
      error: result.error
    });

  } catch (error) {
    logger.error('❌ Emergency stop failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Emergency stop failed'
    });
  }
});

module.exports = router;