/**
 * Teste rápido para verificar se o Instagram Config foi corrigido
 */

const { test, expect } = require('@playwright/test');

test.setTimeout(60000);

test.describe('Instagram Config - Teste de Correção', () => {
  test('Verificar se Instagram Config aparece após correções', async ({ page }) => {
    console.log('🔧 Testando correções do Instagram Config...');
    
    // Capturar erros do console
    let consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
        console.log('[ERROR]', msg.text());
      }
    });

    // Navegar para o admin panel
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle' });
    
    // Fazer login
    await page.fill('input[type="email"], input[name="email"]', 'admin@teste.com');
    await page.fill('input[type="password"], input[name="password"]', '123456');
    await page.click('button[type="submit"], button:has-text("Entrar"), button:has-text("Login")');
    
    // Aguardar carregamento
    await page.waitForTimeout(3000);
    
    // Procurar botão Instagram
    const instagramButton = page.locator('button:has(svg[data-testid="InstagramIcon"])').first();
    await expect(instagramButton).toBeVisible();
    
    console.log('✅ Botão Instagram encontrado');
    
    // Clicar no botão Instagram
    await instagramButton.click();
    
    // Aguardar carregamento do componente
    await page.waitForTimeout(2000);
    
    // Capturar screenshot após clique
    await page.screenshot({ 
      path: 'test-instagram-fix-result.png',
      fullPage: true 
    });
    
    // Verificar se há conteúdo relacionado ao Instagram visível
    const instagramContent = await page.locator('div:has-text("Instagram"), div:has-text("API"), div:has-text("Configuração")').count();
    
    // Verificar se erros críticos foram reduzidos
    const maxUpdateDepthErrors = consoleErrors.filter(error => 
      error.includes('Maximum update depth exceeded')
    ).length;
    
    const htmlNestingErrors = consoleErrors.filter(error => 
      error.includes('cannot be a descendant of') || 
      error.includes('cannot contain a nested')
    ).length;
    
    console.log('📊 RESULTADOS:');
    console.log(`- Instagram content found: ${instagramContent > 0 ? '✅' : '❌'}`);
    console.log(`- Max update depth errors: ${maxUpdateDepthErrors} (antes: ~50+)`);
    console.log(`- HTML nesting errors: ${htmlNestingErrors} (antes: 2+)`);
    
    // Verificações de sucesso
    expect(instagramContent).toBeGreaterThan(0);
    expect(maxUpdateDepthErrors).toBeLessThan(10); // Deve ser dramaticamente reduzido
    expect(htmlNestingErrors).toBe(0); // Não deve haver erros HTML
    
    console.log('✅ Correções verificadas com sucesso!');
  });
});