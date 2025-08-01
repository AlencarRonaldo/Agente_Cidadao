const { PrismaClient } = require('@prisma/client');
const PublicationScheduler = require('./src/services/publicationScheduler');

const prisma = new PrismaClient();

async function testScheduleSpecificDenuncia() {
  try {
    console.log('=== TESTE DE AGENDAMENTO PARA DENÚNCIA ESPECÍFICA ===');
    
    // Buscar denúncia específica
    const denunciaId = 'cmdqqviah0001v3u3d05h549g'; // ID real da denúncia DEN-MDQQVIAF-AFP6D
    
    const denuncia = await prisma.denuncia.findUnique({
      where: { id: denunciaId }
    });
    
    if (!denuncia) {
      console.log('❌ Denúncia não encontrada');
      return;
    }
    
    console.log('✅ Denúncia encontrada:');
    console.log('  ID:', denuncia.id);
    console.log('  Protocolo:', denuncia.protocolo);
    console.log('  Status atual:', denuncia.status);
    console.log('  Schedulado atual:', denuncia.scheduledPublishAt);
    
    console.log('\n=== TESTANDO AGENDAMENTO ===');
    
    // Criar instância do scheduler
    const scheduler = new PublicationScheduler();
    
    // Tentar agendar a publicação
    console.log('🔄 Tentando agendar publicação...');
    const result = await scheduler.schedulePublication(denunciaId, 1);
    
    console.log('\n=== RESULTADO DO AGENDAMENTO ===');
    console.log('Success:', result.success);
    
    if (result.success) {
      console.log('✅ Agendamento bem-sucedido!');
      console.log('  Horário agendado:', result.scheduledTime.toLocaleString('pt-BR'));
      console.log('  É horário ótimo:', result.isOptimalTime);
      
      // Verificar se foi realmente salvo no banco
      const denunciaAtualizada = await prisma.denuncia.findUnique({
        where: { id: denunciaId },
        select: {
          status: true,
          scheduledPublishAt: true,
          priority: true
        }
      });
      
      console.log('\n=== VERIFICAÇÃO NO BANCO ===');
      console.log('  Status atualizado:', denunciaAtualizada.status);
      console.log('  Schedulado para:', denunciaAtualizada.scheduledPublishAt);
      console.log('  Prioridade:', denunciaAtualizada.priority);
      
    } else {
      console.log('❌ Falha no agendamento');
      console.log('  Erro:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Erro durante teste:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testScheduleSpecificDenuncia();