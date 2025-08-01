/**
 * ADMIN ALERT SYSTEM - Sistema de Alertas para Administradores
 * 
 * Sistema avançado de alertas com:
 * - Múltiplos canais de notificação (email, webhook, dashboard)
 * - Classificação inteligente de severidade
 * - Agregação e correlação de alertas
 * - Prevenção de spam de notificações
 * - Dashboard em tempo real
 * - Histórico completo de incidentes
 * - Escalação automática
 * 
 * @author Alert Management Engineer
 * @priority CRITICAL - Administrative Oversight
 */

const EventEmitter = require('events');
const nodemailer = require('nodemailer');
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

/**
 * INTELLIGENT ALERT MANAGER - Gerenciador Inteligente de Alertas
 */
class IntelligentAlertManager extends EventEmitter {
    constructor() {
        super();
        
        this.prisma = new PrismaClient();
        this.isRunning = false;
        
        // Configurações do sistema de alertas
        this.config = {
            // Canais de notificação
            enableEmailAlerts: process.env.ENABLE_EMAIL_ALERTS === 'true',
            enableWebhookAlerts: process.env.ENABLE_WEBHOOK_ALERTS === 'true',
            enableDashboardAlerts: true,
            enableSmsAlerts: process.env.ENABLE_SMS_ALERTS === 'true',
            
            // Configurações de rate limiting
            alertCooldown: 300000,           // 5 minutos entre alertas similares
            maxAlertsPerHour: 20,            // Máximo de alertas por hora
            escalationThreshold: 5,          // Alertas para escalação
            escalationTimeWindow: 900000,    // 15 minutos para escalação
            
            // Configurações de agregação
            enableAlertAggregation: true,
            aggregationWindow: 600000,       // 10 minutos
            maxAggregatedAlerts: 10,
            
            // Configurações de severidade
            severityLevels: {
                info: { priority: 1, color: '#17a2b8', escalate: false },
                warning: { priority: 2, color: '#ffc107', escalate: false },
                error: { priority: 3, color: '#fd7e14', escalate: true },
                critical: { priority: 4, color: '#dc3545', escalate: true },
                emergency: { priority: 5, color: '#6f42c1', escalate: true }
            }
        };

        // Estado dos alertas
        this.alertState = {
            activeAlerts: new Map(),
            alertHistory: [],
            cooldowns: new Map(),
            hourlyCount: 0,
            lastHourReset: Date.now(),
            aggregatedAlerts: new Map(),
            escalatedAlerts: new Set()
        };

        // Configurações de notificação
        this.notificationChannels = {
            email: null,
            webhook: null,
            sms: null
        };

        // Administradores e configurações de contato
        this.administrators = new Map();
        
        this.initializeAlertSystem();
    }

    /**
     * Inicializar sistema de alertas
     */
    async initializeAlertSystem() {
        try {
            logger.info('[ALERTS] Initializing Admin Alert System...');
            
            // Configurar canais de notificação
            await this.setupNotificationChannels();
            
            // Carregar configurações de administradores
            await this.loadAdministrators();
            
            // Configurar limpeza periódica
            setInterval(() => this.cleanupOldAlerts(), 3600000); // 1 hora
            setInterval(() => this.resetHourlyCounter(), 3600000); // 1 hora
            setInterval(() => this.processAggregatedAlerts(), this.config.aggregationWindow);
            
            this.isRunning = true;
            
            this.emit('alertSystemInitialized');
            logger.info('[ALERTS] Admin Alert System initialized successfully');
            
        } catch (error) {
            logger.error('[ALERTS] Failed to initialize alert system:', error);
            throw error;
        }
    }

    /**
     * Configurar canais de notificação
     */
    async setupNotificationChannels() {
        // Configurar email
        if (this.config.enableEmailAlerts) {
            try {
                this.notificationChannels.email = nodemailer.createTransporter({
                    host: process.env.SMTP_HOST || 'localhost',
                    port: process.env.SMTP_PORT || 587,
                    secure: process.env.SMTP_SECURE === 'true',
                    auth: {
                        user: process.env.SMTP_USER,
                        pass: process.env.SMTP_PASS
                    }
                });
                
                // Testar conexão
                await this.notificationChannels.email.verify();
                logger.info('[ALERTS] Email notifications configured successfully');
                
            } catch (error) {
                logger.warn('[ALERTS] Failed to configure email notifications:', error.message);
                this.config.enableEmailAlerts = false;
            }
        }

        // Configurar webhook
        if (this.config.enableWebhookAlerts && process.env.WEBHOOK_URL) {
            this.notificationChannels.webhook = {
                url: process.env.WEBHOOK_URL,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': process.env.WEBHOOK_TOKEN ? `Bearer ${process.env.WEBHOOK_TOKEN}` : undefined
                }
            };
            logger.info('[ALERTS] Webhook notifications configured successfully');
        }

