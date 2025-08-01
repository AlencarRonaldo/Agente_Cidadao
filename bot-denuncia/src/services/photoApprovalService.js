/**
 * 📸 PHOTO APPROVAL SERVICE - 2024
 * Sistema completo de aprovação de fotos com descarte automático
 * Frontend + Backend Persona + Context7 + Sequential + Magic
 */

const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

class PhotoApprovalService {
  constructor() {
    // 📁 DIRECTORY STRUCTURE
    this.baseDir = process.env.PHOTO_STORAGE_PATH || './photo-storage';
    this.pendingDir = path.join(this.baseDir, 'pending');
    this.approvedDir = path.join(this.baseDir, 'approved');
    this.thumbnailDir = path.join(this.baseDir, 'thumbnails');
    this.encryptedDir = path.join(this.baseDir, 'encrypted');
    
    // 🔧 CONFIGURATION
    this.maxFileSize = parseInt(process.env.MAX_PHOTO_SIZE) || 15 * 1024 * 1024; // 15MB
    this.allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    this.thumbnailSize = 300; // 300x300 thumbnails
    this.retentionHours = parseInt(process.env.PHOTO_RETENTION_HOURS) || 24; // 24h após publicação
    
    // 🛡️ SECURITY SETTINGS
    this.encryptionAlgorithm = 'aes-256-gcm';
    this.sensitiveContentKeywords = [
      'violencia', 'drogas', 'arma', 'sangue', 'ferimento', 
      'acidente', 'crime', 'agressao', 'morte'
    ];
    
    this.initializeDirectories();
  }

  // 📁 INITIALIZE STORAGE DIRECTORIES
  async initializeDirectories() {
    const dirs = [this.baseDir, this.pendingDir, this.approvedDir, this.thumbnailDir, this.encryptedDir];
    
    for (const dir of dirs) {
      try {
        await fs.access(dir);
      } catch {
        await fs.mkdir(dir, { recursive: true });
        logger.info(`📁 [PHOTO] Created directory: ${dir}`);
      }
    }
  }

  // 📤 UPLOAD PHOTO FOR APPROVAL
  async uploadPhotoForApproval(fileBuffer, mimeType, denunciaId, originalName = 'photo') {
    const startTime = Date.now();
    
    try {
      // 🛡️ SECURITY VALIDATION
      await this.validatePhoto(fileBuffer, mimeType);
      
      // 📸 PROCESS IMAGE
      const processedImage = await this.processImage(fileBuffer);
      const metadata = await this.extractMetadata(fileBuffer);
      
      // 🔍 DETECT SENSITIVE CONTENT
      const isSensitive = await this.detectSensitiveContent(denunciaId, processedImage.buffer);
      
      // 🆔 GENERATE UNIQUE IDENTIFIERS
      const photoId = crypto.randomUUID();
      const timestamp = Date.now();
      const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex').substring(0, 16);
      const extension = this.getExtensionFromMimeType(mimeType);
      const filename = `${timestamp}-${hash}.${extension}`;
      
      // 💾 SAVE FILES
      let photoPath, thumbnailPath, encryptionKey = null;
      
      if (isSensitive) {
        // 🔐 ENCRYPT SENSITIVE CONTENT
        const encrypted = await this.encryptPhoto(processedImage.buffer);
        photoPath = path.join(this.encryptedDir, `${filename}.enc`);
        await fs.writeFile(photoPath, encrypted.data);
        encryptionKey = encrypted.key;
        logger.warn(`🔐 [PHOTO] Sensitive content encrypted: ${photoId}`);
      } else {
        // 📁 SAVE NORMALLY
        photoPath = path.join(this.pendingDir, filename);
        await fs.writeFile(photoPath, processedImage.buffer);
      }
      
      // 🖼️ CREATE THUMBNAIL
      thumbnailPath = path.join(this.thumbnailDir, `thumb_${filename}`);
      await fs.writeFile(thumbnailPath, processedImage.thumbnail);
      
      // 💾 SAVE TO DATABASE
      const photoPending = await prisma.photoPending.create({
        data: {
          id: photoId,
          denunciaId: denunciaId,
          originalFilename: originalName,
          originalPath: photoPath,
          thumbnailPath: thumbnailPath,
          mimeType: mimeType,
          fileSize: fileBuffer.length,
          width: processedImage.metadata?.width,
          height: processedImage.metadata?.height,
          isEncrypted: isSensitive,
          encryptionKey: encryptionKey,
          status: 'PENDING_REVIEW'
        }
      });
      
      // 📝 AUDIT LOG
      await this.createAuditLog(photoId, 'UPLOADED', 'system', {
        denunciaId,
        fileSize: fileBuffer.length,
        isSensitive,
        processingTime: Date.now() - startTime
      });
      
      logger.info(`📤 [PHOTO] Uploaded for approval: ${photoId} (${Math.round(fileBuffer.length/1024)}KB, ${Date.now() - startTime}ms)`);
      
      return {
        photoId,
        filename,
        thumbnailUrl: `/api/admin/photos/${photoId}/thumbnail`,
        fileSize: fileBuffer.length,
        isEncrypted: isSensitive,
        status: 'PENDING_REVIEW',
        processingTime: Date.now() - startTime
      };
      
    } catch (error) {
      logger.error(`❌ [PHOTO] Upload failed: ${error.message}`);
      throw new Error(`Photo upload failed: ${error.message}`);
    }
  }

