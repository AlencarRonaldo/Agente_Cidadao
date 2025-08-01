/**
 * Serviço de Análise Inteligente de Denúncias
 * Detecta automaticamente problemas urbanos, localizações e gera captions otimizadas
 */

const logger = require('../utils/logger');

class SmartAnalysisService {
  constructor() {
    // Mapeamento de problemas urbanos com emojis
    this.problemasUrbanos = {
      // INFRAESTRUTURA VIÁRIA
      'buraco': { emoji: '🕳️', categoria: 'VIA_PUBLICA', prioridade: 'ALTA' },
      'cratera': { emoji: '🕳️', categoria: 'VIA_PUBLICA', prioridade: 'ALTA' },
      'buraco na rua': { emoji: '🕳️', categoria: 'VIA_PUBLICA', prioridade: 'ALTA' },
      'asfalto': { emoji: '🛣️', categoria: 'VIA_PUBLICA', prioridade: 'ALTA' },
      'pavimentação': { emoji: '🛣️', categoria: 'VIA_PUBLICA', prioridade: 'ALTA' },
      'calçada': { emoji: '🚶', categoria: 'VIA_PUBLICA', prioridade: 'MEDIA' },
      'calcada': { emoji: '🚶', categoria: 'VIA_PUBLICA', prioridade: 'MEDIA' },
      'meio fio': { emoji: '🚧', categoria: 'VIA_PUBLICA', prioridade: 'MEDIA' },
      'guia': { emoji: '🚧', categoria: 'VIA_PUBLICA', prioridade: 'MEDIA' },

      // ILUMINAÇÃO PÚBLICA
      'lampada': { emoji: '💡', categoria: 'ILUMINACAO', prioridade: 'ALTA' },
      'lâmpada': { emoji: '💡', categoria: 'ILUMINACAO', prioridade: 'ALTA' },
      'poste': { emoji: '💡', categoria: 'ILUMINACAO', prioridade: 'ALTA' },
      'luz': { emoji: '💡', categoria: 'ILUMINACAO', prioridade: 'ALTA' },
      'iluminação': { emoji: '💡', categoria: 'ILUMINACAO', prioridade: 'ALTA' },
      'iluminacao': { emoji: '💡', categoria: 'ILUMINACAO', prioridade: 'ALTA' },
      'escuro': { emoji: '🌙', categoria: 'ILUMINACAO', prioridade: 'ALTA' },

      // LIMPEZA URBANA
      'lixo': { emoji: '🗑️', categoria: 'LIMPEZA', prioridade: 'MEDIA' },
      'sujeira': { emoji: '🗑️', categoria: 'LIMPEZA', prioridade: 'MEDIA' },
      'entulho': { emoji: '🏗️', categoria: 'LIMPEZA', prioridade: 'MEDIA' },
      'coleta': { emoji: '🚛', categoria: 'LIMPEZA', prioridade: 'MEDIA' },
      'gari': { emoji: '🧹', categoria: 'LIMPEZA', prioridade: 'MEDIA' },
      'varrição': { emoji: '🧹', categoria: 'LIMPEZA', prioridade: 'MEDIA' },

      // TRÂNSITO E SINALIZAÇÃO
      'semaforo': { emoji: '🚦', categoria: 'TRANSITO', prioridade: 'ALTA' },
      'semáforo': { emoji: '🚦', categoria: 'TRANSITO', prioridade: 'ALTA' },
      'sinalização': { emoji: '🚦', categoria: 'TRANSITO', prioridade: 'ALTA' },
      'sinalizacao': { emoji: '🚦', categoria: 'TRANSITO', prioridade: 'ALTA' },
      'placa': { emoji: '🚧', categoria: 'TRANSITO', prioridade: 'MEDIA' },
      'faixa de pedestre': { emoji: '🚶‍♂️', categoria: 'TRANSITO', prioridade: 'ALTA' },
      'lombada': { emoji: '⚠️', categoria: 'TRANSITO', prioridade: 'MEDIA' },

      // ÁREAS VERDES E MEIO AMBIENTE
      'arvore': { emoji: '🌳', categoria: 'MEIO_AMBIENTE', prioridade: 'MEDIA' },
      'árvore': { emoji: '🌳', categoria: 'MEIO_AMBIENTE', prioridade: 'MEDIA' },
      'poda': { emoji: '✂️', categoria: 'MEIO_AMBIENTE', prioridade: 'MEDIA' },
      'praça': { emoji: '🏞️', categoria: 'MEIO_AMBIENTE', prioridade: 'MEDIA' },
      'praca': { emoji: '🏞️', categoria: 'MEIO_AMBIENTE', prioridade: 'MEDIA' },
      'parque': { emoji: '🏞️', categoria: 'MEIO_AMBIENTE', prioridade: 'MEDIA' },
      'jardim': { emoji: '🌿', categoria: 'MEIO_AMBIENTE', prioridade: 'MEDIA' },

      // SANEAMENTO
      'esgoto': { emoji: '🚰', categoria: 'SANEAMENTO', prioridade: 'ALTA' },
      'água': { emoji: '💧', categoria: 'SANEAMENTO', prioridade: 'ALTA' },
      'agua': { emoji: '💧', categoria: 'SANEAMENTO', prioridade: 'ALTA' },
      'cano': { emoji: '🔧', categoria: 'SANEAMENTO', prioridade: 'ALTA' },
      'vazamento': { emoji: '💧', categoria: 'SANEAMENTO', prioridade: 'ALTA' },
      'bueiro': { emoji: '🕳️', categoria: 'SANEAMENTO', prioridade: 'MEDIA' },
      'bocas de lobo': { emoji: '🕳️', categoria: 'SANEAMENTO', prioridade: 'MEDIA' },

      // SEGURANÇA PÚBLICA
      'segurança': { emoji: '👮', categoria: 'SEGURANCA', prioridade: 'ALTA' },
      'seguranca': { emoji: '👮', categoria: 'SEGURANCA', prioridade: 'ALTA' },
      'roubo': { emoji: '🚨', categoria: 'SEGURANCA', prioridade: 'ALTA' },
      'furto': { emoji: '🚨', categoria: 'SEGURANCA', prioridade: 'ALTA' },
      'violência': { emoji: '🚨', categoria: 'SEGURANCA', prioridade: 'ALTA' },
      'violencia': { emoji: '🚨', categoria: 'SEGURANCA', prioridade: 'ALTA' },

      // TRANSPORTE PÚBLICO
      'ônibus': { emoji: '🚌', categoria: 'TRANSPORTE', prioridade: 'MEDIA' },
      'onibus': { emoji: '🚌', categoria: 'TRANSPORTE', prioridade: 'MEDIA' },
      'ponto de ônibus': { emoji: '🚏', categoria: 'TRANSPORTE', prioridade: 'MEDIA' },
      'parada': { emoji: '🚏', categoria: 'TRANSPORTE', prioridade: 'MEDIA' },

      // CONSTRUÇÃO E OBRAS
      'obra': { emoji: '🏗️', categoria: 'CONSTRUCAO', prioridade: 'MEDIA' },
      'construção': { emoji: '🏗️', categoria: 'CONSTRUCAO', prioridade: 'MEDIA' },
      'construcao': { emoji: '🏗️', categoria: 'CONSTRUCAO', prioridade: 'MEDIA' },
      'reforma': { emoji: '🔨', categoria: 'CONSTRUCAO', prioridade: 'MEDIA' },

      // PROBLEMAS GERAIS
      'problema': { emoji: '⚠️', categoria: 'GERAL', prioridade: 'MEDIA' },
      'defeito': { emoji: '⚠️', categoria: 'GERAL', prioridade: 'MEDIA' },
      'danificado': { emoji: '⚠️', categoria: 'GERAL', prioridade: 'MEDIA' },
      'quebrado': { emoji: '💥', categoria: 'GERAL', prioridade: 'MEDIA' },
      'abandono': { emoji: '🏚️', categoria: 'GERAL', prioridade: 'MEDIA' }
    };

    // Mapeamento de bairros com regiões administrativas
    this.regioesBairros = {
      // REGIÃO CENTRO
      'CENTRO': {
        nome: 'CENTRO',
        regiao: 'CENTRO',
        hashtag: '#CentroSBC',
        vereadores: ['@perycartola', '@danilolimasbc', '@julinho.fuzari']
      },
      'JARDIM DO MAR': {
        nome: 'JARDIM_DO_MAR',
        regiao: 'CENTRO',
        hashtag: '#JardimDoMarSBC',
        vereadores: ['@perycartola', '@danilolimasbc']
      },
      'VILA GONÇALVES': {
        nome: 'VILA_GONCALVES',
        regiao: 'CENTRO',
        hashtag: '#VilaGoncalvesSBC',
        vereadores: ['@perycartola', '@julinho.fuzari']
      },

      // REGIÃO NORTE
      'ASSUNÇÃO': {
        nome: 'ASSUNCAO',
        regiao: 'NORTE',
        hashtag: '#AssuncaoSBC',
        vereadores: ['@joaovianasbc', '@shellgomes', '@ananicemartins']
      },
      'ASSUNCAO': {
        nome: 'ASSUNCAO',
        regiao: 'NORTE',
        hashtag: '#AssuncaoSBC',
        vereadores: ['@joaovianasbc', '@shellgomes', '@ananicemartins']
      },
      'BAETA NEVES': {
        nome: 'BAETA_NEVES',
        regiao: 'NORTE',
        hashtag: '#BaetaNevesSBC',
        vereadores: ['@ananicemartins', '@getuliodoamarelinho', '@watanabe_oficial']
      },
      'RUDGE RAMOS': {
        nome: 'RUDGE_RAMOS',
        regiao: 'NORTE',
        hashtag: '#RudgeRamosSBC',
        vereadores: ['@lucasferreiravereador', '@joaovianasbc', '@shellgomes']
      },
      'TABOÃO': {
        nome: 'TABOAO',
        regiao: 'NORTE',
        hashtag: '#TaboaoSBC',
        vereadores: ['@watanabe_oficial', '@getuliodoamarelinho', '@palhinhasbc']
      },
      'TABAO': {
        nome: 'TABOAO',
        regiao: 'NORTE',
        hashtag: '#TaboaoSBC',
        vereadores: ['@watanabe_oficial', '@getuliodoamarelinho', '@palhinhasbc']
      },

      // REGIÃO SUL
      'ALVES DIAS': {
        nome: 'ALVES_DIAS',
        regiao: 'SUL',
        hashtag: '#AlvesDiasSBC',
        vereadores: ['@lucasferreiravereador', '@palhinhasbc', '@ananicemartins']
      },
      'ANCHIETA': {
        nome: 'ANCHIETA',
        regiao: 'SUL',
        hashtag: '#AnchietaSBC',
        vereadores: ['@perycartola', '@danilolimasbc', '@julinho.fuzari']
      },
      'MONTANHÃO': {
        nome: 'MONTANHAO',
        regiao: 'SUL',
        hashtag: '#MontanhaoSBC',
        vereadores: ['@lucasferreiravereador', '@getuliodoamarelinho', '@watanabe_oficial']
      },
      'MONTANHAO': {
        nome: 'MONTANHAO',
        regiao: 'SUL',
        hashtag: '#MontanhaoSBC',
        vereadores: ['@lucasferreiravereador', '@getuliodoamarelinho', '@watanabe_oficial']
      },

      // REGIÃO LESTE
      'BATISTINI': {
        nome: 'BATISTINI',
        regiao: 'LESTE',
        hashtag: '#BatistiniSBC',
        vereadores: ['@shellgomes', '@perycartola', '@joaovianasbc']
      },
      'INDEPENDÊNCIA': {
        nome: 'INDEPENDENCIA',
        regiao: 'LESTE',
        hashtag: '#IndependenciaSBC',
        vereadores: ['@lucasferreiravereador', '@ananicemartins', '@palhinhasbc']
      },
      'INDEPENDENCIA': {
        nome: 'INDEPENDENCIA',
        regiao: 'LESTE',
        hashtag: '#IndependenciaSBC',
        vereadores: ['@lucasferreiravereador', '@ananicemartins', '@palhinhasbc']
      },

      // REGIÃO OESTE
      'ALVARENGA': {
        nome: 'ALVARENGA',
        regiao: 'OESTE',
        hashtag: '#AlvarengaSBC',
        vereadores: ['@julinho.fuzari', '@watanabe_oficial', '@getuliodoamarelinho']
      },
      'RIACHO GRANDE': {
        nome: 'RIACHO_GRANDE',
        regiao: 'OESTE',
        hashtag: '#RiachoGrandeSBC',
        vereadores: ['@julinho.fuzari', '@danilolimasbc', '@lucasferreiravereador']
      },

      // REGIÃO CENTRO
      'BALNEÁRIA': {
        nome: 'BALNEARIA',
        regiao: 'CENTRO',
        hashtag: '#BalneariaSBC',
        vereadores: ['@perycartola', '@danilolimasbc', '@julinho.fuzari']
      },
      'BOTUJURU': {
        nome: 'BOTUJURU',
        regiao: 'CENTRO',
        hashtag: '#BotujuruSBC',
        vereadores: ['@perycartola', '@danilolimasbc']
      },
      'COOPERATIVA': {
        nome: 'COOPERATIVA',
        regiao: 'CENTRO',
        hashtag: '#CooperativaSBC',
        vereadores: ['@perycartola', '@julinho.fuzari']
      },
      'FERRAZÓPOLIS': {
        nome: 'FERRAZOPOLIS',
        regiao: 'CENTRO',
        hashtag: '#FerrazopolisSBC',
        vereadores: ['@perycartola', '@danilolimasbc', '@julinho.fuzari']
      },
      'FERRAZOPOLIS': {
        nome: 'FERRAZOPOLIS',
        regiao: 'CENTRO',
        hashtag: '#FerrazopolisSBC',
        vereadores: ['@perycartola', '@danilolimasbc', '@julinho.fuzari']
      },
      'NOVA PETRÓPOLIS': {
        nome: 'NOVA_PETROPOLIS',
        regiao: 'CENTRO',
        hashtag: '#NovaPetropolisSBC',
        vereadores: ['@perycartola', '@danilolimasbc']
      },
      'NOVA PETROPOLIS': {
        nome: 'NOVA_PETROPOLIS',
        regiao: 'CENTRO',
        hashtag: '#NovaPetropolisSBC',
        vereadores: ['@perycartola', '@danilolimasbc']
      },
      'PAULICÉIA': {
        nome: 'PAULICEIA',
        regiao: 'CENTRO',
        hashtag: '#PauliceiaSBC',
        vereadores: ['@perycartola', '@julinho.fuzari']
      },
      'PAULICEIA': {
        nome: 'PAULICEIA',
        regiao: 'CENTRO',
        hashtag: '#PauliceiaSBC',
        vereadores: ['@perycartola', '@julinho.fuzari']
      },
      'PLANALTO': {
        nome: 'PLANALTO',
        regiao: 'CENTRO',
        hashtag: '#PlanaltoSBC',
        vereadores: ['@perycartola', '@danilolimasbc', '@julinho.fuzari']
      },
      'RIO GRANDE': {
        nome: 'RIO_GRANDE',
        regiao: 'CENTRO',
        hashtag: '#RioGrandeSBC',
        vereadores: ['@perycartola', '@danilolimasbc']
      },
      'SANTA TEREZINHA': {
        nome: 'SANTA_TEREZINHA',
        regiao: 'CENTRO',
        hashtag: '#SantaTerezinhaSBC',
        vereadores: ['@perycartola', '@julinho.fuzari']
      },

      // REGIÃO LESTE
      'DEMARCHI': {
        nome: 'DEMARCHI',
        regiao: 'LESTE',
        hashtag: '#DemarchiSBC',
        vereadores: ['@shellgomes', '@perycartola', '@joaovianasbc']
      },
      'JORDANÓPOLIS': {
        nome: 'JORDANOPOLIS',
        regiao: 'LESTE',
        hashtag: '#JordanopolisSBC',
        vereadores: ['@lucasferreiravereador', '@ananicemartins', '@palhinhasbc']
      },
      'JORDANOPOLIS': {
        nome: 'JORDANOPOLIS',
        regiao: 'LESTE',
        hashtag: '#JordanopolisSBC',
        vereadores: ['@lucasferreiravereador', '@ananicemartins', '@palhinhasbc']
      },
      'VILA DOS ESTUDANTES': {
        nome: 'VILA_DOS_ESTUDANTES',
        regiao: 'LESTE',
        hashtag: '#VilaEstudantesSBC',
        vereadores: ['@shellgomes', '@ananicemartins']
      },
      'VILA FELIZ': {
        nome: 'VILA_FELIZ',
        regiao: 'LESTE',
        hashtag: '#VilaFelizSBC',
        vereadores: ['@lucasferreiravereador', '@palhinhasbc']
      },
      'VILA MARIANA': {
        nome: 'VILA_MARIANA',
        regiao: 'LESTE',
        hashtag: '#VilaMarianaSBC',
        vereadores: ['@shellgomes', '@joaovianasbc']
      },
      'VILA SABESP': {
        nome: 'VILA_SABESP',
        regiao: 'LESTE',
        hashtag: '#VilaSabespSBC',
        vereadores: ['@lucasferreiravereador', '@ananicemartins']
      },

      // REGIÃO OESTE
      'DOS ALVARENGA': {
        nome: 'DOS_ALVARENGA',
        regiao: 'OESTE',
        hashtag: '#DosAlvarengaSBC',
        vereadores: ['@julinho.fuzari', '@watanabe_oficial', '@getuliodoamarelinho']
      },
      'DOS CASA': {
        nome: 'DOS_CASA',
        regiao: 'OESTE',
        hashtag: '#DosCasaSBC',
        vereadores: ['@julinho.fuzari', '@danilolimasbc']
      },
      'DOS FINCO': {
        nome: 'DOS_FINCO',
        regiao: 'OESTE',
        hashtag: '#DosFincoSBC',
        vereadores: ['@watanabe_oficial', '@getuliodoamarelinho']
      },
      'GOLDEN PARK': {
        nome: 'GOLDEN_PARK',
        regiao: 'OESTE',
        hashtag: '#GoldenParkSBC',
        vereadores: ['@julinho.fuzari', '@lucasferreiravereador']
      },
      'JARDIM DOS QUÍMICOS': {
        nome: 'JARDIM_DOS_QUIMICOS',
        regiao: 'OESTE',
        hashtag: '#JardimQuimicosSBC',
        vereadores: ['@julinho.fuzari', '@watanabe_oficial']
      },
      'JARDIM DOS QUIMICOS': {
        nome: 'JARDIM_DOS_QUIMICOS',
        regiao: 'OESTE',
        hashtag: '#JardimQuimicosSBC',
        vereadores: ['@julinho.fuzari', '@watanabe_oficial']
      },
      'JARDIM PEDREIRA': {
        nome: 'JARDIM_PEDREIRA',
        regiao: 'OESTE',
        hashtag: '#JardimPedreiraSBC',
        vereadores: ['@julinho.fuzari', '@danilolimasbc']
      },
      'JARDIM SILVINA AUDI': {
        nome: 'JARDIM_SILVINA_AUDI',
        regiao: 'OESTE',
        hashtag: '#JardimSilvinaAudiSBC',
        vereadores: ['@julinho.fuzari', '@lucasferreiravereador']
      },
      'JARDIM TIRADENTES': {
        nome: 'JARDIM_TIRADENTES',
        regiao: 'OESTE',
        hashtag: '#JardimTiradentesSBC',
        vereadores: ['@watanabe_oficial', '@getuliodoamarelinho']
      },
      'NOVO PARQUE': {
        nome: 'NOVO_PARQUE',
        regiao: 'OESTE',
        hashtag: '#NovoParqueSBC',
        vereadores: ['@julinho.fuzari', '@lucasferreiravereador']
      },
      'PARQUE SÃO RAFAEL': {
        nome: 'PARQUE_SAO_RAFAEL',
        regiao: 'OESTE',
        hashtag: '#ParqueSaoRafaelSBC',
        vereadores: ['@julinho.fuzari', '@watanabe_oficial']
      },
      'PARQUE SAO RAFAEL': {
        nome: 'PARQUE_SAO_RAFAEL',
        regiao: 'OESTE',
        hashtag: '#ParqueSaoRafaelSBC',
        vereadores: ['@julinho.fuzari', '@watanabe_oficial']
      },
      'PARQUE SELECTA': {
        nome: 'PARQUE_SELECTA',
        regiao: 'OESTE',
        hashtag: '#ParqueSelectaSBC',
        vereadores: ['@julinho.fuzari', '@danilolimasbc']
      },
      'VILA 13 DE MAIO': {
        nome: 'VILA_13_DE_MAIO',
        regiao: 'OESTE',
        hashtag: '#Vila13MaioSBC',
        vereadores: ['@julinho.fuzari', '@getuliodoamarelinho']
      },
      'VILA AREIÃO': {
        nome: 'VILA_AREIAO',
        regiao: 'OESTE',
        hashtag: '#VilaAreiaoSBC',
        vereadores: ['@watanabe_oficial', '@julinho.fuzari']
      },
      'VILA AREIAO': {
        nome: 'VILA_AREIAO',
        regiao: 'OESTE',
        hashtag: '#VilaAreiaoSBC',
        vereadores: ['@watanabe_oficial', '@julinho.fuzari']
      },
      'VILA DA BIQUINHA': {
        nome: 'VILA_DA_BIQUINHA',
        regiao: 'OESTE',
        hashtag: '#VilaBiquinhaSBC',
        vereadores: ['@julinho.fuzari', '@danilolimasbc']
      },
      'VILA BOA VISTA SANTANA': {
        nome: 'VILA_BOA_VISTA_SANTANA',
        regiao: 'OESTE',
        hashtag: '#VilaBoaVistaSantanaSBC',
        vereadores: ['@julinho.fuzari', '@lucasferreiravereador']
      },
      'VILA CANARINHO': {
        nome: 'VILA_CANARINHO',
        regiao: 'OESTE',
        hashtag: '#VilaCanarinhaSBC',
        vereadores: ['@watanabe_oficial', '@getuliodoamarelinho']
      },
      'VILA SÃO BERNARDO NOVO': {
        nome: 'VILA_SAO_BERNARDO_NOVO',
        regiao: 'OESTE',
        hashtag: '#VilaSaoBernardoNovoSBC',
        vereadores: ['@julinho.fuzari', '@watanabe_oficial']
      },
      'VILA SAO BERNARDO NOVO': {
        nome: 'VILA_SAO_BERNARDO_NOVO',
        regiao: 'OESTE',
        hashtag: '#VilaSaoBernardoNovoSBC',
        vereadores: ['@julinho.fuzari', '@watanabe_oficial']
      },
      'VILA VANGUARDA': {
        nome: 'VILA_VANGUARDA',
        regiao: 'OESTE',
        hashtag: '#VilaVanguardaSBC',
        vereadores: ['@julinho.fuzari', '@danilolimasbc']
      },

      // REGIÃO SÃO PEDRO - RENATÃO DA SÃO PEDRO
      'VILA SÃO PEDRO': {
        nome: 'VILA_SAO_PEDRO',
        regiao: 'SAO_PEDRO',
        hashtag: '#VilaSaoPedroSBC',
        vereadores: ['@renatao_o_amigo_da_periferia', '@perycartola', '@danilolimasbc']
      },
      'VILA SAO PEDRO': {
        nome: 'VILA_SAO_PEDRO',
        regiao: 'SAO_PEDRO',
        hashtag: '#VilaSaoPedroSBC',
        vereadores: ['@renatao_o_amigo_da_periferia', '@perycartola', '@danilolimasbc']
      },
      'VILA ESPERANÇA': {
        nome: 'VILA_ESPERANCA',
        regiao: 'SAO_PEDRO',
        hashtag: '#VilaEsperancaSBC',
        vereadores: ['@renatao_o_amigo_da_periferia', '@ananicemartins', '@shellgomes']
      },
      'VILA ESPERANCA': {
        nome: 'VILA_ESPERANCA',
        regiao: 'SAO_PEDRO',
        hashtag: '#VilaEsperancaSBC',
        vereadores: ['@renatao_o_amigo_da_periferia', '@ananicemartins', '@shellgomes']
      },
      'PARQUE SÃO BERNARDO': {
        nome: 'PARQUE_SAO_BERNARDO',
        regiao: 'SAO_PEDRO',
        hashtag: '#ParqueSaoBernardoSBC',
        vereadores: ['@renatao_o_amigo_da_periferia', '@lucasferreiravereador', '@joaovianasbc']
      },
      'PARQUE SAO BERNARDO': {
        nome: 'PARQUE_SAO_BERNARDO',
        regiao: 'SAO_PEDRO',
        hashtag: '#ParqueSaoBernardoSBC',
        vereadores: ['@renatao_o_amigo_da_periferia', '@lucasferreiravereador', '@joaovianasbc']
      },
      'INDUSTRIAL': {
        nome: 'INDUSTRIAL',
        regiao: 'SAO_PEDRO',
        hashtag: '#IndustrialSBC',
        vereadores: ['@renatao_o_amigo_da_periferia', '@watanabe_oficial', '@getuliodoamarelinho']
      },
      'BOA VISTA': {
        nome: 'BOA_VISTA',
        regiao: 'SAO_PEDRO',
        hashtag: '#BoaVistaSBC',
        vereadores: ['@renatao_o_amigo_da_periferia', '@palhinhasbc', '@julinho.fuzari']
      },
      'JARDIM REGINA': {
        nome: 'JARDIM_REGINA',
        regiao: 'SAO_PEDRO',
        hashtag: '#JardimReginaSBC',
        vereadores: ['@renatao_o_amigo_da_periferia', '@shellgomes', '@ananicemartins']
      }
    };

    // Hashtags base do sistema
    this.hashtagsBase = [
      '#DenunciaCidada',
      '#FiscalizaSBC',
      '#SaoBernardoDoCampo',
      '#ProblemasUrbanos',
      '#CidadeMelhor',
      '#ABC'
    ];
  }

