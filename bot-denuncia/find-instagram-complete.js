/**
 * Busca completa do Instagram Business Account
 */

require('dotenv').config();
const axios = require('axios');

async function findInstagramComplete() {
    console.log('🔍 BUSCA COMPLETA DO INSTAGRAM BUSINESS ACCOUNT');
    console.log('==============================================\n');
    
    const token = process.env.INSTAGRAM_GRAPH_ACCESS_TOKEN;
    const apiVersion = process.env.GRAPH_API_VERSION || 'v21.0';
    
    try {
        // Teste 1: Buscar todas as contas de negócio
        console.log('📊 Teste 1: Buscando Instagram Business Accounts diretamente...');
        try {
            const businessUrl = `https://graph.facebook.com/${apiVersion}/me/businesses?access_token=${token}`;
            const businessResponse = await axios.get(businessUrl);
            
            if (businessResponse.data.data && businessResponse.data.data.length > 0) {
                console.log(`✅ Encontradas ${businessResponse.data.data.length} conta(s) de negócio:\n`);
                
                for (const business of businessResponse.data.data) {
                    console.log(`🏢 Negócio: ${business.name}`);
                    console.log(`   ID: ${business.id}`);
                    
                    // Buscar Instagram accounts deste negócio
                    try {
                        const igAccountsUrl = `https://graph.facebook.com/${apiVersion}/${business.id}/instagram_accounts?access_token=${token}`;
                        const igAccounts = await axios.get(igAccountsUrl);
                        
                        if (igAccounts.data.data && igAccounts.data.data.length > 0) {
                            console.log(`   ✅ Instagram accounts encontradas:`);
                            for (const ig of igAccounts.data.data) {
                                console.log(`      📱 ID: ${ig.id}`);
                                if (ig.username) console.log(`      📸 Username: @${ig.username}`);
                            }
                        }
                    } catch (e) {
                        // Ignorar erro se não houver Instagram accounts
                    }
                    console.log('');
                }
            }
        } catch (e) {
            console.log('⚠️  Não foi possível buscar diretamente por businesses\n');
        }
        
        // Teste 2: Buscar por páginas com mais campos
        console.log('📊 Teste 2: Buscando através das páginas com campos expandidos...');
        const pagesUrl = `https://graph.facebook.com/${apiVersion}/me/accounts?fields=id,name,instagram_business_account,connected_instagram_account,instagram_accounts{id,username}&access_token=${token}`;
        const pagesResponse = await axios.get(pagesUrl);
        
        if (pagesResponse.data.data && pagesResponse.data.data.length > 0) {
            for (const page of pagesResponse.data.data) {
                console.log(`\n📄 Página: ${page.name}`);
                console.log(`   ID: ${page.id}`);
                
                // Verificar diferentes campos que podem conter o Instagram
                if (page.instagram_business_account) {
                    console.log(`   ✅ instagram_business_account: ${page.instagram_business_account.id}`);
                }
                if (page.connected_instagram_account) {
                    console.log(`   ✅ connected_instagram_account: ${page.connected_instagram_account.id}`);
                }
                if (page.instagram_accounts && page.instagram_accounts.data) {
                    console.log(`   ✅ instagram_accounts:`);
                    page.instagram_accounts.data.forEach(ig => {
                        console.log(`      - ${ig.id} (@${ig.username || 'N/A'})`);
                    });
                }
                
                // Tentar buscar Instagram de outra forma
                try {
                    const pageDetailUrl = `https://graph.facebook.com/${apiVersion}/${page.id}?fields=instagram_business_account{id,username,name,followers_count}&access_token=${page.access_token || token}`;
                    const pageDetail = await axios.get(pageDetailUrl);
                    
                    if (pageDetail.data.instagram_business_account) {
                        console.log(`\n   🎯 INSTAGRAM ENCONTRADO VIA PAGE DETAIL:`);
                        console.log(`   📱 ID: ${pageDetail.data.instagram_business_account.id}`);
                        console.log(`   📸 Username: @${pageDetail.data.instagram_business_account.username || 'N/A'}`);
                        console.log(`   👥 Seguidores: ${pageDetail.data.instagram_business_account.followers_count || 'N/A'}`);
                        
                        console.log('\n   💡 USE ESTE ID NO SEU .ENV:');
                        console.log(`   INSTAGRAM_BUSINESS_ID=${pageDetail.data.instagram_business_account.id}`);
                    }
                } catch (e) {
                    // Ignorar erros
                }
            }
        }
        
        // Teste 3: Tentar IDs conhecidos do Instagram
        console.log('\n📊 Teste 3: Testando IDs Instagram conhecidos...');
        const possibleIds = [
            '17841400000000000', // Formato comum
            '17841450000000000', // Variação
            process.env.INSTAGRAM_BUSINESS_ID // ID atual no .env
        ];
        
        for (const testId of possibleIds) {
            if (!testId || testId === 'N/A') continue;
            
            try {
                const testUrl = `https://graph.facebook.com/${apiVersion}/${testId}?fields=id,username&access_token=${token}`;
                const testResponse = await axios.get(testUrl);
                
                if (testResponse.data.id) {
                    console.log(`\n✅ ID VÁLIDO ENCONTRADO: ${testId}`);
                    console.log(`   Username: @${testResponse.data.username || 'N/A'}`);
                }
            } catch (e) {
                // ID inválido, continuar
            }
        }
        
        // Teste 4: Debug token
        console.log('\n📊 Teste 4: Informações do token...');
        const debugUrl = `https://graph.facebook.com/${apiVersion}/debug_token?input_token=${token}&access_token=${token}`;
        const debugResponse = await axios.get(debugUrl);
        
        console.log('Token info:');
        console.log(`- App ID: ${debugResponse.data.data.app_id}`);
        console.log(`- Type: ${debugResponse.data.data.type}`);
        console.log(`- Valid: ${debugResponse.data.data.is_valid}`);
        console.log(`- Scopes: ${debugResponse.data.data.scopes.join(', ')}`);
        
    } catch (error) {
        console.error('\n❌ ERRO:', error.response?.data?.error?.message || error.message);
    }
}

// Executar
findInstagramComplete().catch(console.error);