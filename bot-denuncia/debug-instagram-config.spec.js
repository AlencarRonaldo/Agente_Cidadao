/**
 * Debug completo da interface admin - Instagram Config
 * Investigação específica para descobrir por que o Instagram Config não aparece
 */

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// Configuração de timeouts
test.setTimeout(120000);

test.describe('Debug Instagram Config - Investigação Completa', () => {
  let page;
  let context;
  let debugData = {
    screenshots: [],
    consoleLogs: [],
    networkLogs: [],
    errors: [],
    stateChanges: [],
    apiResponses: []
  };

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      recordVideo: {
        dir: 'test-results/debug-instagram/',
        size: { width: 1920, height: 1080 }
      }
    });
    
    page = await context.newPage();
    
    // Capturar todos os logs do console
    page.on('console', msg => {
      const log = {
        type: msg.type(),
        text: msg.text(),
        timestamp: new Date().toISOString()
      };
      debugData.consoleLogs.push(log);
      console.log(`[CONSOLE ${log.type.toUpperCase()}]`, log.text);
    });

    // Capturar erros JavaScript
    page.on('pageerror', error => {
      const errorInfo = {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      };
      debugData.errors.push(errorInfo);
      console.log('[PAGE ERROR]', error.message);
    });

    // Monitorar requests de rede
    page.on('request', request => {
      const requestInfo = {
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
        timestamp: new Date().toISOString()
      };
      debugData.networkLogs.push({ type: 'request', ...requestInfo });
    });

    // Monitorar responses de rede
    page.on('response', response => {
      const responseInfo = {
        url: response.url(),
        status: response.status(),
        headers: response.headers(),
        timestamp: new Date().toISOString()
      };
      debugData.networkLogs.push({ type: 'response', ...responseInfo });
    });
  });

  test.afterAll(async () => {
    // Salvar dados de debug
    const debugDir = 'test-results/debug-instagram/';
    if (!fs.existsSync(debugDir)) {
      fs.mkdirSync(debugDir, { recursive: true });
    }
    
    fs.writeFileSync(
      path.join(debugDir, 'debug-report.json'),
      JSON.stringify(debugData, null, 2)
    );
    
    await context.close();
  });

  test('1. Acessar Admin Panel e Fazer Login', async () => {
    console.log('🔍 PASSO 1: Acessando admin panel...');
    
    // Navegar para o admin panel
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle' });
    
    // Screenshot inicial
    await page.screenshot({ 
      path: 'test-results/debug-instagram/01-initial-load.png',
      fullPage: true 
    });
    debugData.screenshots.push('01-initial-load.png');
    
    // Verificar se a página carregou
    await expect(page.locator('body')).toBeVisible();
    
    // Preencher formulário de login
    console.log('📝 Preenchendo formulário de login...');
    await page.fill('input[type="email"], input[name="email"]', 'admin@teste.com');
    await page.fill('input[type="password"], input[name="password"]', '123456');
    
    await page.screenshot({ 
      path: 'test-results/debug-instagram/02-login-form.png',
      fullPage: true 
    });
    debugData.screenshots.push('02-login-form.png');
    
    // Fazer login
    await page.click('button[type="submit"], button:has-text("Entrar"), button:has-text("Login")');
    
    // Aguardar carregamento após login
    await page.waitForTimeout(3000);
    await page.screenshot({ 
      path: 'test-results/debug-instagram/03-dashboard-loaded.png',
      fullPage: true 
    });
    debugData.screenshots.push('03-dashboard-loaded.png');
    
    console.log('✅ Login realizado com sucesso');
  });

  test('2. Investigar Botão Instagram na Toolbar', async () => {
    console.log('🔍 PASSO 2: Investigando botão Instagram...');
    
    // Aguardar dashboard carregar completamente
    await page.waitForTimeout(2000);
    
    // Procurar diferentes variações do botão Instagram
    const instagramSelectors = [
      'button[title*="Instagram"]',
      'button:has-text("Instagram")',
      'button:has([data-testid="InstagramIcon"])',
      'button svg[data-testid="InstagramIcon"]',
      '[role="button"]:has-text("Instagram")',
      'button:has(svg[data-testid="InstagramIcon"])',
      '.MuiIconButton-root:has(svg[data-testid="InstagramIcon"])',
      'button[aria-label*="Instagram"]'
    ];
    
    let instagramButton = null;
    let foundSelector = null;
    
    for (const selector of instagramSelectors) {
      try {
        const element = await page.locator(selector).first();
        if (await element.isVisible({ timeout: 1000 })) {
          instagramButton = element;
          foundSelector = selector;
          console.log(`✅ Botão Instagram encontrado com selector: ${selector}`);
          break;
        }
      } catch (e) {
        console.log(`❌ Selector não funcionou: ${selector}`);
      }
    }
    
    if (!instagramButton) {
      console.log('🚨 PROBLEMA: Botão Instagram não encontrado!');
      
      // Capturar toda a toolbar para análise
      await page.screenshot({ 
        path: 'test-results/debug-instagram/04-toolbar-analysis.png',
        fullPage: true 
      });
      debugData.screenshots.push('04-toolbar-analysis.png');
      
      // Analisar todos os botões disponíveis
      const allButtons = await page.locator('button').all();
      console.log(`📊 Total de botões encontrados: ${allButtons.length}`);
      
      for (let i = 0; i < allButtons.length; i++) {
        try {
          const buttonText = await allButtons[i].textContent();
          const buttonTitle = await allButtons[i].getAttribute('title');
          const buttonAriaLabel = await allButtons[i].getAttribute('aria-label');
          
          console.log(`Botão ${i + 1}:`, {
            text: buttonText,
            title: buttonTitle,
            ariaLabel: buttonAriaLabel
          });
        } catch (e) {
          console.log(`Erro ao analisar botão ${i + 1}:`, e.message);
        }
      }
      
      // Procurar ícones Instagram especificamente
      const instagramIcons = await page.locator('svg[data-testid="InstagramIcon"]').all();
      console.log(`📱 Ícones Instagram encontrados: ${instagramIcons.length}`);
      
      for (let i = 0; i < instagramIcons.length; i++) {
        const iconParent = instagramIcons[i].locator('..');
        const parentTag = await iconParent.evaluate(el => el.tagName);
        const parentClasses = await iconParent.getAttribute('class');
        console.log(`Ícone ${i + 1} - Parent: ${parentTag}, Classes: ${parentClasses}`);
      }
    } else {
      console.log('✅ Botão Instagram encontrado!');
      
      // Capturar informações sobre o botão
      const buttonInfo = {
        selector: foundSelector,
        isVisible: await instagramButton.isVisible(),
        isEnabled: await instagramButton.isEnabled(),
        text: await instagramButton.textContent(),
        title: await instagramButton.getAttribute('title'),
        ariaLabel: await instagramButton.getAttribute('aria-label'),
        classes: await instagramButton.getAttribute('class')
      };
      
      debugData.stateChanges.push({
        step: 'button-found',
        info: buttonInfo,
        timestamp: new Date().toISOString()
      });
      
      console.log('📋 Informações do botão:', buttonInfo);
    }
  });

  test('3. Testar Clique no Botão Instagram', async () => {
    console.log('🔍 PASSO 3: Testando clique no botão Instagram...');
    
    // Procurar o botão novamente
    const instagramButton = page.locator('button:has(svg[data-testid="InstagramIcon"])').first();
    
    if (await instagramButton.isVisible({ timeout: 5000 })) {
      console.log('🖱️ Clicking Instagram button...');
      
      // Capturar estado antes do clique
      await page.screenshot({ 
        path: 'test-results/debug-instagram/05-before-click.png',
        fullPage: true 
      });
      debugData.screenshots.push('05-before-click.png');
      
      // Destacar o botão que será clicado
      await instagramButton.highlight();
      
      // Clicar no botão
      await instagramButton.click();
      
      // Aguardar possíveis mudanças
      await page.waitForTimeout(2000);
      
      // Capturar estado após o clique
      await page.screenshot({ 
        path: 'test-results/debug-instagram/06-after-click.png',
        fullPage: true 
      });
      debugData.screenshots.push('06-after-click.png');
      
      // Verificar se o componente InstagramConfig apareceu
      const instagramConfigSelectors = [
        '[data-testid="instagram-config"]',
        '.instagram-config',
        'div:has-text("Instagram")',
        'div:has-text("Configuração do Instagram")',
        'div:has-text("API Status")',
        'div:has-text("Username")',
        'div:has-text("Password")'
      ];
      
      let configFound = false;
      for (const selector of instagramConfigSelectors) {
        try {
          const element = page.locator(selector);
          if (await element.isVisible({ timeout: 1000 })) {
            console.log(`✅ Instagram Config encontrado: ${selector}`);
            configFound = true;
            break;
          }
        } catch (e) {
          // Selector não funcionou
        }
      }
      
      if (!configFound) {
        console.log('🚨 PROBLEMA: Instagram Config não apareceu após o clique!');
        
        // Analisar o que aconteceu
        const currentUrl = page.url();
        const currentContent = await page.content();
        
        debugData.stateChanges.push({
          step: 'after-click',
          url: currentUrl,
          hasInstagramConfig: configFound,
          timestamp: new Date().toISOString()
        });
        
        // Procurar por erros de renderização
        const reactErrors = await page.locator('.error, .error-boundary, [data-testid="error"]').all();
        console.log(`🔍 Erros React encontrados: ${reactErrors.length}`);
      } else {
        console.log('✅ Instagram Config carregado com sucesso!');
      }
    } else {
      console.log('❌ Botão Instagram não está visível para clique');
    }
  });

  test('4. Verificar Chamadas de API', async () => {
    console.log('🔍 PASSO 4: Verificando chamadas de API...');
    
    // Aguardar um momento para garantir que todas as calls foram feitas
    await page.waitForTimeout(3000);
    
    // Testar diretamente a API de status do Instagram
    try {
      console.log('🌐 Testando /api/admin/instagram/api-status...');
      
      const response = await page.evaluate(async () => {
        try {
          const token = localStorage.getItem('adminToken');
          const response = await fetch('/api/admin/instagram/api-status', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          return {
            status: response.status,
            ok: response.ok,
            data: await response.json()
          };
        } catch (error) {
          return {
            error: error.message
          };
        }
      });
      
      console.log('📊 API Response:', JSON.stringify(response, null, 2));
      debugData.apiResponses.push({
        endpoint: '/api/admin/instagram/api-status',
        response: response,
        timestamp: new Date().toISOString()
      });
      
      await page.screenshot({ 
        path: 'test-results/debug-instagram/07-api-status.png',
        fullPage: true 
      });
      debugData.screenshots.push('07-api-status.png');
      
    } catch (error) {
      console.log('❌ Erro ao testar API:', error.message);
      debugData.errors.push({
        type: 'api-test',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  test('5. Análise de Estado do React', async () => {
    console.log('🔍 PASSO 5: Analisando estado do React...');
    
    // Verificar se React Developer Tools estão disponíveis
    const reactState = await page.evaluate(() => {
      try {
        // Procurar pelo componente Dashboard no DOM
        const dashboardElement = document.querySelector('[class*="Dashboard"], [data-testid="dashboard"]');
        
        if (dashboardElement && dashboardElement._reactInternalFiber) {
          // React 16+
          return 'React 16+ detected';
        } else if (dashboardElement && dashboardElement._reactInternalInstance) {
          // React 15
          return 'React 15 detected';
        }
        
        // Verificar se há componentes React montados
        const allElements = document.querySelectorAll('*');
        let reactComponents = 0;
        
        for (let el of allElements) {
          if (el._reactInternalFiber || el._reactInternalInstance) {
            reactComponents++;
          }
        }
        
        return {
          reactComponents,
          currentView: window.currentView || 'unknown',
          localStorage: {
            adminToken: !!localStorage.getItem('adminToken'),
            adminUser: !!localStorage.getItem('adminUser')
          }
        };
      } catch (error) {
        return { error: error.message };
      }
    });
    
    console.log('⚛️ Estado React:', JSON.stringify(reactState, null, 2));
    debugData.stateChanges.push({
      step: 'react-analysis',
      state: reactState,
      timestamp: new Date().toISOString()
    });
    
    await page.screenshot({ 
      path: 'test-results/debug-instagram/08-react-state.png',
      fullPage: true 
    });
    debugData.screenshots.push('08-react-state.png');
  });

  test('6. Teste de Fallback e Recovery', async () => {
    console.log('🔍 PASSO 6: Testando fallback e recovery...');
    
    // Tentar navegar diretamente para URLs relacionadas ao Instagram
    const urlsToTest = [
      'http://localhost:3001/#instagram',
      'http://localhost:3001/#/instagram',
      'http://localhost:3001/instagram',
      'http://localhost:3001/#instagram-config'
    ];
    
    for (const url of urlsToTest) {
      try {
        console.log(`🔗 Testando URL: ${url}`);
        await page.goto(url, { waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);
        
        const hasInstagramContent = await page.locator('div:has-text("Instagram"), div:has-text("Username"), div:has-text("Password")').count() > 0;
        
        console.log(`📊 URL ${url} - Instagram content: ${hasInstagramContent}`);
        
        if (hasInstagramContent) {
          await page.screenshot({ 
            path: `test-results/debug-instagram/url-test-${url.replace(/[^a-zA-Z0-9]/g, '_')}.png`,
            fullPage: true 
          });
        }
      } catch (error) {
        console.log(`❌ Erro na URL ${url}:`, error.message);
      }
    }
    
    // Voltar para o dashboard
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
  });

  test('7. RELATÓRIO FINAL - Análise Completa', async () => {
    console.log('📋 PASSO 7: Gerando relatório final...');
    
    // Screenshot final
    await page.screenshot({ 
      path: 'test-results/debug-instagram/99-final-state.png',
      fullPage: true 
    });
    debugData.screenshots.push('99-final-state.png');
    
    // Análise final
    const finalAnalysis = {
      totalScreenshots: debugData.screenshots.length,
      totalConsoleLogs: debugData.consoleLogs.length,
      totalErrors: debugData.errors.length,
      totalNetworkCalls: debugData.networkLogs.length,
      totalStateChanges: debugData.stateChanges.length,
      apiCalls: debugData.apiResponses.length,
      
      // Análise específica do Instagram
      instagramButtonFound: debugData.stateChanges.some(s => s.step === 'button-found'),
      instagramConfigLoaded: debugData.stateChanges.some(s => s.step === 'after-click' && s.hasInstagramConfig),
      
      // Erros críticos
      criticalErrors: debugData.errors.filter(e => 
        e.message.toLowerCase().includes('instagram') ||
        e.message.toLowerCase().includes('config') ||
        e.message.toLowerCase().includes('component')
      ),
      
      // Console logs relevantes
      relevantLogs: debugData.consoleLogs.filter(log =>
        log.text.toLowerCase().includes('instagram') ||
        log.text.toLowerCase().includes('config') ||
        log.text.toLowerCase().includes('error') ||
        log.text.toLowerCase().includes('warning')
      )
    };
    
    console.log('📊 ANÁLISE FINAL:');
    console.log('================');
    console.log(JSON.stringify(finalAnalysis, null, 2));
    
    // Salvar análise final
    fs.writeFileSync(
      'test-results/debug-instagram/final-analysis.json',
      JSON.stringify(finalAnalysis, null, 2)
    );
    
    // Gerar relatório markdown
    const markdownReport = `
# Debug Instagram Config - Relatório Final

## Resumo Executivo
- **Screenshots capturados**: ${finalAnalysis.totalScreenshots}
- **Logs do console**: ${finalAnalysis.totalConsoleLogs}
- **Erros detectados**: ${finalAnalysis.totalErrors}
- **Chamadas de rede**: ${finalAnalysis.totalNetworkCalls}
- **Mudanças de estado**: ${finalAnalysis.totalStateChanges}

## Problemas Identificados

### Botão Instagram
- **Encontrado**: ${finalAnalysis.instagramButtonFound ? '✅ Sim' : '❌ Não'}

### Instagram Config
- **Carregado**: ${finalAnalysis.instagramConfigLoaded ? '✅ Sim' : '❌ Não'}

### Erros Críticos
${finalAnalysis.criticalErrors.map(error => `- **${error.type}**: ${error.message}`).join('\n')}

### Logs Relevantes
${finalAnalysis.relevantLogs.slice(0, 10).map(log => `- **${log.type}**: ${log.text}`).join('\n')}

## Próximos Passos
1. Verificar se o botão Instagram está sendo renderizado corretamente
2. Investigar problemas de estado do React
3. Verificar se as rotas da API estão funcionando
4. Analisar erros JavaScript no console

## Arquivos Gerados
- Screenshots: test-results/debug-instagram/
- Dados completos: debug-report.json
- Análise final: final-analysis.json
`;
    
    fs.writeFileSync(
      'test-results/debug-instagram/RELATORIO_DEBUG.md',
      markdownReport
    );
    
    console.log('✅ Relatório completo gerado em test-results/debug-instagram/');
  });
});