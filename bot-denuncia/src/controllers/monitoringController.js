const monitoringService = require('../services/monitoringService');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class MonitoringController {
  /**
   * GET /api/admin/monitoring/status
   * Obter status completo do sistema de publicação
   */
  async getSystemStatus(req, res) {
    try {
      const status = await monitoringService.getPublicationSystemStatus();
      
      res.json({
        success: true,
        data: status,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Erro ao obter status do sistema:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message
      });
    }
  }

  /**
   * GET /api/admin/monitoring/metrics
   * Obter métricas detalhadas do sistema
   */
  async getMetrics(req, res) {
    try {
      const { timeframe = '24h' } = req.query;
      
      const [
        publicationMetrics,
        performanceMetrics,
        errorMetrics,
        queueMetrics
      ] = await Promise.all([
        this.getPublicationMetrics(timeframe),
        this.getPerformanceMetrics(timeframe),
        this.getErrorMetrics(timeframe),
        monitoringService.getQueueStatistics()
      ]);

      res.json({
        success: true,
        data: {
          publication: publicationMetrics,
          performance: performanceMetrics,
          errors: errorMetrics,
          queue: queueMetrics,
          timeframe
        },
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Erro ao obter métricas:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao carregar métricas',
        message: error.message
      });
    }
  }

  /**
   * GET /api/admin/monitoring/alerts
   * Obter alertas ativos do sistema
   */
  async getActiveAlerts(req, res) {
    try {
      const alerts = await this.generateSystemAlerts();
      
      res.json({
        success: true,
        data: {
          alerts,
          count: alerts.length,
          criticalCount: alerts.filter(a => a.severity === 'critical').length,
          warningCount: alerts.filter(a => a.severity === 'warning').length
        },
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Erro ao obter alertas:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao carregar alertas',
        message: error.message
      });
    }
  }

  /**
   * POST /api/admin/monitoring/publication/feedback
   * Gerar feedback inteligente para ação do usuário
   */
  async getPublicationFeedback(req, res) {
    try {
      const { action, denunciaId, result } = req.body;
      
      if (!action || !denunciaId) {
        return res.status(400).json({
          success: false,
          error: 'Parâmetros obrigatórios: action, denunciaId'
        });
      }

      const feedback = await monitoringService.generateUserFeedback(
        action,
        denunciaId,
        result || {}
      );

      res.json({
        success: true,
        data: feedback,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Erro ao gerar feedback:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao gerar feedback',
        message: error.message
      });
    }
  }

  /**
   * GET /api/admin/monitoring/publication/queue
   * Obter detalhes da fila de publicação
   */
  async getPublicationQueue(req, res) {
    try {
      const [queueStats, nextScheduled, dailyLimits] = await Promise.all([
        monitoringService.getQueueStatistics(),
        monitoringService.getNextScheduledPublication(),
        monitoringService.getDailyLimits()
      ]);

      // Obter itens na fila com detalhes
      const queueItems = await this.getQueueItemsDetails();

      res.json({
        success: true,
        data: {
          statistics: queueStats,
          nextScheduled,
          dailyLimits,
          items: queueItems,
          estimatedProcessingTime: this.calculateQueueProcessingTime(queueStats)
        },
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Erro ao obter fila de publicação:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao carregar fila de publicação',
        message: error.message
      });
    }
  }

  /**
   * GET /api/admin/monitoring/publication/history
   * Obter histórico de publicações
   */
  async getPublicationHistory(req, res) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        status, 
        timeframe = '7d' 
      } = req.query;

      const timeframeDays = parseInt(timeframe.replace('d', ''));
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - timeframeDays);

      const where = {
        updatedAt: {
          gte: startDate
        }
      };

      if (status) {
        where.status = status;
      }

      const [publications, total] = await Promise.all([
        prisma.denuncia.findMany({
          where,
          select: {
            protocolo: true,
            status: true,
            bairro: true,
            createdAt: true,
            updatedAt: true,
            publishedAt: true,
            motivoRejeicaoBot: true
          },
          orderBy: {
            updatedAt: 'desc'
          },
          skip: (page - 1) * limit,
          take: parseInt(limit)
        }),
        prisma.denuncia.count({ where })
      ]);

      // Adicionar métricas de performance para cada publicação
      const enrichedPublications = await Promise.all(
        publications.map(async (pub) => ({
          ...pub,
          processingTime: await this.calculateProcessingTime(pub),
          queueTime: await this.calculateQueueTime(pub)
        }))
      );

      res.json({
        success: true,
        data: {
          publications: enrichedPublications,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          },
          summary: await this.getPublicationSummary(where)
        },
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Erro ao obter histórico:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao carregar histórico',
        message: error.message
      });
    }
  }

  /**
   * GET /api/admin/monitoring/health
   * Verificação de saúde do sistema
   */
  async getSystemHealth(req, res) {
    try {
      const health = await monitoringService.getSystemHealthScore();
      const uptime = process.uptime();
      const memoryUsage = process.memoryUsage();

      // Verificações adicionais de saúde
      const checks = await this.performHealthChecks();

      res.json({
        success: true,
        data: {
          ...health,
          system: {
            uptime,
            memory: {
              used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
              total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
              external: Math.round(memoryUsage.external / 1024 / 1024)
            },
            checks
          }
        },
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Erro ao verificar saúde:', error);
      res.status(500).json({
        success: false,
        error: 'Erro na verificação de saúde',
        message: error.message
      });
    }
  }

  /**
   * POST /api/admin/monitoring/events/record
   * Registrar evento de monitoramento
   */
  async recordEvent(req, res) {
    try {
      const { denunciaId, event, metadata = {} } = req.body;
      
      if (!denunciaId || !event) {
        return res.status(400).json({
          success: false,
          error: 'Parâmetros obrigatórios: denunciaId, event'
        });
      }

      await monitoringService.recordPublicationEvent(
        denunciaId,
        event,
        {
          ...metadata,
          userAgent: req.get('User-Agent'),
          ip: req.ip,
          userId: req.user?.id
        }
      );

      res.json({
        success: true,
        message: 'Evento registrado com sucesso',
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Erro ao registrar evento:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao registrar evento',
        message: error.message
      });
    }
  }

  // Métodos auxiliares privados

  async getPublicationMetrics(timeframe) {
    const days = parseInt(timeframe.replace(/[^\d]/g, '')) || 1;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [
      totalPublications,
      successfulPublications,
      failedPublications,
      averageProcessingTime,
      publicationsByHour
    ] = await Promise.all([
      prisma.denuncia.count({
        where: {
          updatedAt: { gte: startDate },
          status: { in: ['PUBLICADA', 'ERRO'] }
        }
      }),
      prisma.denuncia.count({
        where: {
          updatedAt: { gte: startDate },
          status: 'PUBLICADA'
        }
      }),
      prisma.denuncia.count({
        where: {
          updatedAt: { gte: startDate },
          status: 'ERRO'
        }
      }),
      this.calculateAverageProcessingTime(startDate),
      this.getPublicationsByHour(startDate)
    ]);

    const successRate = totalPublications > 0 
      ? (successfulPublications / totalPublications) * 100 
      : 0;

    return {
      total: totalPublications,
      successful: successfulPublications,
      failed: failedPublications,
      successRate: Math.round(successRate * 100) / 100,
      averageProcessingTime,
      byHour: publicationsByHour
    };
  }

  async getPerformanceMetrics(timeframe) {
    return await monitoringService.getPerformanceMetrics();
  }

  async getErrorMetrics(timeframe) {
    return await monitoringService.getErrorStatistics();
  }

  async generateSystemAlerts() {
    const alerts = [];
    
    // Verificar saúde do sistema
    const health = await monitoringService.getSystemHealthScore();
    if (health.overall < 70) {
      alerts.push({
        id: 'system_health_low',
        type: 'system_health',
        severity: health.overall < 50 ? 'critical' : 'warning',
        title: 'Saúde do Sistema Baixa',
        message: `Score de saúde: ${health.overall}%`,
        timestamp: new Date(),
        details: health
      });
    }

    // Verificar fila de publicação
    const queueStats = await monitoringService.getQueueStatistics();
    if (queueStats.waiting > 50) {
      alerts.push({
        id: 'queue_backlog',
        type: 'queue',
        severity: queueStats.waiting > 100 ? 'critical' : 'warning',
        title: 'Fila de Publicação Congestionada',
        message: `${queueStats.waiting} itens aguardando processamento`,
        timestamp: new Date(),
        details: queueStats
      });
    }

    // Verificar taxa de erro
    const errorStats = await monitoringService.getErrorStatistics();
    if (errorStats.errorRate > 10) {
      alerts.push({
        id: 'high_error_rate',
        type: 'errors',
        severity: errorStats.errorRate > 20 ? 'critical' : 'warning',
        title: 'Taxa de Erro Elevada',
        message: `${errorStats.errorRate.toFixed(1)}% de falhas nas últimas 24h`,
        timestamp: new Date(),
        details: errorStats
      });
    }

    // Verificar limites diários
    const dailyLimits = await monitoringService.getDailyLimits();
    if (dailyLimits.percentage > 90) {
      alerts.push({
        id: 'daily_limit_near',
        type: 'limits',
        severity: dailyLimits.percentage > 95 ? 'critical' : 'warning',
        title: 'Limite Diário Próximo',
        message: `${dailyLimits.current}/${dailyLimits.maximum} publicações utilizadas`,
        timestamp: new Date(),
        details: dailyLimits
      });
    }

    return alerts;
  }

  async getQueueItemsDetails() {
    // Obter denúncias agendadas com detalhes
    const agendadas = await prisma.denuncia.findMany({
      where: {
        status: 'AGENDADA'
      },
      select: {
        protocolo: true,
        bairro: true,
        createdAt: true,
        status: true
      },
      orderBy: {
        createdAt: 'asc'
      },
      take: 20
    });

    return agendadas.map((item, index) => ({
      ...item,
      queuePosition: index + 1,
      estimatedProcessingTime: new Date(Date.now() + (index * 2 * 60 * 1000))
    }));
  }

  calculateQueueProcessingTime(queueStats) {
    const avgTimePerItem = 2 * 60 * 1000; // 2 minutos por item
    const totalTime = queueStats.waiting * avgTimePerItem;
    
    return {
      totalEstimatedTime: totalTime,
      completionTime: new Date(Date.now() + totalTime),
      averageTimePerItem: avgTimePerItem
    };
  }

  async calculateProcessingTime(publication) {
    if (!publication.publishedAt || !publication.createdAt) return null;
    
    return publication.publishedAt.getTime() - publication.createdAt.getTime();
  }

  async calculateQueueTime(publication) {
    // Implementar cálculo baseado em logs de fila
    return 0; // Placeholder
  }

  async getPublicationSummary(where) {
    const statusDistribution = await prisma.denuncia.groupBy({
      by: ['status'],
      where,
      _count: true
    });

    const total = statusDistribution.reduce((sum, item) => sum + item._count, 0);
    
    return {
      total,
      byStatus: statusDistribution,
      successRate: this.calculateSuccessRateFromDistribution(statusDistribution)
    };
  }

  calculateSuccessRateFromDistribution(distribution) {
    const total = distribution.reduce((sum, item) => sum + item._count, 0);
    const successful = distribution.find(item => item.status === 'PUBLICADA')?._count || 0;
    
    return total > 0 ? (successful / total) * 100 : 0;
  }

  async calculateAverageProcessingTime(startDate) {
    const publications = await prisma.denuncia.findMany({
      where: {
        status: 'PUBLICADA',
        publishedAt: { gte: startDate },
        createdAt: { not: null },
        publishedAt: { not: null }
      },
      select: {
        createdAt: true,
        publishedAt: true
      }
    });

    if (publications.length === 0) return 0;

    const totalTime = publications.reduce((sum, pub) => {
      return sum + (pub.publishedAt.getTime() - pub.createdAt.getTime());
    }, 0);

    return Math.round(totalTime / publications.length);
  }

  async getPublicationsByHour(startDate) {
    const publications = await prisma.denuncia.findMany({
      where: {
        publishedAt: { gte: startDate },
        status: 'PUBLICADA'
      },
      select: {
        publishedAt: true
      }
    });

    // Agrupar por hora
    const byHour = {};
    publications.forEach(pub => {
      const hour = pub.publishedAt.getHours();
      byHour[hour] = (byHour[hour] || 0) + 1;
    });

    return byHour;
  }

  async performHealthChecks() {
    const checks = {};
    
    try {
      // Verificar conexão com banco
      await prisma.$queryRaw`SELECT 1`;
      checks.database = { status: 'healthy', responseTime: Date.now() };
    } catch (error) {
      checks.database = { status: 'unhealthy', error: error.message };
    }

    try {
      // Verificar Redis
      const redis = require('ioredis');
      const client = new redis();
      await client.ping();
      checks.redis = { status: 'healthy', responseTime: Date.now() };
      client.disconnect();
    } catch (error) {
      checks.redis = { status: 'unhealthy', error: error.message };
    }

    return checks;
  }
}

module.exports = new MonitoringController();