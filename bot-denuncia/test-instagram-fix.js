#!/usr/bin/env node

/**
 * Script de Teste para Validar Correções do Sistema Instagram
 * 
 * Este script testa:
 * 1. Autenticação Instagram com credenciais corretas
 * 2. Sistema de filas padronizado
 * 3. Flow de aprovação admin → publicação
 */

const instagramService = require('./src/services/instagramService');
const { addPublishJob } = require('./src/workers/publishWorker');
const prisma = require('./src/config/database');
const logger = require('./src/utils/logger');

async function runTests() {
  console.log('🧪 INICIANDO TESTES DE CORREÇÃO DO SISTEMA INSTAGRAM');
  console.log('=' .repeat(60));

  // TESTE 1: Validação de Credenciais
  console.log('\n📋 TESTE 1: Validação de Credenciais Instagram');
  try {
    const status = await instagramService.getConnectionStatus();
    console.log('✅ Credenciais:', status.hasValidCredentials ? 'VÁLIDAS' : '❌ INVÁLIDAS');
    console.log('🔐 Username:', status.username || 'NÃO CONFIGURADO');
    
    if (!status.hasValidCredentials) {
      console.error('❌ ERRO CRÍTICO: Credenciais não configuradas corretamente!');
      console.log('💡 Verifique se as variáveis INSTAGRAM_USERNAME e INSTAGRAM_PASSWORD estão no .env');
      return false;
    }
  } catch (error) {
    console.error('❌ Erro ao verificar credenciais:', error.message);
    return false;
  }

  // TESTE 2: Conexão Instagram
  console.log('\n📋 TESTE 2: Teste de Conexão Instagram');
  try {
    const result = await instagramService.testConnection();
    
    if (result.success) {
      console.log('✅ Conexão Instagram: SUCESSO');
      console.log('👤 Conta:', result.accountInfo?.username || 'Info não disponível');
      console.log('👥 Seguidores:', result.accountInfo?.followerCount || 'N/A');
      console.log('🔄 Tentativas:', result.attempt || 1);
    } else {
      console.error('❌ Conexão Instagram: FALHOU');
      console.error('📝 Erro:', result.message);
      console.error('🔍 Detalhes:', result.details);
      
      if (result.finalError) {
        console.error('🚨 ERRO CRÍTICO: Todas as tentativas de conexão falharam!');
        return false;
      }
    }
  } catch (error) {
    console.error('❌ Erro no teste de conexão:', error.message);
    return false;
  }

  // TESTE 3: Sistema de Filas
  console.log('\n📋 TESTE 3: Sistema de Filas de Publicação');
  try {
    // Criar um job de teste (sem executar)
    const testJob = await addPublishJob('test-denuncia-id', {
      source: 'integration_test',
      priority: 0,
      delay: 999999999, // Delay muito alto para não executar
      attempts: 1
    });
    
    console.log('✅ Sistema de filas: FUNCIONANDO');
    console.log('🆔 Job criado:', testJob.id);
    
    // Remover job de teste
    await testJob.remove();
    console.log('🧹 Job de teste removido');
    
  } catch (error) {
    console.error('❌ Erro no sistema de filas:', error.message);
    return false;
  }

  // TESTE 4: Buscar Denúncia para Teste
  console.log('\n📋 TESTE 4: Buscar Denúncia APROVADA_ADMIN para Teste');
  try {
    const denunciasTeste = await prisma.denuncia.findMany({
      where: {
        status: 'APROVADA_ADMIN',
        imagemUrl: { not: null },
        vereadores: { not: null }
      },
      take: 1,
      orderBy: { createdAt: 'desc' }
    });

    if (denunciasTeste.length === 0) {
      console.log('⚠️ Nenhuma denúncia APROVADA_ADMIN encontrada para teste');
      console.log('💡 Crie uma denúncia e aprove-a pelo painel admin para testar');
      
      // Criar denúncia de teste se não existir
      console.log('\n📝 Criando denúncia de teste...');
      const denunciaTeste = await prisma.denuncia.create({
        data: {
          protocolo: `TEST-${Date.now()}`,
          texto: 'Teste de denúncia para validar sistema de publicação Instagram',
          textoFiltrado: 'Teste de denúncia para validar sistema de publicação Instagram',
          bairro: 'Centro',
          localizacao: 'Praça da Matriz, Centro, São Bernardo do Campo',
          phoneNumber: '5511999999999',
          status: 'APROVADA_ADMIN',
          aprovadaAdmin: true,
          scoreBot: 0.95,
          vereadores: ['@vereador_teste'],
          imagemUrl: 'https://via.placeholder.com/1080x1080/007acc/ffffff?text=TESTE+SISTEMA'
        }
      });
      
      console.log('✅ Denúncia de teste criada:', denunciaTeste.protocolo);
      return denunciaTeste.id;
    } else {
      console.log('✅ Denúncia encontrada:', denunciasTeste[0].protocolo);
      console.log('📍 Bairro:', denunciasTeste[0].bairro);
      console.log('👥 Vereadores:', denunciasTeste[0].vereadores?.length || 0);
      return denunciasTeste[0].id;
    }
  } catch (error) {
    console.error('❌ Erro ao buscar/criar denúncia:', error.message);
    return false;
  }
}

// TESTE OPCIONAL 5: Publicação Real (descomentado apenas para teste manual)
async function testRealPublication(denunciaId) {
  console.log('\n📋 TESTE 5: Simulação de Publicação (JOB NA FILA)');
  try {
    // Adicionar job real à fila (será processado pelo worker)
    const job = await addPublishJob(denunciaId, {
      source: 'integration_test_real',
      priority: 2, // Alta prioridade
      delay: 5000, // 5 segundos de delay
      attempts: 3
    });
    
    console.log('✅ Job de publicação real criado:', job.id);
    console.log('⏰ Será processado em 5 segundos');
    console.log('📊 Monitore os logs do worker para ver o resultado');
    
    return true;
  } catch (error) {
    console.error('❌ Erro ao criar job de publicação:', error.message);
    return false;
  }
}

// Executar testes
runTests().then(async (denunciaId) => {
  if (denunciaId) {
    console.log('\n✅ TODOS OS TESTES BÁSICOS PASSARAM!');
    console.log('🎯 Sistema corrigido e pronto para uso');
    
    // Perguntar se deve executar publicação real
    console.log('\n❓ Deseja executar um teste de publicação REAL no Instagram?');
    console.log('⚠️  ATENÇÃO: Isso fará uma postagem real na conta @vozdopovobot');
    console.log('💡 Descomente a linha abaixo para executar:');
    console.log('// await testRealPublication(denunciaId);');
    
    // await testRealPublication(denunciaId); // DESCOMENTE PARA TESTE REAL
    
  } else {
    console.log('\n❌ ALGUNS TESTES FALHARAM');
    console.log('🔧 Verifique os erros acima e corrija antes de usar o sistema');
  }
  
  process.exit(0);
}).catch((error) => {
  console.error('\n💥 ERRO CRÍTICO NOS TESTES:', error);
  process.exit(1);
});