  /**
   * Análise inteligente completa da denúncia
   */
  async analisarDenuncia(texto, localizacao = null) {
    try {
      logger.info('🔍 Iniciando análise inteligente da denúncia...');

      const resultado = {
        problemaDetectado: null,
        emoji: '⚠️',
        categoria: 'GERAL',
        prioridade: 'MEDIA',
        bairro: null,
        regiao: null,
        vereadores: [],
        hashtags: [...this.hashtagsBase],
        localizacaoDetectada: null
      };

      // 1. Detectar problema urbano
      const problemaInfo = this.detectarProblema(texto);
      if (problemaInfo) {
        resultado.problemaDetectado = problemaInfo.problema;
        resultado.emoji = problemaInfo.emoji;
        resultado.categoria = problemaInfo.categoria;
        resultado.prioridade = problemaInfo.prioridade;
        
        logger.info(`✅ Problema detectado: ${problemaInfo.problema} ${problemaInfo.emoji}`);
      }

      // 2. Detectar localização/bairro
      const localizacaoInfo = this.detectarLocalizacao(texto, localizacao);
      if (localizacaoInfo) {
        resultado.bairro = localizacaoInfo.bairro;
        resultado.regiao = localizacaoInfo.regiao;
        resultado.vereadores = localizacaoInfo.vereadores;
        resultado.localizacaoDetectada = localizacaoInfo.endereco;
        
        // Adicionar hashtag específica do bairro
        resultado.hashtags.unshift(localizacaoInfo.hashtag);
        
        logger.info(`📍 Localização detectada: ${localizacaoInfo.bairro} (${localizacaoInfo.regiao})`);
      }

      // 3. Adicionar hashtags específicas da categoria
      this.adicionarHashtagsCategoria(resultado);

      logger.info('✅ Análise inteligente concluída', {
        problema: resultado.problemaDetectado,
        bairro: resultado.bairro,
        categoria: resultado.categoria,
        prioridade: resultado.prioridade
      });

      return resultado;

    } catch (error) {
      logger.error('❌ Erro na análise inteligente:', error.message);
      
      // Retornar análise básica em caso de erro
      return {
        problemaDetectado: null,
        emoji: '⚠️',
        categoria: 'GERAL',
        prioridade: 'MEDIA',
        bairro: null,
        regiao: null,
        vereadores: [],
        hashtags: [...this.hashtagsBase],
        localizacaoDetectada: null
      };
    }
  }

