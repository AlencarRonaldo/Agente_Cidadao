const prisma = require('./src/config/database');
const logger = require('./src/utils/logger');

async function createTestDenunciasWithSchedule() {
  try {
    logger.info('🧪 Criando denúncias de teste com novos campos...');

    // Criar diferentes cenários de teste
    const denuncias = [
      {
        protocolo: 'TEST-2025-001',
        texto: 'Buraco na Rua das Flores esquina com Av. Principal. Situação grave para pedestres.',
        textoFiltrado: 'Buraco na Rua das Flores esquina com Av. Principal. Situação grave para pedestres.',
        endereco: 'Rua das Flores, 123',
        bairro: 'Centro',
        phoneNumber: '+5511999999001',
        status: 'APROVADA_ADMIN',
        aprovadaAdmin: true,
        scoreBot: 0.95,
        imagemUrl: 'https://picsum.photos/400/300?random=1',
        // Novos campos de publicação
        scheduledPublishAt: new Date(Date.now() + 1 * 60 * 60 * 1000), // 1 hora no futuro
        priority: 1, // Alta prioridade
        publishAttempts: 0
      },
      {
        protocolo: 'TEST-2025-002',
        texto: 'Lixo acumulado na praça do bairro Vila Nova há mais de uma semana.',
        textoFiltrado: 'Lixo acumulado na praça do bairro Vila Nova há mais de uma semana.',
        endereco: 'Praça da Vila Nova, s/n',
        bairro: 'Vila Nova',
        phoneNumber: '+5511999999002',
        status: 'APROVADA_ADMIN',
        aprovadaAdmin: true,
        scoreBot: 0.87,
        imagemUrl: 'https://picsum.photos/400/300?random=2',
        // Já publicada
        instagramPostId: 'CxamplePost123',
        publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 dias atrás
        priority: 2, // Prioridade normal
        publishAttempts: 1
      },
      {
        protocolo: 'TEST-2025-003',
        texto: 'Semáforo quebrado no cruzamento da Rua A com Rua B causa transtornos.',
        textoFiltrado: 'Semáforo quebrado no cruzamento da Rua A com Rua B causa transtornos.',
        endereco: 'Rua A com Rua B',
        bairro: 'Jardim Europa',
        phoneNumber: '+5511999999003',
        status: 'APROVADA_BOT',
        aprovadaBot: true,
        scoreBot: 0.76,
        imagemUrl: 'https://picsum.photos/400/300?random=3',
        // Erro na publicação
        scheduledPublishAt: new Date(Date.now() - 30 * 60 * 1000), // 30 min atrás (vencida)
        priority: 1, // Alta prioridade
        publishAttempts: 3 // Várias tentativas falharam
      },
      {
        protocolo: 'TEST-2025-004',
        texto: 'Calçada danificada na frente da escola municipal.',
        textoFiltrado: 'Calçada danificada na frente da escola municipal.',
        endereco: 'Rua da Escola, 456',
        bairro: 'Bairro Novo',
        phoneNumber: '+5511999999004',
        status: 'PENDENTE_MODERACAO',
        scoreBot: 0.82,
        imagemUrl: 'https://picsum.photos/400/300?random=4',
        // Pendente, sem agendamento
        priority: 3, // Baixa prioridade
        publishAttempts: 0
      },
      {
        protocolo: 'TEST-2025-005',
        texto: 'Iluminação pública queimada na Rua Escura compromete segurança.',
        textoFiltrado: 'Iluminação pública queimada na Rua Escura compromete segurança.',
        endereco: 'Rua Escura, 789',
        bairro: 'Vila Esperança',
        phoneNumber: '+5511999999005',
        status: 'APROVADA_ADMIN',
        aprovadaAdmin: true,
        scoreBot: 0.91,
        imagemUrl: 'https://picsum.photos/400/300?random=5',
        // Agendada para breve
        scheduledPublishAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutos no futuro
        priority: 1, // Alta prioridade
        publishAttempts: 0
      }
    ];

    // Limpar denúncias de teste existentes
    await prisma.denuncia.deleteMany({
      where: {
        protocolo: {
          startsWith: 'TEST-2025-'
        }
      }
    });
    
    logger.info('🗑️ Denúncias de teste antigas removidas');

    // Criar novas denúncias
    for (const denunciaData of denuncias) {
      const denuncia = await prisma.denuncia.create({
        data: denunciaData
      });
      
      logger.info(`✅ Denúncia criada: ${denuncia.protocolo} - Status: ${denuncia.status}`);
      
      if (denuncia.scheduledPublishAt) {
        logger.info(`📅 Agendada para: ${denuncia.scheduledPublishAt.toLocaleString('pt-BR')}`);
      }
      
      if (denuncia.instagramPostId) {
        logger.info(`📱 Post Instagram: ${denuncia.instagramPostId}`);
      }
      
      logger.info(`🎯 Prioridade: ${denuncia.priority} - Tentativas: ${denuncia.publishAttempts}`);
      logger.info('---');
    }

    logger.info(`🎉 ${denuncias.length} denúncias de teste criadas com sucesso!`);
    
    // Estatísticas
    const stats = {
      total: denuncias.length,
      agendadas: denuncias.filter(d => d.scheduledPublishAt && !d.instagramPostId).length,
      publicadas: denuncias.filter(d => d.instagramPostId).length,
      pendentes: denuncias.filter(d => !d.scheduledPublishAt && !d.instagramPostId && ['APROVADA_ADMIN', 'APROVADA_BOT'].includes(d.status)).length,
      comErro: denuncias.filter(d => d.publishAttempts > 0 && !d.instagramPostId).length,
      altaPrioridade: denuncias.filter(d => d.priority === 1).length
    };
    
    logger.info('📊 Estatísticas das denúncias criadas:');
    logger.info(`   Total: ${stats.total}`);
    logger.info(`   Agendadas: ${stats.agendadas}`);
    logger.info(`   Publicadas: ${stats.publicadas}`);
    logger.info(`   Pendentes: ${stats.pendentes}`);
    logger.info(`   Com Erro: ${stats.comErro}`);
    logger.info(`   Alta Prioridade: ${stats.altaPrioridade}`);

  } catch (error) {
    logger.error('❌ Erro ao criar denúncias de teste:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  createTestDenunciasWithSchedule();
}

module.exports = { createTestDenunciasWithSchedule };