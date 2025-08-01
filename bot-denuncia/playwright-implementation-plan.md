# Implementação do Playwright MCP Server - Bot Denúncias

## 🎯 Análise do Playwright MCP Server Microsoft

### O que é o Playwright MCP Server
- **MCP (Model Context Protocol)**: Sistema de comunicação estruturada para automação
- **Multi-Browser**: Chrome, Firefox, Safari, Edge
- **Accessibility-First**: Opera através de árvore de acessibilidade
- **Determinístico**: Execução consistente e reproduzível

### Principais Capacidades Identificadas
- Automação de browser completa
- Testes E2E multi-browser
- Monitoramento de performance (Core Web Vitals)
- Validação de acessibilidade WCAG
- Captura de evidências (screenshots/vídeos)

## 🚀 Plano de Implementação para nosso Admin Panel

### Fase 1: Setup e Configuração Básica

#### 1.1 Instalação
```bash
cd admin-panel
npm install @playwright/test @playwright/mcp --save-dev
npx playwright install
```

#### 1.2 Configuração do Playwright
```javascript
// playwright.config.js
module.exports = {
  testDir: './e2e-tests',
  timeout: 30000,
  retries: 2,
  use: {
    baseURL: 'http://localhost:3007', // Nossa URL do admin panel
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'] } }
  ]
};
```

### Fase 2: Testes E2E Específicos para Bot-Denúncias

#### 2.1 Teste de Login e Autenticação
```javascript
// e2e-tests/auth/login.spec.js
test('Login no admin panel', async ({ page }) => {
  await page.goto('/');
  
  // Testar credenciais corretas
  await page.fill('[data-testid="email"]', 'admin@teste.com');
  await page.fill('[data-testid="senha"]', '123456');
  await page.click('[data-testid="login-button"]');
  
  // Verificar redirecionamento para dashboard
  await expect(page).toHaveURL('/dashboard');
  await expect(page.locator('[data-testid="user-name"]')).toContainText('Admin');
});
```

#### 2.2 Teste do Dashboard com Agenda
```javascript
// e2e-tests/dashboard/metrics.spec.js
test('Dashboard com agenda de postagens', async ({ page }) => {
  // Login
  await loginAsAdmin(page);
  
  // Verificar cards de estatísticas
  await expect(page.locator('[data-testid="total-denuncias"]')).toBeVisible();
  await expect(page.locator('[data-testid="denuncias-pendentes"]')).toBeVisible();
  
  // Verificar agenda de postagens
  await expect(page.locator('[data-testid="agenda-postagens"]')).toBeVisible();
  await expect(page.locator('[data-testid="agenda-item"]').first()).toBeVisible();
  
  // Verificar bairros com mais denúncias
  await expect(page.locator('[data-testid="top-bairros"]')).toBeVisible();
  
  // Verificar distribuição por status
  await expect(page.locator('[data-testid="status-distribution"]')).toBeVisible();
});
```

#### 2.3 Teste do Sistema de Denúncias
```javascript
// e2e-tests/denuncias/workflow.spec.js
test('Fluxo completo de denúncia', async ({ page }) => {
  await loginAsAdmin(page);
  
  // Navegar para lista de denúncias
  await page.click('[data-testid="denuncias-menu"]');
  
  // Filtrar denúncias pendentes
  await page.selectOption('[data-testid="status-filter"]', 'PENDENTE_MODERACAO');
  await page.click('[data-testid="apply-filters"]');
  
  // Aprovar primeira denúncia
  await page.click('[data-testid="approve-denuncia-btn"]');
  await page.click('[data-testid="confirm-approval"]');
  
  // Verificar sucesso
  await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
});
```

### Fase 3: Monitoramento de Performance

