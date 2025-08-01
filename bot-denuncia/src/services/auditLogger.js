/**
 * Audit Logger - Sistema de Logs Detalhados para Auditoria
 * Registra todas as operações críticas do sistema para compliance
 * @author Sistema Bot Denúncia
 */

const logger = require('../utils/logger');
const fs = require('fs').promises;
const path = require('path');
const { PrismaClient } = require('@prisma/client');

class AuditLogger {
  constructor() {
    this.prisma = new PrismaClient();
    this.auditLogPath = path.join(__dirname, '../../logs/audit.log');
    this.rotationSize = 50 * 1024 * 1024; // 50MB
    this.maxLogFiles = 10;
    
    // Garantir que o diretório de logs existe
    this.ensureLogDirectory();
    
    logger.info('📋 [AUDIT] Audit Logger inicializado');
  }

  /**
   * Garantir que o diretório de logs existe
   */
  async ensureLogDirectory() {
    try {
      const logDir = path.dirname(this.auditLogPath);
      await fs.mkdir(logDir, { recursive: true });
    } catch (error) {
      logger.error('❌ [AUDIT] Erro ao criar diretório de logs:', error.message);
    }
  }

  /**
   * Log de aprovação de denúncia
   */
  async logDenunciaApproval(denunciaId, adminUser, metadata = {}) {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      action: 'DENUNCIA_APPROVED',
      entity: 'Denuncia',
      entityId: denunciaId,
      user: {
        id: adminUser.id,
        email: adminUser.email,
        role: adminUser.role
      },
      metadata: {
        ...metadata,
        ip: metadata.ip || 'unknown',
        userAgent: metadata.userAgent || 'unknown'
      },
      severity: 'info'
    };

