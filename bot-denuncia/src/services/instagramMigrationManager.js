/**
 * Instagram Migration Manager
 * Phased migration from instagram-private-api to Instagram Graph API
 * Government-grade reliability with safe rollback capabilities
 */

const Redis = require('ioredis');
const { PrismaClient } = require('@prisma/client');
const instagramService = require('./instagramService'); // Original private API service
const instagramGraphApiService = require('./instagramGraphApiService'); // New Graph API service
const tokenManager = require('./instagramTokenManager');
const imageHostingService = require('./imageHostingService');
const logger = require('../utils/logger');

class InstagramMigrationManager {
  constructor() {
    this.prisma = new PrismaClient();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      maxRetriesPerRequest: null,
    });

    // Migration state
    this.migrationState = {
      phase: 'private_api', // private_api, testing, rollout, graph_api, rollback
      rolloutPercentage: 0,
      startedAt: null,
      completedAt: null,
      rollbackReason: null
    };

    // Migration configuration
    this.config = {
      testDuration: 24 * 60 * 60 * 1000, // 24 hours
      rolloutSteps: [10, 25, 50, 75, 100], // Gradual rollout percentages
      rolloutStepDuration: 2 * 60 * 60 * 1000, // 2 hours per step
      maxErrorRate: 0.05, // 5% max error rate before rollback
      minSuccessRate: 0.95, // 95% min success rate
      rollbackTimeout: 5 * 60 * 1000, // 5 minutes for rollback
    };

    this.initializeMigrationState();
    
    logger.info('🔄 Instagram Migration Manager initialized', {
      currentPhase: this.migrationState.phase,
      rolloutPercentage: this.migrationState.rolloutPercentage
    });
  }

  /**
   * Initialize migration state from Redis
   */
  async initializeMigrationState() {
    try {
      const savedState = await this.redis.get('migration:instagram:state');
      if (savedState) {
        this.migrationState = { ...this.migrationState, ...JSON.parse(savedState) };
      }
    } catch (error) {
      logger.warn('⚠️ Failed to load migration state, using defaults:', error.message);
    }
  }

  /**
   * Save migration state to Redis
   */
  async saveMigrationState() {
    try {
      await this.redis.set(
        'migration:instagram:state',
        JSON.stringify(this.migrationState),
        'EX',
        7 * 24 * 60 * 60 // 7 days expiry
      );
    } catch (error) {
      logger.error('❌ Failed to save migration state:', error.message);
    }
  }

  /**
   * Determine which service to use for a publication
   */
  async getServiceForPublication(denunciaId, userId = null) {
    try {
      const currentPhase = await this.getCurrentPhase();
      
      switch (currentPhase.phase) {
        case 'private_api':
          return {
            service: instagramService,
            serviceType: 'private_api',
            reason: 'Migration phase: private API only'
          };

        case 'testing':
          // Use Graph API for test publications only
          const isTestUser = await this.isTestUser(userId);
          if (isTestUser) {
            return {
              service: instagramGraphApiService,
              serviceType: 'graph_api',
              reason: 'Testing phase: test user'
            };
          }
          return {
            service: instagramService,
            serviceType: 'private_api',
            reason: 'Testing phase: regular user'
          };

        case 'rollout':
          // Gradual rollout based on percentage
          const shouldUseGraphApi = await this.shouldUseGraphApi(denunciaId);
          if (shouldUseGraphApi) {
            return {
              service: instagramGraphApiService,
              serviceType: 'graph_api',
              reason: `Rollout phase: ${currentPhase.rolloutPercentage}% rollout`
            };
          }
          return {
            service: instagramService,
            serviceType: 'private_api',
            reason: `Rollout phase: not in ${currentPhase.rolloutPercentage}% rollout`
          };

        case 'graph_api':
          return {
            service: instagramGraphApiService,
            serviceType: 'graph_api',
            reason: 'Migration complete: Graph API only'
          };

        case 'rollback':
          return {
            service: instagramService,
            serviceType: 'private_api',
            reason: `Rollback active: ${currentPhase.rollbackReason}`
          };

        default:
          logger.warn('⚠️ Unknown migration phase, defaulting to private API', {
            phase: currentPhase.phase
          });
          return {
            service: instagramService,
            serviceType: 'private_api',
            reason: 'Unknown phase: defaulting to private API'
          };
      }

    } catch (error) {
      logger.error('❌ Error determining service for publication:', error.message);
      // Fallback to private API on error
      return {
        service: instagramService,
        serviceType: 'private_api',
        reason: 'Error fallback: using private API'
      };
    }
  }

  /**
   * Start migration to testing phase
   */
  async startTesting() {
    try {
      logger.info('🧪 Starting migration testing phase');

      // Verify Graph API readiness
      const graphApiHealth = await instagramGraphApiService.getHealthStatus();
      if (graphApiHealth.status !== 'healthy') {
        throw new Error(`Graph API not ready: ${graphApiHealth.error || 'Unknown error'}`);
      }

      // Verify token availability
      const tokenHealth = await tokenManager.getTokenHealth();
      if (!tokenHealth.healthy) {
        throw new Error(`Instagram token not healthy: ${tokenHealth.message}`);
      }

      // Update migration state
      this.migrationState = {
        phase: 'testing',
        rolloutPercentage: 0,
        startedAt: new Date(),
        completedAt: null,
        rollbackReason: null
      };

      await this.saveMigrationState();
      await this.logMigrationEvent('testing_started', {
        tokenHealth,
        graphApiHealth
      });

      logger.info('✅ Migration testing phase started successfully');

      return {
        success: true,
        phase: 'testing',
        message: 'Testing phase started successfully'
      };

    } catch (error) {
      logger.error('❌ Failed to start testing phase:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Start gradual rollout
   */
  async startRollout() {
    try {
      const currentPhase = await this.getCurrentPhase();
      
      if (currentPhase.phase !== 'testing') {
        throw new Error('Cannot start rollout: not in testing phase');
      }

      // Analyze testing results
      const testResults = await this.analyzeTestingResults();
      if (!testResults.readyForRollout) {
        throw new Error(`Testing results not satisfactory: ${testResults.reason}`);
      }

      logger.info('🚀 Starting migration rollout phase', {
        testResults
      });

      // Start first rollout step
      const firstStep = this.config.rolloutSteps[0];
      
      this.migrationState = {
        phase: 'rollout',
        rolloutPercentage: firstStep,
        startedAt: currentPhase.startedAt,
        rolloutStartedAt: new Date(),
        currentStepStartedAt: new Date(),
        completedAt: null,
        rollbackReason: null
      };

      await this.saveMigrationState();
      await this.logMigrationEvent('rollout_started', {
        percentage: firstStep,
        testResults
      });

      // Schedule next rollout steps
      this.scheduleNextRolloutStep();

      logger.info('✅ Migration rollout phase started successfully', {
        initialPercentage: firstStep
      });

      return {
        success: true,
        phase: 'rollout',
        rolloutPercentage: firstStep,
        message: 'Rollout phase started successfully'
      };

    } catch (error) {
      logger.error('❌ Failed to start rollout phase:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Complete migration to Graph API only
   */
  async completeMigration() {
    try {
      const currentPhase = await this.getCurrentPhase();
      
      if (currentPhase.phase !== 'rollout' || currentPhase.rolloutPercentage < 100) {
        throw new Error('Cannot complete migration: rollout not at 100%');
      }

      // Final health checks
      const [graphApiHealth, tokenHealth] = await Promise.all([
        instagramGraphApiService.getHealthStatus(),
        tokenManager.getTokenHealth()
      ]);

      if (graphApiHealth.status !== 'healthy' || !tokenHealth.healthy) {
        throw new Error('Health checks failed before completing migration');
      }

      logger.info('🎯 Completing migration to Graph API');

      this.migrationState = {
        ...this.migrationState,
        phase: 'graph_api',
        completedAt: new Date(),
        rollbackReason: null
      };

      await this.saveMigrationState();
      await this.logMigrationEvent('migration_completed', {
        graphApiHealth,
        tokenHealth,
        totalDuration: Date.now() - new Date(currentPhase.startedAt).getTime()
      });

      logger.info('✅ Migration to Graph API completed successfully');

      return {
        success: true,
        phase: 'graph_api',
        message: 'Migration completed successfully'
      };

    } catch (error) {
      logger.error('❌ Failed to complete migration:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Rollback to private API
   */
  async rollback(reason = 'Manual rollback') {
    try {
      logger.warn('🔄 Starting rollback to private API', { reason });

      const currentPhase = await this.getCurrentPhase();
      const rollbackStart = Date.now();

      // Test private API health
      const privateApiHealth = await instagramService.testConnection();
      if (!privateApiHealth.success) {
        throw new Error(`Private API not available for rollback: ${privateApiHealth.error}`);
      }

      this.migrationState = {
        ...this.migrationState,
        phase: 'rollback',
        rolloutPercentage: 0,
        rollbackReason: reason,
        rollbackStartedAt: new Date()
      };

      await this.saveMigrationState();
      await this.logMigrationEvent('rollback_started', {
        reason,
        previousPhase: currentPhase.phase,
        privateApiHealth
      });

      // Wait for rollback timeout to ensure all in-flight requests complete
      await this.sleep(this.config.rollbackTimeout);

      // Update to private API phase
      this.migrationState.phase = 'private_api';
      await this.saveMigrationState();

      const rollbackDuration = Date.now() - rollbackStart;
      
      await this.logMigrationEvent('rollback_completed', {
        reason,
        duration: rollbackDuration
      });

      logger.info('✅ Rollback to private API completed successfully', {
        reason,
        duration: rollbackDuration
      });

      return {
        success: true,
        phase: 'private_api',
        message: 'Rollback completed successfully',
        reason
      };

    } catch (error) {
      logger.error('❌ Rollback failed:', error.message);
      
      await this.logMigrationEvent('rollback_failed', {
        reason,
        error: error.message
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get current migration phase
   */
  async getCurrentPhase() {
    await this.initializeMigrationState();
    return this.migrationState;
  }

  /**
   * Check if should use Graph API based on rollout percentage
   */
  async shouldUseGraphApi(denunciaId) {
    const hash = this.hashString(denunciaId);
    const percentage = hash % 100;
    return percentage < this.migrationState.rolloutPercentage;
  }

  /**
   * Check if user is a test user
   */
  async isTestUser(userId) {
    if (!userId) return false;
    
    try {
      // Check if user is in test user list
      const testUsers = await this.redis.smembers('migration:test_users');
      return testUsers.includes(userId);
    } catch (error) {
      logger.warn('⚠️ Failed to check test user status:', error.message);
      return false;
    }
  }

  /**
   * Add test user
   */
  async addTestUser(userId) {
    try {
      await this.redis.sadd('migration:test_users', userId);
      logger.info('✅ Test user added', { userId });
      return true;
    } catch (error) {
      logger.error('❌ Failed to add test user:', error.message);
      return false;
    }
  }

  /**
   * Remove test user
   */
  async removeTestUser(userId) {
    try {
      await this.redis.srem('migration:test_users', userId);
      logger.info('✅ Test user removed', { userId });
      return true;
    } catch (error) {
      logger.error('❌ Failed to remove test user:', error.message);
      return false;
    }
  }

  /**
   * Analyze testing results
   */
  async analyzeTestingResults() {
    try {
      // Get test metrics from the last 24 hours
      const testMetrics = await this.getTestMetrics();
      
      const successRate = testMetrics.total > 0 ? testMetrics.successful / testMetrics.total : 0;
      const errorRate = testMetrics.total > 0 ? testMetrics.failed / testMetrics.total : 0;

      const readyForRollout = 
        testMetrics.total >= 10 && // At least 10 test publications
        successRate >= this.config.minSuccessRate &&
        errorRate <= this.config.maxErrorRate;

      return {
        readyForRollout,
        successRate,
        errorRate,
        totalTests: testMetrics.total,
        reason: readyForRollout ? 
          'Testing metrics meet rollout criteria' : 
          `Insufficient test data or poor metrics (success: ${(successRate*100).toFixed(1)}%, error: ${(errorRate*100).toFixed(1)}%)`
      };

    } catch (error) {
      logger.error('❌ Failed to analyze testing results:', error.message);
      return {
        readyForRollout: false,
        reason: `Analysis failed: ${error.message}`
      };
    }
  }

  /**
   * Get test metrics
   */
  async getTestMetrics() {
    try {
      const testResults = await this.redis.lrange('migration:test_results', 0, -1);
      
      let successful = 0;
      let failed = 0;
      let total = 0;

      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);

      testResults.forEach(resultStr => {
        try {
          const result = JSON.parse(resultStr);
          if (new Date(result.timestamp).getTime() >= oneDayAgo) {
            total++;
            if (result.success) {
              successful++;
            } else {
              failed++;
            }
          }
        } catch (error) {
          // Skip invalid entries
        }
      });

      return { total, successful, failed };

    } catch (error) {
      logger.error('❌ Failed to get test metrics:', error.message);
      return { total: 0, successful: 0, failed: 0 };
    }
  }

  /**
   * Record test result
   */
  async recordTestResult(success, denunciaId, error = null) {
    try {
      const result = {
        success,
        denunciaId,
        error,
        timestamp: new Date().toISOString(),
        service: 'graph_api'
      };

      await this.redis.lpush('migration:test_results', JSON.stringify(result));
      await this.redis.ltrim('migration:test_results', 0, 999); // Keep last 1000 results

    } catch (error) {
      logger.warn('⚠️ Failed to record test result:', error.message);
    }
  }

  /**
   * Schedule next rollout step
   */
  scheduleNextRolloutStep() {
    setTimeout(async () => {
      try {
        await this.advanceRollout();
      } catch (error) {
        logger.error('❌ Failed to advance rollout:', error.message);
      }
    }, this.config.rolloutStepDuration);
  }

  /**
   * Advance to next rollout step
   */
  async advanceRollout() {
    try {
      const currentPhase = await this.getCurrentPhase();
      
      if (currentPhase.phase !== 'rollout') {
        return; // Migration phase changed, stop advancing
      }

      // Check current step health
      const stepHealth = await this.checkRolloutStepHealth();
      if (!stepHealth.healthy) {
        logger.warn('🚨 Rollout step health check failed, initiating rollback', stepHealth);
        await this.rollback(`Automatic rollback: ${stepHealth.reason}`);
        return;
      }

      // Find next step
      const currentIndex = this.config.rolloutSteps.indexOf(currentPhase.rolloutPercentage);
      const nextIndex = currentIndex + 1;

      if (nextIndex >= this.config.rolloutSteps.length) {
        // All steps completed, finalize migration
        await this.completeMigration();
        return;
      }

      const nextPercentage = this.config.rolloutSteps[nextIndex];

      this.migrationState.rolloutPercentage = nextPercentage;
      this.migrationState.currentStepStartedAt = new Date();
      await this.saveMigrationState();

      await this.logMigrationEvent('rollout_advanced', {
        fromPercentage: currentPhase.rolloutPercentage,
        toPercentage: nextPercentage
      });

      logger.info('📈 Rollout advanced to next step', {
        percentage: nextPercentage
      });

      // Schedule next advance
      this.scheduleNextRolloutStep();

    } catch (error) {
      logger.error('❌ Failed to advance rollout:', error.message);
    }
  }

  /**
   * Check rollout step health
   */
  async checkRolloutStepHealth() {
    try {
      // Get metrics for current rollout step
      const stepMetrics = await this.getRolloutStepMetrics();
      
      const errorRate = stepMetrics.total > 0 ? stepMetrics.failed / stepMetrics.total : 0;
      const successRate = stepMetrics.total > 0 ? stepMetrics.successful / stepMetrics.total : 0;

      if (errorRate > this.config.maxErrorRate) {
        return {
          healthy: false,
          reason: `Error rate too high: ${(errorRate*100).toFixed(1)}%`
        };
      }

      if (successRate < this.config.minSuccessRate && stepMetrics.total >= 20) {
        return {
          healthy: false,
          reason: `Success rate too low: ${(successRate*100).toFixed(1)}%`
        };
      }

      return {
        healthy: true,
        errorRate,
        successRate,
        total: stepMetrics.total
      };

    } catch (error) {
      return {
        healthy: false,
        reason: `Health check failed: ${error.message}`
      };
    }
  }

  /**
   * Get rollout step metrics
   */
  async getRolloutStepMetrics() {
    try {
      const stepStart = new Date(this.migrationState.currentStepStartedAt).getTime();
      const rolloutResults = await this.redis.lrange('migration:rollout_results', 0, -1);
      
      let successful = 0;
      let failed = 0;
      let total = 0;

      rolloutResults.forEach(resultStr => {
        try {
          const result = JSON.parse(resultStr);
          if (new Date(result.timestamp).getTime() >= stepStart) {
            total++;
            if (result.success) {
              successful++;
            } else {
              failed++;
            }
          }
        } catch (error) {
          // Skip invalid entries
        }
      });

      return { total, successful, failed };

    } catch (error) {
      logger.error('❌ Failed to get rollout step metrics:', error.message);
      return { total: 0, successful: 0, failed: 0 };
    }
  }

  /**
   * Record rollout result
   */
  async recordRolloutResult(success, denunciaId, serviceType, error = null) {
    try {
      const result = {
        success,
        denunciaId,
        serviceType,
        error,
        timestamp: new Date().toISOString(),
        rolloutPercentage: this.migrationState.rolloutPercentage
      };

      await this.redis.lpush('migration:rollout_results', JSON.stringify(result));
      await this.redis.ltrim('migration:rollout_results', 0, 9999); // Keep last 10k results

    } catch (error) {
      logger.warn('⚠️ Failed to record rollout result:', error.message);
    }
  }

  /**
   * Log migration event
   */
  async logMigrationEvent(event, data = {}) {
    try {
      const logEntry = {
        event,
        timestamp: new Date().toISOString(),
        migrationState: this.migrationState,
        data
      };

      await this.redis.lpush('migration:events', JSON.stringify(logEntry));
      await this.redis.ltrim('migration:events', 0, 999); // Keep last 1000 events

      logger.info(`[MIGRATION] ${event}`, data);

    } catch (error) {
      logger.error('❌ Failed to log migration event:', error.message);
    }
  }

  /**
   * Get migration statistics
   */
  async getMigrationStats() {
    try {
      const currentPhase = await this.getCurrentPhase();
      const testMetrics = await this.getTestMetrics();
      const rolloutMetrics = currentPhase.phase === 'rollout' ? 
        await this.getRolloutStepMetrics() : null;

      return {
        currentPhase,
        testMetrics,
        rolloutMetrics,
        lastUpdated: new Date().toISOString()
      };

    } catch (error) {
      logger.error('❌ Failed to get migration stats:', error.message);
      return null;
    }
  }

  /**
   * Utility functions
   */
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new InstagramMigrationManager();