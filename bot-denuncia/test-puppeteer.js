/**
 * TESTE DE CONFIGURAÇÃO PUPPETEER
 * 
 * Script para testar se o Puppeteer consegue inicializar com as novas configurações
 */

const puppeteerConfig = require('./puppeteer-config');

async function testPuppeteerLaunch() {
    console.log('🧪 Iniciando teste de configuração Puppeteer...\n');
    
    // Mostrar configuração que será usada
    console.log('📋 Configuração carregada:');
    console.log('  - executablePath:', puppeteerConfig.executablePath || 'auto-detect');
    console.log('  - timeout:', puppeteerConfig.timeout);
    console.log('  - args count:', puppeteerConfig.args.length);
    console.log('  - headless:', puppeteerConfig.headless);
    console.log();
    
    let browser = null;
    
    try {
        // Tentar usar puppeteer diretamente se disponível
        let puppeteer;
        try {
            puppeteer = require('puppeteer');
            console.log('✅ Puppeteer módulo encontrado');
        } catch (e) {
            console.log('⚠️ Puppeteer não encontrado, usando whatsapp-web.js puppeteer');
            puppeteer = require('whatsapp-web.js').puppeteer;
        }
        
        console.log('🚀 Tentando lançar browser...');
        
        browser = await puppeteer.launch(puppeteerConfig);
        
        console.log('✅ Browser lançado com sucesso!');
        
        // Testar criação de página
        const page = await browser.newPage();
        console.log('✅ Página criada com sucesso!');
        
        // Teste básico de navegação
        await page.goto('https://web.whatsapp.com', { 
            waitUntil: 'networkidle0', 
            timeout: 30000 
        });
        
        console.log('✅ Navegação para WhatsApp Web bem-sucedida!');
        
        // Verificar se elementos básicos carregaram
        await page.waitForTimeout(2000);
        
        const title = await page.title();
        console.log(`✅ Título da página: "${title}"`);
        
        await page.close();
        console.log('✅ Página fechada com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro durante teste:', error.message);
        
        // Diagnóstico adicional
        console.log('\n🔍 Diagnóstico:');
        
        if (error.message.includes('Failed to launch')) {
            console.log('  - Problema de launch do browser');
            console.log('  - Verifique se Chrome está instalado');
            console.log('  - Execute: chrome-fix.bat');
        }
        
        if (error.message.includes('timeout')) {
            console.log('  - Timeout durante inicialização');
            console.log('  - Considere aumentar timeout ou otimizar sistema');
        }
        
        if (error.message.includes('ECONNREFUSED')) {
            console.log('  - Problema de conexão de rede');
            console.log('  - Verifique firewall e conexão internet');
        }
        
        return false;
    } finally {
        if (browser) {
            try {
                await browser.close();
                console.log('✅ Browser fechado com sucesso!');
            } catch (e) {
                console.warn('⚠️ Erro ao fechar browser:', e.message);
            }
        }
    }
    
    console.log('\n🎉 Teste concluído com sucesso!');
    console.log('   WhatsApp Bot deve funcionar normalmente agora.');
    return true;
}

// Executar teste se chamado diretamente
if (require.main === module) {
    testPuppeteerLaunch()
        .then(success => {
            if (success) {
                console.log('\n✅ TESTE APROVADO - Configuração funcionando!');
                process.exit(0);
            } else {
                console.log('\n❌ TESTE FALHADO - Verifique configurações');
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('\n💥 ERRO CRÍTICO:', error);
            process.exit(1);
        });
}

module.exports = testPuppeteerLaunch;