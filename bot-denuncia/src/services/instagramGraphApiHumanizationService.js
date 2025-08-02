/**
 * Instagram Graph API Humanization Service
 * Bridges the existing humanization engine with Graph API
 * Maintains natural posting patterns for government compliance
 */

const instagramGraphApiService = require('./instagramGraphApiService');
const InstagramHumanizationEngine = require('./instagramHumanizationEngine');
const migrationManager = require('./instagramMigrationManager');
const logger = require('../utils/logger');

class InstagramGraphApiHumanizationService {
  constructor() {
    this.humanizationEngine = new InstagramHumanizationEngine();
    logger.info('🤖 Instagram Graph API Humanization Service initialized');
  }

  /**
   * Humanized publication using Graph API
   * Compatible with existing system while using new Graph API
   */
  async publicar({ texto, imagem, vereadores, bairro, userId = null }) {
    const startTime = Date.now();
    
    try {
      logger.info('[GRAPH_API_HUMANIZED] Starting humanized publication', {
        hasText: !!texto,
        hasImage: !!imagem,
        vereadores: vereadores?.length || 0,
        bairro,
        userId
      });

      // Determine which service to use based on migration state
      const serviceSelection = await migrationManager.getServiceForPublication(
        this.generateDenunciaId(texto, imagem), 
        userId
      );

      logger.info(`[MIGRATION] Using ${serviceSelection.serviceType}: ${serviceSelection.reason}`);

      // If using private API, delegate to original humanization
      if (serviceSelection.serviceType === 'private_api') {
        return await serviceSelection.service.publicar({
          texto,
          imagem,
          vereadores,
          bairro
        });
      }

      // Graph API humanized publication
      return await this.publishWithGraphApiHumanization({
        texto,
        imagem,
        vereadores,
        bairro,
        userId,
        startTime
      });

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      logger.error('[GRAPH_API_HUMANIZED] Publication failed:', {
        error: error.message,
        processingTime,
        stack: error.stack
      });

      // Record failure for migration monitoring
      if (userId) {
        await migrationManager.recordTestResult(false, this.generateDenunciaId(texto, imagem), error.message);
      }

      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        processingTime,
        service: 'graph_api_humanized'
      };
    }
  }

  /**
   * Perform Graph API publication with humanization
   */
  async publishWithGraphApiHumanization({ texto, imagem, vereadores, bairro, userId, startTime }) {
    try {
      // HUMANIZATION: Check optimal posting time
      const postingTime = this.humanizationEngine.getOptimalPostingTime();
      if (postingTime.shouldWait) {
        logger.info(`[HUMANIZATION] ⏰ Optimal posting analysis: ${postingTime.reason}`, {
          delayMinutes: postingTime.delayMinutes,
          optimalTime: postingTime.optimalTime
        });
        
        // For immediate posting requests, log recommendation but proceed
        if (postingTime.delayMinutes > 60) {
          logger.warn(`[HUMANIZATION] ⚠️ Posting outside optimal hours. Recommended wait until ${postingTime.optimalTime.toLocaleTimeString()}`);
        }
      }

      // HUMANIZATION: Generate risk assessment
      const riskAssessment = this.humanizationEngine.calculateRiskScore();
      logger.info(`[HUMANIZATION] 📊 Risk assessment: ${riskAssessment.totalRisk.toFixed(3)} - ${riskAssessment.recommendation}`, {
        emergencyMode: riskAssessment.emergencyMode
      });
      
      if (riskAssessment.emergencyMode) {
        logger.warn('[HUMANIZATION] 🚨 Emergency mode active - applying enhanced delays');
      }

      // HUMANIZATION: Generate content variation
      const variedContent = this.humanizationEngine.generateContentVariation(texto, { vereadores });
      const contentVaried = texto !== variedContent;
      
      if (contentVaried) {
        logger.info('[HUMANIZATION] 📝 Content variation applied');
      }

      // HUMANIZATION: Generate intelligent hashtag rotation
      const humanizedHashtags = this.humanizationEngine.generateHashtagRotation(vereadores);
      logger.info(`[HUMANIZATION] 🏷️ Hashtags generated: ${humanizedHashtags.slice(0, 5).join(', ')}... (${humanizedHashtags.length} total)`);

      // HUMANIZATION: Natural delay before posting
      const naturalDelay = this.humanizationEngine.calculateNaturalDelay();
      if (naturalDelay > 1000) {
        logger.info(`[HUMANIZATION] ⏳ Applying natural delay: ${Math.round(naturalDelay/1000)}s`);
        await this.sleep(naturalDelay);
      }

      // Generate content hash for tracking
      const contentHash = require('crypto').createHash('md5').update(variedContent).digest('hex').substring(0, 8);

      // Publish using Graph API service
      const result = await instagramGraphApiService.publicar({
        texto: variedContent,
        imagem: imagem,
        vereadores: vereadores,
        bairro: bairro
      });

      const processingTime = Date.now() - startTime;

      if (result.success) {
        // HUMANIZATION: Track behavior for analysis
        this.humanizationEngine.trackBehavior('post', {
          contentHash,
          hashtagCount: humanizedHashtags.length,
          vereadorCount: vereadores?.length || 0,
          processingTime,
          riskScore: riskAssessment.totalRisk,
          service: 'graph_api'
        });

        // HUMANIZATION: Simulate engagement (occasionally)
        setTimeout(() => {
          this.humanizationEngine.simulateEngagement(result.postId);
        }, Math.random() * 30000 + 10000); // 10-40 seconds delay

        // Record success for migration monitoring
        if (userId) {
          await migrationManager.recordTestResult(true, this.generateDenunciaId(variedContent, imagem));
        }

        logger.info('[GRAPH_API_HUMANIZED] ✅ Humanized publication successful', {
          postId: result.postId,
          postUrl: result.postUrl,
          processingTime,
          humanization: {
            riskScore: riskAssessment.totalRisk,
            emergencyMode: riskAssessment.emergencyMode,
            contentVaried,
            hashtagsRotated: true,
            behaviorTracked: true
          }
        });

        return {
          success: true,
          postId: result.postId,
          postUrl: result.postUrl,
          timestamp: result.timestamp,
          processingTime,
          service: 'graph_api_humanized',
          humanization: {
            riskScore: riskAssessment.totalRisk,
            emergencyMode: riskAssessment.emergencyMode,
            contentVaried,
            hashtagsRotated: true,
            behaviorTracked: true,
            naturalDelayApplied: naturalDelay > 1000
          },
          imageId: result.imageId,
          containerId: result.containerId
        };

      } else {
        // Record failure for migration monitoring
        if (userId) {
          await migrationManager.recordTestResult(false, this.generateDenunciaId(variedContent, imagem), result.error);
        }

        // Track failed attempt for risk assessment
        this.humanizationEngine.trackBehavior('post_failed', {
          error: result.error,
          processingTime,
          service: 'graph_api'
        });

        throw new Error(result.error);
      }

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      logger.error('[GRAPH_API_HUMANIZED] Publication error:', {
        error: error.message,
        processingTime
      });

      // Record failure for migration monitoring
      if (userId) {
        await migrationManager.recordTestResult(false, this.generateDenunciaId(texto, imagem), error.message);
      }

      throw error;
    }
  }

  /**
   * Get humanization behavior report
   */
  getHumanizationReport() {
    return this.humanizationEngine.generateBehaviorReport();
  }

  /**
   * Get current risk assessment
   */
  getRiskAssessment() {
    return this.humanizationEngine.calculateRiskScore();
  }

  /**
   * Check if posting time is optimal
   */
  isOptimalPostingTime() {
    const schedule = this.humanizationEngine.isWithinHumanActivitySchedule();
    return {
      isOptimal: schedule.isOptimalTime,
      isPeakHour: schedule.isPeakHour,
      isWeekend: schedule.isWeekend,
      shouldDelay: schedule.shouldDelay,
      timeProb: schedule.timeProb,
      dayProb: schedule.dayProb
    };
  }

  /**
   * Force emergency mode (for testing or critical situations)
   */
  setEmergencyMode(enabled = true) {
    this.humanizationEngine.emergencyMode = enabled;
    logger.info(`[HUMANIZATION] Emergency mode ${enabled ? 'enabled' : 'disabled'} manually`);
    return true;
  }

  /**
   * Test connection with humanization
   */
  async testConnection(maxRetries = 3) {
    try {
      logger.info('[GRAPH_API_HUMANIZED] Testing connection with humanization...');

      // Get current migration state
      const currentPhase = await migrationManager.getCurrentPhase();
      
      // Test appropriate service
      let result;
      if (currentPhase.phase === 'private_api' || currentPhase.phase === 'rollback') {
        // Test private API
        const instagramService = require('./instagramService');
        result = await instagramService.testConnection(maxRetries);
        result.service = 'private_api';
      } else {
        // Test Graph API
        result = await instagramGraphApiService.testConnection();
        result.service = 'graph_api';
      }

      // Add humanization status
      result.humanization = {
        engineActive: true,
        riskAssessment: this.getRiskAssessment(),
        optimalPostingTime: this.isOptimalPostingTime()
      };

      // Add migration status
      result.migration = {
        currentPhase: currentPhase.phase,
        rolloutPercentage: currentPhase.rolloutPercentage
      };

      logger.info('[GRAPH_API_HUMANIZED] Connection test completed', {
        success: result.success,
        service: result.service,
        migration: result.migration
      });

      return result;

    } catch (error) {
      logger.error('[GRAPH_API_HUMANIZED] Connection test failed:', error.message);
      
      return {
        success: false,
        error: error.message,
        service: 'graph_api_humanized',
        humanization: {
          engineActive: true,
          error: 'Connection test failed'
        }
      };
    }
  }

  /**
   * Get service status for monitoring
   */
  async getServiceStatus() {
    try {
      const [
        migrationPhase,
        graphApiHealth,
        humanizationReport,
        riskAssessment
      ] = await Promise.all([
        migrationManager.getCurrentPhase(),
        instagramGraphApiService.getHealthStatus(),
        this.getHumanizationReport(),
        this.getRiskAssessment()
      ]);

      return {
        service: 'instagram_graph_api_humanized',
        status: graphApiHealth.status,
        migration: migrationPhase,
        graphApi: graphApiHealth,
        humanization: {
          report: humanizationReport,
          riskAssessment,
          optimalPostingTime: this.isOptimalPostingTime()
        },
        lastChecked: new Date().toISOString()
      };

    } catch (error) {
      logger.error('[GRAPH_API_HUMANIZED] Failed to get service status:', error.message);
      
      return {
        service: 'instagram_graph_api_humanized',
        status: 'error',
        error: error.message,
        lastChecked: new Date().toISOString()
      };
    }
  }

  /**
   * Utility functions
   */
  generateDenunciaId(texto, imagem) {
    const content = (texto || '') + (imagem || '');
    return require('crypto').createHash('md5').update(content).digest('hex').substring(0, 16);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new InstagramGraphApiHumanizationService();