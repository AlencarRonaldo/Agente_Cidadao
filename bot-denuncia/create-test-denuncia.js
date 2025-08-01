/**
 * URGENTE: Criar denúncia de teste para verificar ações
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestDenuncia() {
  console.log('🚨 CRIANDO DENÚNCIA DE TESTE');
  console.log('='.repeat(40));
  
  try {
    // Criar denúncia com status PENDENTE_MODERACAO para testar todas as ações
    const denuncia = await prisma.denuncia.create({
      data: {
        protocolo: `DEN-TEST-${Date.now().toString().slice(-6)}`,
        texto: 'Teste de denúncia para verificar ações - semáforo quebrado na Rua das Flores',
        textoFiltrado: 'Teste de denúncia para verificar ações - semáforo quebrado na Rua das Flores',
        endereco: 'Rua das Flores, 123',
        bairro: 'CENTRO',
        imagemUrl: '/uploads/test-image.jpg',
        status: 'PENDENTE_MODERACAO', // Status que permite todas as ações
        vereadores: ['João Silva', 'Maria Santos'],
        phoneNumber: '+5511999999999',
        aprovadaBot: true,
        scoreBot: 0.85,
        priority: 2, // Prioridade normal
        createdAt: new Date(),
        processedAt: new Date()
      }
    });
    
    console.log('✅ DENÚNCIA DE TESTE CRIADA:');
    console.log(`   ID: ${denuncia.id}`);
    console.log(`   Protocolo: ${denuncia.protocolo}`);
    console.log(`   Status: ${denuncia.status}`);
    console.log(`   Texto: ${denuncia.texto}`);
    console.log(`   Bairro: ${denuncia.bairro}`);
    
    // Verificar se existem denúncias pendentes agora
    const pendentes = await prisma.denuncia.count({
      where: { status: 'PENDENTE_MODERACAO' }
    });
    
    console.log(`\n📊 TOTAL DE DENÚNCIAS PENDENTES: ${pendentes}`);
    console.log('   💡 Estas denúncias podem ser aprovadas, rejeitadas ou editadas');
    
    // Listar todas as denúncias para conferir
    const todas = await prisma.denuncia.findMany({
      select: {
        id: true,
        protocolo: true,
        status: true,
        bairro: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('\n📋 TODAS AS DENÚNCIAS:');
    todas.forEach((d, index) => {
      console.log(`   ${index + 1}. ${d.protocolo} - ${d.status} - ${d.bairro} - ${d.createdAt.toLocaleString('pt-BR')}`);
    });
    
  } catch (error) {
    console.error('❌ ERRO:', error.message);
  } finally {
    await prisma.$disconnect();
  }
  
  console.log('\n' + '='.repeat(40));
  console.log('🚨 CRIAÇÃO CONCLUÍDA');
  console.log('💡 Agora teste as ações no admin panel!');
}

createTestDenuncia().catch(console.error);