/**
 * URGENTE: Teste com usuário admin criado
 */

const axios = require('axios');

async function testWithAdmin() {
  console.log('🚨 TESTANDO COM ADMIN CRIADO');
  console.log('='.repeat(40));
  
  const baseURL = 'http://localhost:3355';
  
  try {
    // 1. Fazer login
    console.log('1. FAZENDO LOGIN:');
    const loginResponse = await axios.post(`${baseURL}/api/admin/login`, {
      email: 'admin@teste.com',
      senha: '123456'
    });
    
    const token = loginResponse.data.token;
    console.log('   ✅ Login realizado com sucesso');
    console.log('   🔑 Token recebido');
    
    // 2. Testar dashboard
    console.log('\n2. TESTANDO DASHBOARD:');
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
    console.log(`   - Success: ${data.success}`);
    console.log(`   - Message: ${data.message}`);
    console.log(`   - Total denúncias: ${data.data?.resumo?.totalDenuncias || 'N/A'}`);
    console.log(`   - Pendentes: ${data.data?.resumo?.denunciasPendentes || 'N/A'}`);
    console.log(`   - Publicadas: ${data.data?.resumo?.denunciasPublicadas || 'N/A'}`);
    console.log(`   - Agendadas: ${data.data?.resumo?.denunciasAgendadas || 'N/A'}`);
    console.log(`   - Agenda postagens: ${data.data?.agendaPostagens?.length || 0} itens`);
    
    if (data.data?.agendaPostagens && data.data.agendaPostagens.length > 0) {
      console.log('\n   📅 AGENDAMENTOS RETORNADOS PELA API:');
      data.data.agendaPostagens.forEach((post, index) => {
        console.log(`   ${index + 1}. ${post.protocolo}:`);
        console.log(`      - ID: ${post.id}`);
        console.log(`      - Texto: ${post.texto}`);
        console.log(`      - Bairro: ${post.bairro}`);
        console.log(`      - Agendado para: ${post.scheduledPublishAt}`);
        console.log(`      - Prioridade: ${post.priority}`);
        console.log(`      - Criado em: ${post.createdAt}`);
        console.log('');
      });
      
      console.log('   🎉 DESCOBERTA CRÍTICA:');
      console.log('   ✅ Backend está funcionando PERFEITAMENTE');
      console.log('   ✅ API retorna dados de agendamento CORRETAMENTE');
      console.log('   ✅ Dados existem no banco e chegam na API');
      console.log('');
      console.log('   🚨 CONCLUSÃO FINAL:');
      console.log('   ❌ O PROBLEMA ESTÁ NO FRONTEND!');
      console.log('   💡 Possíveis causas no frontend:');
      console.log('      1. Componente PostingScheduleCard não está renderizando');
      console.log('      2. Dados não chegam no componente');
      console.log('      3. Hook useSimpleAgendaData está bloqueando dados reais');
      console.log('      4. Props não estão sendo passadas corretamente');
      
    } else {
      console.log('\n   ❌ API NÃO RETORNA AGENDAMENTOS');
      console.log('   💡 Isso é estranho, pois o banco tem dados...');
    }
    
    // 3. Testar endpoint específico de agendamento
    console.log('\n3. TESTANDO ENDPOINT SCHEDULING-STATS:');
    try {
      const schedulingResponse = await axios.get(`${baseURL}/api/admin/scheduling-stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('   ✅ Scheduling stats acessado');
      console.log('   📊 Dados:', JSON.stringify(schedulingResponse.data, null, 2));
      
    } catch (schedulingError) {
      console.log('   ❌ Erro scheduling stats:', schedulingError.response?.data || schedulingError.message);
    }
    
  } catch (error) {
    console.error('❌ ERRO:', error.response?.data || error.message);
  }
  
  console.log('\n' + '='.repeat(40));
  console.log('🚨 TESTE CONCLUÍDO');
}

testWithAdmin().catch(console.error);