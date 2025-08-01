const { test, expect } = require('@playwright/test');

test('Debug login issue', async ({ page }) => {
  // Navegar para a página
  await page.goto('http://localhost:3007');
  
  // Aguardar carregar
  await page.waitForTimeout(3000);
  
  // Capturar screenshot inicial
  await page.screenshot({ path: 'debug-initial-page.png', fullPage: true });
  
  // Verificar se existem inputs de login
  const emailInput = page.locator('input[type="email"], input[placeholder*="Email"], input[name="email"]');
  const passwordInput = page.locator('input[type="password"], input[placeholder*="Senha"], input[name="password"]');
  
  console.log('Email inputs found:', await emailInput.count());
  console.log('Password inputs found:', await passwordInput.count());
  
  // Tentar diferentes credenciais
  const credentials = [
    { email: 'admin@teste.com', password: 'Admin123!' },
    { email: 'admin@admin.com', password: 'admin123' },
    { email: 'admin', password: 'admin123' },
    { email: 'admin@teste.com', password: 'admin123' }
  ];
  
  for (let i = 0; i < credentials.length; i++) {
    const cred = credentials[i];
    console.log(`\n🔍 Tentativa ${i + 1}: ${cred.email} / ${cred.password}`);
    
    // Limpar campos
    await emailInput.first().clear();
    await passwordInput.first().clear();
    
    // Preencher
    await emailInput.first().fill(cred.email);
    await passwordInput.first().fill(cred.password);
    
    // Capturar screenshot antes do clique
    await page.screenshot({ path: `debug-before-login-${i}.png` });
    
    // Clicar no botão de login
    await page.click('button:has-text("ACESSAR SISTEMA")');
    
    // Aguardar resposta
    await page.waitForTimeout(5000);
    
    // Capturar screenshot após login
    await page.screenshot({ path: `debug-after-login-${i}.png` });
    
    // Verificar URL
    const currentUrl = page.url();
    console.log(`URL após login: ${currentUrl}`);
    
    // Verificar se há mensagem de erro
    const errorMessage = await page.locator('div[role="alert"], .alert, .error').textContent().catch(() => '');
    console.log(`Mensagem de erro: ${errorMessage}`);
    
    // Se conseguiu logar (URL mudou), parar
    if (!currentUrl.endsWith('localhost:3007/')) {
      console.log('✅ Login bem-sucedido!');
      break;
    }
    
    // Aguardar antes da próxima tentativa
    await page.waitForTimeout(2000);
  }
  
  // Screenshot final
  await page.screenshot({ path: 'debug-final-login-attempt.png', fullPage: true });
});