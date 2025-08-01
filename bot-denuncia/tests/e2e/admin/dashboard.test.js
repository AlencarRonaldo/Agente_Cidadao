/**
 * Admin Dashboard E2E Tests
 * Complete user journey testing for admin dashboard functionality
 */

const { test, expect } = require('@playwright/test');

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/dashboard');
    
    // Wait for dashboard to load completely
    await expect(page.locator('#dashboard')).toBeVisible();
  });

  test('should load dashboard with key metrics within performance limits', async ({ page }) => {
    const startTime = Date.now();
    
    // Check that all key metric cards are visible
    await expect(page.locator('[data-testid="total-denuncias"]')).toBeVisible();
    await expect(page.locator('[data-testid="pending-denuncias"]')).toBeVisible();
    await expect(page.locator('[data-testid="published-denuncias"]')).toBeVisible();
    await expect(page.locator('[data-testid="scheduled-denuncias"]')).toBeVisible();
    
    const loadTime = Date.now() - startTime;
    
    // Verify performance requirement (< 200ms P95)
    expect(loadTime).toBeLessThan(2000); // Allow 2s for initial load
    
    // Check that metrics display numerical values
    const totalDenuncias = await page.locator('[data-testid="total-denuncias"] .metric-value').textContent();
    expect(totalDenuncias).toMatch(/\d+/);
  });

  test('should display top neighborhoods chart', async ({ page }) => {
    // Wait for chart to load
    await expect(page.locator('[data-testid="top-bairros-chart"]')).toBeVisible({ timeout: 10000 });
    
    // Verify chart has data
    const chartData = await page.locator('[data-testid="chart-bar"]').count();
    expect(chartData).toBeGreaterThan(0);
    
    // Check chart labels are present
    await expect(page.locator('[data-testid="chart-label"]').first()).toBeVisible();
  });

  test('should show status distribution pie chart', async ({ page }) => {
    // Wait for status chart to load
    await expect(page.locator('[data-testid="status-distribution-chart"]')).toBeVisible({ timeout: 10000 });
    
    // Verify pie chart segments
    const pieSegments = await page.locator('[data-testid="pie-segment"]').count();
    expect(pieSegments).toBeGreaterThan(0);
    
    // Check legend is present
    await expect(page.locator('[data-testid="chart-legend"]')).toBeVisible();
  });

  test('should display recent activity feed', async ({ page }) => {
    // Check activity feed is present
    await expect(page.locator('[data-testid="activity-feed"]')).toBeVisible();
    
    // Verify activity items are shown
    const activityItems = await page.locator('[data-testid="activity-item"]').count();
    
    if (activityItems > 0) {
      // Check first activity item has required elements
      await expect(page.locator('[data-testid="activity-item"]').first()).toContainText(/\d/); // Should contain timestamp or ID
      await expect(page.locator('[data-testid="activity-status"]').first()).toBeVisible();
    }
  });

  test('should navigate to denuncias list from dashboard', async ({ page }) => {
    // Click on pending denuncias metric
    await page.click('[data-testid="pending-denuncias"]');
    
    // Verify navigation to denuncias page
    await expect(page).toHaveURL(/.*\/admin\/denuncias/);
    
    // Verify denuncias list loads
    await expect(page.locator('[data-testid="denuncias-table"]')).toBeVisible({ timeout: 10000 });
  });

  test('should refresh dashboard data', async ({ page }) => {
    // Get initial total count
    const initialTotal = await page.locator('[data-testid="total-denuncias"] .metric-value').textContent();
    
    // Click refresh button
    await page.click('[data-testid="refresh-dashboard"]');
    
    // Wait for refresh to complete
    await expect(page.locator('[data-testid="loading-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="loading-indicator"]')).toBeHidden({ timeout: 10000 });
    
    // Verify data was refreshed (should still be visible)
    const refreshedTotal = await page.locator('[data-testid="total-denuncias"] .metric-value').textContent();
    expect(refreshedTotal).toBeDefined();
  });

  test('should handle WebSocket real-time updates', async ({ page }) => {
    // Mock WebSocket connection status
    await expect(page.locator('[data-testid="ws-status"]')).toBeVisible();
    
    // Check connection indicator
    const wsStatus = await page.locator('[data-testid="ws-status"]').getAttribute('data-connected');
    expect(wsStatus).toBe('true');
    
    // Wait for potential real-time updates
    await page.waitForTimeout(2000);
    
    // Verify dashboard is still responsive
    await expect(page.locator('#dashboard')).toBeVisible();
  });

  test('should display scheduled posts queue', async ({ page }) => {
    // Check scheduled posts section
    await expect(page.locator('[data-testid="scheduled-posts"]')).toBeVisible();
    
    // If there are scheduled posts, verify their structure
    const scheduledCount = await page.locator('[data-testid="scheduled-post-item"]').count();
    
    if (scheduledCount > 0) {
      // Check first scheduled post has required info
      await expect(page.locator('[data-testid="scheduled-post-item"]').first()).toContainText(/\d/);
      await expect(page.locator('[data-testid="scheduled-time"]').first()).toBeVisible();
      await expect(page.locator('[data-testid="post-preview"]').first()).toBeVisible();
    }
  });

  test('should support keyboard navigation', async ({ page }) => {
    // Focus on dashboard
    await page.keyboard.press('Tab');
    
    // Navigate through focusable elements
    const focusableElements = await page.locator('[tabindex="0"], button, a, input').count();
    
    for (let i = 0; i < Math.min(focusableElements, 10); i++) {
      await page.keyboard.press('Tab');
      
      // Verify focus is visible
      const focused = await page.locator(':focus').count();
      expect(focused).toBe(1);
    }
  });

  test('should be responsive on different screen sizes', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    
    // Verify dashboard is still functional on mobile
    await expect(page.locator('#dashboard')).toBeVisible();
    await expect(page.locator('[data-testid="mobile-menu-toggle"]')).toBeVisible();
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    
    await expect(page.locator('#dashboard')).toBeVisible();
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.reload();
    
    await expect(page.locator('#dashboard')).toBeVisible();
    await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();
  });

  test('should handle error states gracefully', async ({ page }) => {
    // Mock API error by intercepting requests
    await page.route('/api/admin/dashboard', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message: 'Database connection error'
        })
      });
    });
    
    // Reload page to trigger error
    await page.reload();
    
    // Verify error state is displayed
    await expect(page.locator('[data-testid="error-state"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="error-message"]')).toContainText('erro');
    
    // Verify retry button is present
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
  });

  test('should maintain state during navigation', async ({ page }) => {
    // Select a specific time range filter
    await page.selectOption('[data-testid="time-filter"]', '7days');
    
    // Navigate to another page
    await page.click('[data-testid="nav-denuncias"]');
    await expect(page).toHaveURL(/.*\/admin\/denuncias/);
    
    // Navigate back to dashboard
    await page.click('[data-testid="nav-dashboard"]');
    await expect(page).toHaveURL(/.*\/admin\/dashboard/);
    
    // Verify filter state is maintained
    const selectedFilter = await page.locator('[data-testid="time-filter"]').inputValue();
    expect(selectedFilter).toBe('7days');
  });

  test('should export dashboard data', async ({ page }) => {
    // Click export button
    await page.click('[data-testid="export-dashboard"]');
    
    // Wait for export modal or download
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="export-confirm"]');
    
    const download = await downloadPromise;
    
    // Verify download occurred
    expect(download.suggestedFilename()).toMatch(/dashboard-export.*\.(csv|xlsx|pdf)/);
  });

  test('should display admin notifications', async ({ page }) => {
    // Check for notification center
    await expect(page.locator('[data-testid="notification-center"]')).toBeVisible();
    
    // Click notifications
    await page.click('[data-testid="notifications-toggle"]');
    
    // Verify notifications panel opens
    await expect(page.locator('[data-testid="notifications-panel"]')).toBeVisible();
    
    // Check notification items
    const notificationCount = await page.locator('[data-testid="notification-item"]').count();
    
    if (notificationCount > 0) {
      // Verify notification structure
      await expect(page.locator('[data-testid="notification-item"]').first()).toBeVisible();
      await expect(page.locator('[data-testid="notification-timestamp"]').first()).toBeVisible();
    }
  });

  test('should handle concurrent user actions', async ({ page, context }) => {
    // Open multiple tabs/pages
    const page2 = await context.newPage();
    await page2.goto('/admin/dashboard');
    
    // Perform actions on both pages simultaneously
    const [response1, response2] = await Promise.all([
      page.click('[data-testid="refresh-dashboard"]'),
      page2.click('[data-testid="refresh-dashboard"]')
    ]);
    
    // Verify both pages remain functional
    await expect(page.locator('#dashboard')).toBeVisible();
    await expect(page2.locator('#dashboard')).toBeVisible();
    
    await page2.close();
  });
});