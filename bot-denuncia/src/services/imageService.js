/**
 * Serviço de Processamento de Imagens
 * Handles image upload, processing, and optimization for Instagram
 */

const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const logger = require('../utils/logger');

class ImageService {
  constructor() {
    this.uploadsDir = path.join(__dirname, '../../uploads');
    this.tempDir = path.join(__dirname, '../../temp');
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
    this.allowedFormats = ['jpeg', 'jpg', 'png', 'webp'];
    
    // Instagram-specific configurations
    this.instagramSpecs = {
      square: { width: 1080, height: 1080 },
      portrait: { width: 1080, height: 1350 },
      landscape: { width: 1080, height: 566 },
      story: { width: 1080, height: 1920 }
    };
    
    this.ensureDirectories();
  }

  /**
   * Garantir que os diretórios existem
   */
  async ensureDirectories() {
    try {
      await fs.mkdir(this.uploadsDir, { recursive: true });
      await fs.mkdir(this.tempDir, { recursive: true });
      logger.info('✅ Image directories ensured');
    } catch (error) {
      logger.error('❌ Failed to create image directories:', error.message);
    }
  }

  /**
   * Validar arquivo de imagem
   */
  async validateImage(filePath, fileSize) {
    try {
      // Verificar tamanho do arquivo
      if (fileSize > this.maxFileSize) {
        throw new Error(`File size exceeds maximum limit of ${this.maxFileSize / 1024 / 1024}MB`);
      }

      // Verificar se o arquivo existe
      await fs.access(filePath);

      // Obter metadados da imagem
      const metadata = await sharp(filePath).metadata();
      
      if (!metadata.format || !this.allowedFormats.includes(metadata.format)) {
        throw new Error(`Unsupported image format. Allowed: ${this.allowedFormats.join(', ')}`);
      }

      // Verificar dimensões mínimas
      if (metadata.width < 320 || metadata.height < 320) {
        throw new Error('Image dimensions too small. Minimum 320x320 pixels');
      }

      // Verificar dimensões máximas
      if (metadata.width > 8000 || metadata.height > 8000) {
        throw new Error('Image dimensions too large. Maximum 8000x8000 pixels');
      }

      return {
        valid: true,
        metadata: {
          format: metadata.format,
          width: metadata.width,
          height: metadata.height,
          size: fileSize,
          hasAlpha: metadata.hasAlpha
        }
      };

    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Processar imagem para Instagram
   */
  async processForInstagram(inputPath, options = {}) {
    try {
      const {
        type = 'square', // square, portrait, landscape, story
        quality = 85,
        addWatermark = false,
        watermarkText = '',
        backgroundColor = '#ffffff'
      } = options;

      // Validar imagem
      const validation = await this.validateImage(inputPath, await this.getFileSize(inputPath));
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Obter especificações do Instagram
      const specs = this.instagramSpecs[type];
      if (!specs) {
        throw new Error(`Invalid Instagram type: ${type}`);
      }

      // Gerar nome único para arquivo processado
      const filename = this.generateFilename('processed', 'jpg');
      const outputPath = path.join(this.tempDir, filename);

      // Processar imagem
      let pipeline = sharp(inputPath);

      // Redimensionar mantendo proporção
      pipeline = pipeline.resize(specs.width, specs.height, {
        fit: 'cover',
        position: 'center',
        background: backgroundColor
      });

      // Otimizar para Instagram
      pipeline = pipeline.jpeg({
        quality: quality,
        progressive: true,
        mozjpeg: true
      });

      // Adicionar marca d'água se solicitado
      if (addWatermark && watermarkText) {
        pipeline = await this.addWatermark(pipeline, watermarkText, specs);
      }

      // Salvar imagem processada
      await pipeline.toFile(outputPath);

      // Obter informações do arquivo processado
      const processedMetadata = await sharp(outputPath).metadata();
      const processedSize = await this.getFileSize(outputPath);

      logger.info(`🖼️ Image processed for Instagram: ${specs.width}x${specs.height}, ${quality}% quality`);

      return {
        success: true,
        filePath: outputPath,
        filename: filename,
        metadata: {
          width: processedMetadata.width,
          height: processedMetadata.height,
          format: processedMetadata.format,
          size: processedSize
        },
        originalMetadata: validation.metadata
      };

    } catch (error) {
      logger.error('❌ Image processing failed:', error.message);
      throw new Error(`Image processing failed: ${error.message}`);
    }
  }

  /**
   * Adicionar marca d'água à imagem
   */
  async addWatermark(pipeline, text, specs) {
    try {
      // Criar SVG para marca d'água
      const fontSize = Math.max(24, specs.width / 40);
      const watermarkSvg = `
        <svg width="${specs.width}" height="${specs.height}">
          <defs>
            <filter id="shadow">
              <feDropShadow dx="2" dy="2" stdDeviation="2" flood-color="black" flood-opacity="0.5"/>
            </filter>
          </defs>
          <text 
            x="${specs.width - 20}" 
            y="${specs.height - 20}" 
            font-family="Arial, sans-serif" 
            font-size="${fontSize}" 
            font-weight="bold"
            fill="white" 
            text-anchor="end"
            filter="url(#shadow)"
          >${text}</text>
        </svg>
      `;

      const watermarkBuffer = Buffer.from(watermarkSvg);

      return pipeline.composite([{
        input: watermarkBuffer,
        gravity: 'southeast'
      }]);

    } catch (error) {
      logger.warn('⚠️ Failed to add watermark, continuing without it:', error.message);
      return pipeline;
    }
  }

  /**
   * Criar colagem de múltiplas imagens
   */
  async createCollage(imagePaths, options = {}) {
    try {
      const {
        layout = 'grid', // grid, horizontal, vertical
        backgroundColor = '#ffffff',
        spacing = 10,
        outputType = 'square'
      } = options;

      if (imagePaths.length === 0) {
        throw new Error('No images provided for collage');
      }

      if (imagePaths.length > 9) {
        throw new Error('Maximum 9 images allowed for collage');
      }

      const specs = this.instagramSpecs[outputType];
      const filename = this.generateFilename('collage', 'jpg');
      const outputPath = path.join(this.tempDir, filename);

      let composite = [];

      if (layout === 'grid') {
        composite = await this.createGridLayout(imagePaths, specs, spacing);
      } else if (layout === 'horizontal') {
        composite = await this.createHorizontalLayout(imagePaths, specs, spacing);
      } else if (layout === 'vertical') {
        composite = await this.createVerticalLayout(imagePaths, specs, spacing);
      }

      // Criar imagem base
      await sharp({
        create: {
          width: specs.width,
          height: specs.height,
          channels: 3,
          background: backgroundColor
        }
      })
      .composite(composite)
      .jpeg({ quality: 85, progressive: true })
      .toFile(outputPath);

      logger.info(`✨ Collage created: ${layout} layout with ${imagePaths.length} images`);

      return {
        success: true,
        filePath: outputPath,
        filename: filename,
        layout: layout,
        imageCount: imagePaths.length
      };

    } catch (error) {
      logger.error('❌ Collage creation failed:', error.message);
      throw new Error(`Collage creation failed: ${error.message}`);
    }
  }

  /**
   * Criar layout em grade
   */
  async createGridLayout(imagePaths, specs, spacing) {
    const imageCount = imagePaths.length;
    const cols = Math.ceil(Math.sqrt(imageCount));
    const rows = Math.ceil(imageCount / cols);
    
    const cellWidth = Math.floor((specs.width - spacing * (cols + 1)) / cols);
    const cellHeight = Math.floor((specs.height - spacing * (rows + 1)) / rows);

    const composite = [];

    for (let i = 0; i < imagePaths.length; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      
      const x = spacing + col * (cellWidth + spacing);
      const y = spacing + row * (cellHeight + spacing);

      const processedImage = await sharp(imagePaths[i])
        .resize(cellWidth, cellHeight, { fit: 'cover' })
        .jpeg()
        .toBuffer();

      composite.push({
        input: processedImage,
        left: x,
        top: y
      });
    }

    return composite;
  }

  /**
   * Criar layout horizontal
   */
  async createHorizontalLayout(imagePaths, specs, spacing) {
    const imageCount = imagePaths.length;
    const cellWidth = Math.floor((specs.width - spacing * (imageCount + 1)) / imageCount);
    const cellHeight = specs.height - spacing * 2;

    const composite = [];

    for (let i = 0; i < imagePaths.length; i++) {
      const x = spacing + i * (cellWidth + spacing);
      const y = spacing;

      const processedImage = await sharp(imagePaths[i])
        .resize(cellWidth, cellHeight, { fit: 'cover' })
        .jpeg()
        .toBuffer();

      composite.push({
        input: processedImage,
        left: x,
        top: y
      });
    }

    return composite;
  }

  /**
   * Criar layout vertical
   */
  async createVerticalLayout(imagePaths, specs, spacing) {
    const imageCount = imagePaths.length;
    const cellWidth = specs.width - spacing * 2;
    const cellHeight = Math.floor((specs.height - spacing * (imageCount + 1)) / imageCount);

    const composite = [];

    for (let i = 0; i < imagePaths.length; i++) {
      const x = spacing;
      const y = spacing + i * (cellHeight + spacing);

      const processedImage = await sharp(imagePaths[i])
        .resize(cellWidth, cellHeight, { fit: 'cover' })
        .jpeg()
        .toBuffer();

      composite.push({
        input: processedImage,
        left: x,
        top: y
      });
    }

    return composite;
  }

  /**
   * Otimizar imagem existente
   */
  async optimizeImage(inputPath, options = {}) {
    try {
      const {
        quality = 85,
        format = 'jpeg',
        progressive = true,
        removeMetadata = true
      } = options;

      const filename = this.generateFilename('optimized', format);
      const outputPath = path.join(this.tempDir, filename);

      let pipeline = sharp(inputPath);

      // Remover metadados se solicitado
      if (removeMetadata) {
        pipeline = pipeline.withMetadata();
      }

      // Aplicar formato e qualidade
      if (format === 'jpeg') {
        pipeline = pipeline.jpeg({ quality, progressive });
      } else if (format === 'png') {
        pipeline = pipeline.png({ compressionLevel: 9 });
      } else if (format === 'webp') {
        pipeline = pipeline.webp({ quality });
      }

      await pipeline.toFile(outputPath);

      const originalSize = await this.getFileSize(inputPath);
      const optimizedSize = await this.getFileSize(outputPath);
      const compressionRatio = ((originalSize - optimizedSize) / originalSize * 100).toFixed(1);

      logger.info(`📉 Image optimized: ${compressionRatio}% size reduction`);

      return {
        success: true,
        filePath: outputPath,
        filename: filename,
        originalSize: originalSize,
        optimizedSize: optimizedSize,
        compressionRatio: compressionRatio
      };

    } catch (error) {
      logger.error('❌ Image optimization failed:', error.message);
      throw new Error(`Image optimization failed: ${error.message}`);
    }
  }

  /**
   * Obter tamanho do arquivo
   */
  async getFileSize(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return stats.size;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Gerar nome único para arquivo
   */
  generateFilename(prefix, extension) {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    return `${prefix}_${timestamp}_${random}.${extension}`;
  }

  /**
   * Limpar arquivos temporários antigos
   */
  async cleanupTempFiles(maxAge = 24 * 60 * 60 * 1000) { // 24 horas
    try {
      const files = await fs.readdir(this.tempDir);
      let cleanedCount = 0;

      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        const stats = await fs.stat(filePath);
        
        if (Date.now() - stats.mtime.getTime() > maxAge) {
          await fs.unlink(filePath);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        logger.info(`🧹 Cleaned up ${cleanedCount} temporary files`);
      }

      return { cleanedCount };
    } catch (error) {
      logger.error('❌ Failed to cleanup temp files:', error.message);
      return { cleanedCount: 0, error: error.message };
    }
  }

  /**
   * Obter informações detalhadas da imagem
   */
  async getImageInfo(filePath) {
    try {
      const metadata = await sharp(filePath).metadata();
      const fileSize = await this.getFileSize(filePath);

      return {
        format: metadata.format,
        width: metadata.width,
        height: metadata.height,
        size: fileSize,
        density: metadata.density,
        hasAlpha: metadata.hasAlpha,
        channels: metadata.channels,
        colorspace: metadata.space
      };
    } catch (error) {
      logger.error('❌ Failed to get image info:', error.message);
      return null;
    }
  }

  /**
   * Criar miniatura
   */
  async createThumbnail(inputPath, size = 200) {
    try {
      const filename = this.generateFilename('thumb', 'jpg');
      const outputPath = path.join(this.tempDir, filename);

      await sharp(inputPath)
        .resize(size, size, { fit: 'cover' })
        .jpeg({ quality: 80 })
        .toFile(outputPath);

      return {
        success: true,
        filePath: outputPath,
        filename: filename,
        size: size
      };
    } catch (error) {
      logger.error('❌ Thumbnail creation failed:', error.message);
      throw new Error(`Thumbnail creation failed: ${error.message}`);
    }
  }
}

module.exports = new ImageService();