/**
 * Utilitários para testes E2E
 */

export class TestUtils {
  /**
   * Aguardar elemento aparecer
   */
  static async waitForElement(page, selector, timeout = 5000) {
    await page.waitForSelector(selector, { timeout });
  }
  
  /**
   * Fazer login (exemplo genérico)
   */
  static async login(page, email = 'test@example.com', password = 'password') {
    await page.fill('[data-testid="email"], [name="email"], #email', email);
    await page.fill('[data-testid="password"], [name="password"], #password', password);
    await page.click('[data-testid="login"], [type="submit"], button:has-text("Login")');
  }
  
  /**
   * Tirar screenshot com nome personalizado
   */
  static async screenshot(page, name) {
    await page.screenshot({ path: `test-results/screenshots/${name}-${Date.now()}.png` });
  }
  
  /**
   * Verificar se não há erros JavaScript
   */
  static setupErrorLogging(page) {
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('🐛 Erro JS:', msg.text());
      }
    });
    
    page.on('pageerror', error => {
      console.log('🐛 Erro de página:', error.message);
    });
  }
}
