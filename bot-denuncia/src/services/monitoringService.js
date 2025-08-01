const { PrismaClient } = require('@prisma/client');
const Redis = require('ioredis');
const EventEmitter = require('events');

const prisma = new PrismaClient();
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: null,
});

class MonitoringService extends EventEmitter {
  constructor() {
    super();
    this.metricsCache = new Map();
    this.alertThresholds = {
      publicationFailureRate: 0.2, // 20%
      averageResponseTime: 30000, // 30 segundos
      pendingQueueSize: 50,
      errorRate: 0.1 // 10%
    };
    
    // Inicializar monitoramento contínuo
    this.startContinuousMonitoring();
  }

  /**
   * Obter status detalhado do sistema de publicação
   */
  async getPublicationSystemStatus() {
    try {
      const [
        queueStats,
        recentPublications,
        errorStats,
        performanceMetrics,
        dailyLimits
      ] = await Promise.all([
        this.getQueueStatistics(),
        this.getRecentPublicationStats(),
        this.getErrorStatistics(),
        this.getPerformanceMetrics(),
        this.getDailyLimits()
      ]);

      const systemStatus = {
        status: this.calculateOverallStatus({
          queueStats,
          errorStats,
          performanceMetrics
        }),
        timestamp: new Date(),
        queue: queueStats,
        publications: recentPublications,
        errors: errorStats,
        performance: performanceMetrics,
        limits: dailyLimits,
        nextScheduledPublication: await this.getNextScheduledPublication(),
        systemHealth: await this.getSystemHealthScore()
      };

      // Cache do status para consultas rápidas
      this.metricsCache.set('systemStatus', systemStatus);
      
      return systemStatus;
    } catch (error) {
      console.error('Erro ao obter status do sistema:', error);
      throw error;
    }
  }

