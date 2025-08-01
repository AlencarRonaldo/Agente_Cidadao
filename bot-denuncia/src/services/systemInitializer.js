/**
 * System Initializer - Inicializador Completo do Sistema
 * Integra Master Flow Controller ao fluxo de aprovação existente
 * @author Sistema Bot Denúncia
 */

const logger = require('../utils/logger');
const MasterFlowController = require('./masterFlowController');

class SystemInitializer {
  constructor() {
    this.masterFlow = null;
    this.initialized = false;
    this.autoStart = process.env.AUTO_START_MASTER_FLOW !== 'false';
    
    logger.info('🚀 [INIT] System Initializer criado');
  }

  /**
   * Inicializar sistema completo
   */
  async initialize() {
    if (this.initialized) {
      logger.warn('⚠️ [INIT] Sistema já foi inicializado');
      return true;
    }

    logger.info('🎬 [INIT] Inicializando sistema completo...');

    try {
      // Criar instância do Master Flow Controller
      this.masterFlow = new MasterFlowController();

      // Inicializar o sistema
      const success = await this.masterFlow.initialize();

      if (success) {
        this.initialized = true;
        
        // Configurar integração com o fluxo de aprovação
        this.setupApprovalIntegration();
        
        logger.info('✅ [INIT] Sistema inicializado com sucesso!');
        logger.info('📊 [INIT] Status:', this.masterFlow.getSystemStatus().state.status);
        
        return true;
      } else {
        logger.error('❌ [INIT] Falha na inicialização do sistema');
        return false;
      }

    } catch (error) {
      logger.error('❌ [INIT] Erro durante inicialização:', error.message);
      this.initialized = false;
      return false;
    }
  }

  /**
   * Configurar integração com o fluxo de aprovação existente
   */
  setupApprovalIntegration() {
    logger.info('🔗 [INIT] Configurando integração com fluxo de aprovação...');

    // Interceptar aprovações para adicionar à fila automaticamente
    this.interceptApprovalFlow();

    // Configurar eventos de sistema
    this.setupSystemEvents();

    logger.info('✅ [INIT] Integração configurada com sucesso');
  }

  /**
   * Interceptar fluxo de aprovação
   */
  interceptApprovalFlow() {
    // Hook para o adminController
    try {
      const adminController = require('../controllers/adminController');
      
      // Interceptar aprovação individual
      if (adminController.aprovarDenuncia && !adminController._originalAprovarDenuncia) {
        adminController._originalAprovarDenuncia = adminController.aprovarDenuncia;
        
        // Interceptar método de aprovação individual
        adminController.aprovarDenuncia = async (req, res) => {
          try {
            // Executar aprovação original
            const result = await adminController._originalAprovarDenuncia(req, res);
            
            // Se aprovação foi bem-sucedida, adicionar à fila
            if (res.headersSent && res.statusCode === 200) {
              const denunciaId = req.params.id;
              
              // Adicionar à fila de posts com delay para garantir que a aprovação foi salva
              setTimeout(async () => {
                try {
                  const queueResult = await this.masterFlow.queueApprovedPost(denunciaId);
                  
                  if (queueResult.success) {
                    logger.info(`✅ [INIT] Denúncia ${denunciaId} adicionada automaticamente à fila (aprovação individual)`);
                  } else {
                    logger.warn(`⚠️ [INIT] Falha ao adicionar denúncia ${denunciaId} à fila:`, queueResult.error);
                  }
                } catch (error) {
                  logger.error(`❌ [INIT] Erro ao processar denúncia aprovada ${denunciaId}:`, error.message);
                }
              }, 2000); // 2 segundos de delay
            }
            
            return result;
          } catch (error) {
            logger.error('❌ [INIT] Erro no interceptor de aprovação individual:', error.message);
            throw error;
          }
        };
        
        logger.info('🎯 [INIT] Fluxo de aprovação individual interceptado com sucesso');
      }

      // Interceptar aprovação em lote
      if (adminController.acaoLote && !adminController._originalAcaoLote) {
        adminController._originalAcaoLote = adminController.acaoLote;
        
        // Interceptar método de aprovação em lote
        adminController.acaoLote = async (req, res) => {
          try {
            // Executar ação em lote original
            const result = await adminController._originalAcaoLote(req, res);
            
            // Se foi aprovação em lote bem-sucedida, adicionar à fila
            if (res.headersSent && res.statusCode === 200 && req.body.acao === 'aprovar') {
              const denunciaIds = req.body.ids;
              
              // Adicionar à fila de posts com delay para garantir que as aprovações foram salvas
              setTimeout(async () => {
                for (const denunciaId of denunciaIds) {
                  try {
                    const queueResult = await this.masterFlow.queueApprovedPost(denunciaId);
                    
                    if (queueResult.success) {
                      logger.info(`✅ [INIT] Denúncia ${denunciaId} adicionada automaticamente à fila (aprovação em lote)`);
                    } else {
                      logger.warn(`⚠️ [INIT] Falha ao adicionar denúncia ${denunciaId} à fila:`, queueResult.error);
                    }
                  } catch (error) {
                    logger.error(`❌ [INIT] Erro ao processar denúncia aprovada em lote ${denunciaId}:`, error.message);
                  }
                }
              }, 3000); // 3 segundos de delay para lote (mais tempo devido ao volume)
            }
            
            return result;
          } catch (error) {
            logger.error('❌ [INIT] Erro no interceptor de aprovação em lote:', error.message);
            throw error;
          }
        };
        
        logger.info('🎯 [INIT] Fluxo de aprovação em lote interceptado com sucesso');
      }
      
    } catch (error) {
      logger.warn('⚠️ [INIT] Não foi possível interceptar fluxo de aprovação:', error.message);
    }
  }

