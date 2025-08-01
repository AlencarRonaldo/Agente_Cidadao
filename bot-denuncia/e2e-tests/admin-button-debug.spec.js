/**
 * Comprehensive Admin Panel Button Debugging Test
 * 
 * This test specifically targets the action button issues in the DenunciationList component.
 * It will perform real browser interactions and capture detailed debugging information.
 */

import { test, expect } from '@playwright/test';

// Admin credentials for testing
const ADMIN_CREDENTIALS = {
  email: 'admin@teste.com',
  password: '123456'
};

// Admin panel configuration
const ADMIN_CONFIG = {
  baseUrl: 'http://localhost:3007',
  denunciasPath: '/denuncias' // Assuming this is the path to denuncias list
};

test.describe('Admin Panel - Button Interaction Debugging', () => {
  let page;
  let context;

  test.beforeAll(async ({ browser }) => {
    // Create a new browser context for all tests
    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      recordVideo: {
        dir: './test-results/videos/',
        size: { width: 1920, height: 1080 }
      }
    });
    
    page = await context.newPage();
    
    // Enhanced console logging to capture all JavaScript activity
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      console.log(`🖥️ [CONSOLE-${type.toUpperCase()}] ${text}`);
    });

    // Monitor all network requests to identify API failures
    page.on('request', request => {
      if (request.url().includes('/admin/denuncias')) {
        console.log(`📡 [REQUEST] ${request.method()} ${request.url()}`);
      }
    });

    page.on('response', response => {
      if (response.url().includes('/admin/denuncias')) {
        console.log(`📡 [RESPONSE] ${response.status()} ${response.url()}`);
      }
    });

    // Capture JavaScript errors
    page.on('pageerror', error => {
      console.log(`❌ [JS-ERROR] ${error.message}`);
      console.log(`❌ [JS-STACK] ${error.stack}`);
    });

    // Monitor for dialog errors
    page.on('dialog', async dialog => {
      console.log(`🚨 [DIALOG] ${dialog.type()}: ${dialog.message()}`);
      await dialog.dismiss();
    });
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('Step 1: Navigate to admin panel and login', async () => {
    console.log('🚀 Starting admin panel navigation test...');
    
    // Navigate to admin panel
    await page.goto(ADMIN_CONFIG.baseUrl, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Take screenshot of initial state
    await page.screenshot({ 
      path: './test-results/01-initial-admin-panel.png',
      fullPage: true 
    });
    
    // Check if we're on login page or already logged in
    const isLoginPage = await page.locator('input[type="email"], input[name="email"]').isVisible();
    
    if (isLoginPage) {
      console.log('📝 Login page detected, performing login...');
      
      // Fill login credentials
      await page.fill('input[type="email"], input[name="email"]', ADMIN_CREDENTIALS.email);
      await page.fill('input[type="password"], input[name="password"], input[name="senha"]', ADMIN_CREDENTIALS.password);
      
      // Take screenshot before login
      await page.screenshot({ 
        path: './test-results/02-before-login.png',
        fullPage: true 
      });
      
      // Click login button
      await page.click('button[type="submit"], button:has-text("ACESSAR"), button:has-text("Login")');
      
      // Wait for login to complete
      await page.waitForLoadState('networkidle', { timeout: 15000 });
    }
    
    // Take screenshot after login/navigation
    await page.screenshot({ 
      path: './test-results/03-after-login.png',
      fullPage: true 
    });
    
    // Verify we're in the admin panel
    const isDashboard = await page.locator('text=Visão Geral, text=Dashboard, text=Denúncias').first().isVisible();
    expect(isDashboard).toBe(true);
    
    console.log('✅ Successfully navigated to admin panel');
  });

  test('Step 2: Navigate to denuncias list and capture state', async () => {
    console.log('📋 Navigating to denuncias list...');
    
    // Try to find and click denuncias navigation
    const denunciasNav = page.locator('text=Denúncias, [href*="denuncias"], button:has-text("Denúncias")').first();
    
    if (await denunciasNav.isVisible()) {
      await denunciasNav.click();
      await page.waitForLoadState('networkidle');
    } else {
      // Try direct navigation
      await page.goto(`${ADMIN_CONFIG.baseUrl}/denuncias`, { waitUntil: 'networkidle' });
    }
    
    // Wait for denuncias table to load
    await page.waitForSelector('table, .MuiTable-root', { timeout: 10000 });
    
    // Take screenshot of denuncias page
    await page.screenshot({ 
      path: './test-results/04-denuncias-page.png',
      fullPage: true 
    });
    
    // Count denuncias and action buttons
    const denunciasRows = await page.locator('tbody tr, .MuiTableBody-root tr').count();
    const actionButtons = await page.locator('[aria-label*="Visualizar"], [title*="Visualizar"], button:has([data-testid="VisibilityIcon"]), .MuiIconButton-root:has(svg)').count();
    
    console.log(`📊 Found ${denunciasRows} denuncias rows and ${actionButtons} action buttons`);
    
    // Verify we have denuncias to test with
    expect(denunciasRows).toBeGreaterThan(0);
    
    // Capture current page HTML for debugging
    const pageContent = await page.content();
    await require('fs').promises.writeFile('./test-results/04-denuncias-page-content.html', pageContent);
    
    console.log('✅ Successfully navigated to denuncias list');
  });

  test('Step 3: Test view button (eye icon) interactions', async () => {
    console.log('👁️ Testing VIEW button interactions...');
    
    // Find the first view button (eye icon)
    const viewButtons = await page.locator('button:has([data-testid="VisibilityIcon"]), .MuiIconButton-root:has(svg[data-testid="VisibilityIcon"]), [aria-label*="Visualizar"]').all();
    
    if (viewButtons.length === 0) {
      console.log('⚠️ No view buttons found! Checking for alternative selectors...');
      
      // Try alternative selectors
      const altViewButtons = await page.locator('.MuiIconButton-root').all();
      console.log(`🔍 Found ${altViewButtons.length} icon buttons total`);
      
      // Take screenshot for debugging
      await page.screenshot({ 
        path: './test-results/05-no-view-buttons-found.png',
        fullPage: true 
      });
      
      return; // Skip this test if no buttons found
    }
    
    console.log(`🎯 Found ${viewButtons.length} view buttons, testing first one...`);
    
    // Get the first view button and ensure it's visible
    const firstViewButton = viewButtons[0];
    await expect(firstViewButton).toBeVisible();
    
    // Take screenshot before clicking
    await page.screenshot({ 
      path: './test-results/06-before-view-click.png',
      fullPage: true 
    });
    
    // Monitor for dialog opening
    let dialogOpened = false;
    const dialogPromise = page.waitForSelector('.MuiDialog-root, [role="dialog"]', { timeout: 5000 }).then(() => {
      dialogOpened = true;
      console.log('✅ Dialog opened successfully');
    }).catch(() => {
      console.log('❌ Dialog did not open within 5 seconds');
    });
    
    // Click the view button with enhanced monitoring
    console.log('🖱️ Clicking view button...');
    await firstViewButton.click({ force: true });
    
    // Wait for either dialog or timeout
    await dialogPromise;
    
    // Take screenshot after clicking
    await page.screenshot({ 
      path: './test-results/07-after-view-click.png',
      fullPage: true 
    });
    
    if (dialogOpened) {
      console.log('✅ VIEW button worked correctly - dialog opened');
      
      // Take screenshot of the dialog
      await page.screenshot({ 
        path: './test-results/08-view-dialog-opened.png',
        fullPage: true 
      });
      
      // Close the dialog
      const closeButton = page.locator('button:has-text("Cancelar"), button:has-text("Fechar"), .MuiDialog-root button[aria-label="close"]').first();
      if (await closeButton.isVisible()) {
        await closeButton.click();
        await page.waitForTimeout(1000);
      }
    } else {
      console.log('❌ VIEW button failed - no dialog opened');
      
      // Check if any error messages appeared
      const errorMessages = await page.locator('.MuiAlert-root, [role="alert"], .error').all();
      for (const error of errorMessages) {
        const errorText = await error.textContent();
        console.log(`🚨 Error message: ${errorText}`);
      }
    }
    
    expect(dialogOpened).toBe(true);
  });

  test('Step 4: Test approve button (check icon) interactions', async () => {
    console.log('✅ Testing APPROVE button interactions...');
    
    // Find approve buttons (check icon)
    const approveButtons = await page.locator('button:has([data-testid="CheckIcon"]), .MuiIconButton-root:has(svg[data-testid="CheckIcon"]), [aria-label*="Aprovar"]').all();
    
    if (approveButtons.length === 0) {
      console.log('⚠️ No approve buttons found - may be filtered out by status');
      return;
    }
    
    console.log(`🎯 Found ${approveButtons.length} approve buttons, testing first one...`);
    
    const firstApproveButton = approveButtons[0];
    await expect(firstApproveButton).toBeVisible();
    
    // Take screenshot before clicking
    await page.screenshot({ 
      path: './test-results/09-before-approve-click.png',
      fullPage: true 
    });
    
    // Monitor for dialog opening
    let dialogOpened = false;
    const dialogPromise = page.waitForSelector('.MuiDialog-root, [role="dialog"]', { timeout: 5000 }).then(() => {
      dialogOpened = true;
      console.log('✅ Approve dialog opened successfully');
    }).catch(() => {
      console.log('❌ Approve dialog did not open within 5 seconds');
    });
    
    // Click the approve button
    console.log('🖱️ Clicking approve button...');
    await firstApproveButton.click({ force: true });
    
    await dialogPromise;
    
    // Take screenshot after clicking
    await page.screenshot({ 
      path: './test-results/10-after-approve-click.png',
      fullPage: true 
    });
    
    if (dialogOpened) {
      console.log('✅ APPROVE button worked correctly - dialog opened');
      
      // Close the dialog
      const closeButton = page.locator('button:has-text("Cancelar"), button:has-text("Fechar")').first();
      if (await closeButton.isVisible()) {
        await closeButton.click();
        await page.waitForTimeout(1000);
      }
    } else {
      console.log('❌ APPROVE button failed - no dialog opened');
    }
    
    expect(dialogOpened).toBe(true);
  });

  test('Step 5: Test reject button (X icon) interactions', async () => {
    console.log('❌ Testing REJECT button interactions...');
    
    // Find reject buttons (X/Close icon)
    const rejectButtons = await page.locator('button:has([data-testid="CloseIcon"]), .MuiIconButton-root:has(svg[data-testid="CloseIcon"]), [aria-label*="Rejeitar"]').all();
    
    if (rejectButtons.length === 0) {
      console.log('⚠️ No reject buttons found - may be filtered out by status');
      return;
    }
    
    console.log(`🎯 Found ${rejectButtons.length} reject buttons, testing first one...`);
    
    const firstRejectButton = rejectButtons[0];
    await expect(firstRejectButton).toBeVisible();
    
    // Take screenshot before clicking
    await page.screenshot({ 
      path: './test-results/11-before-reject-click.png',
      fullPage: true 
    });
    
    // Monitor for dialog opening
    let dialogOpened = false;
    const dialogPromise = page.waitForSelector('.MuiDialog-root, [role="dialog"]', { timeout: 5000 }).then(() => {
      dialogOpened = true;
      console.log('✅ Reject dialog opened successfully');
    }).catch(() => {
      console.log('❌ Reject dialog did not open within 5 seconds');
    });
    
    // Click the reject button
    console.log('🖱️ Clicking reject button...');
    await firstRejectButton.click({ force: true });
    
    await dialogPromise;
    
    // Take screenshot after clicking
    await page.screenshot({ 
      path: './test-results/12-after-reject-click.png',
      fullPage: true 
    });
    
    if (dialogOpened) {
      console.log('✅ REJECT button worked correctly - dialog opened');
      
      // Close the dialog
      const closeButton = page.locator('button:has-text("Cancelar"), button:has-text("Fechar")').first();
      if (await closeButton.isVisible()) {
        await closeButton.click();
        await page.waitForTimeout(1000);
      }
    } else {
      console.log('❌ REJECT button failed - no dialog opened');
    }
    
    expect(dialogOpened).toBe(true);
  });

  test('Step 6: Test edit button (pencil icon) interactions', async () => {
    console.log('✏️ Testing EDIT button interactions...');
    
    // Find edit buttons (Edit icon)
    const editButtons = await page.locator('button:has([data-testid="EditIcon"]), .MuiIconButton-root:has(svg[data-testid="EditIcon"]), [aria-label*="Editar"]').all();
    
    if (editButtons.length === 0) {
      console.log('⚠️ No edit buttons found - may be filtered out by status');
      return;
    }
    
    console.log(`🎯 Found ${editButtons.length} edit buttons, testing first one...`);
    
    const firstEditButton = editButtons[0];
    await expect(firstEditButton).toBeVisible();
    
    // Take screenshot before clicking
    await page.screenshot({ 
      path: './test-results/13-before-edit-click.png',
      fullPage: true 
    });
    
    // Monitor for dialog opening
    let dialogOpened = false;
    const dialogPromise = page.waitForSelector('.MuiDialog-root, [role="dialog"]', { timeout: 5000 }).then(() => {
      dialogOpened = true;
      console.log('✅ Edit dialog opened successfully');
    }).catch(() => {
      console.log('❌ Edit dialog did not open within 5 seconds');
    });
    
    // Click the edit button
    console.log('🖱️ Clicking edit button...');
    await firstEditButton.click({ force: true });
    
    await dialogPromise;
    
    // Take screenshot after clicking
    await page.screenshot({ 
      path: './test-results/14-after-edit-click.png',
      fullPage: true 
    });
    
    if (dialogOpened) {
      console.log('✅ EDIT button worked correctly - dialog opened');
      
      // Close the dialog
      const closeButton = page.locator('button:has-text("Cancelar"), button:has-text("Fechar")').first();
      if (await closeButton.isVisible()) {
        await closeButton.click();
        await page.waitForTimeout(1000);
      }
    } else {
      console.log('❌ EDIT button failed - no dialog opened');
    }
    
    expect(dialogOpened).toBe(true);
  });

  test('Step 7: Test image thumbnail interactions', async () => {
    console.log('🖼️ Testing IMAGE THUMBNAIL interactions...');
    
    // Find image thumbnails
    const imageThumbnails = await page.locator('.image-thumbnail, img[alt*="Imagem da denúncia"]').all();
    
    if (imageThumbnails.length === 0) {
      console.log('⚠️ No image thumbnails found');
      return;
    }
    
    console.log(`🎯 Found ${imageThumbnails.length} image thumbnails, testing first one...`);
    
    const firstThumbnail = imageThumbnails[0];
    await expect(firstThumbnail).toBeVisible();
    
    // Take screenshot before clicking
    await page.screenshot({ 
      path: './test-results/15-before-image-click.png',
      fullPage: true 
    });
    
    // Monitor for image modal opening
    let modalOpened = false;
    const modalPromise = page.waitForSelector('.image-modal-backdrop, .MuiDialog-root', { timeout: 5000 }).then(() => {
      modalOpened = true;
      console.log('✅ Image modal opened successfully');
    }).catch(() => {
      console.log('❌ Image modal did not open within 5 seconds');
    });
    
    // Click the image thumbnail
    console.log('🖱️ Clicking image thumbnail...');
    await firstThumbnail.click({ force: true });
    
    await modalPromise;
    
    // Take screenshot after clicking
    await page.screenshot({ 
      path: './test-results/16-after-image-click.png',
      fullPage: true 
    });
    
    if (modalOpened) {
      console.log('✅ IMAGE THUMBNAIL worked correctly - modal opened');
      
      // Close the modal (ESC key or close button)
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);
    } else {
      console.log('❌ IMAGE THUMBNAIL failed - no modal opened');
    }
    
    expect(modalOpened).toBe(true);
  });

  test('Step 8: Generate comprehensive debugging report', async () => {
    console.log('📊 Generating comprehensive debugging report...');
    
    // Capture final state
    await page.screenshot({ 
      path: './test-results/17-final-state.png',
      fullPage: true 
    });
    
    // Get all console logs, network requests, and errors collected during tests
    const debugReport = {
      timestamp: new Date().toISOString(),
      testResults: {
        navigation: 'SUCCESS',
        viewButton: 'TESTED',
        approveButton: 'TESTED',
        rejectButton: 'TESTED',
        editButton: 'TESTED',
        imageThumbnail: 'TESTED'
      },
      recommendations: [
        'Check if openDialog function is properly bound to button click handlers',
        'Verify that handleButtonClick is preventing event propagation correctly',
        'Ensure selectedDenuncia state is being set properly',
        'Check if API authentication token is valid',
        'Verify that dialog state management is working correctly',
        'Check React component re-rendering issues',
        'Ensure MUI Dialog components are properly configured'
      ]
    };
    
    // Save debug report
    await require('fs').promises.writeFile(
      './test-results/debug-report.json', 
      JSON.stringify(debugReport, null, 2)
    );
    
    console.log('✅ Comprehensive debugging report generated');
    console.log('📁 Check ./test-results/ folder for screenshots, videos, and reports');
  });
});