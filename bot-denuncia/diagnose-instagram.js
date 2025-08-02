/**
 * Instagram Graph API Diagnostic Tool
 * Diagnóstica problemas de configuração Instagram Business Account
 */

const axios = require('axios');

class InstagramDiagnostic {
    constructor(pageToken, pageId) {
        this.pageToken = pageToken;
        this.pageId = pageId;
        this.baseUrl = 'https://graph.facebook.com/v18.0';
    }

    async diagnoseInstagramConnection() {
        console.log('🔍 DIAGNOSTICANDO CONEXÃO INSTAGRAM...\n');

        const tests = [
            { name: 'Page Info', test: () => this.testPageInfo() },
            { name: 'Instagram Business Account', test: () => this.testInstagramBusinessAccount() },
            { name: 'Page Permissions', test: () => this.testPagePermissions() },
            { name: 'Instagram Publishing', test: () => this.testInstagramPublishing() }
        ];

        for (const { name, test } of tests) {
            try {
                console.log(`📋 Testando: ${name}`);
                const result = await test();
                console.log(`✅ ${name}: SUCESSO`);
                console.log(`   ${JSON.stringify(result, null, 2)}\n`);
            } catch (error) {
                console.log(`❌ ${name}: FALHOU`);
                console.log(`   Erro: ${error.message}\n`);
                
                // Sugestões baseadas no erro
                this.provideSuggestions(name, error);
            }
        }
    }

    async testPageInfo() {
        const response = await axios.get(`${this.baseUrl}/${this.pageId}`, {
            params: {
                fields: 'id,name,category,verification_status',
                access_token: this.pageToken
            }
        });
        return response.data;
    }

    async testInstagramBusinessAccount() {
        const response = await axios.get(`${this.baseUrl}/${this.pageId}`, {
            params: {
                fields: 'instagram_business_account{id,username,account_type}',
                access_token: this.pageToken
            }
        });
        
        if (!response.data.instagram_business_account) {
            throw new Error('Instagram Business Account não encontrado');
        }
        
        return response.data.instagram_business_account;
    }

    async testPagePermissions() {
        const response = await axios.get(`${this.baseUrl}/me/permissions`, {
            params: {
                access_token: this.pageToken
            }
        });
        
        const requiredPerms = ['pages_manage_posts', 'pages_show_list'];
        const grantedPerms = response.data.data
            .filter(p => p.status === 'granted')
            .map(p => p.permission);
            
        const missingPerms = requiredPerms.filter(p => !grantedPerms.includes(p));
        
        if (missingPerms.length > 0) {
            throw new Error(`Permissões faltando: ${missingPerms.join(', ')}`);
        }
        
        return { granted: grantedPerms };
    }

    async testInstagramPublishing() {
        // Testa se consegue criar um container de mídia (sem publicar)
        try {
            const response = await axios.post(`${this.baseUrl}/${this.pageId}/feed`, {
                message: 'Test post - will not be published',
                published: false,
                access_token: this.pageToken
            });
            
            return { can_create_posts: true, test_post_id: response.data.id };
        } catch (error) {
            throw new Error(`Não consegue criar posts: ${error.response?.data?.error?.message || error.message}`);
        }
    }

    provideSuggestions(testName, error) {
        const suggestions = {
            'Instagram Business Account': [
                '1. Verificar se Instagram está conectado à página no Business Manager',
                '2. Confirmar que a conta Instagram é Business ou Creator',
                '3. Aguardar 24-48h após conectar Instagram à página',
                '4. Verificar se a página Facebook tem Instagram conectado nas configurações'
            ],
            'Page Permissions': [
                '1. Renovar token de acesso',
                '2. Verificar se o app tem as permissões necessárias',
                '3. Solicitar App Review se necessário',
                '4. Confirmar que o usuário é admin da página'
            ],
            'Instagram Publishing': [
                '1. Verificar se Instagram Business Account está ativo',
                '2. Confirmar políticas de conteúdo do Instagram',
                '3. Testar com conteúdo diferente',
                '4. Verificar limites de rate limiting'
            ]
        };

        if (suggestions[testName]) {
            console.log(`💡 SUGESTÕES PARA ${testName}:`);
            suggestions[testName].forEach(suggestion => {
                console.log(`   ${suggestion}`);
            });
            console.log('');
        }
    }
}

// Configuração - substitua pelos seus valores
const PAGE_TOKEN = process.env.FACEBOOK_PAGE_TOKEN || 'YOUR_PAGE_TOKEN';
const PAGE_ID = process.env.FACEBOOK_PAGE_ID || 'YOUR_PAGE_ID';

if (PAGE_TOKEN === 'YOUR_PAGE_TOKEN' || PAGE_ID === 'YOUR_PAGE_ID') {
    console.log('❌ Configure PAGE_TOKEN e PAGE_ID nas variáveis de ambiente');
    process.exit(1);
}

// Executar diagnóstico
const diagnostic = new InstagramDiagnostic(PAGE_TOKEN, PAGE_ID);
diagnostic.diagnoseInstagramConnection()
    .then(() => {
        console.log('🎉 DIAGNÓSTICO COMPLETO');
    })
    .catch(error => {
        console.log('💥 ERRO NO DIAGNÓSTICO:', error.message);
    });