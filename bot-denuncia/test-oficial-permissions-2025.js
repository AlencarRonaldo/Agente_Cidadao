/**
 * TESTE DAS PERMISSÕES OFICIAIS INSTAGRAM BUSINESS API 2025
 * 
 * Script para validar as novas permissões baseadas na documentação oficial
 */

require('dotenv').config();
const axios = require('axios');

class PermissionsTester2025 {
    constructor() {
        this.appId = process.env.INSTAGRAM_APP_ID;
        this.appSecret = process.env.INSTAGRAM_APP_SECRET;
        this.redirectUri = process.env.INSTAGRAM_REDIRECT_URI;
        this.apiVersion = 'v21.0';
        
        // Permissões OFICIAIS baseadas na documentação Facebook
        this.officialPermissions = [
            'instagram_basic',              // ✅ OFICIAL: Basic Instagram access
            'instagram_content_publish',    // ✅ OFICIAL: Content publishing  
            'pages_read_engagement'         // ✅ OFICIAL: Page engagement data
        ];
        
        // Permissões antigas para comparação
        this.oldPermissions = [
            'instagram_business_basic',
            'instagram_business_content_publish',
            'pages_show_list',
            'pages_read_engagement',
            'instagram_manage_insights'
        ];
    }

    /**
     * 🔗 Gerar URL de teste com permissões oficiais
     */
    generateOfficialAuthUrl() {
        const state = require('crypto').randomBytes(16).toString('hex');
        
        const params = new URLSearchParams({
            client_id: this.appId,
            redirect_uri: this.redirectUri,
            scope: this.officialPermissions.join(','),
            response_type: 'code',
            state: state
        });

        const authUrl = `https://www.facebook.com/${this.apiVersion}/dialog/oauth?${params.toString()}`;
        
        console.log('🧪 TESTE PERMISSÕES OFICIAIS INSTAGRAM 2025');
        console.log('============================================\n');
        
        console.log('📋 COMPARAÇÃO PERMISSÕES:');
        console.log('\n   ANTIGAS (que causavam erro):');
        this.oldPermissions.forEach(perm => {
            console.log(`   ❌ ${perm}`);
        });
        
        console.log('\n   NOVAS (oficiais da documentação):');
        this.officialPermissions.forEach(perm => {
            console.log(`   ✅ ${perm}`);
        });
        
        console.log('\n🔗 URL DE TESTE COM PERMISSÕES OFICIAIS:');
        console.log(authUrl);
        
        console.log('\n📋 INSTRUÇÕES DE TESTE:');
        console.log('   1. Copie a URL acima');
        console.log('   2. Cole no navegador');
        console.log('   3. Faça login com Facebook/Instagram Business');
        console.log('   4. Aceite TODAS as permissões solicitadas');
        console.log('   5. Copie o código da URL de retorno');
        console.log('   6. Execute: node test-oficial-permissions-2025.js exchange CODIGO_AQUI');
        
        console.log('\n✨ DIFERENÇAS PRINCIPAIS:');
        console.log('   • Usando Facebook Login em vez de Instagram Login');
        console.log('   • Permissões simplificadas e oficiais');
        console.log('   • Remoção de permissões redundantes');
        console.log('   • Baseado na documentação atual do Facebook');
        
        return { authUrl, state, permissions: this.officialPermissions };
    }

    /**
     * 🔄 Trocar código por token (permissões oficiais)
     */
    async exchangeCodeForToken(authorizationCode) {
        console.log('\n🔄 TROCANDO CÓDIGO POR TOKEN...');
        console.log(`   Código: ${authorizationCode.substring(0, 20)}...`);
        
        const tokenUrl = `https://graph.facebook.com/${this.apiVersion}/oauth/access_token`;
        
        const params = new URLSearchParams({
            client_id: this.appId,
            client_secret: this.appSecret,
            redirect_uri: this.redirectUri,
            code: authorizationCode
        });

        try {
            const response = await axios.post(tokenUrl, params);
            
            if (response.data.access_token) {
                console.log('✅ TOKEN OBTIDO COM SUCESSO!');
                console.log(`   Token: ${response.data.access_token.substring(0, 30)}...`);
                
                // Validar permissões obtidas
                return await this.validateOfficialPermissions(response.data.access_token);
            } else {
                throw new Error('Token não retornado na resposta');
            }
            
        } catch (error) {
            console.error('❌ ERRO ao trocar código:', error.response?.data || error.message);
            
            if (error.response?.data?.error?.message) {
                this.analyzeError(error.response.data.error);
            }
            
            return { success: false, error: error.message };
        }
    }

