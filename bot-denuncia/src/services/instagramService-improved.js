/**
 * Instagram Service Melhorado - 2024
 * Implementa padrões avançados para evitar detecção e bloqueios
 */

const { IgApiClient, IgCheckpointError, IgChallengeWrongCodeError, IgLoginTwoFactorRequiredError } = require('instagram-private-api');
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const logger = require('../utils/logger');

class InstagramServiceImproved {
  constructor() {
    this.ig = new IgApiClient();
    this.isLoggedIn = false;
    this.loginAttempts = 0;
    this.maxLoginAttempts = 3;
    this.sessionPath = path.join(__dirname, '../../instagram-session.json');
    this.rateLimitDelay = 15000; // 15 segundos entre posts (mais conservador)
    this.lastPostTime = 0;
    this.lastLoginAttempt = 0;
    this.cooldownPeriod = 24 * 60 * 60 * 1000; // 24 horas
    
    // Configurações da conta
    this.username = process.env.INSTAGRAM_USERNAME || 'vozdopovobot';
    this.password = process.env.INSTAGRAM_PASSWORD || 'Vozdopovo@bot1';
    
    // Device ID consistente baseado no username
    this.deviceId = this.generateConsistentDeviceId(this.username);
    
    if (!this.username || !this.password) {
      logger.warn('Instagram credentials not configured in environment variables');
    }
  }

  /**
   * Gerar Device ID consistente
   */
  generateConsistentDeviceId(username) {
    const hash = crypto.createHash('md5').update(username + '_bot_device').digest('hex');
    return `android-${hash.substring(0, 16)}`;
  }

  /**
   * Verificar se está em cooldown
   */
  isInCooldown() {
    if (!this.lastLoginAttempt) return false;
    return Date.now() - this.lastLoginAttempt < this.cooldownPeriod;
  }

  /**
   * Inicializar o cliente Instagram com configurações avançadas
   */
  async initialize() {
    try {
      // Verificar cooldown
      if (this.isInCooldown()) {
        const remainingTime = Math.ceil((this.cooldownPeriod - (Date.now() - this.lastLoginAttempt)) / 1000 / 60);
        logger.warn(`[INSTAGRAM] Em cooldown - aguarde ${remainingTime} minutos`);
        return false;
      }

      // Configurar device com parâmetros mais realistas
      this.setupRealisticDevice();
      
      // Tentar carregar sessão existente
      const sessionLoaded = await this.loadSession();
      
      if (!sessionLoaded && !this.isLoggedIn) {
        await this.login();
      }
      
      // Verificar se a sessão está válida
      if (this.isLoggedIn) {
        await this.validateSession();
      }
      
      logger.info('✅ Instagram service initialized successfully');
      return true;
    } catch (error) {
      logger.error('❌ Failed to initialize Instagram service:', error.message);
      this.lastLoginAttempt = Date.now();
      return false;
    }
  }

  /**
   * Configurar dispositivo com parâmetros realistas
   */
  setupRealisticDevice() {
    // User agents atualizados para 2024
    const userAgents = [
      'Instagram 302.0.0.23.109 Android (33/13; 420dpi; 1080x2340; samsung; SM-G991B; o1s; exynos2100; pt_BR; 513620076)',
      'Instagram 301.0.0.41.111 Android (32/12; 440dpi; 1080x2400; xiaomi; M2102J20SG; venus; qcom; pt_BR; 512490897)',
      'Instagram 300.1.0.23.114 Android (31/12; 560dpi; 1440x3200; OnePlus; LE2117; OnePlus9Pro; qcom; pt_BR; 511395671)'
    ];

    const randomUA = userAgents[Math.floor(Math.random() * userAgents.length)];
    
    this.ig.state.generateDevice(this.username);
    this.ig.state.deviceString = this.deviceId;
    
    // Configurações avançadas (verificar se request exists)
    if (this.ig.request && this.ig.request.defaults && this.ig.request.defaults.headers) {
      this.ig.request.defaults.headers['User-Agent'] = randomUA;
      this.ig.request.defaults.headers['Accept-Language'] = 'pt-BR,pt;q=0.9,en;q=0.8';
      this.ig.request.defaults.headers['Accept-Encoding'] = 'gzip, deflate';
      this.ig.request.defaults.headers['X-IG-Connection-Type'] = 'WIFI';
      this.ig.request.defaults.headers['X-IG-Capabilities'] = '3brTvwE=';
      logger.info(`[INSTAGRAM] Headers configurados com User-Agent: ${randomUA.substring(0, 50)}...`);
    } else {
      logger.warn(`[INSTAGRAM] Não foi possível configurar headers customizados`);
    }
    
    logger.info(`[INSTAGRAM] Device configurado: ${this.deviceId}`);
  }

