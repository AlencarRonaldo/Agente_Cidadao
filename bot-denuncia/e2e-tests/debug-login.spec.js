/**
 * Teste de debug para verificar login
 */

import { test, expect } from '@playwright/test';

test.describe('Debug Login', () => {
  test('verificar página inicial e login', async ({ page }) => {
    console.log('🔍 Acessando página inicial...');
    
    // Ir para a página inicial
    await page.goto('/');
    
    // Aguardar carregamento
    await page.waitForLoadState('networkidle');
    
    // Debug: capturar conteúdo da página
    const title = await page.title();
    const content = await page.content();
    
    console.log('📄 Título da página:', title);
    console.log('📄 URL atual:', page.url());
    
    // Verificar se há elementos de login
    const emailInput = await page.locator('input[type="email"], [name="email"]').count();
    const passwordInput = await page.locator('input[type="password"], [name="password"], [name="senha"]').count();
    const submitButton = await page.locator('button[type="submit"], button:has-text("ACESSAR"), button:has-text("Login")').count();
    
    console.log('🔍 Campos encontrados:');
    console.log('  - Email inputs:', emailInput);
    console.log('  - Password inputs:', passwordInput);
    console.log('  - Submit buttons:', submitButton);
    
    // Listar todos os headings disponíveis
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').allTextContents();
    console.log('📋 Headings encontrados:', headings);
    
    // Listar todos os botões disponíveis
    const buttons = await page.locator('button').allTextContents();
    console.log('🔘 Botões encontrados:', buttons);
    
    // Tirar screenshot para debug
    await page.screenshot({ path: 'debug-login-page.png', fullPage: true });
    
    // Verificar se conseguimos fazer login
    if (emailInput > 0 && passwordInput > 0 && submitButton > 0) {
      console.log('✅ Elementos de login encontrados, tentando login...');
      
      await page.fill('input[type="email"], [name="email"]', 'admin@teste.com');
      await page.fill('input[type="password"], [name="password"], [name="senha"]', '123456');
      
      await page.screenshot({ path: 'debug-before-submit.png', fullPage: true });
      
      await page.click('button[type="submit"], button:has-text("ACESSAR"), button:has-text("Login")');
      
      // Aguardar resposta
      await page.waitForTimeout(3000);
      await page.waitForLoadState('networkidle');
      
      const finalUrl = page.url();
      const finalTitle = await page.title();
      
      console.log('🎯 URL após login:', finalUrl);
      console.log('🎯 Título após login:', finalTitle);
      
      await page.screenshot({ path: 'debug-after-submit.png', fullPage: true });
      
      // Verificar se houve redirecionamento, mudança de conteúdo ou indicação de sucesso
      const hasRedirected = finalUrl !== 'http://localhost:3007/';
      const hasDashboardElements = await page.locator('text=Dashboard').count() + await page.locator('text=Total de Denúncias').count() + await page.locator('text=Visão Geral').count();
      const hasErrorMessage = await page.locator('.MuiAlert-root').count() + await page.locator('[role="alert"]').count() + await page.locator('text=CREDENCIAIS').count();
      
      console.log('🔍 Verificações pós-login:');
      console.log('  - Redirecionado:', hasRedirected);
      console.log('  - Elementos dashboard:', hasDashboardElements);
      console.log('  - Mensagens de erro:', hasErrorMessage);
      
      // Considerar sucesso se houve redirecionamento OU se há elementos do dashboard
      const loginSuccess = hasRedirected || hasDashboardElements > 0;
      
      if (!loginSuccess && hasErrorMessage > 0) {
        throw new Error('Login falhou - credenciais incorretas ou erro de sistema');
      }
      
      expect(loginSuccess).toBeTruthy();
    } else {
      console.log('❌ Elementos de login não encontrados');
      
      // Salvar conteúdo HTML para análise
      require('fs').writeFileSync('debug-page-content.html', content);
      
      throw new Error('Elementos de login não encontrados na página');
    }
  });
});