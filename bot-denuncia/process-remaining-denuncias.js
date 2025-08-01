require('dotenv').config();
const { addPublishJob } = require('./src/workers/publishWorker');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const logger = require('./src/utils/logger');

async function processRemainingDenuncias() {
  try {
    console.log('🚀 PROCESSAMENTO: Adicionando denúncias restantes à fila...\n');
    
    // Buscar denúncias aprovadas pendentes
    const denunciasPendentes = await prisma.denuncia.findMany({
      where: {
        status: 'APROVADA_ADMIN',
        aprovadaAdmin: true,
        publishedAt: null
      },
      orderBy: { reviewedAt: 'asc' }
    });
    
    if (denunciasPendentes.length === 0) {
      console.log('✅ Nenhuma denúncia pendente de publicação');
      return;
    }
    
    console.log(`📋 Encontradas ${denunciasPendentes.length} denúncias pendentes:`);
    
    // Adicionar cada denúncia à fila com delay progressivo
    for (let i = 0; i < denunciasPendentes.length; i++) {
      const denuncia = denunciasPendentes[i];
      
      console.log(`\n${i+1}. Processando ${denuncia.protocolo}:`);
      console.log(`   - ID: ${denuncia.id}`);
      console.log(`   - Bairro: ${denuncia.bairro}`);
      console.log(`   - Aprovada em: ${denuncia.reviewedAt?.toLocaleString()}`);
      
      try {
        const job = await addPublishJob(denuncia.id, {
          source: 'manual_batch_processing',
          priority: 1, // Alta prioridade
          delay: i * 2 * 60 * 1000, // 2 minutos entre cada post
          attempts: 3
        });
        
        console.log(`   ✅ Adicionado à fila: ${job.id}`);
        
      } catch (error) {
        console.error(`   ❌ Erro ao adicionar à fila: ${error.message}`);
      }
    }
    
    console.log(`\n🎯 RESUMO:`);
    console.log(`   - Total processado: ${denunciasPendentes.length}`);
    console.log(`   - Intervalo entre posts: 2 minutos`);
    console.log(`   - Tempo total estimado: ${denunciasPendentes.length * 2} minutos`);
    console.log(`\n⏳ Inicie os workers para processar a fila:`);
    console.log(`   node src/startWorkers.js`);
    
  } catch (error) {
    console.error('❌ Erro durante processamento:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

processRemainingDenuncias();