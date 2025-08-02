/**
 * Instagram Graph API Publish Worker
 * Modernized queue worker using Instagram Graph API instead of private API
 * Government-grade reliability and security
 */

const { Worker } = require('bullmq');
const Redis = require('ioredis');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Import new Graph API services
const instagramGraphApiService = require('../services/instagramGraphApiService');
const tokenManager = require('../services/instagramTokenManager');
const imageHostingService = require('../services/imageHostingService');

// Import existing services
const { CONFIG } = require('../config/constants');
const monitoringService = require('../services/monitoringService');
const loggerService = require('../services/loggerService');
const websocketService = require('../services/websocketService');

const connection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: null,
});

const publishWorkerGraphApi = new Worker('publishInstagramGraphApi', async (job) => {
  const { denunciaId, texto, imagem, vereadores, bairro, userId, priority = 'normal' } = job.data;
  const startTime = Date.now();

  // Configure logger with context
  const logger = loggerService.child({
    operation: 'graph_api_publication',
    denunciaId,
    userId,
    jobId: job.id,
    service: 'instagram_graph_api'
  });

  logger.info(`Starting Graph API publication for denuncia ${denunciaId}`, {
    priority,
    hasText: !!texto,
    hasImage: !!imagem,
    vereadoresCount: vereadores?.length || 0,
    bairro
  });

  // Register processing start event
  await monitoringService.recordPublicationEvent(denunciaId, 'processing', {
    jobId: job.id,
    userId,
    startTime,
    service: 'graph_api',
    priority
  });

  try {
    // Check token health before proceeding
    const tokenHealth = await tokenManager.getTokenHealth();
    if (!tokenHealth.healthy) {
      throw new Error(`Instagram token is not healthy: ${tokenHealth.message}`);
    }

    // Log token status
    logger.info('Token health check passed', {
      tokenStatus: tokenHealth.status,
      hoursUntilExpiry: tokenHealth.hoursUntilExpiry,
      needsRefresh: tokenHealth.needsRefresh
    });

    // Update status to processing
    await prisma.denuncia.update({
      where: { protocolo: denunciaId },
      data: { 
        status: 'PROCESSANDO',
        updatedAt: new Date(),
        publishAttempts: { increment: 1 },
        lastAttemptAt: new Date()
      },
    });

    // Check daily limits before proceeding
    const dailyLimits = await monitoringService.getDailyLimits();
    if (dailyLimits.remaining <= 0) {
      logger.warn(`Daily limit exceeded (${dailyLimits.current}/${dailyLimits.maximum})`);
      
      // Schedule for next day
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(8, 0, 0, 0); // 8 AM next day

      await job.reschedule(tomorrow);
      
      await monitoringService.recordPublicationEvent(denunciaId, 'rescheduled', {
        reason: 'daily_limit_exceeded',
        scheduledFor: tomorrow,
        currentLimits: dailyLimits,
        service: 'graph_api'
      });

      return { 
        rescheduled: true, 
        scheduledFor: tomorrow,
        reason: 'Daily publication limit exceeded'
      };
    }

    // Validate image accessibility for Graph API
    if (imagem) {
      try {
        // Test if image hosting service can process the image
        const imageTest = await imageHostingService.readAndValidateImage(imagem);
        logger.info('Image validation passed', {
          imageSize: imageTest.length,
          imagePath: imagem
        });
      } catch (imageError) {
        throw new Error(`Image validation failed: ${imageError.message}`);
      }
    }

    // Perform publication using Graph API
    const publicationStart = Date.now();
    
    logger.info('Calling Instagram Graph API publication service');
    const { success, postId, postUrl, error: instagramError, imageId, containerId, processingTime: apiProcessingTime } = 
      await instagramGraphApiService.publicar({
        texto: texto,
        imagem: imagem,
        vereadores: vereadores,
        bairro: bairro,
      });
    
    const publicationTime = Date.now() - publicationStart;

    if (success) {
      // Success - update database
      const processingTime = Date.now() - startTime;
      
      await prisma.denuncia.update({
        where: { protocolo: denunciaId },
        data: {
          status: 'PUBLICADA',
          publishedAt: new Date(),
          instagramPostId: postId, // Use the new field name
          postUrl: postUrl,
          publishError: null, // Clear any previous errors
        },
      });

      // Record success event with Graph API specific data
      await monitoringService.recordPublicationEvent(denunciaId, 'published', {
        postId,
        postUrl,
        processingTime,
        publicationTime,
        apiProcessingTime,
        bairro,
        vereadores: vereadores?.length || 0,
        service: 'graph_api',
        imageId,
        containerId,
        tokenUsed: tokenHealth.tokenId
      });

      // Structured logging
      logger.logPublication('published', denunciaId, {
        postId,
        postUrl,
        processingTime,
        publicationTime,
        apiProcessingTime,
        bairro,
        service: 'graph_api'
      });

      // Notify user via WebSocket
      if (userId) {
        const feedback = await monitoringService.generateUserFeedback(
          'approve_and_post_now',
          denunciaId,
          { 
            publishedImmediately: true, 
            postUrl, 
            postId,
            service: 'graph_api',
            processingTime
          }
        );

        websocketService.sendToUser(userId, {
          type: 'publication_feedback',
          data: { 
            denunciaId, 
            feedback,
            service: 'graph_api',
            success: true
          }
        });
      }

      logger.info(`Denuncia ${denunciaId} published successfully via Graph API in ${processingTime}ms`, {
        postId,
        postUrl,
        imageId,
        containerId
      });
      
      return { 
        success: true, 
        postId, 
        postUrl, 
        processingTime,
        publicationTime,
        apiProcessingTime,
        service: 'graph_api',
        imageId,
        containerId
      };

    } else {
      // Publication failed
      const processingTime = Date.now() - startTime;
      const errorMessage = instagramError || 'Graph API publication failed';
      
      await prisma.denuncia.update({
        where: { protocolo: denunciaId },
        data: {
          status: 'ERRO',
          motivoRejeicaoBot: errorMessage,
          publishError: errorMessage,
        },
      });

      // Record failure event
      await monitoringService.recordPublicationEvent(denunciaId, 'failed', {
        error: errorMessage,
        processingTime,
        publicationTime,
        apiProcessingTime,
        instagramError,
        service: 'graph_api',
        tokenHealth: tokenHealth.status
      });

      // Error logging
      logger.logPublication('failed', denunciaId, {
        error: errorMessage,
        processingTime,
        publicationTime,
        service: 'graph_api'
      });

      // Notify user via WebSocket
      if (userId) {
        const feedback = await monitoringService.generateUserFeedback(
          'approve_and_post_now',
          denunciaId,
          { 
            publishedImmediately: false,
            error: errorMessage,
            processingTime,
            service: 'graph_api'
          }
        );

        websocketService.sendToUser(userId, {
          type: 'publication_feedback',
          data: { 
            denunciaId, 
            feedback,
            service: 'graph_api',
            success: false,
            error: errorMessage
          }
        });
      }

      logger.error(`Failed to publish denuncia ${denunciaId} via Graph API`, null, {
        error: errorMessage,
        processingTime,
        service: 'graph_api'
      });

      throw new Error(errorMessage);
    }

  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorMessage = `Graph API publication error: ${error.message}`;
    
    // Update status in database
    await prisma.denuncia.update({
      where: { protocolo: denunciaId },
      data: {
        status: 'ERRO',
        motivoRejeicaoBot: errorMessage,
        publishError: errorMessage,
      },
    });

    // Record error event with detailed context
    await monitoringService.recordPublicationEvent(denunciaId, 'failed', {
      error: error.message,
      stack: error.stack,
      processingTime,
      internalError: true,
      service: 'graph_api',
      errorType: error.constructor.name,
      tokenHealth: await tokenManager.getTokenHealth().catch(() => ({ status: 'unknown' }))
    });

    // Critical logging for unexpected errors
    await logger.logCritical(`Critical Graph API publication error for denuncia ${denunciaId}`, {
      error: error.message,
      stack: error.stack,
      processingTime,
      jobData: job.data,
      service: 'graph_api'
    });

    // Notify user via WebSocket
    if (userId) {
      const feedback = await monitoringService.generateUserFeedback(
        'approve_and_post_now',
        denunciaId,
        { 
          publishedImmediately: false,
          error: errorMessage,
          processingTime,
          internalError: true,
          service: 'graph_api'
        }
      );

      websocketService.sendToUser(userId, {
        type: 'publication_feedback',
        data: { 
          denunciaId, 
          feedback,
          service: 'graph_api',
          success: false,
          error: errorMessage,
          internalError: true
        }
      });
    }

    throw error;
  }
}, { 
  connection,
  concurrency: 2, // Reduced concurrency for Graph API (more conservative)
  removeOnComplete: 100, // Keep more completed jobs for analysis
  removeOnFail: 200, // Keep more failed jobs for debugging
  settings: {
    retryProcessDelay: 30000, // 30 second delay between retries
    maxStalledCount: 3,
    stalledInterval: 60000, // 1 minute
  }
});

