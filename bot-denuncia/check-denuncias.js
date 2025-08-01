const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDenuncias() {
  try {
    console.log('🔍 DIAGNÓSTICO: Verificando denúncias aprovadas não publicadas...\n');
    
    // Buscar denúncias aprovadas pelo admin mas não publicadas
    const aprovadas = await prisma.denuncia.findMany({
      where: {
        status: 'APROVADA_ADMIN',
        aprovadaAdmin: true,
        publishedAt: null
      },
      select: {
        id: true,
        protocolo: true,
        status: true,
        aprovadaAdmin: true,
        reviewedAt: true,
        publishedAt: true,
        createdAt: true,
        texto: true
      },
      orderBy: { reviewedAt: 'desc' }
    });
    
    console.log('📊 RESULTADO:');
    console.log('Denúncias aprovadas não publicadas:', aprovadas.length);
    
    if (aprovadas.length > 0) {
      console.log('\n🚨 DENÚNCIAS PENDENTES DE PUBLICAÇÃO:');
      aprovadas.forEach((d, i) => {
        console.log(`${i+1}. ID: ${d.id}`);
        console.log(`   Protocolo: ${d.protocolo}`);
        console.log(`   Status: ${d.status}`);
        console.log(`   Aprovada em: ${d.reviewedAt}`);
        console.log(`   Texto: ${d.texto.substring(0, 100)}...`);
        console.log('---');
      });
    }
    
    // Estatísticas gerais
    const stats = await prisma.denuncia.groupBy({
      by: ['status'],
      _count: { id: true }
    });
    
    console.log('\n📈 ESTATÍSTICAS GERAIS:');
    stats.forEach(s => {
      console.log(`${s.status}: ${s._count.id}`);
    });
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDenuncias();