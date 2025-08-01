const EventEmitter = require('events');
const nodemailer = require('nodemailer');
const { PrismaClient } = require('@prisma/client');
const loggerService = require('./loggerService');
const websocketService = require('./websocketService');

const prisma = new PrismaClient();

class AlertService extends EventEmitter {
  constructor() {
    super();
    this.alertRules = new Map();
    this.activeAlerts = new Map();
    this.suppressedAlerts = new Set();
    this.emailTransporter = null;
    
    this.initializeEmailTransporter();
    this.loadAlertRules();
    this.startPeriodicChecks();
  }

  /**
   * Inicializar transportador de email
   */
  initializeEmailTransporter() {
    if (process.env.SMTP_HOST) {
      this.emailTransporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD
        }
      });

      // Verificar conexão
      this.emailTransporter.verify((error, success) => {
        if (error) {
          loggerService.error('Erro na configuração do email', error);
        } else {
          loggerService.info('Transportador de email configurado com sucesso');
        }
      });
    } else {
      loggerService.warn('Configuração de email não encontrada - alertas por email desabilitados');
    }
  }

  /**
   * Carregar regras de alerta
   */
  loadAlertRules() {
    // Regras de alerta padrão
    this.addAlertRule('high_error_rate', {
      name: 'Taxa de Erro Elevada',
      description: 'Taxa de erro nas publicações acima do limite',
      condition: async () => {
        const errorRate = await this.calculateErrorRate();
        return errorRate > 20; // 20%
      },
      severity: 'critical',
      cooldown: 15 * 60 * 1000, // 15 minutos
      channels: ['email', 'websocket', 'database']
    });

    this.addAlertRule('queue_backlog', {
      name: 'Fila Congestionada',
      description: 'Muitos itens aguardando na fila de publicação',
      condition: async () => {
        const queueSize = await this.getQueueSize();
        return queueSize > 50;
      },
      severity: 'warning',
      cooldown: 30 * 60 * 1000, // 30 minutos
      channels: ['websocket', 'database']
    });

    this.addAlertRule('daily_limit_exceeded', {
      name: 'Limite Diário Excedido',
      description: 'Limite diário de publicações foi excedido',
      condition: async () => {
        const usage = await this.getDailyUsage();
        return usage.percentage > 100;
      },
      severity: 'critical',
      cooldown: 60 * 60 * 1000, // 1 hora
      channels: ['email', 'websocket', 'database']
    });

    this.addAlertRule('system_health_low', {
      name: 'Saúde do Sistema Baixa',
      description: 'Score de saúde do sistema está abaixo do aceitável',
      condition: async () => {
        const health = await this.getSystemHealth();
        return health.overall < 50;
      },
      severity: 'critical',
      cooldown: 10 * 60 * 1000, // 10 minutos
      channels: ['email', 'websocket', 'database']
    });

    this.addAlertRule('publication_failure_spike', {
      name: 'Pico de Falhas de Publicação',
      description: 'Muitas falhas de publicação em curto período',
      condition: async () => {
        const failures = await this.getRecentFailures(15); // Últimos 15 minutos
        return failures > 5;
      },
      severity: 'warning',
      cooldown: 30 * 60 * 1000, // 30 minutos
      channels: ['websocket', 'database']
    });

    this.addAlertRule('database_connection_issue', {
      name: 'Problemas de Conexão com Banco',
      description: 'Detectados problemas na conexão com o banco de dados',
      condition: async () => {
        try {
          await prisma.$queryRaw`SELECT 1`;
          return false;
        } catch (error) {
          return true;
        }
      },
      severity: 'critical',
      cooldown: 5 * 60 * 1000, // 5 minutos
      channels: ['email', 'websocket']
    });

    this.addAlertRule('redis_connection_issue', {
      name: 'Problemas de Conexão com Redis',
      description: 'Detectados problemas na conexão com Redis',
      condition: async () => {
        try {
          const Redis = require('ioredis');
          const redis = new Redis({
            host: process.env.REDIS_HOST || 'localhost',
            port: process.env.REDIS_PORT || 6379
          });
          await redis.ping();
          redis.disconnect();
          return false;
        } catch (error) {
          return true;
        }
      },
      severity: 'critical',
      cooldown: 5 * 60 * 1000, // 5 minutos
      channels: ['email', 'websocket']
    });

    loggerService.info(`${this.alertRules.size} regras de alerta carregadas`);
  }

  /**
   * Adicionar regra de alerta
   */
  addAlertRule(id, rule) {
    this.alertRules.set(id, {
      id,
      ...rule,
      lastTriggered: null,
      triggerCount: 0
    });
  }

  /**
   * Remover regra de alerta
   */
  removeAlertRule(id) {
    this.alertRules.delete(id);
    this.activeAlerts.delete(id);
  }

  /**
   * Verificar todas as regras de alerta
   */
  async checkAllRules() {
    const results = [];
    
    for (const [id, rule] of this.alertRules) {
      try {
        if (this.suppressedAlerts.has(id)) {
          continue;
        }

        const shouldTrigger = await rule.condition();
        
        if (shouldTrigger) {
          const alert = await this.triggerAlert(id, rule);
          if (alert) {
            results.push(alert);
          }
        } else {
          // Resolver alerta se não está mais ativo
          await this.resolveAlert(id);
        }
      } catch (error) {
        loggerService.error(`Erro ao verificar regra de alerta ${id}`, error);
      }
    }
    
    return results;
  }

  /**
   * Disparar alerta
   */
  async triggerAlert(ruleId, rule) {
    const now = Date.now();
    
    // Verificar cooldown
    if (rule.lastTriggered && (now - rule.lastTriggered) < rule.cooldown) {
      return null;
    }

    const alert = {
      id: `${ruleId}-${now}`,
      ruleId,
      name: rule.name,
      description: rule.description,
      severity: rule.severity,
      timestamp: new Date(),
      status: 'active',
      metadata: await this.gatherAlertMetadata(ruleId)
    };

    // Atualizar regra
    rule.lastTriggered = now;
    rule.triggerCount++;

    // Armazenar alerta ativo
    this.activeAlerts.set(ruleId, alert);

    // Enviar notificações
    await this.sendAlertNotifications(alert, rule.channels);

    // Emitir evento
    this.emit('alert_triggered', alert);

    loggerService.logSecurity(`Alerta disparado: ${alert.name}`, 'warn', {
      alertId: alert.id,
      ruleId,
      severity: alert.severity
    });

    return alert;
  }

  /**
   * Resolver alerta
   */
  async resolveAlert(ruleId) {
    const alert = this.activeAlerts.get(ruleId);
    
    if (alert && alert.status === 'active') {
      alert.status = 'resolved';
      alert.resolvedAt = new Date();
      
      // Notificar resolução
      await this.sendAlertResolution(alert);
      
      // Remover da lista de ativos
      this.activeAlerts.delete(ruleId);
      
      // Emitir evento
      this.emit('alert_resolved', alert);
      
      loggerService.info(`Alerta resolvido: ${alert.name}`, {
        alertId: alert.id,
        ruleId
      });
    }
  }

  /**
   * Enviar notificações de alerta
   */
  async sendAlertNotifications(alert, channels) {
    const notifications = [];

    for (const channel of channels) {
      try {
        switch (channel) {
          case 'email':
            if (this.emailTransporter) {
              const emailResult = await this.sendEmailAlert(alert);
              notifications.push({ channel: 'email', success: emailResult });
            }
            break;

          case 'websocket':
            this.sendWebSocketAlert(alert);
            notifications.push({ channel: 'websocket', success: true });
            break;

          case 'database':
            await this.saveAlertToDatabase(alert);
            notifications.push({ channel: 'database', success: true });
            break;

          case 'webhook':
            const webhookResult = await this.sendWebhookAlert(alert);
            notifications.push({ channel: 'webhook', success: webhookResult });
            break;
        }
      } catch (error) {
        loggerService.error(`Erro ao enviar alerta via ${channel}`, error);
        notifications.push({ channel, success: false, error: error.message });
      }
    }

    return notifications;
  }

  /**
   * Enviar alerta por email
   */
  async sendEmailAlert(alert) {
    if (!this.emailTransporter) return false;

    const adminEmails = await this.getAdminEmails();
    if (adminEmails.length === 0) return false;

    const subject = `[${alert.severity.toUpperCase()}] ${alert.name}`;
    const html = this.generateEmailTemplate(alert);

    try {
      await this.emailTransporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@bot-denuncia.com',
        to: adminEmails.join(', '),
        subject,
        html
      });

      return true;
    } catch (error) {
      loggerService.error('Erro ao enviar email de alerta', error);
      return false;
    }
  }

  /**
   * Enviar alerta via WebSocket
   */
  sendWebSocketAlert(alert) {
    websocketService.broadcast({
      type: 'system_alert',
      data: alert
    });
  }

  /**
   * Salvar alerta no banco de dados
   */
  async saveAlertToDatabase(alert) {
    try {
      await prisma.systemAlert.create({
        data: {
          alertId: alert.id,
          ruleId: alert.ruleId,
          name: alert.name,
          description: alert.description,
          severity: alert.severity.toUpperCase(),
          status: alert.status.toUpperCase(),
          metadata: JSON.stringify(alert.metadata),
          timestamp: alert.timestamp
        }
      });
    } catch (error) {
      loggerService.error('Erro ao salvar alerta no banco', error);
      throw error;
    }
  }

  /**
   * Enviar alerta via webhook
   */
  async sendWebhookAlert(alert) {
    const webhookUrl = process.env.ALERT_WEBHOOK_URL;
    if (!webhookUrl) return false;

    try {
      const fetch = require('node-fetch');
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Bot-Denuncia-AlertService/1.0'
        },
        body: JSON.stringify({
          type: 'alert',
          alert,
          timestamp: new Date().toISOString()
        })
      });

      return response.ok;
    } catch (error) {
      loggerService.error('Erro ao enviar webhook de alerta', error);
      return false;
    }
  }

  /**
   * Iniciar verificações periódicas
   */
  startPeriodicChecks() {
    // Verificar alertas a cada 2 minutos
    setInterval(async () => {
      try {
        await this.checkAllRules();
      } catch (error) {
        loggerService.error('Erro na verificação periódica de alertas', error);
      }
    }, 2 * 60 * 1000);

    loggerService.info('Verificações periódicas de alertas iniciadas');
  }

  /**
   * Suprimir alerta temporariamente
   */
  suppressAlert(ruleId, duration = 60 * 60 * 1000) { // 1 hora por padrão
    this.suppressedAlerts.add(ruleId);
    
    setTimeout(() => {
      this.suppressedAlerts.delete(ruleId);
      loggerService.info(`Supressão do alerta ${ruleId} removida`);
    }, duration);

    loggerService.info(`Alerta ${ruleId} suprimido por ${duration / 1000 / 60} minutos`);
  }

  /**
   * Obter alertas ativos
   */
  getActiveAlerts() {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Obter estatísticas de alertas
   */
  getAlertStats() {
    const active = Array.from(this.activeAlerts.values());
    const byStatus = active.reduce((acc, alert) => {
      acc[alert.status] = (acc[alert.status] || 0) + 1;
      return acc;
    }, {});
    const bySeverity = active.reduce((acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1;
      return acc;
    }, {});

    return {
      total: active.length,
      byStatus,
      bySeverity,
      suppressed: this.suppressedAlerts.size,
      rules: this.alertRules.size
    };
  }

  // Métodos auxiliares para condições de alerta

  async calculateErrorRate() {
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const [total, failures] = await Promise.all([
      prisma.denuncia.count({
        where: {
          updatedAt: { gte: last24h },
          status: { in: ['PUBLICADA', 'ERRO'] }
        }
      }),
      prisma.denuncia.count({
        where: {
          updatedAt: { gte: last24h },
          status: 'ERRO'
        }
      })
    ]);

    return total > 0 ? (failures / total) * 100 : 0;
  }

  async getQueueSize() {
    try {
      const Redis = require('ioredis');
      const redis = new Redis();
      const waiting = await redis.llen('bull:publishInstagram:waiting');
      redis.disconnect();
      return waiting;
    } catch (error) {
      return 0;
    }
  }

  async getDailyUsage() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const published = await prisma.denuncia.count({
      where: {
        status: 'PUBLICADA',
        publishedAt: { gte: today }
      }
    });

    const limit = parseInt(process.env.DAILY_PUBLICATION_LIMIT) || 100;
    
    return {
      current: published,
      limit,
      percentage: (published / limit) * 100
    };
  }

  async getSystemHealth() {
    // Implementar cálculo de saúde do sistema
    return { overall: 75 }; // Placeholder
  }

  async getRecentFailures(minutes) {
    const since = new Date(Date.now() - minutes * 60 * 1000);
    
    return await prisma.denuncia.count({
      where: {
        status: 'ERRO',
        updatedAt: { gte: since }
      }
    });
  }

  async gatherAlertMetadata(ruleId) {
    const metadata = {
      ruleId,
      timestamp: new Date().toISOString(),
      systemInfo: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
      }
    };

    // Adicionar metadados específicos por tipo de alerta
    switch (ruleId) {
      case 'high_error_rate':
        metadata.errorRate = await this.calculateErrorRate();
        break;
      case 'queue_backlog':
        metadata.queueSize = await this.getQueueSize();
        break;
      case 'daily_limit_exceeded':
        metadata.dailyUsage = await this.getDailyUsage();
        break;
    }

    return metadata;
  }

  async getAdminEmails() {
    try {
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { email: true }
      });
      return admins.map(admin => admin.email).filter(Boolean);
    } catch (error) {
      return [];
    }
  }

  generateEmailTemplate(alert) {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: ${this.getSeverityColor(alert.severity)}; color: white; padding: 20px; border-radius: 5px 5px 0 0;">
              <h1 style="margin: 0; font-size: 24px;">${alert.name}</h1>
              <p style="margin: 5px 0 0 0; opacity: 0.9;">Severidade: ${alert.severity.toUpperCase()}</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; border: 1px solid #dee2e6; border-top: none;">
              <h2 style="color: #495057; margin-top: 0;">Descrição</h2>
              <p>${alert.description}</p>
              
              <h2 style="color: #495057;">Detalhes</h2>
              <ul>
                <li><strong>Horário:</strong> ${alert.timestamp.toLocaleString('pt-BR')}</li>
                <li><strong>ID do Alerta:</strong> ${alert.id}</li>
                <li><strong>Regra:</strong> ${alert.ruleId}</li>
              </ul>
              
              ${alert.metadata ? `
                <h2 style="color: #495057;">Informações Adicionais</h2>
                <pre style="background: white; padding: 15px; border-radius: 3px; overflow-x: auto; font-size: 12px;">${JSON.stringify(alert.metadata, null, 2)}</pre>
              ` : ''}
            </div>
            
            <div style="background: #e9ecef; padding: 15px; border-radius: 0 0 5px 5px; text-align: center; font-size: 12px; color: #6c757d;">
              Este é um alerta automático do Sistema Bot Denúncias
            </div>
          </div>
        </body>
      </html>
    `;
  }

  getSeverityColor(severity) {
    switch (severity) {
      case 'critical': return '#dc3545';
      case 'warning': return '#ffc107';
      case 'info': return '#17a2b8';
      default: return '#6c757d';
    }
  }

  async sendAlertResolution(alert) {
    // Notificar via WebSocket sobre resolução
    websocketService.broadcast({
      type: 'alert_resolved',
      data: alert
    });

    // Atualizar no banco se existir
    try {
      await prisma.systemAlert.updateMany({
        where: { alertId: alert.id },
        data: {
          status: 'RESOLVED',
          resolvedAt: alert.resolvedAt
        }
      });
    } catch (error) {
      loggerService.error('Erro ao atualizar resolução no banco', error);
    }
  }
}

// Criar instância singleton
const alertService = new AlertService();

module.exports = alertService;