  /**
   * Detectar problema urbano no texto
   */
  detectarProblema(texto) {
    const textoLower = texto.toLowerCase();
    
    // Buscar por problemas específicos (termos mais específicos primeiro)
    const problemasOrdenados = Object.entries(this.problemasUrbanos)
      .sort((a, b) => b[0].length - a[0].length); // Termos mais longos primeiro
    
    for (const [problema, info] of problemasOrdenados) {
      if (textoLower.includes(problema.toLowerCase())) {
        return {
          problema: problema,
          emoji: info.emoji,
          categoria: info.categoria,
          prioridade: info.prioridade
        };
      }
    }
    
    return null;
  }

  /**
   * Detectar localização/bairro no texto
   */
  detectarLocalizacao(texto, localizacaoFornecida = null) {
    const textoCompleto = `${texto} ${localizacaoFornecida || ''}`.toLowerCase();
    
    // Buscar por bairros conhecidos
    for (const [bairroKey, info] of Object.entries(this.regioesBairros)) {
      const bairroLower = bairroKey.toLowerCase();
      const bairroNormalizado = this.normalizarTexto(bairroKey);
      
      if (textoCompleto.includes(bairroLower) || 
          textoCompleto.includes(bairroNormalizado) ||
          textoCompleto.includes(info.nome.toLowerCase().replace(/_/g, ' '))) {
        
        // Tentar extrair endereço mais específico
        const endereco = this.extrairEndereco(texto);
        
        return {
          bairro: bairroKey,
          regiao: info.regiao,
          vereadores: info.vereadores,
          hashtag: info.hashtag,
          endereco: endereco
        };
      }
    }
    
    return null;
  }

