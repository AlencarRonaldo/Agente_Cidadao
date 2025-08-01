import { test, expect } from '@playwright/test';

test.describe('Performance Tests', () => {
  test('deve ter boa performance', async ({ page }) => {
    // Começar a medir performance
    await page.goto('/', { waitUntil: 'networkidle' });
    
    // Medir Core Web Vitals
    const vitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        const vitals = {};
        
        // LCP (Largest Contentful Paint)
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          if (entries.length > 0) {
            vitals.lcp = entries[entries.length - 1].startTime;
          }
        }).observe({ entryTypes: ['largest-contentful-paint'] });
        
        // Resolver após 2 segundos
        setTimeout(() => resolve(vitals), 2000);
      });
    });
    
    // Verificar se LCP está dentro do limite (2.5s = 2500ms)
    if (vitals.lcp) {
      expect(vitals.lcp).toBeLessThan(2500);
      console.log(`LCP: ${vitals.lcp}ms`);
    }
  });
});
