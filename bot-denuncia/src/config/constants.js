const CONFIG = {
  MAX_POSTS_PER_DAY: 4,
  HORARIOS_PUBLICACAO: ['06:00', '12:00', '18:00', '21:00'],
  MAX_VEREADORES_POR_POST: 5,
  MIN_VEREADORES_POR_POST: 2,
  MAX_TEXTO_LENGTH: 2000,
  MAX_IMAGE_SIZE_MB: 5,
  SUPPORTED_FORMATS: ['jpg', 'jpeg', 'png'],
  
  // Estados de transição do sistema de denúncias - Controle consistente de status
  STATUS_DENUNCIA: {
    // Estados iniciais
    RECEBIDA: 'RECEBIDA',
    PROCESSANDO: 'PROCESSANDO',
    
    // Estados de processamento de conteúdo
    APROVADA_BOT: 'APROVADA_BOT',
    APROVADA_ADMIN: 'APROVADA_ADMIN',
    PENDENTE_MODERACAO: 'PENDENTE_MODERACAO',
    REJEITADA_BOT: 'REJEITADA_BOT',
    REJEITADA_ADMIN: 'REJEITADA_ADMIN',
    
    // Estados de publicação
    AGENDADA: 'AGENDADA',
    PUBLICANDO: 'PUBLICANDO',
    PUBLICADA: 'PUBLICADA',
    
    // Estados de erro específicos
    ERRO: 'ERRO',
    ERRO_PUBLICACAO: 'ERRO_PUBLICACAO',
    BAIRRO_INVALIDO: 'BAIRRO_INVALIDO',
    TEXTO_INVALIDO: 'TEXTO_INVALIDO',
    NAO_ENCONTRADA: 'NAO_ENCONTRADA',
    TIMEOUT_PUBLICACAO: 'TIMEOUT_PUBLICACAO',
    FALHA_INSTAGRAM: 'FALHA_INSTAGRAM',
    AGUARDANDO_RATE_LIMIT: 'AGUARDANDO_RATE_LIMIT'
  },
  
  // Transições válidas entre status (para validação)
  STATUS_TRANSICOES: {
    'RECEBIDA': ['PROCESSANDO', 'ERRO'],
    'PROCESSANDO': ['APROVADA_BOT', 'PENDENTE_MODERACAO', 'REJEITADA_BOT', 'BAIRRO_INVALIDO', 'TEXTO_INVALIDO', 'ERRO'],
    'APROVADA_BOT': ['AGENDADA', 'PUBLICANDO', 'APROVADA_ADMIN', 'REJEITADA_ADMIN'],
    'APROVADA_ADMIN': ['AGENDADA', 'PUBLICANDO'],
    'PENDENTE_MODERACAO': ['APROVADA_ADMIN', 'REJEITADA_ADMIN'],
    'AGENDADA': ['PUBLICANDO', 'APROVADA_ADMIN', 'REJEITADA_ADMIN'],
    'PUBLICANDO': ['PUBLICADA', 'ERRO_PUBLICACAO', 'TIMEOUT_PUBLICACAO', 'FALHA_INSTAGRAM', 'AGUARDANDO_RATE_LIMIT'],
    'ERRO_PUBLICACAO': ['PUBLICANDO', 'AGENDADA'],
    'TIMEOUT_PUBLICACAO': ['PUBLICANDO', 'AGENDADA'],
    'FALHA_INSTAGRAM': ['PUBLICANDO', 'AGENDADA'],
    'AGUARDANDO_RATE_LIMIT': ['PUBLICANDO', 'AGENDADA']
  },
  
  // Status que permitem republicação/reagendamento
  STATUS_REPUBLICAVEIS: [
    'APROVADA_BOT',
    'APROVADA_ADMIN', 
    'AGENDADA',
    'ERRO_PUBLICACAO',
    'TIMEOUT_PUBLICACAO',
    'FALHA_INSTAGRAM',
    'AGUARDANDO_RATE_LIMIT'
  ],
  
  // Status finais (não devem ser processados novamente)
  STATUS_FINAIS: [
    'PUBLICADA',
    'REJEITADA_BOT',
    'REJEITADA_ADMIN',
    'NAO_ENCONTRADA'
  ],
  
  ESTADOS_CONVERSA: {
    INICIAL: 'INICIAL',
    SELECIONANDO_CATEGORIA: 'SELECIONANDO_CATEGORIA',
    SELECIONANDO_SUBCATEGORIA: 'SELECIONANDO_SUBCATEGORIA',
    AGUARDANDO_PROBLEMA: 'AGUARDANDO_PROBLEMA',
    AGUARDANDO_ENDERECO: 'AGUARDANDO_ENDERECO',
    AGUARDANDO_ENDERECO_CORRIGIDO: 'AGUARDANDO_ENDERECO_CORRIGIDO',
    AGUARDANDO_FOTO: 'AGUARDANDO_FOTO',
    AGUARDANDO_CONFIRMACAO: 'AGUARDANDO_CONFIRMACAO',
    DENUNCIA_PROCESSADA: 'DENUNCIA_PROCESSADA',
    CONSULTANDO_STATUS: 'CONSULTANDO_STATUS',
    FINALIZADO: 'FINALIZADO'
  },
  
  TIMEOUT_CONVERSA: 15 * 60 * 1000,
  
  MESSAGES: {
    BEM_VINDO: `🤖 *Olá! Sou o Bot de Denúncias Cidadãs!\n\nAjudo você a reportar problemas urbanos e cobrar ação dos vereadores responsáveis.\n\n📱 *O que você gostaria de fazer?`,
    MENU_OPCOES: {
        '1': 'FAZER DENÚNCIA',
        '2': 'MINHAS DENÚNCIAS', 
        '3': 'BAIRROS ATENDIDOS',
        '4': 'AJUDA'
    },
    INICIAR_DENUNCIA: `🚨 *NOVA DENÚNCIA - PASSO 1/3*\n\n📝 Primeiro, me conte *qual é o problema* que você quer reportar:`,
    SOLICITAR_ENDERECO: `🚨 *NOVA DENÚNCIA - PASSO 2/3*\n\n✅ *Problema registrado:* "{problema}"\n\n📍 Agora preciso do *endereço COMPLETO* onde está o problema:`,
    ENDERECO_ACEITO: `🚨 *NOVA DENÚNCIA - PASSO 3/3*\n\n✅ *Problema:* "{problema}"\n✅ *Endereço:* "{endereco}"\n✅ *Bairro identificado:* {bairro}\n\n📸 *Agora envie uma FOTO do problema:*`,
    BAIRRO_NAO_ENCONTRADO: `❌ *BAIRRO NÃO ENCONTRADO*\n\nO bairro "{bairro_informado}" não está em nossa base de dados.\n\n🗺️ *Bairros disponíveis similares:*\n{sugestoes_bairros}\n\n📝 *Por favor, corrija o endereço:*`,
    CONFIRMACAO_DENUNCIA: `📋 *CONFIRME SUA DENÚNCIA*\n\n🚨 *Problema:* {problema}\n📍 *Endereço:* {endereco}\n🏘️ *Bairro:* {bairro}\n📸 *Foto:* Recebida ✅\n\n👥 *Vereadores que serão mencionados:*\n{lista_vereadores}`,
    DENUNCIA_ENVIADA: `🎉 *DENÚNCIA ENVIADA COM SUCESSO!*\n\n📋 *Protocolo:* {protocolo}\n⏰ *Recebida em:* {data_hora}`,
    AGRADECIMENTO_FINAL: `🙏 *MUITO OBRIGADO!*\n\nSua denúncia foi registrada e será analisada pela nossa equipe.\n\n📱 Quando houver atualizações, você será notificado.\n\n💚 *Juntos tornamos nossa cidade melhor!*\n\n✨ _Atendimento finalizado._`,
    CONSULTA_STATUS: `📋 *SUAS DENÚNCIAS*\n\n{lista_denuncias}`,
    AJUDA_COMPLETA: `❓ *COMO FUNCIONA O BOT*\n\n🎯 *Objetivo:*\nFacilitar denúncias cidadãs e pressionar vereadores responsáveis através do Instagram.`,
    FORMATO_INVALIDO: `❌ *Formato inválido*\n\n{instrucao_especifica}`,
    CONVERSA_EXPIRADA: `⏰ *Conversa expirada*\n\nPor segurança, nossa conversa foi encerrada após 15 minutos de inatividade.`,
    ERRO_GERAL: `⚠️ *Ops! Algo deu errado*\n\nTente novamente em alguns minutos.`
  },

  CATEGORIAS_DENUNCIA: {
    saude: {
      titulo: '🏥 Saúde',
      descricao: 'Problemas relacionados à saúde pública',
      subcategorias: {
        ubs: 'UBS - Unidade Básica de Saúde',
        hospital: 'Hospitais e Prontos-Socorros',
        saneamento: 'Saneamento Básico',
        dengue: 'Focos de Dengue e Mosquitos',
        agua_contaminada: 'Água Contaminada',
        lixo_hospitalar: 'Descarte Inadequado de Lixo Hospitalar'
      }
    },
    seguranca: {
      titulo: '🛡️ Segurança',
      descricao: 'Problemas de segurança pública',
      subcategorias: {
        iluminacao: 'Iluminação Pública Deficiente',
        policiamento: 'Falta de Policiamento',
        areas_perigosas: 'Áreas Perigosas e Abandonadas',
        vandalismo: 'Vandalismo e Pichações',
        assaltos: 'Pontos de Assaltos Frequentes',
        drogas: 'Uso de Drogas em Locais Públicos'
      }
    },
    educacao: {
      titulo: '📚 Educação',
      descricao: 'Problemas na área educacional',
      subcategorias: {
        escolas: 'Infraestrutura das Escolas',
        creches: 'Creches e Pré-Escolas',
        transporte_escolar: 'Transporte Escolar',
        merenda: 'Merenda Escolar',
        professores: 'Falta de Professores',
        equipamentos: 'Equipamentos e Materiais'
      }
    },
    infraestrutura: {
      titulo: '🏗️ Infraestrutura',
      descricao: 'Problemas de infraestrutura urbana',
      subcategorias: {
        ruas: 'Ruas e Pavimentação',
        calcadas: 'Calçadas Danificadas',
        buracos: 'Buracos na Via',
        pontes: 'Pontes e Viadutos',
        sinalizacao: 'Sinalização de Trânsito',
        semaforos: 'Semáforos com Defeito'
      }
    },
    servicos_publicos: {
      titulo: '🔧 Serviços Públicos',
      descricao: 'Problemas com serviços públicos',
      subcategorias: {
        limpeza: 'Limpeza Urbana',
        agua: 'Abastecimento de Água',
        esgoto: 'Rede de Esgoto',
        coleta_lixo: 'Coleta de Lixo',
        energia: 'Energia Elétrica',
        internet: 'Internet Pública'
      }
    },
    meio_ambiente: {
      titulo: '🌳 Meio Ambiente',
      descricao: 'Questões ambientais',
      subcategorias: {
        arvores: 'Podas e Plantio de Árvores',
        poluicao: 'Poluição do Ar e Sonora',
        parques: 'Manutenção de Parques',
        rios: 'Poluição de Rios e Córregos',
        lixao: 'Descarte Irregular de Lixo',
        animais: 'Animais Abandonados'
      }
    },
    transporte: {
      titulo: '🚌 Transporte',
      descricao: 'Problemas de transporte público',
      subcategorias: {
        onibus: 'Ônibus e Linhas',
        pontos: 'Pontos de Ônibus',
        ciclovia: 'Ciclovias e Ciclofaixas',
        transito: 'Congestionamentos',
        estacionamento: 'Vagas de Estacionamento',
        acessibilidade: 'Acessibilidade no Transporte'
      }
    }
  },

  QUICK_REPLIES: {
    MENU_PRINCIPAL: [
      '🚨 Fazer Denúncia',
      '📋 Minhas Denúncias', 
      '🗺️ Bairros Atendidos',
      '❓ Ajuda'
    ],
    CONFIRMACAO: [
      '✅ Confirmar e Enviar',
      '✏️ Editar',
      '❌ Cancelar'
    ],
    APOS_DENUNCIA: [
      '🆕 Nova Denúncia',
      '📋 Ver Status',
      '🏠 Menu Principal'
    ],
    NAVEGACAO: [
      '🔙 Voltar',
      '🏠 Menu Principal',
      '❌ Cancelar'
    ]
  }
};

const PALAVROES_CATEGORIAS = {
  leves: ['bosta', 'merda', 'porra', 'putz', 'droga'],
  graves: ['vsf', 'fdp', 'puta', 'viado'],
  extremos: ['racista', 'nazista', 'terrorista']
};

const SUBSTITUICOES = {
  'merda': 'situação precária',
  'porra': 'situação',
  'inferno': 'local em péssimas condições',
  'vsf': 'vá se cuidar',
  'fdp': 'pessoa desagradável',
  'puta': 'pessoa',
  'viado': 'indivíduo'
};

module.exports = {
  PALAVROES_CATEGORIAS,
  SUBSTITUICOES,
  CONFIG
};