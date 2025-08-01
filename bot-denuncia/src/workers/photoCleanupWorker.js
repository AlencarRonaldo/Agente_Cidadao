/**
 * 🗑️ PHOTO CLEANUP WORKER - 2024
 * Background worker para descarte automático de fotos após publicação
 * Backend Persona + Context7 + Sequential analysis
 */

const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

class PhotoCleanupWorker {
  constructor() {
    this.isRunning = false;
    this.lastRun = null;
    this.stats = {
      totalRuns: 0,
      totalCleaned: 0,
      totalErrors: 0,
      lastRunDuration: 0,
      averageRunDuration: 0
    };
    
    // 🔧 CONFIGURATION
    this.retentionHours = parseInt(process.env.PHOTO_RETENTION_HOURS) || 24; // 24h após publicação
    this.failsafeCleanupDays = parseInt(process.env.FAILSAFE_CLEANUP_DAYS) || 7; // 7 dias máximo
    this.batchSize = parseInt(process.env.CLEANUP_BATCH_SIZE) || 10; // 10 fotos por vez
    this.maxRetries = 3;
    this.retryDelay = 5000; // 5s entre tentativas
    
    logger.info('🗑️ [PHOTO_CLEANUP] Worker initialized');
  }

  // 🚀 START WORKER
  start() {
    try {
      // 🕐 SCHEDULE HOURLY CLEANUP
      cron.schedule('0 * * * *', async () => {
        if (!this.isRunning) {
          await this.runCleanup();
        } else {
          logger.warn('⚠️ [PHOTO_CLEANUP] Previous cleanup still running, skipping');
        }
      }, {
        timezone: 'America/Sao_Paulo'
      });
      
      // 🕐 DAILY FAILSAFE CLEANUP (every day at 3 AM)
      cron.schedule('0 3 * * *', async () => {
        if (!this.isRunning) {
          await this.runFailsafeCleanup();
        }
      }, {
        timezone: 'America/Sao_Paulo'
      });
      
      logger.info('🗑️ [PHOTO_CLEANUP] Worker scheduled - Hourly cleanup + Daily failsafe at 3 AM');
      
    } catch (error) {
      logger.error('❌ [PHOTO_CLEANUP] Failed to start worker:', error.message);
    }
  }

