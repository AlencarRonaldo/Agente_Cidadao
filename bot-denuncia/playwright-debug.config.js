/**
 * Configuração simplificada do Playwright para debug
 */

const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './',
  testMatch: ['**/debug-instagram-config.spec.js', '**/test-instagram-fix.spec.js'],
  
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  
  reporter: [
    ['html', { outputFolder: 'test-results/debug-instagram/' }],
    ['json', { outputFile: 'test-results/debug-instagram/results.json' }],
    ['list']
  ],
  
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
    video: 'on',
    screenshot: 'only-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 30000,
    testTimeout: 120000,
    ignoreHTTPSErrors: true
  },
  
  projects: [
    {
      name: 'Desktop Chrome',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 }
      }
    }
  ],
  
  outputDir: 'test-results/debug-instagram/',
  
  metadata: {
    project: 'Instagram Config Debug',
    version: '1.0.0'
  }
});