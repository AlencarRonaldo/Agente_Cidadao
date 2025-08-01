#!/usr/bin/env node

/**
 * Playwright Universal Setup Script
 * 
 * Script para configurar Playwright em qualquer projeto
 * Detecta automaticamente o tipo de projeto e configura adequadamente
 * 
 * Uso: node setup-playwright-universal.js [opcoes]
 * 
 * @author Claude Code
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Cores para output no terminal
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

// Função para log colorido
const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  step: (msg) => console.log(`${colors.cyan}🚀${colors.reset} ${msg}`)
};

// Detectar tipo de projeto
function detectProjectType() {
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  
  if (!fs.existsSync(packageJsonPath)) {
    log.warning('package.json não encontrado. Usando configuração genérica.');
    return { type: 'generic', port: 3000, command: 'npm start' };
  }

  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    const scripts = packageJson.scripts || {};
    
    // Detectar framework
    if (deps.react || deps['@types/react']) {
      return { 
        type: 'react', 
        port: 3000, 
        command: 'npm start',
        testCommand: 'npm test'
      };
    }
    
    if (deps.vue || deps['@vue/cli-service']) {
      return { 
        type: 'vue', 
        port: 8080, 
        command: 'npm run serve',
        testCommand: 'npm run test:unit'
      };
    }
    
    if (deps['@angular/core']) {
      return { 
        type: 'angular', 
        port: 4200, 
        command: 'ng serve',
        testCommand: 'ng test'
      };
    }
    
    if (deps.next) {
      return { 
        type: 'next', 
        port: 3000, 
        command: 'npm run dev',
        testCommand: 'npm test'
      };
    }
    
    if (deps.nuxt) {
      return { 
        type: 'nuxt', 
        port: 3000, 
        command: 'npm run dev',
        testCommand: 'npm test'
      };
    }
    
    if (deps.vite) {
      return { 
        type: 'vite', 
        port: 5173, 
        command: 'npm run dev',
        testCommand: 'npm test'
      };
    }
    
    // Fallback para projetos genéricos
    const startScript = scripts.start || scripts.dev || scripts.serve;
    return { 
      type: 'generic', 
      port: 3000, 
      command: startScript ? `npm run ${Object.keys(scripts).find(key => scripts[key] === startScript)}` : 'npm start',
      testCommand: 'npm test'
    };
    
  } catch (error) {
    log.error(`Erro ao ler package.json: ${error.message}`);
    return { type: 'generic', port: 3000, command: 'npm start' };
  }
}

// Instalar dependências
function installDependencies() {
  log.step('Instalando dependências do Playwright...');
  
  try {
    execSync('npm install --save-dev @playwright/test', { stdio: 'inherit' });
    log.success('@playwright/test instalado');
    
    execSync('npx playwright install', { stdio: 'inherit' });
    log.success('Browsers do Playwright instalados');
    
    // Instalar dependências opcionais úteis
    try {
      execSync('npm install --save-dev axe-playwright', { stdio: 'pipe' });
      log.success('axe-playwright instalado (testes de acessibilidade)');
    } catch {
      log.warning('axe-playwright não instalado (opcional)');
    }
    
  } catch (error) {
    log.error(`Erro na instalação: ${error.message}`);
    process.exit(1);
  }
}

// Criar estrutura de diretórios
function createDirectoryStructure() {
  log.step('Criando estrutura de diretórios...');
  
  const dirs = [
    'e2e-tests',
    'e2e-tests/auth',
    'e2e-tests/pages',
    'e2e-tests/api',
    'e2e-tests/performance',
    'e2e-tests/accessibility',
    'e2e-tests/fixtures',
    'e2e-tests/utils',
    'test-results'
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      log.success(`Diretório criado: ${dir}`);
    }
  });
}

// Criar arquivos de configuração
function createConfigFiles(projectInfo) {
  log.step('Criando arquivos de configuração...');
  
  // Copiar configuração universal
  const configSource = path.join(__dirname, 'playwright-universal-config.js');
  const configDest = path.join(process.cwd(), 'playwright.config.js');
  
  if (fs.existsSync(configSource)) {
    fs.copyFileSync(configSource, configDest);
    log.success('playwright.config.js criado');
  }
  
  // Criar arquivo .env.playwright
  const envContent = `# Playwright Configuration for ${projectInfo.type} project
PLAYWRIGHT_BASE_URL=http://localhost:${projectInfo.port}
PLAYWRIGHT_PORT=${projectInfo.port}
PLAYWRIGHT_SERVER_COMMAND=${projectInfo.command}
PLAYWRIGHT_BROWSERS=firefox
PLAYWRIGHT_MOBILE=false
PLAYWRIGHT_TABLET=false
PLAYWRIGHT_TRACE=on-first-retry
PLAYWRIGHT_SCREENSHOT=only-on-failure
PLAYWRIGHT_VIDEO=retain-on-failure
`;
  
  fs.writeFileSync('.env.playwright', envContent);
  log.success('.env.playwright criado');
  
  // Atualizar .gitignore
  const gitignoreAdditions = `
# Playwright
/test-results/
/playwright-report/
/playwright/.cache/
/.env.playwright
`;
  
  const gitignorePath = '.gitignore';
  if (fs.existsSync(gitignorePath)) {
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
    if (!gitignoreContent.includes('test-results')) {
      fs.appendFileSync(gitignorePath, gitignoreAdditions);
      log.success('.gitignore atualizado');
    }
  } else {
    fs.writeFileSync(gitignorePath, gitignoreAdditions);
    log.success('.gitignore criado');
  }
}

// Criar testes de exemplo
function createExampleTests(projectInfo) {
  log.step('Criando testes de exemplo...');
  
  // Teste básico de página
  const basicTest = `import { test, expect } from '@playwright/test';

test.describe('${projectInfo.type.toUpperCase()} App - Testes Básicos', () => {
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
`;
  
  fs.writeFileSync('e2e-tests/basic.spec.js', basicTest);
  log.success('Teste básico criado: e2e-tests/basic.spec.js');
  
  // Teste de performance
  const performanceTest = `import { test, expect } from '@playwright/test';

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
      console.log(\`LCP: \${vitals.lcp}ms\`);
    }
  });
});
`;
  
  fs.writeFileSync('e2e-tests/performance/core-vitals.spec.js', performanceTest);
  log.success('Teste de performance criado');
  
  // Utilitários
  const utilsContent = `/**
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
    await page.screenshot({ path: \`test-results/screenshots/\${name}-\${Date.now()}.png\` });
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
`;
  
  fs.writeFileSync('e2e-tests/utils/test-utils.js', utilsContent);
  log.success('Utilitários criados');
}

// Atualizar package.json com scripts
function updatePackageJson(projectInfo) {
  log.step('Atualizando package.json...');
  
  const packageJsonPath = 'package.json';
  if (!fs.existsSync(packageJsonPath)) {
    log.warning('package.json não encontrado, pulando atualização de scripts');
    return;
  }
  
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  // Adicionar scripts do Playwright
  packageJson.scripts = packageJson.scripts || {};
  packageJson.scripts['test:e2e'] = 'playwright test';
  packageJson.scripts['test:e2e:headed'] = 'playwright test --headed';
  packageJson.scripts['test:e2e:debug'] = 'playwright test --debug';
  packageJson.scripts['test:e2e:report'] = 'playwright show-report';
  packageJson.scripts['test:e2e:ui'] = 'playwright test --ui';
  
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  log.success('Scripts adicionados ao package.json');
}

// Função principal
async function main() {
  console.log(`${colors.cyan}
╔══════════════════════════════════════════════════════════════╗
║                 PLAYWRIGHT UNIVERSAL SETUP                  ║
║              Configuração para qualquer projeto             ║
╚══════════════════════════════════════════════════════════════╝
${colors.reset}`);

  // Detectar tipo de projeto
  const projectInfo = detectProjectType();
  log.info(`Projeto detectado: ${projectInfo.type.toUpperCase()}`);
  log.info(`Porta padrão: ${projectInfo.port}`);
  log.info(`Comando de start: ${projectInfo.command}`);
  
  try {
    // Instalar dependências
    installDependencies();
    
    // Criar estrutura
    createDirectoryStructure();
    
    // Criar configurações
    createConfigFiles(projectInfo);
    
    // Criar testes de exemplo
    createExampleTests(projectInfo);
    
    // Atualizar package.json
    updatePackageJson(projectInfo);
    
    // Sucesso
    console.log(`${colors.green}
╔══════════════════════════════════════════════════════════════╗
║                    ✅ SETUP CONCLUÍDO!                      ║
╚══════════════════════════════════════════════════════════════╝
${colors.reset}`);

    log.step('Próximos passos:');
    console.log(`
1. ${colors.yellow}Ajustar configurações${colors.reset}:
   • Edite .env.playwright conforme necessário
   
2. ${colors.yellow}Executar testes${colors.reset}:
   • npm run test:e2e
   • npm run test:e2e:headed (com interface gráfica)
   • npm run test:e2e:debug (modo debug)
   
3. ${colors.yellow}Ver relatórios${colors.reset}:
   • npm run test:e2e:report
   
4. ${colors.yellow}Interface de desenvolvimento${colors.reset}:
   • npm run test:e2e:ui
   
${colors.cyan}📚 Documentação: https://playwright.dev${colors.reset}
`);
    
  } catch (error) {
    log.error(`Erro durante o setup: ${error.message}`);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = { main, detectProjectType, log };