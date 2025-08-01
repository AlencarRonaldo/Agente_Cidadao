/**
 * URGENTE: Teste dos endpoints de ação no backend
 * Verificar se as rotas existem e funcionam
 */

const axios = require('axios');

async function testActionsBackend() {
  console.log('🚨 TESTANDO ENDPOINTS DE AÇÃO NO BACKEND');
  console.log('='.repeat(50));
  
  const baseURL = 'http://localhost:3355';
  
  try {
    // 1. FAZER LOGIN PARA OBTER TOKEN
    console.log('1. FAZENDO LOGIN...');
    const loginResponse = await axios.post(`${baseURL}/api/admin/login`, {
      email: 'admin@teste.com',
      senha: '123456'
    });
    
    const token = loginResponse.data.token;
    console.log('   ✅ Login realizado, token obtido');
    
    // 2. LISTAR DENÚNCIAS PARA OBTER IDs
    console.log('2. LISTANDO DENÚNCIAS...');
    const denunciasResponse = await axios.get(`${baseURL}/api/admin/denuncias?page=1&limit=10`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const denuncias = denunciasResponse.data.data;
    console.log(`   ✅ ${denuncias.length} denúncias encontradas`);
    
    if (denuncias.length === 0) {
      console.log('   ⚠️  Nenhuma denúncia para testar ações');
      return;
    }
    
    // Usar primeira denúncia para testes
    const denunciaId = denuncias[0].id;
    const protocolo = denuncias[0].protocolo;
    console.log(`   📋 Testando com denúncia: ${protocolo} (${denunciaId})`);
    
    // 3. TESTAR CADA ENDPOINT DE AÇÃO
    console.log('3. TESTANDO ENDPOINTS DE AÇÃO...');
    
    const acoes = [
      { nome: 'VISUALIZAR', endpoint: '', method: 'GET' },
      { nome: 'APROVAR', endpoint: '/aprovar', method: 'POST' },
      { nome: 'REPROVAR', endpoint: '/rejeitar', method: 'POST' },
      { nome: 'EDITAR', endpoint: '/editar', method: 'POST' }
    ];
    
    for (const acao of acoes) {
      console.log(`   Testando ${acao.nome}...`);
      
      try {
        const url = `${baseURL}/api/admin/denuncias/${denunciaId}${acao.endpoint}`;
        console.log(`      URL: ${acao.method} ${url}`);
        
        let response;
        const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
        
        if (acao.method === 'GET') {
          response = await axios.get(url, { headers });
        } else {
          // Para POST, enviar payload mínimo
          const payload = acao.nome === 'EDITAR' ? 
            { texto: 'Texto editado para teste', observacoes: 'Teste' } :
            { motivo: 'Teste automatizado' };
          
          response = await axios.post(url, payload, { headers });
        }
        
        console.log(`      ✅ ${acao.nome}: Status ${response.status}`);
        console.log(`      📄 Response: ${JSON.stringify(response.data).substring(0, 100)}...`);
        
      } catch (error) {
        if (error.response) {
          console.log(`      ❌ ${acao.nome}: Status ${error.response.status}`);
          console.log(`      📄 Erro: ${JSON.stringify(error.response.data).substring(0, 100)}...`);
          
          if (error.response.status === 404) {
            console.log(`      💡 ROTA NÃO EXISTE: ${acao.endpoint}`);
          } else if (error.response.status === 401) {
            console.log(`      💡 PROBLEMA DE AUTENTICAÇÃO`);
          } else if (error.response.status === 403) {
            console.log(`      💡 PERMISSÃO NEGADA`);
          }
        } else {
          console.log(`      ❌ ${acao.nome}: Erro de rede - ${error.message}`);
        }
      }
      console.log('      ---');
    }
    
    // 4. VERIFICAR ROTAS DISPONÍVEIS (se houver endpoint de debug)
    console.log('4. VERIFICANDO ESTRUTURA DAS ROTAS...');
    
    // Tentar alguns endpoints alternativos
    const endpointsAlternativos = [
      '/api/admin/denuncias/{id}',
      '/api/admin/denuncias/{id}/view',
      '/api/admin/denuncias/{id}/approve',
      '/api/admin/denuncias/{id}/reject',
      '/api/admin/denuncias/{id}/edit'
    ];
    
    for (const endpoint of endpointsAlternativos) {
      const url = endpoint.replace('{id}', denunciaId);
      console.log(`   Testando: GET ${baseURL}${url}`);
      
      try {
        const response = await axios.get(`${baseURL}${url}`, {
          headers: { 'Authorization': `Bearer ${token}` },
          timeout: 3000
        });
        console.log(`      ✅ Existe: Status ${response.status}`);
      } catch (error) {
        if (error.response?.status === 404) {
          console.log(`      ❌ Não existe: 404`);
        } else if (error.response?.status === 405) {
          console.log(`      ⚠️  Método não permitido: 405`);
        } else {
          console.log(`      ⚠️  Outro erro: ${error.response?.status || error.message}`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ ERRO GERAL:', error.response?.data || error.message);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('🚨 TESTE DE BACKEND CONCLUÍDO');
}

testActionsBackend().catch(console.error);