// 🔒 CONFIGURAÇÃO DE SEGURANÇA PARA PUBLICAÇÃO DE CONTEÚDO
// Implementa controles de segurança LGPD e políticas de aprovação

const logger = require('../utils/logger');

const SECURITY_CONFIG = {
  // 🛡️ Controles de Aprovação
  approval: {
    // Todas as publicações requerem aprovação manual explícita
    requireManualApproval: true,
    
    // Apenas ADMINs podem aprovar para publicação imediata
    allowedRolesForImmediatePublish: ['ADMIN'],
    
    // Campos obrigatórios para aprovação
    requiredFields: {
      confirmar_publicacao: 'CONFIRMO_PUBLICACAO_IMEDIATA',
      usuario_confirmacao: { minLength: 3 },
      motivo_urgencia: { minLength: 10 }
    },
    
    // Timeout para publicação (30 segundos)
    publicationTimeout: 30000
  },

  // 📋 Auditoria e Logs
  audit: {
    // Todos os acessos a endpoints sensíveis são logados
    logSensitiveEndpoints: true,
    
    // Ações que requerem auditoria obrigatória
    auditableActions: [
      'APPROVE_AND_PUBLISH_IMMEDIATE',
      'REJECT_DENUNCIA',
      'EDIT_DENUNCIA',
      'BATCH_ACTIONS'
    ],
    
    // Dados obrigatórios para auditoria
    requiredAuditData: [
      'adminUserId',
      'adminEmail',
      'targetId',
      'action',
      'timestamp',
      'ipAddress',
      'userAgent'
    ],

    // Retenção de logs de auditoria (LGPD compliance)
    retentionPeriod: {
      days: 2555, // 7 anos conforme LGPD
      autoCleanup: false // Desabilitado por compliance
    }
  },

  // 🚨 Validações de Segurança
  validation: {
    // Rate limiting específico para ações sensíveis
    rateLimits: {
      approvalEndpoint: {
        max: 10, // máximo 10 aprovações por hora por admin
        windowMs: 3600000 // 1 hora
      }
    },

    // Validação de conteúdo
    content: {
      // Proibir conteúdo sensível mesmo após aprovação bot
      blockSensitiveContent: true,
      
      // Lista de palavras que sempre requerem revisão manual
      alwaysReviewKeywords: [
        'político', 'eleição', 'voto', 'candidato',
        'protesto', 'manifestação', 'greve',
        'policia', 'violência', 'crime'
      ]
    }
  },

  // 🔐 LGPD Compliance
  lgpd: {
    // Todas as ações devem ter base legal
    requireLegalBasis: true,
    
    // Log de consentimento para publicação
    logConsent: true,
    
    // Direitos dos titulares
    dataSubjectRights: {
      // Permitir exclusão de denúncias antes da publicação
      allowDeletion: true,
      
      // Permitir correção de dados
      allowCorrection: true,
      
      // Timeout para exercer direitos (24h)
      exerciseRightsTimeout: 86400000
    },

    // Minimização de dados
    dataMinimization: {
      // Não armazenar dados desnecessários
      stripUnnecessaryData: true,
      
      // Pseudonimização automática
      pseudonymizePersonalData: true
    }
  },

  // 🎯 Políticas de Publicação
  publication: {
    // Horários permitidos para publicação imediata
    allowedHours: {
      start: 8, // 8h
      end: 22   // 22h
    },
    
    // Intervalo mínimo entre publicações (anti-spam)
    minimumInterval: 900000, // 15 minutos
    
    // Validação de qualidade obrigatória
    qualityGates: [
      'content_filter',
      'image_validation',
      'location_verification',
      'legal_compliance'
    ]
  },

  // 🚨 Alertas de Segurança
  alerts: {
    // Alertar sobre tentativas de bypass
    bypassAttempts: true,
    
    // Alertar sobre falhas de auditoria
    auditFailures: true,
    
    // Alertar sobre publicações fora do horário
    offHoursPublications: true,
    
    // Canais de alerta
    channels: ['console', 'log_file'] // Adicionar 'email', 'slack' conforme necessário
  }
};

/**
 * Valida se uma ação está em conformidade com as políticas de segurança
 * @param {string} action - Ação a ser validada
 * @param {Object} context - Contexto da ação (usuário, dados, etc.)
 * @returns {Object} - Resultado da validação
 */
