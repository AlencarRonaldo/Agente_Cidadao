/**
 * DEBUG SCRIPT: Test Admin Panel Action Buttons
 * 
 * This script tests the admin panel action buttons to identify the root cause
 * of the button click failures.
 */

const puppeteer = require('puppeteer');

async function debugAdminActions() {
  let browser;
  
  try {
    console.log('🚀 Starting admin panel debug session...');
    
    browser = await puppeteer.launch({
      headless: false, // Show browser for debugging
      devtools: true,  // Open devtools
      slowMo: 250,     // Slow down actions for visibility
      args: ['--disable-web-security'] // Disable CORS for testing
    });
    
    const page = await browser.newPage();
    
    // Enable console logging
    page.on('console', msg => {
      console.log(`🖥️ BROWSER: ${msg.type()}: ${msg.text()}`);
    });
    
    // Enable error logging
    page.on('pageerror', err => {
      console.error(`❌ PAGE ERROR: ${err.message}`);
    });
    
    // Enable request/response logging
    page.on('request', request => {
      if (request.url().includes('admin')) {
        console.log(`📤 REQUEST: ${request.method()} ${request.url()}`);
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('admin')) {
        console.log(`📥 RESPONSE: ${response.status()} ${response.url()}`);
      }
    });
    
    // Navigate to admin panel
    console.log('🌐 Navigating to admin panel...');
    await page.goto('http://localhost:3007', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Wait for login form
    await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10000 });
    
    // Login with admin credentials
    console.log('🔐 Attempting login...');
    await page.type('input[type="email"], input[name="email"]', 'admin@exemplo.com');
    await page.type('input[type="password"], input[name="password"]', 'senha123');
    
    // Click login button
    await page.click('button[type="submit"], button:contains("Entrar")');
    
    // Wait for dashboard to load
    await page.waitForTimeout(3000);
    
    // Check if we're on the dashboard
    const currentUrl = page.url();
    console.log(`📍 Current URL: ${currentUrl}`);
    
    // Navigate to denunciation list if not already there
    if (!currentUrl.includes('denunciation')) {
      console.log('📋 Navigating to denunciation list...');
      // Look for denunciation menu item and click it
      try {
        await page.waitForSelector('a[href*="denunciation"], button:contains("Denúncias")', { timeout: 5000 });
        await page.click('a[href*="denunciation"], button:contains("Denúncias")');
        await page.waitForTimeout(2000);
      } catch (error) {
        console.log('⚠️ Could not find denunciation menu, looking for table...');
      }
    }
    
    // Wait for denunciation table to load
    console.log('⏳ Waiting for denunciation table...');
    await page.waitForSelector('table, .MuiTable-root', { timeout: 15000 });
    
    const tableExists = await page.$('table, .MuiTable-root');
    if (!tableExists) {
      throw new Error('Denunciation table not found');
    }
    
    console.log('✅ Denunciation table found');
    
    // Look for action buttons
    console.log('🔍 Looking for action buttons...');
    
    // Test each action button type
    const buttonTests = [
      { selector: 'button[aria-label*="Visualizar"], .MuiIconButton-root:has(svg[data-testid="VisibilityIcon"])', action: 'View' },
      { selector: 'button[aria-label*="Aprovar"], .MuiIconButton-root:has(svg[data-testid="CheckIcon"])', action: 'Approve' },
      { selector: 'button[aria-label*="Rejeitar"], .MuiIconButton-root:has(svg[data-testid="CloseIcon"])', action: 'Reject' },
      { selector: 'button[aria-label*="Editar"], .MuiIconButton-root:has(svg[data-testid="EditIcon"])', action: 'Edit' }
    ];
    
    for (const test of buttonTests) {
      try {
        console.log(`🎯 Testing ${test.action} button...`);
        
        const buttons = await page.$$(test.selector);
        console.log(`📊 Found ${buttons.length} ${test.action} buttons`);
        
        if (buttons.length > 0) {
          // Test first button
          const button = buttons[0];
          
          // Check if button is visible and enabled
          const isVisible = await button.isIntersectingViewport();
          const isEnabled = await page.evaluate(btn => !btn.disabled, button);
          
          console.log(`🔍 ${test.action} button - Visible: ${isVisible}, Enabled: ${isEnabled}`);
          
          if (isVisible && isEnabled) {
            console.log(`🖱️ Clicking ${test.action} button...`);
            
            // Add event listeners before clicking
            await page.evaluate(() => {
              console.log('🎧 Adding event listeners for debugging...');
              document.addEventListener('click', (e) => {
                if (e.target.closest('button')) {
                  console.log('🖱️ Button clicked:', e.target.closest('button').getAttribute('aria-label') || 'No aria-label');
                }
              });
            });
            
            await button.click();
            await page.waitForTimeout(2000); // Wait for any response
            
            // Check if dialog opened
            const dialogOpen = await page.$('.MuiDialog-root, [role="dialog"]');
            console.log(`📝 Dialog opened after ${test.action}: ${!!dialogOpen}`);
          }
        }
        
      } catch (error) {
        console.error(`❌ Error testing ${test.action} button:`, error.message);
      }
    }
    
    // Keep browser open for manual inspection
    console.log('🔍 Browser will stay open for manual inspection...');
    console.log('⏱️ Waiting 30 seconds before closing...');
    
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error('❌ Debug session failed:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the debug session
debugAdminActions().catch(console.error);