/**
 * Diagnóstico de Erro "Rota não encontrada" - Instagram Config
 * 
 * OBJETIVO: Identificar causa raiz do erro reportado pelo usuário
 * - Interceptar requisições de rede
 * - Capturar qual rota específica está falhando
 * - Diagnosticar problemas de proxy e configuração
 */

const { test, expect } = require('@playwright/test');

test.describe('Diagnóstico: Erro Rota Instagram', () => {
  let page;
  let networkErrors = [];
  let allRequests = [];
  
  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Capturar TODAS as requisições de rede
    page.on('request', request => {
      const url = request.url();
      allRequests.push({
        method: request.method(),
        url: url,
        timestamp: new Date().toISOString()
      });
      
      console.log(`🔵 Request: ${request.method()} ${url}`);
    });
    
    // Capturar respostas de rede
    page.on('response', response => {
      const url = response.url();
      const status = response.status();
      
      console.log(`🟢 Response: ${status} ${url}`);
      
      // Capturar erros 4xx e 5xx
      if (status >= 400) {
        networkErrors.push({
          method: response.request().method(),
          url: url,
          status: status,
          statusText: response.statusText(),
          timestamp: new Date().toISOString()
        });
        console.log(`❌ Network Error: ${status} ${response.statusText()} - ${url}`);
      }
    });
    
    // Capturar erros de rede
    page.on('requestfailed', request => {
      const error = {
        method: request.method(),
        url: request.url(),
        failure: request.failure()?.errorText || 'Unknown failure',
        timestamp: new Date().toISOString()
      };
      networkErrors.push(error);
      console.log(`🚨 Request Failed: ${request.method()} ${request.url()} - ${error.failure}`);
    });
    
    // Limpar arrays para cada teste
    networkErrors = [];
    allRequests = [];
  });

  test('PASSO 1: Verificar se admin panel carrega', async () => {
    console.log('\n🔍 PASSO 1: Verificando carregamento do admin panel...');
    
    try {
      await page.goto('http://localhost:3001', { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      // Verificar se a página carregou
      const title = await page.title();
      console.log(`📄 Título da página: ${title}`);
      
      // Capturar screenshot inicial
      await page.screenshot({ 
        path: 'admin-panel-diagnostics/01-initial-load.png',
        fullPage: true 
      });
      
      expect(title).toBeTruthy();
      console.log('✅ Admin panel carregou com sucesso');
      
    } catch (error) {
      console.error('❌ Erro ao carregar admin panel:', error.message);
      await page.screenshot({ 
        path: 'admin-panel-diagnostics/01-error-loading.png',
        fullPage: true 
      });
      throw error;
    }
  });

  test('PASSO 2: Fazer login e navegar até Instagram Config', async () => {
    console.log('\n🔍 PASSO 2: Fazendo login e navegando...');
    
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle' });
    
    // Fazer login
    await page.fill('input[name="email"], input[type="email"], input[placeholder*="email"], input[placeholder*="Email"]', 'admin@test.com');
    await page.fill('input[name="password"], input[type="password"], input[placeholder*="senha"]', 'admin123');
    await page.click('button[type="submit"], button:has-text("Entrar"), button:has-text("Login")');
    
    // Aguardar login e capturar screenshot
    await page.waitForTimeout(2000);
    await page.screenshot({ 
      path: 'admin-panel-diagnostics/02-after-login.png',
      fullPage: true 
    });
    
    // Tentar encontrar e clicar em Instagram Config
    console.log('🔍 Procurando por Instagram Config...');
    
    const instagramButtons = [
      'text=Instagram',
      'text=Instagram Config',
      'text=Configuração Instagram',
      'text=Instagram API',
      '[data-testid="instagram-config"]',
      'button:has-text("Instagram")',
      'a:has-text("Instagram")',
      'nav a:has-text("Instagram")'
    ];
    
    let instagramButtonFound = false;
    
    for (const selector of instagramButtons) {
      try {
        const element = await page.locator(selector).first();
        if (await element.isVisible()) {
          console.log(`✅ Encontrado botão Instagram: ${selector}`);
          await element.click();
          instagramButtonFound = true;
          break;
        }
      } catch (error) {
        console.log(`⚠️ Seletor não encontrado: ${selector}`);
      }
    }
    
    if (!instagramButtonFound) {
      console.log('🔍 Listando elementos visíveis para debug...');
      const visibleElements = await page.locator('button, a, [role="button"]').allTextContents();
      console.log('Elementos clicáveis visíveis:', visibleElements);
      
      await page.screenshot({ 
        path: 'admin-panel-diagnostics/02-no-instagram-button.png',
        fullPage: true 
      });
    }
    
    // Aguardar possíveis requisições
    await page.waitForTimeout(3000);
    
    await page.screenshot({ 
      path: 'admin-panel-diagnostics/02-after-navigation.png',
      fullPage: true 
    });
  });

  test('PASSO 3: Testar rotas diretamente via fetch', async () => {
    console.log('\n🔍 PASSO 3: Testando rotas diretamente...');
    
    await page.goto('http://localhost:3001');
    
    // Lista de rotas para testar
    const routesToTest = [
      '/api/admin/instagram/api-status',
      '/api/admin/instagram/config',
      '/api/admin/instagram/status',
      '/api/admin/instagram/health',
      '/api/admin/instagram/token/health'
    ];
    
    console.log('🔍 Testando rotas via JavaScript fetch...');
    
    for (const route of routesToTest) {
      try {
        console.log(`\n🧪 Testando: ${route}`);
        
        const result = await page.evaluate(async (testRoute) => {
          try {
            const response = await fetch(testRoute, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer mock-token' // Token mock para teste
              }
            });
            
            return {
              url: testRoute,
              status: response.status,
              statusText: response.statusText,
              ok: response.ok,
              headers: Object.fromEntries(response.headers.entries()),
              text: await response.text().catch(() => 'Could not read response body')
            };
          } catch (error) {
            return {
              url: testRoute,
              error: error.message,
              networkError: true
            };
          }
        }, route);
        
        console.log(`📊 Resultado para ${route}:`, JSON.stringify(result, null, 2));
        
      } catch (error) {
        console.error(`❌ Erro ao testar ${route}:`, error.message);
      }
    }
  });

  test('PASSO 4: Testar proxy configuration', async () => {
    console.log('\n🔍 PASSO 4: Verificando configuração do proxy...');
    
    await page.goto('http://localhost:3001');
    
    // Testar diferentes URLs de backend
    const backendUrls = [
      'http://localhost:3000',  // URL correta
      'http://localhost:3333',  // URL configurada no proxy (incorreta?)
      'http://localhost:3355'   // Outra porta possível
    ];
    
    for (const backendUrl of backendUrls) {
      console.log(`\n🧪 Testando backend: ${backendUrl}`);
      
      const result = await page.evaluate(async (url) => {
        try {
          const healthResponse = await fetch(`${url}/health`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          });
          
          return {
            url: url,
            healthCheck: {
              status: healthResponse.status,
              ok: healthResponse.ok,
              data: await healthResponse.text().catch(() => 'No response body')
            }
          };
        } catch (error) {
          return {
            url: url,
            error: error.message,
            networkError: true
          };
        }
      }, backendUrl);
      
      console.log(`📊 Backend ${backendUrl}:`, JSON.stringify(result, null, 2));
    }
  });

  test('RELATÓRIO FINAL: Análise completa', async () => {
    console.log('\n📋 RELATÓRIO FINAL DE DIAGNÓSTICO');
    console.log('=====================================');
    
    // Executar todos os testes anteriores para coletar dados
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle' });
    
    // Aguardar e coletar dados finais
    await page.waitForTimeout(5000);
    
    console.log('\n📊 RESUMO DOS ERROS DE REDE:');
    console.log(JSON.stringify(networkErrors, null, 2));
    
    console.log('\n📊 TODAS AS REQUISIÇÕES:');
    allRequests.forEach(req => {
      console.log(`${req.method} ${req.url} (${req.timestamp})`);
    });
    
    // Salvar relatório em arquivo
    const diagnosticReport = {
      timestamp: new Date().toISOString(),
      totalRequests: allRequests.length,
      networkErrors: networkErrors,
      allRequests: allRequests,
      analysis: {
        proxyMisconfiguration: networkErrors.some(err => err.url.includes('3333')),
        missingRoutes: networkErrors.filter(err => err.status === 404).length,
        serverErrors: networkErrors.filter(err => err.status >= 500).length,
        authErrors: networkErrors.filter(err => err.status === 401 || err.status === 403).length
      }
    };
    
    // Salvar no sistema de arquivos
    await page.evaluate((report) => {
      console.log('\n🔍 RELATÓRIO COMPLETO DE DIAGNÓSTICO:');
      console.log(JSON.stringify(report, null, 2));
    }, diagnosticReport);
    
    // Screenshot final
    await page.screenshot({ 
      path: 'admin-panel-diagnostics/99-final-state.png',
      fullPage: true 
    });
    
    console.log('\n✅ Diagnóstico completo! Verifique os logs acima para identificar a causa raiz.');
  });

  test.afterEach(async () => {
    if (page) await page.close();
  });
});