#### 3.1 Core Web Vitals
```javascript
// e2e-tests/performance/core-vitals.spec.js
test('Core Web Vitals do admin panel', async ({ page }) => {
  // Navegar para dashboard
  await page.goto('/dashboard');
  
  // Medir LCP (Largest Contentful Paint)
  const lcp = await page.evaluate(() => {
    return new Promise((resolve) => {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        resolve(entries[entries.length - 1].startTime);
      }).observe({ entryTypes: ['largest-contentful-paint'] });
    });
  });
  
  expect(lcp).toBeLessThan(2500); // < 2.5s
  
  // Medir tempo de carregamento da API
  const apiResponse = await page.waitForResponse('/api/admin/dashboard');
  expect(apiResponse.status()).toBe(200);
});
```

#### 3.2 Performance de APIs
```javascript
// scripts/api-performance-monitor.js
const { chromium } = require('@playwright/test');

async function monitorApiPerformance() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const apiMetrics = {};
  
  page.on('response', response => {
    const url = response.url();
    if (url.includes('/api/admin/')) {
      const timing = response.timing();
      apiMetrics[url] = {
        status: response.status(),
        responseTime: timing.responseEnd - timing.responseStart
      };
    }
  });
  
  // Testar todas as APIs principais
  await page.goto('/dashboard');
  await page.goto('/denuncias');
  await page.goto('/config/instagram');
  
  console.log('API Performance Metrics:', apiMetrics);
  await browser.close();
  
  return apiMetrics;
}
```

### Fase 4: Testes de Acessibilidade

#### 4.1 Validação WCAG
```javascript
// e2e-tests/accessibility/wcag.spec.js
const { injectAxe, checkA11y } = require('axe-playwright');

test('Acessibilidade WCAG 2.1 AA', async ({ page }) => {
  await page.goto('/dashboard');
  await injectAxe(page);
  
  // Verificar acessibilidade da página
  await checkA11y(page, null, {
    detailedReport: true,
    detailedReportOptions: { html: true },
  });
  
  // Testar navegação por teclado
  await page.keyboard.press('Tab');
  const focusedElement = await page.locator(':focus');
  await expect(focusedElement).toBeVisible();
});
```

### Fase 5: Integração com CI/CD

#### 5.1 GitHub Actions
```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd admin-panel
          npm ci
          npx playwright install
      
      - name: Start admin panel
        run: |
          cd admin-panel
          npm start &
          sleep 30
      
      - name: Run E2E tests
        run: |
          cd admin-panel
          npx playwright test
      
      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: admin-panel/playwright-report/
```

## 📊 Benefícios Esperados

### 1. Qualidade Automatizada
- **Detecção precoce** de bugs e regressões
- **Validação automática** de novos deploys
- **Testes multi-browser** garantindo compatibilidade

### 2. Performance Monitorada
- **Core Web Vitals** em tempo real
- **Alertas automáticos** para degradação de performance
- **Métricas de API** para otimização

### 3. Acessibilidade Garantida
- **Compliance WCAG 2.1 AA** automática
- **Navegação por teclado** validada
- **Screen readers** compatíveis

### 4. Produtividade Aumentada
- **Redução de bugs** em produção
- **Feedback rápido** para desenvolvedores
- **Documentação visual** dos testes

## 🛠️ Implementação Imediata

### Comandos para Implementar Agora:

```bash
# 1. Instalar Playwright no admin panel
cd admin-panel
npm install @playwright/test --save-dev
npx playwright install

# 2. Criar estrutura de testes
mkdir -p e2e-tests/{auth,dashboard,denuncias,performance,accessibility}

# 3. Executar primeiro teste
npx playwright test --headed
```

### Scripts do Package.json:
```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:headed": "playwright test --headed",
    "test:performance": "playwright test performance/",
    "test:accessibility": "playwright test accessibility/",
    "test:report": "playwright show-report"
  }
}
```

## 🎯 Próximos Passos

1. **Instalar Playwright MCP** no projeto
2. **Criar testes básicos** para fluxos principais
3. **Implementar monitoramento** de performance
4. **Configurar CI/CD** para execução automática
5. **Expandir cobertura** de testes gradualmente

O Playwright MCP Server pode transformar a qualidade e confiabilidade do nosso admin panel, oferecendo automação robusta, monitoramento contínuo e garantia de acessibilidade.