const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');
const crypto = require('crypto');

class UploadService {
    constructor() {
        this.uploadDir = process.env.UPLOAD_PATH || './uploads';
        this.maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024; // 5MB
        this.allowedTypes = (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/jpg').split(',');
        
        this.ensureUploadDir();
    }

    async ensureUploadDir() {
        try {
            await fs.access(this.uploadDir);
        } catch {
            await fs.mkdir(this.uploadDir, { recursive: true });
            console.log(`📁 Diretório de upload criado: ${this.uploadDir}`);
        }
    }

    /**
     * Processa upload de imagem do WhatsApp
     * @param {Buffer} fileBuffer - Buffer da imagem
     * @param {string} mimeType - Tipo MIME da imagem
     * @param {string} originalName - Nome original (opcional)
     * @returns {Object} Informações do arquivo processado
     */
    async processWhatsAppImage(fileBuffer, mimeType, originalName = 'whatsapp-image') {
        try {
            // Validar tipo de arquivo
            if (!this.allowedTypes.includes(mimeType)) {
                throw new Error(`Tipo de arquivo não permitido: ${mimeType}`);
            }

            // Validar tamanho
            if (fileBuffer.length > this.maxFileSize) {
                throw new Error(`Arquivo muito grande: ${fileBuffer.length} bytes (máximo: ${this.maxFileSize})`);
            }

            // Gerar nome único
            const timestamp = Date.now();
            const hash = crypto.createHash('md5').update(fileBuffer).digest('hex').substring(0, 8);
            const extension = this.getExtensionFromMimeType(mimeType);
            const filename = `${timestamp}-${hash}.${extension}`;
            const filepath = path.join(this.uploadDir, filename);

            // Processar imagem com sharp (otimização e validação)
            const processedBuffer = await sharp(fileBuffer)
                .resize(1200, 1200, { 
                    fit: 'inside', 
                    withoutEnlargement: true 
                })
                .jpeg({ 
                    quality: 85,
                    progressive: true 
                })
                .toBuffer();

            // Salvar arquivo
            await fs.writeFile(filepath, processedBuffer);

            // Gerar thumbnail
            const thumbnailPath = await this.generateThumbnail(filepath, filename);

            const fileInfo = {
                originalName,
                filename,
                filepath,
                thumbnailPath,
                size: processedBuffer.length,
                mimeType: 'image/jpeg', // Sempre convertemos para JPEG
                url: `/uploads/${filename}`,
                thumbnailUrl: `/uploads/thumbnails/${filename}`,
                uploadedAt: new Date()
            };

            console.log(`📸 Imagem processada: ${filename} (${processedBuffer.length} bytes)`);
            return fileInfo;

        } catch (error) {
            console.error('❌ Erro ao processar imagem:', error);
            throw new Error(`Falha no upload: ${error.message}`);
        }
    }

    /**
     * Gera thumbnail da imagem
     */
    async generateThumbnail(originalPath, filename) {
        try {
            const thumbnailDir = path.join(this.uploadDir, 'thumbnails');
            await fs.mkdir(thumbnailDir, { recursive: true });

            const thumbnailPath = path.join(thumbnailDir, filename);

            await sharp(originalPath)
                .resize(300, 300, { 
                    fit: 'cover',
                    position: 'center' 
                })
                .jpeg({ 
                    quality: 70 
                })
                .toFile(thumbnailPath);

            return thumbnailPath;
        } catch (error) {
            console.warn('⚠️ Erro ao gerar thumbnail:', error.message);
            return null;
        }
    }

    /**
     * Obtém extensão baseada no MIME type
     */
    getExtensionFromMimeType(mimeType) {
        const extensions = {
            'image/jpeg': 'jpg',
            'image/jpg': 'jpg',
            'image/png': 'png'
        };
        return extensions[mimeType] || 'jpg';
    }

    /**
     * Remove arquivo do sistema
     */
    async deleteFile(filename) {
        try {
            const filepath = path.join(this.uploadDir, filename);
            const thumbnailPath = path.join(this.uploadDir, 'thumbnails', filename);

            await Promise.allSettled([
                fs.unlink(filepath),
                fs.unlink(thumbnailPath)
            ]);

            console.log(`🗑️ Arquivo removido: ${filename}`);
            return true;
        } catch (error) {
            console.error('❌ Erro ao remover arquivo:', error);
            return false;
        }
    }

    /**
     * Limpeza de arquivos antigos
     */
    async cleanupOldFiles(daysOld = 30) {
        try {
            const files = await fs.readdir(this.uploadDir);
            const cutoffDate = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
            let deletedCount = 0;

            for (const file of files) {
                if (file === 'thumbnails') continue;

                const filepath = path.join(this.uploadDir, file);
                const stats = await fs.stat(filepath);

                if (stats.mtime.getTime() < cutoffDate) {
                    await this.deleteFile(file);
                    deletedCount++;
                }
            }

            console.log(`🧹 Limpeza concluída: ${deletedCount} arquivos removidos`);
            return deletedCount;
        } catch (error) {
            console.error('❌ Erro na limpeza de arquivos:', error);
            return 0;
        }
    }

    /**
     * Obtém informações de um arquivo
     */
    async getFileInfo(filename) {
        try {
            const filepath = path.join(this.uploadDir, filename);
            const stats = await fs.stat(filepath);

            return {
                filename,
                size: stats.size,
                uploadedAt: stats.birthtime,
                modifiedAt: stats.mtime,
                url: `/uploads/${filename}`,
                exists: true
            };
        } catch (error) {
            return {
                filename,
                exists: false,
                error: error.message
            };
        }
    }

    /**
     * Valida se um arquivo existe
     */
    async fileExists(filename) {
        try {
            const filepath = path.join(this.uploadDir, filename);
            await fs.access(filepath);
            return true;
        } catch {
            return false;
        }
    }
}

module.exports = new UploadService();