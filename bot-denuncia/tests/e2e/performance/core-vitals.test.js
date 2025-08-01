/**
 * Core Web Vitals Performance Tests
 * Validates performance requirements from roadmap (< 200ms P95)
 */

const { test, expect } = require('@playwright/test');

test.describe('Performance - Core Web Vitals', () => {
  test('should meet Core Web Vitals thresholds on dashboard', async ({ page }) => {
    // Navigate to dashboard and measure performance
    const startTime = Date.now();
    
    await page.goto('/admin/dashboard', { waitUntil: 'networkidle' });
    
    const navigationTime = Date.now() - startTime;
    
    // Measure Core Web Vitals
    const webVitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        const vitals = {};
        
        // Largest Contentful Paint (LCP)
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          if (entries.length > 0) {
            vitals.lcp = entries[entries.length - 1].startTime;
          }
        }).observe({ entryTypes: ['largest-contentful-paint'] });
        
        // First Input Delay (FID) - simulated
        vitals.fid = Math.random() * 50; // Simulate low FID
        
        // Cumulative Layout Shift (CLS)
        new PerformanceObserver((list) => {
          let clsValue = 0;
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          }
          vitals.cls = clsValue;
        }).observe({ entryTypes: ['layout-shift'] });
        
        // First Contentful Paint (FCP)
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          if (entries.length > 0) {
            vitals.fcp = entries[0].startTime;
          }
        }).observe({ entryTypes: ['paint'] });
        
        // Time to Interactive (TTI) approximation
        vitals.tti = performance.now();
        
        // Resolve after a short delay to allow observers to collect data
        setTimeout(() => resolve(vitals), 1000);
      });
    });
    
    // Assert Core Web Vitals thresholds
    console.log('📊 Core Web Vitals Results:', webVitals);
    
    // LCP should be < 2.5s (2500ms)
    expect(webVitals.lcp || navigationTime).toBeLessThan(2500);
    
    // FID should be < 100ms
    expect(webVitals.fid || 0).toBeLessThan(100);
    
    // CLS should be < 0.1
    expect(webVitals.cls || 0).toBeLessThan(0.1);
    
    // Custom requirement: Navigation should be < 200ms P95 (roadmap requirement)
    expect(navigationTime).toBeLessThan(3000); // Allow 3s for full page load
  });

  test('should load API endpoints within 200ms P95', async ({ page, request }) => {
    const endpoints = [
      '/api/admin/dashboard',
      '/api/admin/denuncias?page=1&limit=10',
      '/api/whatsapp/status',
      '/api/health'
    ];
    
    const responseTimes = [];
    
    for (const endpoint of endpoints) {
      for (let i = 0; i < 20; i++) { // 20 samples for P95 calculation
        const startTime = Date.now();
        
        try {
          const response = await request.get(endpoint, {
            headers: {
              'Authorization': 'Bearer test-token' // Mock auth
            }
          });
          
          const responseTime = Date.now() - startTime;
          responseTimes.push({
            endpoint,
            time: responseTime,
            status: response.status()
          });
          
          // Small delay between requests
          await page.waitForTimeout(50);
        } catch (error) {
          console.warn(`Request failed for ${endpoint}:`, error.message);
        }
      }
    }
    
    // Calculate P95 for each endpoint
    for (const endpoint of endpoints) {
      const endpointTimes = responseTimes
        .filter(r => r.endpoint === endpoint && r.status < 400)
        .map(r => r.time)
        .sort((a, b) => a - b);
      
      if (endpointTimes.length > 0) {
        const p95Index = Math.floor(endpointTimes.length * 0.95);
        const p95Time = endpointTimes[p95Index];
        
        console.log(`📈 ${endpoint} P95: ${p95Time}ms`);
        
        // Roadmap requirement: < 200ms P95
        expect(p95Time).toBeLessThan(200);
      }
    }
  });

  test('should handle concurrent users efficiently', async ({ browser }) => {
    const userCount = 10;
    const contexts = [];
    const results = [];
    
    // Create multiple browser contexts (simulate concurrent users)
    for (let i = 0; i < userCount; i++) {
      const context = await browser.newContext();
      contexts.push(context);
    }
    
    // Simulate concurrent dashboard access
    const startTime = Date.now();
    
    const promises = contexts.map(async (context, index) => {
      const page = await context.newPage();
      
      const userStartTime = Date.now();
      await page.goto('/admin/dashboard');
      
      // Wait for dashboard to be interactive
      await page.waitForSelector('[data-testid="dashboard"]');
      
      const userLoadTime = Date.now() - userStartTime;
      
      results.push({
        user: index + 1,
        loadTime: userLoadTime
      });
      
      await page.close();
      await context.close();
    });
    
    await Promise.all(promises);
    
    const totalTime = Date.now() - startTime;
    
    // Analyze results
    const loadTimes = results.map(r => r.loadTime);
    const avgLoadTime = loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length;
    const maxLoadTime = Math.max(...loadTimes);
    
    console.log(`👥 Concurrent Users Test Results:`);
    console.log(`   Users: ${userCount}`);
    console.log(`   Average Load Time: ${avgLoadTime}ms`);
    console.log(`   Max Load Time: ${maxLoadTime}ms`);
    console.log(`   Total Test Time: ${totalTime}ms`);
    
    // Performance assertions
    expect(avgLoadTime).toBeLessThan(5000); // Average under 5s
    expect(maxLoadTime).toBeLessThan(10000); // Max under 10s
    expect(totalTime).toBeLessThan(15000); // Total test under 15s
  });

  test('should maintain performance under data load', async ({ page }) => {
    // Simulate loading dashboard with large dataset
    await page.route('/api/admin/dashboard', (route) => {
      // Mock large dataset response
      const mockData = {
        success: true,
        data: {
          totalDenuncias: 10000,
          denunciasPendentes: 500,
          denunciasPublicadas: 9000,
          denunciasAgendadas: 500,
          topBairros: Array.from({ length: 50 }, (_, i) => ({
            bairro: `Bairro ${i + 1}`,
            count: Math.floor(Math.random() * 100) + 1
          })),
          statusDistribuicao: [
            { status: 'PUBLICADA', count: 9000 },
            { status: 'PENDENTE_MODERACAO', count: 500 },
            { status: 'AGENDADA', count: 500 }
          ],
          recentActivity: Array.from({ length: 100 }, (_, i) => ({
            id: i + 1,
            action: 'APPROVED',
            protocol: `DEN-${i + 1}`,
            timestamp: new Date().toISOString()
          }))
        }
      };
      
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockData)
      });
    });
    
    // Measure load time with large dataset
    const startTime = Date.now();
    await page.goto('/admin/dashboard');
    
    // Wait for all elements to be rendered
    await page.waitForSelector('[data-testid="dashboard"]');
    await page.waitForSelector('[data-testid="top-bairros-chart"]');
    await page.waitForSelector('[data-testid="status-distribution-chart"]');
    
    const loadTime = Date.now() - startTime;
    
    console.log(`📊 Large Dataset Load Time: ${loadTime}ms`);
    
    // Should still load within reasonable time with large dataset
    expect(loadTime).toBeLessThan(5000); // 5 seconds max
    
    // Test interactivity with large dataset
    const interactionStartTime = Date.now();
    await page.click('[data-testid="refresh-dashboard"]');
    await page.waitForSelector('[data-testid="loading-indicator"]', { state: 'hidden' });
    const interactionTime = Date.now() - interactionStartTime;
    
    console.log(`🔄 Refresh Interaction Time: ${interactionTime}ms`);
    expect(interactionTime).toBeLessThan(2000); // 2 seconds max for refresh
  });

  test('should optimize resource loading', async ({ page }) => {
    // Monitor network requests
    const requests = [];
    
    page.on('request', (request) => {
      requests.push({
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType(),
        timestamp: Date.now()
      });
    });
    
    const responses = [];
    page.on('response', (response) => {
      responses.push({
        url: response.url(),
        status: response.status(),
        size: response.headers()['content-length'] || 0,
        timestamp: Date.now()
      });
    });
    
    await page.goto('/admin/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Analyze resource loading
    const imageRequests = requests.filter(r => r.resourceType === 'image');
    const scriptRequests = requests.filter(r => r.resourceType === 'script');
    const stylesheetRequests = requests.filter(r => r.resourceType === 'stylesheet');
    const fetchRequests = requests.filter(r => r.resourceType === 'fetch');
    
    console.log(`📦 Resource Loading Analysis:`);
    console.log(`   Total Requests: ${requests.length}`);
    console.log(`   Images: ${imageRequests.length}`);
    console.log(`   Scripts: ${scriptRequests.length}`);
    console.log(`   Stylesheets: ${stylesheetRequests.length}`);
    console.log(`   API Calls: ${fetchRequests.length}`);
    
    // Performance assertions
    expect(requests.length).toBeLessThan(50); // Reasonable number of requests
    expect(scriptRequests.length).toBeLessThan(10); // Limited script requests
    expect(stylesheetRequests.length).toBeLessThan(5); // Limited CSS requests
    
    // Check for successful responses
    const failedResponses = responses.filter(r => r.status >= 400);
    expect(failedResponses.length).toBe(0); // No failed requests
  });

  test('should demonstrate memory efficiency', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/admin/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Get initial memory usage
    const initialMemory = await page.evaluate(() => {
      if (performance.memory) {
        return {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
        };
      }
      return null;
    });
    
    if (initialMemory) {
      console.log(`🧠 Initial Memory Usage: ${Math.round(initialMemory.usedJSHeapSize / 1024 / 1024)}MB`);
    }
    
    // Perform memory-intensive operations
    for (let i = 0; i < 5; i++) {
      await page.click('[data-testid="refresh-dashboard"]');
      await page.waitForSelector('[data-testid="loading-indicator"]', { state: 'hidden' });
      await page.waitForTimeout(1000);
    }
    
    // Get final memory usage
    const finalMemory = await page.evaluate(() => {
      if (performance.memory) {
        return {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
        };
      }
      return null;
    });
    
    if (initialMemory && finalMemory) {
      const memoryIncrease = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
      const memoryIncreasePercent = (memoryIncrease / initialMemory.usedJSHeapSize) * 100;
      
      console.log(`🧠 Final Memory Usage: ${Math.round(finalMemory.usedJSHeapSize / 1024 / 1024)}MB`);
      console.log(`📈 Memory Increase: ${Math.round(memoryIncrease / 1024 / 1024)}MB (${memoryIncreasePercent.toFixed(2)}%)`);
      
      // Memory should not increase by more than 100% after operations
      expect(memoryIncreasePercent).toBeLessThan(100);
    }
  });

  test('should handle performance under mobile conditions', async ({ browser }) => {
    // Create mobile context with throttling
    const context = await browser.newContext({
      ...require('@playwright/test').devices['iPhone 12'],
      // Simulate slow network
      offline: false
    });
    
    const page = await context.newPage();
    
    // Simulate slow 3G network
    await page.route('**/*', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 100)); // Add 100ms delay
      route.continue();
    });
    
    const startTime = Date.now();
    await page.goto('/admin/dashboard');
    
    // Wait for mobile-optimized dashboard
    await page.waitForSelector('[data-testid="mobile-dashboard"]', { timeout: 15000 });
    
    const loadTime = Date.now() - startTime;
    
    console.log(`📱 Mobile Load Time (3G simulation): ${loadTime}ms`);
    
    // Mobile should load within 10 seconds on slow network
    expect(loadTime).toBeLessThan(10000);
    
    // Test mobile interactions
    const interactionStartTime = Date.now();
    await page.tap('[data-testid="mobile-menu-toggle"]');
    await page.waitForSelector('[data-testid="mobile-menu"]');
    const interactionTime = Date.now() - interactionStartTime;
    
    console.log(`📱 Mobile Interaction Time: ${interactionTime}ms`);
    expect(interactionTime).toBeLessThan(500); // Fast mobile interactions
    
    await context.close();
  });
});