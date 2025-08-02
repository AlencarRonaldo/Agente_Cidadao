/**
 * Flow Correction Engine - Sistema de Correção Automática
 * Corrige automaticamente problemas no fluxo WhatsApp→Instagram
 * @author Sistema Bot Denúncia
 */

const logger = require('../utils/logger');
const ContextualDiagnostics = require('./contextualDiagnostics');
const instagramApiManager = require('./instagramApiManager');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs').promises;
const path = require('path');

class FlowCorrectionEngine {
  constructor() {
    this.prisma = new PrismaClient();
    this.diagnostics = new ContextualDiagnostics();
    this.correctionHistory = [];
    this.retryAttempts = new Map();
    this.maxRetries = 3;
    
    logger.info('🔧 [CORREÇÃO] Flow Correction Engine inicializado');
  }

  /**
   * Executar correção automática do fluxo
   */
  async executeAutoCorrection() {
    logger.info('🚀 [CORREÇÃO] Iniciando correção automática do fluxo...');
    
    const startTime = Date.now();
    const correctionResult = {
      timestamp: new Date().toISOString(),
      phases: {},
      summary: {},
      actions_taken: []
    };

    try {
      // FASE 1: Diagnóstico completo
      logger.info('📊 [CORREÇÃO] FASE 1: Executando diagnóstico completo...');
      correctionResult.phases.diagnosis = await this.diagnostics.executeDiagnosis();
      
      // FASE 2: Identificar problemas corrigíveis
      logger.info('🔍 [CORREÇÃO] FASE 2: Identificando problemas corrigíveis...');
      correctionResult.phases.problem_identification = await this.identifyCorrectableProblems(correctionResult.phases.diagnosis);
      
      // FASE 3: Aplicar correções
      logger.info('⚡ [CORREÇÃO] FASE 3: Aplicando correções automáticas...');
      correctionResult.phases.corrections = await this.applyAutomaticCorrections(correctionResult.phases.problem_identification);
      
      // FASE 4: Processar posts pendentes
      logger.info('📤 [CORREÇÃO] FASE 4: Processando posts pendentes...');
      correctionResult.phases.pending_processing = await this.processPendingPosts();
      
      // FASE 5: Validação pós-correção
      logger.info('✅ [CORREÇÃO] FASE 5: Validando correções aplicadas...');
      correctionResult.phases.validation = await this.validateCorrections();
      
      // Compilar sumário
      correctionResult.summary = this.compileCorrectionSummary(correctionResult.phases);
      correctionResult.processing_time_ms = Date.now() - startTime;
      
      // Salvar resultado
      await this.saveCorrectionReport(correctionResult);
      
      logger.info(`🎯 [CORREÇÃO] Correção automática concluída em ${correctionResult.processing_time_ms}ms`);
      logger.info(`📈 [CORREÇÃO] Resultado: ${correctionResult.summary.status} - ${correctionResult.summary.corrections_applied} correções aplicadas`);
      
      return correctionResult;
      
    } catch (error) {
      logger.error('❌ [CORREÇÃO] Falha na correção automática:', error.message);
      correctionResult.error = {
        message: error.message,
        stack: error.stack,
        processing_time_ms: Date.now() - startTime
      };
      return correctionResult;
    }
  }

