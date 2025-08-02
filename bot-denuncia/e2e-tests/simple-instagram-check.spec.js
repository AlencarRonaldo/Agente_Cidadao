/**
 * Simple Instagram Interface Check
 * 
 * Teste simples para verificar onde está a configuração do Instagram
 */

const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

// Configuration
const ADMIN_URL = 'http://localhost:3001';
const SCREENSHOTS_DIR = 'test-results/simple-check';

// Credentials
const TEST_CREDENTIALS = {
  username: 'admin@teste.com',
  password: '123456'
};

test.describe('Simple Instagram Check', () => {
  
  test.beforeEach(async ({ page }) => {
    // Create screenshots directory
    const screenshotsPath = path.join(__dirname, '..', SCREENSHOTS_DIR);
    if (!fs.existsSync(screenshotsPath)) {
      fs.mkdirSync(screenshotsPath, { recursive: true });
    }

    // Navigate and login
    await page.goto(ADMIN_URL);
    await performLogin(page);
    
    // Capture post-login state
    await page.screenshot({ 
      path: path.join(__dirname, '..', SCREENSHOTS_DIR, '01-dashboard.png'),
      fullPage: true
    });
  });

  test('Should find Instagram configuration through direct access', async ({ page }) => {
    const results = {
      timestamp: new Date().toISOString(),
      directUrlTests: [],
      elementsFound: [],
      screenshots: []
    };

    console.log('🔍 Testing direct URL access...');
    
    // List of potential Instagram URLs
    const testUrls = [
      '',  // dashboard
      '/instagram',
      '/admin/instagram', 
      '/config/instagram',
      '/settings/instagram',
      '/configuracao/instagram',
      '/instagram-config',
      '/instagram/config',
      '/api/admin/instagram',
      '#instagram',
      '#config'
    ];

    for (let i = 0; i < testUrls.length; i++) {
      const urlPath = testUrls[i];
      const fullUrl = urlPath.startsWith('#') ? ADMIN_URL + '/' + urlPath : ADMIN_URL + urlPath;
      
      try {
        console.log(`📍 Testing URL: ${fullUrl}`);
        
        await page.goto(fullUrl);
        await page.waitForTimeout(2000);
        
        const currentUrl = page.url();
        const pageTitle = await page.title();
        
        // Look for Instagram-related content
        const instagramCount = await page.locator('text=/Instagram/i').count();
        const graphApiCount = await page.locator('text=/Graph.*API/i').count();
        const migrationCount = await page.locator('text=/migra/i').count();
        const privateApiCount = await page.locator('text=/Private.*API/i').count();
        const configCount = await page.locator('text=/config/i').count();
        
        // Check for specific elements we're looking for
        const hasInstagramTitle = await page.locator('text=Configuração do Instagram').count() > 0;
        const hasMigrationTab = await page.locator('text=API Status & Migration').count() > 0;
        const hasGraphApiTab = await page.locator('text=Graph API').count() > 0;
        const hasPrivateApiTab = await page.locator('text=Private API').count() > 0;
        
        const testResult = {
          attemptedUrl: urlPath,
          finalUrl: currentUrl,
          pageTitle: pageTitle,
          hasInstagramContent: instagramCount > 0,
          instagramCount: instagramCount,
          graphApiCount: graphApiCount,
          migrationCount: migrationCount,
          privateApiCount: privateApiCount,
          configCount: configCount,
          hasInstagramTitle: hasInstagramTitle,
          hasMigrationTab: hasMigrationTab,
          hasGraphApiTab: hasGraphApiTab,
          hasPrivateApiTab: hasPrivateApiTab
        };
        
        results.directUrlTests.push(testResult);
        
        // If we found Instagram content, take a screenshot
        if (instagramCount > 0 || graphApiCount > 0 || migrationCount > 0) {
          const screenshotName = `url-test-${i + 1}-${urlPath.replace(/[^\w]/g, '_')}.png`;
          await page.screenshot({ 
            path: path.join(__dirname, '..', SCREENSHOTS_DIR, screenshotName),
            fullPage: true
          });
          results.screenshots.push(screenshotName);
          
          console.log(`✅ Found Instagram content at ${urlPath}!`);
          console.log(`   - Instagram elements: ${instagramCount}`);
          console.log(`   - Graph API elements: ${graphApiCount}`);
          console.log(`   - Migration elements: ${migrationCount}`);
          console.log(`   - Has Instagram title: ${hasInstagramTitle}`);
          console.log(`   - Has migration tab: ${hasMigrationTab}`);
        }
        
      } catch (error) {
        console.log(`❌ Error testing ${urlPath}: ${error.message}`);
        results.directUrlTests.push({
          attemptedUrl: urlPath,
          error: error.message
        });
      }
    }
    
    // Go back to main dashboard and look for clickable elements
    console.log('🖱️ Searching for clickable elements on dashboard...');
    await page.goto(ADMIN_URL);
    await page.waitForTimeout(2000);
    
    // Get all text content on the page
    const allText = await page.textContent('body');
    console.log('📄 Page contains Instagram-related text:', allText.toLowerCase().includes('instagram'));
    
    // Look for specific clickable elements
    const clickableSelectors = [
      'a', 
      'button', 
      '[role="button"]',
      '.clickable',
      '[onclick]',
      'li',
      '.menu-item',
      '.nav-item'
    ];
    
    for (const selector of clickableSelectors) {
      const elements = await page.locator(selector).all();
      
      for (let i = 0; i < Math.min(elements.length, 50); i++) {  // Limit to first 50 elements
        try {
          const element = elements[i];
          const text = await element.textContent();
          const href = await element.getAttribute('href');
          
          if (text && (
            text.toLowerCase().includes('instagram') ||
            text.toLowerCase().includes('config') ||
            text.toLowerCase().includes('settings') ||
            text.toLowerCase().includes('ajustes') ||
            text.toLowerCase().includes('social')
          )) {
            results.elementsFound.push({
              selector: selector,
              text: text,
              href: href
            });
            console.log(`🎯 Found relevant element: "${text}" (${href || 'no href'})`);
          }
        } catch (error) {
          // Ignore individual element errors
        }
      }
    }
    
    // Check if there are any icons that might be Instagram-related
    const iconElements = await page.locator('[class*="icon"], svg, img[alt*="instagram"], [aria-label*="instagram"]').all();
    console.log(`🎨 Found ${iconElements.length} potential icon elements`);
    
    // Final screenshot of dashboard
    await page.screenshot({ 
      path: path.join(__dirname, '..', SCREENSHOTS_DIR, '99-final-dashboard.png'),
      fullPage: true
    });
    results.screenshots.push('99-final-dashboard.png');
    
    // Save results
    const reportPath = path.join(__dirname, '..', SCREENSHOTS_DIR, 'simple-check-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    
    // Summary
    const foundUrls = results.directUrlTests.filter(r => r.hasInstagramContent).length;
    const foundElements = results.elementsFound.length;
    
    console.log('📊 SUMMARY:');
    console.log(`   URLs with Instagram content: ${foundUrls}`);
    console.log(`   Relevant clickable elements: ${foundElements}`);
    console.log(`   Screenshots taken: ${results.screenshots.length}`);
    
    // At least we should find some Instagram-related content somewhere
    expect(foundUrls + foundElements).toBeGreaterThan(0);
  });
});

// Helper function
async function performLogin(page) {
  try {
    await page.waitForSelector('form', { timeout: 10000 });
    
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
    
    const submitButton = page.locator('button:has-text("ACESSAR SISTEMA"), button:has-text("Entrar"), button:has-text("Login"), button[type="submit"]').first();
    if (await submitButton.isVisible()) {
      await submitButton.click();
    }
    
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    
  } catch (error) {
    throw new Error(`Login failed: ${error.message}`);
  }
}