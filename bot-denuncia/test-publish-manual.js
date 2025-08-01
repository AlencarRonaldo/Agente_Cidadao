require('dotenv').config();
const { addPublishJob } = require('./src/workers/publishWorker');
const logger = require('./src/utils/logger');

async function testManualPublish() {
  try {
    console.log('🔍 TESTE: Forçando publicação manual de denúncia aprovada...\n');
    
    // ID da primeira denúncia aprovada que não foi publicada
    const denunciaId = 'cmdqnml310001h3974i7mblji'; // DEN-MDQNML30-N1XL0
    
    console.log('1. Adicionando à fila de publicação...');
    console.log('   - ID:', denunciaId);
    
    const job = await addPublishJob(denunciaId, {
      source: 'manual_test',
      priority: 2, // Prioridade máxima
      delay: 0,
      attempts: 3
    });
    
    console.log('   - Job criado:', job.id);
    console.log('   - Prioridade:', job.opts.priority);
    console.log('');
    
    console.log('2. Aguardando processamento...');
    console.log('   ⏳ Monitore os logs dos workers para ver o resultado');
    console.log('   ⏳ Verifique o Instagram em alguns segundos');
    
  } catch (error) {
    console.error('❌ Erro durante teste manual:', error.message);
    console.error('Stack:', error.stack);
  }
}

testManualPublish();