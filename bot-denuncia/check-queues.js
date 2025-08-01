const queueManager = require('./src/queues/queueManager');
const logger = require('./src/utils/logger');

async function checkQueues() {
  try {
    console.log('🔍 DIAGNÓSTICO: Verificando status das filas...\n');
    
    // Tentar inicializar o queue manager
    console.log('1. Inicializando Queue Manager...');
    await queueManager.initialize();
    console.log('✅ Queue Manager inicializado\n');
    
    // Verificar health check
    console.log('2. Verificando saúde do sistema...');
    const health = await queueManager.healthCheck();
    console.log('Status de saúde:', health);
    console.log('');
    
    // Verificar estatísticas da fila de publicação
    console.log('3. Verificando fila de publicação...');
    const publishStats = await queueManager.getQueueStats('publish-queue');
    if (publishStats) {
      console.log('📊 Estatísticas da fila de publicação:');
      console.log('  - Aguardando:', publishStats.counts.waiting);
      console.log('  - Ativo:', publishStats.counts.active);
      console.log('  - Completos:', publishStats.counts.completed);
      console.log('  - Falhados:', publishStats.counts.failed);
      console.log('  - Atrasados:', publishStats.counts.delayed);
      console.log('  - Saudável:', publishStats.health.isHealthy ? '✅' : '❌');
    } else {
      console.log('❌ Não foi possível obter estatísticas da fila');
    }
    console.log('');
    
    // Verificar fila de processamento também
    console.log('4. Verificando fila de processamento...');
    const processStats = await queueManager.getQueueStats('process-queue');
    if (processStats) {
      console.log('📊 Estatísticas da fila de processamento:');
      console.log('  - Aguardando:', processStats.counts.waiting);
      console.log('  - Ativo:', processStats.counts.active);
      console.log('  - Completos:', processStats.counts.completed);
      console.log('  - Falhados:', processStats.counts.failed);
      console.log('  - Atrasados:', processStats.counts.delayed);
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar filas:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    try {
      await queueManager.shutdown();
      console.log('\n✅ Queue Manager finalizado');
    } catch (e) {
      console.error('Erro ao finalizar:', e.message);
    }
    process.exit(0);
  }
}

checkQueues();