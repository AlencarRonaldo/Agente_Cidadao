/**
 * Instagram Graph API Migration Test Suite
 * 
 * Testes completos para verificar a interface de migração da Graph API,
 * controles de administração e resolução de problemas de interface.
 */

const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

// Configuration
const ADMIN_URL = 'http://localhost:3001';
const BACKEND_URL = 'http://localhost:3355';
const SCREENSHOTS_DIR = 'test-results/instagram-migration';
const TEST_TIMEOUT = 60000;

// Mock credentials for testing
const TEST_CREDENTIALS = {
  username: 'admin@teste.com',
  password: '123456'
};

test.describe('Instagram Graph API Migration Interface', () => {
  
  // Setup for each test
  test.beforeEach(async ({ page }) => {
    // Create screenshots directory
    const screenshotsPath = path.join(__dirname, '..', SCREENSHOTS_DIR);
    if (!fs.existsSync(screenshotsPath)) {
      fs.mkdirSync(screenshotsPath, { recursive: true });
    }

    // Set timeout
    test.setTimeout(TEST_TIMEOUT);
    
    // Navigate to admin panel
    await page.goto(ADMIN_URL);
    await page.waitForLoadState('networkidle');
    
    // Capture initial state
    await page.screenshot({ 
      path: path.join(screenshotsPath, '01-initial-load.png'),
      fullPage: true
    });
  });

  test('Should load admin panel and show login form', async ({ page }) => {
    // Check if login form is visible
    const loginForm = page.locator('form');
    await expect(loginForm).toBeVisible({ timeout: 10000 });
    
    // Check for username and password fields
    const usernameField = page.locator('input[type="text"], input[name="username"]').first();
    const passwordField = page.locator('input[type="password"], input[name="password"]').first();
    
    await expect(usernameField).toBeVisible();
    await expect(passwordField).toBeVisible();
    
    // Capture login form
    await page.screenshot({ 
      path: path.join(__dirname, '..', SCREENSHOTS_DIR, '02-login-form.png'),
      fullPage: true
    });
  });

  test('Should login and navigate to Instagram Configuration', async ({ page }) => {
    try {
      // Login process
      await performLogin(page);
      
      // Wait for dashboard to load
      await page.waitForLoadState('networkidle');
      await page.screenshot({ 
        path: path.join(__dirname, '..', SCREENSHOTS_DIR, '03-dashboard-loaded.png'),
        fullPage: true
      });
      
      // Navigate to Instagram Configuration
      await navigateToInstagramConfig(page);
      
      // Verify Instagram Configuration page loaded
      const instagramTitle = page.locator('text=Configuração do Instagram');
      await expect(instagramTitle).toBeVisible({ timeout: 10000 });
      
      // Capture Instagram config page
      await page.screenshot({ 
        path: path.join(__dirname, '..', SCREENSHOTS_DIR, '04-instagram-config.png'),
        fullPage: true
      });
      
    } catch (error) {
      console.error('Login/Navigation Error:', error);
      await page.screenshot({ 
        path: path.join(__dirname, '..', SCREENSHOTS_DIR, 'error-login-navigation.png'),
        fullPage: true
      });
      throw error;
    }
  });

  test('Should show Graph API migration controls', async ({ page }) => {
    try {
      // Login and navigate
      await performLogin(page);
      await navigateToInstagramConfig(page);
      
      // Check for API Status & Migration tab
      const migrationTab = page.locator('text=API Status & Migration');
      await expect(migrationTab).toBeVisible({ timeout: 10000 });
      
      // Click on migration tab if not already active
      if (await migrationTab.isVisible()) {
        await migrationTab.click();
        await page.waitForTimeout(1000);
      }
      
      // Check for current API status display
      const currentApiChip = page.locator('[data-testid="current-api-chip"], .MuiChip-root:has-text("API Atual")').first();
      if (await currentApiChip.isVisible()) {
        console.log('Current API status found');
        
        // Get current API text
        const apiText = await currentApiChip.textContent();
        console.log('Current API:', apiText);
      }
      
      // Check for API comparison cards
      const privateApiCard = page.locator('text=Private API').locator('..').locator('..');
      const graphApiCard = page.locator('text=Graph API').locator('..').locator('..');
      
      await expect(privateApiCard).toBeVisible({ timeout: 5000 });
      await expect(graphApiCard).toBeVisible({ timeout: 5000 });
      
      // Check for migration controls section
      const migrationControls = page.locator('text=Controles de Migração');
      await expect(migrationControls).toBeVisible({ timeout: 5000 });
      
      // Check for migration buttons
      const migrationButton = page.locator('button:has-text("Iniciar Migração"), button:has-text("Mudar para Graph API"), button:has-text("Mudar para Private API")').first();
      if (await migrationButton.isVisible()) {
        console.log('Migration button found');
      }
      
      // Capture migration interface
      await page.screenshot({ 
        path: path.join(__dirname, '..', SCREENSHOTS_DIR, '05-migration-controls.png'),
        fullPage: true
      });
      
    } catch (error) {
      console.error('Migration Controls Error:', error);
      await page.screenshot({ 
        path: path.join(__dirname, '..', SCREENSHOTS_DIR, 'error-migration-controls.png'),
        fullPage: true
      });
      throw error;
    }
  });

  test('Should display API status information', async ({ page }) => {
    try {
      // Login and navigate
      await performLogin(page);
      await navigateToInstagramConfig(page);
      
      // Wait for API status to load
      await page.waitForTimeout(2000);
      
      // Check for health score display
      const healthScore = page.locator('text=Health Score');
      if (await healthScore.isVisible()) {
        console.log('Health Score display found');
      }
      
      // Check for API status in each card
      const statusChips = page.locator('.MuiChip-root:has-text("Conectado"), .MuiChip-root:has-text("Desconectado"), .MuiChip-root:has-text("Não configurado")');
      const statusCount = await statusChips.count();
      console.log(`Found ${statusCount} status indicators`);
      
      // Check for debug information in development mode
      const debugInfo = page.locator('text=Debug:');
      if (await debugInfo.isVisible()) {
        const debugText = await debugInfo.textContent();
        console.log('Debug Info:', debugText);
      }
      
      // Capture API status
      await page.screenshot({ 
        path: path.join(__dirname, '..', SCREENSHOTS_DIR, '06-api-status.png'),
        fullPage: true
      });
      
    } catch (error) {
      console.error('API Status Error:', error);
      await page.screenshot({ 
        path: path.join(__dirname, '..', SCREENSHOTS_DIR, 'error-api-status.png'),
        fullPage: true
      });
      throw error;
    }
  });

  test('Should test Graph API configuration tab', async ({ page }) => {
    try {
      // Login and navigate
      await performLogin(page);
      await navigateToInstagramConfig(page);
      
      // Click on Graph API tab
      const graphApiTab = page.locator('text=Graph API');
      await expect(graphApiTab).toBeVisible({ timeout: 10000 });
      await graphApiTab.click();
      await page.waitForTimeout(1000);
      
      // Check for Graph API configuration elements
      const graphApiTitle = page.locator('text=Graph API - Instagram Oficial');
      await expect(graphApiTitle).toBeVisible({ timeout: 5000 });
      
      // Check for enable switch
      const enableSwitch = page.locator('input[type="checkbox"]:near(:text("Ativar Graph API"))');
      if (await enableSwitch.isVisible()) {
        console.log('Graph API enable switch found');
      }
      
      // Check for configuration fields
      const clientIdField = page.locator('input[label*="Client ID"], label:has-text("Client ID") + * input').first();
      const clientSecretField = page.locator('input[type="password"]:near(:text("Client Secret"))').first();
      
      if (await clientIdField.isVisible()) {
        console.log('Client ID field found');
      }
      
      if (await clientSecretField.isVisible()) {
        console.log('Client Secret field found');
      }
      
      // Capture Graph API config
      await page.screenshot({ 
        path: path.join(__dirname, '..', SCREENSHOTS_DIR, '07-graph-api-config.png'),
        fullPage: true
      });
      
    } catch (error) {
      console.error('Graph API Config Error:', error);
      await page.screenshot({ 
        path: path.join(__dirname, '..', SCREENSHOTS_DIR, 'error-graph-api-config.png'),
        fullPage: true
      });
      throw error;
    }
  });

  test('Should handle invalid token scenarios gracefully', async ({ page }) => {
    try {
      // Login and navigate
      await performLogin(page);
      await navigateToInstagramConfig(page);
      
      // Look for error messages about invalid tokens
      const errorMessages = page.locator('.MuiAlert-root:has-text("Token"), .MuiAlert-root:has-text("token"), .MuiAlert-root:has-text("inválido")');
      const errorCount = await errorMessages.count();
      
      if (errorCount > 0) {
        console.log(`Found ${errorCount} token-related error messages`);
        for (let i = 0; i < errorCount; i++) {
          const errorText = await errorMessages.nth(i).textContent();
          console.log(`Error ${i + 1}:`, errorText);
        }
      }
      
      // Check for error states in API cards
      const errorChips = page.locator('.MuiChip-root:has-text("Erro"), .MuiTypography-root:has-text("Erro:")');
      const errorChipCount = await errorChips.count();
      
      if (errorChipCount > 0) {
        console.log(`Found ${errorChipCount} error status indicators`);
      }
      
      // Capture error states
      await page.screenshot({ 
        path: path.join(__dirname, '..', SCREENSHOTS_DIR, '08-error-handling.png'),
        fullPage: true
      });
      
    } catch (error) {
      console.error('Error Handling Test Error:', error);
      await page.screenshot({ 
        path: path.join(__dirname, '..', SCREENSHOTS_DIR, 'error-error-handling.png'),
        fullPage: true
      });
      throw error;
    }
  });

  test('Should capture network requests for debugging', async ({ page }) => {
    const networkLogs = [];
    
    // Capture network requests
    page.on('request', request => {
      if (request.url().includes('/admin/instagram/')) {
        networkLogs.push({
          method: request.method(),
          url: request.url(),
          timestamp: new Date().toISOString()
        });
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('/admin/instagram/')) {
        networkLogs.push({
          status: response.status(),
          url: response.url(),
          timestamp: new Date().toISOString()
        });
      }
    });
    
    try {
      // Login and navigate
      await performLogin(page);
      await navigateToInstagramConfig(page);
      
      // Wait for network requests to complete
      await page.waitForTimeout(3000);
      
      // Log network activity
      console.log('Network Activity:');
      networkLogs.forEach(log => {
        console.log(`${log.timestamp}: ${log.method || 'RESPONSE'} ${log.url} ${log.status || ''}`);
      });
      
      // Save network logs
      const logsPath = path.join(__dirname, '..', SCREENSHOTS_DIR, 'network-logs.json');
      fs.writeFileSync(logsPath, JSON.stringify(networkLogs, null, 2));
      
    } catch (error) {
      console.error('Network Capture Error:', error);
      // Still save logs even if test fails
      const logsPath = path.join(__dirname, '..', SCREENSHOTS_DIR, 'network-logs-error.json');
      fs.writeFileSync(logsPath, JSON.stringify(networkLogs, null, 2));
      throw error;
    }
  });

  test('Should test migration button functionality (without executing)', async ({ page }) => {
    try {
      // Login and navigate
      await performLogin(page);
      await navigateToInstagramConfig(page);
      
      // Find migration buttons
      const migrationButtons = page.locator('button:has-text("Iniciar Migração"), button:has-text("Mudar para"), button:has-text("Ativar")');
      const buttonCount = await migrationButtons.count();
      
      console.log(`Found ${buttonCount} migration-related buttons`);
      
      // Check button states
      for (let i = 0; i < buttonCount; i++) {
        const button = migrationButtons.nth(i);
        const buttonText = await button.textContent();
        const isDisabled = await button.isDisabled();
        const isVisible = await button.isVisible();
        
        console.log(`Button "${buttonText}": visible=${isVisible}, disabled=${isDisabled}`);
      }
      
      // Test hovering over buttons (UI feedback)
      if (buttonCount > 0) {
        const firstButton = migrationButtons.first();
        if (await firstButton.isVisible() && !await firstButton.isDisabled()) {
          await firstButton.hover();
          await page.waitForTimeout(500);
          
          // Capture hover state
          await page.screenshot({ 
            path: path.join(__dirname, '..', SCREENSHOTS_DIR, '09-button-hover.png'),
            fullPage: true
          });
        }
      }
      
    } catch (error) {
      console.error('Button Functionality Error:', error);
      await page.screenshot({ 
        path: path.join(__dirname, '..', SCREENSHOTS_DIR, 'error-button-functionality.png'),
        fullPage: true
      });
      throw error;
    }
  });

  test('Should generate comprehensive debugging report', async ({ page }) => {
    const debugReport = {
      timestamp: new Date().toISOString(),
      testSuite: 'Instagram Graph API Migration',
      findings: [],
      recommendations: [],
      screenshots: [],
      networkActivity: []
    };
    
    try {
      // Login and navigate
      await performLogin(page);
      await navigateToInstagramConfig(page);
      
      // Check for main interface elements
      const elements = [
        { name: 'Instagram Title', selector: 'text=Configuração do Instagram' },
        { name: 'Migration Tab', selector: 'text=API Status & Migration' },
        { name: 'Private API Tab', selector: 'text=Private API' },
        { name: 'Graph API Tab', selector: 'text=Graph API' },
        { name: 'Current API Status', selector: '.MuiChip-root:has-text("API Atual")' },
        { name: 'Health Score', selector: 'text=Health Score' },
        { name: 'Migration Controls', selector: 'text=Controles de Migração' }
      ];
      
      for (const element of elements) {
        const isVisible = await page.locator(element.selector).isVisible({ timeout: 2000 }).catch(() => false);
        debugReport.findings.push({
          element: element.name,
          status: isVisible ? 'FOUND' : 'MISSING',
          selector: element.selector
        });
      }
      
      // Check for error states
      const errorElements = await page.locator('.MuiAlert-root[severity="error"], .MuiAlert-root:has-text("Erro")').count();
      const warningElements = await page.locator('.MuiAlert-root[severity="warning"], .MuiAlert-root:has-text("Warning")').count();
      
      debugReport.findings.push({
        element: 'Error Messages',
        status: errorElements > 0 ? `FOUND (${errorElements})` : 'NONE',
        count: errorElements
      });
      
      debugReport.findings.push({
        element: 'Warning Messages',
        status: warningElements > 0 ? `FOUND (${warningElements})` : 'NONE',
        count: warningElements
      });
      
      // Generate recommendations
      const missingElements = debugReport.findings.filter(f => f.status === 'MISSING');
      if (missingElements.length > 0) {
        debugReport.recommendations.push({
          priority: 'HIGH',
          issue: 'Missing interface elements',
          details: missingElements.map(e => e.element).join(', '),
          solution: 'Check component rendering and API responses'
        });
      }
      
      if (errorElements > 0) {
        debugReport.recommendations.push({
          priority: 'CRITICAL',
          issue: 'Error messages present',
          details: `${errorElements} error message(s) found`,
          solution: 'Investigate backend API responses and token validity'
        });
      }
      
      // Capture final state
      await page.screenshot({ 
        path: path.join(__dirname, '..', SCREENSHOTS_DIR, '10-final-state.png'),
        fullPage: true
      });
      
      debugReport.screenshots.push('10-final-state.png');
      
      // Save debugging report
      const reportPath = path.join(__dirname, '..', SCREENSHOTS_DIR, 'debug-report.json');
      fs.writeFileSync(reportPath, JSON.stringify(debugReport, null, 2));
      
      console.log('='.repeat(60));
      console.log('DEBUGGING REPORT SUMMARY');
      console.log('='.repeat(60));
      console.log(`Found Elements: ${debugReport.findings.filter(f => f.status === 'FOUND').length}`);
      console.log(`Missing Elements: ${debugReport.findings.filter(f => f.status === 'MISSING').length}`);
      console.log(`Error Messages: ${errorElements}`);
      console.log(`Warning Messages: ${warningElements}`);
      console.log(`Recommendations: ${debugReport.recommendations.length}`);
      console.log('='.repeat(60));
      
    } catch (error) {
      debugReport.findings.push({
        element: 'Test Execution',
        status: 'ERROR',
        error: error.message
      });
      
      console.error('Debug Report Error:', error);
      await page.screenshot({ 
        path: path.join(__dirname, '..', SCREENSHOTS_DIR, 'error-debug-report.png'),
        fullPage: true
      });
      
      // Save error report
      const reportPath = path.join(__dirname, '..', SCREENSHOTS_DIR, 'debug-report-error.json');
      fs.writeFileSync(reportPath, JSON.stringify(debugReport, null, 2));
      
      throw error;
    }
  });
});