  /**
   * Estatísticas da fila de publicação
   */
  async getQueueStatistics() {
    const queueKey = 'bull:publishInstagram';
    
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      redis.llen(`${queueKey}:waiting`),
      redis.llen(`${queueKey}:active`),
      redis.llen(`${queueKey}:completed`),
      redis.llen(`${queueKey}:failed`),
      redis.llen(`${queueKey}:delayed`)
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
      processingRate: await this.calculateProcessingRate()
    };
  }

  /**
   * Estatísticas recentes de publicação
   */
  async getRecentPublicationStats() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const stats = await prisma.$transaction([
      // Publicações do dia
      prisma.denuncia.count({
        where: {
          status: 'PUBLICADA',
          publishedAt: {
            gte: startOfDay
          }
        }
      }),
      
      // Publicações da última hora
      prisma.denuncia.count({
        where: {
          status: 'PUBLICADA',
          publishedAt: {
            gte: new Date(Date.now() - 60 * 60 * 1000)
          }
        }
      }),

      // Taxa de sucesso das últimas 24h
      prisma.denuncia.groupBy({
        by: ['status'],
        where: {
          updatedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          },
          status: {
            in: ['PUBLICADA', 'ERRO', 'REJEITADA_ADMIN', 'REJEITADA_BOT']
          }
        },
        _count: true
      })
    ]);

    const [dailyPublications, hourlyPublications, statusDistribution] = stats;
    
    const totalProcessed = statusDistribution.reduce((sum, item) => sum + item._count, 0);
    const successfulPublications = statusDistribution.find(s => s.status === 'PUBLICADA')?._count || 0;
    const successRate = totalProcessed > 0 ? (successfulPublications / totalProcessed) * 100 : 0;

    return {
      daily: dailyPublications,
      hourly: hourlyPublications,
      successRate: Math.round(successRate * 100) / 100,
      statusDistribution,
      averageTimeToPublication: await this.calculateAveragePublicationTime()
    };
  }

  /**
   * Estatísticas de erros
   */
  async getErrorStatistics() {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const [totalErrors, errorsByType, recentErrors] = await Promise.all([
      prisma.denuncia.count({
        where: {
          status: 'ERRO',
          updatedAt: {
            gte: last24Hours
          }
        }
      }),
      
      prisma.denuncia.groupBy({
        by: ['motivoRejeicaoBot'],
        where: {
          status: 'ERRO',
          updatedAt: {
            gte: last24Hours
          },
          motivoRejeicaoBot: {
            not: null
          }
        },
        _count: true,
        orderBy: {
          _count: {
            motivoRejeicaoBot: 'desc'
          }
        }
      }),

      prisma.denuncia.findMany({
        where: {
          status: 'ERRO',
          updatedAt: {
            gte: new Date(Date.now() - 60 * 60 * 1000) // Última hora
          }
        },
        select: {
          protocolo: true,
          motivoRejeicaoBot: true,
          updatedAt: true
        },
        orderBy: {
          updatedAt: 'desc'
        },
        take: 10
      })
    ]);

    return {
      total24h: totalErrors,
      byType: errorsByType,
      recent: recentErrors,
      errorRate: await this.calculateErrorRate()
    };
  }

  /**
   * Métricas de performance
   */
  async getPerformanceMetrics() {
    const metrics = await redis.hgetall('publication:metrics') || {};
    
    return {
      averageProcessingTime: parseFloat(metrics.avgProcessingTime) || 0,
      averageQueueWaitTime: parseFloat(metrics.avgQueueWaitTime) || 0,
      peakQueueSize: parseInt(metrics.peakQueueSize) || 0,
      throughputPerHour: parseFloat(metrics.throughputPerHour) || 0,
      lastUpdated: new Date(metrics.lastUpdated || Date.now())
    };
  }

  /**
   * Limites diários de publicação
   */
  async getDailyLimits() {
    const today = new Date().toISOString().split('T')[0];
    const limitKey = `publication:limit:${today}`;
    
    const currentCount = await redis.get(limitKey) || 0;
    const maxDailyLimit = parseInt(process.env.DAILY_PUBLICATION_LIMIT) || 100;
    
    return {
      current: parseInt(currentCount),
      maximum: maxDailyLimit,
      remaining: Math.max(0, maxDailyLimit - parseInt(currentCount)),
      percentage: Math.min(100, (parseInt(currentCount) / maxDailyLimit) * 100),
      resetTime: this.getNextDayStart()
    };
  }

  /**
   * Próxima publicação agendada
   */
  async getNextScheduledPublication() {
    const nextScheduled = await prisma.denuncia.findFirst({
      where: {
        status: 'AGENDADA'
      },
      orderBy: {
        createdAt: 'asc' // Assumindo ordem FIFO
      },
      select: {
        protocolo: true,
        createdAt: true,
        bairro: true
      }
    });

    if (!nextScheduled) return null;

    // Calcular horário estimado baseado na fila e limites
    const queuePosition = await this.getQueuePosition(nextScheduled.protocolo);
    const estimatedTime = this.calculateEstimatedPublicationTime(queuePosition);

    return {
      ...nextScheduled,
      queuePosition,
      estimatedTime
    };
  }

  /**
   * Score de saúde do sistema
   */
  async getSystemHealthScore() {
    const [queueHealth, errorHealth, performanceHealth] = await Promise.all([
      this.calculateQueueHealth(),
      this.calculateErrorHealth(),
      this.calculatePerformanceHealth()
    ]);

    const overallHealth = Math.round((queueHealth + errorHealth + performanceHealth) / 3);
    
    return {
      overall: overallHealth,
      components: {
        queue: queueHealth,
        errors: errorHealth,
        performance: performanceHealth
      },
      status: this.getHealthStatus(overallHealth)
    };
  }

  /**
   * Registrar evento de publicação para monitoramento
   */
  async recordPublicationEvent(denunciaId, event, metadata = {}) {
    const eventData = {
      denunciaId,
      event, // 'queued', 'processing', 'published', 'failed'
      metadata,
      timestamp: new Date()
    };

    // Armazenar no Redis para análise rápida
    await redis.lpush('publication:events', JSON.stringify(eventData));
    await redis.ltrim('publication:events', 0, 999); // Manter apenas os últimos 1000 eventos

    // Emitir evento para clientes conectados via WebSocket
    this.emit('publicationEvent', eventData);

    // Atualizar métricas em tempo real
    await this.updateMetrics(event, metadata);

    // Verificar se precisa enviar alertas
    await this.checkAlerts(eventData);
  }

  /**
   * Gerar feedback inteligente para ação do usuário
   */
  async generateUserFeedback(action, denunciaId, result) {
    const denuncia = await prisma.denuncia.findUnique({
      where: { protocolo: denunciaId }
    });

    if (!denuncia) {
      return {
        type: 'error',
        title: 'Denúncia não encontrada',
        message: 'A denúncia solicitada não foi localizada no sistema.'
      };
    }

    const dailyLimits = await this.getDailyLimits();
    const queueStats = await this.getQueueStatistics();

    switch (action) {
      case 'approve_and_post_now':
        return this.generateApprovalFeedback(denuncia, dailyLimits, queueStats, result);
      
      case 'schedule_publication':
        return this.generateScheduleFeedback(denuncia, dailyLimits, result);
      
      default:
        return {
          type: 'info',
          title: 'Ação processada',
          message: 'A ação foi processada com sucesso.'
        };
    }
  }

  /**
   * Feedback específico para aprovação e postagem
   */
  generateApprovalFeedback(denuncia, dailyLimits, queueStats, result) {
    const wasPublishedImmediately = result.publishedImmediately;
    const wasQueued = result.queued;
    const scheduledTime = result.scheduledTime;

    if (wasPublishedImmediately) {
      return {
        type: 'success',
        title: 'Publicado Imediatamente! ✅',
        message: `A denúncia ${denuncia.protocolo} foi publicada no Instagram com sucesso.`,
        details: {
          postUrl: result.postUrl,
          publishedAt: new Date()
        }
      };
    }

    if (wasQueued) {
      const position = queueStats.waiting + 1;
      const estimatedWait = this.calculateEstimatedWaitTime(position);
      
      return {
        type: 'warning',
        title: 'Adicionado à Fila de Publicação ⏳',
        message: `Limite diário atingido (${dailyLimits.current}/${dailyLimits.maximum}). Sua denúncia foi adicionada à fila.`,
        details: {
          queuePosition: position,
          estimatedPublishTime: scheduledTime,
          estimatedWait: estimatedWait,
          reason: 'daily_limit_reached'
        }
      };
    }

    if (scheduledTime) {
      return {
        type: 'info',
        title: 'Agendado para Publicação 📅',
        message: `A denúncia será publicada automaticamente em ${this.formatScheduleTime(scheduledTime)}.`,
        details: {
          scheduledTime: scheduledTime,
          reason: 'scheduled_publication'
        }
      };
    }

    return {
      type: 'error',
      title: 'Erro na Publicação ❌',
      message: 'Ocorreu um erro inesperado durante o processamento. Tente novamente.',
      details: result
    };
  }

  /**
   * Monitoramento contínuo em background
   */
  startContinuousMonitoring() {
    // Atualizar métricas a cada 30 segundos
    setInterval(async () => {
      try {
        await this.updateSystemMetrics();
      } catch (error) {
        console.error('Erro no monitoramento contínuo:', error);
      }
    }, 30000);

    // Verificar alertas a cada minuto
    setInterval(async () => {
      try {
        await this.checkSystemAlerts();
      } catch (error) {
        console.error('Erro na verificação de alertas:', error);
      }
    }, 60000);
  }

  /**
   * Métodos auxiliares
   */
  calculateOverallStatus(metrics) {
    const { queueStats, errorStats, performanceMetrics } = metrics;
    
    if (queueStats.failed > queueStats.total * 0.2) return 'critical';
    if (errorStats.errorRate > this.alertThresholds.errorRate) return 'warning';
    if (queueStats.waiting > this.alertThresholds.pendingQueueSize) return 'warning';
    
    return 'healthy';
  }

  async calculateProcessingRate() {
    const completed = await redis.llen('bull:publishInstagram:completed');
    const timeWindow = 60 * 60 * 1000; // 1 hora
    return Math.round((completed / (timeWindow / 60000)) * 100) / 100; // por minuto
  }

  async calculateAveragePublicationTime() {
    // Implementar cálculo baseado em eventos históricos
    const metrics = await redis.hget('publication:metrics', 'avgPublicationTime');
    return parseFloat(metrics) || 0;
  }

  async calculateErrorRate() {
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const [total, errors] = await Promise.all([
      prisma.denuncia.count({
        where: {
          updatedAt: { gte: last24h },
          status: { in: ['PUBLICADA', 'ERRO', 'REJEITADA_ADMIN'] }
        }
      }),
      prisma.denuncia.count({
        where: {
          updatedAt: { gte: last24h },
          status: 'ERRO'
        }
      })
    ]);

    return total > 0 ? (errors / total) * 100 : 0;
  }

  getNextDayStart() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }

  calculateEstimatedWaitTime(queuePosition) {
    const avgProcessingTime = 2 * 60 * 1000; // 2 minutos por publicação
    return new Date(Date.now() + (queuePosition * avgProcessingTime));
  }

  formatScheduleTime(time) {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(time));
  }

  getHealthStatus(score) {
    if (score >= 90) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'fair';
    return 'poor';
  }

  async updateMetrics(event, metadata) {
    // Implementar atualização de métricas em tempo real
    const metricsKey = 'publication:metrics';
    const timestamp = Date.now();
    
    await redis.hset(metricsKey, 'lastEventTime', timestamp);
    await redis.hset(metricsKey, `lastEvent:${event}`, timestamp);
    
    if (metadata.processingTime) {
      await redis.hset(metricsKey, 'lastProcessingTime', metadata.processingTime);
    }
  }

  async checkAlerts(eventData) {
    // Implementar lógica de alertas baseada em eventos
    if (eventData.event === 'failed') {
      this.emit('alert', {
        type: 'publication_failure',
        severity: 'high',
        message: `Falha na publicação da denúncia ${eventData.denunciaId}`,
        timestamp: eventData.timestamp,
        metadata: eventData.metadata
      });
    }
  }

  async updateSystemMetrics() {
    // Atualizar métricas gerais do sistema
    const status = await this.getPublicationSystemStatus();
    await redis.hset('system:metrics', 'lastUpdate', Date.now());
    await redis.hset('system:metrics', 'status', JSON.stringify(status));
  }

  async checkSystemAlerts() {
    // Verificar condições que requerem alertas
    const status = await this.getPublicationSystemStatus();
    
    if (status.systemHealth.overall < 50) {
      this.emit('alert', {
        type: 'system_health',
        severity: 'critical',
        message: 'Saúde do sistema está crítica',
        details: status.systemHealth
      });
    }
  }

  // Métodos de saúde específicos
  async calculateQueueHealth() {
    const stats = await this.getQueueStatistics();
    let score = 100;
    
    if (stats.failed > stats.total * 0.1) score -= 30;
    if (stats.waiting > 50) score -= 20;
    if (stats.active === 0 && stats.waiting > 0) score -= 25;
    
    return Math.max(0, score);
  }

  async calculateErrorHealth() {
    const errorRate = await this.calculateErrorRate();
    return Math.max(0, 100 - (errorRate * 10));
  }

  async calculatePerformanceHealth() {
    const metrics = await this.getPerformanceMetrics();
    let score = 100;
    
    if (metrics.averageProcessingTime > 60000) score -= 25; // > 1 minuto
    if (metrics.averageQueueWaitTime > 300000) score -= 25; // > 5 minutos
    
    return Math.max(0, score);
  }

  async getQueuePosition(denunciaId) {
    // Implementar lógica para obter posição na fila
    return 1; // Placeholder
  }

  calculateEstimatedPublicationTime(queuePosition) {
    const avgTimePerPublication = 2 * 60 * 1000; // 2 minutos
    return new Date(Date.now() + (queuePosition * avgTimePerPublication));
  }
}

// Singleton instance
const monitoringService = new MonitoringService();

module.exports = monitoringService;