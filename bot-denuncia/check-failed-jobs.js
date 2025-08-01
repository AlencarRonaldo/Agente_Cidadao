const queueManager = require('./src/queues/queueManager');
const logger = require('./src/utils/logger');

async function checkFailedJobs() {
  try {
    console.log('🔍 DIAGNÓSTICO: Verificando jobs falhados na fila...\n');
    
    // Inicializar queue manager
    await queueManager.initialize();
    
    // Obter fila de publicação
    const publishQueue = queueManager.getQueue('publish-queue');
    
    // Obter jobs falhados
    console.log('1. Obtendo jobs falhados...');
    const failedJobs = await publishQueue.getFailed();
    console.log(`   - Total de jobs falhados: ${failedJobs.length}\n`);
    
    if (failedJobs.length > 0) {
      console.log('2. Detalhes dos últimos 5 jobs falhados:');
      const recentFailures = failedJobs.slice(-5).reverse(); // Últimos 5, mais recente primeiro
      
      recentFailures.forEach((job, index) => {
        console.log(`\n📋 Job ${index + 1}:`);
        console.log(`   - ID: ${job.id}`);
        console.log(`   - Nome: ${job.name}`);
        console.log(`   - Dados:`, JSON.stringify(job.data, null, 2));
        console.log(`   - Tentativas: ${job.attemptsMade}/${job.opts.attempts}`);
        console.log(`   - Criado em: ${new Date(job.timestamp).toLocaleString()}`);
        console.log(`   - Falhou em: ${job.finishedOn ? new Date(job.finishedOn).toLocaleString() : 'N/A'}`);
        console.log(`   - Erro: ${job.failedReason || 'Não especificado'}`);
        
        if (job.stacktrace && job.stacktrace.length > 0) {
          console.log(`   - Stack trace: ${job.stacktrace[0]}`);
        }
        console.log('   ---');
      });
    }
    
    console.log('\n3. Limpando jobs falhados antigos...');
    const cleaned = await publishQueue.clean(24 * 60 * 60 * 1000, 'failed'); // Limpar jobs falhados > 24h
    console.log(`   - Jobs limpos: ${cleaned.length}`);
    
  } catch (error) {
    console.error('❌ Erro ao verificar jobs falhados:', error.message);
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

checkFailedJobs();