function validateSecurityCompliance(action, context) {
  const validation = {
    allowed: false,
    reasons: [],
    securityLevel: 'HIGH',
    auditRequired: false
  };

  try {
    // Verificar se ação requer auditoria
    if (SECURITY_CONFIG.audit.auditableActions.includes(action)) {
      validation.auditRequired = true;
    }

    // Validar role do usuário para ações sensíveis
    if (action === 'APPROVE_AND_PUBLISH_IMMEDIATE') {
      if (!context.userRole || !SECURITY_CONFIG.approval.allowedRolesForImmediatePublish.includes(context.userRole)) {
        validation.reasons.push('Usuário não autorizado para aprovação imediata');
        return validation;
      }
    }

    // Validar campos obrigatórios
    const requiredFields = SECURITY_CONFIG.approval.requiredFields;
    for (const [field, requirement] of Object.entries(requiredFields)) {
      if (!context[field]) {
        validation.reasons.push(`Campo obrigatório ausente: ${field}`);
        return validation;
      }
      
      if (typeof requirement === 'object' && requirement.minLength) {
        if (context[field].length < requirement.minLength) {
          validation.reasons.push(`Campo ${field} deve ter pelo menos ${requirement.minLength} caracteres`);
          return validation;
        }
      } else if (typeof requirement === 'string' && context[field] !== requirement) {
        validation.reasons.push(`Campo ${field} deve ser: ${requirement}`);
        return validation;
      }
    }

    // Validar horário de publicação
    if (action === 'APPROVE_AND_PUBLISH_IMMEDIATE') {
      const currentHour = new Date().getHours();
      const { start, end } = SECURITY_CONFIG.publication.allowedHours;
      
      if (currentHour < start || currentHour > end) {
        validation.reasons.push(`Publicação fora do horário permitido (${start}h-${end}h)`);
        validation.securityLevel = 'CRITICAL';
        // Permitir mas com alerta
        if (SECURITY_CONFIG.alerts.offHoursPublications) {
          logger.warn('🚨 PUBLICAÇÃO FORA DO HORÁRIO PERMITIDO', {
            action,
            user: context.userEmail,
            hour: currentHour,
            allowed: `${start}h-${end}h`
          });
        }
      }
    }

    // Se chegou até aqui, está validado
    validation.allowed = true;
    validation.reasons = ['Validação de segurança aprovada'];

  } catch (error) {
    logger.error('Erro na validação de segurança:', error);
    validation.reasons.push('Erro interno na validação de segurança');
    validation.securityLevel = 'CRITICAL';
  }

  return validation;
}

/**
 * Log de auditoria para ações sensíveis
 * @param {string} action - Ação executada
 * @param {Object} context - Contexto da ação
 * @param {Object} result - Resultado da ação
 */
function logSecurityAudit(action, context, result) {
  const auditLog = {
    timestamp: new Date().toISOString(),
    action,
    user: {
      id: context.adminUserId,
      email: context.adminEmail,
      role: context.userRole
    },
    target: {
      type: context.targetType,
      id: context.targetId
    },
    request: {
      ip: context.ip,
      userAgent: context.userAgent
    },
    result: {
      success: result.success,
      status: result.status,
      error: result.error || null
    },
    security: {
      level: context.securityLevel || 'MEDIUM',
      validationPassed: result.success,
      complianceChecked: true
    }
  };

  // Log com nível apropriado
  if (result.success) {
    logger.info('🔒 AUDITORIA DE SEGURANÇA', auditLog);
  } else {
    logger.error('🚨 FALHA NA AUDITORIA DE SEGURANÇA', auditLog);
  }

  return auditLog;
}

/**
 * Middleware de segurança para endpoints sensíveis
 */
function securityMiddleware(action) {
  return (req, res, next) => {
    const context = {
      action,
      adminUserId: req.user?.id,
      adminEmail: req.user?.email,
      userRole: req.user?.role,
      targetType: 'DENUNCIA',
      targetId: req.params?.id,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      ...req.body
    };

    // Validar conformidade de segurança
    const validation = validateSecurityCompliance(action, context);
    
    if (!validation.allowed) {
      logger.warn('🛡️ ACESSO NEGADO POR POLÍTICA DE SEGURANÇA', {
        action,
        user: context.adminEmail,
        reasons: validation.reasons,
        securityLevel: validation.securityLevel
      });

      return res.status(403).json({
        error: 'Acesso negado por política de segurança',
        code: 'SECURITY_POLICY_VIOLATION',
        reasons: validation.reasons,
        securityLevel: validation.securityLevel
      });
    }

    // Adicionar dados de validação ao request
    req.securityValidation = validation;
    req.securityContext = context;

    next();
  };
}

module.exports = {
  SECURITY_CONFIG,
  validateSecurityCompliance,
  logSecurityAudit,
  securityMiddleware
};