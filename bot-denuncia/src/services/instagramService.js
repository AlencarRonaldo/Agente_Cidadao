/**
 * Serviço de Integração Instagram Private API
 * Handles real Instagram posting with authentication and error handling
 */

const { IgApiClient, IgCheckpointError, IgChallengeWrongCodeError, IgLoginTwoFactorRequiredError } = require('instagram-private-api');
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const logger = require('../utils/logger');
const InstagramHumanizationEngine = require('./instagramHumanizationEngine');

class InstagramService {
  constructor() {
    this.ig = new IgApiClient();
    this.isLoggedIn = false;
    this.loginAttempts = 0;
    this.maxLoginAttempts = 3;
    this.sessionPath = path.join(__dirname, '../../instagram-session.json');
    this.rateLimitDelay = 5000; // 5 segundos entre posts (fallback básico)
    this.lastPostTime = 0;
    
    // Configurações da conta
    this.username = process.env.INSTAGRAM_USERNAME || 'conta_teste_instagram';
    this.password = process.env.INSTAGRAM_PASSWORD || 'senha_teste_instagram';
    
    // Initialize Humanization Engine
    this.humanizationEngine = new InstagramHumanizationEngine();
    logger.info('🤖 Instagram Humanization Engine initialized');
    
    // Store credentials availability for later checks
    this.hasValidCredentials = Boolean(
      this.username && 
      this.password && 
      this.username !== 'conta_teste_instagram' && 
      this.password !== 'senha_teste_instagram'
    );
    
    if (!this.hasValidCredentials) {
      logger.warn('⚠️ Instagram credentials not properly configured!', {
        hasUsername: Boolean(this.username),
        hasPassword: Boolean(this.password),
        usingDefaults: this.username === 'conta_teste_instagram',
        message: 'Service will be available but login will fail until credentials are configured'
      });
      // Note: Don't throw error here, allow service to load but mark as unavailable
    } else {
      logger.info(`🔐 Instagram service configured for user: ${this.username}`);
    }
  }

  /**
   * Inicializar o cliente Instagram
   */
  async initialize() {
    try {
      // HUMANIZATION: Configure device with realistic headers
      this.ig.state.generateDevice(this.username);
      
      // Apply humanized headers if available
      if (this.humanizationEngine) {
        const headers = this.humanizationEngine.generateRealisticHeaders();
        // Apply user-agent to device state (check if writable)
        if (headers['User-Agent']) {
          try {
            // Use the device state's built-in user agent instead
            this.ig.state.deviceString = this.ig.state.deviceString.replace(
              /User-Agent: [^\n]+/,
              `User-Agent: ${headers['User-Agent']}`
            );
            logger.info('[HUMANIZATION] 📱 Realistic user-agent applied to device string');
          } catch (error) {
            logger.warn('[HUMANIZATION] Could not set user-agent, using default');
          }
        }
      }
      
      // Tentar carregar sessão existente
      await this.loadSession();
      
      if (!this.isLoggedIn) {
        await this.login();
      }
      
      // Verificar se a sessão está válida
      await this.validateSession();
      
      logger.info('✅ Instagram service initialized successfully with humanization');
      return true;
    } catch (error) {
      logger.error('❌ Failed to initialize Instagram service:', error.message);
      return false;
    }
  }

  /**
   * Fazer login no Instagram
   */
  async login() {
    if (this.loginAttempts >= this.maxLoginAttempts) {
      throw new Error('Maximum login attempts exceeded');
    }

    try {
      this.loginAttempts++;
      logger.info(`🔐 Attempting Instagram login (attempt ${this.loginAttempts}/${this.maxLoginAttempts})`);
      
      // Simulate device
      this.ig.state.generateDevice(this.username);
      
      // Login
      const user = await this.ig.account.login(this.username, this.password);
      
      this.isLoggedIn = true;
      this.loginAttempts = 0;
      
      // Salvar sessão
      await this.saveSession();
      
      logger.info(`✅ Instagram login successful for user: ${user.username}`);
      return user;
      
    } catch (error) {
      await this.handleLoginError(error);
      throw error;
    }
  }

