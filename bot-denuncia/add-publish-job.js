const queueManager = require('./src/queues/queueManager');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addPublishJobForDenuncia() {
  try {
    console.log('=== ADICIONANDO JOB DE PUBLICAÇÃO ===');
    
    const denunciaId = 'cmdqqviah0001v3u3d05h549g'; // ID da denúncia DEN-MDQQVIAF-AFP6D
    
    // Verificar se a denúncia está agendada
    const denuncia = await prisma.denuncia.findUnique({
      where: { id: denunciaId },
      select: {
        id: true,
        protocolo: true,
        status: true,
        scheduledPublishAt: true,
        priority: true
      }
    });
    
    if (!denuncia) {
      console.log('❌ Denúncia não encontrada');
      return;
    }
    
    console.log('✅ Denúncia encontrada:');
    console.log('  ID:', denuncia.id);
    console.log('  Protocolo:', denuncia.protocolo);
    console.log('  Status:', denuncia.status);
    console.log('  Agendada para:', denuncia.scheduledPublishAt?.toLocaleString('pt-BR'));
    console.log('  Prioridade:', denuncia.priority);
    
    if (denuncia.status !== 'AGENDADA') {
      console.log('⚠️ Denúncia não está no status AGENDADA');
      return;
    }
    
    // Inicializar queue manager
    console.log('\n🔄 Inicializando Queue Manager...');
    await queueManager.initialize();
    console.log('✅ Queue Manager inicializado');
    
    // Calcular delay se necessário
    let delay = 0;
    if (denuncia.scheduledPublishAt) {
      const now = Date.now();
      const scheduledTime = new Date(denuncia.scheduledPublishAt).getTime();
      delay = Math.max(0, scheduledTime - now);
      
      console.log(`⏰ Delay calculado: ${Math.round(delay / 1000)}s (${Math.round(delay / 60000)}min)`);
    }
    
    // Adicionar job na fila de publicação
    console.log('\n📝 Adicionando job na fila...');
    const job = await queueManager.addJob('publish-queue', 'publish-post', {
      denunciaId: denuncia.id,
      source: 'manual_schedule_fix',
      priority: denuncia.priority || 1
    }, {
      delay,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    });
    
    console.log('✅ Job criado com sucesso!');
    console.log('  Job ID:', job.id);
    console.log('  Delay:', delay);
    console.log('  Status:', job.opts);
    
    console.log('\n=== STATUS DAS FILAS ===');
    const publishQueue = queueManager.getQueue('publish-queue');
    const stats = await publishQueue.getJobCounts();
    
    console.log('📊 Estatísticas da fila de publicação:');
    console.log('  - Aguardando:', stats.waiting);
    console.log('  - Ativos:', stats.active);
    console.log('  - Completos:', stats.completed);
    console.log('  - Falhados:', stats.failed);
    console.log('  - Atrasados:', stats.delayed);
    
  } catch (error) {
    console.error('❌ Erro ao adicionar job:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addPublishJobForDenuncia();