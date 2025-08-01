/**
 * Status Validator - Validação e controle de transições de status
 * Garante consistência nas mudanças de estado das denúncias
 */

const { CONFIG } = require('../config/constants');
const logger = require('./logger');

class StatusValidator {
  constructor() {
    this.statusDenuncia = CONFIG.STATUS_DENUNCIA;
    this.statusTransicoes = CONFIG.STATUS_TRANSICOES;
    this.statusRepublicaveis = CONFIG.STATUS_REPUBLICAVEIS;
    this.statusFinais = CONFIG.STATUS_FINAIS;
  }

  /**
   * Validar se uma transição de status é permitida
   */
  isValidTransition(statusAtual, novoStatus) {
    // Se não houver status atual, permitir qualquer status inicial
    if (!statusAtual) {
      const statusIniciais = ['RECEBIDA', 'PROCESSANDO'];
      return statusIniciais.includes(novoStatus);
    }

    // Verificar se o status atual existe na configuração
    if (!this.statusTransicoes[statusAtual]) {
      logger.warn(`[STATUS_VALIDATOR] Status atual não reconhecido: ${statusAtual}`);
      return false;
    }

    // Verificar se a transição é permitida
    const transicoesPermitidas = this.statusTransicoes[statusAtual];
    const isValid = transicoesPermitidas.includes(novoStatus);

    if (!isValid) {
      logger.warn(`[STATUS_VALIDATOR] Transição inválida: ${statusAtual} → ${novoStatus}`, {
        transicoesPermitidas,
        statusAtual,
        novoStatus
      });
    }

    return isValid;
  }

  /**
   * Validar se um status existe na configuração
   */
  isValidStatus(status) {
    return Object.values(this.statusDenuncia).includes(status);
  }

  /**
   * Verificar se um status permite republicação
   */
  canBeRepublished(status) {
    return this.statusRepublicaveis.includes(status);
  }

  /**
   * Verificar se um status é final (não permite mais alterações)
   */
  isFinalStatus(status) {
    return this.statusFinais.includes(status);
  }

  /**
   * Obter próximos status possíveis para um status atual
   */
  getNextValidStatuses(statusAtual) {
    if (!statusAtual || !this.statusTransicoes[statusAtual]) {
      return [];
    }

    return this.statusTransicoes[statusAtual];
  }

  /**
   * Categorizar status por tipo
   */
  getStatusCategory(status) {
    if (!this.isValidStatus(status)) {
      return 'unknown';
    }

    const iniciais = ['RECEBIDA', 'PROCESSANDO'];
    const processamento = [
      'APROVADA_BOT', 'APROVADA_ADMIN', 'PENDENTE_MODERACAO', 
      'REJEITADA_BOT', 'REJEITADA_ADMIN'
    ];
    const publicacao = ['AGENDADA', 'PUBLICANDO', 'PUBLICADA'];
    const erros = [
      'ERRO', 'ERRO_PUBLICACAO', 'BAIRRO_INVALIDO', 'TEXTO_INVALIDO', 
      'NAO_ENCONTRADA', 'TIMEOUT_PUBLICACAO', 'FALHA_INSTAGRAM', 
      'AGUARDANDO_RATE_LIMIT'
    ];

    if (iniciais.includes(status)) return 'initial';
    if (processamento.includes(status)) return 'processing';
    if (publicacao.includes(status)) return 'publishing';
    if (erros.includes(status)) return 'error';

    return 'unknown';
  }

  /**
   * Verificar se pode processar uma denúncia baseado no status
   */
  canProcess(status) {
    const processableStatuses = [
      'RECEBIDA',
      'ERRO', // Permite reprocessamento após erro
      'BAIRRO_INVALIDO', // Após correção de bairro
      'TEXTO_INVALIDO' // Após correção de texto
    ];

    return processableStatuses.includes(status);
  }

  /**
   * Verificar se pode publicar uma denúncia baseado no status
   */
  canPublish(status) {
    return this.statusRepublicaveis.includes(status);
  }

