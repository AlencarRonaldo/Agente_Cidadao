require('dotenv').config();
const publishWorker = require('./src/workers/publishWorker');
const queueManager = require('./src/queues/queueManager');
const prisma = require('./src/config/database');
const logger = require('./src/utils/logger');

async function testPublishWorker() {
  console.log('=== TESTE DO WORKER DE PUBLICAÇÃO ===\n');
  
  try {
    // 1. Verificar se o worker pode ser inicializado
    console.log('1. Inicializando worker...');
    await publishWorker.ensureProcessorSetup();
    console.log('   ✅ Worker inicializado com sucesso');
    
    // 2. Verificar estatísticas da fila
    console.log('\n2. Verificando estatísticas da fila...');
    const stats = await publishWorker.getPublishQueueStats();
    if (stats) {
      console.log('   📊 Estatísticas:');
      console.log(`      - Jobs aguardando: ${stats.counts.waiting || 0}`);
      console.log(`      - Jobs ativo: ${stats.counts.active || 0}`);
      console.log(`      - Jobs completos: ${stats.counts.completed || 0}`);
      console.log(`      - Jobs falharam: ${stats.counts.failed || 0}`);
      console.log(`      - Publicações hoje: ${stats.publicacoesHoje || 0}`);
      console.log(`      - Limite restante: ${stats.limiteRestante || 0}`);
    } else {
      console.log('   ❌ Não foi possível obter estatísticas');
    }
    
    // 3. Buscar denúncias agendadas
    console.log('\n3. Verificando denúncias agendadas no banco...');
    const denunciasAgendadas = await prisma.denuncia.findMany({
      where: {
        status: 'AGENDADA'
      },
      orderBy: { scheduledPublishAt: 'asc' }
    });
    
    console.log(`   📋 Encontradas ${denunciasAgendadas.length} denúncias agendadas`);
    
    if (denunciasAgendadas.length > 0) {
      const now = new Date();
      
      denunciasAgendadas.forEach((d, i) => {
        const scheduledTime = d.scheduledPublishAt ? new Date(d.scheduledPublishAt) : null;
        const isPastDue = scheduledTime && scheduledTime < now;
        const minutesUntil = scheduledTime ? Math.floor((scheduledTime - now) / (1000 * 60)) : null;
        
        console.log(`   ${i+1}. ID: ${d.id}`);
        console.log(`      - Agendado para: ${scheduledTime || 'NÃO DEFINIDO'}`);
        console.log(`      - Status: ${isPastDue ? '❌ ATRASADA' : '⏳ AGUARDANDO'}`);
        
        if (isPastDue) {
          console.log(`      - ⚠️ Atrasada por ${Math.abs(minutesUntil)} minutos`);
        } else if (minutesUntil) {
          console.log(`      - ⏱️ Faltam ${minutesUntil} minutos`);
        }
      });
      
      // 4. Tentar processar uma denúncia agendada manualmente
      const pastDue = denunciasAgendadas.find(d => {
        const scheduledTime = d.scheduledPublishAt ? new Date(d.scheduledPublishAt) : null;
        return scheduledTime && scheduledTime < now;
      });
      
      if (pastDue) {
        console.log(`\n4. Testando publicação manual da denúncia atrasada: ${pastDue.id}`);
        
        try {
          const job = await publishWorker.addPublishJob(pastDue.id, {
            source: 'manual_test',
            priority: 1
          });
          
          console.log('   ✅ Job de publicação adicionado com sucesso');
          console.log(`   📝 Job ID: ${job.id}`);
          
          // Aguardar um pouco para ver se processa
          console.log('   ⏳ Aguardando processamento...');
          await new Promise(resolve => setTimeout(resolve, 10000)); // 10 segundos
          
          // Verificar se foi processado
          const updatedDenuncia = await prisma.denuncia.findUnique({
            where: { id: pastDue.id }
          });
          
          if (updatedDenuncia.status === 'PUBLICADA') {
            console.log('   ✅ Denúncia publicada com sucesso!');
          } else {
            console.log(`   ⚠️ Status ainda é: ${updatedDenuncia.status}`);
          }
          
        } catch (error) {
          console.log(`   ❌ Erro ao tentar publicar: ${error.message}`);
        }
      } else {
        console.log('\n4. Não há denúncias atrasadas para testar');
      }
    }
    
    // 5. Verificar se Redis está funcionando
    console.log('\n5. Verificando Redis...');
    const Redis = require('ioredis');
    const redis = new Redis('redis://localhost:6379');
    
    try {
      await redis.ping();
      console.log('   ✅ Redis conectado');
      
      const queueKeys = await redis.keys('bull:publish-queue:*');
      console.log(`   📊 ${queueKeys.length} chaves da fila encontradas`);
      
    } catch (redisError) {
      console.log(`   ❌ Erro Redis: ${redisError.message}`);
    } finally {
      await redis.quit();
    }
    
  } catch (error) {
    console.error('❌ ERRO NO TESTE:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    // Fechar conexões
    if (queueManager.isInitialized) {
      await queueManager.close();
    }
    await prisma.$disconnect();
  }
}

testPublishWorker().then(() => {
  console.log('\n✅ Teste concluído');
}).catch(console.error);