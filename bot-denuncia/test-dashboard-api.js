/**
 * URGENTE: Teste da API Dashboard
 * Verificar se o endpoint está retornando os dados de agendamento
 */

const axios = require('axios');

async function testDashboardAPI() {
  console.log('🚨 TESTANDO API DASHBOARD - URGENTE');
  console.log('='.repeat(50));
  
  try {
    // Configuração da API
    const baseURL = 'http://localhost:3000';  // Ajustar se necessário
    const endpoint = '/api/admin/dashboard';
    
    console.log(`📡 Endpoint: ${baseURL}${endpoint}`);
    
    // Tentar sem autenticação primeiro para ver se retorna erro
    console.log('\n1. TESTE SEM AUTENTICAÇÃO:');
    try {
      const response = await axios.get(`${baseURL}${endpoint}`, {
        timeout: 5000
      });
      console.log('   Status:', response.status);
      console.log('   Dados recebidos:', JSON.stringify(response.data, null, 2));
    } catch (error) {
      if (error.response) {
        console.log('   Status:', error.response.status);
        console.log('   Erro:', error.response.data);
        
        if (error.response.status === 401) {
          console.log('   💡 Endpoint requer autenticação (esperado)');
        }
      } else if (error.code === 'ECONNREFUSED') {
        console.log('   ❌ SERVIDOR NÃO ESTÁ RODANDO!');
        console.log('   💡 Execute: npm start ou node src/index.js');
        return;
      } else {
        console.log('   ❌ Erro de conexão:', error.message);
        return;
      }
    }
    
    // Tentar com token (se houver um salvo)
    console.log('\n2. VERIFICAR SE HÁ TOKEN SALVO:');
    const fs = require('fs');
    let token = null;
    
    // Procurar por arquivos de teste que podem ter tokens
    const possibleTokenFiles = [
      'test-admin-token.txt',
      '.env',
      'admin-token.txt'
    ];
    
    for (const file of possibleTokenFiles) {
      try {
        if (fs.existsSync(file)) {
          const content = fs.readFileSync(file, 'utf8');
          if (content.includes('Bearer') || content.includes('jwt') || content.includes('token')) {
            console.log(`   📄 Arquivo encontrado: ${file}`);
            console.log(`   📄 Conteúdo: ${content.substring(0, 100)}...`);
          }
        }
      } catch (e) {
        // Ignorar
      }
    }
    
    // Teste direto com banco se API não funcionar
    console.log('\n3. TESTE DIRETO NO BANCO (FALLBACK):');
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      console.log('   📊 Buscando dados diretamente do banco...');
      
      const agendaPostagens = await prisma.denuncia.findMany({
        where: {
          status: 'AGENDADA',
          scheduledPublishAt: {
            gte: new Date()
          }
        },
        select: {
          id: true,
          protocolo: true,
          texto: true,
          bairro: true,
          scheduledPublishAt: true,
          priority: true,
          createdAt: true
        },
        orderBy: {
          scheduledPublishAt: 'asc'
        },
        take: 10
      });
      
      console.log(`   ✅ Dados encontrados: ${agendaPostagens.length} agendamentos`);
      
      if (agendaPostagens.length > 0) {
        console.log('\n   📋 DADOS BRUTOS DO BANCO:');
        agendaPostagens.forEach((post, index) => {
          console.log(`   ${index + 1}. ${post.protocolo}:`);
          console.log(`      - Texto: ${post.texto.substring(0, 50)}...`);
          console.log(`      - Bairro: ${post.bairro}`);
          console.log(`      - Agendado: ${post.scheduledPublishAt}`);
          console.log(`      - Prioridade: ${post.priority}`);
          console.log('');
        });
        
        console.log('   💡 CONCLUSÃO: Dados existem no banco, problema pode ser:');
        console.log('      1. API não está retornando os dados');
        console.log('      2. Frontend não está processando os dados');
        console.log('      3. Componente PostingScheduleCard não está exibindo');
      }
      
      await prisma.$disconnect();
      
    } catch (dbError) {
      console.log('   ❌ Erro ao acessar banco:', dbError.message);
    }
    
    // Teste de servidor rodando
    console.log('\n4. VERIFICAR STATUS DO SERVIDOR:');
    try {
      const healthResponse = await axios.get(`${baseURL}/api/health`, {
        timeout: 3000
      });
      console.log('   ✅ Servidor está rodando');
      console.log('   📊 Health check:', healthResponse.data);
    } catch (healthError) {
      if (healthError.code === 'ECONNREFUSED') {
        console.log('   ❌ SERVIDOR NÃO ESTÁ RODANDO!');
        console.log('   💡 Para iniciar o servidor:');
        console.log('      cd E:\\SITES\\bot_agente\\bot-denuncia');
        console.log('      npm start');
      } else {
        console.log('   ⚠️  Health check falhou:', healthError.message);
      }
    }
    
  } catch (error) {
    console.error('❌ ERRO GERAL:', error.message);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('🚨 TESTE DA API CONCLUÍDO');
  console.log('\n📋 PRÓXIMOS PASSOS:');
  console.log('1. Se servidor não estiver rodando → iniciar servidor');
  console.log('2. Se dados existem no banco → verificar endpoint dashboard');
  console.log('3. Se API retorna dados → verificar componente frontend');
}

// Executar imediatamente
testDashboardAPI().catch(console.error);