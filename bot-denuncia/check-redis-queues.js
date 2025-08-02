const Redis = require('ioredis');
const { Queue } = require('bullmq');

async function investigateQueues() {
  const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    maxRetriesPerRequest: null,
  });

  try {
    console.log('🔍 Investigando filas do Redis...');

    // Listar todas as chaves do Redis relacionadas a filas
    const keys = await redis.keys('bull:*');
    console.log('📋 Chaves de fila encontradas:', keys.length);
    
    if (keys.length > 0) {
      keys.forEach(key => console.log(`  - ${key}`));
    }

    // Verificar fila de publicação do Instagram
    const publishQueue = new Queue('publishInstagram', { connection: redis });
    const publishQueueCounts = await publishQueue.getJobCounts();
    console.log('\n📤 Fila publishInstagram:', publishQueueCounts);

    // Verificar fila Graph API
    try {
      const graphApiQueue = new Queue('publishInstagramGraphApi', { connection: redis });
      const graphApiCounts = await graphApiQueue.getJobCounts();
      console.log('📸 Fila publishInstagramGraphApi:', graphApiCounts);
    } catch (error) {
      console.log('📸 Fila publishInstagramGraphApi: não encontrada ou erro');
    }

    // Verificar jobs recentes na fila principal
    const recentJobs = await publishQueue.getJobs(['completed', 'failed', 'waiting', 'active'], 0, 20);
    console.log('\n📊 Jobs recentes (últimos 20):');
    
    if (recentJobs.length > 0) {
      for (const job of recentJobs) {
        console.log(`\n🔹 Job ${job.id}:`);
        console.log(`   Estado: ${job.opts.status || 'desconhecido'}`);
        console.log(`   Criado: ${new Date(job.timestamp)}`);
        console.log(`   Processado: ${job.processedOn ? new Date(job.processedOn) : 'Não processado'}`);
        console.log(`   Dados: ${JSON.stringify(job.data, null, 2)}`);
        
        if (job.returnvalue) {
          console.log(`   Resultado: ${JSON.stringify(job.returnvalue, null, 2)}`);
        }
        
        if (job.failedReason) {
          console.log(`   Erro: ${job.failedReason}`);
        }
      }
    } else {
      console.log('   Nenhum job encontrado');
    }

    // Verificar dados de auditoria do Instagram no Redis
    console.log('\n🔍 Verificando logs de auditoria do Instagram...');
    const auditLogs = await redis.lrange('audit:instagram', 0, 10);
    console.log(`📋 Entradas de auditoria encontradas: ${auditLogs.length}`);
    
    if (auditLogs.length > 0) {
      auditLogs.forEach((log, index) => {
        try {
          const parsedLog = JSON.parse(log);
          console.log(`\n📋 Auditoria ${index + 1}:`);
          console.log(`   Timestamp: ${parsedLog.timestamp}`);
          console.log(`   Ação: ${parsedLog.action}`);
          console.log(`   Dados: ${JSON.stringify(parsedLog.data, null, 2)}`);
        } catch (error) {
          console.log(`   Log inválido: ${log}`);
        }
      });
    }

    // Verificar se há workers ativos
    console.log('\n🔍 Verificando workers ativos...');
    const workerKeys = await redis.keys('*worker*');
    console.log(`🏃 Chaves de worker encontradas: ${workerKeys.length}`);
    workerKeys.forEach(key => console.log(`  - ${key}`));

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await redis.disconnect();
  }
}

investigateQueues();