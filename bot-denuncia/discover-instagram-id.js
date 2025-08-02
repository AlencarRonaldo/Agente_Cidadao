/**
 * Descobrir Instagram Business Account ID correto
 */

require('dotenv').config();
const axios = require('axios');

async function discoverInstagramId() {
    console.log('🔍 DESCOBRINDO SEU INSTAGRAM BUSINESS ACCOUNT ID');
    console.log('==============================================\n');
    
    const token = process.env.INSTAGRAM_GRAPH_ACCESS_TOKEN;
    const apiVersion = process.env.GRAPH_API_VERSION || 'v21.0';
    
    try {
        // Passo 1: Obter informações do usuário/página
        console.log('📊 Passo 1: Obtendo informações do token...');
        const meUrl = `https://graph.facebook.com/${apiVersion}/me?access_token=${token}`;
        const meResponse = await axios.get(meUrl);
        console.log('✅ Token válido para:', meResponse.data.name);
        console.log('   ID:', meResponse.data.id);
        
        // Passo 2: Listar páginas do Facebook
        console.log('\n📊 Passo 2: Listando páginas do Facebook...');
        const pagesUrl = `https://graph.facebook.com/${apiVersion}/me/accounts?access_token=${token}`;
        const pagesResponse = await axios.get(pagesUrl);
        
        if (!pagesResponse.data.data || pagesResponse.data.data.length === 0) {
            console.log('❌ Nenhuma página encontrada. Certifique-se de ter permissões de gerenciar páginas.');
            return;
        }
        
        console.log(`✅ Encontradas ${pagesResponse.data.data.length} página(s):\n`);
        
        // Passo 3: Para cada página, buscar Instagram Business Account
        for (const page of pagesResponse.data.data) {
            console.log(`📄 Página: ${page.name}`);
            console.log(`   ID: ${page.id}`);
            
            try {
                // Buscar Instagram Business Account conectada
                const igUrl = `https://graph.facebook.com/${apiVersion}/${page.id}?fields=instagram_business_account&access_token=${token}`;
                const igResponse = await axios.get(igUrl);
                
                if (igResponse.data.instagram_business_account) {
                    console.log(`   ✅ Instagram Business Account encontrada!`);
                    console.log(`   📱 Instagram ID: ${igResponse.data.instagram_business_account.id}`);
                    
                    // Obter mais informações sobre a conta Instagram
                    const igDetailsUrl = `https://graph.facebook.com/${apiVersion}/${igResponse.data.instagram_business_account.id}?fields=username,name,followers_count,media_count,profile_picture_url&access_token=${token}`;
                    try {
                        const igDetails = await axios.get(igDetailsUrl);
                        console.log(`   📸 Username: @${igDetails.data.username || 'N/A'}`);
                        console.log(`   👥 Seguidores: ${igDetails.data.followers_count || 'N/A'}`);
                        console.log(`   📷 Posts: ${igDetails.data.media_count || 'N/A'}`);
                        
                        console.log('\n🎯 USE ESTE ID NO SEU .ENV:');
                        console.log(`INSTAGRAM_BUSINESS_ID=${igResponse.data.instagram_business_account.id}`);
                        console.log(`INSTAGRAM_BUSINESS_ACCOUNT_ID=${igResponse.data.instagram_business_account.id}\n`);
                        
                    } catch (detailError) {
                        console.log(`   ⚠️  Não foi possível obter detalhes da conta`);
                    }
                } else {
                    console.log(`   ❌ Sem Instagram Business Account conectada`);
                }
            } catch (pageError) {
                console.log(`   ❌ Erro ao verificar página: ${pageError.message}`);
            }
            
            console.log('');
        }
        
        // Passo 4: Verificar permissões do token
        console.log('📊 Passo 4: Verificando permissões do token...');
        const permUrl = `https://graph.facebook.com/${apiVersion}/me/permissions?access_token=${token}`;
        const permResponse = await axios.get(permUrl);
        
        console.log('✅ Permissões ativas:');
        permResponse.data.data.forEach(perm => {
            if (perm.status === 'granted') {
                console.log(`   - ${perm.permission}`);
            }
        });
        
    } catch (error) {
        console.error('\n❌ ERRO:', error.response?.data?.error?.message || error.message);
        
        if (error.response?.data?.error?.code === 190) {
            console.log('\n💡 Token inválido ou expirado. Gere um novo token.');
        }
    }
}

// Executar
discoverInstagramId().catch(console.error);