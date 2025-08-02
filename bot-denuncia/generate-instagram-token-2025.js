/**
 * GERADOR DE TOKEN INSTAGRAM GRAPH API 2025
 * 
 * Este script automatiza a geração de tokens com as permissões corretas
 * para a Instagram Graph API v21.0, contornando limitações do Graph API Explorer
 */

require('dotenv').config();
const crypto = require('crypto');

class InstagramTokenGenerator2025 {
    constructor() {
        this.appId = process.env.INSTAGRAM_APP_ID || '1326356306161550';
        this.appSecret = process.env.INSTAGRAM_APP_SECRET || 'e9a232cd8e07c6223f1b793a401cf5fb';
        this.redirectUri = process.env.INSTAGRAM_REDIRECT_URI || 'https://localhost:3001/admin/instagram/oauth/callback';
        this.apiVersion = 'v21.0';
        
        // Permissões OFICIAIS da Instagram Graph API 2025 - ATUALIZADAS
        this.requiredPermissions = [
            'instagram_business_basic',           // ✅ OFICIAL 2025: Basic Instagram Business access
            'instagram_business_content_publish', // ✅ OFICIAL 2025: Content publishing to Instagram Business
            'pages_show_list',                   // ✅ OFICIAL: List Facebook pages
            'pages_read_engagement',             // ✅ OFICIAL: Read page engagement data
            'instagram_manage_insights',         // ✅ OFICIAL 2025: Instagram insights and analytics
            'business_management'                // ✅ OFICIAL: Business management features
        ];
    }

    /**
     * 🔗 Gerar URL de autorização correta
     */
    generateAuthorizationUrl() {
        const state = crypto.randomBytes(16).toString('hex');
        
        const params = new URLSearchParams({
            client_id: this.appId,
            redirect_uri: this.redirectUri,
            scope: this.requiredPermissions.join(','),
            response_type: 'code',
            state: state
        });

        const authUrl = `https://www.facebook.com/${this.apiVersion}/dialog/oauth?${params.toString()}`;
        
        console.log('🔐 GERADOR DE TOKEN INSTAGRAM GRAPH API 2025');
        console.log('==============================================\n');
        
        console.log('📋 INFORMAÇÕES DO APP:');
        console.log(`   App ID: ${this.appId}`);
        console.log(`   API Version: ${this.apiVersion}`);
        console.log(`   Redirect URI: ${this.redirectUri}\n`);
        
        console.log('🎯 PERMISSÕES NECESSÁRIAS (OFICIAIS 2025):');
        this.requiredPermissions.forEach(perm => {
            console.log(`   ✅ ${perm}`);
        });
        console.log('');
        
        console.log('🔗 URL DE AUTORIZAÇÃO GERADA:');
        console.log(authUrl);
        console.log('');
        
        console.log('📋 INSTRUÇÕES PASSO A PASSO:');
        console.log('   1. Copie a URL acima e cole no navegador');
        console.log('   2. Faça login com sua conta Facebook/Instagram Business');
        console.log('   3. IMPORTANTE: Autorize TODAS as permissões solicitadas');
        console.log('   4. Selecione a página "Voz do Povo" quando solicitado');
        console.log('   5. Copie o código de autorização da URL de retorno');
        console.log('   6. Execute: node exchange-authorization-code.js CODIGO_AQUI\n');
        
        console.log('⚠️  PROBLEMAS CONHECIDOS DO GRAPH API EXPLORER:');
        console.log('   - O Graph API Explorer pode NÃO mostrar as permissões Instagram');
        console.log('   - Use esta URL direta para contornar a limitação');
        console.log('   - As permissões instagram_business_* são REAIS e OFICIAIS para 2025\n');
        
        console.log('🎯 PRÓXIMO PASSO:');
        console.log('   Acesse a URL acima para iniciar o processo de autorização');
        
        return {
            authUrl,
            state,
            permissions: this.requiredPermissions,
            success: true
        };
    }

