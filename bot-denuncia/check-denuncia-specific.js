const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function searchDenuncias() {
  try {
    // Buscar por padrão similar
    const denuncias = await prisma.denuncia.findMany({
      where: {
        OR: [
          { id: { contains: 'MDQQVIAF' } },
          { id: { contains: 'AFP6D' } },
          { id: { contains: 'DEN-MDQQVIAF-AFP6D' } }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });
    
    console.log('=== BUSCANDO PADRÕES SIMILARES ===');
    console.log('Denúncias encontradas:', denuncias.length);
    
    if (denuncias.length > 0) {
      denuncias.forEach((d, i) => {
        console.log(`--- Denúncia ${i+1} ---`);
        console.log('ID:', d.id);
        console.log('Status:', d.status);
        console.log('Criado em:', d.createdAt);
        console.log('Schedulado para:', d.scheduledPublishAt);
        console.log('Tentativas:', d.publishAttempts);
        console.log('Publicado:', d.publishedAt);
        console.log('');
      });
    }
    
    // Buscar denúncias recentes não publicadas
    const unpublished = await prisma.denuncia.findMany({
      where: {
        status: { not: 'PUBLICADA' }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    console.log('=== DENÚNCIAS NÃO PUBLICADAS RECENTES ===');
    console.log('Total:', unpublished.length);
    unpublished.forEach((d, i) => {
      console.log(`${i+1}. ID: ${d.id}, Status: ${d.status}, Criado: ${d.createdAt}, Schedulado: ${d.scheduledPublishAt}`);
    });

    // Buscar por protocolo similar
    const byProtocol = await prisma.denuncia.findMany({
      where: {
        protocolo: { contains: 'MDQQVIAF' }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });
    
    console.log('=== BUSCA POR PROTOCOLO ===');
    console.log('Denúncias com protocolo similar:', byProtocol.length);
    byProtocol.forEach((d, i) => {
      console.log(`${i+1}. ID: ${d.id}, Protocolo: ${d.protocolo}, Status: ${d.status}`);
      console.log(`   Schedulado: ${d.scheduledPublishAt}, Tentativas: ${d.publishAttempts}`);
      console.log(`   Erro: ${d.publishError}`);
    });
    
  } catch (error) {
    console.error('Erro ao buscar denúncias:', error);
  } finally {
    await prisma.$disconnect();
  }
}

searchDenuncias();