  /**
   * Configurar eventos do sistema
   */
  setupSystemEvents() {
    if (!this.masterFlow) return;

    // Eventos de sucesso
    this.masterFlow.on('postProcessed', (data) => {
      logger.info(`📤 [INIT] Post processado automaticamente: ${data.postId}`);
    });

    this.masterFlow.on('systemCorrected', (result) => {
      logger.info(`🔧 [INIT] Sistema corrigido automaticamente: ${result.summary?.corrections_applied || 0} correções`);
    });

    this.masterFlow.on('systemInitialized', (data) => {
      logger.info(`🎉 [INIT] Master Flow inicializado em ${data.initTime}ms`);
    });

    // Eventos de erro
    this.masterFlow.on('postFailed', (data) => {
      logger.error(`❌ [INIT] Falha no processamento automático: ${data.id} - ${data.error}`);
    });

    this.masterFlow.on('systemError', (error) => {
      logger.error(`🚨 [INIT] Erro do sistema:`, error.message);
    });

    this.masterFlow.on('systemCritical', (error) => {
      logger.error(`🚨 [INIT] SISTEMA CRÍTICO - Intervenção manual necessária:`, error.message);
    });

    logger.info('📡 [INIT] Eventos do sistema configurados');
  }

  /**
   * Obter status do sistema
   */
  getStatus() {
    if (!this.initialized || !this.masterFlow) {
      return {
        initialized: false,
        status: 'not_initialized',
        message: 'Sistema não foi inicializado'
      };
    }

    const systemStatus = this.masterFlow.getSystemStatus();
    
    return {
      initialized: true,
      status: systemStatus.state.status,
      uptime: systemStatus.uptime,
      components: systemStatus.state.componentsReady,
      metrics: systemStatus.operationMetrics,
      message: 'Sistema funcionando normalmente'
    };
  }

  /**
   * Reconfigurar sistema
   */
  async reconfigure(config) {
    if (!this.masterFlow) {
      throw new Error('Sistema não foi inicializado');
    }

    this.masterFlow.configure(config);
    logger.info('⚙️ [INIT] Sistema reconfigurado:', config);

    return true;
  }

  /**
   * Executar diagnóstico manual
   */
  async runDiagnosis() {
    if (!this.initialized || !this.masterFlow) {
      throw new Error('Sistema não foi inicializado');
    }

    logger.info('🔍 [INIT] Executando diagnóstico manual...');
    
    return await this.masterFlow.diagnostics.executeDiagnosis();
  }

  /**
   * Executar correção manual
   */
  async runCorrection() {
    if (!this.initialized || !this.masterFlow) {
      throw new Error('Sistema não foi inicializado');
    }

    logger.info('🔧 [INIT] Executando correção manual...');
    
    return await this.masterFlow.correctionEngine.executeAutoCorrection();
  }

  /**
   * Processar posts pendentes manualmente
   */
  async processQueue() {
    if (!this.initialized || !this.masterFlow) {
      throw new Error('Sistema não foi inicializado');
    }

    logger.info('📤 [INIT] Iniciando processamento manual da fila...');
    
    if (this.masterFlow.state.componentsReady.postQueue) {
      this.masterFlow.postQueue.startProcessing();
      return {
        success: true,
        message: 'Processamento da fila iniciado',
        queueLength: this.masterFlow.postQueue.queue.length
      };
    } else {
      throw new Error('Fila de posts não está disponível');
    }
  }

  /**
   * Shutdown graceful do sistema
   */
  async shutdown() {
    logger.info('🛑 [INIT] Iniciando shutdown do sistema...');

    if (this.masterFlow) {
      await this.masterFlow.shutdown();
      this.masterFlow = null;
    }

    this.initialized = false;
    
    logger.info('✅ [INIT] Shutdown completo');
  }

  /**
   * Reinicializar sistema
   */
  async restart() {
    logger.info('🔄 [INIT] Reinicializando sistema...');

    await this.shutdown();
    
    // Aguardar um pouco antes de reinicializar
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    return await this.initialize();
  }

  /**
   * Auto-inicializar se configurado
   */
  static async autoInitialize() {
    if (process.env.AUTO_START_MASTER_FLOW === 'false') {
      logger.info('📝 [INIT] Auto-inicialização desabilitada via configuração');
      return null;
    }

    logger.info('🚀 [INIT] Executando auto-inicialização...');

    const initializer = new SystemInitializer();
    const success = await initializer.initialize();

    if (success) {
      logger.info('✅ [INIT] Auto-inicialização bem-sucedida');
      
      // Registrar para cleanup durante shutdown da aplicação
      process.on('SIGINT', async () => {
        logger.info('🛑 [INIT] Recebido SIGINT - iniciando shutdown...');
        await initializer.shutdown();
        process.exit(0);
      });

      process.on('SIGTERM', async () => {
        logger.info('🛑 [INIT] Recebido SIGTERM - iniciando shutdown...');
        await initializer.shutdown();
        process.exit(0);
      });

      return initializer;
    } else {
      logger.error('❌ [INIT] Auto-inicialização falhou');
      return null;
    }
  }
}

// Instância global para uso no sistema
let globalInitializer = null;

/**
 * Obter instância global do inicializador
 */
function getGlobalInitializer() {
  return globalInitializer;
}

/**
 * Definir instância global do inicializador
 */
function setGlobalInitializer(initializer) {
  globalInitializer = initializer;
  return initializer;
}

module.exports = {
  SystemInitializer,
  getGlobalInitializer,
  setGlobalInitializer,
  autoInitialize: SystemInitializer.autoInitialize
};