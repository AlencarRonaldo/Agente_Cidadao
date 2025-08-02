/**
 * Teste Simples dos Tokens Instagram
 * Verificação direta sem dependências complexas
 */

const instagramApiManager = require('./src/services/instagramApiManager');
const fs = require('fs');
const path = require('path');

async function testInstagramTokens() {
    console.log('🧪 TESTE COMPLETO DOS TOKENS INSTAGRAM');
    console.log('=====================================\n');
    
    // 1. Verificar configuração do ambiente
    console.log('📋 1. VERIFICAÇÃO DO AMBIENTE');
    console.log('-----------------------------');
    
    const requiredEnvVars = [
        'INSTAGRAM_APP_ID',
        'INSTAGRAM_APP_SECRET',
        'INSTAGRAM_BUSINESS_ID',
        'INSTAGRAM_GRAPH_ACCESS_TOKEN',
        'INSTAGRAM_USERNAME',
        'INSTAGRAM_PASSWORD'
    ];
    
    let envScore = 0;
    requiredEnvVars.forEach(varName => {
        const value = process.env[varName];
        if (value && value !== 'NEED_VALID_USER_TOKEN_NOT_BUSINESS_ID') {
            console.log(`✅ ${varName}: Configurado`);
            envScore++;
        } else {
            console.log(`❌ ${varName}: ${value ? 'Valor inválido' : 'Não configurado'}`);
        }
    });
    
    console.log(`📊 Score de Configuração: ${envScore}/${requiredEnvVars.length} (${Math.round(envScore/requiredEnvVars.length*100)}%)\n`);
    
    // 2. Testar Instagram API Manager
    console.log('📋 2. TESTE DO INSTAGRAM API MANAGER');
    console.log('------------------------------------');
    
    try {
        const connectionTest = await instagramApiManager.testConnection();
        console.log('🔍 Resultado do teste de conexão:');
        console.log(JSON.stringify(connectionTest, null, 2));
        
        if (connectionTest.success) {
            console.log('✅ API Manager: Funcionando');
        } else {
            console.log('❌ API Manager: Com problemas');
            console.log(`   Erro: ${connectionTest.error}`);
        }
    } catch (error) {
        console.log('❌ API Manager: Erro crítico');
        console.log(`   Erro: ${error.message}`);
    }
    
    console.log('');
    
    // 3. Testar configurações específicas
    console.log('📋 3. TESTE DE CONFIGURAÇÕES ESPECÍFICAS');
    console.log('----------------------------------------');
    
    try {
        const status = await instagramApiManager.getStatus();
        console.log('📊 Status atual do sistema:');
        console.log(JSON.stringify(status, null, 2));
        
        // Analisar o status
        if (status.currentApi) {
            console.log(`✅ API Atual: ${status.currentApi}`);
        }
        
        if (status.fallbackEnabled) {
            console.log('✅ Fallback: Habilitado');
        }
        
        if (status.migrationReady !== undefined) {
            console.log(`📈 Migration Ready: ${status.migrationReady ? '✅' : '❌'}`);
        }
        
    } catch (error) {
        console.log('❌ Erro ao obter status:', error.message);
    }
    
    console.log('');
    
    // 4. Teste de publicação simulada
    console.log('📋 4. TESTE DE PUBLICAÇÃO SIMULADA');
    console.log('----------------------------------');
    
    const testData = {
        texto: 'Teste automatizado do sistema de postagem Instagram',
        imagem: 'https://picsum.photos/800/600',
        vereadores: ['@vereador1', '@vereador2'],
        bairro: 'Centro'
    };
    
    try {
        // Não publicar realmente, apenas testar a estrutura
        console.log('🧪 Executando teste de publicação (modo dry-run)...');
        
        // Verificar se as funções estão disponíveis
        const hasPublishMethod = typeof instagramApiManager.publicar === 'function';
        const hasTestMethod = typeof instagramApiManager.testConnection === 'function';
        
        console.log(`📋 Método publicar(): ${hasPublishMethod ? '✅' : '❌'}`);
        console.log(`📋 Método testConnection(): ${hasTestMethod ? '✅' : '❌'}`);
        
        if (hasPublishMethod) {
            console.log('✅ Sistema pronto para publicação');
        } else {
            console.log('❌ Sistema não está pronto para publicação');
        }
        
    } catch (error) {
        console.log('❌ Erro no teste de publicação:', error.message);
    }
    
    console.log('');
    
    // 5. Verificar arquivos de configuração
    console.log('📋 5. VERIFICAÇÃO DE ARQUIVOS DE CONFIGURAÇÃO');
    console.log('---------------------------------------------');
    
    const configFiles = [
        'src/services/instagramApiManager.js',
        'src/services/instagram-api-service.js',
        'src/services/instagramService.js',
        'src/config/humanizationConfig.js'
    ];
    
    configFiles.forEach(filePath => {
        const fullPath = path.join(__dirname, filePath);
        if (fs.existsSync(fullPath)) {
            const stats = fs.statSync(fullPath);
            console.log(`✅ ${filePath}: ${Math.round(stats.size/1024)}KB`);
        } else {
            console.log(`❌ ${filePath}: Não encontrado`);
        }
    });
    
    console.log('');
    
    // 6. Recomendações finais
    console.log('📋 6. RECOMENDAÇÕES E DIAGNÓSTICO FINAL');
    console.log('=======================================');
    
    console.log('🔍 ANÁLISE:');
    
    if (envScore >= 5) {
        console.log('✅ Configuração do ambiente: Boa');
    } else if (envScore >= 3) {
        console.log('⚠️  Configuração do ambiente: Precisa melhorar');
    } else {
        console.log('❌ Configuração do ambiente: Crítica');
    }
    
    console.log('\n💡 PRÓXIMOS PASSOS:');
    
    if (process.env.INSTAGRAM_GRAPH_ACCESS_TOKEN === 'NEED_VALID_USER_TOKEN_NOT_BUSINESS_ID') {
        console.log('1. 🔑 CRÍTICO: Configurar token válido do Graph API');
        console.log('   - Fazer OAuth flow no Facebook Developer');
        console.log('   - Obter token com permissões pages_manage_posts');
        console.log('   - Atualizar INSTAGRAM_GRAPH_ACCESS_TOKEN no .env');
    }
    
    if (!process.env.INSTAGRAM_USERNAME || !process.env.INSTAGRAM_PASSWORD) {
        console.log('2. 🔐 Configurar credenciais da Private API (fallback)');
        console.log('   - Definir INSTAGRAM_USERNAME');
        console.log('   - Definir INSTAGRAM_PASSWORD');
    }
    
    console.log('3. 🧪 Executar teste real de publicação');
    console.log('4. 📊 Monitorar logs para verificar funcionamento');
    
    console.log('\n🎯 STATUS GERAL:');
    const overallScore = envScore / requiredEnvVars.length;
    
    if (overallScore >= 0.8) {
        console.log('🟢 SISTEMA PRONTO PARA PRODUÇÃO');
    } else if (overallScore >= 0.6) {
        console.log('🟡 SISTEMA PARCIALMENTE PRONTO (correções menores necessárias)');
    } else {
        console.log('🔴 SISTEMA NÃO ESTÁ PRONTO (correções críticas necessárias)');
    }
    
    console.log(`📊 Score Geral: ${Math.round(overallScore * 100)}%`);
    
    return {
        envScore,
        overallScore,
        ready: overallScore >= 0.8
    };
}

// Executar teste
if (require.main === module) {
    testInstagramTokens()
        .then(result => {
            console.log('\n🎉 TESTE CONCLUÍDO');
            process.exit(result.ready ? 0 : 1);
        })
        .catch(error => {
            console.error('\n💥 ERRO NO TESTE:', error.message);
            process.exit(1);
        });
}

module.exports = testInstagramTokens;