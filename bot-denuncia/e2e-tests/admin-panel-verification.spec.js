/**
 * Admin Panel Verification Test
 * 
 * Accesses the admin panel, performs login, and captures screenshots
 * to verify the current system state.
 * 
 * Requirements:
 * - Access http://localhost:3007
 * - Login with admin@teste.com / 123456
 * - Take screenshots of dashboard, agenda, and complaints
 * - Verify specific complaint DEN-MDQQVIAF-AFP6D
 * - Look for generic posts evidence
 */

const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

// Create screenshots directory if it doesn't exist
const screenshotsDir = path.join(__dirname, 'admin-verification-screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

test.describe('Admin Panel Verification', () => {
  let page;

  test.beforeEach(async ({ browser }) => {
    // Create a new page with extended timeout and detailed logging
    page = await browser.newPage();
    
    // Enable request/response logging
    page.on('request', request => {
      console.log(`→ ${request.method()} ${request.url()}`);
    });
    
    page.on('response', response => {
      console.log(`← ${response.status()} ${response.url()}`);
    });

    // Set longer timeouts
    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(30000);
  });

  test.afterEach(async () => {
    if (page) {
      await page.close();
    }
  });

  test('Access admin panel and capture system state', async () => {
    console.log('\n🔍 Starting admin panel verification...');
    
    try {
      // Step 1: Navigate to admin panel
      console.log('📍 Navigating to admin panel...');
      await page.goto('http://localhost:3007', { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      // Wait a moment for any dynamic content
      await page.waitForTimeout(2000);
      
      // Take screenshot of initial page
      await page.screenshot({ 
        path: path.join(screenshotsDir, '01-initial-page.png'),
        fullPage: true 
      });
      console.log('✅ Initial page screenshot captured');

      // Step 2: Check if we're on login page or already logged in
      const isLoginPage = await page.locator('input[type="email"], input[name="email"], #email').isVisible()
        .catch(() => false);

      if (isLoginPage) {
        console.log('🔐 Login required - attempting authentication...');
        
        // Fill login form
        const emailInput = page.locator('input[type="email"], input[name="email"], #email').first();
        const passwordInput = page.locator('input[type="password"], input[name="password"], #password').first();
        
        await emailInput.fill('admin@teste.com');
        await passwordInput.fill('123456');
        
        // Take screenshot before login
        await page.screenshot({ 
          path: path.join(screenshotsDir, '02-login-form-filled.png'),
          fullPage: true 
        });
        
        // Submit login form
        const loginButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Entrar")').first();
        await loginButton.click();
        
        // Wait for navigation after login
        await page.waitForURL('**/dashboard', { timeout: 15000 })
          .catch(async () => {
            // If URL doesn't change, wait for dashboard elements
            await page.waitForSelector('.dashboard, [data-testid="dashboard"], h1, h2', { timeout: 10000 });
          });
        
        console.log('✅ Login successful');
      } else {
        console.log('ℹ️ Already logged in or no login required');
      }

      // Wait for dashboard to load
      await page.waitForTimeout(3000);

      // Step 3: Capture dashboard overview
      console.log('📊 Capturing dashboard overview...');
      await page.screenshot({ 
        path: path.join(screenshotsDir, '03-dashboard-overview.png'),
        fullPage: true 
      });

      // Step 4: Look for and capture statistics cards
      console.log('📈 Looking for statistics cards...');
      const statsCards = await page.locator('.card, .stat-card, [data-testid*="stat"], [class*="card"]').all();
      
      if (statsCards.length > 0) {
        // Take screenshot focused on stats area
        const statsContainer = page.locator('.stats, .cards, .dashboard-stats, .row').first();
        if (await statsContainer.isVisible().catch(() => false)) {
          await statsContainer.screenshot({ 
            path: path.join(screenshotsDir, '04-statistics-cards.png') 
          });
        }
        console.log(`✅ Found ${statsCards.length} statistics cards`);
      } else {
        console.log('⚠️ No statistics cards found');
      }

      // Step 5: Look for posting schedule/agenda
      console.log('📅 Looking for posting schedule...');
      const agendaElements = await page.locator(
        '[class*="agenda"], [class*="schedule"], [data-testid*="agenda"], [data-testid*="schedule"], ' +
        'h2:has-text("Agenda"), h3:has-text("Agenda"), h2:has-text("Postagens"), h3:has-text("Postagens")'
      ).all();

      if (agendaElements.length > 0) {
        // Try to find the agenda container
        const agendaContainer = page.locator(
          '.agenda-container, .schedule-container, .posting-schedule, [data-testid="posting-schedule"]'
        ).first();
        
        if (await agendaContainer.isVisible().catch(() => false)) {
          await agendaContainer.screenshot({ 
            path: path.join(screenshotsDir, '05-posting-agenda.png') 
          });
        } else {
          // Fallback: screenshot the area around agenda elements
          await page.screenshot({ 
            path: path.join(screenshotsDir, '05-posting-agenda-area.png'),
            fullPage: true 
          });
        }
        console.log('✅ Posting agenda screenshot captured');
      } else {
        console.log('⚠️ No posting agenda section found');
      }

      // Step 6: Look for complaints/denuncias list
      console.log('📋 Looking for complaints list...');
      const complaintsElements = await page.locator(
        '[class*="denuncia"], [class*="complaint"], [data-testid*="denuncia"], [data-testid*="complaint"], ' +
        'h2:has-text("Denúncias"), h3:has-text("Denúncias"), h2:has-text("Complaints"), table'
      ).all();

      if (complaintsElements.length > 0) {
        // Try to find the complaints container
        const complaintsContainer = page.locator(
          '.denuncias-list, .complaints-list, .table-container, table, [data-testid="complaints-table"]'
        ).first();
        
        if (await complaintsContainer.isVisible().catch(() => false)) {
          await complaintsContainer.screenshot({ 
            path: path.join(screenshotsDir, '06-complaints-list.png') 
          });
        } else {
          // Fallback: screenshot the full page
          await page.screenshot({ 
            path: path.join(screenshotsDir, '06-complaints-area.png'),
            fullPage: true 
          });
        }
        console.log('✅ Complaints list screenshot captured');
      } else {
        console.log('⚠️ No complaints list found');
      }

      // Step 7: Search for specific complaint DEN-MDQQVIAF-AFP6D
      console.log('🔍 Searching for specific complaint DEN-MDQQVIAF-AFP6D...');
      const specificComplaint = page.locator('text=DEN-MDQQVIAF-AFP6D');
      const hasSpecificComplaint = await specificComplaint.isVisible().catch(() => false);
      
      if (hasSpecificComplaint) {
        console.log('✅ Found specific complaint DEN-MDQQVIAF-AFP6D');
        
        // Highlight and screenshot the specific complaint
        await specificComplaint.scrollIntoViewIfNeeded();
        await page.waitForTimeout(1000);
        
        // Try to get the row containing this complaint
        const complaintRow = specificComplaint.locator('..').locator('..'); // Go up to row level
        if (await complaintRow.isVisible().catch(() => false)) {
          await complaintRow.screenshot({ 
            path: path.join(screenshotsDir, '07-specific-complaint-DEN-MDQQVIAF-AFP6D.png') 
          });
        }
        
        // Check if it shows as scheduled
        const rowText = await complaintRow.textContent().catch(() => '');
        const isScheduled = rowText.toLowerCase().includes('agendad') || 
                           rowText.toLowerCase().includes('scheduled') ||
                           rowText.toLowerCase().includes('pendente');
        
        console.log(`📊 Complaint status appears to be: ${isScheduled ? 'SCHEDULED/PENDING' : 'UNKNOWN'}`);
      } else {
        console.log('❌ Specific complaint DEN-MDQQVIAF-AFP6D not found');
      }

      // Step 8: Look for evidence of generic posts
      console.log('🔍 Looking for generic posts evidence...');
      const genericPostsKeywords = [
        'texto genérico', 'generic text', 'post genérico', 'generic post',
        'conteúdo padrão', 'default content', 'template', 'modelo'
      ];
      
      let foundGenericEvidence = false;
      for (const keyword of genericPostsKeywords) {
        const elements = await page.locator(`text=${keyword}`).all();
        if (elements.length > 0) {
          foundGenericEvidence = true;
          console.log(`✅ Found evidence of generic posts: "${keyword}"`);
          break;
        }
      }
      
      if (!foundGenericEvidence) {
        console.log('ℹ️ No explicit generic posts evidence found in visible text');
      }

      // Step 9: Capture final full page screenshot
      console.log('📸 Capturing final full page screenshot...');
      await page.screenshot({ 
        path: path.join(screenshotsDir, '08-final-full-page.png'),
        fullPage: true 
      });

      // Step 10: Get page content for analysis
      console.log('📄 Capturing page content for analysis...');
      const pageContent = await page.content();
      fs.writeFileSync(
        path.join(screenshotsDir, '09-page-content.html'), 
        pageContent, 
        'utf8'
      );

      // Step 11: Extract and save text content
      const textContent = await page.locator('body').textContent();
      fs.writeFileSync(
        path.join(screenshotsDir, '10-text-content.txt'), 
        textContent, 
        'utf8'
      );

      console.log('\n✅ Admin panel verification completed successfully!');
      console.log(`📁 Screenshots saved to: ${screenshotsDir}`);
      
      // Summary
      console.log('\n📊 VERIFICATION SUMMARY:');
      console.log(`- Login: ${isLoginPage ? 'Required and completed' : 'Not required'}`);
      console.log(`- Statistics cards: ${statsCards.length > 0 ? 'Found' : 'Not found'}`);
      console.log(`- Posting agenda: ${agendaElements.length > 0 ? 'Found' : 'Not found'}`);
      console.log(`- Complaints list: ${complaintsElements.length > 0 ? 'Found' : 'Not found'}`);
      console.log(`- Specific complaint DEN-MDQQVIAF-AFP6D: ${hasSpecificComplaint ? 'Found' : 'Not found'}`);
      console.log(`- Generic posts evidence: ${foundGenericEvidence ? 'Found' : 'Not found'}`);

    } catch (error) {
      console.error('❌ Error during admin panel verification:', error);
      
      // Take error screenshot
      await page.screenshot({ 
        path: path.join(screenshotsDir, 'error-screenshot.png'),
        fullPage: true 
      }).catch(() => {});
      
      throw error;
    }
  });
});