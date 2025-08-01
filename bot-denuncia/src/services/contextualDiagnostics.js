/**
 * Sistema de Diagnóstico Contextual para WhatsApp→Instagram Integration
 * Implementa metodologia de engenharia de contexto para debugging avançado
 * @author Sistema Bot Denúncia
 */

const logger = require('../utils/logger');
const instagramService = require('./instagramService');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs').promises;
const path = require('path');

class ContextualDiagnostics {
  constructor() {
    this.context = {
      system: 'whatsapp-instagram-integration',
      environment: process.env.NODE_ENV || 'production',
      timestamp: new Date().toISOString(),
      user_context: 'admin-approval-flow'
    };
    
    this.prisma = new PrismaClient();
    this.diagnosticResults = {};
    
    logger.info('🧠 [CONTEXTO] Sistema de Diagnóstico Contextual inicializado');
  }

  /**
   * Executar diagnóstico completo do sistema
   */
  async executeDiagnosis() {
    logger.info('🔍 [CONTEXTO] Iniciando diagnóstico completo do sistema...');
    
    const startTime = Date.now();
    const diagnosis = {
      timestamp: new Date().toISOString(),
      system_context: this.context,
      components: {}
    };

    try {
      // 1. Diagnóstico do Instagram
      diagnosis.components.instagram = await this.diagnoseInstagramContext();
      
      // 2. Diagnóstico do fluxo de aprovação
      diagnosis.components.approval_flow = await this.diagnoseApprovalFlowContext();
      
      // 3. Diagnóstico da base de dados
      diagnosis.components.database = await this.diagnoseDatabaseContext();
      
      // 4. Diagnóstico do sistema de filas
      diagnosis.components.queue_system = await this.diagnoseQueueContext();
      
      // 5. Diagnóstico de arquivos e recursos
      diagnosis.components.file_system = await this.diagnoseFileSystemContext();
      
      // 6. Análise de contexto geral
      diagnosis.overall_health = this.analyzeOverallHealth(diagnosis.components);
      
      const processingTime = Date.now() - startTime;
      diagnosis.processing_time_ms = processingTime;
      
      // Salvar resultados
      await this.saveDiagnosticResults(diagnosis);
      
      logger.info(`🎯 [CONTEXTO] Diagnóstico completo finalizado em ${processingTime}ms`);
      logger.info(`📊 [CONTEXTO] Status geral: ${diagnosis.overall_health.status}`);
      
      return diagnosis;
      
    } catch (error) {
      logger.error('❌ [CONTEXTO] Falha no diagnóstico:', error.message);
      diagnosis.error = {
        message: error.message,
        stack: error.stack,
        processing_time_ms: Date.now() - startTime
      };
      return diagnosis;
    }
  }

  /**
   * 1. Diagnóstico do Contexto de Conexão Instagram
   */
  async diagnoseInstagramContext() {
    logger.info("🔍 [CONTEXTO] Analisando integração Instagram...");
    
    const diagnostics = {
      connection_test: await this.testConnectionContext(),
      token_validation: await this.validateTokenContext(),
      permissions_check: await this.checkPermissionsContext(),
      api_limits: await this.checkRateLimitsContext(),
      session_status: await this.checkSessionContext(),
      humanization_engine: await this.checkHumanizationContext()
    };

    // Contexto de decisão baseado nos resultados
    const context_decision = this.analyzeConnectionContext(diagnostics);
    
    logger.info("📊 [CONTEXTO] Diagnóstico Instagram:", {
      decision: context_decision.status,
      next_action: context_decision.recommended_action
    });

    return {
      diagnostics,
      decision: context_decision,
      timestamp: new Date().toISOString()
    };
  }

  async testConnectionContext() {
    try {
      logger.info("🔗 [CONTEXTO] Testando conexão Instagram...");
      
      const connectionTest = await instagramService.testConnection(2);
      
      if (connectionTest.success) {
        return {
          status: 'success',
          context: 'connected',
          details: connectionTest.accountInfo,
          remediation: null,
          performance: {
            attempts: connectionTest.attempt,
            response_time: 'optimal'
          }
        };
      } else {
        return {
          status: 'failed',
          context: connectionTest.finalError ? 'connection_failed' : 'connection_degraded',
          details: connectionTest.message,
          remediation: 'Check Instagram credentials and network connectivity',
          performance: {
            attempts: connectionTest.attempts || 1,
            response_time: 'degraded'
          }
        };
      }
      
    } catch (error) {
      return {
        status: 'failed',
        context: 'network_error',
        details: error.message,
        remediation: 'Check internet connection and firewall settings',
        performance: {
          attempts: 0,
          response_time: 'failed'
        }
      };
    }
  }

