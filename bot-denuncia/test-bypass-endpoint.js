/**
 * TESTE: Novo Endpoint de Bypass da Fila - Aprovar e Postar Imediatamente
 */

const axios = require('axios');

async function testBypassEndpoint() {
  console.log('🚀 TESTANDO NOVO ENDPOINT: Aprovar e Postar Imediatamente');
  console.log('='.repeat(60));
  
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
    
    // 2. BUSCAR DENÚNCIA DE TESTE
    console.log('2. BUSCANDO DENÚNCIA DE TESTE...');
    const denunciasResponse = await axios.get(`${baseURL}/api/admin/denuncias?page=1&limit=10`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const denuncias = denunciasResponse.data.data;
    console.log(`   ✅ ${denuncias.length} denúncias encontradas`);
    
    // Procurar denúncia de teste pendente
    const denunciaTest = denuncias.find(d => 
      d.protocolo.includes('DEN-TEST') && 
      d.status === 'PENDENTE_MODERACAO'
    );
    
    if (!denunciaTest) {
      console.log('   ⚠️  Nenhuma denúncia de teste pendente encontrada');
      
      // Criar uma nova denúncia de teste
      console.log('3. CRIANDO NOVA DENÚNCIA DE TESTE...');
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      const novaDenuncia = await prisma.denuncia.create({
        data: {
          protocolo: `DEN-TEST-BYPASS-${Date.now().toString().slice(-6)}`,
          texto: 'Denúncia de teste para bypass da fila - buraco perigoso na via',
          textoFiltrado: 'Denúncia de teste para bypass da fila - buraco perigoso na via',
          endereco: 'Rua das Flores, 456',
          bairro: 'CENTRO',
          imagemUrl: '/uploads/test-bypass.jpg',
          status: 'PENDENTE_MODERACAO',
          vereadores: ['João Silva', 'Maria Santos'],
          phoneNumber: '+5511999888777',
          aprovadaBot: true,
          scoreBot: 0.90,
          priority: 1,
          createdAt: new Date(),
          processedAt: new Date()
        }
      });
      
      await prisma.$disconnect();
      
      console.log(`   ✅ Nova denúncia criada: ${novaDenuncia.protocolo} (${novaDenuncia.id})`);
      
      // Usar a nova denúncia
      const testDenunciaId = novaDenuncia.id;
      const testProtocolo = novaDenuncia.protocolo;
      
      // 4. TESTAR NOVO ENDPOINT - APROVAR E POSTAR IMEDIATAMENTE
      console.log('4. TESTANDO ENDPOINT DE BYPASS DA FILA...');
      console.log(`   Denúncia: ${testProtocolo} (${testDenunciaId})`);
      
      const bypassUrl = `${baseURL}/api/admin/denuncias/${testDenunciaId}/aprovar-e-postar`;
      console.log(`   URL: POST ${bypassUrl}`);
      
      const bypassPayload = {
        acao: 'aprovar_e_postar',
        publicar_agora: true,
        observacoes: 'Teste automático do sistema de bypass da fila',
        usuario_id: 'admin-test'
      };
      
      console.log('   Payload:', JSON.stringify(bypassPayload, null, 2));
      
      try {
        const bypassResponse = await axios.post(bypassUrl, bypassPayload, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('   ✅ SUCESSO! Resposta do endpoint:');
        console.log('   Status:', bypassResponse.status);
        console.log('   Dados:', JSON.stringify(bypassResponse.data, null, 2));
        
        // Verificar se a denúncia foi realmente atualizada
        console.log('5. VERIFICANDO ATUALIZAÇÃO DA DENÚNCIA...');
        const denunciaAtualizada = await axios.get(`${baseURL}/api/admin/denuncias/${testDenunciaId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log('   Status atual:', denunciaAtualizada.data.data?.status);
        console.log('   Data publicação:', denunciaAtualizada.data.data?.publishedAt);
        console.log('   Bypass fila:', denunciaAtualizada.data.data?.bypassFila);
        
        return {
          success: true,
          denunciaId: testDenunciaId,
          protocolo: testProtocolo,
          status: denunciaAtualizada.data.data?.status,
          bypassFila: denunciaAtualizada.data.data?.bypassFila
        };
        
      } catch (bypassError) {
        console.log('   ❌ ERRO no endpoint de bypass:');
        console.log('   Status:', bypassError.response?.status);
        console.log('   Erro:', JSON.stringify(bypassError.response?.data, null, 2));
        
        return {
          success: false,
          error: bypassError.response?.data || bypassError.message
        };
      }
      
    } else {
      console.log(`   📋 Usando denúncia existente: ${denunciaTest.protocolo} (${denunciaTest.id})`);
      
      // Usar denúncia existente
      const testDenunciaId = denunciaTest.id;
      const testProtocolo = denunciaTest.protocolo;
      
      // Repetir teste com denúncia existente...
      console.log('4. TESTANDO ENDPOINT DE BYPASS DA FILA...');
      console.log(`   Denúncia: ${testProtocolo} (${testDenunciaId})`);
      
      const bypassUrl = `${baseURL}/api/admin/denuncias/${testDenunciaId}/aprovar-e-postar`;
      console.log(`   URL: POST ${bypassUrl}`);
      
      const bypassPayload = {
        acao: 'aprovar_e_postar',
        publicar_agora: true,
        observacoes: 'Teste automático do sistema de bypass da fila',
        usuario_id: 'admin-test'
      };
      
      console.log('   Payload:', JSON.stringify(bypassPayload, null, 2));
      
      try {
        const bypassResponse = await axios.post(bypassUrl, bypassPayload, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('   ✅ SUCESSO! Resposta do endpoint:');
        console.log('   Status:', bypassResponse.status);
        console.log('   Dados:', JSON.stringify(bypassResponse.data, null, 2));
        
        return {
          success: true,
          denunciaId: testDenunciaId,
          protocolo: testProtocolo,
          responseData: bypassResponse.data
        };
        
      } catch (bypassError) {
        console.log('   ❌ ERRO no endpoint de bypass:');
        console.log('   Status:', bypassError.response?.status);
        console.log('   Erro:', JSON.stringify(bypassError.response?.data, null, 2));
        
        return {
          success: false,
          error: bypassError.response?.data || bypassError.message
        };
      }
    }
    
  } catch (error) {
    console.error('❌ ERRO GERAL:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data || error.message
    };
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🚀 TESTE DE BYPASS CONCLUÍDO');
}

// Executar teste se chamado diretamente
if (require.main === module) {
  testBypassEndpoint()
    .then(result => {
      console.log('\n📊 RESULTADO FINAL:');
      console.log(result.success ? '✅ TESTE PASSOU' : '❌ TESTE FALHOU');
      if (result.error) {
        console.log('Erro:', result.error);
      }
    })
    .catch(console.error);
}

module.exports = testBypassEndpoint;