/**
 * Direct Button Test - Admin Panel Denuncias
 * 
 * This test directly accesses the denuncias list and tests button functionality
 * without complex navigation, focusing on the specific button interaction issues.
 */

import { test, expect } from '@playwright/test';

const ADMIN_CREDENTIALS = {
  email: 'admin@teste.com',
  password: '123456'
};

test.describe('Direct Admin Button Test', () => {
  test.beforeEach(async ({ page }) => {
    // Enhanced console logging to capture all activity
    page.on('console', msg => {
      console.log(`🖥️ [${msg.type().toUpperCase()}] ${msg.text()}`);
    });

    // Monitor network requests
    page.on('request', request => {
      if (request.url().includes('/admin/denuncias')) {
        console.log(`📡 [REQ] ${request.method()} ${request.url()}`);
      }
    });

    page.on('response', response => {
      if (response.url().includes('/admin/denuncias')) {
        console.log(`📡 [RES] ${response.status()} ${response.url()}`);
      }
    });

    // Capture JavaScript errors
    page.on('pageerror', error => {
      console.log(`❌ [JS-ERROR] ${error.message}`);
    });
  });

  test('Login and access denuncias directly', async ({ page }) => {
    console.log('🚀 Starting direct denuncias access test...');
    
    // Navigate to admin panel
    await page.goto('http://localhost:3007', { waitUntil: 'networkidle' });
    
    // Take initial screenshot
    await page.screenshot({ path: './test-results/direct-01-initial.png', fullPage: true });
    
    // Check if login is needed
    const needsLogin = await page.locator('input[type="email"], input[name="email"]').isVisible();
    
    if (needsLogin) {
      console.log('📝 Performing login...');
      await page.fill('input[type="email"], input[name="email"]', ADMIN_CREDENTIALS.email);
      await page.fill('input[type="password"], input[name="password"], input[name="senha"]', ADMIN_CREDENTIALS.password);
      await page.click('button[type="submit"], button:has-text("ACESSAR"), button:has-text("Login")');
      await page.waitForLoadState('networkidle');
    }
    
    // Take screenshot after login
    await page.screenshot({ path: './test-results/direct-02-after-login.png', fullPage: true });
    
    console.log('✅ Login completed, looking for denuncias...');
  });

  test('Test action buttons on current page', async ({ page }) => {
    console.log('🎯 Testing action buttons on current page...');
    
    // Navigate and login
    await page.goto('http://localhost:3007', { waitUntil: 'networkidle' });
    
    const needsLogin = await page.locator('input[type="email"], input[name="email"]').isVisible();
    if (needsLogin) {
      await page.fill('input[type="email"], input[name="email"]', ADMIN_CREDENTIALS.email);
      await page.fill('input[type="password"], input[name="password"], input[name="senha"]', ADMIN_CREDENTIALS.password);
      await page.click('button[type="submit"], button:has-text("ACESSAR"), button:has-text("Login")');
      await page.waitForLoadState('networkidle');
    }
    
    // Wait for page to fully load
    await page.waitForTimeout(3000);
    
    // Take screenshot of current state
    await page.screenshot({ path: './test-results/direct-03-current-state.png', fullPage: true });
    
    // Look for any action buttons on the current page
    console.log('🔍 Searching for action buttons...');
    
    // Try multiple selectors for buttons
    const buttonSelectors = [
      'button[aria-label*="Visualizar"]',
      'button[title*="Visualizar"]', 
      '.MuiIconButton-root',
      'button:has(svg)',
      '[data-testid*="button"]',
      'button[aria-label*="Aprovar"]',
      'button[aria-label*="Rejeitar"]',
      'button[aria-label*="Editar"]'
    ];
    
    for (const selector of buttonSelectors) {
      const buttons = await page.locator(selector).all();
      console.log(`🔍 Selector "${selector}": Found ${buttons.length} buttons`);
      
      if (buttons.length > 0) {
        // Test the first button
        const firstButton = buttons[0];
        const isVisible = await firstButton.isVisible();
        const isEnabled = await firstButton.isEnabled();
        
        console.log(`🎯 Testing button with selector "${selector}"`);
        console.log(`   - Visible: ${isVisible}`);
        console.log(`   - Enabled: ${isEnabled}`);
        
        if (isVisible && isEnabled) {
          // Take screenshot before click
          await page.screenshot({ path: `./test-results/direct-04-before-click-${selector.replace(/[^a-zA-Z0-9]/g, '_')}.png`, fullPage: true });
          
          // Monitor for modal/dialog opening
          let dialogOpened = false;
          const dialogPromise = page.waitForSelector('.MuiDialog-root, [role="dialog"], .modal', { timeout: 3000 }).then(() => {
            dialogOpened = true;
            console.log('✅ Dialog/Modal opened');
            return true;
          }).catch(() => {
            console.log('❌ No dialog/modal opened within 3 seconds');
            return false;
          });
          
          // Click the button
          console.log('🖱️ Clicking button...');
          try {
            await firstButton.click({ force: true, timeout: 5000 });
            console.log('✅ Button click executed');
          } catch (error) {
            console.log(`❌ Button click failed: ${error.message}`);
          }
          
          // Wait for potential dialog
          await dialogPromise;
          
          // Take screenshot after click
          await page.screenshot({ path: `./test-results/direct-05-after-click-${selector.replace(/[^a-zA-Z0-9]/g, '_')}.png`, fullPage: true });
          
          if (dialogOpened) {
            console.log('✅ Button interaction successful - dialog opened');
            
            // Try to close the dialog
            const closeButtons = await page.locator('button:has-text("Cancelar"), button:has-text("Fechar"), button[aria-label="close"]').all();
            if (closeButtons.length > 0) {
              await closeButtons[0].click();
              await page.waitForTimeout(1000);
            }
          } else {
            console.log('❌ Button interaction failed - no dialog opened');
          }
          
          // Only test the first working button to avoid too many screenshots
          break;
        }
      }
    }
    
    // Generate a summary of what we found
    console.log('📊 Button Test Summary:');
    for (const selector of buttonSelectors) {
      const count = await page.locator(selector).count();
      console.log(`   - ${selector}: ${count} buttons`);
    }
  });

  test('Check for DenunciationList component specifically', async ({ page }) => {
    console.log('🔍 Looking specifically for DenunciationList component...');
    
    // Navigate and login
    await page.goto('http://localhost:3007', { waitUntil: 'networkidle' });
    
    const needsLogin = await page.locator('input[type="email"], input[name="email"]').isVisible();
    if (needsLogin) {
      await page.fill('input[type="email"], input[name="email"]', ADMIN_CREDENTIALS.email);
      await page.fill('input[type="password"], input[name="password"], input[name="senha"]', ADMIN_CREDENTIALS.password);
      await page.click('button[type="submit"], button:has-text("ACESSAR"), button:has-text("Login")');
      await page.waitForLoadState('networkidle');
    }
    
    // Wait for full page load
    await page.waitForTimeout(5000);
    
    // Look for indicators of DenunciationList component
    const denunciaIndicators = [
      'text=Protocolo',
      'text=Status', 
      'text=Bairro',
      'text=Score',
      'table',
      '.MuiTable-root',
      '.MuiTableContainer-root',
      'text=Total de Denúncias',
      'text=Aguardando Moderação',
      'text=Publicadas'
    ];
    
    let foundDenunciasList = false;
    
    for (const indicator of denunciaIndicators) {
      const isVisible = await page.locator(indicator).first().isVisible().catch(() => false);
      console.log(`🔍 "${indicator}": ${isVisible ? '✅ Found' : '❌ Not found'}`);
      
      if (isVisible) {
        foundDenunciasList = true;
      }
    }
    
    // Take final screenshot
    await page.screenshot({ path: './test-results/direct-06-final-check.png', fullPage: true });
    
    // If we found the denuncias list, look for action buttons
    if (foundDenunciasList) {
      console.log('✅ DenunciationList component found! Looking for action buttons...');
      
      // Look for specific action button patterns from the code
      const actionButtonSelectors = [
        'button:has([data-testid="VisibilityIcon"])',
        'button:has([data-testid="CheckIcon"])', 
        'button:has([data-testid="CloseIcon"])',
        'button:has([data-testid="EditIcon"])',
        '.MuiIconButton-root:has(svg[data-testid="VisibilityIcon"])',
        '.MuiIconButton-root:has(svg[data-testid="CheckIcon"])',
        '.MuiIconButton-root:has(svg[data-testid="CloseIcon"])',
        '.MuiIconButton-root:has(svg[data-testid="EditIcon"])',
        '[aria-label*="Visualizar denúncia"]', 
        '[aria-label*="Aprovar denúncia"]',
        '[aria-label*="Rejeitar denúncia"]',
        '[aria-label*="Editar denúncia"]'
      ];
      
      for (const selector of actionButtonSelectors) {
        const buttons = await page.locator(selector).all();
        console.log(`🎯 Action button "${selector}": ${buttons.length} found`);
        
        if (buttons.length > 0) {
          const firstButton = buttons[0];
          
          // Test if button is clickable
          const isVisible = await firstButton.isVisible();
          const isEnabled = await firstButton.isEnabled(); 
          
          console.log(`   - Visible: ${isVisible}, Enabled: ${isEnabled}`);
          
          if (isVisible && isEnabled) {
            console.log(`🖱️ Testing button: ${selector}`);
            
            // Monitor for dialog
            let dialogOpened = false;
            const dialogPromise = page.waitForSelector('.MuiDialog-root, [role="dialog"]', { timeout: 5000 }).then(() => {
              dialogOpened = true;
              return true;
            }).catch(() => false);
            
            // Click the button
            await firstButton.click({ force: true });
            await dialogPromise;
            
            console.log(`   - Dialog opened: ${dialogOpened ? '✅ YES' : '❌ NO'}`);
            
            if (dialogOpened) {
              await page.screenshot({ path: `./test-results/direct-07-dialog-opened.png`, fullPage: true });
              
              // Close dialog
              const closeButton = await page.locator('button:has-text("Cancelar"), button:has-text("Fechar")').first();
              if (await closeButton.isVisible()) {
                await closeButton.click();
                await page.waitForTimeout(1000);
              }
            }
            
            // Only test one button to keep output manageable
            break;
          }
        }
      }
    } else {
      console.log('❌ DenunciationList component not found on current page');
    }
    
    expect(foundDenunciasList).toBe(true);
  });
});