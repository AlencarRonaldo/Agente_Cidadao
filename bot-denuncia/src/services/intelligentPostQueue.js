/**
 * Intelligent Post Queue - Sistema de Fila Inteligente para Postagens
 * Gerencia postagens Instagram com rate limiting e retry automático
 * @author Sistema Bot Denúncia
 */

const logger = require('../utils/logger');
const instagramService = require('./instagramService');
const { PrismaClient } = require('@prisma/client');
const EventEmitter = require('events');

class IntelligentPostQueue extends EventEmitter {
  constructor() {
    super();
    
    this.prisma = new PrismaClient();
    this.queue = [];
    this.processing = false;
    this.paused = false;
    this.stats = {
      processed: 0,
      failed: 0,
      retries: 0,
      startTime: null
    };
    
    // Configurações
    this.config = {
      maxConcurrent: 1, // Instagram requer processamento sequencial
      retryAttempts: 3,
      retryDelay: 60000, // 1 minuto
      rateLimitDelay: 30000, // 30 segundos entre posts
      batchSize: 5,
      maxQueueSize: 50,
      priorityThreshold: 2 // Posts com prioridade >= 2 são processados primeiro
    };

    logger.info('🚥 [FILA] Intelligent Post Queue inicializada');
  }

  /**
   * Inicializar o sistema de fila
   */
  async initialize() {
    logger.info('🚀 [FILA] Inicializando sistema de fila...');
    
    try {
      // Carregar posts pendentes do banco de dados
      await this.loadPendingPosts();
      
      // Inicializar estatísticas
      this.stats.startTime = Date.now();
      
      // Configurar eventos
      this.setupEventHandlers();
      
      logger.info(`✅ [FILA] Sistema inicializado com ${this.queue.length} posts na fila`);
      
      return true;
    } catch (error) {
      logger.error('❌ [FILA] Falha na inicialização:', error.message);
      return false;
    }
  }

  /**
   * Carregar posts pendentes do banco de dados
   */
  async loadPendingPosts() {
    try {
      const pendingPosts = await this.prisma.denuncia.findMany({
        where: {
          aprovado: true,
          instagramPostId: null,
          texto: { not: null },
          imagePath: { not: null }
        },
        include: {
          vereadores: true
        },
        orderBy: [
          { updatedAt: 'asc' }
        ]
      });

      // Converter para formato de fila
      for (const post of pendingPosts) {
        await this.addToQueue({
          id: `denuncia_${post.id}`,
          type: 'instagram_post',
          priority: this.calculatePriority(post),
          data: {
            denunciaId: post.id,
            texto: post.texto,
            imagePath: post.imagePath,
            vereadores: post.vereadores,
            createdAt: post.createdAt,
            updatedAt: post.updatedAt
          },
          retryCount: 0,
          maxRetries: this.config.retryAttempts
        });
      }

      logger.info(`📋 [FILA] Carregados ${pendingPosts.length} posts pendentes`);
      
    } catch (error) {
      logger.error('❌ [FILA] Falha ao carregar posts pendentes:', error.message);
      throw error;
    }
  }

  /**
   * Calcular prioridade do post
   */
  calculatePriority(denuncia) {
    let priority = 1; // Prioridade base
    
    // Maior prioridade para posts mais antigos (mais de 1 hora)
    const ageHours = (Date.now() - new Date(denuncia.updatedAt).getTime()) / (1000 * 60 * 60);
    if (ageHours > 1) priority += 1;
    if (ageHours > 6) priority += 1;
    if (ageHours > 24) priority += 2;
    
    // Maior prioridade para posts com múltiplos vereadores
    if (denuncia.vereadores && denuncia.vereadores.length > 1) {
      priority += 1;
    }
    
    // Prioridade baseada no tamanho do texto (posts mais elaborados)
    if (denuncia.texto && denuncia.texto.length > 200) {
      priority += 1;
    }
    
    return Math.min(priority, 5); // Máximo prioridade 5
  }

