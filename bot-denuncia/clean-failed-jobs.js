const queueManager = require('./src/queues/queueManager');
const logger = require('./src/utils/logger');

async function cleanFailedJobs() {
  try {
    console.log('🧹 LIMPEZA: Removendo jobs falhados...\n');
    
    // Inicializar queue manager
    await queueManager.initialize();
    
    // Obter fila de publicação
    const publishQueue = queueManager.getQueue('publish-queue');
    
    // Limpar todos os jobs falhados
    console.log('1. Limpando jobs falhados...');
    const cleaned = await publishQueue.clean(0, 'failed'); // Limpar todos os jobs falhados
    console.log(`   - Jobs falhados removidos: ${cleaned.length}`);
    
    // Também limpar jobs completos antigos
    const completedCleaned = await publishQueue.clean(0, 'completed');
    console.log(`   - Jobs completos removidos: ${completedCleaned.length}`);
    
    // Verificar status após limpeza
    const stats = await queueManager.getQueueStats('publish-queue');
    console.log('\n2. Status após limpeza:');
    console.log('   - Aguardando:', stats.counts.waiting);
    console.log('   - Ativo:', stats.counts.active);
    console.log('   - Completos:', stats.counts.completed);
    console.log('   - Falhados:', stats.counts.failed);
    console.log('   - Atrasados:', stats.counts.delayed);
    
  } catch (error) {
    console.error('❌ Erro na limpeza:', error.message);
  } finally {
    try {
      await queueManager.shutdown();
      console.log('\n✅ Limpeza concluída');
    } catch (e) {
      console.error('Erro ao finalizar:', e.message);
    }
    process.exit(0);
  }
}

cleanFailedJobs();