  /**
   * Login melhorado com tratamento de erros específicos
   */
  async login() {
    if (this.loginAttempts >= this.maxLoginAttempts) {
      throw new Error('Maximum login attempts exceeded - waiting for cooldown');
    }

    try {
      this.loginAttempts++;
      logger.info(`🔐 Attempting Instagram login (attempt ${this.loginAttempts}/${this.maxLoginAttempts})`);
      
      // Delay aleatório para parecer mais humano
      const delay = Math.random() * 3000 + 2000; // 2-5 segundos
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Pre-login requests para simular app real
      await this.simulateAppBehavior();
      
      const user = await this.ig.account.login(this.username, this.password);
      
      this.isLoggedIn = true;
      this.loginAttempts = 0;
      this.lastLoginAttempt = 0; // Reset cooldown
      
      // Salvar sessão
      await this.saveSession();
      
      logger.info(`✅ Instagram login successful for user: ${user.username}`);
      return user;
      
    } catch (error) {
      this.lastLoginAttempt = Date.now();
      await this.handleLoginError(error);
      throw error;
    }
  }

  /**
   * Simular comportamento do app real
   */
  async simulateAppBehavior() {
    try {
      // Requisições que o app real faz antes do login
      await this.ig.qe.syncLoginExperiments();
      await this.ig.launcher.preLoginFlow();
      
      // Delay pequeno
      await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
    } catch (error) {
      // Ignorar erros aqui, são só para simular comportamento
      logger.debug('[INSTAGRAM] Pre-login simulation completed');
    }
  }

  /**
   * Tratamento melhorado de erros de login
   */
  async handleLoginError(error) {
    logger.error(`[INSTAGRAM] Login error details:`, {
      name: error.constructor.name,
      message: error.message,
      status: error.status,
      statusText: error.statusText
    });

    if (error instanceof IgCheckpointError) {
      logger.warn('⚠️ Instagram checkpoint detected - manual intervention required');
      logger.info('📱 Action required: Login manually via Instagram app/web to resolve checkpoint');
      await this.handleCheckpoint(error);
    } else if (error instanceof IgLoginTwoFactorRequiredError) {
      logger.warn('⚠️ Two-factor authentication required');
      logger.info('📲 Disable 2FA temporarily or implement 2FA handler');
    } else if (error instanceof IgChallengeWrongCodeError) {
      logger.error('❌ Wrong verification code provided');
    } else if (error.message.includes('400') && error.message.includes('email')) {
      logger.error('🚨 Account requires verification - login manually to resolve');
      logger.info('🔧 Steps: 1) Login via Instagram app 2) Complete verification 3) Wait 24h 4) Try again');
    } else if (error.message.includes('429') || error.message.includes('rate')) {
      logger.error('⏳ Rate limited - implementing extended cooldown');
      this.rateLimitDelay *= 2; // Dobrar delay
    } else {
      logger.error('❌ Instagram login failed:', error.message);
    }
  }

