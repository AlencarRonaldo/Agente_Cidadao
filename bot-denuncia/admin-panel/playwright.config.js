/**
 * Playwright Configuration - Bot Denúncias Admin Panel
 * 
 * Configuração para testes E2E, performance e acessibilidade
 * do admin panel do sistema de denúncias cidadãs
 */

const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  // Diretório dos testes
  testDir: './e2e-tests',
  
  // Timeout padrão para testes
  timeout: 30 * 1000,
  
  // Timeout para expect
  expect: {
    timeout: 5000,
  },
  
  // Configuração de retry
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter de resultados
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }]
  ],
  
  // Configurações globais
  use: {
    // URL base do admin panel
    baseURL: 'http://localhost:3007',
    
    // Configurações de trace
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // Timeout de navegação
    navigationTimeout: 15 * 1000,
    actionTimeout: 10 * 1000,
  },

  // Projetos/browsers para testar
  projects: [
    // Desktop browsers
    {
      name: 'Desktop Chrome',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 }
      },
    },
    {
      name: 'Desktop Firefox',
      use: { 
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 }
      },
    },
    {
      name: 'Desktop Safari',
      use: { 
        ...devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 }
      },
    },
    
    // Mobile devices
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 13'] },
    },
    
    // Tablet
    {
      name: 'Tablet',
      use: { 
        ...devices['iPad Pro'],
        viewport: { width: 1024, height: 768 }
      },
    },
  ],

  // Servidor local (para desenvolvimento)
  webServer: {
    command: 'npm start',
    port: 3007,
    reuseExistingServer: !process.env.CI,
    timeout: 60 * 1000,
  },
  
  // Configurações específicas do projeto
  globalSetup: require.resolve('./e2e-tests/global-setup.js'),
  globalTeardown: require.resolve('./e2e-tests/global-teardown.js'),
});