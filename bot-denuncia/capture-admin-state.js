/**
 * Simple Admin Panel State Capture
 * 
 * Direct approach to capture the current admin panel state
 * and verify the system status.
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function captureAdminState() {
  const screenshotsDir = path.join(__dirname, 'admin-verification-screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('🔍 Accessing admin panel...');
    
    // Navigate to admin panel
    await page.goto('http://localhost:3007', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });

    // Wait for page to stabilize
    await page.waitForTimeout(3000);

    // Initial screenshot
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'current-state-1-initial.png'),
      fullPage: true 
    });
    console.log('✅ Initial state captured');

    // Check what's on the page
    const pageTitle = await page.title();
    console.log(`📄 Page title: ${pageTitle}`);

    // Look for login form
    const hasLogin = await page.locator('input[type="email"], input[name="email"]').isVisible().catch(() => false);
    console.log(`🔐 Login form visible: ${hasLogin}`);

    if (hasLogin) {
      console.log('🔑 Attempting login...');
      
      // Try different login approaches
      const emailSelectors = ['input[type="email"]', 'input[name="email"]', '#email', '[data-testid="email"]'];
      const passwordSelectors = ['input[type="password"]', 'input[name="password"]', '#password', '[data-testid="password"]'];
      
      let emailField = null;
      let passwordField = null;
      
      for (const selector of emailSelectors) {
        try {
          emailField = page.locator(selector).first();
          if (await emailField.isVisible({ timeout: 1000 })) {
            console.log(`📧 Found email field: ${selector}`);
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      for (const selector of passwordSelectors) {
        try {
          passwordField = page.locator(selector).first();
          if (await passwordField.isVisible({ timeout: 1000 })) {
            console.log(`🔒 Found password field: ${selector}`);
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (emailField && passwordField) {
        await emailField.fill('admin@teste.com');
        await passwordField.fill('123456');
        
        await page.screenshot({ 
          path: path.join(screenshotsDir, 'current-state-2-login-filled.png'),
          fullPage: true 
        });
        
        // Find and click submit button
        const submitSelectors = ['button[type="submit"]', 'input[type="submit"]', 'button:has-text("Login")', 'button:has-text("Entrar")', '.login-button', '#login-button'];
        
        for (const selector of submitSelectors) {
          try {
            const submitButton = page.locator(selector).first();
            if (await submitButton.isVisible({ timeout: 1000 })) {
              console.log(`🔄 Clicking submit: ${selector}`);
              await submitButton.click();
              break;
            }
          } catch (e) {
            continue;
          }
        }
        
        // Wait for navigation or dashboard load
        await page.waitForTimeout(5000);
        
        await page.screenshot({ 
          path: path.join(screenshotsDir, 'current-state-3-after-login.png'),
          fullPage: true 
        });
        console.log('✅ Post-login state captured');
      }
    }

    // Wait for any final loading
    await page.waitForTimeout(3000);

    // Final state capture
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'current-state-4-final.png'),
      fullPage: true 
    });

    // Capture page content
    const pageContent = await page.content();
    fs.writeFileSync(
      path.join(screenshotsDir, 'current-page-content.html'),
      pageContent,
      'utf8'
    );

    const textContent = await page.locator('body').textContent();
    fs.writeFileSync(
      path.join(screenshotsDir, 'current-text-content.txt'),
      textContent,
      'utf8'
    );

    // Look for specific elements and data
    console.log('\n🔍 Checking for key elements...');
    
    // Dashboard indicators
    const hasDashboard = await page.locator('h1, h2, h3, h4').filter({ hasText: /dashboard|painel|admin/i }).isVisible().catch(() => false);
    console.log(`📊 Dashboard elements: ${hasDashboard ? '✅' : '❌'}`);

    // Statistics
    const hasStats = await page.locator('.card, .stat, [class*="stat"]').count().catch(() => 0);
    console.log(`📈 Statistics cards: ${hasStats} found`);

    // Tables
    const hasTables = await page.locator('table').count().catch(() => 0);
    console.log(`📋 Tables found: ${hasTables}`);

    // Look for the specific complaint
    const hasSpecificComplaint = await page.locator('text=DEN-MDQQVIAF-AFP6D').isVisible().catch(() => false);
    console.log(`🔍 DEN-MDQQVIAF-AFP6D visible: ${hasSpecificComplaint ? '✅' : '❌'}`);

    // Check for any complaints/denuncias
    const complaintsCount = await page.locator('text=/DEN-[A-Z0-9-]+/').count().catch(() => 0);
    console.log(`📄 Complaint codes found: ${complaintsCount}`);

    // Look for agenda/schedule
    const hasAgenda = await page.locator('text=/agenda|schedule|postag/i').isVisible().catch(() => false);
    console.log(`📅 Agenda elements: ${hasAgenda ? '✅' : '❌'}`);

    console.log(`\n✅ Capture completed! Screenshots saved to: ${screenshotsDir}`);

  } catch (error) {
    console.error('❌ Error during capture:', error);
    
    // Emergency screenshot
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'error-emergency-capture.png'),
      fullPage: true 
    }).catch(() => {});
  } finally {
    await browser.close();
  }
}

captureAdminState().catch(console.error);