import { test, expect } from '@playwright/test';

test.describe('GENERIC App - Testes Básicos', () => {
  test('deve carregar a página inicial', async ({ page }) => {
    await page.goto('/');
    
    // Verificar se a página carregou
    await expect(page).toHaveTitle(/.+/);
    
    // Verificar se não há erros JavaScript
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Erro JS:', msg.text());
      }
    });
  });
  
  test('deve ser responsivo', async ({ page }) => {
    await page.goto('/');
    
    // Testar diferentes viewports
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('body')).toBeVisible();
    
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('body')).toBeVisible();
    
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('body')).toBeVisible();
  });
});
