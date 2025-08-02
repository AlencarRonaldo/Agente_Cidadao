const queueManager = require('../queues/queueManager');
const cron = require('node-cron');
const prisma = require('../config/database');
const instagramApiManager = require('../services/instagramApiManager');
const smartAnalysisService = require('../services/smartAnalysisService');
const logger = require('../utils/logger');
const { CONFIG } = require('../config/constants');

// Inicializar queue manager se não estiver inicializado
let publishQueue;
let isInitialized = false;
let initPromise = null;

async function initializeQueueWithRetry(maxRetries = 3) {
  if (isInitialized && publishQueue) return publishQueue;
  if (initPromise) return initPromise;
  
  initPromise = (async () => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info(`[PUBLISH_WORKER] Tentativa de inicialização ${attempt}/${maxRetries}...`);
        
        if (!queueManager.isInitialized) {
          await queueManager.initialize();
        }
        
        publishQueue = queueManager.getQueue('publish-queue');
        isInitialized = true;
        
        logger.info('[PUBLISH_WORKER] Fila inicializada com sucesso');
        return publishQueue;
      } catch (error) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        logger.warn(`[PUBLISH_WORKER] Tentativa ${attempt}/${maxRetries} falhou, retry em ${delay}ms:`, error.message);
        
        if (attempt === maxRetries) {
          logger.error('[PUBLISH_WORKER] Falha após todas as tentativas:', error);
          throw error;
        }
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  })();
  
  return initPromise;
}

// Função legacy para compatibilidade
async function initializeQueue() {
  return initializeQueueWithRetry();
}

// Controle de publicações diárias com persistência
let publicacoesHoje = 0;
let ultimaResetData = new Date().toDateString();

// Função para sincronizar contador com banco de dados
async function syncPublicationCounter() {
  try {
    const hoje = new Date().toDateString();
    
    if (hoje !== ultimaResetData) {
      publicacoesHoje = 0;
      ultimaResetData = hoje;
      logger.info(`[PUBLISH] Contador diário resetado para nova data: ${hoje}`);
    } else {
      // Contar publicações do dia atual no banco
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      
      const countResult = await prisma.denuncia.count({
        where: {
          status: 'PUBLICADA',
          publishedAt: {
            gte: startOfDay
          }
        }
      });
      
      publicacoesHoje = countResult;
      logger.info(`[PUBLISH] Contador sincronizado: ${publicacoesHoje} publicações hoje`);
    }
  } catch (error) {
    logger.error('[PUBLISH] Erro ao sincronizar contador de publicações:', error);
  }
}

// Resetar contador à meia-noite
cron.schedule('0 0 * * *', async () => {
  await syncPublicationCounter();
  logger.info(`[PUBLISH] Contador de publicações resetado automaticamente`);
});

// Controle de setup do processador
let isProcessorSetup = false;
let setupPromise = null;

// Inicializar e configurar o processador
async function setupProcessor() {
  if (isProcessorSetup) return true;
  if (setupPromise) return setupPromise;
  
  setupPromise = (async () => {
    try {
      logger.info('[PUBLISH_WORKER] Iniciando configuração do processador...');
      
      await initializeQueue();
      await syncPublicationCounter();
      
      // Configurar processador com o queue manager
      queueManager.process('publish-queue', 'publish-post', 2, publishPostJob);
      
      isProcessorSetup = true;
      logger.info('[PUBLISH_WORKER] Processador de publicações configurado com sucesso');
      return true;
    } catch (error) {
      logger.error('[PUBLISH_WORKER] Erro ao configurar processador:', error);
      throw error;
    }
  })();
  
  return setupPromise;
}

// Função para garantir que o processador está configurado
async function ensureProcessorSetup() {
  return setupProcessor();
}