    /**
     * 🧪 Validar permissões oficiais obtidas
     */
    async validateOfficialPermissions(token) {
        console.log('\n🔍 VALIDANDO PERMISSÕES OFICIAIS...');
        
        try {
            // Verificar permissões concedidas
            const permUrl = `https://graph.facebook.com/${this.apiVersion}/me/permissions?access_token=${token}`;
            const permResponse = await axios.get(permUrl);
            
            const grantedPermissions = permResponse.data.data
                .filter(p => p.status === 'granted')
                .map(p => p.permission);
            
            console.log('\n📊 RESULTADO DA VALIDAÇÃO:');
            
            const hasAllOfficial = this.officialPermissions.every(perm => 
                grantedPermissions.includes(perm)
            );
            
            this.officialPermissions.forEach(perm => {
                const hasPermission = grantedPermissions.includes(perm);
                console.log(`   ${hasPermission ? '✅' : '❌'} ${perm}`);
            });
            
            if (hasAllOfficial) {
                console.log('\n🎉 TODAS AS PERMISSÕES OFICIAIS OBTIDAS!');
                console.log('   Status: SUCESSO - Permissões oficiais funcionam!');
                
                // Testar funcionalidade
                return await this.testInstagramFunctionality(token);
            } else {
                const missing = this.officialPermissions.filter(perm => 
                    !grantedPermissions.includes(perm)
                );
                
                console.log(`\n❌ PERMISSÕES EM FALTA: ${missing.join(', ')}`);
                return { success: false, missingPermissions: missing };
            }
            
        } catch (error) {
            console.error('❌ ERRO na validação:', error.response?.data || error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 🧪 Testar funcionalidade Instagram
     */
    async testInstagramFunctionality(token) {
        console.log('\n🧪 TESTANDO FUNCIONALIDADE INSTAGRAM...');
        
        try {
            // Testar acesso às páginas
            const pagesUrl = `https://graph.facebook.com/${this.apiVersion}/me/accounts?fields=id,name,access_token&access_token=${token}`;
            const pagesResponse = await axios.get(pagesUrl);
            
            if (!pagesResponse.data.data || pagesResponse.data.data.length === 0) {
                throw new Error('Nenhuma página encontrada');
            }
            
            console.log(`   ✅ ${pagesResponse.data.data.length} página(s) encontrada(s)`);
            
            // Buscar Instagram Business Account
            for (const page of pagesResponse.data.data) {
                try {
                    const igUrl = `https://graph.facebook.com/${this.apiVersion}/${page.id}?fields=instagram_business_account{id,username}&access_token=${page.access_token}`;
                    const igResponse = await axios.get(igUrl);
                    
                    if (igResponse.data.instagram_business_account) {
                        const ig = igResponse.data.instagram_business_account;
                        
                        console.log('\n🎯 INSTAGRAM BUSINESS ACCOUNT ENCONTRADO!');
                        console.log(`   📄 Página: ${page.name}`);
                        console.log(`   📱 Instagram ID: ${ig.id}`);
                        console.log(`   📸 Username: @${ig.username || 'N/A'}`);
                        
                        console.log('\n🚀 TESTE CONCLUÍDO COM SUCESSO!');
                        console.log('   ✅ Permissões oficiais FUNCIONAM');
                        console.log('   ✅ Instagram Business Account acessível');
                        console.log('   ✅ Sistema pronto para publicação');
                        
                        console.log('\n📝 CONFIGURAÇÃO FINAL:');
                        console.log(`INSTAGRAM_BUSINESS_ACCOUNT_ID=${ig.id}`);
                        console.log(`FACEBOOK_PAGE_ACCESS_TOKEN=${page.access_token.substring(0, 30)}...`);
                        
                        return {
                            success: true,
                            permissions: 'OFICIAIS_VALIDADAS',
                            instagramId: ig.id,
                            username: ig.username,
                            pageName: page.name
                        };
                    }
                } catch (pageError) {
                    console.log(`   ⚠️ Página ${page.name}: sem Instagram Business Account`);
                }
            }
            
            throw new Error('Instagram Business Account não encontrado');
            
        } catch (error) {
            console.error('❌ ERRO no teste de funcionalidade:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 📊 Analisar erros de permissões
     */
    analyzeError(error) {
        console.log('\n🔍 ANÁLISE DO ERRO:');
        console.log(`   Código: ${error.code}`);
        console.log(`   Mensagem: ${error.message}`);
        
        if (error.message.includes('Invalid Scopes') || error.message.includes('invalid_scope')) {
            console.log('\n💡 DIAGNÓSTICO:');
            console.log('   • Erro de "Invalid Scopes" indica permissões inválidas');
            console.log('   • As novas permissões oficiais devem resolver este problema');
            console.log('   • Verifique se o App ID está configurado corretamente');
        }
        
        if (error.error_subcode) {
            console.log(`   Sub-código: ${error.error_subcode}`);
        }
    }

    /**
     * 📋 Comparar configurações
     */
    compareConfigurations() {
        console.log('\n📋 COMPARAÇÃO DETALHADA:');
        console.log('\n   CONFIGURAÇÃO ANTIGA (com erros):');
        console.log('   • URL: https://api.instagram.com/oauth/authorize');
        console.log('   • Login: Instagram direto');
        console.log('   • Permissões: instagram_business_*');
        
        console.log('\n   CONFIGURAÇÃO NOVA (oficial):');
        console.log('   • URL: https://www.facebook.com/v21.0/dialog/oauth');
        console.log('   • Login: Facebook (mais estável)');
        console.log('   • Permissões: instagram_basic, instagram_content_publish');
        
        console.log('\n   VANTAGENS DA NOVA CONFIGURAÇÃO:');
        console.log('   ✅ Baseada na documentação oficial atual');
        console.log('   ✅ Facebook Login é mais estável');
        console.log('   ✅ Permissões simplificadas e válidas');
        console.log('   ✅ Melhor suporte a longo prazo');
    }
}

// Executar baseado no argumento
const args = process.argv.slice(2);
const tester = new PermissionsTester2025();

if (args[0] === 'exchange' && args[1]) {
    // Trocar código por token
    tester.exchangeCodeForToken(args[1]);
} else if (args[0] === 'compare') {
    // Comparar configurações
    tester.compareConfigurations();
} else {
    // Gerar URL de teste
    tester.generateOfficialAuthUrl();
}

module.exports = PermissionsTester2025;