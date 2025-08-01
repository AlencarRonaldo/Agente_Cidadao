/**
 * URGENTE: Teste na porta correta (3355)
 */

const axios = require('axios');

async function testCorrectPort() {
  console.log('🚨 TESTANDO PORTA CORRETA (3355)');
  console.log('='.repeat(40));
  
  const baseURL = 'http://localhost:3355';
  
  try {
    // 1. Teste health check
    console.log('1. TESTE HEALTH CHECK:');
    try {
      const healthResponse = await axios.get(`${baseURL}/api/health`, {
        timeout: 5000
      });
      console.log('   ✅ Servidor rodando na porta 3355');
      console.log('   📊 Status:', healthResponse.status);
      console.log('   📊 Dados:', healthResponse.data);
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log('   ❌ SERVIDOR NÃO ESTÁ RODANDO NA PORTA 3355');
        console.log('   💡 Execute: npm start');
        return;
      } else {
        console.log('   ⚠️  Erro:', error.message);
      }
    }
    
    // 2. Teste dashboard sem auth
    console.log('\n2. TESTE DASHBOARD (sem auth):');
    try {
      const response = await axios.get(`${baseURL}/api/admin/dashboard`, {
        timeout: 5000
      });
      console.log('   Status:', response.status);
      console.log('   Dados:', JSON.stringify(response.data, null, 2));
    } catch (error) {
      if (error.response) {
        console.log('   Status:', error.response.status);
        console.log('   Erro:', error.response.data);
        
        if (error.response.status === 401) {
          console.log('   💡 REQUER AUTENTICAÇÃO (correto)');
          
          // 3. Tentar criar um token de teste
          console.log('\n3. TESTE COM TOKEN TEMPORÁRIO:');
          try {
            // Primeiro, tentar fazer login
            const loginResponse = await axios.post(`${baseURL}/api/admin/login`, {
              email: 'admin@test.com',
              senha: 'admin123'
            });
            
            const token = loginResponse.data.token;
            console.log('   ✅ Login realizado com sucesso');
            
            // Agora testar dashboard com token
            const dashboardResponse = await axios.get(`${baseURL}/api/admin/dashboard`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
            
            console.log('   ✅ Dashboard acessado com sucesso');
            console.log('   📊 Status:', dashboardResponse.status);
            
            const data = dashboardResponse.data;
            console.log('\n   📋 DADOS DO DASHBOARD:');
            console.log(`   - Total denúncias: ${data.data?.resumo?.totalDenuncias || 'N/A'}`);
            console.log(`   - Agendadas: ${data.data?.resumo?.denunciasAgendadas || 'N/A'}`);
            console.log(`   - Agenda postagens: ${data.data?.agendaPostagens?.length || 0} itens`);
            
            if (data.data?.agendaPostagens && data.data.agendaPostagens.length > 0) {
              console.log('\n   📅 AGENDAMENTOS ENCONTRADOS:');
              data.data.agendaPostagens.forEach((post, index) => {
                console.log(`   ${index + 1}. ${post.protocolo}:`);
                console.log(`      - Bairro: ${post.bairro}`);
                console.log(`      - Agendado: ${post.scheduledPublishAt}`);
                console.log(`      - Prioridade: ${post.priority}`);
              });
              
              console.log('\n   🎉 PROBLEMA IDENTIFICADO:');
              console.log('   ✅ Backend está funcionando corretamente');
              console.log('   ✅ API retorna dados de agendamento');
              console.log('   💡 PROBLEMA ESTÁ NO FRONTEND!');
            } else {
              console.log('\n   ❌ API não retorna agendamentos');
              console.log('   💡 Problema no endpoint do backend');
            }
            
          } catch (loginError) {
            console.log('   ❌ Erro no login:', loginError.response?.data || loginError.message);
            console.log('   💡 Precisa criar usuário admin ou ajustar credenciais');
          }
        }
      } else {
        console.log('   ❌ Erro de conexão:', error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ ERRO GERAL:', error.message);
  }
  
  console.log('\n' + '='.repeat(40));
  console.log('🚨 TESTE CONCLUÍDO');
}

testCorrectPort().catch(console.error);