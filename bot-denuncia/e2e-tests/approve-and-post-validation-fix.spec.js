/**
 * Playwright Test: Approve and Post Validation Fix
 * Tests the validation error and implements context engineering to fix the issue
 */

const { test, expect } = require('@playwright/test');

test.describe('Approve and Post Validation Fix', () => {
  let page;
  let interceptedRequests = [];

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Intercept all API requests to capture the exact payload being sent
    await page.route('**/admin/denuncias/*/aprovar-e-postar', async route => {
      const request = route.request();
      const requestData = {
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
        postData: request.postData()
      };
      
      interceptedRequests.push(requestData);
      console.log('🔍 INTERCEPTED REQUEST:', JSON.stringify(requestData, null, 2));
      
      // Continue with the request
      await route.continue();
    });

    // Navigate to admin panel
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
  });

  test('Context Engineering: Identify validation mismatch and fix', async () => {
    console.log('🚀 Starting context engineering test...');
    
    // Step 1: Login to admin panel
    await page.fill('input[name="email"]', 'admin@teste.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // Wait for dashboard to load
    await page.waitForSelector('[data-testid="dashboard-content"], .MuiTable-root', { 
      timeout: 10000 
    });
    
    // Step 2: Find a denuncia with "PENDENTE_MODERACAO" status
    console.log('🔍 Looking for denuncias with moderation actions...');
    
    // Wait for the table to load
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    // Find the approve and post button (⚡ button)
    const approveAndPostButton = await page.locator('button[title*="Aprovar e Postar"], button:has-text("⚡")').first();
    
    if (await approveAndPostButton.count() === 0) {
      throw new Error('No "Aprovar e Postar" button found. Need a denuncia with PENDENTE_MODERACAO status');
    }
    
    // Step 3: Click the approve and post button to open the dialog
    console.log('🎯 Clicking approve and post button...');
    await approveAndPostButton.click();
    
    // Wait for dialog to open
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    
    // Step 4: Fill out the dialog form (currently incomplete)
    console.log('📝 Filling out approval form...');
    
    // Add some observations
    const observationsField = page.locator('textarea[label="Observações"], input[placeholder*="Motivo"], textarea[placeholder*="Motivo"]').first();
    if (await observationsField.count() > 0) {
      await observationsField.fill('Testing approval and post functionality - context engineering test');
    }
    
    // Step 5: Click the approve and post action button
    const finalApproveButton = page.locator('button:has-text("PUBLICAR AGORA"), button:has-text("⚡"), button[contains(@class, "gradient")]').first();
    
    console.log('🚀 Clicking final approve button to trigger API call...');
    await finalApproveButton.click();
    
    // Step 6: Wait for API call and capture the validation error
    await page.waitForTimeout(2000); // Give time for API call
    
    // Check for error messages
    const errorAlert = page.locator('.MuiAlert-root, [role="alert"], .error').first();
    if (await errorAlert.count() > 0) {
      const errorText = await errorAlert.textContent();
      console.log('❌ Validation Error Captured:', errorText);
      
      // Verify this is the expected validation error
      expect(errorText).toContain('confirmar_publicacao deve ser: CONFIRMO_PUBLICACAO_IMEDIATA');
    }
    
    // Step 7: Analyze intercepted requests
    console.log('📊 ANALYSIS: Request Payload Analysis');
    console.log('Intercepted Requests:', interceptedRequests.length);
    
    if (interceptedRequests.length > 0) {
      const lastRequest = interceptedRequests[interceptedRequests.length - 1];
      const payload = JSON.parse(lastRequest.postData || '{}');
      
      console.log('🔍 CURRENT PAYLOAD BEING SENT:');
      console.log(JSON.stringify(payload, null, 2));
      
      console.log('✅ EXPECTED PAYLOAD BY BACKEND:');
      console.log(JSON.stringify({
        acao: 'aprovar_e_postar',
        confirmar_publicacao: 'CONFIRMO_PUBLICACAO_IMEDIATA',
        usuario_confirmacao: 'Admin Name',
        motivo_urgencia: 'Testing approval and post functionality - context engineering test'
      }, null, 2));
      
      // Identify the mismatch
      const missingFields = [];
      if (!payload.confirmar_publicacao) missingFields.push('confirmar_publicacao');
      if (!payload.usuario_confirmacao) missingFields.push('usuario_confirmacao');
      if (!payload.motivo_urgencia) missingFields.push('motivo_urgencia');
      
      console.log('❌ MISSING REQUIRED FIELDS:', missingFields);
      console.log('🔧 FIELDS BEING SENT INSTEAD:', Object.keys(payload));
    }
    
    // Take screenshot for documentation
    await page.screenshot({ 
      path: 'test-results/validation-error-context.png', 
      fullPage: true 
    });
    
    console.log('✅ Context engineering analysis complete!');
  });

  test('Test the validation fix implementation', async () => {
    console.log('🛠️ Testing validation fix...');
    
    // This test will be updated after we implement the fix
    // For now, it documents the expected behavior
    
    const expectedPayload = {
      acao: 'aprovar_e_postar',
      confirmar_publicacao: 'CONFIRMO_PUBLICACAO_IMEDIATA',
      usuario_confirmacao: 'Admin Name',
      motivo_urgencia: 'Testing approval with proper validation fields'
    };
    
    console.log('📋 Expected payload after fix:', JSON.stringify(expectedPayload, null, 2));
  });

  test.afterEach(async () => {
    await page.close();
  });
});