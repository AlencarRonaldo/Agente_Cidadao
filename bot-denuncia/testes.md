// 🔍 SUÍTE COMPLETA DE TESTES PLAYWRIGHT - PAINEL ADMIN
// Foco: Botões não funcionando, Agenda não atualizando, Cards desatualizados

const { test, expect } = require('@playwright/test');

// 🎯 CONFIGURAÇÃO GLOBAL DE TESTES
test.describe('Painel Admin - Verificação Completa de Funcionalidades', () => {
  let page;
  
  test.beforeEach(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();
    
    // Interceptar todas as requisições para debugging
    page.on('request', request => {
      console.log(`🌐 REQUEST: ${request.method()} ${request.url()}`);
    });
    
    page.on('response', response => {
      console.log(`📨 RESPONSE: ${response.status()} ${response.url()}`);
    });
    
    page.on('console', msg => {
      console.log(`🖥️ CONSOLE: ${msg.text()}`);
    });
    
    // Login no painel admin
    await page.goto('/admin/login');
    await page.fill('[data-testid="username"]', 'admin@teste.com');
    await page.fill('[data-testid="password"]', 'senha123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/admin/dashboard');
  });

  // 🚨 TESTE CRÍTICO: Verificação de Botões de Ação
  test('Verificar Funcionamento de Todos os Botões de Ação', async () => {
    console.log('🔘 Testando botões de ação...');
    
    // Mapear todos os botões na página
    const actionButtons = await page.locator('button, [role="button"], .btn').all();
    const buttonResults = [];
    
    for (const button of actionButtons) {
      try {
        const buttonText = await button.textContent();
        const isVisible = await button.isVisible();
        const isEnabled = await button.isEnabled();
        
        if (isVisible && isEnabled) {
          console.log(`🔍 Testando botão: "${buttonText}"`);
          
          // Capturar estado antes do clique
          const beforeState = await page.evaluate(() => ({
            url: window.location.href,
            title: document.title,
            activeElements: document.activeElement?.tagName
          }));
          
          // Tentar clicar no botão
          await button.click({ timeout: 5000 });
          
          // Aguardar possíveis mudanças
          await page.waitForTimeout(2000);
          
          // Capturar estado após o clique
          const afterState = await page.evaluate(() => ({
            url: window.location.href,
            title: document.title,
            activeElements: document.activeElement?.tagName
          }));
          
          // Verificar se houve alguma resposta/mudança
          const hasResponse = beforeState.url !== afterState.url || 
                             beforeState.title !== afterState.title ||
                             await page.locator('.loading, .spinner, [data-loading]').count() > 0;
          
          buttonResults.push({
            text: buttonText,
            working: hasResponse,
            beforeState,
            afterState
          });
          
          console.log(`${hasResponse ? '✅' : '❌'} Botão "${buttonText}": ${hasResponse ? 'FUNCIONANDO' : 'SEM RESPOSTA'}`);
        }
      } catch (error) {
        console.log(`❌ Erro ao testar botão: ${error.message}`);
        buttonResults.push({
          text: buttonText || 'Botão sem texto',
          working: false,
          error: error.message
        });
      }
    }
    
    // Gerar relatório de botões problemáticos
    const brokenButtons = buttonResults.filter(btn => !btn.working);
    if (brokenButtons.length > 0) {
      console.log('🚨 BOTÕES PROBLEMÁTICOS ENCONTRADOS:');
      brokenButtons.forEach(btn => {
        console.log(`- "${btn.text}": ${btn.error || 'Sem resposta detectada'}`);
      });
    }
    
    // Assertion para falhar o teste se houver botões quebrados
    expect(brokenButtons.length).toBe(0);
  });

  // 📅 TESTE CRÍTICO: Verificação da Agenda de Postagens
  test('Verificar Atualização da Agenda de Postagens', async () => {
    console.log('📅 Testando agenda de postagens...');
    
    await page.goto('/admin/agenda');
    
    // Capturar estado inicial da agenda
    const initialAgendaState = await page.evaluate(() => {
      const agendaItems = Array.from(document.querySelectorAll('[data-agenda-item], .agenda-item, .post-item'));
      return {
        count: agendaItems.length,
        items: agendaItems.map(item => ({
          id: item.dataset.id || item.id,
          text: item.textContent?.trim(),
          classes: item.className
        }))
      };
    });
    
    console.log(`📊 Estado inicial da agenda: ${initialAgendaState.count} itens`);
    
    // Testar botão de atualização/refresh
    const refreshButton = page.locator('[data-testid="refresh-agenda"], .refresh-btn, [title*="atualizar" i]').first();
    if (await refreshButton.count() > 0) {
      console.log('🔄 Clicando em atualizar agenda...');
      await refreshButton.click();
      
      // Aguardar indicadores de loading
      await page.waitForSelector('.loading, .spinner, [data-loading]', { state: 'visible', timeout: 3000 }).catch(() => {
        console.log('⚠️ Nenhum indicador de loading detectado');
      });
      
      // Aguardar loading desaparecer
      await page.waitForSelector('.loading, .spinner, [data-loading]', { state: 'hidden', timeout: 10000 }).catch(() => {
        console.log('⚠️ Loading não desapareceu ou não existia');
      });
    }
    
    // Aguardar possível atualização automática
    await page.waitForTimeout(5000);
    
    // Capturar estado após atualização
    const updatedAgendaState = await page.evaluate(() => {
      const agendaItems = Array.from(document.querySelectorAll('[data-agenda-item], .agenda-item, .post-item'));
      return {
        count: agendaItems.length,
        items: agendaItems.map(item => ({
          id: item.dataset.id || item.id,
          text: item.textContent?.trim(),
          classes: item.className
        }))
      };
    });
    
    console.log(`📊 Estado após atualização: ${updatedAgendaState.count} itens`);
    
    // Verificar se houve atualização
    const wasUpdated = JSON.stringify(initialAgendaState) !== JSON.stringify(updatedAgendaState);
    console.log(`${wasUpdated ? '✅' : '❌'} Agenda ${wasUpdated ? 'ATUALIZOU' : 'NÃO ATUALIZOU'}`);
    
    // Testar auto-refresh se configurado
    console.log('⏰ Aguardando auto-refresh (30 segundos)...');
    await page.waitForTimeout(30000);
    
    const autoRefreshState = await page.evaluate(() => {
      const agendaItems = Array.from(document.querySelectorAll('[data-agenda-item], .agenda-item, .post-item'));
      return {
        count: agendaItems.length,
        lastUpdate: document.querySelector('[data-last-update]')?.textContent || 'N/A'
      };
    });
    
    console.log(`📊 Estado após auto-refresh: ${autoRefreshState.count} itens`);
    console.log(`🕐 Última atualização: ${autoRefreshState.lastUpdate}`);
    
    // Verificar se existe mecanismo de auto-refresh
    const hasAutoRefresh = JSON.stringify(updatedAgendaState) !== JSON.stringify(autoRefreshState);
    console.log(`${hasAutoRefresh ? '✅' : '⚠️'} Auto-refresh ${hasAutoRefresh ? 'FUNCIONANDO' : 'NÃO DETECTADO'}`);
  });

  // 📊 TESTE CRÍTICO: Verificação de Cards e Métricas
  test('Verificar Atualização de Cards e Métricas', async () => {
    console.log('📊 Testando cards e métricas...');
    
    await page.goto('/admin/dashboard');
    
    // Identificar todos os cards de métricas
    const metricCards = await page.locator('.card, .metric-card, [data-metric], .dashboard-card').all();
    const cardResults = [];
    
    for (let i = 0; i < metricCards.length; i++) {
      try {
        const card = metricCards[i];
        const cardTitle = await card.locator('h1, h2, h3, h4, .title, .card-title').first().textContent().catch(() => `Card ${i + 1}`);
        const initialValue = await card.locator('.value, .number, .count').first().textContent().catch(() => 'N/A');
        
        console.log(`📋 Testando card: "${cardTitle}" - Valor inicial: ${initialValue}`);
        
        // Capturar timestamp se existir
        const timestamp = await card.locator('.timestamp, .last-update, [data-timestamp]').first().textContent().catch(() => null);
        
        cardResults.push({
          title: cardTitle,
          initialValue: initialValue,
          timestamp: timestamp,
          element: card
        });
        
      } catch (error) {
        console.log(`❌ Erro ao analisar card ${i + 1}: ${error.message}`);
      }
    }
    
    console.log(`📊 Total de cards encontrados: ${cardResults.length}`);
    
    // Aguardar um período para verificar auto-atualização
    console.log('⏰ Aguardando possível auto-atualização dos cards...');
    await page.waitForTimeout(15000);
    
    // Verificar se cards atualizaram
    for (const cardResult of cardResults) {
      try {
        const newValue = await cardResult.element.locator('.value, .number, .count').first().textContent().catch(() => 'N/A');
        const newTimestamp = await cardResult.element.locator('.timestamp, .last-update, [data-timestamp]').first().textContent().catch(() => null);
        
        const valueChanged = cardResult.initialValue !== newValue;
        const timestampChanged = cardResult.timestamp !== newTimestamp;
        const updated = valueChanged || timestampChanged;
        
        console.log(`${updated ? '✅' : '❌'} Card "${cardResult.title}": ${updated ? 'ATUALIZADO' : 'SEM ATUALIZAÇÃO'}`);
        
        if (updated) {
          console.log(`  📈 Valor: ${cardResult.initialValue} → ${newValue}`);
          if (timestampChanged) {
            console.log(`  🕐 Timestamp: ${cardResult.timestamp} → ${newTimestamp}`);
          }
        }
        
        cardResult.updated = updated;
        cardResult.newValue = newValue;
        cardResult.newTimestamp = newTimestamp;
        
      } catch (error) {
        console.log(`❌ Erro ao verificar atualização do card "${cardResult.title}": ${error.message}`);
        cardResult.updated = false;
        cardResult.error = error.message;
      }
    }
    
    // Gerar relatório de cards problemáticos
    const staleCards = cardResults.filter(card => !card.updated && !card.error);
    if (staleCards.length > 0) {
      console.log('🚨 CARDS SEM ATUALIZAÇÃO:');
      staleCards.forEach(card => {
        console.log(`- "${card.title}": Valor mantido em "${card.initialValue}"`);
      });
    }
  });

  // 🔄 TESTE DE FLUXO COMPLETO: Aprovação → Postagem → Agenda
  test('Verificar Fluxo Completo: Aprovação até Agenda', async () => {
    console.log('🔄 Testando fluxo completo...');
    
    // 1. Ir para lista de denúncias pendentes
    await page.goto('/admin/denuncias/pendentes');
    
    // 2. Encontrar uma denúncia para aprovar
    const pendingItem = page.locator('[data-status="pending"], .pending-item').first();
    
    if (await pendingItem.count() === 0) {
      console.log('⚠️ Nenhuma denúncia pendente encontrada para teste');
      return;
    }
    
    const denunciaId = await pendingItem.getAttribute('data-id') || 'unknown';
    console.log(`📝 Testando denúncia ID: ${denunciaId}`);
    
    // 3. Aprovar a denúncia
    const approveButton = pendingItem.locator('[data-action="approve"], .approve-btn').first();
    await approveButton.click();
    
    // Aguardar confirmação de aprovação
    await page.waitForSelector('.success-message, .alert-success', { timeout: 10000 });
    console.log('✅ Denúncia aprovada com sucesso');
    
    // 4. Verificar se apareceu na agenda
    await page.goto('/admin/agenda');
    await page.waitForTimeout(5000); // Aguardar carregamento
    
    const agendaItem = page.locator(`[data-denuncia-id="${denunciaId}"], [data-id="${denunciaId}"]`).first();
    const isInAgenda = await agendaItem.count() > 0;
    
    console.log(`${isInAgenda ? '✅' : '❌'} Item ${isInAgenda ? 'ENCONTRADO' : 'NÃO ENCONTRADO'} na agenda`);
    
    // 5. Verificar se metrics atualizaram
    await page.goto('/admin/dashboard');
    await page.waitForTimeout(3000);
    
    const metrics = await page.evaluate(() => {
      return {
        pendentes: document.querySelector('[data-metric="pending"]')?.textContent || '0',
        agenda: document.querySelector('[data-metric="scheduled"]')?.textContent || '0',
        aprovadas: document.querySelector('[data-metric="approved"]')?.textContent || '0'
      };
    });
    
    console.log('📊 Métricas atuais:', metrics);
    
    expect(isInAgenda).toBe(true);
  });

  // 🌐 TESTE DE REQUISIÇÕES E APIS
  test('Verificar Chamadas de API e Responses', async () => {
    console.log('🌐 Testando APIs e requisições...');
    
    const apiCalls = [];
    const failedRequests = [];
    
    // Interceptar todas as requisições
    page.on('response', response => {
      const url = response.url();
      const status = response.status();
      
      if (url.includes('/api/')) {
        apiCalls.push({
          url: url,
          status: status,
          method: response.request().method(),
          timestamp: new Date().toISOString()
        });
        
        if (status >= 400) {
          failedRequests.push({
            url: url,
            status: status,
            method: response.request().method()
          });
        }
      }
    });
    
    // Navegar pelas principais páginas para gerar requisições
    const pages = ['/admin/dashboard', '/admin/denuncias', '/admin/agenda', '/admin/configuracoes'];
    
    for (const pagePath of pages) {
      console.log(`🔍 Navegando para: ${pagePath}`);
      await page.goto(pagePath);
      await page.waitForTimeout(5000); // Aguardar requisições
    }
    
    console.log(`📡 Total de chamadas API: ${apiCalls.length}`);
    console.log(`❌ Requisições com falha: ${failedRequests.length}`);
    
    if (failedRequests.length > 0) {
      console.log('🚨 REQUISIÇÕES COM FALHA:');
      failedRequests.forEach(req => {
        console.log(`- ${req.method} ${req.url} → Status ${req.status}`);
      });
    }
    
    // Verificar APIs específicas críticas
    const criticalAPIs = [
      '/api/denuncias',
      '/api/agenda',
      '/api/dashboard/metrics',
      '/api/instagram/status'
    ];
    
    const missingAPIs = criticalAPIs.filter(api => 
      !apiCalls.some(call => call.url.includes(api))
    );
    
    if (missingAPIs.length > 0) {
      console.log('⚠️ APIs CRÍTICAS NÃO CHAMADAS:');
      missingAPIs.forEach(api => console.log(`- ${api}`));
    }
    
    expect(failedRequests.length).toBe(0);
  });

  // 📱 TESTE DE RESPONSIVIDADE E ELEMENTOS VISUAIS
  test('Verificar Elementos Visuais e Estados de Loading', async () => {
    console.log('📱 Testando elementos visuais...');
    
    await page.goto('/admin/dashboard');
    
    // Verificar se existem indicadores de loading
    const loadingElements = await page.locator('.loading, .spinner, .skeleton, [data-loading]').count();
    console.log(`⏳ Elementos de loading encontrados: ${loadingElements}`);
    
    // Verificar se há elementos quebrados/vazios
    const emptyCards = await page.locator('.card:empty, .metric-card:empty').count();
    console.log(`🔲 Cards vazios encontrados: ${emptyCards}`);
    
    // Verificar se há imagens quebradas
    const brokenImages = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img'));
      return images.filter(img => !img.complete || img.naturalWidth === 0).length;
    });
    console.log(`🖼️ Imagens quebradas: ${brokenImages}`);
    
    // Verificar se há erros de console JavaScript
    const jsErrors = [];
    page.on('pageerror', error => {
      jsErrors.push(error.message);
    });
    
    await page.waitForTimeout(5000);
    
    if (jsErrors.length > 0) {
      console.log('🚨 ERROS JAVASCRIPT DETECTADOS:');
      jsErrors.forEach(error => console.log(`- ${error}`));
    }
    
    expect(emptyCards).toBe(0);
    expect(brokenImages).toBe(0);
    expect(jsErrors.length).toBe(0);
  });

  // 📊 RELATÓRIO FINAL DE SAÚDE DO SISTEMA
  test('Gerar Relatório de Saúde do Sistema', async () => {
    console.log('📊 Gerando relatório de saúde...');
    
    const healthReport = {
      timestamp: new Date().toISOString(),
      pages_tested: [],
      critical_issues: [],
      warnings: [],
      performance: {}
    };
    
    const pages = [
      { path: '/admin/dashboard', name: 'Dashboard' },
      { path: '/admin/denuncias', name: 'Denúncias' },
      { path: '/admin/agenda', name: 'Agenda' },
      { path: '/admin/configuracoes', name: 'Configurações' }
    ];
    
    for (const pageInfo of pages) {
      console.log(`🔍 Analisando saúde da página: ${pageInfo.name}`);
      
      const startTime = Date.now();
      await page.goto(pageInfo.path);
      
      // Aguardar carregamento completo
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      
      // Verificar elementos essenciais
      const hasTitle = await page.locator('h1, h2, .page-title').count() > 0;
      const hasContent = await page.locator('.content, .main-content, .page-content').count() > 0;
      const hasNavigation = await page.locator('nav, .nav, .navigation').count() > 0;
      
      // Verificar se há elementos de erro
      const hasErrors = await page.locator('.error, .alert-danger, .error-message').count() > 0;
      
      const pageHealth = {
        name: pageInfo.name,
        path: pageInfo.path,
        load_time: loadTime,
        has_title: hasTitle,
        has_content: hasContent,
        has_navigation: hasNavigation,
        has_errors: hasErrors,
        status: hasTitle && hasContent && !hasErrors ? 'healthy' : 'issues'
      };
      
      healthReport.pages_tested.push(pageHealth);
      
      if (pageHealth.status === 'issues') {
        healthReport.critical_issues.push(`Página ${pageInfo.name} tem problemas estruturais`);
      }
      
      if (loadTime > 5000) {
        healthReport.warnings.push(`Página ${pageInfo.name} carrega lentamente (${loadTime}ms)`);
      }
      
      console.log(`${pageHealth.status === 'healthy' ? '✅' : '❌'} ${pageInfo.name}: ${pageHealth.status} (${loadTime}ms)`);
    }
    
    // Calcular métricas gerais
    const healthyPages = healthReport.pages_tested.filter(p => p.status === 'healthy').length;
    const totalPages = healthReport.pages_tested.length;
    const healthPercentage = Math.round((healthyPages / totalPages) * 100);
    
    healthReport.performance = {
      total_pages: totalPages,
      healthy_pages: healthyPages,
      health_percentage: healthPercentage,
      average_load_time: Math.round(healthReport.pages_tested.reduce((sum, p) => sum + p.load_time, 0) / totalPages)
    };
    
    console.log('\n📊 RELATÓRIO FINAL DE SAÚDE:');
    console.log(`🎯 Saúde geral: ${healthPercentage}%`);
    console.log(`⏱️ Tempo médio de carregamento: ${healthReport.performance.average_load_time}ms`);
    console.log(`🚨 Problemas críticos: ${healthReport.critical_issues.length}`);
    console.log(`⚠️ Avisos: ${healthReport.warnings.length}`);
    
    if (healthReport.critical_issues.length > 0) {
      console.log('\n🚨 PROBLEMAS CRÍTICOS:');
      healthReport.critical_issues.forEach(issue => console.log(`- ${issue}`));
    }
    
    if (healthReport.warnings.length > 0) {
      console.log('\n⚠️ AVISOS:');
      healthReport.warnings.forEach(warning => console.log(`- ${warning}`));
    }
    
    // Salvar relatório em arquivo
    const fs = require('fs');
    fs.writeFileSync('admin-health-report.json', JSON.stringify(healthReport, null, 2));
    console.log('\n📁 Relatório salvo em: admin-health-report.json');
    
    // Assertion para falhar se há muitos problemas
    expect(healthPercentage).toBeGreaterThan(70);
  });
});

