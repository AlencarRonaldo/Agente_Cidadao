# 🎭 Playwright Universal Configuration

Configuração universal e reutilizável do Playwright que funciona com **qualquer tipo de projeto** (React, Vue, Angular, Next.js, Nuxt, Vite, etc.).

## ✨ Características

- 🚀 **Auto-detecção** do tipo de projeto
- 🔧 **Configuração flexível** via variáveis de ambiente
- 📱 **Multi-device** (Desktop, Mobile, Tablet)
- 🌐 **Multi-browser** (Chrome, Firefox, Safari)
- 📊 **Relatórios avançados** (HTML, JSON, JUnit)
- ⚡ **Performance testing** (Core Web Vitals)
- ♿ **Testes de acessibilidade** (WCAG)
- 🔄 **CI/CD ready** (GitHub Actions, etc.)

## 🚀 Instalação Rápida

### Opção 1: Script Automático (Recomendado)

```bash
# Baixar e executar o script de setup
curl -o setup-playwright.js https://raw.githubusercontent.com/seu-repo/setup-playwright-universal.js
node setup-playwright.js

# Ou se já tem os arquivos localmente
node setup-playwright-universal.js
```

### Opção 2: Instalação Manual

```bash
# 1. Instalar dependências
npm install --save-dev @playwright/test
npx playwright install

# 2. Copiar arquivos de configuração
cp playwright-universal-config.js playwright.config.js
cp .env.playwright.example .env.playwright

# 3. Criar estrutura de testes
mkdir -p e2e-tests/{auth,pages,api,performance,accessibility,fixtures,utils}
```

## 🎯 Uso por Tipo de Projeto

### React

```bash
# .env.playwright
PLAYWRIGHT_BASE_URL=http://localhost:3000
PLAYWRIGHT_PORT=3000
PLAYWRIGHT_SERVER_COMMAND=npm start
```

### Vue

```bash
# .env.playwright
PLAYWRIGHT_BASE_URL=http://localhost:8080
PLAYWRIGHT_PORT=8080
PLAYWRIGHT_SERVER_COMMAND=npm run serve
```

### Angular

```bash
# .env.playwright
PLAYWRIGHT_BASE_URL=http://localhost:4200
PLAYWRIGHT_PORT=4200
PLAYWRIGHT_SERVER_COMMAND=ng serve
```

### Next.js

```bash
# .env.playwright
PLAYWRIGHT_BASE_URL=http://localhost:3000
PLAYWRIGHT_PORT=3000
PLAYWRIGHT_SERVER_COMMAND=npm run dev
```

### Nuxt

```bash
# .env.playwright
PLAYWRIGHT_BASE_URL=http://localhost:3000
PLAYWRIGHT_PORT=3000
PLAYWRIGHT_SERVER_COMMAND=npm run dev
```

### Vite

```bash
# .env.playwright
PLAYWRIGHT_BASE_URL=http://localhost:5173
PLAYWRIGHT_PORT=5173
PLAYWRIGHT_SERVER_COMMAND=npm run dev
```

## 📋 Scripts Disponíveis

Após a instalação, estes scripts estarão disponíveis:

```bash
# Executar todos os testes
npm run test:e2e

# Executar com interface gráfica
npm run test:e2e:headed

# Modo debug (passo a passo)
npm run test:e2e:debug

# Interface de desenvolvimento
npm run test:e2e:ui

# Ver relatório HTML
npm run test:e2e:report
```

## ⚙️ Configuração Avançada

### Variáveis de Ambiente

```bash
# Básico
PLAYWRIGHT_BASE_URL=http://localhost:3000
PLAYWRIGHT_PORT=3000

# Browsers adicionais
PLAYWRIGHT_BROWSERS=firefox,safari

# Dispositivos móveis
PLAYWRIGHT_MOBILE=true
PLAYWRIGHT_TABLET=true

# Debugging
PLAYWRIGHT_TRACE=on
PLAYWRIGHT_SCREENSHOT=on
PLAYWRIGHT_VIDEO=on

# Timeouts
PLAYWRIGHT_TIMEOUT=60
PLAYWRIGHT_RETRIES=3

# Headers customizados
PLAYWRIGHT_HEADERS={"Authorization":"Bearer token"}

# Desabilitar servidor automático
PLAYWRIGHT_NO_SERVER=true
```

### Browsers Configuráveis

```bash
# Apenas Chrome (padrão)
PLAYWRIGHT_BROWSERS=

# Chrome + Firefox
PLAYWRIGHT_BROWSERS=firefox

# Todos os browsers
PLAYWRIGHT_BROWSERS=firefox,safari

# Com dispositivos móveis
PLAYWRIGHT_MOBILE=true
PLAYWRIGHT_TABLET=true
```

## 📱 Testes Responsivos

```javascript
// e2e-tests/responsive.spec.js
import { test, expect } from '@playwright/test';

test.describe('Responsividade', () => {
  const viewports = [
    { width: 1920, height: 1080, name: 'Desktop' },
    { width: 1024, height: 768, name: 'Tablet' },
    { width: 375, height: 667, name: 'Mobile' }
  ];

  viewports.forEach(viewport => {
    test(`deve funcionar em ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto('/');
      await expect(page.locator('body')).toBeVisible();
    });
  });
});
```

## ⚡ Testes de Performance

```javascript
// e2e-tests/performance/vitals.spec.js
import { test, expect } from '@playwright/test';