  /**
   * Extrair endereço específico do texto
   */
  extrairEndereco(texto) {
    // Padrões para detectar endereços
    const padroes = [
      /rua\s+([^,\n]+)/gi,
      /avenida\s+([^,\n]+)/gi,
      /av\.\s*([^,\n]+)/gi,
      /alameda\s+([^,\n]+)/gi,
      /praça\s+([^,\n]+)/gi,
      /largo\s+([^,\n]+)/gi,
      /travessa\s+([^,\n]+)/gi
    ];
    
    for (const padrao of padroes) {
      const match = texto.match(padrao);
      if (match && match[1]) {
        return match[0].trim();
      }
    }
    
    return null;
  }

  /**
   * Adicionar hashtags específicas da categoria
   */
  adicionarHashtagsCategoria(resultado) {
    const hashtagsCategoria = {
      'VIA_PUBLICA': ['#ViasPublicas', '#Asfalto', '#Mobilidade'],
      'ILUMINACAO': ['#IluminacaoPublica', '#Seguranca'],
      'LIMPEZA': ['#LimpezaUrbana', '#MeioAmbiente'],
      'TRANSITO': ['#Transito', '#Seguranca', '#Mobilidade'],
      'MEIO_AMBIENTE': ['#MeioAmbiente', '#AreasVerdes'],
      'SANEAMENTO': ['#Saneamento', '#AguaEsgoto'],
      'SEGURANCA': ['#SegurancaPublica', '#Prevencao'],
      'TRANSPORTE': ['#TransportePublico', '#Mobilidade'],
      'CONSTRUCAO': ['#Obras', '#Infraestrutura']
    };
    
    const hashtags = hashtagsCategoria[resultado.categoria];
    if (hashtags) {
      resultado.hashtags.push(...hashtags);
    }
  }