  /**
   * Lidar com erros de login
   */
  async handleLoginError(error) {
    logger.error('🚨 Instagram login error detected:', {
      errorType: error?.constructor?.name,
      message: error?.message,
      hasChallenge: !!(error && error.challenge),
      challengeType: error?.challenge_type,
      errorCode: error?.error_type || error?.code
    });

    if (error instanceof IgCheckpointError) {
      logger.warn('⚠️ Instagram checkpoint required - attempting to handle automatically');
      try {
        await this.handleCheckpoint(error);
      } catch (checkpointError) {
        logger.error('❌ Checkpoint handling failed, service unavailable');
        throw new Error(
          'Instagram account requires checkpoint verification. ' +
          'Please complete verification via Instagram app/website and restart the service.'
        );
      }
    } else if (error instanceof IgLoginTwoFactorRequiredError) {
      logger.warn('⚠️ Two-factor authentication required');
      throw new Error(
        'Instagram account has 2FA enabled. ' +
        'This automated service cannot handle 2FA challenges. ' +
        'Please disable 2FA or use Graph API instead.'
      );
    } else if (error instanceof IgChallengeWrongCodeError) {
      logger.error('❌ Wrong verification code provided during challenge');
      throw new Error(
        'Instagram challenge verification failed with wrong code. ' +
        'Please complete verification manually via Instagram app.'
      );
    } else if (error?.message?.includes('challenge_required')) {
      logger.error('❌ Instagram challenge required (400 Bad Request)');
      throw new Error(
        'Instagram requires additional verification (challenge_required). ' +
        'Please log into Instagram manually to complete verification.'
      );
    } else if (error?.message?.includes('checkpoint_required')) {
      logger.error('❌ Instagram checkpoint required (400 Bad Request)');
      throw new Error(
        'Instagram account requires checkpoint verification. ' +
        'Please complete verification via Instagram app/website.'
      );
    } else if (error?.message?.includes('login_required')) {
      logger.error('❌ Instagram login failed - credentials may be invalid');
      throw new Error(
        'Instagram login failed. Please check credentials or account status.'
      );
    } else {
      logger.error('❌ Unknown Instagram login error:', {
        message: error.message,
        stack: error.stack
      });
      throw new Error(
        `Instagram login failed: ${error.message}. ` +
        'Consider using Graph API for more reliable authentication.'
      );
    }
  }

  /**
   * Salvar sessão para reutilização
   */
  async saveSession() {
    try {
      const sessionData = {
        cookies: this.ig.state.serializeCookieJar(),
        deviceString: this.ig.state.deviceString,
        deviceId: this.ig.state.deviceId,
        uuid: this.ig.state.uuid,
        phoneId: this.ig.state.phoneId,
        adid: this.ig.state.adid,
        build: this.ig.state.build,
        timestamp: Date.now()
      };

      await fs.writeFile(this.sessionPath, JSON.stringify(sessionData, null, 2));
      logger.info('💾 Instagram session saved');
    } catch (error) {
      logger.error('❌ Failed to save Instagram session:', error.message);
    }
  }

  /**
   * Carregar sessão existente
   */
  async loadSession() {
    try {
      const sessionData = JSON.parse(await fs.readFile(this.sessionPath, 'utf8'));
      
      // Verificar se a sessão não é muito antiga (24 horas)
      const maxAge = 24 * 60 * 60 * 1000; // 24 horas
      if (Date.now() - sessionData.timestamp > maxAge) {
        logger.info('📅 Instagram session expired, will login again');
        return false;
      }

      // Configurar estado do device
      this.ig.state.deviceString = sessionData.deviceString;
      this.ig.state.deviceId = sessionData.deviceId;
      this.ig.state.uuid = sessionData.uuid;
      this.ig.state.phoneId = sessionData.phoneId;
      this.ig.state.adid = sessionData.adid;
      this.ig.state.build = sessionData.build;
      
      // Restaurar cookies
      await this.ig.state.deserializeCookieJar(sessionData.cookies);
      
      this.isLoggedIn = true;
      logger.info('📱 Instagram session loaded from file');
      return true;
      
    } catch (error) {
      logger.info('📱 No valid Instagram session found, will login');
      return false;
    }
  }

