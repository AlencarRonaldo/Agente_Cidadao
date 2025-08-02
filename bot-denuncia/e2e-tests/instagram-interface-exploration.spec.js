/**
 * Instagram Interface Exploration Test
 * 
 * Teste exploratório para mapear a interface do admin panel
 * e encontrar onde estão os controles de configuração do Instagram
 */

const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

// Configuration
const ADMIN_URL = 'http://localhost:3001';
const SCREENSHOTS_DIR = 'test-results/interface-exploration';
const TEST_TIMEOUT = 90000;

// Credentials
const TEST_CREDENTIALS = {
  username: 'admin@teste.com',
  password: '123456'
};

test.describe('Interface Exploration', () => {
  
  test.beforeEach(async ({ page }) => {
    // Create screenshots directory
    const screenshotsPath = path.join(__dirname, '..', SCREENSHOTS_DIR);
    if (!fs.existsSync(screenshotsPath)) {
      fs.mkdirSync(screenshotsPath, { recursive: true });
    }

    test.setTimeout(TEST_TIMEOUT);
    
    // Navigate to admin panel
    await page.goto(ADMIN_URL);
    await page.waitForLoadState('networkidle');
  });

  test('Should explore the entire interface to find Instagram configuration', async ({ page }) => {
    const report = {
      timestamp: new Date().toISOString(),
      findings: [],
      navigation: [],
      screenshots: []
    };

    try {
      // Step 1: Login
      console.log('🔐 Performing login...');
      await performLogin(page);
      
      // Capture post-login state
      await page.screenshot({ 
        path: path.join(__dirname, '..', SCREENSHOTS_DIR, '01-post-login.png'),
        fullPage: true
      });
      report.screenshots.push('01-post-login.png');

      // Step 2: Look for navigation elements
      console.log('🔍 Searching for navigation elements...');
      
      // Check for sidebar menu
      const sidebarElements = await page.locator('nav, .sidebar, [role="navigation"], .menu').all();
      console.log(`Found ${sidebarElements.length} navigation elements`);
      
      // Check for top navigation
      const topNavElements = await page.locator('header nav, .top-nav, .navbar').all();
      console.log(`Found ${topNavElements.length} top navigation elements`);
      
      // Check for any menu buttons
      const menuButtons = await page.locator('button:has-text("Menu"), button[aria-label*="menu"], .menu-button, .hamburger').all();
      console.log(`Found ${menuButtons.length} menu buttons`);
      
      // Step 3: Look for Instagram-related links anywhere on the page
      console.log('📸 Searching for Instagram-related elements...');
      
      const instagramElements = await page.locator('text=/Instagram/i').or(page.locator('[href*="instagram"]')).or(page.locator('.instagram')).or(page.locator('#instagram')).all();
      console.log(`Found ${instagramElements.length} Instagram-related elements`);
      
      for (let i = 0; i < instagramElements.length; i++) {
        const element = instagramElements[i];
        const text = await element.textContent().catch(() => 'N/A');
        const href = await element.getAttribute('href').catch(() => null);
        console.log(`Instagram element ${i + 1}: "${text}" ${href ? `(href: ${href})` : ''}`);
        report.findings.push({
          type: 'instagram-element',
          index: i + 1,
          text: text,
          href: href
        });
      }
      
      // Step 4: Look for configuration-related links
      console.log('⚙️ Searching for configuration-related elements...');
      
      const configElements = await page.locator('text=/configura/i').or(page.locator('text=/config/i')).or(page.locator('text=/settings/i')).or(page.locator('text=/ajustes/i')).all();
      console.log(`Found ${configElements.length} configuration-related elements`);
      
      for (let i = 0; i < configElements.length; i++) {
        const element = configElements[i];
        const text = await element.textContent().catch(() => 'N/A');
        console.log(`Config element ${i + 1}: "${text}"`);
        report.findings.push({
          type: 'config-element',
          index: i + 1,
          text: text
        });
      }
      
      // Step 5: Try clicking on menu buttons to reveal hidden navigation
      if (menuButtons.length > 0) {
        console.log('🔘 Trying to open menus...');
        
        for (let i = 0; i < menuButtons.length; i++) {
          try {
            const menuButton = menuButtons[i];
            const isVisible = await menuButton.isVisible();
            
            if (isVisible) {
              console.log(`Clicking menu button ${i + 1}...`);
              await menuButton.click();
              await page.waitForTimeout(1000);
              
              // Capture state after menu click
              await page.screenshot({ 
                path: path.join(__dirname, '..', SCREENSHOTS_DIR, `02-menu-${i + 1}-opened.png`),
                fullPage: true
              });
              report.screenshots.push(`02-menu-${i + 1}-opened.png`);
              
              // Look for Instagram options in the opened menu
              const instagramInMenu = await page.locator('text=/Instagram/i').all();
              console.log(`Found ${instagramInMenu.length} Instagram elements in menu ${i + 1}`);
              
              // Try to close menu
              await page.keyboard.press('Escape');
              await page.waitForTimeout(500);
            }
          } catch (error) {
            console.log(`Error with menu button ${i + 1}:`, error.message);
          }
        }
      }
      
      // Step 6: Look for user profile menu or admin options
      console.log('👤 Searching for user/admin menus...');
      
      const userMenus = await page.locator('[aria-label*="user"], [aria-label*="admin"], .user-menu, .profile-menu, text="Admin Teste"').all();
      console.log(`Found ${userMenus.length} user menu elements`);
      
      for (let i = 0; i < userMenus.length; i++) {
        try {
          const userMenu = userMenus[i];
          const isVisible = await userMenu.isVisible();
          
          if (isVisible) {
            console.log(`Clicking user menu ${i + 1}...`);
            await userMenu.click();
            await page.waitForTimeout(1000);
            
            // Capture state after user menu click
            await page.screenshot({ 
              path: path.join(__dirname, '..', SCREENSHOTS_DIR, `03-user-menu-${i + 1}.png`),
              fullPage: true
            });
            report.screenshots.push(`03-user-menu-${i + 1}.png`);
            
            // Look for Instagram options in user menu
            const instagramInUserMenu = await page.locator('text=/Instagram/i').all();
            console.log(`Found ${instagramInUserMenu.length} Instagram elements in user menu ${i + 1}`);
            
            // Try to close menu
            await page.keyboard.press('Escape');
            await page.waitForTimeout(500);
          }
        } catch (error) {
          console.log(`Error with user menu ${i + 1}:`, error.message);
        }
      }
      
      // Step 7: Look for direct URL access
      console.log('🔗 Trying direct URL access...');
      
      const instagramUrls = [
        '/instagram',
        '/config/instagram',
        '/admin/instagram',
        '/settings/instagram',
        '/configuracao/instagram'
      ];
      
      for (const url of instagramUrls) {
        try {
          console.log(`Trying URL: ${url}`);
          await page.goto(ADMIN_URL + url);
          await page.waitForTimeout(2000);
          
          const currentUrl = page.url();
          const hasInstagramContent = await page.locator('text=/Instagram/i').count() > 0;
          
          console.log(`URL ${url}: redirected to ${currentUrl}, has Instagram content: ${hasInstagramContent}`);
          
          report.navigation.push({
            attemptedUrl: url,
            finalUrl: currentUrl,
            hasInstagramContent: hasInstagramContent
          });
          
          if (hasInstagramContent) {
            await page.screenshot({ 
              path: path.join(__dirname, '..', SCREENSHOTS_DIR, `04-direct-access-${url.replace(/\//g, '_')}.png`),
              fullPage: true
            });
            report.screenshots.push(`04-direct-access-${url.replace(/\//g, '_')}.png`);
            
            // Look for migration controls on this page
            const migrationControls = await page.locator('text=/migra/i, text=/Graph API/i, text=/Private API/i').all();
            console.log(`Found ${migrationControls.length} migration-related elements on ${url}`);
            
            if (migrationControls.length > 0) {
              console.log('🎯 Found migration controls! Capturing detailed screenshot...');
              await page.screenshot({ 
                path: path.join(__dirname, '..', SCREENSHOTS_DIR, '05-migration-controls-found.png'),
                fullPage: true
              });
              report.screenshots.push('05-migration-controls-found.png');
              
              // Test the controls
              await testMigrationControls(page, report);
            }
          }
          
          // Go back to main dashboard
          await page.goto(ADMIN_URL);
          await page.waitForTimeout(1000);
          
        } catch (error) {
          console.log(`Error accessing ${url}:`, error.message);
          report.navigation.push({
            attemptedUrl: url,
            error: error.message
          });
        }
      }
      
      // Step 8: Check all clickable elements for hidden Instagram access
      console.log('🖱️ Checking all clickable elements...');
      
      await page.goto(ADMIN_URL);
      await page.waitForTimeout(2000);
      
      const clickableElements = await page.locator('a, button, [role="button"], .clickable').all();
      console.log(`Found ${clickableElements.length} clickable elements`);
      
      // Check first 20 clickable elements for Instagram-related content
      const elementsToCheck = Math.min(clickableElements.length, 20);
      
      for (let i = 0; i < elementsToCheck; i++) {
        try {
          const element = clickableElements[i];
          const text = await element.textContent().catch(() => '');
          const href = await element.getAttribute('href').catch(() => null);
          
          if (text.toLowerCase().includes('instagram') || 
              text.toLowerCase().includes('config') ||
              text.toLowerCase().includes('settings') ||
              href?.includes('instagram')) {
            
            console.log(`Potentially relevant clickable element ${i + 1}: "${text}" ${href ? `(href: ${href})` : ''}`);
            report.findings.push({
              type: 'clickable-element',
              index: i + 1,
              text: text,
              href: href
            });
          }
        } catch (error) {
          // Ignore individual element errors
        }
      }
      
      // Final capture
      await page.screenshot({ 
        path: path.join(__dirname, '..', SCREENSHOTS_DIR, '06-exploration-complete.png'),
        fullPage: true
      });
      report.screenshots.push('06-exploration-complete.png');
      
      // Save exploration report
      const reportPath = path.join(__dirname, '..', SCREENSHOTS_DIR, 'exploration-report.json');
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      
      console.log('🎉 Exploration complete! Check the report and screenshots.');
      console.log(`📊 Found ${report.findings.length} relevant elements`);
      console.log(`📸 Captured ${report.screenshots.length} screenshots`);
      console.log(`🔗 Tried ${report.navigation.length} navigation attempts`);
      
    } catch (error) {
      console.error('❌ Exploration failed:', error);
      await page.screenshot({ 
        path: path.join(__dirname, '..', SCREENSHOTS_DIR, 'exploration-error.png'),
        fullPage: true
      });
      throw error;
    }
  });
});

