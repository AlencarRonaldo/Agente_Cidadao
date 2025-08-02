const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function investigatePost() {
  try {
    console.log('🔍 Buscando denúncias das últimas 8 horas...');
    
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - 8);
    
    const recentDenuncias = await prisma.denuncia.findMany({
      where: {
        OR: [
          { createdAt: { gte: cutoffTime } },
          { publishedAt: { gte: cutoffTime } },
          { processedAt: { gte: cutoffTime } }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    
    console.log('📊 Total de denúncias encontradas:', recentDenuncias.length);
    
    if (recentDenuncias.length > 0) {
      console.log('\n📋 Últimas denúncias:');
      recentDenuncias.forEach((denuncia, index) => {
        console.log(`${index + 1}. ${denuncia.protocolo}`);
        console.log(`   Status: ${denuncia.status}`);
        console.log(`   Criado: ${denuncia.createdAt}`);
        console.log(`   Publicado: ${denuncia.publishedAt || 'Não publicado'}`);
        console.log(`   Post ID: ${denuncia.instagramPostId || 'N/A'}`);
        console.log(`   Texto: ${denuncia.texto?.substring(0, 100)}...`);
        console.log('   ---');
      });
    }
    
    // Buscar especificamente por posts com conteúdo similar ao reportado
    console.log('\n🔍 Buscando posts com conteúdo similar ao reportado...');
    const suspiciousPosts = await prisma.denuncia.findMany({
      where: {
        AND: [
          { status: 'PUBLICADA' },
          { publishedAt: { gte: cutoffTime } },
          {
            OR: [
              { texto: { contains: 'coronelmarcosfontes' } },
              { texto: { contains: 'Pedimos apoio dos vereadores' } },
              { texto: { contains: 'DenunciaCidada' } }
            ]
          }
        ]
      },
      orderBy: { publishedAt: 'desc' }
    });
    
    console.log('🚨 Posts suspeitos encontrados:', suspiciousPosts.length);
    
    if (suspiciousPosts.length > 0) {
      suspiciousPosts.forEach((post, index) => {
        console.log(`\n🚨 POST SUSPEITO ${index + 1}:`);
        console.log(`   Protocolo: ${post.protocolo}`);
        console.log(`   Status: ${post.status}`);
        console.log(`   Publicado em: ${post.publishedAt}`);
        console.log(`   Post ID: ${post.instagramPostId}`);
        console.log(`   Texto completo: ${post.texto}`);
        if (post.vereadores) {
          console.log(`   Vereadores: ${JSON.stringify(post.vereadores)}`);
        }
      });
    }
    
    // Verificar também posts que podem ter sido criados automaticamente
    console.log('\n🔍 Buscando posts genéricos ou automáticos...');
    const genericPosts = await prisma.denuncia.findMany({
      where: {
        AND: [
          { publishedAt: { gte: cutoffTime } },
          {
            OR: [
              { texto: { contains: 'DENÚNCIA CIDADÃ' } },
              { texto: { contains: 'Pedimos apoio dos vereadores nesta questão importante' } },
              { motivoRejeicaoBot: { contains: 'template' } }
            ]
          }
        ]
      },
      orderBy: { publishedAt: 'desc' }
    });
    
    console.log('🤖 Posts genéricos/automáticos encontrados:', genericPosts.length);
    
    if (genericPosts.length > 0) {
      genericPosts.forEach((post, index) => {
        console.log(`\n🤖 POST GENÉRICO ${index + 1}:`);
        console.log(`   Protocolo: ${post.protocolo}`);
        console.log(`   Status: ${post.status}`);
        console.log(`   Publicado em: ${post.publishedAt}`);
        console.log(`   Texto: ${post.texto}`);
        console.log(`   Motivo rejeição: ${post.motivoRejeicaoBot || 'N/A'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

investigatePost();