  /**
   * Adicionar post à fila
   */
  async addToQueue(queueItem) {
    if (this.queue.length >= this.config.maxQueueSize) {
      logger.warn('⚠️ [FILA] Fila cheia - removendo item mais antigo');
      this.queue.shift();
    }

    // Verificar se já existe na fila
    const existingIndex = this.queue.findIndex(item => item.id === queueItem.id);
    if (existingIndex !== -1) {
      logger.warn(`⚠️ [FILA] Item ${queueItem.id} já existe na fila - atualizando`);
      this.queue[existingIndex] = { ...this.queue[existingIndex], ...queueItem };
      return;
    }

    // Adicionar à fila
    this.queue.push({
      ...queueItem,
      addedAt: Date.now(),
      status: 'pending'
    });

    // Ordenar por prioridade
    this.queue.sort((a, b) => b.priority - a.priority);

    logger.info(`➕ [FILA] Adicionado à fila: ${queueItem.id} (prioridade: ${queueItem.priority})`);
    
    this.emit('itemAdded', queueItem);

    // Iniciar processamento se não estiver processando
    if (!this.processing && !this.paused) {
      this.startProcessing();
    }
  }

  /**
   * Adicionar denúncia aprovada à fila
   */
  async queueApprovedPost(denunciaId) {
    try {
      const denuncia = await this.prisma.denuncia.findUnique({
        where: { id: denunciaId },
        include: { vereadores: true }
      });

      if (!denuncia) {
        throw new Error(`Denúncia ${denunciaId} não encontrada`);
      }

      if (!denuncia.aprovado) {
        throw new Error(`Denúncia ${denunciaId} não está aprovada`);
      }

      if (denuncia.instagramPostId) {
        logger.warn(`⚠️ [FILA] Denúncia ${denunciaId} já foi postada`);
        return false;
      }

      await this.addToQueue({
        id: `denuncia_${denuncia.id}`,
        type: 'instagram_post',
        priority: this.calculatePriority(denuncia),
        data: {
          denunciaId: denuncia.id,
          texto: denuncia.texto,
          imagePath: denuncia.imagePath,
          vereadores: denuncia.vereadores,
          createdAt: denuncia.createdAt,
          updatedAt: denuncia.updatedAt
        },
        retryCount: 0,
        maxRetries: this.config.retryAttempts
      });

      return true;

    } catch (error) {
      logger.error(`❌ [FILA] Falha ao adicionar denúncia ${denunciaId} à fila:`, error.message);
      return false;
    }
  }

  /**
   * Iniciar processamento da fila
   */
  async startProcessing() {
    if (this.processing || this.paused) {
      return;
    }

    this.processing = true;
    logger.info('▶️ [FILA] Iniciando processamento da fila...');
    
    this.emit('processingStarted');

    try {
      while (this.queue.length > 0 && !this.paused) {
        const nextItem = this.queue.shift();
        await this.processQueueItem(nextItem);
        
        // Respeitar rate limiting
        if (this.queue.length > 0) {
          logger.info(`⏳ [FILA] Aguardando ${this.config.rateLimitDelay}ms antes do próximo post...`);
          await new Promise(resolve => setTimeout(resolve, this.config.rateLimitDelay));
        }
      }
    } catch (error) {
      logger.error('❌ [FILA] Erro no processamento da fila:', error.message);
    } finally {
      this.processing = false;
      logger.info('⏸️ [FILA] Processamento da fila finalizado');
      this.emit('processingFinished');
    }
  }