        // Configurar SMS (placeholder - integração com serviço SMS)
        if (this.config.enableSmsAlerts && process.env.SMS_API_KEY) {
            this.notificationChannels.sms = {
                apiKey: process.env.SMS_API_KEY,
                apiUrl: process.env.SMS_API_URL || 'https://api.sms-service.com/send'
            };
            logger.info('[ALERTS] SMS notifications configured successfully');
        }
    }

    /**
     * Carregar administradores
     */
    async loadAdministrators() {
        try {
            // Carregar de variáveis de ambiente ou banco de dados
            const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').filter(email => email.trim());
            const adminPhones = (process.env.ADMIN_PHONES || '').split(',').filter(phone => phone.trim());
            const adminWebhooks = (process.env.ADMIN_WEBHOOKS || '').split(',').filter(webhook => webhook.trim());

            // Administrador padrão
            if (adminEmails.length === 0) {
                adminEmails.push('admin@bot-denuncia.local');
            }

            adminEmails.forEach((email, index) => {
                this.administrators.set(`admin_${index}`, {
                    id: `admin_${index}`,
                    name: `Administrator ${index + 1}`,
                    email: email.trim(),
                    phone: adminPhones[index]?.trim(),
                    webhook: adminWebhooks[index]?.trim(),
                    severity: ['warning', 'error', 'critical', 'emergency'],
                    enabled: true,
                    lastNotified: null
                });
            });

            logger.info(`[ALERTS] Loaded ${this.administrators.size} administrators`);
            
        } catch (error) {
            logger.error('[ALERTS] Failed to load administrators:', error);
            
            // Configuração de fallback
            this.administrators.set('fallback_admin', {
                id: 'fallback_admin',
                name: 'Fallback Administrator',
                email: 'admin@localhost',
                phone: null,
                webhook: null,
                severity: ['critical', 'emergency'],
                enabled: true,
                lastNotified: null
            });
        }
    }

    /**
     * Enviar alerta
     */
    async sendAlert(alertData) {
        try {
            const alertId = this.generateAlertId(alertData);
            const timestamp = Date.now();
            
            // Verificar rate limiting
            if (!this.checkRateLimit(alertData.type, alertData.severity)) {
                logger.warn(`[ALERTS] Alert rate limited: ${alertId}`);
                return { success: false, reason: 'rate_limited' };
            }

            // Normalizar dados do alerta
            const alert = this.normalizeAlert(alertData, alertId, timestamp);
            
            // Verificar se deve ser agregado
            if (this.config.enableAlertAggregation && this.shouldAggregateAlert(alert)) {
                this.addToAggregation(alert);
                return { success: true, reason: 'aggregated', alertId };
            }

            // Processar alerta imediatamente
            const result = await this.processAlert(alert);
            
            // Salvar no histórico
            this.saveAlertToHistory(alert, result);
            
            // Verificar escalação
            if (this.shouldEscalate(alert)) {
                await this.escalateAlert(alert);
            }

            logger.info(`[ALERTS] Alert ${alertId} processed successfully`);
            
            return { success: true, alertId, result };

        } catch (error) {
            logger.error('[ALERTS] Failed to send alert:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Verificar rate limiting
     */
    checkRateLimit(type, severity) {
        const now = Date.now();
        
        // Reset contador horário se necessário
        if (now - this.alertState.lastHourReset > 3600000) {
            this.alertState.hourlyCount = 0;
            this.alertState.lastHourReset = now;
        }

        // Verificar limite horário
        if (this.alertState.hourlyCount >= this.config.maxAlertsPerHour) {
            return false;
        }

        // Verificar cooldown para tipo específico
        const cooldownKey = `${type}_${severity}`;
        const lastAlert = this.alertState.cooldowns.get(cooldownKey);
        
        if (lastAlert && (now - lastAlert) < this.config.alertCooldown) {
            return false;
        }

        // Atualizar contadores
        this.alertState.hourlyCount++;
        this.alertState.cooldowns.set(cooldownKey, now);
        
        return true;
    }

    /**
     * Normalizar dados do alerta
     */
    normalizeAlert(alertData, alertId, timestamp) {
        return {
            id: alertId,
            timestamp,
            type: alertData.type || 'unknown',
            severity: alertData.severity || 'info',
            title: alertData.title || 'System Alert',
            message: alertData.message || 'No message provided',
            source: alertData.source || 'system',
            component: alertData.component || 'unknown',
            metadata: alertData.metadata || {},
            actions: alertData.actions || [],
            tags: alertData.tags || [],
            priority: this.config.severityLevels[alertData.severity]?.priority || 1,
            color: this.config.severityLevels[alertData.severity]?.color || '#6c757d'
        };
    }

    /**
     * Verificar se alerta deve ser agregado
     */
    shouldAggregateAlert(alert) {
        // Agregar apenas alertas de baixa prioridade
        return alert.priority <= 2 && alert.type !== 'critical_system_failure';
    }

    /**
     * Adicionar à agregação
     */
    addToAggregation(alert) {
        const aggregationKey = `${alert.type}_${alert.component}`;
        
        if (!this.alertState.aggregatedAlerts.has(aggregationKey)) {
            this.alertState.aggregatedAlerts.set(aggregationKey, {
                key: aggregationKey,
                type: alert.type,
                component: alert.component,
                severity: alert.severity,
                count: 0,
                firstAlert: alert.timestamp,
                lastAlert: alert.timestamp,
                alerts: []
            });
        }

        const aggregation = this.alertState.aggregatedAlerts.get(aggregationKey);
        aggregation.count++;
        aggregation.lastAlert = alert.timestamp;
        aggregation.alerts.push(alert);

        // Manter apenas os últimos alertas
        if (aggregation.alerts.length > this.config.maxAggregatedAlerts) {
            aggregation.alerts.shift();
        }

        // Atualizar severidade se necessário
        if (alert.priority > this.config.severityLevels[aggregation.severity].priority) {
            aggregation.severity = alert.severity;
        }
    }

    /**
     * Processar alerta
     */
    async processAlert(alert) {
        const result = {
            notificationsSent: 0,
            channels: [],
            errors: []
        };

        // Determinar administradores que devem receber o alerta
        const targetAdmins = this.getTargetAdministrators(alert);

        // Enviar para cada canal de notificação
        for (const admin of targetAdmins) {
            // Email
            if (this.config.enableEmailAlerts && admin.email) {
                try {
                    await this.sendEmailNotification(admin, alert);
                    result.notificationsSent++;
                    result.channels.push(`email:${admin.email}`);
                } catch (error) {
                    result.errors.push(`Email to ${admin.email}: ${error.message}`);
                }
            }

            // Webhook pessoal do admin
            if (admin.webhook) {
                try {
                    await this.sendWebhookNotification(admin.webhook, alert);
                    result.notificationsSent++;
                    result.channels.push(`webhook:${admin.id}`);
                } catch (error) {
                    result.errors.push(`Webhook for ${admin.id}: ${error.message}`);
                }
            }

            // SMS
            if (this.config.enableSmsAlerts && admin.phone && alert.priority >= 4) {
                try {
                    await this.sendSmsNotification(admin, alert);
                    result.notificationsSent++;
                    result.channels.push(`sms:${admin.phone}`);
                } catch (error) {
                    result.errors.push(`SMS to ${admin.phone}: ${error.message}`);
                }
            }

            // Atualizar timestamp de última notificação
            admin.lastNotified = alert.timestamp;
        }

        // Webhook global
        if (this.config.enableWebhookAlerts && this.notificationChannels.webhook) {
            try {
                await this.sendWebhookNotification(this.notificationChannels.webhook.url, alert);
                result.notificationsSent++;
                result.channels.push('webhook:global');
            } catch (error) {
                result.errors.push(`Global webhook: ${error.message}`);
            }
        }

        // Dashboard em tempo real
        this.broadcastToDashboard(alert);

        // Adicionar à lista de alertas ativos
        this.alertState.activeAlerts.set(alert.id, alert);

        return result;
    }

    /**
     * Obter administradores alvo
     */
    getTargetAdministrators(alert) {
        return Array.from(this.administrators.values()).filter(admin => 
            admin.enabled && admin.severity.includes(alert.severity)
        );
    }

    /**
     * Enviar notificação por email
     */
    async sendEmailNotification(admin, alert) {
        if (!this.notificationChannels.email) {
            throw new Error('Email transporter not configured');
        }

        const subject = `[${alert.severity.toUpperCase()}] ${alert.title}`;
        const html = this.generateEmailTemplate(alert);

        const mailOptions = {
            from: process.env.SMTP_FROM || 'Bot Denúncia <noreply@bot-denuncia.local>',
            to: admin.email,
            subject,
            html,
            priority: alert.priority >= 4 ? 'high' : 'normal'
        };

        await this.notificationChannels.email.sendMail(mailOptions);
    }

    /**
     * Gerar template de email
     */
    generateEmailTemplate(alert) {
        const formatTime = (timestamp) => new Date(timestamp).toLocaleString('pt-BR');
        
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: ${alert.color}; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .severity { display: inline-block; padding: 4px 12px; border-radius: 4px; font-weight: bold; color: white; background: ${alert.color}; }
        .metadata { background: #f8f9fa; padding: 15px; border-radius: 4px; margin: 15px 0; }
        .actions { margin-top: 20px; }
        .action-button { display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; margin-right: 10px; }
        .footer { background: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #6c757d; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚨 Bot Denúncia Alert</h1>
            <p>Sistema de Monitoramento</p>
        </div>
        
        <div class="content">
            <h2>${alert.title}</h2>
            <p><span class="severity">${alert.severity.toUpperCase()}</span></p>
            
            <div class="metadata">
                <p><strong>Tipo:</strong> ${alert.type}</p>
                <p><strong>Componente:</strong> ${alert.component}</p>
                <p><strong>Origem:</strong> ${alert.source}</p>
                <p><strong>Horário:</strong> ${formatTime(alert.timestamp)}</p>
                <p><strong>ID:</strong> ${alert.id}</p>
            </div>
            
            <h3>Detalhes</h3>
            <p>${alert.message}</p>
            
            ${alert.metadata && Object.keys(alert.metadata).length > 0 ? `
            <h3>Informações Adicionais</h3>
            <div class="metadata">
                ${Object.entries(alert.metadata).map(([key, value]) => 
                    `<p><strong>${key}:</strong> ${typeof value === 'object' ? JSON.stringify(value) : value}</p>`
                ).join('')}
            </div>
            ` : ''}
            
            ${alert.actions && alert.actions.length > 0 ? `
            <div class="actions">
                <h3>Ações Recomendadas</h3>
                ${alert.actions.map(action => `
                    <a href="${action.url || '#'}" class="action-button">${action.label}</a>
                `).join('')}
            </div>
            ` : ''}
        </div>
        
        <div class="footer">
            <p>Bot Denúncia - Sistema de Monitoramento Automatizado</p>
            <p>Este é um alerta automático. Não responda a este email.</p>
        </div>
    </div>
</body>
</html>`;
    }

    /**
     * Enviar notificação por webhook
     */
    async sendWebhookNotification(webhookUrl, alert) {
        const payload = {
            timestamp: new Date(alert.timestamp).toISOString(),
            alert_id: alert.id,
            severity: alert.severity,
            type: alert.type,
            title: alert.title,
            message: alert.message,
            source: alert.source,
            component: alert.component,
            metadata: alert.metadata,
            actions: alert.actions,
            tags: alert.tags
        };

        const config = {
            timeout: 5000,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Bot-Denuncia-Alert-System/1.0'
            }
        };

        if (this.notificationChannels.webhook?.headers) {
            Object.assign(config.headers, this.notificationChannels.webhook.headers);
        }

        await axios.post(webhookUrl, payload, config);
    }

    /**
     * Enviar notificação por SMS
     */
    async sendSmsNotification(admin, alert) {
        if (!this.notificationChannels.sms) {
            throw new Error('SMS service not configured');
        }

        const message = `[${alert.severity.toUpperCase()}] Bot Denúncia: ${alert.title}. ${alert.message.substring(0, 100)}${alert.message.length > 100 ? '...' : ''}`;

        const payload = {
            to: admin.phone,
            message,
            from: 'Bot-Denuncia'
        };

        await axios.post(this.notificationChannels.sms.apiUrl, payload, {
            headers: {
                'Authorization': `Bearer ${this.notificationChannels.sms.apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 5000
        });
    }

    /**
     * Transmitir para dashboard
     */
    broadcastToDashboard(alert) {
        // Emitir evento para ser capturado pelo dashboard em tempo real
        this.emit('dashboardAlert', {
            alert,
            activeAlerts: this.alertState.activeAlerts.size,
            timestamp: Date.now()
        });
    }

    /**
     * Verificar se deve escalar
     */
    shouldEscalate(alert) {
        if (!this.config.severityLevels[alert.severity].escalate) {
            return false;
        }

        // Verificar quantidade de alertas similares em janela de tempo
        const now = Date.now();
        const windowStart = now - this.config.escalationTimeWindow;
        
        const recentSimilarAlerts = this.alertState.alertHistory.filter(historyAlert => 
            historyAlert.timestamp > windowStart &&
            historyAlert.type === alert.type &&
            historyAlert.component === alert.component
        );

        return recentSimilarAlerts.length >= this.config.escalationThreshold;
    }

    /**
     * Escalar alerta
     */
    async escalateAlert(alert) {
        if (this.alertState.escalatedAlerts.has(alert.id)) {
            return; // Já escalado
        }

        logger.warn(`[ALERTS] Escalating alert ${alert.id}`);

        const escalatedAlert = {
            ...alert,
            severity: 'emergency',
            title: `ESCALATED: ${alert.title}`,
            message: `This alert has been escalated due to repeated occurrences. Original: ${alert.message}`,
            escalated: true,
            escalationReason: 'Repeated occurrences in time window',
            originalSeverity: alert.severity
        };

        // Marcar como escalado
        this.alertState.escalatedAlerts.add(alert.id);

        // Processar como alerta de emergência
        await this.processAlert(escalatedAlert);

        this.emit('alertEscalated', {
            originalAlert: alert,
            escalatedAlert,
            timestamp: Date.now()
        });
    }

    /**
     * Processar alertas agregados
     */
    async processAggregatedAlerts() {
        const now = Date.now();
        
        for (const [key, aggregation] of this.alertState.aggregatedAlerts.entries()) {
            // Verificar se é hora de enviar agregação
            if (now - aggregation.firstAlert >= this.config.aggregationWindow) {
                await this.sendAggregatedAlert(aggregation);
                this.alertState.aggregatedAlerts.delete(key);
            }
        }
    }

    /**
     * Enviar alerta agregado
     */
    async sendAggregatedAlert(aggregation) {
        const aggregatedAlert = {
            id: `agg_${aggregation.key}_${aggregation.firstAlert}`,
            timestamp: Date.now(),
            type: 'aggregated_alert',
            severity: aggregation.severity,
            title: `Multiple ${aggregation.type} alerts (${aggregation.count})`,
            message: `${aggregation.count} similar alerts occurred between ${new Date(aggregation.firstAlert).toLocaleString()} and ${new Date(aggregation.lastAlert).toLocaleString()}`,
            source: 'alert_aggregator',
            component: aggregation.component,
            metadata: {
                aggregationType: aggregation.type,
                alertCount: aggregation.count,
                timeSpan: aggregation.lastAlert - aggregation.firstAlert,
                firstAlert: aggregation.firstAlert,
                lastAlert: aggregation.lastAlert,
                sampleAlerts: aggregation.alerts.slice(0, 3).map(a => ({
                    id: a.id,
                    timestamp: a.timestamp,
                    message: a.message
                }))
            },
            priority: this.config.severityLevels[aggregation.severity]?.priority || 1,
            color: this.config.severityLevels[aggregation.severity]?.color || '#6c757d'
        };

        await this.processAlert(aggregatedAlert);
    }

    /**
     * Salvar alerta no histórico
     */
    saveAlertToHistory(alert, result) {
        this.alertState.alertHistory.push({
            ...alert,
            result,
            processed: true
        });

        // Manter apenas últimas 1000 entradas
        if (this.alertState.alertHistory.length > 1000) {
            this.alertState.alertHistory.shift();
        }
    }

    /**
     * Limpar alertas antigos
     */
    cleanupOldAlerts() {
        const now = Date.now();
        const maxAge = 24 * 3600000; // 24 horas

        // Limpar alertas ativos antigos
        for (const [id, alert] of this.alertState.activeAlerts.entries()) {
            if (now - alert.timestamp > maxAge) {
                this.alertState.activeAlerts.delete(id);
            }
        }

        // Limpar cooldowns antigos
        for (const [key, timestamp] of this.alertState.cooldowns.entries()) {
            if (now - timestamp > this.config.alertCooldown * 2) {
                this.alertState.cooldowns.delete(key);
            }
        }

        // Limpar histórico muito antigo
        this.alertState.alertHistory = this.alertState.alertHistory.filter(
            alert => now - alert.timestamp < maxAge * 7 // 7 dias
        );

        logger.debug('[ALERTS] Cleaned up old alerts and cooldowns');
    }

    /**
     * Resetar contador horário
     */
    resetHourlyCounter() {
        this.alertState.hourlyCount = 0;
        logger.debug('[ALERTS] Hourly alert counter reset');
    }

    /**
     * Gerar ID único para alerta
     */
    generateAlertId(alertData) {
        const timestamp = Date.now();
        const content = `${alertData.type}_${alertData.component}_${timestamp}`;
        return require('crypto').createHash('md5').update(content).digest('hex').substring(0, 12);
    }

    /**
     * Obter status do sistema de alertas
     */
    getAlertSystemStatus() {
        return {
            isRunning: this.isRunning,
            configuration: {
                emailEnabled: this.config.enableEmailAlerts,
                webhookEnabled: this.config.enableWebhookAlerts,
                smsEnabled: this.config.enableSmsAlerts,
                aggregationEnabled: this.config.enableAlertAggregation
            },
            statistics: {
                activeAlerts: this.alertState.activeAlerts.size,
                totalAlertsToday: this.alertState.hourlyCount,
                aggregatedAlerts: this.alertState.aggregatedAlerts.size,
                escalatedAlerts: this.alertState.escalatedAlerts.size,
                administratorsConfigured: this.administrators.size
            },
            health: {
                emailTransporter: !!this.notificationChannels.email,
                webhookConfigured: !!this.notificationChannels.webhook,
                smsConfigured: !!this.notificationChannels.sms
            },
            lastActivity: {
                lastAlert: this.alertState.alertHistory.length > 0 ? 
                    this.alertState.alertHistory[this.alertState.alertHistory.length - 1].timestamp : null,
                lastCleanup: Date.now() // Simplificado
            }
        };
    }

    /**
     * Obter alertas ativos
     */
    getActiveAlerts() {
        return Array.from(this.alertState.activeAlerts.values())
            .sort((a, b) => b.priority - a.priority || b.timestamp - a.timestamp);
    }

    /**
     * Obter histórico de alertas
     */
    getAlertHistory(limit = 100) {
        return this.alertState.alertHistory
            .slice(-limit)
            .sort((a, b) => b.timestamp - a.timestamp);
    }

    /**
     * Resolver alerta
     */
    resolveAlert(alertId, resolvedBy = 'system', notes = '') {
        const alert = this.alertState.activeAlerts.get(alertId);
        
        if (alert) {
            alert.resolved = true;
            alert.resolvedAt = Date.now();
            alert.resolvedBy = resolvedBy;
            alert.resolutionNotes = notes;
            
            this.alertState.activeAlerts.delete(alertId);
            
            this.emit('alertResolved', {
                alertId,
                resolvedBy,
                notes,
                timestamp: Date.now()
            });

            logger.info(`[ALERTS] Alert ${alertId} resolved by ${resolvedBy}`);
            return true;
        }
        
        return false;
    }

    /**
     * Parar sistema de alertas
     */
    async stop() {
        if (!this.isRunning) return;

        logger.info('[ALERTS] Stopping Admin Alert System...');
        
        this.isRunning = false;
        
        // Fechar conexões se necessário
        if (this.notificationChannels.email) {
            this.notificationChannels.email.close();
        }

        await this.prisma.$disconnect();
        
        this.emit('alertSystemStopped');
        logger.info('[ALERTS] Admin Alert System stopped');
    }

    /**
     * Testar sistema de alertas
     */
    async testAlertSystem() {
        const testAlert = {
            type: 'system_test',
            severity: 'info',
            title: 'Alert System Test',
            message: 'This is a test alert to verify the alert system is working correctly.',
            source: 'test_suite',
            component: 'alert_system',
            metadata: {
                test: true,
                timestamp: new Date().toISOString()
            }
        };

        const result = await this.sendAlert(testAlert);
        
        logger.info('[ALERTS] Alert system test completed:', result);
        
        return result;
    }
}

module.exports = new IntelligentAlertManager();