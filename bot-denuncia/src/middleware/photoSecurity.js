/**
 * Photo Security Middleware
 * Advanced security measures for photo handling and access control
 */

const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { body, query, param } = require('express-validator');
const logger = require('../utils/logger');

class PhotoSecurityMiddleware {
  constructor() {
    this.config = {
      // Rate limiting
      uploadLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5, // 5 uploads per window per IP
        message: { error: 'Too many photo uploads. Try again later.' }
      },
      
      viewLimit: {
        windowMs: 60 * 1000, // 1 minute
        max: 30, // 30 views per minute per IP
        message: { error: 'Too many photo view requests. Try again later.' }
      },

      // File validation
      maxFileSize: 15 * 1024 * 1024, // 15MB
      allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
      maxDimensions: { width: 8000, height: 8000 },
      minDimensions: { width: 200, height: 200 },

      // Security headers
      csp: {
        directives: {
          defaultSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "blob:"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          fontSrc: ["'self'"]
        }
      }
    };

    this.setupSecurityHeaders();
    this.setupRateLimits();
  }

  /**
   * Setup security headers
   */
  setupSecurityHeaders() {
    this.securityHeaders = helmet({
      contentSecurityPolicy: this.config.csp,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      },
      frameguard: { action: 'deny' },
      noSniff: true,
      xssFilter: true,
      referrerPolicy: { policy: 'same-origin' }
    });
  }

  /**
   * Setup rate limiting
   */
  setupRateLimits() {
    this.uploadRateLimit = rateLimit(this.config.uploadLimit);
    this.viewRateLimit = rateLimit(this.config.viewLimit);
  }

  /**
   * Apply security headers to photo routes
   */
  applySecurityHeaders() {
    return (req, res, next) => {
      // Apply helmet security headers
      this.securityHeaders(req, res, () => {
        // Additional security headers for photo handling
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
        // Prevent image hotlinking
        const referer = req.get('Referer');
        const host = req.get('Host');
        
        if (referer && !referer.includes(host)) {
          logger.warn(`🔒 Potential hotlinking attempt blocked: ${req.ip} -> ${referer}`);
          return res.status(403).json({
            success: false,
            error: 'Access denied: Invalid referer'
          });
        }

        next();
      });
    };
  }

  /**
   * Validate file upload security
   */
  validateFileUpload() {
    return async (req, res, next) => {
      try {
        if (!req.file) {
          return res.status(400).json({
            success: false,
            error: 'No file provided'
          });
        }

        const file = req.file;

        // Check file size
        if (file.size > this.config.maxFileSize) {
          logger.warn(`🔒 File size exceeded: ${file.size} bytes from ${req.ip}`);
          return res.status(400).json({
            success: false,
            error: `File size exceeds maximum limit of ${this.config.maxFileSize / 1024 / 1024}MB`
          });
        }

        // Check MIME type
        if (!this.config.allowedMimeTypes.includes(file.mimetype)) {
          logger.warn(`🔒 Invalid MIME type: ${file.mimetype} from ${req.ip}`);
          return res.status(400).json({
            success: false,
            error: `Invalid file type. Allowed types: ${this.config.allowedMimeTypes.join(', ')}`
          });
        }

        // Validate file signature (magic bytes)
        const isValidSignature = await this.validateFileSignature(file.buffer, file.mimetype);
        if (!isValidSignature) {
          logger.warn(`🔒 Invalid file signature for ${file.mimetype} from ${req.ip}`);
          return res.status(400).json({
            success: false,
            error: 'Invalid file signature detected'
          });
        }

        // Check for potentially dangerous metadata
        const hasDangerousMetadata = await this.checkDangerousMetadata(file.buffer);
        if (hasDangerousMetadata) {
          logger.warn(`🔒 Dangerous metadata detected in file from ${req.ip}`);
          return res.status(400).json({
            success: false,
            error: 'File contains potentially dangerous metadata'
          });
        }

        // Log security event
        logger.info(`🔒 File upload security validated: ${file.originalname} (${file.size} bytes) from ${req.ip}`);

        next();
      } catch (error) {
        logger.error('🔒 File validation error:', error);
        res.status(500).json({
          success: false,
          error: 'File validation failed'
        });
      }
    };
  }

  /**
   * Validate file signature (magic bytes)
   */
  async validateFileSignature(buffer, mimeType) {
    try {
      const signatures = {
        'image/jpeg': [
          [0xFF, 0xD8, 0xFF], // JPEG
          [0xFF, 0xD8, 0xFF, 0xE0], // JPEG/JFIF
          [0xFF, 0xD8, 0xFF, 0xE1] // JPEG/EXIF
        ],
        'image/png': [
          [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] // PNG
        ],
        'image/webp': [
          [0x52, 0x49, 0x46, 0x46] // RIFF (WebP container)
        ]
      };

      const fileSignatures = signatures[mimeType];
      if (!fileSignatures) {
        return false;
      }

      // Check if any signature matches
      return fileSignatures.some(signature => {
        if (buffer.length < signature.length) {
          return false;
        }

        return signature.every((byte, index) => buffer[index] === byte);
      });

    } catch (error) {
      logger.error('🔒 File signature validation error:', error);
      return false;
    }
  }

  /**
   * Check for dangerous metadata in image files
   */
  async checkDangerousMetadata(buffer) {
    try {
      const sharp = require('sharp');
      
      // Get image metadata
      const metadata = await sharp(buffer).metadata();
      
      // Check for suspicious EXIF data
      if (metadata.exif) {
        const exifString = metadata.exif.toString('utf8');
        
        // Look for potentially dangerous patterns
        const dangerousPatterns = [
          /<script/i,
          /javascript:/i,
          /vbscript:/i,
          /onload=/i,
          /onerror=/i,
          /data:image\/svg/i,
          /<svg/i,
          /<iframe/i,
          /<object/i,
          /<embed/i
        ];

        return dangerousPatterns.some(pattern => pattern.test(exifString));
      }

      return false;
    } catch (error) {
      // If metadata parsing fails, assume it's safe but log the error
      logger.debug('🔒 Metadata parsing failed (assuming safe):', error.message);
      return false;
    }
  }

  /**
   * Access control for photo viewing
   */
  validatePhotoAccess() {
    return async (req, res, next) => {
      try {
        const { photoId } = req.params;
        const userId = req.user?.id;
        const userRole = req.user?.role;

        if (!photoId || !userId) {
          return res.status(401).json({
            success: false,
            error: 'Authentication required'
          });
        }

        // Check if user has permission to view photos
        if (!['ADMIN', 'MODERADOR'].includes(userRole)) {
          logger.warn(`🔒 Unauthorized photo access attempt: ${userId} (${userRole}) -> ${photoId}`);
          return res.status(403).json({
            success: false,
            error: 'Insufficient permissions to view photos'
          });
        }

        // Log access for audit
        logger.info(`🔒 Photo access granted: ${userId} -> ${photoId}`);

        next();
      } catch (error) {
        logger.error('🔒 Photo access validation error:', error);
        res.status(500).json({
          success: false,
          error: 'Access validation failed'
        });
      }
    };
  }

  /**
   * Generate secure download token
   */
  generateSecureToken(photoId, userId, expiresIn = 300) { // 5 minutes default
    try {
      const payload = {
        photoId,
        userId,
        expires: Date.now() + (expiresIn * 1000),
        nonce: crypto.randomBytes(16).toString('hex')
      };

      const secret = process.env.PHOTO_TOKEN_SECRET || 'default-secret-change-in-production';
      const token = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');

      return {
        token,
        payload: Buffer.from(JSON.stringify(payload)).toString('base64'),
        expires: payload.expires
      };

    } catch (error) {
      logger.error('🔒 Token generation error:', error);
      throw new Error('Failed to generate secure token');
    }
  }

  /**
   * Validate secure download token
   */
  validateSecureToken() {
    return (req, res, next) => {
      try {
        const { token, payload } = req.query;

        if (!token || !payload) {
          return res.status(401).json({
            success: false,
            error: 'Security token required'
          });
        }

        // Decode payload
        const decodedPayload = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
        
        // Check expiration
        if (Date.now() > decodedPayload.expires) {
          logger.warn(`🔒 Expired photo token: ${req.ip} -> ${decodedPayload.photoId}`);
          return res.status(401).json({
            success: false,
            error: 'Token expired'
          });
        }

        // Verify token signature
        const secret = process.env.PHOTO_TOKEN_SECRET || 'default-secret-change-in-production';
        const expectedToken = crypto
          .createHmac('sha256', secret)
          .update(JSON.stringify(decodedPayload))
          .digest('hex');

        if (token !== expectedToken) {
          logger.warn(`🔒 Invalid photo token: ${req.ip} -> ${decodedPayload.photoId}`);
          return res.status(401).json({
            success: false,
            error: 'Invalid token'
          });
        }

        // Check user permission
        if (req.user.id !== decodedPayload.userId) {
          logger.warn(`🔒 Token user mismatch: ${req.user.id} != ${decodedPayload.userId}`);
          return res.status(403).json({
            success: false,
            error: 'Token user mismatch'
          });
        }

        // Add token data to request
        req.secureToken = decodedPayload;
        next();

      } catch (error) {
        logger.error('🔒 Token validation error:', error);
        res.status(401).json({
          success: false,
          error: 'Invalid security token'
        });
      }
    };
  }

  /**
   * Input validation for photo operations
   */
  validatePhotoInput() {
    return [
      body('denunciaId')
        .isString()
        .notEmpty()
        .isLength({ min: 10, max: 50 })
        .matches(/^[a-zA-Z0-9_-]+$/)
        .withMessage('Invalid denuncia ID format'),

      body('comment')
        .optional()
        .isString()
        .isLength({ max: 500 })
        .trim()
        .escape()
        .withMessage('Comment must be string with max 500 characters'),

      body('reason')
        .optional()
        .isString()
        .isLength({ min: 10, max: 500 })
        .trim()
        .escape()
        .withMessage('Reason must be between 10-500 characters'),

      param('photoId')
        .isString()
        .notEmpty()
        .matches(/^[a-zA-Z0-9_-]+$/)
        .withMessage('Invalid photo ID format'),

      query('includeOriginal')
        .optional()
        .isBoolean()
        .withMessage('includeOriginal must be boolean'),

      query('thumbnail')
        .optional()
        .isBoolean()
        .withMessage('thumbnail must be boolean')
    ];
  }

  /**
   * Audit logging middleware
   */
  auditLogger() {
    return (req, res, next) => {
      const startTime = Date.now();
      const originalSend = res.send;

      // Capture response
      res.send = function(data) {
        const duration = Date.now() - startTime;
        
        // Log security-relevant events
        const auditLog = {
          timestamp: new Date().toISOString(),
          method: req.method,
          url: req.originalUrl,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          userId: req.user?.id,
          userRole: req.user?.role,
          statusCode: res.statusCode,
          duration: duration,
          photoId: req.params?.photoId,
          securityEvent: res.statusCode >= 400
        };

        // Enhanced logging for security events
        if (auditLog.securityEvent) {
          logger.warn('🔒 Photo security event:', auditLog);
        } else {
          logger.info('🔒 Photo access log:', auditLog);
        }

        return originalSend.call(this, data);
      };

      next();
    };
  }

  /**
   * Content sanitization for file names and metadata
   */
  sanitizeContent() {
    return (req, res, next) => {
      try {
        // Sanitize file name if present
        if (req.file && req.file.originalname) {
          req.file.originalname = this.sanitizeFileName(req.file.originalname);
        }

        // Sanitize body parameters
        if (req.body) {
          Object.keys(req.body).forEach(key => {
            if (typeof req.body[key] === 'string') {
              req.body[key] = this.sanitizeString(req.body[key]);
            }
          });
        }

        next();
      } catch (error) {
        logger.error('🔒 Content sanitization error:', error);
        res.status(500).json({
          success: false,
          error: 'Content sanitization failed'
        });
      }
    };
  }

  /**
   * Sanitize file name
   */
  sanitizeFileName(fileName) {
    return fileName
      .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace invalid chars
      .replace(/_{2,}/g, '_') // Replace multiple underscores
      .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
      .substring(0, 100); // Limit length
  }

  /**
   * Sanitize string input
   */
  sanitizeString(str) {
    return str
      .trim()
      .replace(/[<>]/g, '') // Remove angle brackets
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/vbscript:/gi, '') // Remove vbscript: protocol
      .replace(/data:/gi, '') // Remove data: protocol
      .replace(/script/gi, 'scr1pt'); // Neutralize script tags
  }

  /**
   * Get all security middleware for photo routes
   */
  getAllMiddleware() {
    return {
      securityHeaders: this.applySecurityHeaders(),
      uploadRateLimit: this.uploadRateLimit,
      viewRateLimit: this.viewRateLimit,
      validateFileUpload: this.validateFileUpload(),
      validatePhotoAccess: this.validatePhotoAccess(),
      validateInput: this.validatePhotoInput(),
      sanitizeContent: this.sanitizeContent(),
      auditLogger: this.auditLogger(),
      generateToken: this.generateSecureToken.bind(this),
      validateToken: this.validateSecureToken()
    };
  }
}

// Export singleton instance
module.exports = new PhotoSecurityMiddleware();