  /**
   * Processar item individual da fila
   */
  async processQueueItem(item) {
    logger.info(`🔄 [FILA] Processando item: ${item.id} (tentativa ${item.retryCount + 1}/${item.maxRetries + 1})`);
    
    item.status = 'processing';
    item.processingStarted = Date.now();
    
    this.emit('itemProcessingStarted', item);

    try {
      const result = await this.executePost(item.data);
      
      if (result.success) {
        // Sucesso
        item.status = 'completed';
        item.result = result;
        item.processingCompleted = Date.now();
        
        this.stats.processed++;
        
        logger.info(`✅ [FILA] Item processado com sucesso: ${item.id} - Post ID: ${result.postId}`);
        this.emit('itemCompleted', item);
        
      } else {
        // Falha - verificar se deve tentar novamente
        if (item.retryCount < item.maxRetries) {
          await this.scheduleRetry(item, result.error);
        } else {
          // Máximo de tentativas excedido
          item.status = 'failed';
          item.error = result.error;
          item.processingCompleted = Date.now();
          
          this.stats.failed++;
          
          logger.error(`❌ [FILA] Item falhou definitivamente: ${item.id} - ${result.error}`);
          this.emit('itemFailed', item);
        }
      }
      
    } catch (error) {
      // Erro crítico
      if (item.retryCount < item.maxRetries) {
        await this.scheduleRetry(item, error.message);
      } else {
        item.status = 'failed';
        item.error = error.message;
        item.processingCompleted = Date.now();
        
        this.stats.failed++;
        
        logger.error(`❌ [FILA] Erro crítico no item: ${item.id} - ${error.message}`);
        this.emit('itemFailed', item);
      }
    }
  }