  async validateTokenContext() {
    try {
      logger.info("🔑 [CONTEXTO] Validando credenciais Instagram...");
      
      const status = await instagramService.getConnectionStatus();
      
      if (!status.hasValidCredentials) {
        return {
          status: 'failed',
          context: 'missing_credentials',
          details: 'Instagram credentials not configured',
          remediation: 'Configure INSTAGRAM_USERNAME and INSTAGRAM_PASSWORD environment variables'
        };
      }

      if (status.isLoggedIn) {
        return {
          status: 'success',
          context: 'valid_session',
          details: `Authenticated as ${status.username}`,
          remediation: null
        };
      } else {
        return {
          status: 'warning',
          context: 'not_logged_in',
          details: 'Credentials configured but not logged in',
          remediation: 'Initialize Instagram service to login'
        };
      }
      
    } catch (error) {
      return {
        status: 'failed',
        context: 'validation_error',
        details: error.message,
        remediation: 'Check Instagram service configuration'
      };
    }
  }

  async checkPermissionsContext() {
    try {
      logger.info("🔐 [CONTEXTO] Verificando permissões Instagram...");
      
      const accountInfo = await instagramService.getAccountInfo();
      
      if (!accountInfo) {
        return {
          status: 'failed',
          context: 'cannot_access_account',
          details: 'Unable to retrieve account information',
          remediation: 'Check Instagram authentication and permissions'
        };
      }

      return {
        status: 'success',
        context: 'permissions_valid',
        details: {
          username: accountInfo.username,
          isPrivate: accountInfo.isPrivate,
          isVerified: accountInfo.isVerified,
          mediaCount: accountInfo.mediaCount
        },
        remediation: null
      };
      
    } catch (error) {
      return {
        status: 'failed',
        context: 'permissions_error',
        details: error.message,
        remediation: 'Re-authenticate Instagram account'
      };
    }
  }

  async checkRateLimitsContext() {
    try {
      logger.info("⏱️ [CONTEXTO] Verificando rate limits Instagram...");
      
      const riskAssessment = instagramService.getRiskAssessment();
      
      if (riskAssessment.error) {
        return {
          status: 'warning',
          context: 'no_rate_limit_data',
          details: 'Humanization engine not available for rate limit analysis',
          remediation: 'Monitor posting frequency manually'
        };
      }

      return {
        status: 'success',
        context: 'rate_limits_monitored',
        details: {
          riskScore: riskAssessment.totalRisk,
          emergencyMode: riskAssessment.emergencyMode,
          recommendation: riskAssessment.recommendation
        },
        remediation: riskAssessment.emergencyMode ? 'Reduce posting frequency' : null
      };
      
    } catch (error) {
      return {
        status: 'failed',
        context: 'rate_limit_check_failed',
        details: error.message,
        remediation: 'Check Instagram service rate limiting'
      };
    }
  }

  async checkSessionContext() {
    try {
      logger.info("📱 [CONTEXTO] Verificando sessão Instagram...");
      
      const sessionExists = await instagramService.sessionExists();
      const isOptimalTime = instagramService.isOptimalPostingTime();
      
      return {
        status: 'success',
        context: 'session_analyzed',
        details: {
          sessionFileExists: sessionExists,
          isOptimalPostingTime: isOptimalTime.isOptimal,
          isPeakHour: isOptimalTime.isPeakHour,
          shouldDelay: isOptimalTime.shouldDelay
        },
        remediation: isOptimalTime.shouldDelay ? 'Consider delaying posts to optimal time' : null
      };
      
    } catch (error) {
      return {
        status: 'failed',
        context: 'session_check_failed',
        details: error.message,
        remediation: 'Check Instagram session management'
      };
    }
  }

  async checkHumanizationContext() {
    try {
      logger.info("🤖 [CONTEXTO] Verificando Humanization Engine...");
      
      const humanizationReport = instagramService.getHumanizationReport();
      
      if (humanizationReport.error) {
        return {
          status: 'warning',
          context: 'humanization_unavailable',
          details: humanizationReport.error,
          remediation: 'Humanization features disabled, basic posting only'
        };
      }

      return {
        status: 'success',
        context: 'humanization_active',
        details: humanizationReport,
        remediation: null
      };
      
    } catch (error) {
      return {
        status: 'failed',
        context: 'humanization_error',
        details: error.message,
        remediation: 'Check Instagram Humanization Engine'
      };
    }
  }