test('Core Web Vitals', async ({ page }) => {
  await page.goto('/');
  
  const vitals = await page.evaluate(() => {
    return new Promise((resolve) => {
      const vitals = {};
      
      // LCP (Largest Contentful Paint)
      new PerformanceObserver((list) => {
        vitals.lcp = list.getEntries().pop()?.startTime;
      }).observe({ entryTypes: ['largest-contentful-paint'] });
      
      // FID (First Input Delay)
      new PerformanceObserver((list) => {
        vitals.fid = list.getEntries().pop()?.processingStart;
      }).observe({ entryTypes: ['first-input'] });
      
      setTimeout(() => resolve(vitals), 3000);
    });
  });
  
  // Verificar thresholds
  if (vitals.lcp) expect(vitals.lcp).toBeLessThan(2500); // < 2.5s
  if (vitals.fid) expect(vitals.fid).toBeLessThan(100);  // < 100ms
});
```

## ♿ Testes de Acessibilidade

```javascript
// e2e-tests/accessibility/wcag.spec.js
import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

test('WCAG 2.1 AA Compliance', async ({ page }) => {
  await page.goto('/');
  await injectAxe(page);
  
  await checkA11y(page, null, {
    detailedReport: true,
    detailedReportOptions: { html: true },
  });
});
```

## 🔐 Autenticação

```javascript
// e2e-tests/utils/auth.js
export async function login(page, credentials = {}) {
  const {
    email = process.env.PLAYWRIGHT_AUTH_USER || 'test@example.com',
    password = process.env.PLAYWRIGHT_AUTH_PASS || 'password'
  } = credentials;
  
  await page.goto('/login');
  await page.fill('[data-testid="email"]', email);
  await page.fill('[data-testid="password"]', password);
  await page.click('[data-testid="login-button"]');
  
  // Aguardar redirecionamento
  await page.waitForURL('/dashboard');
}
```

## 🔄 Integração CI/CD

### GitHub Actions

```yaml
# .github/workflows/e2e.yml
name: E2E Tests
on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright
        run: npx playwright install --with-deps
      
      - name: Run E2E tests
        run: npm run test:e2e
        env:
          CI: true
      
      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: test-results/
```

### GitLab CI

```yaml
# .gitlab-ci.yml
e2e-tests:
  image: mcr.microsoft.com/playwright:v1.40.0-focal
  stage: test
  script:
    - npm ci
    - npm run test:e2e
  artifacts:
    when: always
    paths:
      - test-results/
    expire_in: 1 week
```

## 📊 Relatórios

### HTML Report
```bash
npm run test:e2e:report
# Abre relatório em http://localhost:9323
```

### JSON Report
```bash
# Relatório disponível em test-results/results.json
cat test-results/results.json | jq '.suites[0].tests[0].results[0].status'
```

### JUnit (para CI)
```bash
# Relatório XML em test-results/results.xml
# Compatível com Jenkins, Azure DevOps, etc.
```

## 🛠️ Customização

### Configuração Personalizada

```javascript
// playwright.config.custom.js
const universalConfig = require('./playwright-universal-config.js');

module.exports = {
  ...universalConfig,
  // Suas customizações
  use: {
    ...universalConfig.use,
    headless: false, // Sempre com interface
    video: 'on',     // Sempre gravar vídeo
  },
  // Projetos customizados
  projects: [
    ...universalConfig.projects,
    {
      name: 'Custom Browser',
      use: { browserName: 'chromium', headless: false }
    }
  ]
};
```

### Fixtures Customizados

```javascript
// e2e-tests/fixtures/custom-test.js
import { test as base } from '@playwright/test';

export const test = base.extend({
  // Fixture de usuário logado
  authenticatedPage: async ({ page }, use) => {
    await login(page);
    await use(page);
  },
  
  // Fixture de dados de teste
  testData: async ({}, use) => {
    const data = await generateTestData();
    await use(data);
    await cleanup(data);
  }
});
```

## 🐛 Debug e Troubleshooting

### Debug Mode
```bash
# Executar em modo debug
npm run test:e2e:debug

# Debug específico
npx playwright test --debug specific.spec.js
```

### Trace Viewer
```bash
# Gerar traces
PLAYWRIGHT_TRACE=on npm run test:e2e

# Ver traces
npx playwright show-trace test-results/traces/trace.zip
```

### Screenshots e Vídeos
```bash
# Habilitar captura
PLAYWRIGHT_SCREENSHOT=on PLAYWRIGHT_VIDEO=on npm run test:e2e

# Arquivos salvos em test-results/
```

## 📚 Estrutura de Diretórios

```
projeto/
├── playwright.config.js          # Configuração principal
├── .env.playwright               # Variáveis de ambiente
├── e2e-tests/
│   ├── auth/                     # Testes de autenticação
│   ├── pages/                    # Testes por página
│   ├── api/                      # Testes de API
│   ├── performance/              # Testes de performance
│   ├── accessibility/            # Testes de acessibilidade
│   ├── fixtures/                 # Fixtures reutilizáveis
│   ├── utils/                    # Utilitários
│   └── global-setup.js           # Setup global
└── test-results/                 # Resultados dos testes
    ├── html-report/              # Relatório HTML
    ├── screenshots/              # Screenshots
    ├── videos/                   # Vídeos
    └── traces/                   # Traces
```

## 🏷️ Versões Suportadas

- **Node.js**: 16+
- **Playwright**: 1.40+
- **Browsers**: Chrome 90+, Firefox 90+, Safari 14+

## 📞 Suporte

- 📚 [Documentação Playwright](https://playwright.dev)
- 🐛 [Issues GitHub](https://github.com/microsoft/playwright/issues)
- 💬 [Discord Community](https://discord.gg/playwright)

## 📄 Licença

MIT License - veja [LICENSE](LICENSE) para detalhes.

---

**✨ Configuração universal que se adapta ao seu projeto automaticamente!**