  /**
   * Executar postagem no Instagram
   */
  async executePost(data) {
    try {
      // Verificar se arquivo de imagem existe
      const fs = require('fs').promises;
      try {
        await fs.access(data.imagePath);
      } catch {
        return {
          success: false,
          error: `Arquivo de imagem não encontrado: ${data.imagePath}`
        };
      }

      // Publicar no Instagram
      const publishResult = await instagramService.publicar({
        texto: data.texto,
        imagem: data.imagePath,
        vereadores: data.vereadores
      });

      if (publishResult.success) {
        // Atualizar banco de dados
        await this.prisma.denuncia.update({
          where: { id: data.denunciaId },
          data: {
            instagramPostId: publishResult.postId,
            instagramUrl: publishResult.postUrl,
            publishedAt: new Date()
          }
        });

        return {
          success: true,
          postId: publishResult.postId,
          postUrl: publishResult.postUrl,
          processingTime: publishResult.processingTime
        };
      } else {
        return {
          success: false,
          error: publishResult.error
        };
      }

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Agendar retry para item que falhou
   */
  async scheduleRetry(item, error) {
    item.retryCount++;
    item.status = 'pending_retry';
    item.lastError = error;
    item.nextRetryAt = Date.now() + (this.config.retryDelay * item.retryCount); // Delay progressivo
    
    this.stats.retries++;
    
    logger.warn(`🔄 [FILA] Agendando retry para ${item.id} em ${Math.round(this.config.retryDelay * item.retryCount / 1000)}s (tentativa ${item.retryCount}/${item.maxRetries})`);
    
    this.emit('itemScheduledRetry', item);
    
    // Reagendar para o final da fila
    setTimeout(() => {
      if (item.status === 'pending_retry') {
        item.status = 'pending';
        this.queue.push(item);
        this.queue.sort((a, b) => b.priority - a.priority);
        
        logger.info(`🔄 [FILA] Item reagendado: ${item.id}`);
        
        // Retomar processamento se necessário
        if (!this.processing && !this.paused) {
          this.startProcessing();
        }
      }
    }, this.config.retryDelay * item.retryCount);
  }

  /**
   * Pausar processamento
   */
  pauseProcessing() {
    this.paused = true;
    logger.info('⏸️ [FILA] Processamento pausado');
    this.emit('processingPaused');
  }

  /**
   * Retomar processamento
   */
  resumeProcessing() {
    this.paused = false;
    logger.info('▶️ [FILA] Processamento retomado');
    this.emit('processingResumed');
    
    if (!this.processing && this.queue.length > 0) {
      this.startProcessing();
    }
  }

  /**
   * Limpar fila
   */
  clearQueue() {
    const clearedCount = this.queue.length;
    this.queue = [];
    logger.info(`🗑️ [FILA] Fila limpa - ${clearedCount} items removidos`);
    this.emit('queueCleared', clearedCount);
  }

  /**
   * Obter status da fila
   */
  getQueueStatus() {
    const now = Date.now();
    const uptime = this.stats.startTime ? now - this.stats.startTime : 0;
    
    const pendingItems = this.queue.filter(item => item.status === 'pending');
    const processingItems = this.queue.filter(item => item.status === 'processing');
    const retryItems = this.queue.filter(item => item.status === 'pending_retry');
    
    return {
      queue: {
        total: this.queue.length,
        pending: pendingItems.length,
        processing: processingItems.length,
        pending_retry: retryItems.length,
        max_size: this.config.maxQueueSize
      },
      processing: {
        active: this.processing,
        paused: this.paused
      },
      stats: {
        ...this.stats,
        uptime: uptime,
        success_rate: this.stats.processed + this.stats.failed > 0 
          ? Math.round((this.stats.processed / (this.stats.processed + this.stats.failed)) * 100)
          : 0
      },
      config: this.config,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Obter próximos itens da fila
   */
  getQueueItems(limit = 10) {
    return this.queue.slice(0, limit).map(item => ({
      id: item.id,
      type: item.type,
      priority: item.priority,
      status: item.status,
      retryCount: item.retryCount,
      maxRetries: item.maxRetries,
      addedAt: item.addedAt,
      processingStarted: item.processingStarted,
      processingCompleted: item.processingCompleted,
      nextRetryAt: item.nextRetryAt,
      lastError: item.lastError,
      data: {
        denunciaId: item.data.denunciaId,
        texto: item.data.texto?.substring(0, 100) + '...',
        vereadorCount: item.data.vereadores?.length || 0
      }
    }));
  }

  /**
   * Configurar event handlers
   */
  setupEventHandlers() {
    this.on('itemCompleted', (item) => {
      logger.info(`📊 [FILA] Estatísticas - Processados: ${this.stats.processed}, Falharam: ${this.stats.failed}, Fila: ${this.queue.length}`);
    });

    this.on('itemFailed', (item) => {
      logger.error(`📊 [FILA] Item falhou permanentemente: ${item.id} - ${item.error}`);
    });

    this.on('processingFinished', () => {
      if (this.queue.length === 0) {
        logger.info('🎉 [FILA] Fila vazia - todos os posts foram processados!');
      }
    });
  }

  /**
   * Executar processamento em lote
   */
  async processBatch(batchSize = null) {
    const size = batchSize || this.config.batchSize;
    const batch = this.queue.splice(0, size);
    
    if (batch.length === 0) {
      return { processed: 0, message: 'Nenhum item na fila' };
    }

    logger.info(`📦 [FILA] Processando lote de ${batch.length} items...`);
    
    const results = [];
    for (const item of batch) {
      const result = await this.processQueueItem(item);
      results.push(result);
      
      // Delay entre itens do lote
      if (batch.indexOf(item) < batch.length - 1) {
        await new Promise(resolve => setTimeout(resolve, this.config.rateLimitDelay));
      }
    }
    
    return {
      processed: batch.length,
      results: results,
      message: `Lote de ${batch.length} items processado`
    };
  }

  /**
   * Limpar recursos
   */
  async cleanup() {
    try {
      this.pauseProcessing();
      await this.prisma.$disconnect();
      this.removeAllListeners();
      logger.info('🧹 [FILA] Recursos limpos com sucesso');
    } catch (error) {
      logger.error('❌ [FILA] Falha na limpeza de recursos:', error.message);
    }
  }
}

module.exports = IntelligentPostQueue;