    await this.writeAuditLog(auditEntry);
    logger.info(`📋 [AUDIT] Aprovação registrada: Denúncia ${denunciaId} por ${adminUser.email}`);
  }

  /**
   * Log de rejeição de denúncia
   */
  async logDenunciaRejection(denunciaId, adminUser, motivo, metadata = {}) {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      action: 'DENUNCIA_REJECTED',
      entity: 'Denuncia',
      entityId: denunciaId,
      user: {
        id: adminUser.id,
        email: adminUser.email,
        role: adminUser.role
      },
      metadata: {
        ...metadata,
        motivo: motivo,
        ip: metadata.ip || 'unknown',
        userAgent: metadata.userAgent || 'unknown'
      },
      severity: 'warning'
    };

    await this.writeAuditLog(auditEntry);
    logger.info(`📋 [AUDIT] Rejeição registrada: Denúncia ${denunciaId} por ${adminUser.email} - Motivo: ${motivo}`);
  }

  /**
   * Log de publicação no Instagram
   */
  async logInstagramPost(denunciaId, postId, postUrl, processingTime, metadata = {}) {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      action: 'INSTAGRAM_POST_PUBLISHED',
      entity: 'InstagramPost',
      entityId: postId,
      metadata: {
        ...metadata,
        denunciaId: denunciaId,
        postUrl: postUrl,
        processingTime: processingTime,
        humanized: metadata.humanized || false,
        riskScore: metadata.riskScore || 0
      },
      severity: 'info'
    };

    await this.writeAuditLog(auditEntry);
    logger.info(`📋 [AUDIT] Publicação registrada: Post ${postId} da denúncia ${denunciaId}`);
  }

  /**
   * Log de falha na publicação
   */
  async logInstagramPostFailure(denunciaId, error, retryCount, metadata = {}) {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      action: 'INSTAGRAM_POST_FAILED',
      entity: 'InstagramPost',
      entityId: null,
      metadata: {
        ...metadata,
        denunciaId: denunciaId,
        error: error,
        retryCount: retryCount,
        willRetry: retryCount < 3
      },
      severity: 'error'
    };

    await this.writeAuditLog(auditEntry);
    logger.error(`📋 [AUDIT] Falha na publicação registrada: Denúncia ${denunciaId} - Erro: ${error}`);
  }

  /**
   * Log de operações do sistema
   */
  async logSystemOperation(operation, success, details = {}, user = null) {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      action: `SYSTEM_${operation.toUpperCase()}`,
      entity: 'System',
      entityId: null,
      user: user ? {
        id: user.id,
        email: user.email,
        role: user.role
      } : null,
      metadata: {
        ...details,
        success: success,
        operation: operation
      },
      severity: success ? 'info' : 'error'
    };

    await this.writeAuditLog(auditEntry);
    logger.info(`📋 [AUDIT] Operação do sistema registrada: ${operation} - ${success ? 'Sucesso' : 'Falha'}`);
  }

  /**
   * Log de acesso administrativo
   */
  async logAdminAccess(user, action, resource, metadata = {}) {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      action: 'ADMIN_ACCESS',
      entity: 'Admin',
      entityId: user.id,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      },
      metadata: {
        ...metadata,
        action: action,
        resource: resource,
        ip: metadata.ip || 'unknown',
        userAgent: metadata.userAgent || 'unknown'
      },
      severity: 'info'
    };

    await this.writeAuditLog(auditEntry);
  }

  /**
   * Log de configurações alteradas
   */
  async logConfigurationChange(user, configType, oldValue, newValue, metadata = {}) {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      action: 'CONFIGURATION_CHANGED',
      entity: 'Configuration',
      entityId: configType,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      },
      metadata: {
        ...metadata,
        configType: configType,
        oldValue: this.sanitizeValue(oldValue),
        newValue: this.sanitizeValue(newValue),
        ip: metadata.ip || 'unknown'
      },
      severity: 'warning'
    };

    await this.writeAuditLog(auditEntry);
    logger.warn(`📋 [AUDIT] Configuração alterada: ${configType} por ${user.email}`);
  }

  /**
   * Log de eventos de segurança
   */
  async logSecurityEvent(eventType, severity, details, user = null) {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      action: 'SECURITY_EVENT',
      entity: 'Security',
      entityId: null,
      user: user ? {
        id: user.id,
        email: user.email,
        role: user.role
      } : null,
      metadata: {
        ...details,
        eventType: eventType,
        ip: details.ip || 'unknown',
        userAgent: details.userAgent || 'unknown'
      },
      severity: severity
    };

    await this.writeAuditLog(auditEntry);
    logger.warn(`📋 [AUDIT] Evento de segurança: ${eventType} - Severidade: ${severity}`);
  }

  /**
   * Log de diagnósticos e correções
   */
  async logDiagnosticOperation(operationType, result, processingTime, details = {}) {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      action: `DIAGNOSTIC_${operationType.toUpperCase()}`,
      entity: 'System',
      entityId: null,
      metadata: {
        ...details,
        operationType: operationType,
        result: result.status || 'unknown',
        processingTime: processingTime,
        componentsAnalyzed: result.components ? Object.keys(result.components).length : 0,
        issuesFound: result.overall_health?.issues_found || 0
      },
      severity: result.status === 'completed' ? 'info' : 'warning'
    };

    await this.writeAuditLog(auditEntry);
    logger.info(`📋 [AUDIT] Operação de diagnóstico registrada: ${operationType} - ${processingTime}ms`);
  }

  /**
   * Sanitizar valores sensíveis
   */
  sanitizeValue(value) {
    if (typeof value === 'string') {
      // Mascarar senhas
      if (value.length > 8 && /^[a-zA-Z0-9!@#$%^&*()]+$/.test(value)) {
        return '***MASKED***';
      }
      
      // Mascarar tokens
      if (value.length > 20 && value.includes('_')) {
        return value.substring(0, 8) + '***MASKED***';
      }
    }
    
    return value;
  }

  /**
   * Escrever entrada de auditoria
   */
  async writeAuditLog(auditEntry) {
    try {
      // Verificar rotação de logs
      await this.checkLogRotation();
      
      // Escrever no arquivo
      const logLine = JSON.stringify(auditEntry) + '\n';
      await fs.appendFile(this.auditLogPath, logLine);
      
      // Também salvar no banco de dados para consultas
      await this.saveToDatabase(auditEntry);
      
    } catch (error) {
      logger.error('❌ [AUDIT] Erro ao escrever log de auditoria:', error.message);
    }
  }

  /**
   * Salvar no banco de dados
   */
  async saveToDatabase(auditEntry) {
    try {
      await this.prisma.auditLog.create({
        data: {
          timestamp: new Date(auditEntry.timestamp),
          action: auditEntry.action,
          entity: auditEntry.entity,
          entityId: auditEntry.entityId,
          userId: auditEntry.user?.id || null,
          userEmail: auditEntry.user?.email || null,
          userRole: auditEntry.user?.role || null,
          metadata: auditEntry.metadata,
          severity: auditEntry.severity,
          ip: auditEntry.metadata?.ip || null
        }
      });
    } catch (error) {
      // Se a tabela não existir, apenas log no arquivo
      if (error.code === 'P2021') {
        logger.warn('⚠️ [AUDIT] Tabela auditLog não existe - salvando apenas em arquivo');
      } else {
        logger.error('❌ [AUDIT] Erro ao salvar no banco:', error.message);
      }
    }
  }

  /**
   * Verificar necessidade de rotação de logs
   */
  async checkLogRotation() {
    try {
      const stats = await fs.stat(this.auditLogPath);
      
      if (stats.size > this.rotationSize) {
        await this.rotateLogFile();
      }
    } catch (error) {
      // Arquivo não existe ainda - tudo bem
      if (error.code !== 'ENOENT') {
        logger.error('❌ [AUDIT] Erro ao verificar rotação:', error.message);
      }
    }
  }

  /**
   * Rotacionar arquivo de log
   */
  async rotateLogFile() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const rotatedPath = this.auditLogPath.replace('.log', `-${timestamp}.log`);
      
      // Mover arquivo atual
      await fs.rename(this.auditLogPath, rotatedPath);
      
      // Limpar arquivos antigos
      await this.cleanupOldLogFiles();
      
      logger.info(`📋 [AUDIT] Log rotacionado: ${path.basename(rotatedPath)}`);
      
    } catch (error) {
      logger.error('❌ [AUDIT] Erro na rotação do log:', error.message);
    }
  }

  /**
   * Limpar arquivos de log antigos
   */
  async cleanupOldLogFiles() {
    try {
      const logDir = path.dirname(this.auditLogPath);
      const files = await fs.readdir(logDir);
      
      const auditFiles = files
        .filter(f => f.startsWith('audit-') && f.endsWith('.log'))
        .map(f => ({
          name: f,
          path: path.join(logDir, f),
          timestamp: f.match(/audit-(.+)\.log/)?.[1] || '0'
        }))
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

      if (auditFiles.length > this.maxLogFiles) {
        const filesToDelete = auditFiles.slice(this.maxLogFiles);
        
        for (const file of filesToDelete) {
          await fs.unlink(file.path);
        }
        
        logger.info(`📋 [AUDIT] Removidos ${filesToDelete.length} arquivos de log antigos`);
      }
    } catch (error) {
      logger.error('❌ [AUDIT] Erro na limpeza de logs antigos:', error.message);
    }
  }

  /**
   * Obter logs de auditoria com filtros
   */
  async getAuditLogs(filters = {}) {
    try {
      const {
        startDate,
        endDate,
        action,
        entity,
        userId,
        severity,
        limit = 100,
        offset = 0
      } = filters;

      const where = {};
      
      if (startDate) {
        where.timestamp = { ...where.timestamp, gte: new Date(startDate) };
      }
      
      if (endDate) {
        where.timestamp = { ...where.timestamp, lte: new Date(endDate) };
      }
      
      if (action) {
        where.action = { contains: action, mode: 'insensitive' };
      }
      
      if (entity) {
        where.entity = entity;
      }
      
      if (userId) {
        where.userId = userId;
      }
      
      if (severity) {
        where.severity = severity;
      }

      const logs = await this.prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset
      });

      const total = await this.prisma.auditLog.count({ where });

      return {
        logs,
        total,
        limit,
        offset,
        hasMore: total > offset + limit
      };

    } catch (error) {
      logger.error('❌ [AUDIT] Erro ao buscar logs de auditoria:', error.message);
      return {
        logs: [],
        total: 0,
        limit,
        offset: 0,
        hasMore: false,
        error: error.message
      };
    }
  }

  /**
   * Gerar relatório de auditoria
   */
  async generateAuditReport(startDate, endDate) {
    try {
      const logs = await this.getAuditLogs({
        startDate,
        endDate,
        limit: 10000
      });

      const report = {
        period: {
          start: startDate,
          end: endDate
        },
        summary: {
          totalEvents: logs.total,
          byAction: {},
          byEntity: {},
          bySeverity: {},
          byUser: {}
        },
        events: logs.logs,
        generatedAt: new Date().toISOString()
      };

      // Agrupar estatísticas
      logs.logs.forEach(log => {
        // Por ação
        report.summary.byAction[log.action] = (report.summary.byAction[log.action] || 0) + 1;
        
        // Por entidade
        report.summary.byEntity[log.entity] = (report.summary.byEntity[log.entity] || 0) + 1;
        
        // Por severidade
        report.summary.bySeverity[log.severity] = (report.summary.bySeverity[log.severity] || 0) + 1;
        
        // Por usuário
        if (log.userEmail) {
          report.summary.byUser[log.userEmail] = (report.summary.byUser[log.userEmail] || 0) + 1;
        }
      });

      return report;

    } catch (error) {
      logger.error('❌ [AUDIT] Erro ao gerar relatório de auditoria:', error.message);
      throw error;
    }
  }

  /**
   * Limpar recursos
   */
  async cleanup() {
    try {
      await this.prisma.$disconnect();
      logger.info('🧹 [AUDIT] Recursos limpos com sucesso');
    } catch (error) {
      logger.error('❌ [AUDIT] Erro na limpeza de recursos:', error.message);
    }
  }
}

module.exports = AuditLogger;