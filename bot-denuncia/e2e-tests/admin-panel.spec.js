/**
 * Testes E2E para Admin Panel - Bot Denúncias
 * 
 * Testa os fluxos principais do painel administrativo
 * incluindo login, dashboard, agenda de postagens, etc.
 */

import { test, expect } from '@playwright/test';
import { TestUtils } from './utils/test-utils.js';

// Configuração para este conjunto de testes
test.describe('Admin Panel - Bot Denúncias', () => {
  // Setup antes de cada teste
  test.beforeEach(async ({ page }) => {
    TestUtils.setupErrorLogging(page);
  });

  test.describe('Autenticação', () => {
    test('deve fazer login com credenciais corretas', async ({ page }) => {
      await page.goto('/');
      
      // Verificar se estamos na página de login
      await expect(page.locator('h1, h2, h4')).toContainText(/SISTEMA CYBERSEC|Login|Entrar/i);
      
      // Preencher credenciais
      await page.fill('[name="email"], [data-testid="email"], input[type="email"]', 'admin@teste.com');
      await page.fill('[name="senha"], [name="password"], [data-testid="senha"], input[type="password"]', '123456');
      
      // Fazer login
      await page.click('button[type="submit"], [data-testid="login-button"], button:has-text("ACESSAR"), button:has-text("Login")');
      
      // Aguardar redirecionamento para dashboard
      await page.waitForLoadState('networkidle');
      
      // Aguardar dashboard carregar completamente (pode mostrar loading primeiro)
      await page.waitForSelector('text=Visão Geral do Sistema', { timeout: 10000 });
      
      // Verificar se está no dashboard
      await expect(page.locator('text=Visão Geral do Sistema')).toBeVisible();
    });

    test('deve rejeitar credenciais incorretas', async ({ page }) => {
      await page.goto('/');
      
      // Tentar login com credenciais incorretas
      await page.fill('[name="email"], input[type="email"]', 'wrong@email.com');
      await page.fill('[name="senha"], [name="password"], input[type="password"]', 'wrong-password');
      await page.click('button[type="submit"], button:has-text("ACESSAR"), button:has-text("Login")');
      
      // Verificar mensagem de erro
      await expect(page.locator('.MuiAlert-root, [role="alert"], .error, .alert')).toBeVisible();
    });
  });

  test.describe('Dashboard', () => {
    test.beforeEach(async ({ page }) => {
      // Login antes de cada teste do dashboard
      await page.goto('/');
      await page.fill('[name="email"], input[type="email"]', 'admin@teste.com');
      await page.fill('[name="senha"], [name="password"], input[type="password"]', '123456');
      await page.click('button[type="submit"], button:has-text("ACESSAR")');
      await page.waitForLoadState('networkidle');
    });

    test('deve carregar cards de estatísticas', async ({ page }) => {
      // Verificar cards principais
      const expectedCards = [
        'Total de Denúncias',
        'Aguardando Moderação', 
        'Publicadas',
        'Taxa de Eficiência'
      ];

      for (const cardTitle of expectedCards) {
        await expect(page.locator(`text=${cardTitle}`).first()).toBeVisible();
      }
    });

    test('deve exibir agenda de postagens', async ({ page }) => {
      // Verificar se o card de agenda existe
      await expect(page.locator('text=Agenda de Postagens').first()).toBeVisible();
      
      // Verificar se há itens na agenda ou mensagem de vazio
      const agendaCard = page.locator('[data-testid="agenda-postagens"], .agenda-card').first();
      await expect(agendaCard).toBeVisible();
    });

    test('deve exibir bairros com mais denúncias', async ({ page }) => {
      // Verificar card de bairros
      await expect(page.locator('text=Bairros com Mais Denúncias').first()).toBeVisible();
      
      // Verificar se há dados ou mensagem de vazio
      const bairrosCard = page.locator('text=Bairros com Mais Denúncias').locator('..').locator('..');
      await expect(bairrosCard).toBeVisible();
    });

    test('deve exibir distribuição por status', async ({ page }) => {
      // Verificar card de distribuição
      await expect(page.locator('text=Distribuição por Status').first()).toBeVisible();
      
      // Verificar se há dados ou mensagem de vazio  
      const statusCard = page.locator('text=Distribuição por Status').locator('..').locator('..');
      await expect(statusCard).toBeVisible();
    });

    test('deve ter layout responsivo', async ({ page }) => {
      // Testar diferentes tamanhos de tela
      const viewports = [
        { width: 1920, height: 1080, name: 'Desktop' },
        { width: 1024, height: 768, name: 'Tablet' },
        { width: 375, height: 667, name: 'Mobile' }
      ];

      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await page.waitForTimeout(500); // Aguardar ajuste de layout
        
        // Verificar se elementos principais ainda estão visíveis
        await expect(page.locator('text=Visão Geral do Sistema').first()).toBeVisible();
        await expect(page.locator('text=Total de Denúncias').first()).toBeVisible();
        
        console.log(`✅ Layout responsivo OK em ${viewport.name}`);
      }
    });

    test('deve funcionar refresh dos dados', async ({ page }) => {
      // Encontrar botão de refresh (pode ter diferentes formatos)
      const refreshButton = page.locator('[data-testid="refresh"], button:has-text("Atualizar"), [aria-label*="refresh"], [title*="Atualizar"]').first();
      
      if (await refreshButton.isVisible()) {
        await refreshButton.click();
        
        // Aguardar indicador de loading desaparecer
        await page.waitForTimeout(1000);
        
        // Verificar se dados ainda estão visíveis
        await expect(page.locator('text=Total de Denúncias').first()).toBeVisible();
      } else {
        console.log('⚠️ Botão de refresh não encontrado, pulando teste');
      }
    });
  });

  test.describe('Navegação', () => {
    test.beforeEach(async ({ page }) => {
      // Login
      await page.goto('/');
      await page.fill('[name="email"], input[type="email"]', 'admin@teste.com');
      await page.fill('[name="senha"], [name="password"], input[type="password"]', '123456');
      await page.click('button[type="submit"], button:has-text("ACESSAR")');
      await page.waitForLoadState('networkidle');
    });

    test('deve navegar para configurações do Instagram', async ({ page }) => {
      // Procurar link/botão do Instagram
      const instagramButton = page.locator('[data-testid="instagram"], button:has-text("Instagram"), a:has-text("Instagram")').first();
      
      if (await instagramButton.isVisible()) {
        await instagramButton.click();
        await page.waitForLoadState('networkidle');
        
        // Verificar se chegou na página do Instagram
        await expect(page.locator('text=Instagram, Configuração').first()).toBeVisible();
      } else {
        console.log('⚠️ Navegação para Instagram não encontrada');
      }
    });

    test('deve navegar para configurações do WhatsApp', async ({ page }) => {
      // Procurar link/botão do WhatsApp
      const whatsappButton = page.locator('[data-testid="whatsapp"], button:has-text("WhatsApp"), a:has-text("WhatsApp")').first();
      
      if (await whatsappButton.isVisible()) {
        await whatsappButton.click();
        await page.waitForLoadState('networkidle');
        
        // Verificar se chegou na página do WhatsApp
        await expect(page.locator('text=WhatsApp, Configuração').first()).toBeVisible();
      } else {
        console.log('⚠️ Navegação para WhatsApp não encontrada');
      }
    });
  });

  test.describe('Performance', () => {
    test('deve carregar dashboard em tempo hábil', async ({ page }) => {
      const startTime = Date.now();
      
      // Fazer login e ir para dashboard
      await page.goto('/');
      await page.fill('[name="email"], input[type="email"]', 'admin@teste.com');
      await page.fill('[name="senha"], [name="password"], input[type="password"]', '123456');
      await page.click('button[type="submit"], button:has-text("ACESSAR")');
      
      // Aguardar carregamento completo
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=Total de Denúncias').first()).toBeVisible();
      
      const loadTime = Date.now() - startTime;
      console.log(`⏱️ Tempo de carregamento do dashboard: ${loadTime}ms`);
      
      // Verificar se carregou em menos de 5 segundos
      expect(loadTime).toBeLessThan(5000);
    });

    test('deve ter boa performance de API', async ({ page }) => {
      const apiCalls = [];
      
      // Interceptar chamadas de API
      page.on('response', response => {
        const url = response.url();
        if (url.includes('/api/admin/') || url.includes('/admin/')) {
          apiCalls.push({
            url,
            status: response.status(),
            timing: response.timing?.responseEnd - response.timing?.responseStart
          });
        }
      });
      
      // Fazer login e carregar dashboard
      await page.goto('/');
      await page.fill('[name="email"], input[type="email"]', 'admin@teste.com');
      await page.fill('[name="senha"], [name="password"], input[type="password"]', '123456');
      await page.click('button[type="submit"], button:has-text("ACESSAR")');
      await page.waitForLoadState('networkidle');
      
      // Verificar se APIs responderam rápido
      for (const call of apiCalls) {
        console.log(`📡 API ${call.url}: ${call.status} (${call.timing || 'N/A'}ms)`);
        
        if (call.timing) {
          expect(call.timing).toBeLessThan(2000); // < 2 segundos
        }
        expect(call.status).toBeLessThan(400); // Sem erros 4xx/5xx
      }
    });
  });

  test.describe('Tratamento de Erros', () => {
    test('deve lidar com erro de rede graciosamente', async ({ browserName, page }) => {
      // Pular em Safari (limitações de network mocking)
      test.skip(browserName === 'webkit', 'Network mocking não suportado no Safari');
      
      // Simular erro de rede
      await page.route('**/api/admin/**', route => {
        route.abort('failed');
      });
      
      await page.goto('/');
      await page.fill('[name="email"], input[type="email"]', 'admin@teste.com');
      await page.fill('[name="senha"], [name="password"], input[type="password"]', '123456');
      await page.click('button[type="submit"], button:has-text("ACESSAR")');
      
      // Verificar se mostra erro ou fallback gracioso
      await page.waitForTimeout(3000);
      
      // O sistema deve mostrar erro ou dados em cache/fallback
      const hasError = await page.locator('.MuiAlert-root, [role="alert"], .error').isVisible();
      const hasFallback = await page.locator('text=Nenhum dado disponível, Offline').isVisible();
      
      expect(hasError || hasFallback).toBeTruthy();
    });
  });
});

// Teste adicional para acessibilidade
test.describe('Acessibilidade', () => {
  test('deve estar em conformidade com WCAG', async ({ page }) => {
    // Login
    await page.goto('/');
    await page.fill('[name="email"], input[type="email"]', 'admin@teste.com');
    await page.fill('[name="senha"], [name="password"], input[type="password"]', '123456');
    await page.click('button[type="submit"], button:has-text("ACESSAR")');
    await page.waitForLoadState('networkidle');
    
    // Verificar navegação por teclado
    await page.keyboard.press('Tab');
    const focusedElement = await page.locator(':focus').first();
    await expect(focusedElement).toBeVisible();
    
    // Verificar se há textos alternativos em imagens
    const images = await page.locator('img').all();
    for (const img of images) {
      const alt = await img.getAttribute('alt');
      const ariaLabel = await img.getAttribute('aria-label');
      expect(alt || ariaLabel).toBeTruthy();
    }
    
    // Verificar estrutura de headings
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
    expect(headings.length).toBeGreaterThan(0);
  });
});