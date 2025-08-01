const { Worker } = require('bullmq');
const Redis = require('ioredis');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const instagramService = require('../services/instagramService');
const { CONFIG } = require('../config/constants');
const monitoringService = require('../services/monitoringService');
const loggerService = require('../services/loggerService');
const websocketService = require('../services/websocketService');

const connection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: null,
});

const publishWorker = new Worker('publishInstagram', async (job) => {
  const { denunciaId, texto, imagem, vereadores, bairro, userId } = job.data;
  const startTime = Date.now();

  // Configurar logger com contexto
  const logger = loggerService.child({
    operation: 'publication',
    denunciaId,
    userId,
    jobId: job.id
  });

  logger.info(`Iniciando publicação da denúncia ${denunciaId}`);

  // Registrar evento de início de processamento
  await monitoringService.recordPublicationEvent(denunciaId, 'processing', {
    jobId: job.id,
    userId,
    startTime
  });

  try {
    // Atualizar status para processando
    await prisma.denuncia.update({
      where: { protocolo: denunciaId },
      data: { 
        status: 'PROCESSANDO',
        updatedAt: new Date()
      },
    });

    // Verificar limites diários antes de prosseguir
    const dailyLimits = await monitoringService.getDailyLimits();
    if (dailyLimits.remaining <= 0) {
      logger.warn(`Limite diário excedido (${dailyLimits.current}/${dailyLimits.maximum})`);
      
      // Reagendar para o próximo dia
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(8, 0, 0, 0); // 8h da manhã

      await job.schedule(tomorrow);
      
      await monitoringService.recordPublicationEvent(denunciaId, 'rescheduled', {
        reason: 'daily_limit_exceeded',
        scheduledFor: tomorrow,
        currentLimits: dailyLimits
      });

      return { rescheduled: true, scheduledFor: tomorrow };
    }

    // Realizar publicação no Instagram
    const publicationStart = Date.now();
    const { success, postId, postUrl, error: instagramError } = await instagramService.publicar({
      texto: texto,
      imagem: imagem,
      vereadores: vereadores,
      bairro: bairro,
    });
    const publicationTime = Date.now() - publicationStart;

    if (success) {
      // Sucesso na publicação
      const processingTime = Date.now() - startTime;
      
      await prisma.denuncia.update({
        where: { protocolo: denunciaId },
        data: {
          status: 'PUBLICADA',
          publishedAt: new Date(),
          postId: postId,
          postUrl: postUrl,
        },
      });

      // Registrar evento de sucesso
      await monitoringService.recordPublicationEvent(denunciaId, 'published', {
        postId,
        postUrl,
        processingTime,
        publicationTime,
        bairro,
        vereadores: vereadores?.length || 0
      });

      // Log estruturado
      logger.logPublication('published', denunciaId, {
        postId,
        postUrl,
        processingTime,
        publicationTime,
        bairro
      });

      // Notificar usuário via WebSocket se disponível
      if (userId) {
        const feedback = await monitoringService.generateUserFeedback(
          'approve_and_post_now',
          denunciaId,
          { publishedImmediately: true, postUrl, postId }
        );

        websocketService.sendToUser(userId, {
          type: 'publication_feedback',
          data: { denunciaId, feedback }
        });
      }

      logger.info(`Denúncia ${denunciaId} publicada com sucesso em ${processingTime}ms`);
      
      return { 
        success: true, 
        postId, 
        postUrl, 
        processingTime,
        publicationTime 
      };

    } else {
      // Falha na publicação
      const processingTime = Date.now() - startTime;
      const errorMessage = instagramError || 'Falha na publicação no Instagram';
      
      await prisma.denuncia.update({
        where: { protocolo: denunciaId },
        data: {
          status: 'ERRO',
          motivoRejeicaoBot: errorMessage,
        },
      });

      // Registrar evento de falha
      await monitoringService.recordPublicationEvent(denunciaId, 'failed', {
        error: errorMessage,
        processingTime,
        publicationTime,
        instagramError
      });

      // Log de erro
      logger.logPublication('failed', denunciaId, {
        error: errorMessage,
        processingTime,
        publicationTime
      });

      // Notificar usuário via WebSocket
      if (userId) {
        const feedback = await monitoringService.generateUserFeedback(
          'approve_and_post_now',
          denunciaId,
          { 
            publishedImmediately: false,
            error: errorMessage,
            processingTime 
          }
        );

        websocketService.sendToUser(userId, {
          type: 'publication_feedback',
          data: { denunciaId, feedback }
        });
      }

      logger.error(`Falha ao publicar denúncia ${denunciaId}`, null, {
        error: errorMessage,
        processingTime
      });

      throw new Error(errorMessage);
    }

  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorMessage = `Erro interno na publicação: ${error.message}`;
    
    // Atualizar status no banco
    await prisma.denuncia.update({
      where: { protocolo: denunciaId },
      data: {
        status: 'ERRO',
        motivoRejeicaoBot: errorMessage,
      },
    });

    // Registrar evento de erro
    await monitoringService.recordPublicationEvent(denunciaId, 'failed', {
      error: error.message,
      stack: error.stack,
      processingTime,
      internalError: true
    });

    // Log crítico para erros inesperados
    await logger.logCritical(`Erro crítico na publicação da denúncia ${denunciaId}`, {
      error: error.message,
      stack: error.stack,
      processingTime,
      jobData: job.data
    });

    // Notificar usuário via WebSocket
    if (userId) {
      const feedback = await monitoringService.generateUserFeedback(
        'approve_and_post_now',
        denunciaId,
        { 
          publishedImmediately: false,
          error: errorMessage,
          processingTime,
          internalError: true
        }
      );

      websocketService.sendToUser(userId, {
        type: 'publication_feedback',
        data: { denunciaId, feedback }
      });
    }

    throw error;
  }
}, { 
  connection,
  concurrency: 3, // Máximo 3 publicações simultâneas
  removeOnComplete: 50, // Manter apenas os 50 jobs concluídos mais recentes
  removeOnFail: 100 // Manter apenas os 100 jobs falhados mais recentes
});

console.log('Publish Worker started.');

module.exports = publishWorker;
