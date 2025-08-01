const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDenuncias() {
  try {
    console.log('=== INVESTIGAÇÃO URGENTE - PROBLEMA DE PUBLICAÇÃO ===\n');
    
    // 1. Buscar denúncias agendadas
    const scheduledDenuncias = await prisma.denuncia.findMany({
      where: {
        status: 'AGENDADA'
      },
      orderBy: { scheduledPublishAt: 'asc' },
      take: 10
    });
    
    console.log(`🔍 DENÚNCIAS AGENDADAS ENCONTRADAS: ${scheduledDenuncias.length}\n`);
    
    if (scheduledDenuncias.length > 0) {
      console.log('📋 Detalhes das denúncias agendadas:');
      const now = new Date();
      scheduledDenuncias.forEach((d, i) => {
        const scheduledTime = d.scheduledPublishAt ? new Date(d.scheduledPublishAt) : null;
        const isPastDue = scheduledTime && scheduledTime < now;
        console.log(`${i+1}. ID: ${d.id}`);
        console.log(`   📅 Criada: ${d.createdAt}`);
        console.log(`   ⏰ Agendada para: ${scheduledTime || 'NÃO DEFINIDO'}`);
        console.log(`   🚨 Status de publicação: ${isPastDue ? '❌ ATRASADA' : '⏳ AGUARDANDO'}`);
        console.log(`   🔄 Tentativas de publicação: ${d.publishAttempts}`);
        console.log(`   🕒 Última tentativa: ${d.lastAttemptAt || 'NUNCA'}`);
        console.log(`   ⚠️ Erro de publicação: ${d.publishError || 'NENHUM'}`);
        console.log(`   📝 Texto: ${d.texto.substring(0, 50)}...`);
        console.log(`   📍 Endereço: ${d.endereco} - ${d.bairro}`);
        
        if (isPastDue) {
          const hoursLate = Math.floor((now - scheduledTime) / (1000 * 60 * 60));
          console.log(`   ⏱️ ATRASADA por: ${hoursLate} horas`);
        }
        
        console.log('   ─────────────────────────────────────────────────');
      });
    }
    
    // 2. Verificar denúncias que falharam recentemente
    const recentFailures = await prisma.denuncia.findMany({
      where: {
        status: 'REJEITADA_ADMIN',
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // últimas 24h
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });
    
    console.log(`\n❌ Denúncias rejeitadas nas últimas 24h: ${recentFailures.length}`);
    
    // 3. Estatísticas gerais
    const totalStats = await prisma.denuncia.groupBy({
      by: ['status'],
      _count: {
        id: true
      }
    });
    
    console.log('\n📊 ESTATÍSTICAS GERAIS:');
    totalStats.forEach(stat => {
      console.log(`   ${stat.status}: ${stat._count.id} denúncias`);
    });
    
    // 4. Verificar se há problema de sessão ou configuração
    console.log('\n🔧 VERIFICAÇÕES TÉCNICAS:');
    console.log('✓ Banco de dados: CONECTADO');
    console.log('✓ Prisma: FUNCIONANDO');
    
    // 5. Última denúncia criada
    const latest = await prisma.denuncia.findFirst({
      orderBy: { createdAt: 'desc' }
    });
    
    if (latest) {
      console.log(`\n📝 Última denúncia registrada:`);
      console.log(`   ID: ${latest.id} | Status: ${latest.status} | Criada: ${latest.createdAt}`);
    }
    
  } catch (error) {
    console.error('❌ ERRO CRÍTICO:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

checkDenuncias().then(() => {
  console.log('\n✅ Investigação concluída');
}).catch(console.error);