/**
 * Playwright Debug - Aprovação de Denúncia
 * Teste automatizado para diagnosticar o problema do botão de aprovação
 */

const { chromium } = require('playwright');

async function debugApprovalFlow() {
    console.log('🎭 PLAYWRIGHT DEBUG - FLUXO DE APROVAÇÃO');
    console.log('=========================================\n');
    
    const browser = await chromium.launch({ 
        headless: false, // Mostrar navegador para debug visual
        slowMo: 1000    // Desacelerar para acompanhar
    });
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Interceptar requisições de rede
    const requests = [];
    const responses = [];
    
    page.on('request', request => {
        requests.push({
            url: request.url(),
            method: request.method(),
            headers: request.headers(),
            timestamp: new Date().toISOString()
        });
        console.log(`📤 REQUEST: ${request.method()} ${request.url()}`);
    });
    
    page.on('response', response => {
        responses.push({
            url: response.url(),
            status: response.status(),
            timestamp: new Date().toISOString()
        });
        console.log(`📥 RESPONSE: ${response.status()} ${response.url()}`);
    });
    
    // Interceptar erros de console
    page.on('console', msg => {
        console.log(`🖥️  CONSOLE [${msg.type()}]: ${msg.text()}`);
    });
    
    page.on('pageerror', error => {
        console.log(`❌ PAGE ERROR: ${error.message}`);
    });
    
    try {
        // 1. Navegar para o dashboard
        console.log('🌐 Navegando para o dashboard...');
        await page.goto('http://localhost:3001');
        
        // 2. Configurar token no localStorage (simular login)
        console.log('🔑 Configurando token de autenticação...');
        const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbWRxcHU5bzMwMDAwazRyOWs4YXF6eDhoIiwiZW1haWwiOiJhZG1pbkB0ZXN0ZS5jb20iLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3NTQwODQyMzQsImV4cCI6MTc1NDE3MDYzNH0.xIdb4uBeY4C4zd080yNluQg5NwE4Xj0bRJFNQz33qxQ';
        const validUser = JSON.stringify({
            id: 'cmdqpu9o30000k4r9k8aqzx8h',
            nome: 'Admin Teste',
            email: 'admin@teste.com',
            role: 'ADMIN'
        });
        
        await page.evaluate((token, user) => {
            localStorage.setItem('adminToken', token);
            localStorage.setItem('adminUser', user);
        }, validToken, validUser);
        
        // 3. Recarregar página para aplicar o token
        console.log('🔄 Recarregando página com token...');
        await page.reload();
        await page.waitForTimeout(3000);
        
        // 4. Procurar por denúncias na lista
        console.log('🔍 Procurando lista de denúncias...');
        await page.waitForSelector('table', { timeout: 10000 });
        
        // 5. Procurar pelo botão de aprovação específico
        console.log('⚡ Procurando botão "Aprovar e Postar"...');
        
        // Primeiro tentar encontrar qualquer botão de aprovação
        const approvalButtons = await page.$$('[title*="Aprovar e Postar"]');
        console.log(`   Encontrados ${approvalButtons.length} botões de aprovação`);
        
        if (approvalButtons.length === 0) {
            // Se não encontrar, mostrar todos os botões disponíveis
            console.log('📋 Listando todos os botões disponíveis:');
            const allButtons = await page.$$('button');
            for (let i = 0; i < Math.min(allButtons.length, 10); i++) {
                const buttonText = await allButtons[i].textContent();
                const buttonTitle = await allButtons[i].getAttribute('title');
                console.log(`   ${i + 1}. "${buttonText}" (title: "${buttonTitle}")`);
            }
            
            console.log('\\n❌ Não foi possível encontrar o botão de aprovação');
            return;
        }
        
        // 6. Clicar no primeiro botão de aprovação encontrado
        console.log('👆 Clicando no botão de aprovação...');
        await approvalButtons[0].click();
        
        // 7. Aguardar o modal de confirmação aparecer
        console.log('💬 Aguardando modal de confirmação...');
        await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
        
        // 8. Preencher os campos de segurança
        console.log('📝 Preenchendo campos de segurança...');
        
        // Confirmação
        const confirmSelect = await page.$('select[value=""], select:not([value])');
        if (confirmSelect) {
            await confirmSelect.selectOption('CONFIRMO_PUBLICACAO_IMEDIATA');
            console.log('   ✅ Confirmação selecionada');
        }
        
        // Nome do usuário
        const userField = await page.$('input[placeholder*="João"], input[placeholder*="Admin"]');
        if (userField) {
            await userField.fill('Admin Teste');
            console.log('   ✅ Nome preenchido');
        }
        
        // Motivo da urgência
        const reasonField = await page.$('textarea[placeholder*="emergência"], textarea[placeholder*="urgência"]');
        if (reasonField) {
            await reasonField.fill('Teste automatizado via Playwright para diagnosticar problema');
            console.log('   ✅ Motivo preenchido');
        }
        
        // 9. Aguardar validação dos campos
        console.log('⏳ Aguardando validação dos campos...');
        await page.waitForTimeout(2000);
        
        // 10. Procurar pelo botão final de submissão
        console.log('🔘 Procurando botão de submissão...');
        const submitButton = await page.$('button:has-text("PUBLICAR"), button:has-text("APROVAR")');
        
        if (!submitButton) {
            console.log('❌ Botão de submissão não encontrado');
            return;
        }
        
        const isDisabled = await submitButton.isDisabled();
        console.log(`   Botão habilitado: ${!isDisabled ? '✅' : '❌'}`);
        
        if (isDisabled) {
            console.log('⚠️  Botão ainda desabilitado - verificando validação...');
            // Aguardar um pouco mais
            await page.waitForTimeout(3000);
        }
        
        // 11. Clicar no botão de submissão e monitorar requisição
        console.log('🚀 Clicando no botão de submissão...');
        
        // Configurar timeout maior para a requisição
        page.setDefaultTimeout(120000); // 2 minutos
        
        // Aguardar requisição específica
        const responsePromise = page.waitForResponse(
            response => response.url().includes('/aprovar-e-postar'),
            { timeout: 120000 }
        );
        
        await submitButton.click();
        console.log('   👆 Botão clicado, aguardando resposta...');
        
        // 12. Aguardar resposta
        try {
            const response = await responsePromise;
            console.log(`\\n📊 RESPOSTA RECEBIDA:`);
            console.log(`   Status: ${response.status()}`);
            console.log(`   URL: ${response.url()}`);
            
            const responseText = await response.text();
            console.log(`   Body: ${responseText}`);
            
            if (response.status() === 200) {
                console.log('\\n🎉 SUCESSO! O endpoint funcionou corretamente');
            } else {
                console.log(`\\n❌ ERRO: Status ${response.status()}`);
            }
            
        } catch (timeoutError) {
            console.log('\\n⏰ TIMEOUT: Requisição demorou mais de 2 minutos');
            console.log('   Isso confirma que o controlador está travando');
            
            // Mostrar todas as requisições pendentes
            console.log('\\n📋 REQUISIÇÕES DURANTE O TESTE:');
            requests.forEach((req, index) => {
                console.log(`   ${index + 1}. ${req.method} ${req.url}`);
            });
        }
        
    } catch (error) {
        console.log(`\\n💥 ERRO NO TESTE: ${error.message}`);
    } finally {
        // 13. Aguardar um pouco antes de fechar (para ver resultado)
        console.log('\\n⏳ Aguardando 10 segundos antes de fechar...');
        await page.waitForTimeout(10000);
        
        await browser.close();
    }
}

// Executar teste
debugApprovalFlow()
    .then(() => {
        console.log('\\n✅ TESTE PLAYWRIGHT CONCLUÍDO');
    })
    .catch(error => {
        console.error('\\n❌ ERRO NO TESTE:', error.message);
    });