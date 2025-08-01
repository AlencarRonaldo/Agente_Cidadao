/**
 * CONTENT VALIDATION ENGINE - Motor de Validação de Conteúdo
 * 
 * Sistema robusto de validação de conteúdo com:
 * - Validação multi-camadas de texto e imagem
 * - Detecção de conteúdo impróprio ou spam
 * - Classificação inteligente de denúncias
 * - Prevenção de postagens genéricas ou irrelevantes
 * - Sistema de scoring de qualidade
 * - Cache inteligente para otimização
 * 
 * @author Content Quality Engineer
 * @priority CRITICAL - Content Quality Assurance
 */

const EventEmitter = require('events');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs').promises;
const logger = require('../utils/logger');

/**
 * INTELLIGENT CONTENT VALIDATOR - Validador Inteligente de Conteúdo
 */
class IntelligentContentValidator extends EventEmitter {
    constructor() {
        super();
        
        // Configurações do sistema
        this.config = {
            enableAdvancedValidation: true,
            enableImageAnalysis: true,
            enableSpamDetection: true,
            enableQualityScoring: true,
            cacheValidationResults: true,
            cacheExpirationTime: 3600000, // 1 hora
            minimumQualityScore: 60,
            maximumRiskScore: 0.7
        };

        // Cache de validações
        this.validationCache = new Map();
        
        // Padrões de conteúdo inválido
        this.invalidPatterns = {
            // Padrões genéricos que devem ser rejeitados
            generic: [
                /^teste\s*$/i,
                /^test\s*$/i,
                /^exemplo\s*$/i,
                /^sample\s*$/i,
                /^lorem ipsum/i,
                /^(a|e|i|o|u|1|2|3)+$/i, // Apenas vogais ou números
                /^(.)\1{5,}$/i, // Repetição de caracteres
                /^(ola|oi|hello|hi)\s*$/i // Saudações básicas
            ],
            
            // Padrões de spam
            spam: [
                /\b(compre|comprar|venda|vendas|promoção|desconto|oferta|grátis)\b/i,
                /\b(whatsapp|telegram|instagram|facebook)\s*:?\s*\d+/i,
                /\b\d{2,}\s*-?\s*\d{4,}\s*-?\s*\d{4,}\b/, // Telefones
                /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/, // Emails
                /\b(http|www\.)/i, // URLs
                /\b(pix|transferência|dinheiro|pagamento|$|R\$)\b/i
            ],
            
            // Conteúdo impróprio
            inappropriate: [
                /\b(fdp|caralho|porra|merda|buceta|cu|puta|viado)\b/i,
                /\b(política|político|eleição|voto|candidato|partido)\b/i,
                /\b(drogas|maconha|cocaína|crack|tráfico)\b/i,
                /\b(violência|matar|morrer|assassinar|bater)\b/i
            ],
            
            // Testes ou conteúdo de desenvolvimento
            development: [
                /^(test|teste|debug|dev|development)\b/i,
                /\b(placeholder|mock|dummy|fake)\b/i,
                /^\d+$/, // Apenas números
                /^[a-z]{1,3}$/i, // Muito curto
                /console\.log|alert\(|function\(/,
                /\{\{.*\}\}/, // Template strings
                /\$\{.*\}/ // Template literals
            ]
        };

        // Palavras-chave que indicam denúncias legítimas
        this.legitimateKeywords = [
            'buraco', 'asfalto', 'pavimentação', 'rua', 'avenida',
            'iluminação', 'luz', 'poste', 'lâmpada',
            'lixo', 'entulho', 'coleta', 'caçamba',
            'esgoto', 'vazamento', 'água', 'cano',
            'calçada', 'meio-fio', 'rampa', 'acessibilidade',
            'praça', 'parque', 'área verde', 'manutenção',
            'saúde', 'hospital', 'posto', 'remédio',
            'educação', 'escola', 'creche', 'professor',
            'transporte', 'ônibus', 'ponto', 'terminal',
            'segurança', 'polícia', 'roubo', 'assalto',
            'obras', 'construção', 'reforma', 'prédio',
            'barulho', 'ruído', 'perturbação', 'som alto'
        ];

        // Categorias de denúncia válidas
        this.validCategories = [
            'infraestrutura',
            'iluminacao',
            'limpeza',
            'saude',
            'educacao',
            'transporte',
            'seguranca',
            'meio_ambiente',
            'obras',
            'outros'
        ];

        this.initializeValidator();
    }

    /**
     * Inicializar validador
     */
    async initializeValidator() {
        try {
            logger.info('[VALIDATOR] Initializing Content Validation Engine...');
            
            // Carregar padrões personalizados se existirem
            await this.loadCustomPatterns();
            
            // Configurar limpeza periódica do cache
            setInterval(() => this.cleanupCache(), this.config.cacheExpirationTime);
            
            this.emit('validatorInitialized');
            logger.info('[VALIDATOR] Content Validation Engine initialized successfully');
            
        } catch (error) {
            logger.error('[VALIDATOR] Failed to initialize validator:', error);
            throw error;
        }
    }

    /**
     * Carregar padrões personalizados
     */
    async loadCustomPatterns() {
        try {
            const customPatternsPath = path.join(__dirname, '../config/customValidationPatterns.json');
            
            try {
                const customPatterns = JSON.parse(await fs.readFile(customPatternsPath, 'utf8'));
                
                // Mesclar padrões personalizados
                Object.keys(customPatterns).forEach(category => {
                    if (this.invalidPatterns[category]) {
                        this.invalidPatterns[category] = [
                            ...this.invalidPatterns[category],
                            ...customPatterns[category].map(pattern => new RegExp(pattern, 'i'))
                        ];
                    }
                });
                
                logger.info('[VALIDATOR] Custom patterns loaded successfully');
                
            } catch (error) {
                // Arquivo não existe, criar padrões padrão
                await this.createDefaultCustomPatterns(customPatternsPath);
            }
            
        } catch (error) {
            logger.warn('[VALIDATOR] Failed to load custom patterns:', error.message);
        }
    }

    /**
     * Criar padrões personalizados padrão
     */
    async createDefaultCustomPatterns(filePath) {
        const defaultPatterns = {
            generic: [
                "^qualquer coisa$",
                "^algo ai$",
                "^nada especifico$"
            ],
            spam: [
                "\\b(vendedor|vendedora)\\b",
                "\\b(promocao especial)\\b"
            ],
            inappropriate: [],
            development: [
                "^(exemplo|sample)\\s+\\d+$"
            ]
        };

        try {
            await fs.writeFile(filePath, JSON.stringify(defaultPatterns, null, 2));
            logger.info('[VALIDATOR] Default custom patterns created');
        } catch (error) {
            logger.warn('[VALIDATOR] Failed to create default patterns:', error.message);
        }
    }

    /**
     * Validar conteúdo completo (texto + imagem + contexto)
     */
    async validateContent(content) {
        const validationId = this.generateValidationId(content);
        
        // Verificar cache primeiro
        if (this.config.cacheValidationResults && this.validationCache.has(validationId)) {
            const cachedResult = this.validationCache.get(validationId);
            if (Date.now() - cachedResult.timestamp < this.config.cacheExpirationTime) {
                logger.debug(`[VALIDATOR] Cache hit for validation ${validationId}`);
                return cachedResult.result;
            }
        }

        const startTime = Date.now();
        
        try {
            logger.info(`[VALIDATOR] Starting content validation ${validationId}`);
            
            const result = {
                isValid: true,
                qualityScore: 100,
                riskScore: 0,
                reasons: [],
                recommendations: [],
                category: null,
                confidence: 0,
                details: {
                    textValidation: null,
                    imageValidation: null,
                    contextValidation: null,
                    spamDetection: null
                },
                metadata: {
                    validationId,
                    timestamp: Date.now(),
                    processingTime: 0
                }
            };

            // 1. Validação de texto
            if (content.texto) {
                result.details.textValidation = await this.validateText(content.texto);
                this.updateResultFromValidation(result, result.details.textValidation);
            }

            // 2. Validação de imagem
            if (content.imagem && this.config.enableImageAnalysis) {
                result.details.imageValidation = await this.validateImage(content.imagem);
                this.updateResultFromValidation(result, result.details.imageValidation);
            }

            // 3. Validação de contexto
            if (content.bairro || content.vereadores) {
                result.details.contextValidation = await this.validateContext(content);
                this.updateResultFromValidation(result, result.details.contextValidation);
            }

            // 4. Detecção de spam
            if (this.config.enableSpamDetection) {
                result.details.spamDetection = await this.detectSpam(content);
                this.updateResultFromValidation(result, result.details.spamDetection);
            }

            // 5. Classificação automática
            if (result.isValid) {
                result.category = this.classifyContent(content);
                result.confidence = this.calculateConfidence(result);
            }

            // 6. Verificação final de qualidade
            if (this.config.enableQualityScoring) {
                result.qualityScore = this.calculateQualityScore(result);
                result.riskScore = this.calculateRiskScore(result);
                
                // Aplicar thresholds finais
                if (result.qualityScore < this.config.minimumQualityScore) {
                    result.isValid = false;
                    result.reasons.push(`Quality score too low: ${result.qualityScore}`);
                }
                
                if (result.riskScore > this.config.maximumRiskScore) {
                    result.isValid = false;
                    result.reasons.push(`Risk score too high: ${result.riskScore}`);
                }
            }

            result.metadata.processingTime = Date.now() - startTime;

            // Cache resultado
            if (this.config.cacheValidationResults) {
                this.validationCache.set(validationId, {
                    result: { ...result },
                    timestamp: Date.now()
                });
            }

            // Emitir evento
            this.emit('contentValidated', {
                validationId,
                isValid: result.isValid,
                qualityScore: result.qualityScore,
                riskScore: result.riskScore,
                category: result.category,
                processingTime: result.metadata.processingTime
            });

            logger.info(`[VALIDATOR] Validation ${validationId} completed in ${result.metadata.processingTime}ms: ${result.isValid ? 'VALID' : 'INVALID'}`);
            
            return result;

        } catch (error) {
            logger.error(`[VALIDATOR] Validation ${validationId} failed:`, error);
            
            return {
                isValid: false,
                qualityScore: 0,
                riskScore: 1.0,
                reasons: [`Validation failed: ${error.message}`],
                recommendations: ['Please review content and try again'],
                category: null,
                confidence: 0,
                details: {},
                metadata: {
                    validationId,
                    error: error.message,
                    timestamp: Date.now(),
                    processingTime: Date.now() - startTime
                }
            };
        }
    }

    /**
     * Validar texto
     */
    async validateText(texto) {
        const result = {
            isValid: true,
            score: 100,
            issues: [],
            category: 'text_validation'
        };

        // Verificações básicas
        if (!texto || typeof texto !== 'string') {
            result.isValid = false;
            result.score = 0;
            result.issues.push('Text is empty or invalid');
            return result;
        }

        const cleanText = texto.trim();
        
        // Muito curto
        if (cleanText.length < 10) {
            result.isValid = false;
            result.score -= 50;
            result.issues.push('Text too short (minimum 10 characters)');
        }

        // Muito longo (spam potential)
        if (cleanText.length > 1000) {
            result.score -= 20;
            result.issues.push('Text is very long (potential spam)');
        }

        // Verificar padrões inválidos
        for (const [category, patterns] of Object.entries(this.invalidPatterns)) {
            for (const pattern of patterns) {
                if (pattern.test(cleanText)) {
                    result.isValid = false;
                    result.score = Math.max(0, result.score - 40);
                    result.issues.push(`Matched invalid pattern (${category}): ${pattern.source}`);
                }
            }
        }

        // Verificar se tem palavras-chave legítimas
        const hasLegitimateKeywords = this.legitimateKeywords.some(keyword => 
            cleanText.toLowerCase().includes(keyword.toLowerCase())
        );

        if (!hasLegitimateKeywords && cleanText.length > 20) {
            result.score -= 30;
            result.issues.push('No legitimate complaint keywords found');
        }

        // Verificar repetição excessiva
        const words = cleanText.toLowerCase().split(/\s+/);
        const wordCount = {};
        words.forEach(word => {
            wordCount[word] = (wordCount[word] || 0) + 1;
        });

        const mostRepeatedCount = Math.max(...Object.values(wordCount));
        if (mostRepeatedCount > 5) {
            result.score -= 25;
            result.issues.push('Excessive word repetition detected');
        }

        // Verificar caracteres especiais excessivos
        const specialCharCount = (cleanText.match(/[!@#$%^&*(),.?":{}|<>]/g) || []).length;
        if (specialCharCount > cleanText.length * 0.1) {
            result.score -= 15;
            result.issues.push('Excessive special characters');
        }

        return result;
    }

    /**
     * Validar imagem
     */
    async validateImage(imagePath) {
        const result = {
            isValid: true,
            score: 100,
            issues: [],
            category: 'image_validation'
        };

        try {
            // Verificar se arquivo existe
            const stats = await fs.stat(imagePath);
            
            // Verificar tamanho (muito pequeno pode ser suspeito)
            if (stats.size < 1024) { // Menos de 1KB
                result.score -= 30;
                result.issues.push('Image file is very small (suspicious)');
            }

            // Verificar tamanho (muito grande pode ser problemático)
            if (stats.size > 10 * 1024 * 1024) { // Mais de 10MB
                result.score -= 20;
                result.issues.push('Image file is very large');
            }

            // Verificar extensão
            const ext = path.extname(imagePath).toLowerCase();
            if (!['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
                result.isValid = false;
                result.score = 0;
                result.issues.push('Invalid image format');
            }

            // Verificar se não é uma imagem padrão de teste
            const fileName = path.basename(imagePath).toLowerCase();
            if (['test.jpg', 'sample.png', 'placeholder.jpg', 'dummy.png'].includes(fileName)) {
                result.isValid = false;
                result.score = 0;
                result.issues.push('Test/placeholder image detected');
            }

        } catch (error) {
            result.isValid = false;
            result.score = 0;
            result.issues.push(`Image validation failed: ${error.message}`);
        }

        return result;
    }

    /**
     * Validar contexto
     */
    async validateContext(content) {
        const result = {
            isValid: true,
            score: 100,
            issues: [],
            category: 'context_validation'
        };

        // Verificar bairro
        if (content.bairro) {
            if (typeof content.bairro !== 'string' || content.bairro.trim().length < 2) {
                result.score -= 30;
                result.issues.push('Invalid neighborhood');
            }
        }

        // Verificar vereadores
        if (content.vereadores) {
            if (!Array.isArray(content.vereadores) || content.vereadores.length === 0) {
                result.score -= 20;
                result.issues.push('No city councilors specified');
            } else if (content.vereadores.length > 10) {
                result.score -= 15;
                result.issues.push('Too many city councilors specified');
            }
        }

        // Verificar coordenadas se disponíveis
        if (content.latitude && content.longitude) {
            const lat = parseFloat(content.latitude);
            const lng = parseFloat(content.longitude);
            
            // Verificar se coordenadas são válidas (Brasil aproximadamente)
            if (lat < -35 || lat > 5 || lng < -75 || lng > -30) {
                result.score -= 25;
                result.issues.push('Coordinates outside Brazil');
            }
        }

        return result;
    }

    /**
     * Detectar spam
     */
    async detectSpam(content) {
        const result = {
            isValid: true,
            score: 100,
            issues: [],
            category: 'spam_detection'
        };

        const texto = content.texto || '';
        
        // Verificar padrões de spam específicos
        const spamIndicators = [
            // Muito comercial
            { pattern: /\b(vend[oa]|compr[ao]|negóci[ao]|ofert[ao])\b/gi, score: -40, message: 'Commercial language detected' },
            
            // Contatos
            { pattern: /\b\d{2,3}[-.\s]?\d{4,5}[-.\s]?\d{4}\b/g, score: -50, message: 'Phone number detected' },
            { pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, score: -50, message: 'Email address detected' },
            
            // URLs
            { pattern: /https?:\/\/[^\s]+/gi, score: -30, message: 'URL detected' },
            { pattern: /www\.[^\s]+/gi, score: -30, message: 'Website detected' },
            
            // Redes sociais
            { pattern: /\b(whatsapp|telegram|instagram|facebook|tiktok)\b/gi, score: -25, message: 'Social media mention' },
            
            // Linguagem promocional
            { pattern: /\b(grátis|gratuito|promoção|desconto|oferta|barato)\b/gi, score: -35, message: 'Promotional language' },
            
            // Urgência falsa
            { pattern: /\b(urgente|rápido|agora|hoje|já)\b/gi, score: -20, message: 'Urgency language' },
            
            // Repetição suspeita
            { pattern: /(.{3,})\1{3,}/gi, score: -30, message: 'Suspicious repetition' }
        ];

        spamIndicators.forEach(indicator => {
            const matches = texto.match(indicator.pattern);
            if (matches) {
                result.score += indicator.score;
                result.issues.push(`${indicator.message} (${matches.length} occurrences)`);
            }
        });

        // Se score muito baixo, marcar como spam
        if (result.score < 50) {
            result.isValid = false;
        }

        return result;
    }

    /**
     * Classificar conteúdo automaticamente
     */
    classifyContent(content) {
        const texto = (content.texto || '').toLowerCase();
        
        const categoryKeywords = {
            infraestrutura: ['buraco', 'asfalto', 'pavimentação', 'rua', 'avenida', 'calçada', 'meio-fio'],
            iluminacao: ['luz', 'poste', 'lâmpada', 'iluminação', 'escuro', 'escuridão'],
            limpeza: ['lixo', 'entulho', 'coleta', 'sujeira', 'caçamba', 'varredura'],
            saude: ['hospital', 'posto', 'saúde', 'médico', 'remédio', 'medicamento'],
            educacao: ['escola', 'creche', 'educação', 'professor', 'aluno', 'ensino'],
            transporte: ['ônibus', 'ponto', 'terminal', 'transporte', 'trânsito'],
            seguranca: ['segurança', 'polícia', 'roubo', 'assalto', 'crime', 'violência'],
            meio_ambiente: ['meio ambiente', 'poluição', 'árvore', 'parque', 'verde'],
            obras: ['obra', 'construção', 'reforma', 'prédio', 'demolição']
        };

        let bestCategory = 'outros';
        let maxScore = 0;

        Object.entries(categoryKeywords).forEach(([category, keywords]) => {
            const score = keywords.reduce((sum, keyword) => {
                return sum + (texto.includes(keyword) ? 1 : 0);
            }, 0);

            if (score > maxScore) {
                maxScore = score;
                bestCategory = category;
            }
        });

        return maxScore > 0 ? bestCategory : 'outros';
    }

    /**
     * Calcular confiança da classificação
     */
    calculateConfidence(result) {
        let confidence = 0.5; // Base

        // Aumentar confiança baseado na qualidade
        confidence += (result.qualityScore / 100) * 0.3;

        // Diminuir confiança baseado no risco
        confidence -= result.riskScore * 0.2;

        // Aumentar confiança se todas as validações passaram
        const validationCount = Object.values(result.details).filter(v => v && v.isValid).length;
        const totalValidations = Object.keys(result.details).length;
        confidence += (validationCount / totalValidations) * 0.2;

        return Math.max(0, Math.min(1, confidence));
    }

    /**
     * Calcular score de qualidade
     */
    calculateQualityScore(result) {
        const validations = Object.values(result.details).filter(v => v && typeof v.score === 'number');
        
        if (validations.length === 0) return 50;

        const averageScore = validations.reduce((sum, v) => sum + v.score, 0) / validations.length;
        
        // Ajustar baseado na categoria
        let categoryBonus = 0;
        if (result.category && result.category !== 'outros') {
            categoryBonus = 10;
        }

        return Math.max(0, Math.min(100, averageScore + categoryBonus));
    }

    /**
     * Calcular score de risco
     */
    calculateRiskScore(result) {
        let riskScore = 0;

        // Aumentar risco baseado nos problemas encontrados
        const totalIssues = Object.values(result.details)
            .filter(v => v && Array.isArray(v.issues))
            .reduce((sum, v) => sum + v.issues.length, 0);
        
        riskScore += totalIssues * 0.1;

        // Aumentar risco se qualidade for baixa
        if (result.qualityScore < 50) {
            riskScore += 0.3;
        }

        // Aumentar risco se não passou em validações críticas
        if (result.details.spamDetection && !result.details.spamDetection.isValid) {
            riskScore += 0.4;
        }

        if (result.details.textValidation && !result.details.textValidation.isValid) {
            riskScore += 0.3;
        }

        return Math.max(0, Math.min(1, riskScore));
    }

    /**
     * Atualizar resultado baseado em validação específica
     */
    updateResultFromValidation(result, validation) {
        if (!validation) return;

        if (!validation.isValid) {
            result.isValid = false;
        }

        if (validation.issues && validation.issues.length > 0) {
            result.reasons.push(...validation.issues);
        }

        // Adicionar recomendações baseadas nos problemas
        if (validation.category === 'text_validation' && !validation.isValid) {
            result.recommendations.push('Review and improve the complaint text');
        }

        if (validation.category === 'spam_detection' && !validation.isValid) {
            result.recommendations.push('Remove promotional or commercial content');
        }

        if (validation.category === 'image_validation' && !validation.isValid) {
            result.recommendations.push('Provide a valid image of the complaint');
        }
    }

    /**
     * Gerar ID único para validação
     */
    generateValidationId(content) {
        const contentString = JSON.stringify({
            texto: content.texto || '',
            imagem: content.imagem ? path.basename(content.imagem) : '',
            bairro: content.bairro || '',
            vereadores: content.vereadores || []
        });
        
        return crypto.createHash('md5').update(contentString).digest('hex').substring(0, 8);
    }

    /**
     * Limpar cache antigo
     */
    cleanupCache() {
        const now = Date.now();
        let removedCount = 0;

        for (const [key, cached] of this.validationCache.entries()) {
            if (now - cached.timestamp > this.config.cacheExpirationTime) {
                this.validationCache.delete(key);
                removedCount++;
            }
        }

        if (removedCount > 0) {
            logger.debug(`[VALIDATOR] Cleaned up ${removedCount} expired cache entries`);
        }
    }

    /**
     * Obter estatísticas do validador
     */
    getValidatorStats() {
        return {
            cacheSize: this.validationCache.size,
            cacheHitRate: this.calculateCacheHitRate(),
            configuredPatterns: {
                generic: this.invalidPatterns.generic.length,
                spam: this.invalidPatterns.spam.length,
                inappropriate: this.invalidPatterns.inappropriate.length,
                development: this.invalidPatterns.development.length
            },
            configuration: { ...this.config }
        };
    }

    /**
     * Calcular taxa de hit do cache
     */
    calculateCacheHitRate() {
        // Esta seria implementada com contadores reais
        return 0.75; // 75% placeholder
    }

    /**
     * Validar lote de conteúdos
     */
    async validateBatch(contents) {
        const results = [];
        
        for (const content of contents) {
            try {
                const result = await this.validateContent(content);
                results.push(result);
            } catch (error) {
                results.push({
                    isValid: false,
                    error: error.message,
                    metadata: {
                        timestamp: Date.now()
                    }
                });
            }
        }

        return results;
    }

    /**
     * Adicionar padrão personalizado
     */
    addCustomPattern(category, pattern, description = '') {
        if (!this.invalidPatterns[category]) {
            this.invalidPatterns[category] = [];
        }

        const regex = new RegExp(pattern, 'i');
        this.invalidPatterns[category].push(regex);

        this.emit('customPatternAdded', {
            category,
            pattern,
            description,
            timestamp: Date.now()
        });

        logger.info(`[VALIDATOR] Custom pattern added to ${category}: ${pattern}`);
    }

    /**
     * Remover padrão personalizado
     */
    removeCustomPattern(category, patternIndex) {
        if (this.invalidPatterns[category] && this.invalidPatterns[category][patternIndex]) {
            const removedPattern = this.invalidPatterns[category].splice(patternIndex, 1)[0];
            
            this.emit('customPatternRemoved', {
                category,
                pattern: removedPattern.source,
                timestamp: Date.now()
            });

            logger.info(`[VALIDATOR] Custom pattern removed from ${category}: ${removedPattern.source}`);
        }
    }
}

module.exports = new IntelligentContentValidator();