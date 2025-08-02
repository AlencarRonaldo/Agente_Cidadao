/**
 * CONFIGURAÇÃO OFICIAL INSTAGRAM BUSINESS API 2025
 * Baseada na documentação oficial do Facebook Developers
 */

class InstagramPermissionsConfig2025 {
    constructor() {
        this.officialConfig = this.getOfficialConfiguration();
    }

    /**
     * Configuração oficial baseada na documentação Facebook Developers
     * https://developers.facebook.com/docs/facebook-login/permissions
     * https://developers.facebook.com/docs/instagram-api/guides/content-publishing
     */
    getOfficialConfiguration() {
        return {
            // OPÇÃO 1: Instagram API com Facebook Login (RECOMENDADO)
            facebookLogin: {
                scopes: [
                    'instagram_basic',              // ✅ OFICIAL: Basic Instagram access
                    'instagram_content_publish',    // ✅ OFICIAL: Content publishing  
                    'pages_read_engagement'         // ✅ OFICIAL: Page engagement data
                ],
                // Opcional se usuário tem role via Business Manager:
                optionalScopes: [
                    'ads_management',               // ✅ OFICIAL: Business Manager role
                    'ads_read'                     // ✅ OFICIAL: Business Manager role
                ],
                loginUrl: 'https://www.facebook.com/v21.0/dialog/oauth',
                description: 'Use Facebook credentials, account linked to Facebook Page'
            },

            // OPÇÃO 2: Instagram API com Instagram Login (ALTERNATIVA)
            instagramLogin: {
                scopes: [
                    'instagram_business_basic',           // ✅ OFICIAL: Basic Business access
                    'instagram_business_content_publish'  // ✅ OFICIAL: Business publishing
                ],
                loginUrl: 'https://api.instagram.com/oauth/authorize',
                description: 'Use Instagram credentials directly'
            },

            // Permissões REMOVIDAS (desnecessárias para posting):
            deprecated: [
                'pages_show_list',        // Redundante com pages_read_engagement
                'business_management',    // Desnecessária para posting básico
                'instagram_manage_insights'  // Separar do fluxo de posting
            ]
        };
    }

    /**
     * Configuração RECOMENDADA para seu sistema
     */
    getRecommendedConfig() {
        // Facebook Login é mais estável e confiável
        const config = this.officialConfig.facebookLogin;
        
        return {
            // Configuração principal
            authUrl: 'https://www.facebook.com/v21.0/dialog/oauth',
            scopes: config.scopes,
            
            // URLs da API
            apiVersion: 'v21.0',
            baseUrl: 'https://graph.facebook.com/v21.0',
            
            // Fluxo de autorização
            authFlow: {
                step1: 'User autoriza com Facebook credentials',
                step2: 'Sistema obtém user access token', 
                step3: 'Sistema obtém page access token',
                step4: 'Sistema identifica Instagram Business Account via Page',
                step5: 'Sistema pode publicar conteúdo'
            },

            // Validação
            requiredPermissions: config.scopes,
            
            implementation: {
                configFile: 'src/config/graphApiConfig.js',
                serviceFile: 'src/services/instagram-api-service.js',
                generatorFile: 'generate-instagram-token-2025.js'
            }
        };
    }

    /**
     * Validar permissões atuais vs. oficiais
     */
    validateCurrentPermissions(currentScopes) {
        const recommended = this.getRecommendedConfig().scopes;
        const deprecated = this.officialConfig.deprecated;
        
        const analysis = {
            valid: [],
            invalid: [],
            deprecated: [],
            missing: []
        };

        // Verificar permissões atuais
        currentScopes.forEach(scope => {
            if (recommended.includes(scope)) {
                analysis.valid.push(scope);
            } else if (deprecated.includes(scope)) {
                analysis.deprecated.push(scope);
            } else {
                analysis.invalid.push(scope);
            }
        });

        // Verificar permissões em falta
        recommended.forEach(scope => {
            if (!currentScopes.includes(scope)) {
                analysis.missing.push(scope);
            }
        });

        return analysis;
    }

    /**
     * Gerar URLs de autorização corretas
     */
    generateAuthUrls(appId, redirectUri) {
        const facebookConfig = this.officialConfig.facebookLogin;
        const instagramConfig = this.officialConfig.instagramLogin;

        return {
            // URL recomendada (Facebook Login)
            facebook: `${facebookConfig.loginUrl}?` + new URLSearchParams({
                client_id: appId,
                redirect_uri: redirectUri,
                scope: facebookConfig.scopes.join(','),
                response_type: 'code'
            }).toString(),

            // URL alternativa (Instagram Login)  
            instagram: `${instagramConfig.loginUrl}?` + new URLSearchParams({
                client_id: appId,
                redirect_uri: redirectUri,
                scope: instagramConfig.scopes.join(','),
                response_type: 'code'
            }).toString()
        };
    }

    /**
     * Diagnóstico das permissões atuais do sistema
     */
    diagnoseCurrentSystem() {
        // Permissões encontradas no código atual
        const currentPermissions = [
            'instagram_business_basic',
            'instagram_business_content_publish', 
            'pages_show_list',
            'pages_read_engagement',
            'instagram_manage_insights',
            'business_management'
        ];

        const analysis = this.validateCurrentPermissions(currentPermissions);
        
        return {
            status: analysis.invalid.length === 0 ? 'VÁLIDO' : 'PRECISA_AJUSTE',
            currentPermissions,
            analysis,
            recommendation: 'Usar Facebook Login com permissões simplificadas',
            actions: [
                'Remover permissões desnecessárias',
                'Simplificar para 3 permissões essenciais',
                'Testar com configuração mínima',
                'Adicionar permissões extras conforme necessário'
            ]
        };
    }
}

// Executar diagnóstico se chamado diretamente
if (require.main === module) {
    const config = new InstagramPermissionsConfig2025();
    const diagnosis = config.diagnoseCurrentSystem();
    const recommended = config.getRecommendedConfig();
    
    console.log('🔍 DIAGNÓSTICO INSTAGRAM PERMISSIONS 2025');
    console.log('==========================================\n');
    
    console.log(`📊 STATUS: ${diagnosis.status}`);
    console.log(`🎯 RECOMENDAÇÃO: ${diagnosis.recommendation}\n`);
    
    console.log('✅ PERMISSÕES VÁLIDAS ENCONTRADAS:');
    diagnosis.analysis.valid.forEach(perm => console.log(`   ✅ ${perm}`));
    
    if (diagnosis.analysis.deprecated.length > 0) {
        console.log('\n⚠️ PERMISSÕES DESNECESSÁRIAS:');
        diagnosis.analysis.deprecated.forEach(perm => console.log(`   ⚠️ ${perm}`));
    }
    
    if (diagnosis.analysis.missing.length > 0) {
        console.log('\n❌ PERMISSÕES EM FALTA:');
        diagnosis.analysis.missing.forEach(perm => console.log(`   ❌ ${perm}`));
    }
    
    console.log('\n🎯 CONFIGURAÇÃO RECOMENDADA:');
    recommended.scopes.forEach(perm => console.log(`   ✅ ${perm}`));
    
    console.log('\n🔧 AÇÕES RECOMENDADAS:');
    diagnosis.actions.forEach(action => console.log(`   🔧 ${action}`));
    
    console.log('\n🌐 URL DE AUTORIZAÇÃO RECOMENDADA:');
    const urls = config.generateAuthUrls('SEU_APP_ID', 'SEU_REDIRECT_URI');
    console.log(`   ${urls.facebook}`);
}

module.exports = InstagramPermissionsConfig2025;