  /**
   * Identificar problemas que podem ser corrigidos automaticamente
   */
  async identifyCorrectableProblems(diagnosis) {
    const correctableProblems = {
      instagram_issues: [],
      data_issues: [],
      system_issues: [],
      pending_operations: []
    };

    try {
      // Analisar problemas do Instagram
      if (diagnosis.components?.instagram?.decision?.issues) {
        diagnosis.components.instagram.decision.issues.forEach(issue => {
          if (this.isCorrectableInstagramIssue(issue)) {
            correctableProblems.instagram_issues.push({
              type: issue.component,
              issue: issue.issue,
              context: issue.context,
              remediation: issue.remediation,
              auto_correctable: true
            });
          }
        });
      }

      // Analisar posts pendentes
      if (diagnosis.components?.approval_flow?.approval_events?.data?.pending_posts > 0) {
        correctableProblems.pending_operations.push({
          type: 'pending_posts',
          count: diagnosis.components.approval_flow.approval_events.data.pending_posts,
          action: 'process_pending_posts',
          auto_correctable: true
        });
      }

      // Analisar problemas de dados
      if (diagnosis.components?.approval_flow?.data_flow?.context === 'data_incomplete') {
        correctableProblems.data_issues.push({
          type: 'incomplete_data',
          details: diagnosis.components.approval_flow.data_flow.data,
          action: 'validate_and_fix_data',
          auto_correctable: true
        });
      }

      // Analisar problemas do sistema
      if (diagnosis.components?.file_system?.uploads_directory?.status === 'inaccessible') {
        correctableProblems.system_issues.push({
          type: 'uploads_directory_inaccessible',
          path: diagnosis.components.file_system.uploads_directory.path,
          action: 'create_directory',
          auto_correctable: true
        });
      }

      const totalProblems = Object.values(correctableProblems).reduce((sum, arr) => sum + arr.length, 0);
      logger.info(`🔍 [CORREÇÃO] Identificados ${totalProblems} problemas corrigíveis`);

      return {
        status: 'analyzed',
        problems: correctableProblems,
        total_correctable: totalProblems,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('❌ [CORREÇÃO] Falha na identificação de problemas:', error.message);
      return {
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Verificar se um problema do Instagram é corrigível automaticamente
   */
  isCorrectableInstagramIssue(issue) {
    const correctableIssues = [
      'not_logged_in',
      'session_expired',
      'missing_session',
      'connection_degraded'
    ];
    
    return correctableIssues.includes(issue.context);
  }

  /**
   * Aplicar correções automáticas
   */
  async applyAutomaticCorrections(problemIdentification) {
    const corrections = {
      applied: [],
      failed: [],
      skipped: []
    };

    try {
      const { problems } = problemIdentification;

      // Corrigir problemas do Instagram
      for (const issue of problems.instagram_issues) {
        const correctionResult = await this.correctInstagramIssue(issue);
        if (correctionResult.success) {
          corrections.applied.push(correctionResult);
        } else {
          corrections.failed.push(correctionResult);
        }
      }

      // Corrigir problemas de sistema
      for (const issue of problems.system_issues) {
        const correctionResult = await this.correctSystemIssue(issue);
        if (correctionResult.success) {
          corrections.applied.push(correctionResult);
        } else {
          corrections.failed.push(correctionResult);
        }
      }

      // Corrigir problemas de dados
      for (const issue of problems.data_issues) {
        const correctionResult = await this.correctDataIssue(issue);
        if (correctionResult.success) {
          corrections.applied.push(correctionResult);
        } else {
          corrections.failed.push(correctionResult);
        }
      }

      logger.info(`⚡ [CORREÇÃO] Aplicadas ${corrections.applied.length} correções, ${corrections.failed.length} falharam`);

      return {
        status: 'completed',
        corrections,
        summary: {
          applied: corrections.applied.length,
          failed: corrections.failed.length,
          skipped: corrections.skipped.length
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('❌ [CORREÇÃO] Falha na aplicação de correções:', error.message);
      return {
        status: 'failed',
        error: error.message,
        corrections,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Corrigir problema específico do Instagram
   */
  async correctInstagramIssue(issue) {
    logger.info(`🔧 [CORREÇÃO] Corrigindo problema Instagram: ${issue.type}`);
    
    try {
      switch (issue.context) {
        case 'not_logged_in':
        case 'session_expired':
        case 'missing_session':
          const connectionTest = await instagramApiManager.testConnection();
          if (connectionTest.success) {
            return {
              success: true,
              action: 'instagram_connection_verified',
              details: `Connection verified using ${connectionTest.apiType} API`,
              issue_type: issue.type,
              apiType: connectionTest.apiType
            };
          } else {
            throw new Error(`Failed to verify Instagram connection: ${connectionTest.error}`);
          }

        case 'connection_degraded':
          const apiStatus = await instagramApiManager.getApiStatus();
          if (apiStatus.healthScore >= 50) {
            return {
              success: true,
              action: 'api_status_healthy',
              details: 'Instagram connection restored',
              issue_type: issue.type
            };
          } else {
            throw new Error('Connection test failed: ' + testResult.message);
          }

        default:
          return {
            success: false,
            action: 'unsupported_correction',
            error: `No automatic correction available for: ${issue.context}`,
            issue_type: issue.type
          };
      }

    } catch (error) {
      logger.error(`❌ [CORREÇÃO] Falha na correção Instagram (${issue.type}):`, error.message);
      return {
        success: false,
        action: 'correction_failed',
        error: error.message,
        issue_type: issue.type
      };
    }
  }

  /**
   * Corrigir problema do sistema
   */
  async correctSystemIssue(issue) {
    logger.info(`🔧 [CORREÇÃO] Corrigindo problema do sistema: ${issue.type}`);
    
    try {
      switch (issue.action) {
        case 'create_directory':
          await fs.mkdir(issue.path, { recursive: true });
          return {
            success: true,
            action: 'directory_created',
            details: `Directory created: ${issue.path}`,
            issue_type: issue.type
          };

        default:
          return {
            success: false,
            action: 'unsupported_system_correction',
            error: `No automatic correction available for: ${issue.action}`,
            issue_type: issue.type
          };
      }

    } catch (error) {
      logger.error(`❌ [CORREÇÃO] Falha na correção do sistema (${issue.type}):`, error.message);
      return {
        success: false,
        action: 'system_correction_failed',
        error: error.message,
        issue_type: issue.type
      };
    }
  }

  /**
   * Corrigir problema de dados
   */
  async correctDataIssue(issue) {
    logger.info(`🔧 [CORREÇÃO] Corrigindo problema de dados: ${issue.type}`);
    
    try {
      switch (issue.action) {
        case 'validate_and_fix_data':
          const fixResult = await this.validateAndFixIncompleteData();
          return {
            success: fixResult.success,
            action: 'data_validation_fix',
            details: fixResult.details,
            issue_type: issue.type
          };

        default:
          return {
            success: false,
            action: 'unsupported_data_correction',
            error: `No automatic correction available for: ${issue.action}`,
            issue_type: issue.type
          };
      }

    } catch (error) {
      logger.error(`❌ [CORREÇÃO] Falha na correção de dados (${issue.type}):`, error.message);
      return {
        success: false,
        action: 'data_correction_failed',
        error: error.message,
        issue_type: issue.type
      };
    }
  }

  /**
   * Validar e corrigir dados incompletos
   */
  async validateAndFixIncompleteData() {
    try {
      // Buscar denúncias aprovadas com dados incompletos
      const incompleteRecords = await this.prisma.denuncia.findMany({
        where: {
          aprovado: true,
          instagramPostId: null,
          OR: [
            { texto: null },
            { texto: '' },
            { imagePath: null }
          ]
        },
        take: 10
      });

      let fixedCount = 0;
      let skippedCount = 0;

      for (const record of incompleteRecords) {
        let needsUpdate = false;
        const updates = {};

        // Corrigir texto vazio
        if (!record.texto || record.texto.trim() === '') {
          updates.texto = `Denúncia cidadã registrada em ${new Date(record.createdAt).toLocaleDateString()}`;
          needsUpdate = true;
        }

        // Para imagens faltantes, não podemos corrigir automaticamente
        if (!record.imagePath) {
          logger.warn(`[CORREÇÃO] Denúncia ${record.id} sem imagem - não pode ser corrigida automaticamente`);
          skippedCount++;
          continue;
        }

        if (needsUpdate) {
          await this.prisma.denuncia.update({
            where: { id: record.id },
            data: updates
          });
          fixedCount++;
        }
      }

      return {
        success: true,
        details: `Fixed ${fixedCount} records, skipped ${skippedCount} records (missing images)`
      };

    } catch (error) {
      return {
        success: false,
        details: error.message
      };
    }
  }

  /**
   * Processar posts pendentes com retry inteligente
   */
  async processPendingPosts() {
    logger.info('📤 [CORREÇÃO] Processando posts pendentes...');
    
    try {
      // Buscar posts aprovados pendentes
      const pendingPosts = await this.prisma.denuncia.findMany({
        where: {
          aprovado: true,
          instagramPostId: null,
          texto: { not: null },
          imagePath: { not: null }
        },
        include: {
          vereadores: true
        },
        orderBy: { updatedAt: 'asc' },
        take: 5 // Processar máximo 5 por vez para evitar rate limits
      });

      const results = {
        processed: [],
        failed: [],
        skipped: []
      };

      for (const post of pendingPosts) {
        const postResult = await this.processIndividualPost(post);
        
        if (postResult.success) {
          results.processed.push(postResult);
        } else {
          results.failed.push(postResult);
        }

        // Delay entre posts para respeitar rate limits
        if (pendingPosts.indexOf(post) < pendingPosts.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 30000)); // 30 segundos
        }
      }

      logger.info(`📤 [CORREÇÃO] Posts processados: ${results.processed.length} sucesso, ${results.failed.length} falha`);

      return {
        status: 'completed',
        results,
        summary: {
          total_pending: pendingPosts.length,
          processed: results.processed.length,
          failed: results.failed.length,
          skipped: results.skipped.length
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('❌ [CORREÇÃO] Falha no processamento de posts pendentes:', error.message);
      return {
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Processar post individual com retry
   */
  async processIndividualPost(denuncia) {
    const postKey = `denuncia_${denuncia.id}`;
    const currentRetries = this.retryAttempts.get(postKey) || 0;

    if (currentRetries >= this.maxRetries) {
      logger.warn(`⚠️ [CORREÇÃO] Máximo de tentativas excedido para denúncia ${denuncia.id}`);
      return {
        success: false,
        denunciaId: denuncia.id,
        error: 'Maximum retry attempts exceeded',
        retries: currentRetries
      };
    }

    try {
      logger.info(`📤 [CORREÇÃO] Processando denúncia ${denuncia.id} (tentativa ${currentRetries + 1}/${this.maxRetries})`);

      // Verificar se arquivo de imagem existe
      try {
        await fs.access(denuncia.imagePath);
      } catch {
        logger.error(`❌ [CORREÇÃO] Arquivo de imagem não encontrado: ${denuncia.imagePath}`);
        return {
          success: false,
          denunciaId: denuncia.id,
          error: 'Image file not found',
          imagePath: denuncia.imagePath
        };
      }

      // Publicar no Instagram usando API Manager
      const publishResult = await instagramApiManager.publicar({
        texto: denuncia.texto,
        imagem: denuncia.imagePath,
        vereadores: denuncia.vereadores,
        bairro: denuncia.bairro
      });

      if (publishResult.success) {
        // Atualizar denúncia com dados do post
        await this.prisma.denuncia.update({
          where: { id: denuncia.id },
          data: {
            instagramPostId: publishResult.postId,
            instagramUrl: publishResult.postUrl,
            publishedAt: new Date()
          }
        });

        // Limpar contador de tentativas
        this.retryAttempts.delete(postKey);

        logger.info(`✅ [CORREÇÃO] Denúncia ${denuncia.id} publicada com sucesso: ${publishResult.postId}`);
        
        return {
          success: true,
          denunciaId: denuncia.id,
          postId: publishResult.postId,
          postUrl: publishResult.postUrl,
          processingTime: publishResult.processingTime,
          retries: currentRetries
        };

      } else {
        // Incrementar contador de tentativas
        this.retryAttempts.set(postKey, currentRetries + 1);
        
        logger.error(`❌ [CORREÇÃO] Falha na publicação da denúncia ${denuncia.id}:`, publishResult.error);
        
        return {
          success: false,
          denunciaId: denuncia.id,
          error: publishResult.error,
          retries: currentRetries + 1,
          willRetry: currentRetries + 1 < this.maxRetries
        };
      }

    } catch (error) {
      // Incrementar contador de tentativas
      this.retryAttempts.set(postKey, currentRetries + 1);
      
      logger.error(`❌ [CORREÇÃO] Erro no processamento da denúncia ${denuncia.id}:`, error.message);
      
      return {
        success: false,
        denunciaId: denuncia.id,
        error: error.message,
        retries: currentRetries + 1,
        willRetry: currentRetries + 1 < this.maxRetries
      };
    }
  }

  /**
   * Validar correções aplicadas
   */
  async validateCorrections() {
    logger.info('✅ [CORREÇÃO] Validando correções aplicadas...');
    
    try {
      // Executar diagnóstico rápido pós-correção
      const postCorrectionDiagnosis = await this.diagnostics.diagnoseInstagramContext();
      
      // Verificar posts pendentes após processamento
      const remainingPending = await this.prisma.denuncia.count({
        where: {
          aprovado: true,
          instagramPostId: null
        }
      });

      // Testar conexão Instagram API Manager
      const connectionTest = await instagramApiManager.testConnection();

      const validation = {
        instagram_connection: {
          status: connectionTest.success ? 'healthy' : 'failed',
          details: connectionTest
        },
        remaining_pending_posts: remainingPending,
        post_correction_diagnosis: postCorrectionDiagnosis.decision,
        overall_health: this.calculatePostCorrectionHealth(postCorrectionDiagnosis, remainingPending)
      };

      logger.info(`✅ [CORREÇÃO] Validação concluída - Status: ${validation.overall_health.status}`);

      return {
        status: 'completed',
        validation,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('❌ [CORREÇÃO] Falha na validação pós-correção:', error.message);
      return {
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Calcular saúde do sistema pós-correção
   */
  calculatePostCorrectionHealth(instagramDiagnosis, remainingPending) {
    let healthScore = 100;
    const issues = [];

    // Penalizar por problemas do Instagram
    if (instagramDiagnosis.status !== 'healthy') {
      healthScore -= 30;
      issues.push('Instagram connection issues remain');
    }

    // Penalizar por posts pendentes
    if (remainingPending > 0) {
      healthScore -= Math.min(remainingPending * 5, 25);
      issues.push(`${remainingPending} posts still pending`);
    }

    let status = 'healthy';
    if (healthScore < 50) {
      status = 'critical';
    } else if (healthScore < 80) {
      status = 'degraded';
    }

    return {
      status,
      score: Math.max(healthScore, 0),
      issues,
      recommendation: this.generateHealthRecommendation(status, issues)
    };
  }

  /**
   * Gerar recomendação baseada na saúde pós-correção
   */
  generateHealthRecommendation(status, issues) {
    if (status === 'healthy') {
      return 'System is healthy - continue normal operations';
    } else if (status === 'degraded') {
      return 'System is partially recovered - monitor closely and address remaining issues';
    } else {
      return 'System requires manual intervention - automatic corrections were insufficient';
    }
  }

  /**
   * Compilar sumário da correção
   */
  compileCorrectionSummary(phases) {
    const summary = {
      status: 'completed',
      corrections_applied: 0,
      problems_resolved: 0,
      posts_processed: 0,
      remaining_issues: 0,
      success_rate: 0
    };

    try {
      // Contar correções aplicadas
      if (phases.corrections?.corrections?.applied) {
        summary.corrections_applied = phases.corrections.corrections.applied.length;
      }

      // Contar posts processados
      if (phases.pending_processing?.results?.processed) {
        summary.posts_processed = phases.pending_processing.results.processed.length;
      }

      // Contar problemas restantes
      if (phases.validation?.validation?.remaining_pending_posts) {
        summary.remaining_issues = phases.validation.validation.remaining_pending_posts;
      }

      // Calcular taxa de sucesso
      const totalProblems = phases.problem_identification?.total_correctable || 1;
      const resolvedProblems = summary.corrections_applied + summary.posts_processed;
      summary.success_rate = Math.round((resolvedProblems / totalProblems) * 100);

      // Determinar status geral
      if (phases.validation?.validation?.overall_health?.status === 'healthy') {
        summary.status = 'fully_resolved';
      } else if (summary.success_rate >= 70) {
        summary.status = 'mostly_resolved';
      } else if (summary.success_rate >= 30) {
        summary.status = 'partially_resolved';
      } else {
        summary.status = 'minimal_resolution';
      }

      return summary;

    } catch (error) {
      logger.error('❌ [CORREÇÃO] Falha na compilação do sumário:', error.message);
      return {
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * Salvar relatório de correção
   */
  async saveCorrectionReport(correctionResult) {
    try {
      const reportsPath = path.join(__dirname, '../../reports');
      await fs.mkdir(reportsPath, { recursive: true });
      
      const filename = `correction-report-${Date.now()}.json`;
      const filepath = path.join(reportsPath, filename);
      
      await fs.writeFile(filepath, JSON.stringify(correctionResult, null, 2));
      
      logger.info(`💾 [CORREÇÃO] Relatório de correção salvo: ${filename}`);
      
      // Manter apenas os 5 relatórios mais recentes
      await this.cleanupOldCorrectionReports(reportsPath);
      
      return filepath;
      
    } catch (error) {
      logger.error('❌ [CORREÇÃO] Falha ao salvar relatório de correção:', error.message);
      return null;
    }
  }

  async cleanupOldCorrectionReports(reportsDir) {
    try {
      const files = await fs.readdir(reportsDir);
      const correctionFiles = files
        .filter(f => f.startsWith('correction-report-'))
        .map(f => ({
          name: f,
          path: path.join(reportsDir, f),
          timestamp: parseInt(f.match(/correction-report-(\d+)\.json/)?.[1] || '0')
        }))
        .sort((a, b) => b.timestamp - a.timestamp);

      if (correctionFiles.length > 5) {
        const filesToDelete = correctionFiles.slice(5);
        for (const file of filesToDelete) {
          await fs.unlink(file.path);
        }
        logger.info(`🗑️ [CORREÇÃO] Removidos ${filesToDelete.length} relatórios antigos`);
      }
    } catch (error) {
      logger.warn('[CORREÇÃO] Falha na limpeza de relatórios antigos:', error.message);
    }
  }

  /**
   * Executar correção de emergência (modo simplificado)
   */
  async executeEmergencyCorrection() {
    logger.info('🚨 [CORREÇÃO] Executando correção de emergência...');
    
    try {
      // 1. Testar conexão Instagram API Manager
      const connectionTest = await instagramApiManager.testConnection();
      
      // 2. Processar 1 post pendente como teste
      const testPost = await this.prisma.denuncia.findFirst({
        where: {
          aprovado: true,
          instagramPostId: null,
          texto: { not: null },
          imagePath: { not: null }
        },
        include: { vereadores: true }
      });

      let testResult = null;
      if (testPost) {
        testResult = await this.processIndividualPost(testPost);
      }

      return {
        success: instagramInit && (testResult?.success !== false),
        instagram_initialized: instagramInit,
        test_post_result: testResult,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('❌ [CORREÇÃO] Falha na correção de emergência:', error.message);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Limpar recursos
   */
  async cleanup() {
    try {
      await this.diagnostics.cleanup();
      await this.prisma.$disconnect();
      logger.info('🧹 [CORREÇÃO] Recursos limpos com sucesso');
    } catch (error) {
      logger.error('❌ [CORREÇÃO] Falha na limpeza de recursos:', error.message);
    }
  }
}

module.exports = FlowCorrectionEngine;