  /**
   * 2. Diagnóstico do Contexto de Aprovação
   */
  async diagnoseApprovalFlowContext() {
    logger.info("🔍 [CONTEXTO] Analisando fluxo de aprovação...");
    
    try {
      // Verificar eventos de aprovação recentes
      const approval_events = await this.analyzeApprovalEvents();
      
      // Verificar integridade dos dados
      const data_flow = await this.analyzeDataFlow();
      
      // Verificar triggers do sistema
      const system_triggers = await this.analyzeSystemTriggers();

      const analysis = {
        approval_events,
        data_flow,
        system_triggers,
        status: 'analyzed',
        timestamp: new Date().toISOString()
      };

      logger.info("📊 [CONTEXTO] Análise do fluxo de aprovação concluída");
      return analysis;
      
    } catch (error) {
      logger.error("❌ [CONTEXTO] Falha na análise do fluxo de aprovação:", error.message);
      return {
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async analyzeApprovalEvents() {
    try {
      // Buscar denúncias aprovadas recentemente
      const recentApprovals = await this.prisma.denuncia.findMany({
        where: {
          aprovado: true,
          updatedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Últimas 24h
          }
        },
        orderBy: { updatedAt: 'desc' },
        take: 10,
        include: {
          vereadores: true
        }
      });

      // Analisar padrões de aprovação
      const analysis = {
        total_approved_24h: recentApprovals.length,
        posted_count: recentApprovals.filter(d => d.instagramPostId).length,
        pending_posts: recentApprovals.filter(d => !d.instagramPostId).length,
        approval_timestamps: recentApprovals.map(d => d.updatedAt),
        has_images: recentApprovals.filter(d => d.imagePath).length
      };

      logger.info(`📈 [CONTEXTO] Eventos de aprovação: ${analysis.total_approved_24h} total, ${analysis.pending_posts} pendentes`);
      
      return {
        status: 'success',
        data: analysis,
        context: analysis.pending_posts > 0 ? 'posts_pending' : 'no_pending_posts',
        remediation: analysis.pending_posts > 0 ? 'Process pending approved posts' : null
      };
      
    } catch (error) {
      return {
        status: 'failed',
        context: 'database_error',
        details: error.message,
        remediation: 'Check database connection and schema'
      };
    }
  }

  async analyzeDataFlow() {
    try {
      // Verificar integridade dos dados de denúncia
      const dataIntegrityCheck = await this.prisma.denuncia.findMany({
        where: {
          aprovado: true,
          instagramPostId: null
        },
        select: {
          id: true,
          texto: true,
          imagePath: true,
          vereadores: {
            select: {
              nome: true,
              instagram: true
            }
          }
        },
        take: 5
      });

      const integrity_analysis = {
        samples_checked: dataIntegrityCheck.length,
        missing_text: dataIntegrityCheck.filter(d => !d.texto || d.texto.trim() === '').length,
        missing_images: dataIntegrityCheck.filter(d => !d.imagePath).length,
        missing_vereadores: dataIntegrityCheck.filter(d => !d.vereadores || d.vereadores.length === 0).length,
        complete_records: dataIntegrityCheck.filter(d => 
          d.texto && d.texto.trim() !== '' && 
          d.imagePath && 
          d.vereadores && d.vereadores.length > 0
        ).length
      };

      return {
        status: 'success',
        data: integrity_analysis,
        context: integrity_analysis.complete_records === integrity_analysis.samples_checked ? 'data_complete' : 'data_incomplete',
        remediation: integrity_analysis.complete_records < integrity_analysis.samples_checked ? 'Fix incomplete records before posting' : null
      };
      
    } catch (error) {
      return {
        status: 'failed',
        context: 'data_analysis_error',
        details: error.message,
        remediation: 'Check database schema and data integrity'
      };
    }
  }

  async analyzeSystemTriggers() {
    try {
      // Verificar se existe algum mecanismo automático de posting
      const logPath = path.join(__dirname, '../../logs');
      let recentLogs = [];
      
      try {
        const appLogPath = path.join(logPath, 'app.log');
        const logContent = await fs.readFile(appLogPath, 'utf8');
        const lines = logContent.split('\n').slice(-100); // Últimas 100 linhas
        
        recentLogs = lines.filter(line => 
          line.includes('INSTAGRAM') || 
          line.includes('aprovado') || 
          line.includes('publicar')
        );
      } catch (logError) {
        logger.warn('[CONTEXTO] Não foi possível analisar logs:', logError.message);
      }

      return {
        status: 'success',
        data: {
          recent_log_entries: recentLogs.length,
          instagram_mentions: recentLogs.filter(l => l.includes('INSTAGRAM')).length,
          approval_mentions: recentLogs.filter(l => l.includes('aprovado')).length,
          posting_attempts: recentLogs.filter(l => l.includes('publicar')).length
        },
        context: recentLogs.length > 0 ? 'system_active' : 'system_quiet',
        remediation: null
      };
      
    } catch (error) {
      return {
        status: 'failed',
        context: 'trigger_analysis_error',
        details: error.message,
        remediation: 'Check system logging and trigger mechanisms'
      };
    }
  }

  /**
   * 3. Diagnóstico da Base de Dados
   */
  async diagnoseDatabaseContext() {
    logger.info("🗄️ [CONTEXTO] Analisando contexto da base de dados...");
    
    try {
      const dbStats = await this.getDatabaseStats();
      const connectionHealth = await this.checkDatabaseConnection();
      
      return {
        status: 'success',
        connection_health: connectionHealth,
        statistics: dbStats,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      return {
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async getDatabaseStats() {
    const stats = {
      total_denuncias: await this.prisma.denuncia.count(),
      approved_denuncias: await this.prisma.denuncia.count({ where: { aprovado: true } }),
      posted_denuncias: await this.prisma.denuncia.count({ where: { instagramPostId: { not: null } } }),
      pending_posts: await this.prisma.denuncia.count({ where: { aprovado: true, instagramPostId: null } }),
      total_vereadores: await this.prisma.vereador.count(),
      active_vereadores: await this.prisma.vereador.count({ where: { ativo: true } })
    };

    return stats;
  }

  async checkDatabaseConnection() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'connected',
        latency: 'optimal'
      };
    } catch (error) {
      return {
        status: 'failed',
        error: error.message
      };
    }
  }

  /**
   * 4. Diagnóstico do Sistema de Filas
   */
  async diagnoseQueueContext() {
    logger.info("🚥 [CONTEXTO] Analisando sistema de filas...");
    
    try {
      // Verificar se workers estão rodando
      const queueStatus = await this.checkQueueWorkers();
      
      return {
        status: 'analyzed',
        queue_workers: queueStatus,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      return {
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async checkQueueWorkers() {
    // Esta implementação pode ser expandida conforme o sistema de filas usado
    return {
      process_queue: 'not_implemented',
      publish_queue: 'not_implemented',
      recommendation: 'Implement queue monitoring system'
    };
  }

  /**
   * 5. Diagnóstico do Sistema de Arquivos
   */
  async diagnoseFileSystemContext() {
    logger.info("📁 [CONTEXTO] Analisando sistema de arquivos...");
    
    try {
      const uploadsDirCheck = await this.checkUploadsDirectory();
      const photoStorageCheck = await this.checkPhotoStorageDirectory();
      
      return {
        status: 'analyzed',
        uploads_directory: uploadsDirCheck,
        photo_storage: photoStorageCheck,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      return {
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async checkUploadsDirectory() {
    const uploadsPath = path.join(__dirname, '../../uploads');
    
    try {
      await fs.access(uploadsPath);
      const files = await fs.readdir(uploadsPath);
      const imageFiles = files.filter(f => /\.(jpg|jpeg|png|gif)$/i.test(f));
      
      return {
        status: 'accessible',
        total_files: files.length,
        image_files: imageFiles.length,
        path: uploadsPath
      };
    } catch (error) {
      return {
        status: 'inaccessible',
        error: error.message,
        path: uploadsPath
      };
    }
  }

  async checkPhotoStorageDirectory() {
    const photoStoragePath = path.join(__dirname, '../../photo-storage');
    
    try {
      await fs.access(photoStoragePath);
      const subdirs = await fs.readdir(photoStoragePath);
      
      return {
        status: 'accessible',
        subdirectories: subdirs,
        path: photoStoragePath
      };
    } catch (error) {
      return {
        status: 'inaccessible',
        error: error.message,
        path: photoStoragePath
      };
    }
  }

  /**
   * Analisar contexto de conexão e gerar recomendações
   */
  analyzeConnectionContext(diagnostics) {
    const issues = [];
    const recommendations = [];
    
    // Analisar cada diagnóstico
    Object.entries(diagnostics).forEach(([key, result]) => {
      if (result.status === 'failed') {
        issues.push({
          component: key,
          issue: result.context,
          details: result.details,
          remediation: result.remediation
        });
      }
    });

    // Determinar status geral
    let overall_status = 'healthy';
    if (issues.length > 0) {
      const criticalIssues = issues.filter(i => 
        i.component === 'connection_test' || 
        i.component === 'token_validation'
      );
      
      overall_status = criticalIssues.length > 0 ? 'critical' : 'degraded';
    }

    // Gerar recomendações
    if (overall_status === 'critical') {
      recommendations.push('Fix Instagram connection issues before proceeding');
      recommendations.push('Verify Instagram credentials and network connectivity');
    } else if (overall_status === 'degraded') {
      recommendations.push('Address non-critical issues to improve reliability');
      recommendations.push('Monitor system performance closely');
    } else {
      recommendations.push('System is healthy - proceed with normal operations');
    }

    return {
      status: overall_status,
      issues_found: issues.length,
      critical_issues: issues.filter(i => 
        i.component === 'connection_test' || 
        i.component === 'token_validation'
      ).length,
      issues: issues,
      recommended_action: recommendations[0],
      all_recommendations: recommendations
    };
  }

  /**
   * Analisar saúde geral do sistema
   */
  analyzeOverallHealth(components) {
    const healthScores = {
      instagram: this.calculateComponentHealth(components.instagram),
      approval_flow: this.calculateComponentHealth(components.approval_flow),
      database: this.calculateComponentHealth(components.database),
      queue_system: this.calculateComponentHealth(components.queue_system),
      file_system: this.calculateComponentHealth(components.file_system)
    };

    const avgScore = Object.values(healthScores).reduce((sum, score) => sum + score, 0) / Object.keys(healthScores).length;
    
    let overall_status = 'healthy';
    if (avgScore < 0.5) {
      overall_status = 'critical';
    } else if (avgScore < 0.8) {
      overall_status = 'degraded';
    }

    return {
      status: overall_status,
      overall_score: Math.round(avgScore * 100),
      component_scores: healthScores,
      priority_actions: this.generatePriorityActions(components)
    };
  }

  calculateComponentHealth(component) {
    if (!component || component.status === 'failed') return 0;
    if (component.status === 'success' || component.status === 'analyzed') return 1;
    if (component.status === 'warning') return 0.7;
    return 0.5;
  }

  generatePriorityActions(components) {
    const actions = [];
    
    // Instagram issues
    if (components.instagram?.decision?.status === 'critical') {
      actions.push({
        priority: 'critical',
        component: 'instagram',
        action: 'Fix Instagram connection and authentication',
        urgency: 'immediate'
      });
    }

    // Pending posts
    if (components.approval_flow?.approval_events?.data?.pending_posts > 0) {
      actions.push({
        priority: 'high',
        component: 'approval_flow',
        action: `Process ${components.approval_flow.approval_events.data.pending_posts} pending approved posts`,
        urgency: 'within_1_hour'
      });
    }

    // Database issues
    if (components.database?.status === 'failed') {
      actions.push({
        priority: 'critical',
        component: 'database',
        action: 'Restore database connectivity',
        urgency: 'immediate'
      });
    }

    return actions.sort((a, b) => {
      const priorities = { critical: 3, high: 2, medium: 1, low: 0 };
      return priorities[b.priority] - priorities[a.priority];
    });
  }

  /**
   * Salvar resultados do diagnóstico
   */
  async saveDiagnosticResults(diagnosis) {
    try {
      const resultsPath = path.join(__dirname, '../../reports');
      await fs.mkdir(resultsPath, { recursive: true });
      
      const filename = `diagnostic-report-${Date.now()}.json`;
      const filepath = path.join(resultsPath, filename);
      
      await fs.writeFile(filepath, JSON.stringify(diagnosis, null, 2));
      
      logger.info(`💾 [CONTEXTO] Relatório de diagnóstico salvo: ${filename}`);
      
      // Manter apenas os 10 relatórios mais recentes
      await this.cleanupOldReports(resultsPath);
      
      return filepath;
      
    } catch (error) {
      logger.error('❌ [CONTEXTO] Falha ao salvar relatório:', error.message);
      return null;
    }
  }

  async cleanupOldReports(reportsDir) {
    try {
      const files = await fs.readdir(reportsDir);
      const diagnosticFiles = files
        .filter(f => f.startsWith('diagnostic-report-'))
        .map(f => ({
          name: f,
          path: path.join(reportsDir, f),
          timestamp: parseInt(f.match(/diagnostic-report-(\d+)\.json/)?.[1] || '0')
        }))
        .sort((a, b) => b.timestamp - a.timestamp);

      if (diagnosticFiles.length > 10) {
        const filesToDelete = diagnosticFiles.slice(10);
        for (const file of filesToDelete) {
          await fs.unlink(file.path);
        }
        logger.info(`🗑️ [CONTEXTO] Removidos ${filesToDelete.length} relatórios antigos`);
      }
    } catch (error) {
      logger.warn('[CONTEXTO] Falha na limpeza de relatórios antigos:', error.message);
    }
  }

  /**
   * Gerar relatório de recomendações
   */
  generateRecommendationsReport(diagnosis) {
    const recommendations = {
      immediate_actions: [],
      short_term_actions: [],
      monitoring_suggestions: [],
      optimization_opportunities: []
    };

    // Analisar cada componente
    if (diagnosis.components.instagram?.decision?.issues) {
      diagnosis.components.instagram.decision.issues.forEach(issue => {
        if (issue.remediation) {
          recommendations.immediate_actions.push({
            component: 'Instagram',
            action: issue.remediation,
            reason: issue.details
          });
        }
      });
    }

    // Adicionar recomendações baseadas na saúde geral
    if (diagnosis.overall_health?.priority_actions) {
      diagnosis.overall_health.priority_actions.forEach(action => {
        const category = action.urgency === 'immediate' ? 'immediate_actions' : 'short_term_actions';
        recommendations[category].push({
          component: action.component,
          action: action.action,
          priority: action.priority
        });
      });
    }

    // Sugestões de monitoramento
    recommendations.monitoring_suggestions.push(
      'Monitor Instagram posting success rate',
      'Track approval-to-post latency',
      'Monitor database performance metrics',
      'Set up alerts for failed Instagram connections'
    );

    // Oportunidades de otimização
    recommendations.optimization_opportunities.push(
      'Implement automated retry mechanism for failed posts',
      'Add queue system for handling high-volume approvals',
      'Implement real-time dashboard for monitoring',
      'Add comprehensive logging and alerting system'
    );

    return recommendations;
  }

  /**
   * Executar teste de publicação controlada
   */
  async executeControlledPostingTest() {
    logger.info('🧪 [CONTEXTO] Iniciando teste controlado de publicação...');
    
    try {
      // Buscar uma denúncia aprovada sem post
      const testDenuncia = await this.prisma.denuncia.findFirst({
        where: {
          aprovado: true,
          instagramPostId: null,
          imagePath: { not: null }
        },
        include: {
          vereadores: true
        }
      });

      if (!testDenuncia) {
        return {
          success: false,
          message: 'No approved posts available for testing',
          recommendation: 'Create test data or approve existing denuncias'
        };
      }

      // Executar teste de publicação
      const result = await instagramService.publicar({
        texto: testDenuncia.texto,
        imagem: testDenuncia.imagePath,
        vereadores: testDenuncia.vereadores
      });

      if (result.success) {
        // Atualizar denúncia com ID do post
        await this.prisma.denuncia.update({
          where: { id: testDenuncia.id },
          data: { 
            instagramPostId: result.postId,
            instagramUrl: result.postUrl
          }
        });

        logger.info('✅ [CONTEXTO] Teste de publicação bem-sucedido');
        return {
          success: true,
          postId: result.postId,
          postUrl: result.postUrl,
          testDenunciaId: testDenuncia.id,
          processingTime: result.processingTime
        };
      } else {
        logger.error('❌ [CONTEXTO] Teste de publicação falhou:', result.error);
        return {
          success: false,
          error: result.error,
          testDenunciaId: testDenuncia.id
        };
      }

    } catch (error) {
      logger.error('❌ [CONTEXTO] Falha no teste controlado:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Limpar recursos
   */
  async cleanup() {
    try {
      await this.prisma.$disconnect();
      logger.info('🧹 [CONTEXTO] Recursos limpos com sucesso');
    } catch (error) {
      logger.error('❌ [CONTEXTO] Falha na limpeza de recursos:', error.message);
    }
  }
}

module.exports = ContextualDiagnostics;