  /**
   * Obter próximo status recomendado baseado no contexto
   */
  getRecommendedNextStatus(statusAtual, context = {}) {
    const validStatuses = this.getNextValidStatuses(statusAtual);
    
    if (validStatuses.length === 0) {
      return null;
    }

    // Lógica de recomendação baseada no contexto
    if (context.erro) {
      const errorStatuses = validStatuses.filter(s => this.getStatusCategory(s) === 'error');
      if (errorStatuses.length > 0) {
        return errorStatuses[0];
      }
    }

    if (context.aprovado === true) {
      const approvedStatuses = validStatuses.filter(s => 
        ['APROVADA_BOT', 'APROVADA_ADMIN'].includes(s)
      );
      if (approvedStatuses.length > 0) {
        return approvedStatuses[0];
      }
    }

    if (context.aprovado === false) {
      const rejectedStatuses = validStatuses.filter(s => 
        ['REJEITADA_BOT', 'REJEITADA_ADMIN', 'PENDENTE_MODERACAO'].includes(s)
      );
      if (rejectedStatuses.length > 0) {
        return rejectedStatuses[0];
      }
    }

    if (context.publicar === true) {
      const publishStatuses = validStatuses.filter(s => 
        ['AGENDADA', 'PUBLICANDO'].includes(s)
      );
      if (publishStatuses.length > 0) {
        return publishStatuses[0];
      }
    }

    // Retornar primeiro status válido como fallback
    return validStatuses[0];
  }

  /**
   * Validar mudança de status com logging detalhado
   */
  validateStatusChange(denunciaId, statusAtual, novoStatus, context = {}) {
    const validation = {
      valid: false,
      reason: '',
      warnings: [],
      recommendations: []
    };

    // Verificar se novo status é válido
    if (!this.isValidStatus(novoStatus)) {
      validation.reason = `Status '${novoStatus}' não existe na configuração`;
      return validation;
    }

    // Verificar se transição é permitida
    if (!this.isValidTransition(statusAtual, novoStatus)) {
      validation.reason = `Transição ${statusAtual} → ${novoStatus} não é permitida`;
      validation.recommendations.push(`Status válidos: ${this.getNextValidStatuses(statusAtual).join(', ')}`);
      return validation;
    }

    // Verificar se está tentando alterar status final
    if (statusAtual && this.isFinalStatus(statusAtual)) {
      validation.warnings.push(`Status atual '${statusAtual}' é final e geralmente não deve ser alterado`);
    }

    // Validação específica por contexto
    if (context.forceValidation && statusAtual === novoStatus) {
      validation.reason = 'Novo status igual ao status atual';
      return validation;
    }

    validation.valid = true;
    validation.reason = 'Transição válida';

    // Log da validação
    logger.info(`[STATUS_VALIDATOR] Validação de status para denúncia ${denunciaId}`, {
      statusAtual,
      novoStatus,
      valid: validation.valid,
      category: this.getStatusCategory(novoStatus)
    });

    return validation;
  }

  /**
   * Obter estatísticas de status do sistema
   */
  getStatusStatistics() {
    return {
      totalStatuses: Object.keys(this.statusDenuncia).length,
      categories: {
        initial: Object.values(this.statusDenuncia).filter(s => this.getStatusCategory(s) === 'initial').length,
        processing: Object.values(this.statusDenuncia).filter(s => this.getStatusCategory(s) === 'processing').length,
        publishing: Object.values(this.statusDenuncia).filter(s => this.getStatusCategory(s) === 'publishing').length,
        error: Object.values(this.statusDenuncia).filter(s => this.getStatusCategory(s) === 'error').length
      },
      finalStatuses: this.statusFinais.length,
      republicableStatuses: this.statusRepublicaveis.length,
      totalTransitions: Object.keys(this.statusTransicoes).reduce((acc, key) => 
        acc + this.statusTransicoes[key].length, 0
      )
    };
  }

  /**
   * Exportar mapa de status para documentação
   */
  exportStatusMap() {
    return {
      statuses: this.statusDenuncia,
      transitions: this.statusTransicoes,
      categories: {
        initial: ['RECEBIDA', 'PROCESSANDO'],
        processing: ['APROVADA_BOT', 'APROVADA_ADMIN', 'PENDENTE_MODERACAO', 'REJEITADA_BOT', 'REJEITADA_ADMIN'],
        publishing: ['AGENDADA', 'PUBLICANDO', 'PUBLICADA'],
        error: ['ERRO', 'ERRO_PUBLICACAO', 'BAIRRO_INVALIDO', 'TEXTO_INVALIDO', 'NAO_ENCONTRADA', 'TIMEOUT_PUBLICACAO', 'FALHA_INSTAGRAM', 'AGUARDANDO_RATE_LIMIT']
      },
      rules: {
        finalStatuses: this.statusFinais,
        republicableStatuses: this.statusRepublicaveis
      }
    };
  }
}

// Singleton instance
const statusValidator = new StatusValidator();

module.exports = statusValidator;