// 🛠️ UTILITÁRIOS DE TESTE
class AdminPanelTestUtils {
  static async waitForElementToUpdate(page, selector, timeout = 10000) {
    const initialContent = await page.locator(selector).textContent().catch(() => '');
    
    await page.waitForFunction(
      (sel, initial) => {
        const element = document.querySelector(sel);
        return element && element.textContent !== initial;
      },
      [selector, initialContent],
      { timeout }
    );
  }
  
  static async captureNetworkActivity(page, duration = 30000) {
    const requests = [];
    const responses = [];
    
    page.on('request', req => requests.push({
      url: req.url(),
      method: req.method(),
      timestamp: Date.now()
    }));
    
    page.on('response', res => responses.push({
      url: res.url(),
      status: res.status(),
      timestamp: Date.now()
    }));
    
    await page.waitForTimeout(duration);
    
    return { requests, responses };
  }
  
  static async checkElementInteractivity(page, selector) {
    const element = page.locator(selector);
    
    return {
      exists: await element.count() > 0,
      visible: await element.isVisible().catch(() => false),
      enabled: await element.isEnabled().catch(() => false),
      clickable: await element.isEnabled().catch(() => false) && await element.isVisible().catch(() => false)
    };
  }
}

// 📝 CONFIGURAÇÃO DO TESTE
module.exports = {
  use: {
    headless: false, // Para visualizar os testes
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure'
  },
  timeout: 60000,
  expect: {
    timeout: 10000
  },
  projects: [
    {
      name: 'Chrome',
      use: { ...require('@playwright/test').devices['Desktop Chrome'] }
    }
  ]
};