/**
 * Playwright Universal Configuration
 * 
 * Configuração genérica e reutilizável para qualquer projeto
 * Suporta diferentes tipos de aplicação e ambientes
 * 
 * @author Claude Code
 * @version 1.0.0
 */

const { defineConfig, devices } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

// Carregar variáveis de ambiente do arquivo .env.playwright
const envPath = path.join(__dirname, '.env.playwright');
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value && !key.startsWith('#')) {
      process.env[key.trim()] = value.trim();
    }
  });
}

// Configurações padrão que podem ser sobrescritas por variáveis de ambiente
const CONFIG = {
  // URLs e portas
  baseURL: process.env.PLAYWRIGHT_BASE_URL || process.env.BASE_URL || 'http://localhost:3000',
  port: process.env.PLAYWRIGHT_PORT || process.env.PORT || 3000,
  
  // Diretórios
  testDir: process.env.PLAYWRIGHT_TEST_DIR || './e2e-tests',
  outputDir: process.env.PLAYWRIGHT_OUTPUT_DIR || './test-results',
  
  // Timeouts (em segundos)
  timeout: parseInt(process.env.PLAYWRIGHT_TIMEOUT) || 30,
  expectTimeout: parseInt(process.env.PLAYWRIGHT_EXPECT_TIMEOUT) || 5,
  navigationTimeout: parseInt(process.env.PLAYWRIGHT_NAV_TIMEOUT) || 15,
  actionTimeout: parseInt(process.env.PLAYWRIGHT_ACTION_TIMEOUT) || 10,
  
  // Retry e workers
  retries: process.env.CI ? 2 : (parseInt(process.env.PLAYWRIGHT_RETRIES) || 0),
  workers: process.env.CI ? 1 : (parseInt(process.env.PLAYWRIGHT_WORKERS) || undefined),
  
  // Comandos para diferentes tipos de projeto
  serverCommands: {
    react: 'npm start',
    vue: 'npm run serve',
    angular: 'ng serve',
    next: 'npm run dev',
    nuxt: 'npm run dev',
    vite: 'npm run dev',
    custom: process.env.PLAYWRIGHT_SERVER_COMMAND || 'npm start'
  },
  
  // Headers customizados (útil para APIs)
  headers: process.env.PLAYWRIGHT_HEADERS ? JSON.parse(process.env.PLAYWRIGHT_HEADERS) : {},
  
  // Autenticação (se necessário)
  auth: {
    username: process.env.PLAYWRIGHT_AUTH_USER,
    password: process.env.PLAYWRIGHT_AUTH_PASS,
    token: process.env.PLAYWRIGHT_AUTH_TOKEN
  }
};

// Detectar tipo de projeto automaticamente
function detectProjectType() {
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  try {
    const packageJson = require(packageJsonPath);
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    if (deps.react || deps['@types/react']) return 'react';
    if (deps.vue || deps['@vue/cli-service']) return 'vue';
    if (deps['@angular/core']) return 'angular';
    if (deps.next) return 'next';
    if (deps.nuxt) return 'nuxt';
    if (deps.vite) return 'vite';
    
    return 'custom';
  } catch {
    return 'custom';
  }
}

// Configuração universal
module.exports = defineConfig({
  // Diretório dos testes
  testDir: CONFIG.testDir,
  
  // Diretório de saída
  outputDir: CONFIG.outputDir,
  
  // Timeouts
  timeout: CONFIG.timeout * 1000,
  expect: {
    timeout: CONFIG.expectTimeout * 1000,
  },
  
  // Paralelização
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: CONFIG.retries,
  workers: CONFIG.workers,
  
  // Reporters flexíveis
  reporter: [
    ['html', { 
      outputFolder: './playwright-report',
      open: process.env.CI ? 'never' : 'on-failure'
    }],
    ['json', { 
      outputFile: path.join(CONFIG.outputDir, 'results.json') 
    }],
    ['junit', { 
      outputFile: path.join(CONFIG.outputDir, 'results.xml') 
    }],
    // Reporter adicional para CI
    ...(process.env.CI ? [['github']] : []),
    // Reporter de linha de comando sempre ativo
    ['line']
  ],
  
  // Configurações globais de uso
  use: {
    // URL base
    baseURL: CONFIG.baseURL,
    
    // Configurações de trace e debugging
    trace: process.env.PLAYWRIGHT_TRACE || 'on-first-retry',
    screenshot: process.env.PLAYWRIGHT_SCREENSHOT || 'only-on-failure',
    video: process.env.PLAYWRIGHT_VIDEO || 'retain-on-failure',
    
    // Timeouts específicos
    navigationTimeout: CONFIG.navigationTimeout * 1000,
    actionTimeout: CONFIG.actionTimeout * 1000,
    
    // Headers customizados
    extraHTTPHeaders: CONFIG.headers,
    
    // Ignorar certificados HTTPS em desenvolvimento
    ignoreHTTPSErrors: !process.env.CI,
    
    // Configurações de viewport padrão
    viewport: process.env.PLAYWRIGHT_VIEWPORT ? 
      JSON.parse(process.env.PLAYWRIGHT_VIEWPORT) : 
      { width: 1280, height: 720 },
  },

  // Projetos/browsers configuráveis
  projects: [
    // Desktop browsers
    {
      name: 'Desktop Chrome',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 }
      },
    },
    
    // Adicionar outros browsers baseado em variáveis de ambiente
    ...(process.env.PLAYWRIGHT_BROWSERS?.includes('firefox') ? [{
      name: 'Desktop Firefox',
      use: { 
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 }
      },
    }] : []),
    
    ...(process.env.PLAYWRIGHT_BROWSERS?.includes('safari') ? [{
      name: 'Desktop Safari',
      use: { 
        ...devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 }
      },
    }] : []),
    
    // Mobile devices (opcional)
    ...(process.env.PLAYWRIGHT_MOBILE ? [
      {
        name: 'Mobile Chrome',
        use: { ...devices['Pixel 5'] },
      },
      {
        name: 'Mobile Safari',
        use: { ...devices['iPhone 13'] },
      }
    ] : []),
    
    // Tablet (opcional)
    ...(process.env.PLAYWRIGHT_TABLET ? [{
      name: 'Tablet',
      use: { 
        ...devices['iPad Pro'],
        viewport: { width: 1024, height: 768 }
      },
    }] : []),
  ],

  // Servidor web local (auto-detecta tipo de projeto)
  webServer: process.env.PLAYWRIGHT_NO_SERVER ? undefined : {
    command: CONFIG.serverCommands[detectProjectType()],
    port: CONFIG.port,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // 2 minutos para iniciar
    stdout: 'pipe',
    stderr: 'pipe',
  },
  
  // Configurações opcionais (se os arquivos existirem)
  globalSetup: (() => {
    const setupPath = path.join(CONFIG.testDir, 'global-setup.js');
    try {
      require.resolve(setupPath);
      return setupPath;
    } catch {
      return undefined;
    }
  })(),
  
  globalTeardown: (() => {
    const teardownPath = path.join(CONFIG.testDir, 'global-teardown.js');
    try {
      require.resolve(teardownPath);
      return teardownPath;
    } catch {
      return undefined;
    }
  })(),
});