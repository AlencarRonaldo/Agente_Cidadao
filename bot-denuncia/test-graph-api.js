/**
 * Script de teste para Instagram Graph API
 */

require('dotenv').config();
const axios = require('axios');

async function testGraphAPI() {
    console.log('🔍 Testando Instagram Graph API...\n');
    
    const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
    const businessAccountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
    
    if (!accessToken || !businessAccountId) {
        console.error('❌ Credenciais não configuradas no .env');
        return;
    }
    
    console.log('📋 Configuração:');
    console.log(`- Business Account ID: ${businessAccountId}`);
    console.log(`- Token: ${accessToken.substring(0, 20)}...`);
    console.log();
    
    try {
        // Teste 1: Obter informações da conta
        console.log('1️⃣ Testando informações da conta...');
        const accountResponse = await axios.get(
            `https://graph.instagram.com/v18.0/${businessAccountId}`,
            {
                params: {
                    fields: 'id,username,name,followers_count,media_count,profile_picture_url',
                    access_token: accessToken
                }
            }
        );
        
        console.log('✅ Conta conectada com sucesso!');
        console.log('📊 Informações da conta:');
        console.log(`   - Username: @${accountResponse.data.username}`);
        console.log(`   - Nome: ${accountResponse.data.name || 'N/A'}`);
        console.log(`   - Seguidores: ${accountResponse.data.followers_count || 0}`);
        console.log(`   - Posts: ${accountResponse.data.media_count || 0}`);
        console.log();
        
        // Teste 2: Verificar permissões
        console.log('2️⃣ Testando permissões do token...');
        const debugResponse = await axios.get(
            'https://graph.facebook.com/debug_token',
            {
                params: {
                    input_token: accessToken,
                    access_token: `${process.env.FACEBOOK_APP_ID}|${process.env.FACEBOOK_APP_SECRET}`
                }
            }
        );
        
        const tokenData = debugResponse.data.data;
        console.log('✅ Token válido!');
        console.log('📋 Detalhes do token:');
        console.log(`   - App ID: ${tokenData.app_id}`);
        console.log(`   - Válido: ${tokenData.is_valid ? 'Sim' : 'Não'}`);
        console.log(`   - Expira em: ${tokenData.expires_at ? new Date(tokenData.expires_at * 1000).toLocaleDateString('pt-BR') : 'Nunca'}`);
        console.log(`   - Escopos: ${tokenData.scopes.join(', ')}`);
        console.log();
        
        // Teste 3: Listar posts recentes
        console.log('3️⃣ Testando listagem de posts...');
        const mediaResponse = await axios.get(
            `https://graph.instagram.com/v18.0/${businessAccountId}/media`,
            {
                params: {
                    fields: 'id,caption,timestamp,permalink',
                    limit: 3,
                    access_token: accessToken
                }
            }
        );
        
        const posts = mediaResponse.data.data || [];
        console.log(`✅ ${posts.length} posts encontrados`);
        
        if (posts.length > 0) {
            console.log('📱 Posts recentes:');
            posts.forEach((post, index) => {
                console.log(`   ${index + 1}. ${post.caption ? post.caption.substring(0, 50) + '...' : 'Sem legenda'}`);
                console.log(`      Data: ${new Date(post.timestamp).toLocaleDateString('pt-BR')}`);
            });
        }
        
        console.log('\n✅ Todos os testes passaram! Graph API está funcionando corretamente.');
        
    } catch (error) {
        console.error('\n❌ Erro ao testar Graph API:');
        if (error.response) {
            console.error(`   Status: ${error.response.status}`);
            console.error(`   Mensagem: ${error.response.data.error?.message || error.response.data}`);
            
            if (error.response.data.error?.code === 190) {
                console.error('\n⚠️  Token expirado ou inválido! Você precisa gerar um novo token.');
            }
        } else {
            console.error(`   ${error.message}`);
        }
    }
}

// Executar teste
testGraphAPI();