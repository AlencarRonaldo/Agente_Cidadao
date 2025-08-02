/**
 * Image Hosting Service for Instagram Graph API
 * Provides public URLs for images required by Graph API
 * Government-grade security and compliance
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');
const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const Redis = require('ioredis');
const { PrismaClient } = require('@prisma/client');
const graphApiConfig = require('../config/graphApiConfig');
const logger = require('../utils/logger');

class ImageHostingService {
  constructor() {
    this.config = graphApiConfig.get();
    this.prisma = new PrismaClient();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      maxRetriesPerRequest: null,
    });

    // Storage configuration
    this.storageConfig = {
      baseDir: path.join(process.cwd(), 'public', 'instagram-media'),
      publicPath: '/instagram-media',
      maxFileSize: this.config.media.maxImageSize,
      allowedTypes: this.config.media.supportedFormats,
      secureMode: process.env.NODE_ENV === 'production'
    };

    // URL configuration
    this.urlConfig = {
      baseUrl: process.env.PUBLIC_BASE_URL || 'http://localhost:3000',
      cdnUrl: process.env.CDN_BASE_URL,
      useHttps: process.env.NODE_ENV === 'production'
    };

    // Cache configuration
    this.cacheConfig = {
      urlCacheTtl: 24 * 60 * 60, // 24 hours
      metadataCacheTtl: 12 * 60 * 60, // 12 hours
      cleanupInterval: 60 * 60 * 1000 // 1 hour
    };

    this.initializeStorage();
    this.startCleanupTimer();

    logger.info('🖼️ Image Hosting Service initialized', {
      baseDir: this.storageConfig.baseDir,
      publicPath: this.storageConfig.publicPath,
      secureMode: this.storageConfig.secureMode
    });
  }

  /**
   * Initialize storage directories
   */
  async initializeStorage() {
    try {
      const dirs = [
        this.storageConfig.baseDir,
        path.join(this.storageConfig.baseDir, 'original'),
        path.join(this.storageConfig.baseDir, 'processed'),
        path.join(this.storageConfig.baseDir, 'thumbnails'),
        path.join(this.storageConfig.baseDir, 'temp')
      ];

      for (const dir of dirs) {
        await fs.mkdir(dir, { recursive: true });
      }

      logger.info('✅ Image hosting storage directories initialized');

    } catch (error) {
      logger.error('❌ Failed to initialize storage directories:', error.message);
      throw error;
    }
  }

  /**
   * Upload and process image for Instagram Graph API
   */
  async uploadImageForGraphApi(imagePath, metadata = {}) {
    try {
      logger.info('📤 Uploading image for Graph API', { imagePath, metadata });

      // Validate input
      if (!imagePath) {
        throw new Error('Image path is required');
      }

      // Read and validate original image
      const originalBuffer = await this.readAndValidateImage(imagePath);
      
      // Generate unique filename
      const imageId = crypto.randomUUID();
      const extension = path.extname(imagePath).toLowerCase();
      const filename = `${imageId}${extension}`;

      // Process image for Instagram requirements
      const processedImage = await this.processImageForInstagram(originalBuffer, metadata);

      // Store processed image
      const processedPath = path.join(this.storageConfig.baseDir, 'processed', filename);
      await fs.writeFile(processedPath, processedImage.buffer);

      // Generate thumbnail
      const thumbnailBuffer = await this.generateThumbnail(processedImage.buffer);
      const thumbnailPath = path.join(this.storageConfig.baseDir, 'thumbnails', filename);
      await fs.writeFile(thumbnailPath, thumbnailBuffer);

      // Store original for backup
      const originalPath = path.join(this.storageConfig.baseDir, 'original', filename);
      await fs.writeFile(originalPath, originalBuffer);

      // Generate public URLs
      const publicUrl = this.generatePublicUrl(filename, 'processed');
      const thumbnailUrl = this.generatePublicUrl(filename, 'thumbnails');

      // Store metadata in database
      const imageRecord = await this.storeImageMetadata({
        id: imageId,
        filename,
        originalPath: imagePath,
        processedPath,
        thumbnailPath,
        publicUrl,
        thumbnailUrl,
        fileSize: processedImage.buffer.length,
        originalSize: originalBuffer.length,
        dimensions: processedImage.dimensions,
        metadata: {
          ...metadata,
          mimeType: processedImage.format,
          processed: true,
          instagramReady: true
        }
      });

      // Cache URL for fast access
      await this.cacheImageUrl(imageId, publicUrl, this.cacheConfig.urlCacheTtl);

      logger.info('✅ Image uploaded and processed successfully', {
        imageId,
        publicUrl,
        dimensions: processedImage.dimensions,
        fileSize: processedImage.buffer.length
      });

      return {
        success: true,
        imageId,
        publicUrl,
        thumbnailUrl,
        dimensions: processedImage.dimensions,
        fileSize: processedImage.buffer.length,
        processed: true
      };

    } catch (error) {
      logger.error('❌ Failed to upload image for Graph API:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Read and validate image file
   */
  async readAndValidateImage(imagePath) {
    try {
      // Handle relative paths
      let fullPath = imagePath;
      if (!path.isAbsolute(imagePath)) {
        if (imagePath.startsWith('/uploads/') || imagePath.startsWith('uploads/')) {
          fullPath = path.join(process.cwd(), imagePath.replace(/^\//, ''));
        } else {
          fullPath = path.join(process.cwd(), imagePath);
        }
      }

      // Check if file exists
      await fs.access(fullPath);

      // Read file
      const buffer = await fs.readFile(fullPath);

      // Validate file size
      if (buffer.length > this.storageConfig.maxFileSize) {
        throw new Error(`Image too large: ${buffer.length} bytes (max: ${this.storageConfig.maxFileSize})`);
      }

      // Validate file type using Sharp
      const metadata = await sharp(buffer).metadata();
      
      if (!this.storageConfig.allowedTypes.includes(`image/${metadata.format}`)) {
        throw new Error(`Unsupported image format: ${metadata.format}`);
      }

      logger.info('✅ Image validated', {
        path: fullPath,
        format: metadata.format,
        dimensions: `${metadata.width}x${metadata.height}`,
        size: buffer.length
      });

      return buffer;

    } catch (error) {
      logger.error('❌ Image validation failed:', error.message);
      throw error;
    }
  }

  /**
   * Process image for Instagram requirements
   */
  async processImageForInstagram(buffer, options = {}) {
    try {
      const {
        maxWidth = this.config.media.dimensions.maxWidth,
        maxHeight = this.config.media.dimensions.maxHeight,
        quality = this.config.media.processing.quality,
        format = 'jpeg'
      } = options;

      // Get original metadata
      const originalMetadata = await sharp(buffer).metadata();

      // Calculate optimal dimensions maintaining aspect ratio
      const aspectRatio = originalMetadata.width / originalMetadata.height;
      let targetWidth = Math.min(originalMetadata.width, maxWidth);
      let targetHeight = Math.min(originalMetadata.height, maxHeight);

      // Adjust to maintain aspect ratio within Instagram limits
      if (targetWidth / targetHeight !== aspectRatio) {
        if (aspectRatio > 1) {
          // Landscape
          targetHeight = Math.round(targetWidth / aspectRatio);
        } else {
          // Portrait
          targetWidth = Math.round(targetHeight * aspectRatio);
        }
      }

      // Ensure minimum dimensions
      targetWidth = Math.max(targetWidth, this.config.media.dimensions.minWidth);
      targetHeight = Math.max(targetHeight, this.config.media.dimensions.minHeight);

      // Process image
      const processedBuffer = await sharp(buffer)
        .resize(targetWidth, targetHeight, {
          fit: 'cover',
          position: 'center',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .jpeg({
          quality,
          progressive: this.config.media.processing.progressive,
          mozjpeg: true
        })
        .toBuffer();

      logger.info('🔄 Image processed for Instagram', {
        originalDimensions: `${originalMetadata.width}x${originalMetadata.height}`,
        targetDimensions: `${targetWidth}x${targetHeight}`,
        originalSize: buffer.length,
        processedSize: processedBuffer.length,
        compression: Math.round((1 - processedBuffer.length / buffer.length) * 100)
      });

      return {
        buffer: processedBuffer,
        dimensions: {
          width: targetWidth,
          height: targetHeight,
          aspectRatio
        },
        format: 'jpeg',
        quality,
        originalSize: buffer.length,
        processedSize: processedBuffer.length
      };

    } catch (error) {
      logger.error('❌ Image processing failed:', error.message);
      throw error;
    }
  }

  /**
   * Generate thumbnail
   */
  async generateThumbnail(buffer, size = 300) {
    try {
      const thumbnailBuffer = await sharp(buffer)
        .resize(size, size, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 80 })
        .toBuffer();

      return thumbnailBuffer;

    } catch (error) {
      logger.error('❌ Thumbnail generation failed:', error.message);
      throw error;
    }
  }

  /**
   * Generate public URL for image
   */
  generatePublicUrl(filename, subfolder = 'processed') {
    const baseUrl = this.urlConfig.cdnUrl || this.urlConfig.baseUrl;
    return `${baseUrl}${this.storageConfig.publicPath}/${subfolder}/${filename}`;
  }

  /**
   * Store image metadata in database
   */
  async storeImageMetadata(imageData) {
    try {
      const record = await this.prisma.$executeRaw`
        INSERT INTO instagram_images (
          id, filename, original_path, processed_path, thumbnail_path,
          public_url, thumbnail_url, file_size, original_size,
          width, height, aspect_ratio, mime_type, metadata,
          created_at, expires_at
        ) VALUES (
          ${imageData.id}, ${imageData.filename}, ${imageData.originalPath},
          ${imageData.processedPath}, ${imageData.thumbnailPath},
          ${imageData.publicUrl}, ${imageData.thumbnailUrl},
          ${imageData.fileSize}, ${imageData.originalSize},
          ${imageData.dimensions.width}, ${imageData.dimensions.height}, ${imageData.dimensions.aspectRatio},
          ${imageData.metadata.mimeType}, ${JSON.stringify(imageData.metadata)},
          NOW(), NOW() + INTERVAL '7 days'
        )
        ON CONFLICT (id) DO UPDATE SET
          public_url = EXCLUDED.public_url,
          thumbnail_url = EXCLUDED.thumbnail_url,
          expires_at = EXCLUDED.expires_at
      `;

      return record;

    } catch (error) {
      logger.error('❌ Failed to store image metadata:', error.message);
      throw error;
    }
  }

  /**
   * Cache image URL in Redis
   */
  async cacheImageUrl(imageId, publicUrl, ttl) {
    try {
      await this.redis.setex(`image:url:${imageId}`, ttl, publicUrl);
    } catch (error) {
      logger.warn('⚠️ Failed to cache image URL:', error.message);
    }
  }

  /**
   * Get cached public URL
   */
  async getCachedUrl(imageId) {
    try {
      return await this.redis.get(`image:url:${imageId}`);
    } catch (error) {
      logger.warn('⚠️ Failed to get cached URL:', error.message);
      return null;
    }
  }

  /**
   * Get image by ID
   */
  async getImageById(imageId) {
    try {
      // Check cache first
      const cachedUrl = await this.getCachedUrl(imageId);
      if (cachedUrl) {
        return {
          id: imageId,
          publicUrl: cachedUrl,
          cached: true
        };
      }

      // Query database
      const result = await this.prisma.$queryRaw`
        SELECT * FROM instagram_images 
        WHERE id = ${imageId} AND expires_at > NOW()
      `;

      if (result.length === 0) {
        return null;
      }

      const image = result[0];

      // Cache the URL
      await this.cacheImageUrl(imageId, image.public_url, this.cacheConfig.urlCacheTtl);

      return {
        id: image.id,
        filename: image.filename,
        publicUrl: image.public_url,
        thumbnailUrl: image.thumbnail_url,
        dimensions: {
          width: image.width,
          height: image.height,
          aspectRatio: image.aspect_ratio
        },
        fileSize: image.file_size,
        metadata: image.metadata,
        createdAt: image.created_at,
        expiresAt: image.expires_at
      };

    } catch (error) {
      logger.error('❌ Failed to get image by ID:', error.message);
      return null;
    }
  }

  /**
   * Create Express middleware for serving images
   */
  createImageServingMiddleware() {
    const router = express.Router();

    // Security middleware
    router.use(helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
      contentSecurityPolicy: false
    }));

    // Rate limiting
    const imageRateLimit = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // Limit each IP to 1000 requests per windowMs
      message: 'Too many image requests from this IP',
      standardHeaders: true,
      legacyHeaders: false,
    });

    router.use(imageRateLimit);

    // Cache headers
    router.use((req, res, next) => {
      if (this.storageConfig.secureMode) {
        res.setHeader('Cache-Control', 'public, max-age=86400'); // 24 hours
        res.setHeader('ETag', req.url);
      }
      next();
    });

    // Serve processed images
    router.get('/processed/:filename', async (req, res) => {
      try {
        const filename = req.params.filename;
        const filePath = path.join(this.storageConfig.baseDir, 'processed', filename);

        // Validate filename
        if (!this.isValidFilename(filename)) {
          return res.status(400).json({ error: 'Invalid filename' });
        }

        // Check if file exists
        await fs.access(filePath);

        // Set appropriate headers
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('X-Served-By', 'instagram-image-hosting');

        // Stream file
        const fileStream = require('fs').createReadStream(filePath);
        fileStream.pipe(res);

      } catch (error) {
        logger.error('❌ Failed to serve processed image:', error.message);
        res.status(404).json({ error: 'Image not found' });
      }
    });

    // Serve thumbnails
    router.get('/thumbnails/:filename', async (req, res) => {
      try {
        const filename = req.params.filename;
        const filePath = path.join(this.storageConfig.baseDir, 'thumbnails', filename);

        if (!this.isValidFilename(filename)) {
          return res.status(400).json({ error: 'Invalid filename' });
        }

        await fs.access(filePath);

        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('X-Served-By', 'instagram-image-hosting');

        const fileStream = require('fs').createReadStream(filePath);
        fileStream.pipe(res);

      } catch (error) {
        logger.error('❌ Failed to serve thumbnail:', error.message);
        res.status(404).json({ error: 'Thumbnail not found' });
      }
    });

    // Image info endpoint
    router.get('/info/:imageId', async (req, res) => {
      try {
        const imageId = req.params.imageId;
        const imageInfo = await this.getImageById(imageId);

        if (!imageInfo) {
          return res.status(404).json({ error: 'Image not found' });
        }

        res.json({
          success: true,
          data: imageInfo
        });

      } catch (error) {
        logger.error('❌ Failed to get image info:', error.message);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    return router;
  }

  /**
   * Validate filename security
   */
  isValidFilename(filename) {
    // Check for basic security issues
    if (!filename || typeof filename !== 'string') return false;
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) return false;
    if (filename.length > 255) return false;
    
    // Check UUID format and extension
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png)$/i;
    return uuidRegex.test(filename);
  }

  /**
   * Cleanup expired images
   */
  async cleanupExpiredImages() {
    try {
      logger.info('🧹 Starting expired image cleanup...');

      // Get expired images from database
      const expiredImages = await this.prisma.$queryRaw`
        SELECT * FROM instagram_images 
        WHERE expires_at < NOW()
      `;

      let cleanedCount = 0;
      let errorCount = 0;

      for (const image of expiredImages) {
        try {
          // Delete physical files
          const files = [
            image.processed_path,
            image.thumbnail_path,
            path.join(this.storageConfig.baseDir, 'original', image.filename)
          ];

          for (const filePath of files) {
            try {
              await fs.unlink(filePath);
            } catch (error) {
              // File might not exist, continue
            }
          }

          // Remove from Redis cache
          await this.redis.del(`image:url:${image.id}`);

          cleanedCount++;

        } catch (error) {
          logger.error(`❌ Failed to cleanup image ${image.id}:`, error.message);
          errorCount++;
        }
      }

      // Remove from database
      const dbResult = await this.prisma.$executeRaw`
        DELETE FROM instagram_images 
        WHERE expires_at < NOW()
      `;

      logger.info('✅ Expired image cleanup completed', {
        filesDeleted: cleanedCount,
        errors: errorCount,
        dbRecordsDeleted: dbResult
      });

      return {
        filesDeleted: cleanedCount,
        errors: errorCount,
        dbRecordsDeleted: dbResult
      };

    } catch (error) {
      logger.error('❌ Failed to cleanup expired images:', error.message);
      return { error: error.message };
    }
  }

  /**
   * Start cleanup timer
   */
  startCleanupTimer() {
    setInterval(() => {
      this.cleanupExpiredImages().catch(error => {
        logger.error('❌ Cleanup timer error:', error.message);
      });
    }, this.cacheConfig.cleanupInterval);

    logger.info('⏰ Image cleanup timer started', {
      interval: `${this.cacheConfig.cleanupInterval / 1000}s`
    });
  }

  /**
   * Get hosting statistics
   */
  async getHostingStats() {
    try {
      const [totalImages, activeImages, expiredImages, storageUsed] = await Promise.all([
        this.prisma.$queryRaw`SELECT COUNT(*) as count FROM instagram_images`,
        this.prisma.$queryRaw`SELECT COUNT(*) as count FROM instagram_images WHERE expires_at > NOW()`,
        this.prisma.$queryRaw`SELECT COUNT(*) as count FROM instagram_images WHERE expires_at <= NOW()`,
        this.prisma.$queryRaw`SELECT COALESCE(SUM(file_size), 0) as total FROM instagram_images WHERE expires_at > NOW()`
      ]);

      return {
        total: parseInt(totalImages[0].count),
        active: parseInt(activeImages[0].count),
        expired: parseInt(expiredImages[0].count),
        storageUsed: parseInt(storageUsed[0].total),
        lastUpdated: new Date()
      };

    } catch (error) {
      logger.error('❌ Failed to get hosting stats:', error.message);
      return null;
    }
  }
}

module.exports = new ImageHostingService();