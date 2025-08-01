require('dotenv').config();
const publishWorker = require('./src/workers/publishWorker');
const prisma = require('./src/config/database');
const { CONFIG } = require('./src/config/constants');

async function forcePublishNow() {
  console.log('=== PUBLICAÇÃO FORÇADA IMEDIATA ===\n');
  
  try {
    // 1. Buscar denúncias agendadas
    const denunciasAgendadas = await prisma.denuncia.findMany({
      where: {
        status: 'AGENDADA'
      },
      orderBy: { scheduledPublishAt: 'asc' }
    });
    
    console.log(`🔍 Encontradas ${denunciasAgendadas.length} denúncias agendadas\n`);
    
    if (denunciasAgendadas.length === 0) {
      console.log('❌ Nenhuma denúncia agendada para publicar');
      return;
    }
    
    // 2. Mostrar denúncias que serão publicadas
    console.log('📋 Denúncias que serão publicadas:');
    denunciasAgendadas.forEach((d, i) => {
      console.log(`${i+1}. ID: ${d.id}`);
      console.log(`   📅 Agendada para: ${d.scheduledPublishAt}`);
      console.log(`   📝 Texto: ${d.texto.substring(0, 60)}...`);
      console.log(`   📍 Local: ${d.endereco} - ${d.bairro}`);
      console.log('   ────────────────────────────');
    });
    
    // 3. Confirmar ação
    console.log(`\n⚠️  ATENÇÃO: Isso irá publicar ${denunciasAgendadas.length} denúncia(s) IMEDIATAMENTE`);
    console.log(`📊 Limite atual: ${CONFIG.MAX_POSTS_PER_DAY} por dia`);
    console.log('🚀 Forçando publicação em 5 segundos...\n');
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // 4. Inicializar worker
    await publishWorker.ensureProcessorSetup();
    
    // 5. Publicar cada denúncia
    for (let i = 0; i < denunciasAgendadas.length; i++) {
      const denuncia = denunciasAgendadas[i];
      
      console.log(`🚀 Publicando denúncia ${i+1}/${denunciasAgendadas.length}: ${denuncia.id}`);
      
      try {
        // Adicionar job com alta prioridade e sem delay
        const job = await publishWorker.addPublishJob(denuncia.id, {
          priority: 10, // Alta prioridade
          delay: 0,     // Sem delay
          source: 'force_publish',
          attempts: 1   // Só uma tentativa
        });
        
        console.log(`   ✅ Job criado: ${job.id}`);
        
        // Aguardar um pouco entre publicações
        if (i < denunciasAgendadas.length - 1) {
          console.log('   ⏳ Aguardando 30 segundos antes da próxima...');
          await new Promise(resolve => setTimeout(resolve, 30000));
        }
        
      } catch (error) {
        console.log(`   ❌ Erro ao criar job: ${error.message}`);
      }
    }
    
    console.log('\n✅ Todos os jobs de publicação foram criados!');
    console.log('⏳ Os posts devem aparecer no Instagram em alguns minutos...');
    
    // 6. Monitorar por 2 minutos
    console.log('\n📊 Monitorando publicações por 2 minutos...\n');
    
    for (let minute = 1; minute <= 2; minute++) {
      await new Promise(resolve => setTimeout(resolve, 60000)); // 1 minuto
      
      // Verificar quantas foram publicadas
      const publicadas = await prisma.denuncia.count({
        where: {
          id: { in: denunciasAgendadas.map(d => d.id) },
          status: 'PUBLICADA'
        }
      });
      
      const agendadas = await prisma.denuncia.count({
        where: {
          id: { in: denunciasAgendadas.map(d => d.id) },
          status: 'AGENDADA'
        }
      });
      
      console.log(`📊 Minuto ${minute}: ${publicadas} publicadas, ${agendadas} ainda agendadas`);
    }
    
    // 7. Status final
    console.log('\n📋 STATUS FINAL:');
    
    for (const denuncia of denunciasAgendadas) {
      const updated = await prisma.denuncia.findUnique({
        where: { id: denuncia.id }
      });
      
      console.log(`   ${updated.status === 'PUBLICADA' ? '✅' : '⏳'} ${denuncia.id}: ${updated.status}`);
      
      if (updated.publishedAt) {
        console.log(`      📅 Publicada em: ${updated.publishedAt}`);
      }
    }
    
  } catch (error) {
    console.error('❌ ERRO:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

forcePublishNow().then(() => {
  console.log('\n🎉 Publicação forçada concluída!');
}).catch(console.error);