/**
 * Test Data Factory
 * Generates deterministic test data for consistent testing
 */

const crypto = require('crypto');

class TestDataFactory {
  constructor() {
    this.seed = process.env.TEST_SEED || '12345';
    this.counter = 0;
  }

  // Generate deterministic random values
  random(min = 0, max = 1) {
    const hash = crypto.createHash('md5').update(`${this.seed}-${this.counter++}`).digest('hex');
    const num = parseInt(hash.substring(0, 8), 16) / 0xFFFFFFFF;
    return min + (num * (max - min));
  }

  randomChoice(array) {
    return array[Math.floor(this.random() * array.length)];
  }

  randomString(length = 10) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(this.random() * chars.length));
    }
    return result;
  }

  // Generate mock denúncia data
  createDenuncia(overrides = {}) {
    const bairros = [
      'Centro', 'Jardim do Mar', 'Vila São Pedro', 'Baeta Neves',
      'Rudge Ramos', 'Assunção', 'Planalto', 'Taboão'
    ];

    const categorias = [
      'ILUMINACAO_PUBLICA',
      'LIMPEZA_URBANA',
      'TRANSPORTE_PUBLICO',
      'SAUDE_PUBLICA',
      'EDUCACAO',
      'SEGURANCA_PUBLICA'
    ];

    const statuses = [
      'RECEBIDA',
      'PENDENTE_MODERACAO',
      'APROVADA',
      'AGENDADA',
      'PUBLICADA',
      'REJEITADA'
    ];

    const baseData = {
      id: `denuncia-${this.randomString(8)}`,
      protocolo: `DEN-${Date.now().toString(36)}-${this.randomString(5)}`.toUpperCase(),
      texto: `Problema de ${this.randomChoice(['iluminação', 'limpeza', 'transporte', 'saúde'])} na região. ${this.randomString(50)}`,
      textoFiltrado: null,
      endereco: `Rua ${this.randomString(10)}, ${Math.floor(this.random(1, 9999))} - ${this.randomChoice(bairros)}`,
      bairro: this.randomChoice(bairros),
      imagemUrl: `https://example.com/image-${this.randomString(8)}.jpg`,
      status: this.randomChoice(statuses),
      vereadores: [`@vereador${Math.floor(this.random(1, 10))}`],
      phoneNumber: `5511${Math.floor(this.random(900000000, 999999999))}@c.us`,
      priority: Math.floor(this.random(1, 6)),
      scheduledPublishAt: new Date(Date.now() + this.random(0, 7 * 24 * 60 * 60 * 1000)),
      createdAt: new Date(Date.now() - this.random(0, 30 * 24 * 60 * 60 * 1000)),
      updatedAt: new Date(),
      conversaCompleta: {
        categoriaSelecionada: this.randomChoice(categorias),
        subcategoriaSelecionada: 'problema_especifico',
        vereadoresMencionados: [`@vereador${Math.floor(this.random(1, 10))}`]
      },
      tempoConversa: Math.floor(this.random(2, 15))
    };

    return { ...baseData, ...overrides };
  }

  // Generate mock conversation data
  createConversaUsuario(overrides = {}) {
    const estados = [
      'INICIAL',
      'SELECIONANDO_CATEGORIA',
      'SELECIONANDO_SUBCATEGORIA',
      'AGUARDANDO_PROBLEMA',
      'AGUARDANDO_ENDERECO',
      'AGUARDANDO_FOTO',
      'AGUARDANDO_CONFIRMACAO',
      'DENUNCIA_PROCESSADA',
      'FINALIZADO'
    ];

    const baseData = {
      id: `conversa-${this.randomString(8)}`,
      phoneNumber: `5511${Math.floor(this.random(900000000, 999999999))}@c.us`,
      estado: this.randomChoice(estados),
      ultimaInteracao: new Date(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
      problemaTemp: null,
      enderecoTemp: null,
      bairroTemp: null,
      imagemTemp: null,
      dadosTemp: {}
    };

    return { ...baseData, ...overrides };
  }

  // Generate mock vereador data
  createVereador(overrides = {}) {
    const nomes = [
      'João Silva', 'Maria Santos', 'Pedro Oliveira', 'Ana Costa',
      'Carlos Ferreira', 'Lucia Rodrigues', 'Paulo Alves', 'Rosa Lima'
    ];

    const partidos = ['PT', 'PSDB', 'PMDB', 'PP', 'PSB', 'PDT', 'PV'];

    const baseData = {
      id: `vereador-${this.randomString(8)}`,
      nome: this.randomChoice(nomes),
      partido: this.randomChoice(partidos),
      instagram: `@vereador${this.randomString(6)}`,
      email: `vereador${this.randomString(6)}@camara.sp.gov.br`,
      telefone: `(11) 9${Math.floor(this.random(1000, 9999))}-${Math.floor(this.random(1000, 9999))}`,
      regioes: [this.randomChoice(['Centro', 'Norte', 'Sul', 'Leste', 'Oeste'])],
      ativo: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return { ...baseData, ...overrides };
  }

  // Generate mock admin user
  createAdminUser(overrides = {}) {
    const baseData = {
      id: `admin-${this.randomString(8)}`,
      username: `admin${this.randomString(6)}`,
      email: `admin${this.randomString(6)}@example.com`,
      password: '$2b$10$' + this.randomString(53), // Bcrypt hash format
      role: 'ADMIN',
      active: true,
      lastLogin: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return { ...baseData, ...overrides };
  }

  // Generate mock WhatsApp message
  createWhatsAppMessage(overrides = {}) {
    const messageTypes = ['text', 'image', 'document', 'voice'];
    
    const baseData = {
      id: `msg-${this.randomString(8)}`,
      from: `5511${Math.floor(this.random(900000000, 999999999))}@c.us`,
      to: `5511${Math.floor(this.random(900000000, 999999999))}@c.us`,
      body: `Test message ${this.randomString(20)}`,
      type: this.randomChoice(messageTypes),
      timestamp: Math.floor(Date.now() / 1000),
      hasMedia: this.randomChoice([true, false]),
      selectedListId: null,
      selectedButtonId: null
    };

    return { ...baseData, ...overrides };
  }

  // Generate mock Instagram post data
  createInstagramPost(overrides = {}) {
    const baseData = {
      id: `post-${this.randomString(8)}`,
      mediaId: `ig-media-${this.randomString(10)}`,
      caption: `#DenunciaCidada #SãoBernardo\n\nProblema reportado: ${this.randomString(100)}`,
      imageUrl: `https://example.com/post-image-${this.randomString(8)}.jpg`,
      denunciaId: `denuncia-${this.randomString(8)}`,
      status: this.randomChoice(['POSTED', 'FAILED', 'PENDING']),
      likes: Math.floor(this.random(0, 500)),
      comments: Math.floor(this.random(0, 50)),
      postedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return { ...baseData, ...overrides };
  }

  // Generate performance test data
  createPerformanceTestData(size = 'small') {
    const sizes = {
      small: { denuncias: 10, conversations: 5, users: 3 },
      medium: { denuncias: 100, conversations: 50, users: 10 },
      large: { denuncias: 1000, conversations: 500, users: 50 }
    };

    const config = sizes[size] || sizes.small;
    
    return {
      denuncias: Array.from({ length: config.denuncias }, () => this.createDenuncia()),
      conversations: Array.from({ length: config.conversations }, () => this.createConversaUsuario()),
      users: Array.from({ length: config.users }, () => this.createAdminUser()),
      vereadores: Array.from({ length: 8 }, () => this.createVereador()),
      posts: Array.from({ length: config.denuncias / 2 }, () => this.createInstagramPost())
    };
  }

  // Generate batch test data for load testing
  createBatchData(batchSize = 10, type = 'denuncia') {
    const generators = {
      denuncia: () => this.createDenuncia(),
      conversation: () => this.createConversaUsuario(),
      message: () => this.createWhatsAppMessage(),
      post: () => this.createInstagramPost()
    };

    const generator = generators[type];
    if (!generator) {
      throw new Error(`Unknown data type: ${type}`);
    }

    return Array.from({ length: batchSize }, generator);
  }

  // Reset counter for deterministic tests
  reset() {
    this.counter = 0;
  }
}

// Export singleton instance
module.exports = new TestDataFactory();