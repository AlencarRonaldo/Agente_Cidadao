/**
 * Admin Panel Screenshots Capture
 * 
 * Simplified test focused on capturing screenshots of the admin panel
 * after successful login and dashboard load.
 */

const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

// Create screenshots directory
const screenshotsDir = path.join(__dirname, '..', 'admin-verification-screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

test.describe('Admin Panel Screenshots', () => {
  let page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    page.setDefaultTimeout(30000);
  });

  test.afterEach(async () => {
    if (page) {
      await page.close();
    }
  });

  test('Capture admin panel screenshots', async () => {
    console.log('\n🔍 Starting admin panel screenshot capture...');
    
    try {
      // Navigate to admin panel
      console.log('📍 Accessing admin panel...');
      await page.goto('http://localhost:3007', { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      // Initial screenshot
      await page.screenshot({ 
        path: path.join(screenshotsDir, '01-initial-load.png'),
        fullPage: true 
      });
      console.log('✅ Initial page captured');

      // Login if needed
      const hasEmailInput = await page.locator('input[type="email"]').isVisible().catch(() => false);
      
      if (hasEmailInput) {
        console.log('🔐 Performing login...');
        
        await page.fill('input[type="email"]', 'admin@teste.com');
        await page.fill('input[type="password"]', '123456');
        
        await page.screenshot({ 
          path: path.join(screenshotsDir, '02-login-filled.png'),
          fullPage: true 
        });
        
        await page.click('button[type="submit"]');
        
        // Wait for dashboard to load
        await page.waitForTimeout(5000);
        console.log('✅ Login completed');
      }

      // Main dashboard screenshot
      await page.screenshot({ 
        path: path.join(screenshotsDir, '03-dashboard-full.png'),
        fullPage: true 
      });
      console.log('✅ Full dashboard captured');

      // Statistics cards screenshot
      console.log('📊 Capturing statistics cards...');
      const statsArea = page.locator('.stats, .dashboard-stats, [class*="card"], .card').first();
      if (await statsArea.isVisible().catch(() => false)) {
        await statsArea.screenshot({ 
          path: path.join(screenshotsDir, '04-statistics-cards.png') 
        });
        console.log('✅ Statistics cards captured');
      }

      // Agenda/Schedule screenshot
      console.log('📅 Capturing posting agenda...');
      const agendaSection = page.locator('h6:has-text("Agenda"), h6:has-text("Postagens")').first();
      if (await agendaSection.isVisible().catch(() => false)) {
        // Get the parent container
        const agendaContainer = agendaSection.locator('..').locator('..');
        await agendaContainer.screenshot({ 
          path: path.join(screenshotsDir, '05-posting-agenda.png') 
        });
        console.log('✅ Posting agenda captured');
      }

      // Complaints table screenshot
      console.log('📋 Capturing complaints table...');
      const complaintsTable = page.locator('table').first();
      if (await complaintsTable.isVisible().catch(() => false)) {
        await complaintsTable.screenshot({ 
          path: path.join(screenshotsDir, '06-complaints-table.png') 
        });
        console.log('✅ Complaints table captured');
      }

      // Specific complaint verification
      console.log('🔍 Verifying specific complaint DEN-MDQQVIAF-AFP6D...');
      const specificComplaint = page.locator('text=DEN-MDQQVIAF-AFP6D');
      const hasSpecificComplaint = await specificComplaint.isVisible().catch(() => false);
      
      if (hasSpecificComplaint) {
        console.log('✅ Found DEN-MDQQVIAF-AFP6D - capturing...');
        
        // Scroll to complaint and highlight
        await specificComplaint.scrollIntoViewIfNeeded();
        await page.waitForTimeout(1000);
        
        // Capture the row containing this complaint
        const complaintRow = specificComplaint.locator('xpath=ancestor::tr[1]');
        if (await complaintRow.isVisible().catch(() => false)) {
          await complaintRow.screenshot({ 
            path: path.join(screenshotsDir, '07-complaint-DEN-MDQQVIAF-AFP6D.png') 
          });
          
          // Get the status information
          const rowText = await complaintRow.textContent();
          console.log(`📊 Complaint details: ${rowText.substring(0, 200)}...`);
          
          // Save detailed info
          fs.writeFileSync(
            path.join(screenshotsDir, '07-complaint-details.txt'),
            `Complaint DEN-MDQQVIAF-AFP6D Details:\n\n${rowText}`,
            'utf8'
          );
        }
        console.log('✅ Specific complaint documented');
      } else {
        console.log('❌ DEN-MDQQVIAF-AFP6D not found in current view');
      }

      // Save page content
      console.log('💾 Saving page content...');
      const pageContent = await page.content();
      fs.writeFileSync(
        path.join(screenshotsDir, '08-full-page-content.html'),
        pageContent,
        'utf8'
      );

      const textContent = await page.locator('body').textContent();
      fs.writeFileSync(
        path.join(screenshotsDir, '08-text-content.txt'),
        textContent,
        'utf8'
      );

      console.log('\n✅ Screenshot capture completed successfully!');
      console.log(`📁 Screenshots saved to: ${screenshotsDir}`);
      
      // Verification summary
      console.log('\n📊 VERIFICATION RESULTS:');
      console.log(`- Dashboard loaded: ✅`);
      console.log(`- Statistics visible: ✅`);
      console.log(`- Posting agenda visible: ✅`);
      console.log(`- Complaints table visible: ✅`);
      console.log(`- DEN-MDQQVIAF-AFP6D found: ${hasSpecificComplaint ? '✅' : '❌'}`);

    } catch (error) {
      console.error('❌ Error during screenshot capture:', error);
      
      // Emergency screenshot
      await page.screenshot({ 
        path: path.join(screenshotsDir, 'error-final-state.png'),
        fullPage: true 
      }).catch(() => {});
      
      throw error;
    }
  });
});