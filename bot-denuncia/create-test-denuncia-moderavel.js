const { PrismaClient } = require('@prisma/client');

async function createTestDenuncia() {
  const prisma = new PrismaClient();
  
  try {
    // Criar uma denúncia com status PENDENTE_MODERACAO para testar o botão
    const denuncia = await prisma.denuncia.create({
      data: {
        protocolo: `DEN-TEST-MODERACAO-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        texto: 'Teste para verificar botão Aprovar e Postar - buraco perigoso na esquina',
        endereco: 'Rua das Flores, 123 - Centro',
        bairro: 'CENTRO',
        imagemUrl: 'https://via.placeholder.com/400x300.jpg?text=Teste',
        status: 'PENDENTE_MODERACAO', // Status que permite moderação
        phoneNumber: '+5511999999999',
        textoFiltrado: 'Teste para verificar botão Aprovar e Postar - buraco perigoso na esquina',
        priority: 1 // 1=alta
      }
    });
    
    console.log('✅ Denúncia de teste criada com sucesso:');
    console.log(`📋 Protocolo: ${denuncia.protocolo}`);
    console.log(`📍 Status: ${denuncia.status}`);
    console.log(`📝 Texto: ${denuncia.texto}`);
    console.log(`🏙️ Bairro: ${denuncia.bairro}`);
    
    // Criar mais uma com status RECEBIDA
    const denuncia2 = await prisma.denuncia.create({
      data: {
        protocolo: `DEN-TEST-RECEBIDA-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        texto: 'Segunda denúncia para teste - iluminação pública quebrada',
        endereco: 'Avenida Central, 456 - Vila São Pedro',
        bairro: 'VILA SÃO PEDRO',
        imagemUrl: 'https://via.placeholder.com/400x300.jpg?text=Teste+2',
        status: 'RECEBIDA', // Status que permite moderação
        phoneNumber: '+5511888888888',
        textoFiltrado: 'Segunda denúncia para teste - iluminação pública quebrada',
        priority: 2 // 2=normal
      }
    });
    
    console.log('\n✅ Segunda denúncia de teste criada:');
    console.log(`📋 Protocolo: ${denuncia2.protocolo}`);
    console.log(`📍 Status: ${denuncia2.status}`);
    console.log(`📝 Texto: ${denuncia2.texto}`);
    console.log(`🏙️ Bairro: ${denuncia2.bairro}`);
    
    console.log('\n🎯 Agora o teste do botão "Aprovar e Postar" deve funcionar!');
    
  } catch (error) {
    console.error('❌ Erro ao criar denúncia de teste:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestDenuncia();