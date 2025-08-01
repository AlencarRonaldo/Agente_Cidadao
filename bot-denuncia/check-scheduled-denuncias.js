/**
 * URGENTE: Verificação de Denúncias Agendadas
 * Diagnóstico crítico para identificar problema com agendamentos
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function urgentScheduledCheck() {
  console.log('🚨 INICIANDO DIAGNÓSTICO URGENTE - AGENDAMENTOS');
  console.log('='.repeat(60));
  
  try {
    // 1. VERIFICAR SE EXISTEM DENÚNCIAS AGENDADAS
    console.log('\n📊 1. CONTAGEM GERAL DE STATUS:');
    const statusCount = await prisma.denuncia.groupBy({
      by: ['status'],
      _count: { status: true },
      orderBy: { _count: { status: 'desc' } }
    });
    
    statusCount.forEach(item => {
      console.log(`   ${item.status}: ${item._count.status} registros`);
    });
    
    // 2. VERIFICAR CAMPO scheduledPublishAt 
    console.log('\n⏰ 2. VERIFICAR CAMPO scheduledPublishAt:');
    const withScheduled = await prisma.denuncia.count({
      where: { scheduledPublishAt: { not: null } }
    });
    console.log(`   Denúncias COM scheduledPublishAt: ${withScheduled}`);
    
    const withoutScheduled = await prisma.denuncia.count({
      where: { scheduledPublishAt: null }
    });
    console.log(`   Denúncias SEM scheduledPublishAt: ${withoutScheduled}`);
    
    // 3. VERIFICAR CAMPO priority
    console.log('\n🎯 3. VERIFICAR CAMPO priority:');
    const priorityCount = await prisma.denuncia.groupBy({
      by: ['priority'],
      _count: { priority: true },
      orderBy: { priority: 'asc' }
    });
    
    priorityCount.forEach(item => {
      const priorityLabel = item.priority === 1 ? 'ALTA' : 
                           item.priority === 2 ? 'NORMAL' : 
                           item.priority === 3 ? 'BAIXA' : 'NULL';
      console.log(`   Prioridade ${priorityLabel}: ${item._count.priority} registros`);
    });
    
    // 4. BUSCAR DENÚNCIAS AGENDADAS ESPECÍFICAS
    console.log('\n🔍 4. DETALHES DAS DENÚNCIAS AGENDADAS:');
    const agendadas = await prisma.denuncia.findMany({
      where: { status: 'AGENDADA' },
      select: {
        id: true,
        protocolo: true,
        texto: true,
        bairro: true,
        status: true,
        scheduledPublishAt: true,
        priority: true,
        createdAt: true,
        publishAttempts: true,
        lastAttemptAt: true,
        publishError: true
      },
      orderBy: { scheduledPublishAt: 'asc' },
      take: 10
    });
    
    if (agendadas.length === 0) {
      console.log('   ❌ NENHUMA DENÚNCIA COM STATUS "AGENDADA" ENCONTRADA!');
    } else {
      console.log(`   ✅ Encontradas ${agendadas.length} denúncias agendadas:`);
      agendadas.forEach((denuncia, index) => {
        console.log(`   
        ${index + 1}. ${denuncia.protocolo}
           Status: ${denuncia.status}
           Bairro: ${denuncia.bairro}
           Agendada para: ${denuncia.scheduledPublishAt ? denuncia.scheduledPublishAt.toLocaleString('pt-BR') : 'NULL'}
           Prioridade: ${denuncia.priority || 'NULL'}
           Tentativas: ${denuncia.publishAttempts}
           Último erro: ${denuncia.publishError || 'Nenhum'}
        `);
      });
    }
    
    // 5. VERIFICAR DENÚNCIAS APROVADAS RECENTES
    console.log('\n✅ 5. DENÚNCIAS APROVADAS RECENTES (últimas 24h):');
    const aprovadas = await prisma.denuncia.findMany({
      where: {
        status: 'APROVADA_ADMIN',
        reviewedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Últimas 24h
        }
      },
      select: {
        id: true,
        protocolo: true,
        status: true,
        scheduledPublishAt: true,
        priority: true,
        reviewedAt: true
      },
      orderBy: { reviewedAt: 'desc' }
    });
    
    if (aprovadas.length === 0) {
      console.log('   ⚠️  Nenhuma denúncia aprovada nas últimas 24h');
    } else {
      console.log(`   📋 ${aprovadas.length} denúncias aprovadas encontradas:`);
      aprovadas.forEach((denuncia, index) => {
        console.log(`   
        ${index + 1}. ${denuncia.protocolo}
           Status: ${denuncia.status}
           Aprovada em: ${denuncia.reviewedAt ? denuncia.reviewedAt.toLocaleString('pt-BR') : 'NULL'}
           Agendada para: ${denuncia.scheduledPublishAt ? denuncia.scheduledPublishAt.toLocaleString('pt-BR') : '❌ NÃO AGENDADA'}
           Prioridade: ${denuncia.priority || '❌ SEM PRIORIDADE'}
        `);
      });
    }
    
    // 6. VERIFICAR TOTAL GERAL
    console.log('\n📈 6. RESUMO GERAL:');
    const total = await prisma.denuncia.count();
    const totalAprovadas = await prisma.denuncia.count({ where: { status: 'APROVADA_ADMIN' } });
    const totalPublicadas = await prisma.denuncia.count({ where: { status: 'PUBLICADA' } });
    const totalAgendadas = await prisma.denuncia.count({ where: { status: 'AGENDADA' } });
    
    console.log(`   Total de denúncias: ${total}`);
    console.log(`   Aprovadas (aguardando): ${totalAprovadas}`);
    console.log(`   Agendadas: ${totalAgendadas}`);
    console.log(`   Publicadas: ${totalPublicadas}`);
    
    // 7. DIAGNÓSTICO FINAL
    console.log('\n🔧 7. DIAGNÓSTICO:');
    if (totalAgendadas === 0 && totalAprovadas > 0) {
      console.log('   🚨 PROBLEMA IDENTIFICADO: Denúncias aprovadas não estão sendo agendadas!');
      console.log('   💡 POSSÍVEIS CAUSAS:');
      console.log('      - PublicationScheduler não está funcionando');
      console.log('      - Erro na aprovação não está chamando o agendamento');
      console.log('      - Campos scheduledPublishAt/priority não estão sendo preenchidos');
    } else if (totalAgendadas > 0) {
      console.log('   ✅ Agendamentos estão sendo criados');
      console.log('   💡 VERIFICAR: Por que não aparecem no dashboard?');
    } else {
      console.log('   ⚠️  Nenhuma denúncia agendada encontrada');
    }
    
  } catch (error) {
    console.error('❌ ERRO CRÍTICO:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🚨 DIAGNÓSTICO URGENTE CONCLUÍDO');
}

// Executar imediatamente
urgentScheduledCheck().catch(console.error);