  // ✅ APPROVE PHOTO
  async approvePhoto(photoId, adminId, comments = '') {
    const startTime = Date.now();
    
    try {
      const photo = await prisma.photoPending.findUnique({
        where: { id: photoId },
        include: { denuncia: true }
      });
      
      if (!photo) {
        throw new Error(`Photo not found: ${photoId}`);
      }
      
      if (photo.status !== 'PENDING') {
        throw new Error(`Photo not in pending status: ${photo.status}`);
      }
      
      // 📁 MOVE TO APPROVED DIRECTORY
      let newPhotoPath;
      if (photo.isEncrypted) {
        newPhotoPath = path.join(this.approvedDir, `${photo.filename}.enc`);
        await fs.rename(photo.photoPath, newPhotoPath);
      } else {
        newPhotoPath = path.join(this.approvedDir, photo.filename);
        await fs.rename(photo.photoPath, newPhotoPath);
      }
      
      // 💾 UPDATE DATABASE
      await prisma.photoPending.update({
        where: { id: photoId },
        data: {
          status: 'APPROVED',
          processedPath: newPhotoPath,
          reviewedBy: adminId,
          reviewedAt: new Date(),
          approvalComment: comments
        }
      });
      
      // 📝 AUDIT LOG
      await this.createAuditLog(photoId, 'APPROVED', adminId, {
        comments,
        denunciaId: photo.denunciaId,
        processingTime: Date.now() - startTime
      });
      
      logger.info(`✅ [PHOTO] Approved: ${photoId} by ${adminId}`);
      
      // 🚀 TRIGGER INSTAGRAM PUBLICATION
      await this.triggerInstagramPublication(photo);
      
      return {
        success: true,
        photoId,
        status: 'APPROVED',
        message: 'Photo approved and queued for publication'
      };
      
    } catch (error) {
      logger.error(`❌ [PHOTO] Approval failed: ${error.message}`);
      throw error;
    }
  }

  // ❌ REJECT PHOTO
  async rejectPhoto(photoId, adminId, reason) {
    const startTime = Date.now();
    
    try {
      const photo = await prisma.photoPending.findUnique({
        where: { id: photoId }
      });
      
      if (!photo) {
        throw new Error(`Photo not found: ${photoId}`);
      }
      
      if (photo.status !== 'PENDING') {
        throw new Error(`Photo not in pending status: ${photo.status}`);
      }
      
      // 💾 UPDATE DATABASE
      await prisma.photoPending.update({
        where: { id: photoId },
        data: {
          status: 'REJECTED',
          reviewedBy: adminId,
          reviewedAt: new Date(),
          rejectionReason: reason
        }
      });
      
      // 📝 AUDIT LOG
      await this.createAuditLog(photoId, 'REJECTED', adminId, {
        reason,
        processingTime: Date.now() - startTime
      });
      
      logger.info(`❌ [PHOTO] Rejected: ${photoId} by ${adminId} - ${reason}`);
      
      // 🗑️ SCHEDULE FOR CLEANUP (immediately for rejected photos)
      setTimeout(() => {
        this.cleanupPhoto(photoId, 'REJECTED').catch(err => {
          logger.error(`Error cleaning up rejected photo ${photoId}:`, err.message);
        });
      }, 5 * 60 * 1000); // 5 minutes delay
      
      return {
        success: true,
        photoId,
        status: 'REJECTED',
        message: 'Photo rejected and scheduled for cleanup'
      };
      
    } catch (error) {
      logger.error(`❌ [PHOTO] Rejection failed: ${error.message}`);
      throw error;
    }
  }