// Worker para publicar posts com tratamento robusto de erros
async function publishPostJob(job) {
  const { denunciaId } = job.data;
  
  // Validação de entrada - aceitar string ou número
  if (!denunciaId) {
    throw new Error('ID da denúncia inválido para publicação');
  }
  
  // VALIDAÇÃO OBRIGATÓRIA: Verificar se denúncia existe e está aprovada
  const denuncia = await prisma.denuncia.findUnique({
    where: { id: parseInt(denunciaId) },
    include: { vereadores: true }
  });
  
  if (!denuncia) {
    throw new Error(`Denúncia ${denunciaId} não encontrada no banco de dados`);
  }
  
  if (denuncia.status !== 'APROVADA_ADMIN') {
    throw new Error(`Denúncia ${denunciaId} não está aprovada para publicação (status: ${denuncia.status})`);
  }
  
  if (!denuncia.fotoUrl) {
    throw new Error(`Denúncia ${denunciaId} não possui imagem para publicação`);
  }
  
  logger.info(`[PUBLISH] Validação OK - Denúncia ${denunciaId} (protocolo: ${denuncia.protocolo}) aprovada para publicação`);
  
  const startTime = Date.now();
  logger.info(`[PUBLISH] Iniciando publicação da denúncia: ${denunciaId}`);
  
  try {
    // Sincronizar contador antes de verificar limite
    await syncPublicationCounter();
    
    // Verificação de limite com margin de segurança
    if (publicacoesHoje >= CONFIG.MAX_POSTS_PER_DAY) {
      logger.warn(`[PUBLISH] Limite diário atingido (${publicacoesHoje}/${CONFIG.MAX_POSTS_PER_DAY}). Reagendando denúncia ${denunciaId}`);
      
      // Atualizar status da denúncia para controle
      await prisma.denuncia.update({
        where: { id: denunciaId },
        data: {
          status: 'AGENDADA'
        }
      });
      
      // Reagendar para amanhã às 6h com validação
      const amanha = new Date();
      amanha.setDate(amanha.getDate() + 1);
      amanha.setHours(6, 0, 0, 0);
      
      const delay = amanha.getTime() - Date.now();
      if (delay > 0) {
        await queueManager.addJob('publish-queue', 'publish-post', job.data, {
          delay,
          attempts: job.opts.attempts || 3
        });
      }
      
      return { success: false, reason: 'Limite diário atingido, reagendado para amanhã' };
    }
    
    // Buscar denúncia com validação completa
    const denuncia = await prisma.denuncia.findUnique({
      where: { id: denunciaId }
    });
    
    if (!denuncia) {
      const error = new Error(`Denúncia ${denunciaId} não encontrada no banco de dados`);
      error.code = 'DENUNCIA_NOT_FOUND';
      throw error;
    }
    
    // Verificar se já não foi publicada
    if (denuncia.status === 'PUBLICADA') {
      logger.warn(`[PUBLISH] Denúncia ${denunciaId} já foi publicada anteriormente`);
      return { success: false, reason: 'Já publicada', timestamp: denuncia.publishedAt };
    }
    
    // Verificar se está aprovada com status válidos expandidos
    const statusValidos = ['APROVADA_BOT', 'APROVADA_ADMIN', 'AGENDADA'];
    if (!statusValidos.includes(denuncia.status)) {
      logger.warn(`[PUBLISH] Denúncia ${denunciaId} com status inválido para publicação: ${denuncia.status}`);
      return { success: false, reason: `Status inválido: ${denuncia.status}` };
    }
    
    // Validar dados obrigatórios para publicação
    if (!denuncia.textoFiltrado && !denuncia.texto) {
      throw new Error('Denúncia sem texto válido para publicação');
    }
    
    if (!denuncia.vereadores || denuncia.vereadores.length === 0) {
      throw new Error('Denúncia sem vereadores atribuídos');
    }
    
    // Formatar texto do post usando análise inteligente
    const textoPost = await formatarPostInteligente(denuncia);
    
    // Status já existe, não precisa alterar antes da publicação
    logger.info(`[PUBLISH] Iniciando publicação para denúncia ${denunciaId} (status: ${denuncia.status})`);
    
    // Verificar conexão do Instagram API Manager
    const connectionTest = await instagramApiManager.testConnection();
    if (!connectionTest.success) {
      throw new Error(`Falha na conexão com Instagram: ${connectionTest.error}`);
    }
    
    // Publicar no Instagram usando API Manager com timeout e validação
    const publicationTimeout = 30000; // 30 segundos
    const resultado = await Promise.race([
      instagramApiManager.publicar({
        texto: textoPost,
        imagem: denuncia.imagemUrl,
        vereadores: denuncia.vereadores,
        bairro: denuncia.bairro
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout na publicação do Instagram')), publicationTimeout)
      )
    ]);
    
    if (resultado.success) {
      // Transação para atualizar status e incrementar contador
      await prisma.$transaction(async (tx) => {
        await tx.denuncia.update({
          where: { id: denunciaId },
          data: {
            status: 'PUBLICADA',
            publishedAt: new Date()
          }
        });
      });
      
      publicacoesHoje++;
      const processingTime = Date.now() - startTime;
      
      logger.info(`[PUBLISH] Denúncia ${denunciaId} publicada com sucesso em ${processingTime}ms via ${resultado.apiType || 'unknown'} API. Total hoje: ${publicacoesHoje}`, {
        apiType: resultado.apiType,
        serviceUsed: resultado.serviceUsed,
        usedFallback: resultado.usedFallback || false,
        migrationReady: resultado.migrationReady || false
      });
      
      // Notificar usuário via WhatsApp (implementar se necessário)
      // await notificarUsuario(denuncia.phoneNumber, denuncia.protocolo, resultado.postUrl);
      
      return { 
        success: true, 
        postId: resultado.postId,
        postUrl: resultado.postUrl,
        publicacoesHoje,
        processingTime,
        apiType: resultado.apiType,
        serviceUsed: resultado.serviceUsed,
        usedFallback: resultado.usedFallback || false,
        migrationReady: resultado.migrationReady || false
      };
    } else {
      const error = new Error(`Falha ao publicar no Instagram: ${resultado.error}`);
      error.code = 'INSTAGRAM_PUBLISH_FAILED';
      error.details = resultado;
      throw error;
    }
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    logger.error(`[PUBLISH] Erro ao publicar denúncia ${denunciaId} após ${processingTime}ms:`, {
      message: error.message,
      code: error.code,
      attempt: job.attemptsMade + 1,
      maxAttempts: job.opts.attempts || 3
    });
    
    try {
      // Categorizar erro para tratamento adequado
      let shouldRetry = true;
      let retryDelay = 5000; // 5 segundos padrão
      let statusUpdate = 'ERRO';
      
      if (error.code === 'DENUNCIA_NOT_FOUND') {
        shouldRetry = false;
        statusUpdate = 'REJEITADA_BOT';
      } else if (error.message.includes('rate limit') || error.message.includes('Rate limit')) {
        retryDelay = 3600 * 1000; // 1 hora para rate limit
        statusUpdate = 'AGENDADA';
        logger.warn(`[PUBLISH] Rate limit detectado, reagendando denúncia ${denunciaId} para 1 hora`);
      } else if (error.message.includes('Timeout')) {
        retryDelay = 60 * 1000; // 1 minuto para timeout
        statusUpdate = 'ERRO';
      } else if (error.code === 'INSTAGRAM_PUBLISH_FAILED') {
        retryDelay = 10 * 60 * 1000; // 10 minutos para falhas do Instagram
        statusUpdate = 'ERRO';
      }
      
      // Atualizar status da denúncia com erro
      await prisma.denuncia.update({
        where: { id: denunciaId },
        data: {
          status: statusUpdate
        }
      });
      
      // Reagendar se apropriado e não excedeu tentativas
      if (shouldRetry && (job.attemptsMade + 1) < (job.opts.attempts || 3)) {
        await queueManager.addJob('publish-queue', 'publish-post', job.data, {
          delay: retryDelay,
          attempts: job.opts.attempts
        });
        
        return { 
          success: false, 
          reason: `Erro tratado, reagendado em ${retryDelay/1000}s`,
          attempt: job.attemptsMade + 1,
          processingTime
        };
      }
    } catch (updateError) {
      logger.error(`[PUBLISH] Falha ao atualizar status de erro para denúncia ${denunciaId}:`, updateError);
    }
    
    // Não fazer retry para erros não-retriáveis
    if (error.code === 'DENUNCIA_NOT_FOUND') {
      return Promise.reject(new Error(`NON_RETRYABLE: ${error.message}`));
    }
    
    throw error;
  }
}

// Função para formatar post usando análise inteligente
async function formatarPostInteligente(denuncia) {
  try {
    // Executar análise inteligente em tempo real
    logger.info(`[PUBLISH] Executando análise inteligente em tempo real para denúncia ${denuncia.id}`);
    const analiseInteligente = await smartAnalysisService.analisarDenuncia(denuncia.texto, denuncia.endereco);
    
    // Usar smartAnalysisService para gerar caption otimizada
    const caption = smartAnalysisService.gerarCaption(analiseInteligente, denuncia.textoFiltrado || denuncia.texto);
    
    // Adicionar protocolo no final
    return `${caption}\n\nProtocolo: ${denuncia.protocolo}`;
    
  } catch (error) {
    logger.error(`[PUBLISH] Erro ao formatar post inteligente para denúncia ${denuncia.id}:`, error);
    
    // Fallback para formatação tradicional
    return formatarPostTradicional(denuncia);
  }
}

// Função de fallback para formatação tradicional
function formatarPostTradicional(denuncia) {
  const bairroHashtag = denuncia.bairro ? 
    `#${denuncia.bairro.replace(/\s+/g, '').toLowerCase()}` : 
    '#SaoPaulo';
    
  const hashtags = [
    '#DenunciaCidada',
    '#FiscalizaSBC',
    '#SaoBernardoDoCampo',
    bairroHashtag,
    '#ProblemasUrbanos',
    '#CidadeMelhor'
  ];
  
  return `⚠️ DENÚNCIA CIDADÃ

${denuncia.textoFiltrado || denuncia.texto}

📍 Local: ${denuncia.bairro}
🏛️ Vereadores da região:
${denuncia.vereadores.join(' ')}

👥 MORADORES: Curtam e compartilhem para dar visibilidade!
🏛️ PODER PÚBLICO: Esperamos providências!
Porque aqui é CIDADE PRA FRENTE!

${hashtags.join(' ')}
Protocolo: ${denuncia.protocolo}`;
}

// Função para adicionar job de publicação
async function addPublishJob(denunciaId, options = {}) {
  try {
    await ensureProcessorSetup();
    
    return await queueManager.addJob('publish-queue', 'publish-post', {
      denunciaId,
      source: options.source || 'manual'
    }, {
      priority: options.priority || 0,
      delay: options.delay || 0,
      ...options
    });
  } catch (error) {
    logger.error(`[PUBLISH_WORKER] Erro ao adicionar job de publicação:`, error);
    throw error;
  }
}

// Função para obter estatísticas da fila
async function getPublishQueueStats() {
  try {
    await ensureProcessorSetup();
    const stats = await queueManager.getQueueStats('publish-queue');
    return {
      ...stats,
      publicacoesHoje,
      limiteRestante: CONFIG.MAX_POSTS_PER_DAY - publicacoesHoje
    };
  } catch (error) {
    logger.error('[PUBLISH_WORKER] Erro ao obter estatísticas:', error);
    return null;
  }
}

// Agendar publicações nos horários configurados
CONFIG.HORARIOS_PUBLICACAO.forEach(horario => {
  const [hora, minuto] = horario.split(':');
  
  cron.schedule(`${minuto} ${hora} * * *`, async () => {
    try {
      logger.info(`[PUBLISH] Iniciando ciclo de publicação das ${horario}`);
      
      // Sincronizar contador antes do ciclo
      await syncPublicationCounter();
      
      // Verificar se ainda há capacidade para publicações
      if (publicacoesHoje >= CONFIG.MAX_POSTS_PER_DAY) {
        logger.info(`[PUBLISH] Limite diário já atingido (${publicacoesHoje}/${CONFIG.MAX_POSTS_PER_DAY}). Pulando ciclo das ${horario}`);
        return;
      }
      
      // Buscar denúncias aprovadas aguardando publicação
      const denunciasPendentes = await prisma.denuncia.findMany({
        where: {
          status: {
            in: ['APROVADA_BOT', 'APROVADA_ADMIN', 'AGENDADA']
          }
        },
        orderBy: [
          { aprovadaAdmin: 'desc' }, // Priorizar aprovadas por admin
          { scoreBot: 'desc' }, // Depois por score
          { createdAt: 'asc' } // FIFO
        ],
        take: CONFIG.MAX_POSTS_PER_DAY - publicacoesHoje
      });
      
      logger.info(`[PUBLISH] ${denunciasPendentes.length} denúncias encontradas para publicação`);
      
      // Adicionar à fila com delay progressivo
      for (let i = 0; i < denunciasPendentes.length; i++) {
        await addPublishJob(denunciasPendentes[i].id, {
          delay: i * 5 * 60 * 1000, // 5 minutos entre cada post
          source: 'scheduled_cycle',
          priority: denunciasPendentes[i].aprovadaAdmin ? 1 : 0
        });
      }
    } catch (error) {
      logger.error(`[PUBLISH] Erro no ciclo de publicação das ${horario}:`, error);
    }
  });
});

// Monitoramento da fila
setInterval(async () => {
  try {
    const stats = await getPublishQueueStats();
    if (stats) {
      logger.info('[PUBLISH_WORKER] Status da fila:', {
        counts: stats.counts,
        publicacoesHoje: stats.publicacoesHoje,
        limiteRestante: stats.limiteRestante
      });
    }
  } catch (error) {
    logger.error('[PUBLISH_WORKER] Erro ao monitorar fila de publicação:', error);
  }
}, 5 * 60 * 1000); // A cada 5 minutos

// Limpeza automática de jobs antigos
setInterval(async () => {
  try {
    await queueManager.cleanOldJobs('publish-queue', {
      completed: 24 * 60 * 60 * 1000, // 24 horas
      failed: 7 * 24 * 60 * 60 * 1000  // 7 dias
    });
  } catch (error) {
    logger.error('[PUBLISH_WORKER] Erro na limpeza automática:', error);
  }
}, 3600 * 1000); // A cada hora

// Não inicializar automaticamente - será inicializado pelo WorkerManager

module.exports = {
  addPublishJob,
  getPublishQueueStats,
  setupProcessor,
  ensureProcessorSetup,
  syncPublicationCounter
};