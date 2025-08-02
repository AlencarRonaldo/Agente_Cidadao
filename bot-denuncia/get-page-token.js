/**
 * Obter Page Access Token e buscar Instagram
 */

require('dotenv').config();
const axios = require('axios');

async function getPageTokenAndInstagram() {
    console.log('🔍 OBTER PAGE TOKEN E BUSCAR INSTAGRAM');
    console.log('====================================\n');
    
    const token = process.env.INSTAGRAM_GRAPH_ACCESS_TOKEN;
    const apiVersion = process.env.GRAPH_API_VERSION || 'v21.0';
    
    try {
        // Passo 1: Obter páginas com tokens de acesso
        console.log('📊 Passo 1: Obtendo páginas com Page Access Tokens...');
        const pagesUrl = `https://graph.facebook.com/${apiVersion}/me/accounts?fields=id,name,access_token&access_token=${token}`;
        const pagesResponse = await axios.get(pagesUrl);
        
        if (!pagesResponse.data.data || pagesResponse.data.data.length === 0) {
            console.log('❌ Nenhuma página encontrada');
            return;
        }
        
        for (const page of pagesResponse.data.data) {
            console.log(`\n📄 Página: ${page.name}`);
            console.log(`   ID: ${page.id}`);
            
            // Usar o Page Access Token para buscar Instagram
            try {
                const igUrl = `https://graph.facebook.com/${apiVersion}/${page.id}?fields=instagram_business_account{id,username,name,followers_count,media_count,profile_picture_url}&access_token=${page.access_token}`;
                const igResponse = await axios.get(igUrl);
                
                if (igResponse.data.instagram_business_account) {
                    const ig = igResponse.data.instagram_business_account;
                    console.log(`\n   🎯 ✅ INSTAGRAM BUSINESS ACCOUNT ENCONTRADO!`);
                    console.log(`   📱 ID: ${ig.id}`);
                    console.log(`   📸 Username: @${ig.username || 'N/A'}`);
                    console.log(`   📝 Nome: ${ig.name || 'N/A'}`);
                    console.log(`   👥 Seguidores: ${ig.followers_count || 'N/A'}`);
                    console.log(`   📷 Mídia: ${ig.media_count || 'N/A'}`);
                    
                    console.log(`\n   💡 CONFIGURAÇÃO PARA .ENV:`);
                    console.log(`   INSTAGRAM_BUSINESS_ID=${ig.id}`);
                    console.log(`   INSTAGRAM_BUSINESS_ACCOUNT_ID=${ig.id}`);
                    
                    // Testar uma chamada para a API do Instagram
                    console.log(`\n   🧪 Testando acesso à API Instagram...`);
                    try {
                        const testUrl = `https://graph.facebook.com/${apiVersion}/${ig.id}?fields=id,username,name&access_token=${page.access_token}`;
                        const testResponse = await axios.get(testUrl);
                        console.log(`   ✅ API Instagram funcionando!`);
                        console.log(`   📱 Confirmado: @${testResponse.data.username}`);
                        
                        console.log(`\n🎉 SUCESSO! SISTEMA PRONTO PARA USAR GRAPH API!`);
                        
                        return {
                            instagramId: ig.id,
                            username: ig.username,
                            pageAccessToken: page.access_token,
                            success: true
                        };
                        
                    } catch (testError) {
                        console.log(`   ❌ Erro ao testar API: ${testError.response?.data?.error?.message || testError.message}`);
                    }
                    
                } else {
                    console.log(`   ❌ Instagram não conectado a esta página`);
                    
                    // Tentar descobrir por que não está conectado
                    try {
                        const checkUrl = `https://graph.facebook.com/${apiVersion}/${page.id}?fields=connected_instagram_account,instagram_accounts&access_token=${page.access_token}`;
                        const checkResponse = await axios.get(checkUrl);
                        
                        if (checkResponse.data.connected_instagram_account) {
                            console.log(`   📱 Conta conectada: ${checkResponse.data.connected_instagram_account.id}`);
                        }
                        if (checkResponse.data.instagram_accounts) {
                            console.log(`   📱 Contas disponíveis:`, checkResponse.data.instagram_accounts.data);
                        }
                    } catch (e) {
                        // Ignorar
                    }
                }
                
            } catch (pageError) {
                console.log(`   ❌ Erro ao acessar página: ${pageError.response?.data?.error?.message || pageError.message}`);
            }
        }
        
        // Se chegou até aqui, pode ser problema de permissões
        console.log('\n📊 Verificando permissões necessárias...');
        const permUrl = `https://graph.facebook.com/${apiVersion}/me/permissions?access_token=${token}`;
        const permResponse = await axios.get(permUrl);
        
        const requiredPerms = ['instagram_business_basic', 'instagram_business_content_publish', 'pages_show_list', 'business_management', 'instagram_manage_insights'];
        const activePerms = permResponse.data.data.filter(p => p.status === 'granted').map(p => p.permission);
        
        console.log('\n   Permissões necessárias vs ativas:');
        requiredPerms.forEach(perm => {
            const hasIt = activePerms.includes(perm);
            console.log(`   ${hasIt ? '✅' : '❌'} ${perm}`);
        });
        
        const missingPerms = requiredPerms.filter(p => !activePerms.includes(p));
        if (missingPerms.length > 0) {
            console.log(`\n   ⚠️  Permissões em falta: ${missingPerms.join(', ')}`);
            console.log(`   💡 Gere um novo token incluindo essas permissões`);
        }
        
    } catch (error) {
        console.error('\n❌ ERRO:', error.response?.data?.error?.message || error.message);
    }
}

// Executar
getPageTokenAndInstagram().catch(console.error);