// Helper Functions
async function performLogin(page) {
  try {
    // Wait for login form
    await page.waitForSelector('form', { timeout: 10000 });
    
    // Fill login credentials - look for specific field names or email input
    const usernameField = page.locator('input[type="email"], input[name="email"], input[type="text"], input[name="username"]').first();
    const passwordField = page.locator('input[type="password"], input[name="password"]').first();
    
    if (await usernameField.isVisible()) {
      await usernameField.clear();
      await usernameField.fill(TEST_CREDENTIALS.username);
    }
    
    if (await passwordField.isVisible()) {
      await passwordField.clear();
      await passwordField.fill(TEST_CREDENTIALS.password);
    }
    
    // Submit form - look for "ACESSAR SISTEMA" button or similar
    const submitButton = page.locator('button:has-text("ACESSAR SISTEMA"), button:has-text("Entrar"), button:has-text("Login"), button[type="submit"]').first();
    if (await submitButton.isVisible()) {
      await submitButton.click();
    }
    
    // Wait for navigation
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    
  } catch (error) {
    console.error('Login failed:', error);
    throw new Error(`Login failed: ${error.message}`);
  }
}

async function navigateToInstagramConfig(page) {
  try {
    // Look for Instagram Configuration link/button
    const instagramLink = page.locator('text=Instagram, text=Configuração do Instagram, a[href*="instagram"]').first();
    
    if (await instagramLink.isVisible({ timeout: 5000 })) {
      await instagramLink.click();
    } else {
      // Try navigation menu
      const menuButton = page.locator('button:has-text("Menu"), [aria-label="menu"]').first();
      if (await menuButton.isVisible({ timeout: 3000 })) {
        await menuButton.click();
        await page.waitForTimeout(500);
        
        const instagramMenuItem = page.locator('text=Instagram').first();
        if (await instagramMenuItem.isVisible({ timeout: 3000 })) {
          await instagramMenuItem.click();
        }
      }
    }
    
    // Wait for page to load
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    
  } catch (error) {
    console.error('Navigation to Instagram Config failed:', error);
    throw new Error(`Navigation failed: ${error.message}`);
  }
}