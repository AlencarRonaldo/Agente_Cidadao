const queueManager = require('../queues/queueManager');
const prisma = require('../config/database');
const textFilterService = require('../services/textFilterService');
const geoService = require('../services/geoService');
const vereadorService = require('../services/vereadorService');
const smartAnalysisService = require('../services/smartAnalysisService');
const logger = require('../utils/logger');
const { ESTADOS_CONVERSA, CONFIG } = require('../config/constants');

// Inicializar queue manager se não estiver inicializado
let processQueue;
let isInitialized = false;
let initPromise = null;
let isProcessorSetup = false;
let setupPromise = null;

async function initializeQueueWithRetry(maxRetries = 3) {
  if (isInitialized && processQueue) return processQueue;
  if (initPromise) return initPromise;
  
  initPromise = (async () => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info(`[PROCESS_WORKER] Tentativa de inicialização ${attempt}/${maxRetries}...`);
        
        if (!queueManager.isInitialized) {
          await queueManager.initialize();
        }
        
        processQueue = queueManager.getQueue('process-queue');
        isInitialized = true;
        
        logger.info('[PROCESS_WORKER] Fila inicializada com sucesso');
        return processQueue;
      } catch (error) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        logger.warn(`[PROCESS_WORKER] Tentativa ${attempt}/${maxRetries} falhou, retry em ${delay}ms:`, error.message);
        
        if (attempt === maxRetries) {
          logger.error('[PROCESS_WORKER] Falha após todas as tentativas:', error);
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

// Inicializar e configurar o processador
async function setupProcessor() {
  if (isProcessorSetup) return true;
  if (setupPromise) return setupPromise;
  
  setupPromise = (async () => {
    try {
      logger.info('[PROCESS_WORKER] Iniciando configuração do processador...');
      
      await initializeQueue();
      
      // Configurar processador com o queue manager
      queueManager.process('process-queue', 'process-denuncia', 3, processDenunciaJob);
      
      isProcessorSetup = true;
      logger.info('[PROCESS_WORKER] Processador de denúncias configurado com sucesso');
      return true;
    } catch (error) {
      logger.error('[PROCESS_WORKER] Erro ao configurar processador:', error);
      throw error;
    }
  })();
  
  return setupPromise;
}

// Função para garantir que o processador está configurado
async function ensureProcessorSetup() {
  return setupProcessor();
}

// Função principal de processamento
async function processDenunciaJob(job) {
  const { denunciaId } = job.data;
  
  // Validação de entrada - aceitar string ou número
  if (!denunciaId) {
    throw new Error('ID da denúncia inválido');
  }
  
  try {
    logger.info(`[PROCESS] Iniciando processamento da denúncia: ${denunciaId}`);
    
    // Buscar denúncia no banco com tratamento de transação
    const denuncia = await prisma.denuncia.findUnique({
      where: { id: denunciaId }
    });
    
    if (!denuncia) {
      const error = new Error(`Denúncia ${denunciaId} não encontrada no banco de dados`);
      error.code = 'DENUNCIA_NOT_FOUND';
      throw error;
    }
    
    // Verificar se denúncia já foi processada
    if (denuncia.status === 'PROCESSANDO') {
      logger.warn(`[PROCESS] Denúncia ${denunciaId} já está sendo processada`);
      return { success: false, reason: 'Já em processamento' };
    }
    
    // 1. Aplicar filtro de texto com validação de entrada
    if (!denuncia.texto || typeof denuncia.texto !== 'string') {
      throw new Error('Texto da denúncia inválido ou ausente');
    }
    
    const filterResult = textFilterService.analyze(denuncia.texto);
    if (!filterResult || typeof filterResult !== 'object') {
      throw new Error('Falha na análise de filtro de texto');
    }
    
    const { filteredText, score, rejected, moderationDetails } = filterResult;
    const textoFiltrado = filteredText;
    const aprovadoBot = !rejected;
    const motivoRejeicao = rejected ? moderationDetails.join('; ') : null;
    
    // 2. Análise inteligente da denúncia
    logger.info(`🤖 Iniciando análise inteligente para denúncia ${denunciaId}`);
    const analiseInteligente = await smartAnalysisService.analisarDenuncia(denuncia.texto, denuncia.localizacao);
    
    logger.info(`✅ Análise inteligente concluída: ${analiseInteligente.problemaDetectado || 'Não detectado'} ${analiseInteligente.emoji}`);
    
    // 3. Validar bairro novamente (double check)
    const bairroValido = await geoService.validarBairro(denuncia.bairro);
    
    if (!bairroValido) {
      await prisma.denuncia.update({
        where: { id: denunciaId },
        data: {
          status: 'BAIRRO_INVALIDO',
          motivoRejeicaoBot: 'Bairro não encontrado na base de dados',
          processedAt: new Date()
        }
      });
      return { success: false, reason: 'Bairro inválido' };
    }
    
    // 4. Selecionar vereadores - priorizar análise inteligente
    let vereadores = denuncia.vereadores;
    let bairroFinal = denuncia.bairro;
    
    // Se a análise inteligente detectou bairro e vereadores, usar eles
    if (analiseInteligente.bairro && analiseInteligente.vereadores.length > 0) {
      vereadores = analiseInteligente.vereadores;
      bairroFinal = analiseInteligente.bairro;
      logger.info(`🎯 Usando vereadores da análise inteligente: ${bairroFinal} → ${vereadores.join(', ')}`);
    } else if (!vereadores || vereadores.length === 0) {
      // Fallback para método tradicional
      const vereadoresSelecionados = await vereadorService.selecionarParaDenuncia(
        bairroFinal,
        denuncia.texto // Para análise de especialidade
      );
      vereadores = vereadoresSelecionados.map(v => v.instagram);
      logger.info(`📋 Usando vereadores tradicionais: ${vereadores.join(', ')}`);
    }
    
    // 5. Atualizar denúncia com resultado do processamento
    const novoStatus = aprovadoBot ? 'APROVADA_BOT' : 'PENDENTE_MODERACAO';
    
    await prisma.denuncia.update({
      where: { id: denunciaId },
      data: {
        textoFiltrado,
        scoreBot: score,
        aprovadaBot: aprovadoBot,
        motivoRejeicaoBot: motivoRejeicao,
        vereadores,
        bairro: bairroFinal, // Atualizar com bairro detectado pela análise inteligente
        status: novoStatus,
        processedAt: new Date(),
        // Salvar análise inteligente no metadata
        metadata: {
          ...(denuncia.metadata || {}),
          analiseInteligente: {
            problemaDetectado: analiseInteligente.problemaDetectado,
            emoji: analiseInteligente.emoji,
            categoria: analiseInteligente.categoria,
            prioridade: analiseInteligente.prioridade,
            bairroDetectado: analiseInteligente.bairro,
            regiaoDetectada: analiseInteligente.regiao,
            localizacaoDetectada: analiseInteligente.localizacaoDetectada,
            hashtags: analiseInteligente.hashtags,
            processedAt: new Date()
          }
        }
      }
    });
    
    // 🔒 SEGURANÇA: PUBLICAÇÃO AUTOMÁTICA DESABILITADA
    // Todas as denúncias agora requerem aprovação manual explícita
    if (aprovadoBot) {
      // 📋 Log de aprovação automática mas SEM adicionar à fila
      logger.info(`🔒 [PROCESS] Denúncia ${denunciaId} passou na análise automática mas REQUER APROVAÇÃO MANUAL`);
      logger.info(`📊 [PROCESS] Score: ${score} | Vereadores: ${vereadores.length} | Status: ${novoStatus}`);
      
      // 🛡️ NÃO ADICIONAR À FILA DE PUBLICAÇÃO AUTOMATICAMENTE
      // await queueManager.addJob('publish-queue', 'publish-post', ...); // DESABILITADO
      
      logger.warn(`🚨 [PROCESS] PUBLICAÇÃO AUTOMÁTICA DESABILITADA POR SEGURANÇA - Denúncia ${denunciaId} aguarda aprovação manual`);
      
    } else {
      logger.info(`📋 [PROCESS] Denúncia ${denunciaId} marcada para revisão manual (reprovada pelo bot)`);
    }
    
    // 📝 TODAS AS DENÚNCIAS AGORA SEGUEM O FLUXO DE APROVAÇÃO MANUAL
    logger.info(`✅ [PROCESS] Denúncia ${denunciaId} processada com segurança - aguardando aprovação manual`);
    
    return { 
      success: true, 
      status: novoStatus,
      score,
      vereadores: vereadores.length 
    };
    
  } catch (error) {
    logger.error(`[PROCESS] Erro ao processar denúncia ${denunciaId}:`, {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    
    try {
      // Categorizar erro para melhor tratamento
      let statusFinal = 'ERRO';
      let motivoErro = `Erro no processamento: ${error.message}`;
      
      if (error.code === 'DENUNCIA_NOT_FOUND') {
        statusFinal = 'NAO_ENCONTRADA';
        motivoErro = 'Denúncia não encontrada no banco de dados';
      } else if (error.message.includes('Bairro')) {
        statusFinal = 'BAIRRO_INVALIDO';
        motivoErro = error.message;
      } else if (error.message.includes('Texto')) {
        statusFinal = 'TEXTO_INVALIDO';
        motivoErro = error.message;
      }
      
      // Atualizar status para erro com retry baseado no tipo
      await prisma.denuncia.update({
        where: { id: denunciaId },
        data: {
          status: statusFinal,
          motivoRejeicaoBot: motivoErro,
          processedAt: new Date(),
          metadata: {
            error: {
              message: error.message,
              code: error.code,
              timestamp: new Date().toISOString()
            }
          }
        }
      });
    } catch (updateError) {
      logger.error(`[PROCESS] Falha ao atualizar status de erro para denúncia ${denunciaId}:`, updateError);
    }
    
    // Rejeitar job baseado no tipo de erro
    if (error.code === 'DENUNCIA_NOT_FOUND') {
      // Não fazer retry para denúncias não encontradas
      return Promise.reject(new Error(`NON_RETRYABLE: ${error.message}`));
    }
    
    throw error;
  }
}

// Função para adicionar job de processamento
async function addProcessJob(denunciaId, options = {}) {
  try {
    await initializeQueue();
    
    return await queueManager.addJob('process-queue', 'process-denuncia', {
      denunciaId
    }, {
      priority: options.priority || 0,
      delay: options.delay || 0,
      ...options
    });
  } catch (error) {
    logger.error(`[PROCESS_WORKER] Erro ao adicionar job de processamento:`, error);
    throw error;
  }
}

// Função para obter estatísticas da fila
async function getProcessQueueStats() {
  try {
    await initializeQueue();
    return await queueManager.getQueueStats('process-queue');
  } catch (error) {
    logger.error('[PROCESS_WORKER] Erro ao obter estatísticas:', error);
    return null;
  }
}

// Limpeza automática de jobs antigos
setInterval(async () => {
  try {
    await queueManager.cleanOldJobs('process-queue', {
      completed: 24 * 60 * 60 * 1000, // 24 horas
      failed: 7 * 24 * 60 * 60 * 1000  // 7 dias
    });
    
    const stats = await getProcessQueueStats();
    if (stats) {
      logger.info('[PROCESS_WORKER] Status da fila:', stats.counts);
    }
  } catch (error) {
    logger.error('[PROCESS_WORKER] Erro na limpeza automática:', error);
  }
}, 3600 * 1000); // A cada hora

// Inicializar processador quando o módulo for carregado
// Não inicializar automaticamente - será inicializado pelo WorkerManager

module.exports = {
  addProcessJob,
  getProcessQueueStats,
  setupProcessor
};