  /**
   * Gerar caption otimizada para Instagram
   */
  gerarCaption(analise, textoOriginal) {
    const {
      emoji,
      bairro,
      regiao,
      vereadores,
      hashtags,
      localizacaoDetectada
    } = analise;

    // Construir caption
    let caption = `${emoji} DENÚNCIA CIDADÃ\n\n`;
    caption += `${textoOriginal}\n\n`;

    // Adicionar vereadores se disponível
    if (vereadores && vereadores.length > 0) {
      caption += `📢 VEREADORES DA REGIÃO:\n`;
      caption += `${vereadores.join(' ')}\n\n`;
    }

    // Adicionar região
    if (regiao && bairro) {
      caption += `📍 Região: ${bairro}\n\n`;
    }

    // Adicionar call-to-action
    caption += `👥 MORADORES: Curtam e compartilhem para dar visibilidade!\n`;
    caption += `🏛️ PODER PÚBLICO: Esperamos providências!\n`;
    caption += `Porque aqui é CIDADE PRA FRENTE!\n\n`;

    // Adicionar hashtags (máximo 30 hashtags do Instagram)
    const hashtagsUnicas = [...new Set(hashtags)].slice(0, 25);
    caption += hashtagsUnicas.join(' ');

    return caption;
  }

  /**
   * Normalizar texto removendo acentos
   */
  normalizarTexto(texto) {
    return texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/ç/g, 'c');
  }

  /**
   * Obter estatísticas de análise
   */
  obterEstatisticas(analises) {
    const stats = {
      total: analises.length,
      categorias: {},
      prioridades: {},
      regioes: {},
      problemasDetectados: 0
    };

    analises.forEach(analise => {
      // Contar categorias
      const categoria = analise.categoria || 'INDEFINIDA';
      stats.categorias[categoria] = (stats.categorias[categoria] || 0) + 1;

      // Contar prioridades
      const prioridade = analise.prioridade || 'INDEFINIDA';
      stats.prioridades[prioridade] = (stats.prioridades[prioridade] || 0) + 1;

      // Contar regiões
      if (analise.regiao) {
        const regiao = analise.regiao;
        stats.regioes[regiao] = (stats.regioes[regiao] || 0) + 1;
      }

      // Contar problemas detectados
      if (analise.problemaDetectado) {
        stats.problemasDetectados++;
      }
    });

    return stats;
  }

  /**
   * Buscar vereadores por bairro
   */
  buscarVereadores(bairro) {
    const bairroKey = bairro?.toUpperCase();
    const info = this.regioesBairros[bairroKey];
    
    return info ? {
      vereadores: info.vereadores,
      regiao: info.regiao,
      hashtag: info.hashtag
    } : null;
  }

  /**
   * Listar todos os problemas urbanos conhecidos
   */
  listarProblemasUrbanos() {
    const problemas = {};
    
    Object.entries(this.problemasUrbanos).forEach(([problema, info]) => {
      const categoria = info.categoria;
      if (!problemas[categoria]) {
        problemas[categoria] = [];
      }
      problemas[categoria].push({
        termo: problema,
        emoji: info.emoji,
        prioridade: info.prioridade
      });
    });

    return problemas;
  }

  /**
   * Listar todos os bairros conhecidos
   */
  listarBairros() {
    return Object.entries(this.regioesBairros).map(([bairro, info]) => ({
      bairro: bairro,
      regiao: info.regiao,
      hashtag: info.hashtag,
      vereadores: info.vereadores
    }));
  }
}

module.exports = new SmartAnalysisService();