// Helper Functions
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

async function testMigrationControls(page, report) {
  try {
    console.log('🧪 Testing migration controls...');
    
    // Look for tabs
    const tabs = await page.locator('[role="tab"], .MuiTab-root, .tab').all();
    console.log(`Found ${tabs.length} tabs`);
    
    for (let i = 0; i < tabs.length; i++) {
      const tab = tabs[i];
      const tabText = await tab.textContent().catch(() => '');
      console.log(`Tab ${i + 1}: "${tabText}"`);
      
      if (tabText.toLowerCase().includes('api') || 
          tabText.toLowerCase().includes('migration') ||
          tabText.toLowerCase().includes('graph')) {
        
        console.log(`Clicking relevant tab: "${tabText}"`);
        await tab.click();
        await page.waitForTimeout(2000);
        
        await page.screenshot({ 
          path: path.join(__dirname, '..', SCREENSHOTS_DIR, `07-tab-${i + 1}-${tabText.replace(/\W/g, '_').toLowerCase()}.png`),
          fullPage: true
        });
        
        // Look for migration buttons
        const migrationButtons = await page.locator('button:has-text("Migra"), button:has-text("Graph"), button:has-text("Private"), button:has-text("Ativar")').all();
        console.log(`Found ${migrationButtons.length} migration buttons in tab "${tabText}"`);
        
        report.findings.push({
          type: 'migration-tab',
          tabText: tabText,
          migrationButtons: migrationButtons.length
        });
      }
    }
    
    // Look for current API status
    const apiStatusElements = await page.locator('text=/API Atual/i, text=/Current API/i, .api-status').all();
    console.log(`Found ${apiStatusElements.length} API status indicators`);
    
    for (let i = 0; i < apiStatusElements.length; i++) {
      const element = apiStatusElements[i];
      const text = await element.textContent().catch(() => '');
      console.log(`API status ${i + 1}: "${text}"`);
      report.findings.push({
        type: 'api-status',
        text: text
      });
    }
    
  } catch (error) {
    console.log('Error testing migration controls:', error.message);
  }
}