  /**
   * Validar se a sessão ainda está ativa
   */
  async validateSession() {
    try {
      await this.ig.user.info(this.ig.state.cookieUserId);
      logger.info('✅ Instagram session is valid');
      return true;
    } catch (error) {
      logger.warn('⚠️ Instagram session invalid, will re-login');
      this.isLoggedIn = false;
      await this.login();
      return false;
    }
  }

  /**
   * Processar imagem para Instagram com validações
   */
  async processImage(imagePath, options = {}) {
    try {
      const {
        width = 1080,
        height = 1080,
        quality = 85,
        format = 'jpeg'
      } = options;

      // Validar se arquivo existe
      if (!imagePath) {
        throw new Error('Caminho da imagem é obrigatório');
      }

      // Converter caminho relativo para absoluto
      let fullImagePath = imagePath;
      if (imagePath.startsWith('/uploads/') || imagePath.startsWith('uploads/')) {
        // Caminho relativo do projeto
        fullImagePath = path.join(__dirname, '../..', imagePath.replace(/^\//, ''));
      } else if (!path.isAbsolute(imagePath)) {
        // Outros caminhos relativos
        fullImagePath = path.join(__dirname, '../..', imagePath);
      }

      logger.info(`[INSTAGRAM] Processando imagem: ${imagePath} -> ${fullImagePath}`);

      // Verificar se arquivo existe
      try {
        await fs.access(fullImagePath);
        logger.info(`[INSTAGRAM] Arquivo encontrado: ${fullImagePath}`);
      } catch (error) {
        logger.error(`[INSTAGRAM] Arquivo não encontrado: ${fullImagePath} (erro: ${error.message})`);
        throw new Error(`Arquivo de imagem não encontrado: ${fullImagePath}`);
      }

      // Validar dimensões
      if (width < 320 || height < 320 || width > 1080 || height > 1080) {
        throw new Error('Dimensões da imagem devem estar entre 320x320 e 1080x1080 pixels');
      }

      const processedBuffer = await sharp(fullImagePath)
        .resize(width, height, {
          fit: 'cover',
          position: 'center',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .jpeg({ quality, progressive: true, mozjpeg: true })
        .toBuffer();

      // Validar tamanho do arquivo processado (máx 8MB para Instagram)
      if (processedBuffer.length > 8 * 1024 * 1024) {
        logger.warn('[INSTAGRAM] Imagem processada muito grande, reduzindo qualidade...');
        return await sharp(fullImagePath)
          .resize(width, height, {
            fit: 'cover',
            position: 'center'
          })
          .jpeg({ quality: Math.max(60, quality - 20), progressive: true })
          .toBuffer();
      }

      logger.info(`[INSTAGRAM] Imagem processada: ${width}x${height}, qualidade: ${quality}%, tamanho: ${(processedBuffer.length / 1024).toFixed(1)}KB`);
      return processedBuffer;
      
    } catch (error) {
      logger.error('[INSTAGRAM] Falha no processamento da imagem:', error.message);
      throw new Error(`Falha ao processar imagem: ${error.message}`);
    }
  }

  /**
   * Publicar post no Instagram (método principal compatível com o sistema atual)
   * Integrado com Humanization Engine para comportamento natural
   */
  async publicar({ texto, imagem, vereadores }) {
    const startTime = Date.now();
    
    try {
      logger.info('[INSTAGRAM] 🚀 Iniciando publicação humanizada do post...');

      // Validação de entrada
      if (!texto || !imagem) {
        throw new Error('Texto e imagem são obrigatórios para publicação');
      }

      // HUMANIZATION: Check optimal posting time
      const postingTime = this.humanizationEngine.getOptimalPostingTime();
      if (postingTime.shouldWait) {
        logger.info(`[HUMANIZATION] ⏰ Aguardando momento ótimo para postagem (${postingTime.delayMinutes} min): ${postingTime.reason}`);
        
        // For immediate posting requests, we'll post anyway but log the recommendation
        if (postingTime.delayMinutes > 60) {
          logger.warn(`[HUMANIZATION] ⚠️ Postagem fora do horário ótimo. Recomendado aguardar até ${postingTime.optimalTime.toLocaleTimeString()}`);
        }
      }

      // HUMANIZATION: Generate risk assessment
      const riskAssessment = this.humanizationEngine.calculateRiskScore();
      logger.info(`[HUMANIZATION] 📊 Risk score: ${riskAssessment.totalRisk.toFixed(3)} - ${riskAssessment.recommendation}`);
      
      if (riskAssessment.emergencyMode) {
        logger.warn('[HUMANIZATION] 🚨 Emergency mode ativo - aplicando delays extras');
      }

      // Verificar se está inicializado
      if (!this.isLoggedIn) {
        logger.info('[INSTAGRAM] Serviço não inicializado, inicializando...');
        const initialized = await this.initialize();
        if (!initialized) {
          throw new Error('Falha ao inicializar serviço do Instagram');
        }
      }

      // HUMANIZATION: Generate content variation
      const variedContent = this.humanizationEngine.generateContentVariation(texto, { vereadores });
      logger.info('[HUMANIZATION] 📝 Conteúdo variado gerado para evitar padrões');

      // HUMANIZATION: Generate intelligent hashtag rotation
      const hashtags = this.humanizationEngine.generateHashtagRotation(vereadores);
      logger.info(`[HUMANIZATION] 🏷️ Hashtags rotacionadas: ${hashtags.slice(0, 5).join(', ')}... (${hashtags.length} total)`);
      
      // Preparar localização baseada no bairro (se disponível)
      const location = this.extractLocationFromText(texto);

      // Generate content hash for tracking
      const contentHash = crypto.createHash('md5').update(variedContent).digest('hex').substring(0, 8);

      const result = await this.publishPost({
        imagePath: imagem,
        caption: variedContent,
        hashtags: hashtags,
        location: location,
        humanized: true,
        contentHash: contentHash
      });

      const processingTime = Date.now() - startTime;

      if (result.success) {
        // HUMANIZATION: Track behavior for analysis
        this.humanizationEngine.trackBehavior('post', {
          contentHash,
          hashtagCount: hashtags.length,
          vereadorCount: vereadores?.length || 0,
          processingTime,
          riskScore: riskAssessment.totalRisk
        });

        // HUMANIZATION: Simulate engagement (occasionally)
        setTimeout(() => {
          this.humanizationEngine.simulateEngagement(result.mediaId);
        }, Math.random() * 30000 + 10000); // 10-40 seconds delay

        logger.info(`[INSTAGRAM] ✅ Post humanizado publicado com sucesso em ${processingTime}ms`);
        logger.info(`[HUMANIZATION] 📈 Behavior tracked - Risk: ${riskAssessment.totalRisk.toFixed(3)}`);
        
        return {
          success: true,
          postId: result.mediaId,
          postUrl: result.instagramUrl,
          timestamp: result.timestamp,
          processingTime,
          humanization: {
            riskScore: riskAssessment.totalRisk,
            emergencyMode: riskAssessment.emergencyMode,
            contentVaried: texto !== variedContent,
            hashtagsRotated: true,
            behaviorTracked: true
          }
        };
      } else {
        throw new Error(result.error);
      }

    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error(`[INSTAGRAM] ❌ Falha na publicação após ${processingTime}ms:`, {
        message: error.message,
        stack: error.stack
      });
      
      // Track failed attempt for risk assessment
      this.humanizationEngine.trackBehavior('post_failed', {
        error: error.message,
        processingTime
      });
      
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        processingTime
      };
    }
  }

  /**
   * Publicar post no Instagram (método interno)
   * Enhanced with humanization features
   */
  async publishPost(options) {
    if (!this.isLoggedIn) {
      await this.initialize();
    }

    // HUMANIZATION: Intelligent rate limiting with natural delays
    await this.respectHumanizedRateLimit(options.humanized);

    try {
      const {
        imagePath,
        caption,
        hashtags = [],
        location = null,
        userTags = [],
        humanized = false,
        contentHash = null
      } = options;

      logger.info('📤 Publishing Instagram post...');

      // Processar imagem
      const imageBuffer = await this.processImage(imagePath);

      // Preparar caption com hashtags
      const fullCaption = this.formatCaption(caption, hashtags);

      // Configurar opções do post
      const publishOptions = {
        file: imageBuffer,
        caption: fullCaption
      };

      // Adicionar localização se fornecida
      if (location) {
        const locationResult = await this.searchLocation(location);
        if (locationResult) {
          publishOptions.location = locationResult;
        }
      }

      // Publicar
      const publishResult = await this.ig.publish.photo(publishOptions);

      // Adicionar user tags se fornecidas
      if (userTags.length > 0) {
        await this.addUserTags(publishResult.media.pk, userTags);
      }

      this.lastPostTime = Date.now();

      logger.info(`✅ Instagram post published successfully! Media ID: ${publishResult.media.pk}`);
      
      return {
        success: true,
        mediaId: publishResult.media.pk,
        instagramUrl: `https://www.instagram.com/p/${publishResult.media.code}/`,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('❌ Failed to publish Instagram post:', error.message);
      
      // Tentar re-login se erro de autenticação
      if (error.message.includes('login') || error.message.includes('401')) {
        this.isLoggedIn = false;
        await this.initialize();
      }

      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Respeitar rate limit do Instagram com humanização inteligente
   */
  async respectHumanizedRateLimit(humanized = false) {
    if (humanized) {
      // Use humanization engine for natural delays
      const naturalDelay = this.humanizationEngine.calculateNaturalDelay();
      const timeSinceLastPost = Date.now() - this.lastPostTime;
      
      if (timeSinceLastPost < naturalDelay) {
        const waitTime = naturalDelay - timeSinceLastPost;
        logger.info(`⏳ [HUMANIZATION] Natural pacing: aguardando ${Math.round(waitTime/1000)}s (${Math.round(waitTime/60000)} min) antes do próximo post`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    } else {
      // Fallback to basic rate limiting
      await this.respectRateLimit();
    }
  }

  /**
   * Respeitar rate limit básico do Instagram (fallback)
   */
  async respectRateLimit() {
    const timeSinceLastPost = Date.now() - this.lastPostTime;
    if (timeSinceLastPost < this.rateLimitDelay) {
      const waitTime = this.rateLimitDelay - timeSinceLastPost;
      logger.info(`⏳ [INSTAGRAM] Rate limiting básico: aguardando ${waitTime}ms antes do próximo post`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  /**
   * Formatar caption com hashtags
   */
  formatCaption(caption, hashtags) {
    let fullCaption = caption;
    
    if (hashtags.length > 0) {
      const hashtagString = hashtags
        .map(tag => tag.startsWith('#') ? tag : `#${tag}`)
        .join(' ');
      fullCaption += `\n\n${hashtagString}`;
    }

    return fullCaption;
  }

  /**
   * Gerar hashtags baseadas nos vereadores com validação
   * Falls back to humanization engine if available
   */
  generateHashtags(vereadores) {
    // Use humanization engine if available for better rotation
    if (this.humanizationEngine) {
      try {
        return this.humanizationEngine.generateHashtagRotation(vereadores);
      } catch (error) {
        logger.warn('[INSTAGRAM] Humanization hashtag generation failed, using fallback:', error.message);
      }
    }

    // Fallback to basic hashtag generation
    const hashtags = [
      'DenunciaCidada',
      'SaoBernardodoCampo', 
      'FiscalizacaoCidada',
      'TransparenciaPublica',
      'ProblemasUrbanos'
    ];

    // Adicionar hashtags dos vereadores com validação
    if (vereadores && Array.isArray(vereadores) && vereadores.length > 0) {
      vereadores.forEach(vereador => {
        try {
          if (typeof vereador === 'string') {
            // Se vereador é string, assumir que é o instagram handle
            const cleanHandle = vereador.replace('@', '').replace(/\s+/g, '').toLowerCase();
            if (cleanHandle && cleanHandle.length > 0) {
              hashtags.push(cleanHandle);
            }
          } else if (vereador && typeof vereador === 'object') {
            // Se vereador é objeto, extrair instagram ou nome
            const vereadorTag = vereador.instagram?.replace('@', '').replace(/\s+/g, '').toLowerCase() || 
                              vereador.nome?.replace(/\s+/g, '').toLowerCase();
            if (vereadorTag && vereadorTag.length > 0) {
              hashtags.push(vereadorTag);
            }
          }
        } catch (error) {
          logger.warn('[INSTAGRAM] Erro ao processar hashtag de vereador:', vereador);
        }
      });
    }

    // Limitar a 30 hashtags (limite do Instagram)
    const uniqueHashtags = [...new Set(hashtags)];
    return uniqueHashtags.slice(0, 30);
  }

  /**
   * Extrair localização do texto
   */
  extractLocationFromText(texto) {
    // Lista de bairros conhecidos de São Bernardo do Campo
    const bairros = [
      'Centro', 'Assunção', 'Baeta Neves', 'Rudge Ramos', 'Taboão',
      'Demarchi', 'Ferrazópolis', 'Alves Dias', 'Anchieta', 'Cooperativa',
      'Cupecê', 'Montanhão', 'Paulicéia', 'Planalto', 'Santa Terezinha',
      'Batistini', 'Independência', 'Jordanópolis', 'Silvina', 'Tereza',
      'Alvarenga', 'Riacho Grande', 'Rio Grande'
    ];

    const textoLower = texto.toLowerCase();
    
    for (const bairro of bairros) {
      if (textoLower.includes(bairro.toLowerCase())) {
        return `${bairro}, São Bernardo do Campo`;
      }
    }

    return 'São Bernardo do Campo';
  }

  /**
   * Buscar localização
   */
  async searchLocation(locationName) {
    try {
      const locations = await this.ig.search.location(
        locationName,
        { lat: -23.6914, lng: -46.5646 } // São Bernardo do Campo coordinates
      );

      if (locations.length > 0) {
        logger.info(`📍 Location found: ${locations[0].name}`);
        return locations[0];
      }

      logger.warn(`📍 Location not found: ${locationName}`);
      return null;
    } catch (error) {
      logger.error('❌ Location search failed:', error.message);
      return null;
    }
  }

  /**
   * Adicionar user tags ao post
   */
  async addUserTags(mediaId, userTags) {
    try {
      const tags = userTags.map(tag => ({
        user_id: tag.userId,
        position: tag.position || [0.5, 0.5]
      }));

      await this.ig.media.editMedia(mediaId, { usertags: { in: tags } });
      logger.info(`🏷️ User tags added to post: ${userTags.length} tags`);
    } catch (error) {
      logger.error('❌ Failed to add user tags:', error.message);
    }
  }

  /**
   * Obter informações da conta
   */
  async getAccountInfo() {
    try {
      if (!this.isLoggedIn) {
        await this.initialize();
      }

      const userInfo = await this.ig.user.info(this.ig.state.cookieUserId);
      
      return {
        username: userInfo.username,
        fullName: userInfo.full_name,
        followerCount: userInfo.follower_count,
        followingCount: userInfo.following_count,
        mediaCount: userInfo.media_count,
        isVerified: userInfo.is_verified,
        isPrivate: userInfo.is_private
      };
    } catch (error) {
      logger.error('❌ Failed to get account info:', error.message);
      return null;
    }
  }

  /**
   * Listar posts recentes
   */
  async getRecentPosts(limit = 10) {
    try {
      if (!this.isLoggedIn) {
        await this.initialize();
      }

      const userFeed = this.ig.feed.user(this.ig.state.cookieUserId);
      const posts = await userFeed.items();

      return posts.slice(0, limit).map(post => ({
        id: post.pk,
        code: post.code,
        url: `https://www.instagram.com/p/${post.code}/`,
        caption: post.caption?.text || '',
        likeCount: post.like_count,
        commentCount: post.comment_count,
        timestamp: new Date(post.taken_at * 1000).toISOString()
      }));
    } catch (error) {
      logger.error('❌ Failed to get recent posts:', error.message);
      return [];
    }
  }

  /**
   * Logout e limpar sessão
   */
  async logout() {
    try {
      await this.ig.account.logout();
      this.isLoggedIn = false;
      
      // Remover arquivo de sessão
      try {
        await fs.unlink(this.sessionPath);
      } catch (error) {
        // Arquivo pode não existir
      }
      
      logger.info('📱 Instagram logout successful');
    } catch (error) {
      logger.error('❌ Instagram logout failed:', error.message);
    }
  }

  /**
   * Handle checkpoint challenge
   */
  async handleCheckpoint(error) {
    try {
      logger.info('🔐 Handling Instagram checkpoint challenge...');
      
      // Check if challenge object exists and has methods
      if (!error || !error.challenge) {
        logger.error('❌ Checkpoint error missing challenge object:', {
          hasError: !!error,
          hasChallenge: !!(error && error.challenge),
          errorType: error?.constructor?.name,
          errorMessage: error?.message
        });
        throw new Error(
          'Instagram checkpoint required but challenge object is not available. ' +
          'Manual intervention needed via Instagram app or web interface.'
        );
      }

      // Check if auto method is available
      if (typeof error.challenge.auto !== 'function') {
        logger.error('❌ Challenge auto method not available:', {
          challenge: error.challenge,
          availableMethods: Object.keys(error.challenge || {})
        });
        throw new Error(
          'Instagram checkpoint challenge cannot be handled automatically. ' +
          'Please complete the challenge manually via Instagram app.'
        );
      }

      // Try automatic challenge resolution
      logger.info('📱 Attempting automatic checkpoint resolution...');
      const challengeResult = await error.challenge.auto();
      
      logger.info('✅ Checkpoint challenge handled automatically', {
        result: challengeResult
      });
      
      return challengeResult;
      
    } catch (challengeError) {
      logger.error('❌ Failed to handle checkpoint:', {
        message: challengeError.message,
        stack: challengeError.stack,
        originalError: error?.message
      });
      
      // Provide helpful error message for manual resolution
      const helpMessage = 
        'Instagram checkpoint/challenge required. This typically happens when:\n' +
        '1. Account needs verification (phone/email)\n' +
        '2. Suspicious activity detected\n' +
        '3. New device/location login\n\n' +
        'To resolve:\n' +
        '1. Log into Instagram app/website manually\n' +
        '2. Complete any security challenges\n' +
        '3. Restart the bot service\n' +
        '4. Consider using Graph API instead of Private API';
      
      logger.info('📖 Checkpoint resolution help:', { helpMessage });
      
      throw new Error(
        `Instagram checkpoint challenge failed: ${challengeError.message}. ` +
        'Manual intervention required via Instagram app.'
      );
    }
  }

  /**
   * Verificar status da conexão
   */
  async getConnectionStatus() {
    return {
      isLoggedIn: this.isLoggedIn,
      username: this.username,
      lastLoginAttempt: this.loginAttempts,
      hasValidCredentials: this.hasValidCredentials,
      sessionExists: await this.sessionExists(),
      service: 'instagram_private_api',
      credentialsConfigured: this.hasValidCredentials,
      canInitialize: this.hasValidCredentials
    };
  }

  /**
   * Verificar se arquivo de sessão existe
   */
  async sessionExists() {
    try {
      await fs.access(this.sessionPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get humanization behavior report
   */
  getHumanizationReport() {
    if (!this.humanizationEngine) {
      return { error: 'Humanization engine not available' };
    }
    
    return this.humanizationEngine.generateBehaviorReport();
  }

  /**
   * Get current risk assessment
   */
  getRiskAssessment() {
    if (!this.humanizationEngine) {
      return { error: 'Humanization engine not available' };
    }
    
    return this.humanizationEngine.calculateRiskScore();
  }

  /**
   * Check if posting time is optimal
   */
  isOptimalPostingTime() {
    if (!this.humanizationEngine) {
      return { isOptimal: true, reason: 'Humanization engine not available' };
    }
    
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
    if (!this.humanizationEngine) {
      return false;
    }
    
    this.humanizationEngine.emergencyMode = enabled;
    logger.info(`[HUMANIZATION] Emergency mode ${enabled ? 'enabled' : 'disabled'} manually`);
    return true;
  }

  /**
   * Verificar conexão com Instagram (alias para compatibilidade)
   */
  async verificarConexao() {
    return await this.testConnection(1);
  }

  /**
   * Testar conexão com Instagram com retry automatico
   */
  async testConnection(maxRetries = 3) {
    try {
      const status = await this.getConnectionStatus();
      
      if (!status.hasValidCredentials) {
        return {
          success: false,
          message: 'Instagram Private API credentials not configured',
          details: status,
          recommendation: 'Configure INSTAGRAM_USERNAME and INSTAGRAM_PASSWORD environment variables'
        };
      }

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          logger.info(`[INSTAGRAM_TEST] Tentativa ${attempt}/${maxRetries} de conexão...`);
          
          await this.initialize();
          const accountInfo = await this.getAccountInfo();

          logger.info(`[INSTAGRAM_TEST] ✅ Conexão bem-sucedida na tentativa ${attempt}`);
          return {
            success: true,
            message: 'Instagram Private API connection successful',
            accountInfo: accountInfo,
            attempt: attempt
          };
        } catch (error) {
          logger.warn(`[INSTAGRAM_TEST] ❌ Tentativa ${attempt}/${maxRetries} falhou:`, error.message);
          
          // Check for specific error types that don't warrant retries
          if (error.message.includes('checkpoint') || 
              error.message.includes('challenge') ||
              error.message.includes('verification')) {
            return {
              success: false,
              message: error.message,
              errorType: 'verification_required',
              attempts: attempt,
              recommendation: 'Complete Instagram verification via app/website'
            };
          }
          
          if (attempt === maxRetries) {
            logger.error(`[INSTAGRAM_TEST] 🚨 Todas as tentativas falharam`);
            return {
              success: false,
              message: error.message,
              attempts: maxRetries,
              finalError: true,
              recommendation: 'Check credentials and account status'
            };
          }
          
          // Delay progressivo entre tentativas
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          logger.info(`[INSTAGRAM_TEST] ⏳ Aguardando ${delay}ms antes da próxima tentativa...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    } catch (error) {
      return {
        success: false,
        message: `Test connection failed: ${error.message}`,
        error: error.message,
        recommendation: 'Check service configuration and dependencies'
      };
    }
  }
}

module.exports = new InstagramService();