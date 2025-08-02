/**
 * Teste do Token Real do Instagram Graph API
 */

require('dotenv').config();
const axios = require('axios');

async function testGraphApiToken() {
    console.log('🔍 TESTANDO TOKEN REAL DO INSTAGRAM GRAPH API');
    console.log('=============================================\n');
    
    const token = process.env.INSTAGRAM_GRAPH_ACCESS_TOKEN;
    const businessId = process.env.INSTAGRAM_BUSINESS_ID;
    const apiVersion = process.env.GRAPH_API_VERSION || 'v21.0';
    
    console.log('📋 Configuração:');
    console.log(`- Business ID: ${businessId}`);
    console.log(`- API Version: ${apiVersion}`);
    console.log(`- Token: ${token.substring(0, 20)}...${token.substring(token.length - 10)}`);
    console.log(`- Mock Mode: ${process.env.INSTAGRAM_GRAPH_MOCK_MODE}`);
    
    try {
        // Teste 1: Verificar informações da conta
        console.log('\n📊 Teste 1: Verificando informações da conta...');
        const accountUrl = `https://graph.facebook.com/${apiVersion}/${businessId}?fields=id,name,username,followers_count,media_count&access_token=${token}`;
        
        const accountResponse = await axios.get(accountUrl);
        console.log('✅ Conta verificada com sucesso!');
        console.log(`- Nome: ${accountResponse.data.name || 'N/A'}`);
        console.log(`- Username: ${accountResponse.data.username || 'N/A'}`);
        console.log(`- Seguidores: ${accountResponse.data.followers_count || 'N/A'}`);
        console.log(`- Mídia: ${accountResponse.data.media_count || 'N/A'}`);
        
        // Teste 2: Verificar permissões
        console.log('\n📊 Teste 2: Verificando permissões do token...');
        const permissionsUrl = `https://graph.facebook.com/${apiVersion}/me/permissions?access_token=${token}`;
        
        const permissionsResponse = await axios.get(permissionsUrl);
        console.log('✅ Permissões verificadas:');
        permissionsResponse.data.data.forEach(perm => {
            console.log(`- ${perm.permission}: ${perm.status}`);
        });
        
        // Teste 3: Verificar quota de postagem
        console.log('\n📊 Teste 3: Verificando quota de postagem...');
        const quotaUrl = `https://graph.facebook.com/${apiVersion}/${businessId}/content_publishing_limit?access_token=${token}`;
        
        try {
            const quotaResponse = await axios.get(quotaUrl);
            console.log('✅ Quota de publicação:');
            console.log(`- Limite: ${quotaResponse.data.data[0]?.config?.quota_total || 'N/A'}`);
            console.log(`- Usado: ${quotaResponse.data.data[0]?.quota_usage || 'N/A'}`);
        } catch (quotaError) {
            console.log('⚠️  Informações de quota não disponíveis (normal para alguns tipos de conta)');
        }
        
        console.log('\n🎯 RESULTADO: TOKEN GRAPH API FUNCIONANDO PERFEITAMENTE! ✅');
        console.log('O sistema está pronto para postar no Instagram usando a API oficial.');
        
        return true;
        
    } catch (error) {
        console.error('\n❌ ERRO AO TESTAR TOKEN:');
        console.error(`- Status: ${error.response?.status || 'N/A'}`);
        console.error(`- Erro: ${error.response?.data?.error?.message || error.message}`);
        
        if (error.response?.status === 400 || error.response?.status === 190) {
            console.log('\n💡 POSSÍVEIS SOLUÇÕES:');
            console.log('1. O token pode ter expirado - gere um novo no Facebook Developer');
            console.log('2. Verifique se o Business ID está correto');
            console.log('3. Confirme que a conta tem permissões de Instagram Business');
        }
        
        return false;
    }
}

// Executar teste
testGraphApiToken()
    .then(success => {
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('Erro não tratado:', error);
        process.exit(1);
    });