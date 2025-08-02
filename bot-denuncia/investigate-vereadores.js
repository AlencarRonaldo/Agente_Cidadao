const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function investigateVereadores() {
  try {
    console.log('🔍 Investigando vereadores no sistema...');
    
    // Buscar todos os vereadores
    const vereadores = await prisma.vereador.findMany({
      orderBy: { nome: 'asc' }
    });
    
    console.log('📊 Total de vereadores:', vereadores.length);
    
    if (vereadores.length > 0) {
      console.log('\n📋 Vereadores cadastrados:');
      vereadores.forEach((vereador, index) => {
        console.log(`${index + 1}. ${vereador.nome}`);
        console.log(`   Instagram: ${vereador.instagram}`);
        console.log(`   Partido: ${vereador.partido}`);
        console.log(`   Ativo: ${vereador.ativo}`);
        console.log(`   Bairros: ${vereador.bairros.join(', ')}`);
        console.log(`   Menções: ${vereador.mencoes}`);
        console.log('   ---');
      });
    }
    
    // Buscar especificamente por "coronelmarcosfontes"
    console.log('\n🔍 Buscando "coronelmarcosfontes"...');
    const marcosfontes = await prisma.vereador.findMany({
      where: {
        OR: [
          { instagram: { contains: 'coronelmarcosfontes' } },
          { nome: { contains: 'marcos' } },
          { nome: { contains: 'fontes' } }
        ]
      }
    });
    
    console.log('🎯 Vereadores encontrados:', marcosfontes.length);
    
    if (marcosfontes.length > 0) {
      marcosfontes.forEach((vereador, index) => {
        console.log(`\n🎯 VEREADOR ${index + 1}:`);
        console.log(`   Nome: ${vereador.nome}`);
        console.log(`   Instagram: ${vereador.instagram}`);
        console.log(`   Partido: ${vereador.partido}`);
        console.log(`   Bairros: ${vereador.bairros.join(', ')}`);
        console.log(`   Ativo: ${vereador.ativo}`);
        console.log(`   Menções: ${vereador.mencoes}`);
      });
    }
    
    // Verificar se há denúncias relacionadas a vereadores nas últimas 8 horas
    console.log('\n🔍 Buscando denúncias com vereadores das últimas 8 horas...');
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - 8);
    
    const denunciasComVereadores = await prisma.denuncia.findMany({
      where: {
        AND: [
          { createdAt: { gte: cutoffTime } },
          { vereadores: { isEmpty: false } }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('📋 Denúncias com vereadores encontradas:', denunciasComVereadores.length);
    
    if (denunciasComVereadores.length > 0) {
      denunciasComVereadores.forEach((denuncia, index) => {
        console.log(`\n📋 DENÚNCIA ${index + 1}:`);
        console.log(`   Protocolo: ${denuncia.protocolo}`);
        console.log(`   Status: ${denuncia.status}`);
        console.log(`   Vereadores: ${JSON.stringify(denuncia.vereadores)}`);
        console.log(`   Texto: ${denuncia.texto.substring(0, 150)}...`);
        console.log(`   Publicado: ${denuncia.publishedAt || 'Não publicado'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

investigateVereadores();