    /**
     * 🔄 Trocar código de autorização por token
     */
    async exchangeCodeForToken(authorizationCode) {
        const tokenUrl = `https://graph.facebook.com/${this.apiVersion}/oauth/access_token`;
        
        const params = new URLSearchParams({
            client_id: this.appId,
            client_secret: this.appSecret,
            redirect_uri: this.redirectUri,
            code: authorizationCode
        });

        try {
            const axios = require('axios');
            const response = await axios.post(tokenUrl, params);
            
            if (response.data.access_token) {
                console.log('✅ TOKEN DE ACESSO OBTIDO COM SUCESSO!');
                console.log(`   Token: ${response.data.access_token.substring(0, 50)}...`);
                
                // Converter para long-lived token
                return await this.convertToLongLivedToken(response.data.access_token);
            } else {
                throw new Error('Token não retornado na resposta');
            }
            
        } catch (error) {
            console.error('❌ ERRO ao trocar código por token:', error.response?.data || error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 🔄 Converter para Long-Lived Token
     */
    async convertToLongLivedToken(shortLivedToken) {
        const exchangeUrl = `https://graph.facebook.com/${this.apiVersion}/oauth/access_token`;
        
        const params = new URLSearchParams({
            grant_type: 'fb_exchange_token',
            client_id: this.appId,
            client_secret: this.appSecret,
            fb_exchange_token: shortLivedToken
        });

        try {
            const axios = require('axios');
            const response = await axios.get(`${exchangeUrl}?${params.toString()}`);
            
            if (response.data.access_token) {
                console.log('\n🎉 LONG-LIVED TOKEN GERADO COM SUCESSO!');
                console.log(`   Token: ${response.data.access_token.substring(0, 50)}...`);
                console.log(`   Expires in: ${response.data.expires_in} segundos (${Math.floor(response.data.expires_in / 86400)} dias)`);
                
                console.log('\n📝 ATUALIZE SEU .ENV:');
                console.log(`INSTAGRAM_GRAPH_ACCESS_TOKEN=${response.data.access_token}`);
                
                return {
                    success: true,
                    token: response.data.access_token,
                    expiresIn: response.data.expires_in
                };
            } else {
                throw new Error('Long-lived token não retornado');
            }
            
        } catch (error) {
            console.error('❌ ERRO ao converter para long-lived token:', error.response?.data || error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 🧪 Validar token e permissões
     */
    async validateToken(token) {
        try {
            const axios = require('axios');
            
            // Verificar permissões
            const permUrl = `https://graph.facebook.com/${this.apiVersion}/me/permissions?access_token=${token}`;
            const permResponse = await axios.get(permUrl);
            
            const grantedPermissions = permResponse.data.data
                .filter(p => p.status === 'granted')
                .map(p => p.permission);
            
            console.log('\n🔍 VALIDAÇÃO DE PERMISSÕES:');
            console.log('   Permissões necessárias vs obtidas:');
            
            const missingPermissions = [];
            this.requiredPermissions.forEach(perm => {
                const hasPermission = grantedPermissions.includes(perm);
                console.log(`   ${hasPermission ? '✅' : '❌'} ${perm}`);
                if (!hasPermission) missingPermissions.push(perm);
            });
            
            if (missingPermissions.length === 0) {
                console.log('\n🎉 TODAS AS PERMISSÕES NECESSÁRIAS OBTIDAS!');
                
                // Testar acesso ao Instagram Business Account
                return await this.testInstagramAccess(token);
            } else {
                console.log(`\n❌ PERMISSÕES EM FALTA: ${missingPermissions.join(', ')}`);
                console.log('   💡 Gere um novo token incluindo todas as permissões');
                
                return { 
                    success: false, 
                    missingPermissions,
                    message: 'Permissões insuficientes' 
                };
            }
            
        } catch (error) {
            console.error('❌ ERRO na validação:', error.response?.data || error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 🧪 Testar acesso ao Instagram Business Account
     */
    async testInstagramAccess(token) {
        try {
            const axios = require('axios');
            
            // Obter páginas
            const pagesUrl = `https://graph.facebook.com/${this.apiVersion}/me/accounts?fields=id,name,access_token&access_token=${token}`;
            const pagesResponse = await axios.get(pagesUrl);
            
            if (!pagesResponse.data.data || pagesResponse.data.data.length === 0) {
                throw new Error('Nenhuma página encontrada');
            }
            
            for (const page of pagesResponse.data.data) {
                // Buscar Instagram Business Account
                const igUrl = `https://graph.facebook.com/${this.apiVersion}/${page.id}?fields=instagram_business_account{id,username,name}&access_token=${page.access_token}`;
                const igResponse = await axios.get(igUrl);
                
                if (igResponse.data.instagram_business_account) {
                    const ig = igResponse.data.instagram_business_account;
                    
                    console.log('\n🎯 INSTAGRAM BUSINESS ACCOUNT ENCONTRADO!');
                    console.log(`   📄 Página: ${page.name}`);
                    console.log(`   📱 Instagram ID: ${ig.id}`);
                    console.log(`   📸 Username: @${ig.username || 'N/A'}`);
                    
                    console.log('\n📝 CONFIGURAÇÃO FINAL PARA .ENV:');
                    console.log(`INSTAGRAM_BUSINESS_ACCOUNT_ID=${ig.id}`);
                    console.log(`INSTAGRAM_GRAPH_ACCESS_TOKEN=${token.substring(0, 50)}...`);
                    
                    console.log('\n🚀 SISTEMA PRONTO PARA USAR!');
                    console.log('   Execute: node test-graph-api-token.js para testar');
                    
                    return {
                        success: true,
                        instagramId: ig.id,
                        username: ig.username,
                        pageName: page.name,
                        pageToken: page.access_token
                    };
                }
            }
            
            throw new Error('Instagram Business Account não encontrado nas páginas');
            
        } catch (error) {
            console.error('❌ ERRO no teste de acesso Instagram:', error.response?.data || error.message);
            return { success: false, error: error.message };
        }
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    const generator = new InstagramTokenGenerator2025();
    generator.generateAuthorizationUrl();
}

module.exports = InstagramTokenGenerator2025;