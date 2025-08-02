/**
 * Get a test denúncia ID for debugging
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getTestDenuncia() {
  try {
    console.log('🔍 Looking for existing denúncias...');
    
    // Find any denúncia that can be approved
    const denuncias = await prisma.denuncia.findMany({
      where: {
        status: {
          in: ['PENDENTE_MODERACAO', 'RECEBIDA', 'PROCESSANDO']
        }
      },
      select: {
        id: true,
        protocolo: true,
        status: true,
        texto: true,
        createdAt: true
      },
      take: 5,
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    if (denuncias.length > 0) {
      console.log('✅ Found denúncias for testing:');
      denuncias.forEach((d, i) => {
        console.log(`${i + 1}. ID: ${d.id}`);
        console.log(`   Protocolo: ${d.protocolo}`);
        console.log(`   Status: ${d.status}`);
        console.log(`   Texto: ${d.texto.substring(0, 60)}...`);
        console.log('');
      });
      
      return denuncias[0].id;
    } else {
      console.log('📝 No existing denúncias found. Creating a test one...');
      
      // Create a test denúncia
      const testDenuncia = await prisma.denuncia.create({
        data: {
          protocolo: `TEST-${Date.now()}`,
          texto: 'Esta é uma denúncia de teste para debugar o sistema de aprovação.',
          endereco: 'Rua de Teste, 123 - Centro',
          bairro: 'Centro',
          status: 'PENDENTE_MODERACAO',
          phoneNumber: '+5511999999999',
          approved: false,
          scoreBot: 0.8,
          tempoConversa: 30,
          vereadores: ['Alex Mognon'],
          imagemUrl: null
        }
      });
      
      console.log('✅ Test denúncia created:');
      console.log(`   ID: ${testDenuncia.id}`);
      console.log(`   Protocolo: ${testDenuncia.protocolo}`);
      console.log(`   Status: ${testDenuncia.status}`);
      
      return testDenuncia.id;
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getTestDenuncia().then(id => {
  if (id) {
    console.log('\n🎯 Use this ID for testing:');
    console.log(id);
  }
});