  /**
   * Salvar sessão com dados adicionais
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
        timestamp: Date.now(),
        username: this.username,
        version: '2024.1' // Versão do nosso serviço
      };

      await fs.writeFile(this.sessionPath, JSON.stringify(sessionData, null, 2));
      logger.info('💾 Instagram session saved');
    } catch (error) {
      logger.error('❌ Failed to save Instagram session:', error.message);
    }
  }

  /**
   * Carregar sessão com validação aprimorada
   */
  async loadSession() {
    try {
      const sessionData = JSON.parse(await fs.readFile(this.sessionPath, 'utf8'));
      
      // Verificar se a sessão não é muito antiga (12 horas)
      const maxAge = 12 * 60 * 60 * 1000;
      if (Date.now() - sessionData.timestamp > maxAge) {
        logger.info('📅 Instagram session expired, will login again');
        return false;
      }

      // Verificar se é a mesma conta
      if (sessionData.username !== this.username) {
        logger.info('👤 Different username detected, will login with new account');
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
   * Validar sessão com retry
   */
  async validateSession() {
    try {
      await this.ig.user.info(this.ig.state.cookieUserId);
      logger.info('✅ Instagram session is valid');
      return true;
    } catch (error) {
      logger.warn('⚠️ Instagram session invalid, will re-login');
      this.isLoggedIn = false;
      
      // Tentar relogin apenas se não estiver em cooldown
      if (!this.isInCooldown()) {
        await this.login();
      }
      return false;
    }
  }

  /**
   * Rate limiting melhorado com jitter
   */
  async respectRateLimit() {
    const timeSinceLastPost = Date.now() - this.lastPostTime;
    if (timeSinceLastPost < this.rateLimitDelay) {
      // Adicionar jitter aleatório (10-30% do delay)
      const jitter = Math.random() * 0.2 + 0.1; // 10-30%
      const waitTime = (this.rateLimitDelay - timeSinceLastPost) * (1 + jitter);
      
      logger.info(`⏳ [INSTAGRAM] Rate limiting: aguardando ${Math.round(waitTime)}ms antes do próximo post`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  /**
   * Publicar com retry inteligente
   */
  async publicar({ texto, imagem, vereadores }) {
    const startTime = Date.now();
    const maxRetries = 2;
    
    for (let retry = 0; retry <= maxRetries; retry++) {
      try {
        logger.info(`[INSTAGRAM] Tentativa de publicação ${retry + 1}/${maxRetries + 1}`);

        // Validação de entrada
        if (!texto) {
          throw new Error('Texto é obrigatório para publicação');
        }

        // Verificar se está inicializado
        if (!this.isLoggedIn) {
          logger.info('[INSTAGRAM] Serviço não inicializado, inicializando...');
          const initialized = await this.initialize();
          if (!initialized) {
            throw new Error('Falha ao inicializar serviço do Instagram');
          }
        }

        // Rate limiting
        await this.respectRateLimit();

        // Preparar hashtags baseadas nos vereadores
        const hashtags = this.generateHashtags(vereadores);
        
        // Preparar post (sem imagem por enquanto para simplificar)
        const result = await this.publishTextPost({
          caption: texto,
          hashtags: hashtags
        });

        const processingTime = Date.now() - startTime;
        this.lastPostTime = Date.now();

        if (result.success) {
          logger.info(`[INSTAGRAM] Post publicado com sucesso em ${processingTime}ms`);
          return {
            success: true,
            postId: result.mediaId,
            postUrl: result.instagramUrl,
            timestamp: result.timestamp,
            processingTime
          };
        }

        throw new Error(result.error);

      } catch (error) {
        const processingTime = Date.now() - startTime;
        
        if (retry < maxRetries) {
          const delay = Math.pow(2, retry) * 5000; // Backoff exponencial
          logger.warn(`[INSTAGRAM] Tentativa ${retry + 1} falhou, tentando novamente em ${delay}ms: ${error.message}`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        logger.error(`[INSTAGRAM] Falha na publicação após ${processingTime}ms e ${maxRetries + 1} tentativas:`, error.message);
        
        return {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
          processingTime
        };
      }
    }
  }

  /**
   * Publicar post apenas texto (mais confiável)
   */
  async publishTextPost(options) {
    try {
      const { caption, hashtags = [] } = options;

      // Preparar caption com hashtags
      const fullCaption = this.formatCaption(caption, hashtags);

      // Criar uma imagem simples com texto (Instagram exige imagem)
      const imageBuffer = await this.createTextImage(caption);

      const publishResult = await this.ig.publish.photo({
        file: imageBuffer,
        caption: fullCaption
      });

      logger.info(`✅ Instagram post published! Media ID: ${publishResult.media.pk}`);
      
      return {
        success: true,
        mediaId: publishResult.media.pk,
        instagramUrl: `https://www.instagram.com/p/${publishResult.media.code}/`,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('❌ Failed to publish Instagram post:', error.message);
      
      // Re-login se erro de autenticação
      if (error.message.includes('login') || error.message.includes('401')) {
        this.isLoggedIn = false;
      }

      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Criar imagem simples com texto
   */
  async createTextImage(texto) {
    try {
      const width = 1080;
      const height = 1080;
      
      // Texto formatado
      const formattedText = texto.length > 100 ? texto.substring(0, 97) + '...' : texto;
      
      const svg = `
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#1565C0"/>
          <text x="50%" y="30%" text-anchor="middle" fill="white" font-size="48" font-family="Arial, sans-serif" font-weight="bold">
            🏛️ DENÚNCIA CIDADÃ
          </text>
          <foreignObject x="80" y="400" width="920" height="400">
            <div xmlns="http://www.w3.org/1999/xhtml" style="color: white; font-size: 32px; font-family: Arial; text-align: center; line-height: 1.4;">
              ${formattedText}
            </div>
          </foreignObject>
          <text x="50%" y="90%" text-anchor="middle" fill="white" font-size="28" font-family="Arial, sans-serif">
            São Bernardo do Campo
          </text>
        </svg>
      `;

      const imageBuffer = await sharp(Buffer.from(svg))
        .png()
        .toBuffer();

      return imageBuffer;
    } catch (error) {
      logger.error('[INSTAGRAM] Erro ao criar imagem:', error.message);
      
      // Fallback: imagem sólida
      return await sharp({
        create: {
          width: 1080,
          height: 1080,
          channels: 3,
          background: { r: 21, g: 101, b: 192 }
        }
      }).png().toBuffer();
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
   * Gerar hashtags baseadas nos vereadores
   */
  generateHashtags(vereadores) {
    const hashtags = [
      'DenunciaCidada',
      'SaoBernardodoCampo', 
      'FiscalizacaoCidada',
      'TransparenciaPublica',
      'ProblemasUrbanos'
    ];

    // Adicionar hashtags dos vereadores
    if (vereadores && Array.isArray(vereadores)) {
      vereadores.forEach(vereador => {
        if (typeof vereador === 'string') {
          const cleanHandle = vereador.replace('@', '').replace(/\s+/g, '').toLowerCase();
          if (cleanHandle && cleanHandle.length > 0) {
            hashtags.push(cleanHandle);
          }
        }
      });
    }

    return [...new Set(hashtags)].slice(0, 30); // Máximo 30 hashtags
  }

  /**
   * Teste de conexão melhorado
   */
  async testConnection() {
    try {
      // Verificar cooldown primeiro
      if (this.isInCooldown()) {
        const remainingTime = Math.ceil((this.cooldownPeriod - (Date.now() - this.lastLoginAttempt)) / 1000 / 60);
        return {
          success: false,
          message: `Em cooldown - aguarde ${remainingTime} minutos`,
          cooldown: true,
          remainingMinutes: remainingTime
        };
      }

      if (!this.username || !this.password) {
        return {
          success: false,
          message: 'Instagram credentials not configured'
        };
      }

      await this.initialize();
      
      if (!this.isLoggedIn) {
        return {
          success: false,
          message: 'Failed to initialize Instagram service'
        };
      }

      const accountInfo = await this.getAccountInfo();

      return {
        success: true,
        message: 'Instagram connection successful',
        accountInfo: accountInfo
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        needsManualLogin: error.message.includes('checkpoint') || error.message.includes('email')
      };
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
   * Handle checkpoint challenge
   */
  async handleCheckpoint(error) {
    try {
      logger.info('🔐 Handling Instagram checkpoint challenge...');
      logger.warn('⚠️ AÇÃO NECESSÁRIA: Faça login manual no Instagram app/web para resolver o checkpoint');
      logger.info('📝 Passos: 1) Abrir Instagram 2) Fazer login 3) Completar verificação 4) Aguardar 24h');
      
      // Em produção, implementar notificação para admin
      
    } catch (challengeError) {
      logger.error('❌ Failed to handle checkpoint:', challengeError.message);
    }
  }

  /**
   * Verificar status da conexão
   */
  async getConnectionStatus() {
    const cooldownRemaining = this.isInCooldown() ? 
      Math.ceil((this.cooldownPeriod - (Date.now() - this.lastLoginAttempt)) / 1000 / 60) : 0;

    return {
      isLoggedIn: this.isLoggedIn,
      username: this.username,
      lastLoginAttempt: this.loginAttempts,
      hasValidCredentials: Boolean(this.username && this.password),
      sessionExists: await this.sessionExists(),
      isInCooldown: this.isInCooldown(),
      cooldownRemainingMinutes: cooldownRemaining,
      deviceId: this.deviceId
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
   * Logout e limpar sessão
   */
  async logout() {
    try {
      if (this.isLoggedIn) {
        await this.ig.account.logout();
      }
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
}

module.exports = new InstagramServiceImproved();