// Enhanced error handling for the worker
publishWorkerGraphApi.on('completed', (job, returnValue) => {
  const logger = loggerService.child({
    operation: 'graph_api_publication_completed',
    jobId: job.id,
    denunciaId: job.data.denunciaId
  });

  logger.info('Graph API publication job completed successfully', {
    denunciaId: job.data.denunciaId,
    postId: returnValue.postId,
    processingTime: returnValue.processingTime,
    service: 'graph_api',
    rescheduled: returnValue.rescheduled || false
  });
});

publishWorkerGraphApi.on('failed', (job, err) => {
  const logger = loggerService.child({
    operation: 'graph_api_publication_failed',
    jobId: job?.id,
    denunciaId: job?.data?.denunciaId
  });

  logger.error('Graph API publication job failed', err, {
    denunciaId: job?.data?.denunciaId,
    attemptsMade: job?.attemptsMade,
    maxAttempts: job?.opts?.attempts,
    service: 'graph_api',
    failedReason: err.message
  });
});

publishWorkerGraphApi.on('stalled', (jobId) => {
  const logger = loggerService.child({
    operation: 'graph_api_publication_stalled',
    jobId
  });

  logger.warn('Graph API publication job stalled', {
    jobId,
    service: 'graph_api'
  });
});

publishWorkerGraphApi.on('progress', (job, progress) => {
  const logger = loggerService.child({
    operation: 'graph_api_publication_progress',
    jobId: job.id,
    denunciaId: job.data.denunciaId
  });

  logger.debug('Graph API publication job progress', {
    denunciaId: job.data.denunciaId,
    progress,
    service: 'graph_api'
  });
});

// Health check for the worker
setInterval(async () => {
  try {
    const health = await instagramGraphApiService.getHealthStatus();
    const tokenHealth = await tokenManager.getTokenHealth();
    
    if (!health.status || health.status === 'error' || !tokenHealth.healthy) {
      const logger = loggerService.child({
        operation: 'graph_api_worker_health_check'
      });
      
      logger.warn('Graph API worker health check warning', {
        serviceHealth: health,
        tokenHealth: tokenHealth,
        service: 'graph_api'
      });
    }
  } catch (error) {
    const logger = loggerService.child({
      operation: 'graph_api_worker_health_check_error'
    });
    
    logger.error('Graph API worker health check failed', error, {
      service: 'graph_api'
    });
  }
}, 5 * 60 * 1000); // Check every 5 minutes

console.log('📸 Instagram Graph API Publish Worker started.');
console.log('🔐 Token management: Enabled');
console.log('🖼️ Image hosting: Enabled');
console.log('📊 Rate limiting: Enforced');
console.log('🔍 Health monitoring: Active');

module.exports = publishWorkerGraphApi;