  // 🧹 RUN CLEANUP
  async runCleanup() {
    const startTime = Date.now();
    
    try {
      this.isRunning = true;
      this.stats.totalRuns++;
      
      logger.info('🧹 [PHOTO_CLEANUP] Starting cleanup process...');
      
      // 📊 GET CLEANUP CANDIDATES
      const candidates = await this.getCleanupCandidates();
      
      if (candidates.length === 0) {
        logger.info('✅ [PHOTO_CLEANUP] No photos to cleanup');
        return;
      }
      
      logger.info(`🗑️ [PHOTO_CLEANUP] Found ${candidates.length} photos to cleanup`);
      
      // 🔄 PROCESS IN BATCHES
      let cleanedCount = 0;
      let errorCount = 0;
      
      for (let i = 0; i < candidates.length; i += this.batchSize) {
        const batch = candidates.slice(i, i + this.batchSize);
        
        logger.debug(`🔄 [PHOTO_CLEANUP] Processing batch ${Math.floor(i/this.batchSize) + 1}/${Math.ceil(candidates.length/this.batchSize)}`);
        
        for (const photo of batch) {
          try {
            await this.cleanupPhoto(photo);
            cleanedCount++;
            
            // Small delay between photos to avoid overwhelming the system
            await new Promise(resolve => setTimeout(resolve, 100));
            
          } catch (error) {
            errorCount++;
            logger.error(`❌ [PHOTO_CLEANUP] Failed to cleanup photo ${photo.id}: ${error.message}`);
          }
        }
        
        // Delay between batches
        if (i + this.batchSize < candidates.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      const duration = Date.now() - startTime;
      this.updateStats(duration, cleanedCount, errorCount);
      
      logger.info(`✅ [PHOTO_CLEANUP] Cleanup completed - Processed: ${cleanedCount}, Errors: ${errorCount}, Duration: ${duration}ms`);
      
    } catch (error) {
      logger.error('❌ [PHOTO_CLEANUP] Cleanup process failed:', error.message);
      this.stats.totalErrors++;
    } finally {
      this.isRunning = false;
      this.lastRun = new Date();
    }
  }

  // 🚨 FAILSAFE CLEANUP
  async runFailsafeCleanup() {
    const startTime = Date.now();
    
    try {
      this.isRunning = true;
      
      logger.info('🚨 [PHOTO_CLEANUP] Starting failsafe cleanup for old photos...');
      
      // 📊 GET VERY OLD PHOTOS (7+ days)
      const cutoffDate = new Date(Date.now() - (this.failsafeCleanupDays * 24 * 60 * 60 * 1000));
      
      const oldPhotos = await prisma.photoPending.findMany({
        where: {
          uploadedAt: {
            lt: cutoffDate
          },
          status: {
            in: ['PENDING', 'APPROVED', 'REJECTED', 'PUBLISHED']
          }
        },
        select: {
          id: true,
          filename: true,
          status: true,
          uploadedAt: true,
          photoPath: true,
          thumbnailPath: true
        },
        take: 100 // Limit to prevent overwhelming
      });
      
      if (oldPhotos.length === 0) {
        logger.info('✅ [PHOTO_CLEANUP] No old photos found for failsafe cleanup');
        return;
      }
      
      logger.warn(`🚨 [PHOTO_CLEANUP] Found ${oldPhotos.length} old photos for failsafe cleanup`);
      
      let cleanedCount = 0;
      for (const photo of oldPhotos) {
        try {
          await this.cleanupPhoto(photo, 'FAILSAFE_OLD');
          cleanedCount++;
        } catch (error) {
          logger.error(`❌ [PHOTO_CLEANUP] Failsafe cleanup failed for ${photo.id}: ${error.message}`);
        }
      }
      
      const duration = Date.now() - startTime;
      logger.warn(`🚨 [PHOTO_CLEANUP] Failsafe cleanup completed - Cleaned: ${cleanedCount}/${oldPhotos.length}, Duration: ${duration}ms`);
      
    } catch (error) {
      logger.error('❌ [PHOTO_CLEANUP] Failsafe cleanup failed:', error.message);
    } finally {
      this.isRunning = false;
    }
  }

  // 📊 GET CLEANUP CANDIDATES
  async getCleanupCandidates() {
    try {
      // 🕐 CALCULATE CUTOFF TIME
      const cutoffTime = new Date(Date.now() - (this.retentionHours * 60 * 60 * 1000));
      
      // 📋 FIND PHOTOS TO CLEANUP
      const candidates = await prisma.photoPending.findMany({
        where: {
          OR: [
            // Published photos older than retention period
            {
              status: 'PUBLISHED',
              publishedAt: {
                lt: cutoffTime
              }
            },
            // Rejected photos older than 1 hour
            {
              status: 'REJECTED',
              rejectedAt: {
                lt: new Date(Date.now() - (60 * 60 * 1000))
              }
            }
          ],
          // Only photos that haven't been cleaned up yet
          cleanedUpAt: null
        },
        select: {
          id: true,
          filename: true,
          status: true,
          photoPath: true,
          thumbnailPath: true,
          publishedAt: true,
          rejectedAt: true,
          isEncrypted: true
        },
        orderBy: {
          uploadedAt: 'asc'
        },
        take: 50 // Limit per run
      });
      
      return candidates;
      
    } catch (error) {
      logger.error('❌ [PHOTO_CLEANUP] Failed to get cleanup candidates:', error.message);
      return [];
    }
  }

  // 🗑️ CLEANUP SINGLE PHOTO
  async cleanupPhoto(photo, reason = 'SCHEDULED') {
    let retries = 0;
    
    while (retries < this.maxRetries) {
      try {
        logger.debug(`🗑️ [PHOTO_CLEANUP] Cleaning up photo ${photo.id} (${photo.status}, attempt ${retries + 1})`);
        
        // 🗂️ DELETE FILES
        const filesToDelete = [photo.photoPath, photo.thumbnailPath].filter(Boolean);
        let deletedFiles = 0;
        
        for (const filePath of filesToDelete) {
          try {
            if (filePath && await this.fileExists(filePath)) {
              await fs.unlink(filePath);
              deletedFiles++;
              logger.debug(`🗑️ [PHOTO_CLEANUP] Deleted file: ${filePath}`);
            }
          } catch (error) {
            if (error.code !== 'ENOENT') {
              logger.warn(`⚠️ [PHOTO_CLEANUP] Failed to delete file ${filePath}: ${error.message}`);
            }
          }
        }
        
        // 💾 UPDATE DATABASE
        await prisma.photoPending.update({
          where: { id: photo.id },
          data: {
            status: 'CLEANED_UP',
            cleanedUpAt: new Date(),
            photoPath: null,
            thumbnailPath: null
          }
        });
        
        // 📝 AUDIT LOG
        await this.createAuditLog(photo.id, 'CLEANED_UP', 'cleanup-worker', {
          reason,
          deletedFiles,
          originalStatus: photo.status,
          retries: retries + 1
        });
        
        logger.info(`✅ [PHOTO_CLEANUP] Successfully cleaned up photo ${photo.id} (${deletedFiles} files deleted)`);
        return;
        
      } catch (error) {
        retries++;
        
        if (retries >= this.maxRetries) {
          logger.error(`❌ [PHOTO_CLEANUP] Failed to cleanup photo ${photo.id} after ${this.maxRetries} attempts: ${error.message}`);
          
          // 📝 LOG FAILURE
          await this.createAuditLog(photo.id, 'CLEANUP_FAILED', 'cleanup-worker', {
            error: error.message,
            attempts: retries,
            reason
          }).catch(logError => {
            logger.error('Failed to log cleanup failure:', logError.message);
          });
          
          throw error;
        }
        
        logger.warn(`⚠️ [PHOTO_CLEANUP] Cleanup attempt ${retries} failed for photo ${photo.id}, retrying in ${this.retryDelay}ms: ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
      }
    }
  }

  // 📝 CREATE AUDIT LOG
  async createAuditLog(photoId, action, userId, metadata = {}) {
    try {
      await prisma.photoAuditLog.create({
        data: {
          photoId,
          action,
          userId,
          metadata: JSON.stringify(metadata),
          timestamp: new Date(),
          ipAddress: 'worker'
        }
      });
    } catch (error) {
      logger.error(`❌ [PHOTO_CLEANUP] Failed to create audit log: ${error.message}`);
    }
  }

  // 📁 CHECK FILE EXISTS
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  // 📊 UPDATE STATISTICS
  updateStats(duration, cleanedCount, errorCount) {
    this.stats.totalCleaned += cleanedCount;
    this.stats.totalErrors += errorCount;
    this.stats.lastRunDuration = duration;
    
    // Calculate average duration
    if (this.stats.totalRuns > 0) {
      this.stats.averageRunDuration = 
        (this.stats.averageRunDuration * (this.stats.totalRuns - 1) + duration) / this.stats.totalRuns;
    }
  }

  // 📊 GET WORKER STATUS
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastRun: this.lastRun,
      retentionHours: this.retentionHours,
      failsafeCleanupDays: this.failsafeCleanupDays,
      batchSize: this.batchSize,
      stats: {
        ...this.stats,
        averageRunDuration: Math.round(this.stats.averageRunDuration)
      },
      nextRun: this.getNextRunTime(),
      health: this.getHealthStatus()
    };
  }

  // ⏰ GET NEXT RUN TIME
  getNextRunTime() {
    if (!this.lastRun) {
      return 'Soon (within 1 hour)';
    }
    
    const nextHour = new Date(this.lastRun);
    nextHour.setHours(nextHour.getHours() + 1);
    nextHour.setMinutes(0);
    nextHour.setSeconds(0);
    
    return nextHour.toLocaleString('pt-BR');
  }

  // 🩺 GET HEALTH STATUS
  getHealthStatus() {
    const errorRate = this.stats.totalRuns > 0 
      ? (this.stats.totalErrors / this.stats.totalRuns * 100).toFixed(1)
      : 0;
    
    const lastRunAge = this.lastRun 
      ? Math.floor((Date.now() - this.lastRun.getTime()) / (1000 * 60 * 60))
      : null;
    
    let status = 'HEALTHY';
    let warnings = [];
    
    if (errorRate > 20) {
      status = 'DEGRADED';
      warnings.push(`High error rate: ${errorRate}%`);
    }
    
    if (lastRunAge > 2) {
      status = 'DEGRADED';
      warnings.push(`Last run was ${lastRunAge} hours ago`);
    }
    
    if (this.isRunning && Date.now() - (this.lastRun?.getTime() || 0) > 30 * 60 * 1000) {
      status = 'STUCK';
      warnings.push('Worker appears to be stuck');
    }
    
    return {
      status,
      errorRate: `${errorRate}%`,
      lastRunAge: lastRunAge ? `${lastRunAge}h ago` : 'Never',
      warnings
    };
  }

  // 🧪 MANUAL CLEANUP TRIGGER
  async manualCleanup(options = {}) {
    if (this.isRunning) {
      throw new Error('Cleanup is already running');
    }
    
    logger.info('🧪 [PHOTO_CLEANUP] Manual cleanup triggered');
    
    if (options.failsafe) {
      await this.runFailsafeCleanup();
    } else {
      await this.runCleanup();
    }
    
    return this.getStatus();
  }

  // 🛑 STOP WORKER
  stop() {
    if (this.isRunning) {
      logger.warn('⚠️ [PHOTO_CLEANUP] Cannot stop worker while cleanup is running');
      return false;
    }
    
    // Note: cron jobs will continue running, but this marks the worker as stopped
    logger.info('🛑 [PHOTO_CLEANUP] Worker stop requested');
    return true;
  }
}

// 🚀 CREATE AND EXPORT WORKER INSTANCE
const photoCleanupWorker = new PhotoCleanupWorker();

// 🎯 AUTO-START IF NOT IN TEST ENVIRONMENT
if (process.env.NODE_ENV !== 'test') {
  photoCleanupWorker.start();
}

module.exports = photoCleanupWorker;