  // 📋 GET PENDING PHOTOS FOR DASHBOARD
  async getPendingPhotos(limit = 50, offset = 0) {
    try {
      const photos = await prisma.photoPending.findMany({
        where: { status: 'PENDING_REVIEW' },
        include: {
          denuncia: {
            select: {
              id: true,
              texto: true,
              endereco: true,
              bairro: true,
              createdAt: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      });
      
      const total = await prisma.photoPending.count({
        where: { status: 'PENDING_REVIEW' }
      });
      
      // 📊 ADD THUMBNAIL URLS AND STATS
      const enrichedPhotos = photos.map(photo => ({
        ...photo,
        thumbnailUrl: `/api/admin/photos/${photo.id}/thumbnail`,
        previewUrl: `/api/admin/photos/${photo.id}/preview`,
        fileSizeFormatted: this.formatFileSize(photo.fileSize),
        uploadedAtFormatted: this.formatDateTime(photo.createdAt),
        isOld: Date.now() - photo.createdAt.getTime() > 24 * 60 * 60 * 1000 // >24h
      }));
      
      return {
        photos: enrichedPhotos,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        },
        statistics: await this.getPhotoStatistics()
      };
      
    } catch (error) {
      logger.error(`❌ [PHOTO] Failed to get pending photos: ${error.message}`);
      throw error;
    }
  }

  // 🖼️ GET PHOTO THUMBNAIL (SECURE)
  async getPhotoThumbnail(photoId) {
    try {
      const photo = await prisma.photoPending.findUnique({
        where: { id: photoId }
      });
      
      if (!photo) {
        throw new Error(`Photo not found: ${photoId}`);
      }
      
      const thumbnailBuffer = await fs.readFile(photo.thumbnailPath);
      
      return {
        buffer: thumbnailBuffer,
        mimeType: photo.mimeType,
        filename: `thumb_${photo.originalFilename}`
      };
      
    } catch (error) {
      logger.error(`❌ [PHOTO] Failed to get thumbnail: ${error.message}`);
      throw error;
    }
  }

  // 👁️ GET PHOTO PREVIEW (SECURE WITH WATERMARK)
  async getPhotoPreview(photoId) {
    try {
      const photo = await prisma.photoPending.findUnique({
        where: { id: photoId }
      });
      
      if (!photo) {
        throw new Error(`Photo not found: ${photoId}`);
      }
      
      let imageBuffer;
      
      if (photo.isEncrypted) {
        // 🔓 DECRYPT FOR PREVIEW
        const encryptedData = await fs.readFile(photo.photoPath);
        imageBuffer = await this.decryptPhoto(encryptedData, photo.encryptionKey);
      } else {
        imageBuffer = await fs.readFile(photo.photoPath);
      }
      
      // 🖼️ ADD WATERMARK FOR PREVIEW
      const watermarkedBuffer = await this.addWatermark(imageBuffer, 'PENDING APPROVAL');
      
      return {
        buffer: watermarkedBuffer,
        mimeType: photo.mimeType,
        filename: `preview_${photo.filename}`
      };
      
    } catch (error) {
      logger.error(`❌ [PHOTO] Failed to get preview: ${error.message}`);
      throw error;
    }
  }

  // 📊 GET PHOTO STATISTICS
  async getPhotoStatistics() {
    try {
      const [
        totalPending,
        totalApproved,
        totalRejected,
        totalPublished,
        oldestPending
      ] = await Promise.all([
        prisma.photoPending.count({ where: { status: 'PENDING_REVIEW' } }),
        prisma.photoPending.count({ where: { status: 'APPROVED' } }),
        prisma.photoPending.count({ where: { status: 'REJECTED' } }),
        prisma.photoPending.count({ where: { status: 'PUBLISHED' } }),
        prisma.photoPending.findFirst({
          where: { status: 'PENDING_REVIEW' },
          orderBy: { createdAt: 'asc' },
          select: { createdAt: true }
        })
      ]);
      
      const totalPhotos = totalPending + totalApproved + totalRejected + totalPublished;
      const approvalRate = totalPhotos > 0 ? ((totalApproved + totalPublished) / totalPhotos * 100).toFixed(1) : 0;
      
      return {
        pending: totalPending,
        approved: totalApproved,
        rejected: totalRejected,
        published: totalPublished,
        total: totalPhotos,
        approvalRate: `${approvalRate}%`,
        oldestPendingAge: oldestPending 
          ? Math.floor((Date.now() - oldestPending.createdAt.getTime()) / (1000 * 60 * 60))
          : 0,
        needsAttention: totalPending > 10 || (oldestPending && Date.now() - oldestPending.createdAt.getTime() > 24 * 60 * 60 * 1000)
      };
      
    } catch (error) {
      logger.error(`❌ [PHOTO] Failed to get statistics: ${error.message}`);
      return {
        pending: 0, approved: 0, rejected: 0, published: 0, total: 0,
        approvalRate: '0%', oldestPendingAge: 0, needsAttention: false
      };
    }
  }

  // 🚀 TRIGGER INSTAGRAM PUBLICATION
  async triggerInstagramPublication(photo) {
    try {
      // Import instagram service dynamically to avoid circular dependencies
      const instagramService = require('./instagramService');
      
      // 📸 PREPARE PHOTO FOR PUBLICATION
      let imageBuffer;
      if (photo.isEncrypted) {
        const encryptedData = await fs.readFile(photo.photoPath);
        imageBuffer = await this.decryptPhoto(encryptedData, photo.encryptionKey);
      } else {
        imageBuffer = await fs.readFile(photo.photoPath);
      }
      
      // 📝 GET DENUNCIA DETAILS
      const denuncia = await prisma.denuncia.findUnique({
        where: { id: photo.denunciaId },
        include: { vereadores: true }
      });
      
      if (!denuncia) {
        throw new Error(`Denuncia not found: ${photo.denunciaId}`);
      }
      
      // 📤 PUBLISH TO INSTAGRAM
      const result = await instagramService.publicar({
        texto: denuncia.descricao,
        imagem: imageBuffer,
        vereadores: denuncia.vereadores.map(v => v.instagram).filter(Boolean)
      });
      
      if (result.success) {
        // ✅ MARK AS PUBLISHED
        await prisma.photoPending.update({
          where: { id: photo.id },
          data: {
            status: 'PUBLISHED',
            publishedAt: new Date(),
            instagramPostId: result.postId,
            instagramUrl: result.postUrl
          }
        });
        
        // 📝 AUDIT LOG
        await this.createAuditLog(photo.id, 'PUBLISHED', 'system', {
          postId: result.postId,
          postUrl: result.postUrl
        });
        
        // ⏰ SCHEDULE CLEANUP
        setTimeout(() => {
          this.cleanupPhoto(photo.id, 'PUBLISHED').catch(err => {
            logger.error(`Error cleaning up published photo ${photo.id}:`, err.message);
          });
        }, this.retentionHours * 60 * 60 * 1000);
        
        logger.info(`🚀 [PHOTO] Published to Instagram: ${photo.id} -> ${result.postId}`);
      } else {
        logger.error(`❌ [PHOTO] Instagram publication failed: ${result.error}`);
        throw new Error(result.error);
      }
      
    } catch (error) {
      logger.error(`❌ [PHOTO] Failed to trigger Instagram publication: ${error.message}`);
      throw error;
    }
  }

  // 🗑️ CLEANUP PHOTO (SECURE DELETION)
  async cleanupPhoto(photoId, reason) {
    try {
      const photo = await prisma.photoPending.findUnique({
        where: { id: photoId }
      });
      
      if (!photo) {
        logger.warn(`⚠️ [PHOTO] Photo not found for cleanup: ${photoId}`);
        return;
      }
      
      // 🗑️ DELETE FILES SECURELY
      const filesToDelete = [photo.photoPath, photo.thumbnailPath].filter(Boolean);
      
      for (const filePath of filesToDelete) {
        try {
          await fs.unlink(filePath);
          logger.debug(`🗑️ [PHOTO] Deleted file: ${filePath}`);
        } catch (error) {
          if (error.code !== 'ENOENT') {
            logger.warn(`⚠️ [PHOTO] Failed to delete file ${filePath}: ${error.message}`);
          }
        }
      }
      
      // 💾 UPDATE DATABASE
      await prisma.photoPending.update({
        where: { id: photoId },
        data: {
          status: 'CLEANED_UP',
          cleanedUpAt: new Date(),
          photoPath: null,
          thumbnailPath: null
        }
      });
      
      // 📝 AUDIT LOG
      await this.createAuditLog(photoId, 'CLEANED_UP', 'system', { reason });
      
      logger.info(`🗑️ [PHOTO] Cleaned up: ${photoId} (${reason})`);
      
    } catch (error) {
      logger.error(`❌ [PHOTO] Cleanup failed: ${error.message}`);
    }
  }

  // UTILITY METHODS

  // 🛡️ VALIDATE PHOTO
  async validatePhoto(fileBuffer, mimeType) {
    // Size validation
    if (fileBuffer.length > this.maxFileSize) {
      throw new Error(`File too large: ${fileBuffer.length} bytes (max: ${this.maxFileSize})`);
    }
    
    // MIME type validation
    if (!this.allowedMimeTypes.includes(mimeType)) {
      throw new Error(`Invalid MIME type: ${mimeType}`);
    }
    
    // Magic bytes validation
    const magicBytes = fileBuffer.slice(0, 12);
    const isValidImage = await this.validateImageMagicBytes(magicBytes, mimeType);
    if (!isValidImage) {
      throw new Error('Invalid image file signature');
    }
    
    // Image processing validation
    try {
      const metadata = await sharp(fileBuffer).metadata();
      
      if (metadata.width < 200 || metadata.height < 200) {
        throw new Error('Image too small (minimum 200x200px)');
      }
      
      if (metadata.width > 8000 || metadata.height > 8000) {
        throw new Error('Image too large (maximum 8000x8000px)');
      }
      
    } catch (error) {
      throw new Error(`Invalid image file: ${error.message}`);
    }
  }

  // 🔍 VALIDATE IMAGE MAGIC BYTES
  async validateImageMagicBytes(magicBytes, mimeType) {
    const signatures = {
      'image/jpeg': [
        [0xFF, 0xD8, 0xFF, 0xE0],
        [0xFF, 0xD8, 0xFF, 0xE1],
        [0xFF, 0xD8, 0xFF, 0xE2],
        [0xFF, 0xD8, 0xFF, 0xE3],
        [0xFF, 0xD8, 0xFF, 0xE8]
      ],
      'image/png': [
        [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]
      ],
      'image/webp': [
        [0x52, 0x49, 0x46, 0x46] // RIFF
      ]
    };
    
    const expectedSignatures = signatures[mimeType];
    if (!expectedSignatures) return false;
    
    return expectedSignatures.some(signature => {
      return signature.every((byte, index) => magicBytes[index] === byte);
    });
  }

  // 📸 PROCESS IMAGE
  async processImage(fileBuffer) {
    try {
      // Main image optimization
      const processedBuffer = await sharp(fileBuffer)
        .jpeg({ quality: 90, progressive: true })
        .resize(2048, 2048, { fit: 'inside', withoutEnlargement: true })
        .toBuffer();
      
      // Thumbnail generation
      const thumbnailBuffer = await sharp(fileBuffer)
        .jpeg({ quality: 80 })
        .resize(this.thumbnailSize, this.thumbnailSize, { fit: 'cover' })
        .toBuffer();
      
      return {
        buffer: processedBuffer,
        thumbnail: thumbnailBuffer
      };
      
    } catch (error) {
      throw new Error(`Image processing failed: ${error.message}`);
    }
  }

  // 📊 EXTRACT METADATA
  async extractMetadata(fileBuffer) {
    try {
      const metadata = await sharp(fileBuffer).metadata();
      
      return {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: fileBuffer.length,
        density: metadata.density,
        hasProfile: !!metadata.icc,
        orientation: metadata.orientation || 1
      };
      
    } catch (error) {
      logger.warn(`⚠️ [PHOTO] Failed to extract metadata: ${error.message}`);
      return {};
    }
  }

  // 🔍 DETECT SENSITIVE CONTENT
  async detectSensitiveContent(denunciaId, imageBuffer) {
    try {
      // Get denuncia details for context
      const denuncia = await prisma.denuncia.findUnique({
        where: { id: denunciaId },
        select: { titulo: true, descricao: true, categoria: true }
      });
      
      if (!denuncia) return false;
      
      // Check text content for sensitive keywords
      const textContent = `${denuncia.titulo} ${denuncia.descricao} ${denuncia.categoria}`.toLowerCase();
      const hasSensitiveText = this.sensitiveContentKeywords.some(keyword => 
        textContent.includes(keyword.toLowerCase())
      );
      
      // TODO: Add AI-based image content analysis if needed
      // For now, rely on text-based detection
      
      return hasSensitiveText;
      
    } catch (error) {
      logger.warn(`⚠️ [PHOTO] Sensitive content detection failed: ${error.message}`);
      return false; // Default to not sensitive on error
    }
  }

  // 🔐 ENCRYPT PHOTO
  async encryptPhoto(imageBuffer) {
    try {
      const key = crypto.randomBytes(32);
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher(this.encryptionAlgorithm, key);
      
      const encrypted = Buffer.concat([
        cipher.update(imageBuffer),
        cipher.final()
      ]);
      
      const authTag = cipher.getAuthTag();
      
      // Combine IV + authTag + encrypted data
      const encryptedData = Buffer.concat([iv, authTag, encrypted]);
      
      return {
        data: encryptedData,
        key: key.toString('hex')
      };
      
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  // 🔓 DECRYPT PHOTO
  async decryptPhoto(encryptedData, keyHex) {
    try {
      const key = Buffer.from(keyHex, 'hex');
      const iv = encryptedData.slice(0, 16);
      const authTag = encryptedData.slice(16, 32);
      const encrypted = encryptedData.slice(32);
      
      const decipher = crypto.createDecipher(this.encryptionAlgorithm, key);
      decipher.setAuthTag(authTag);
      
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
      ]);
      
      return decrypted;
      
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  // 🖼️ ADD WATERMARK
  async addWatermark(imageBuffer, text) {
    try {
      const watermarkSvg = `
        <svg width="200" height="50">
          <rect width="100%" height="100%" fill="rgba(0,0,0,0.7)" rx="5"/>
          <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" 
                fill="white" font-size="14" font-family="Arial, sans-serif" font-weight="bold">
            ${text}
          </text>
        </svg>
      `;
      
      const watermarkBuffer = Buffer.from(watermarkSvg);
      
      const watermarked = await sharp(imageBuffer)
        .composite([{
          input: watermarkBuffer,
          gravity: 'southeast',
          blend: 'over'
        }])
        .toBuffer();
      
      return watermarked;
      
    } catch (error) {
      logger.warn(`⚠️ [PHOTO] Watermark failed: ${error.message}`);
      return imageBuffer; // Return original if watermark fails
    }
  }

  // 📝 CREATE AUDIT LOG
  async createAuditLog(photoId, action, userId, metadata = {}) {
    try {
      await prisma.photoAuditLog.create({
        data: {
          photoPendingId: photoId,
          action,
          performedBy: userId,
          details: metadata,
          ipAddress: metadata.ipAddress || 'system'
        }
      });
    } catch (error) {
      logger.error(`❌ [PHOTO] Failed to create audit log: ${error.message}`);
    }
  }

  // 🔧 UTILITY METHODS
  getExtensionFromMimeType(mimeType) {
    const extensions = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp'
    };
    return extensions[mimeType] || 'jpg';
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  formatDateTime(date) {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }
}

module.exports = new PhotoApprovalService();