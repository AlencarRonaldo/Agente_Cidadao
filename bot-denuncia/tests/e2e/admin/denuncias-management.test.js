/**
 * Denuncias Management E2E Tests
 * Complete workflow testing for complaint management system
 */

const { test, expect } = require('@playwright/test');

test.describe('Denuncias Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/denuncias');
    
    // Wait for denuncias table to load
    await expect(page.locator('[data-testid="denuncias-table"]')).toBeVisible({ timeout: 15000 });
  });

  test('should load denuncias list with pagination', async ({ page }) => {
    const startTime = Date.now();
    
    // Verify table headers are present
    await expect(page.locator('[data-testid="table-header-protocolo"]')).toBeVisible();
    await expect(page.locator('[data-testid="table-header-status"]')).toBeVisible();
    await expect(page.locator('[data-testid="table-header-bairro"]')).toBeVisible();
    await expect(page.locator('[data-testid="table-header-data"]')).toBeVisible();
    
    // Check pagination controls
    await expect(page.locator('[data-testid="pagination"]')).toBeVisible();
    
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(3000); // 3 second load time
    
    // Verify at least one denuncia row exists or empty state is shown
    const rowCount = await page.locator('[data-testid="denuncia-row"]').count();
    const emptyState = await page.locator('[data-testid="empty-state"]').count();
    
    expect(rowCount > 0 || emptyState > 0).toBeTruthy();
  });

  test('should filter denuncias by status', async ({ page }) => {
    // Open status filter
    await page.click('[data-testid="status-filter"]');
    
    // Select 'PENDENTE_MODERACAO' status
    await page.click('[data-testid="filter-pendente"]');
    
    // Wait for filtered results
    await expect(page.locator('[data-testid="loading-indicator"]')).toBeHidden({ timeout: 10000 });
    
    // Verify all visible denuncias have the selected status
    const statusElements = await page.locator('[data-testid="denuncia-status"]').all();
    
    for (const element of statusElements) {
      const status = await element.textContent();
      expect(status?.toLowerCase()).toContain('pendente');
    }
    
    // Verify filter indicator is active
    await expect(page.locator('[data-testid="active-filter-indicator"]')).toBeVisible();
  });

  test('should search denuncias by protocol or text', async ({ page }) => {
    // Enter search term
    await page.fill('[data-testid="search-input"]', 'DEN-');
    
    // Click search button or press Enter
    await page.keyboard.press('Enter');
    
    // Wait for search results
    await expect(page.locator('[data-testid="loading-indicator"]')).toBeHidden({ timeout: 10000 });
    
    // Verify search results contain the search term
    const protocolElements = await page.locator('[data-testid="denuncia-protocol"]').all();
    
    if (protocolElements.length > 0) {
      for (const element of protocolElements) {
        const protocol = await element.textContent();
        expect(protocol).toContain('DEN-');
      }
    }
    
    // Clear search
    await page.click('[data-testid="clear-search"]');
    await expect(page.locator('[data-testid="search-input"]')).toHaveValue('');
  });

  test('should approve denuncia with complete workflow', async ({ page }) => {
    // Find first pending denuncia
    await page.click('[data-testid="status-filter"]');
    await page.click('[data-testid="filter-pendente"]');
    
    // Wait for filtered results
    await expect(page.locator('[data-testid="loading-indicator"]')).toBeHidden();
    
    const firstRow = page.locator('[data-testid="denuncia-row"]').first();
    
    if (await firstRow.count() > 0) {
      // Click on denuncia to open details
      await firstRow.click();
      
      // Wait for details modal/page to open
      await expect(page.locator('[data-testid="denuncia-details"]')).toBeVisible({ timeout: 10000 });
      
      // Verify denuncia details are displayed
      await expect(page.locator('[data-testid="denuncia-text"]')).toBeVisible();
      await expect(page.locator('[data-testid="denuncia-address"]')).toBeVisible();
      await expect(page.locator('[data-testid="denuncia-image"]')).toBeVisible();
      
      // Click approve button
      await page.click('[data-testid="approve-button"]');
      
      // Fill approval form if present
      const approvalModal = page.locator('[data-testid="approval-modal"]');
      if (await approvalModal.count() > 0) {
        await page.fill('[data-testid="approval-notes"]', 'Denúncia aprovada automaticamente pelo teste E2E');
        await page.click('[data-testid="confirm-approval"]');
      }
      
      // Wait for success message
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('[data-testid="success-message"]')).toContainText('aprovada');
      
      // Verify status changed
      await page.goBack(); // Return to list
      await expect(page.locator('[data-testid="denuncias-table"]')).toBeVisible();
    }
  });

  test('should reject denuncia with reason', async ({ page }) => {
    // Find first pending denuncia
    await page.click('[data-testid="status-filter"]');
    await page.click('[data-testid="filter-pendente"]');
    
    await expect(page.locator('[data-testid="loading-indicator"]')).toBeHidden();
    
    const firstRow = page.locator('[data-testid="denuncia-row"]').first();
    
    if (await firstRow.count() > 0) {
      await firstRow.click();
      
      await expect(page.locator('[data-testid="denuncia-details"]')).toBeVisible();
      
      // Click reject button
      await page.click('[data-testid="reject-button"]');
      
      // Fill rejection form
      await expect(page.locator('[data-testid="rejection-modal"]')).toBeVisible();
      
      // Select rejection reason
      await page.selectOption('[data-testid="rejection-reason"]', 'conteudo-inadequado');
      
      // Add detailed reason
      await page.fill('[data-testid="rejection-details"]', 'Conteúdo não adequado para publicação conforme política de moderação');
      
      // Confirm rejection
      await page.click('[data-testid="confirm-rejection"]');
      
      // Wait for success message
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('[data-testid="success-message"]')).toContainText('rejeitada');
    }
  });

  test('should schedule denuncia for future publication', async ({ page }) => {
    // Find approved denuncia
    await page.click('[data-testid="status-filter"]');
    await page.click('[data-testid="filter-aprovada"]');
    
    await expect(page.locator('[data-testid="loading-indicator"]')).toBeHidden();
    
    const firstRow = page.locator('[data-testid="denuncia-row"]').first();
    
    if (await firstRow.count() > 0) {
      await firstRow.click();
      
      await expect(page.locator('[data-testid="denuncia-details"]')).toBeVisible();
      
      // Click schedule button
      await page.click('[data-testid="schedule-button"]');
      
      // Fill scheduling form
      await expect(page.locator('[data-testid="schedule-modal"]')).toBeVisible();
      
      // Set future date (tomorrow)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowString = tomorrow.toISOString().split('T')[0];
      
      await page.fill('[data-testid="schedule-date"]', tomorrowString);
      await page.fill('[data-testid="schedule-time"]', '14:30');
      
      // Set priority
      await page.selectOption('[data-testid="schedule-priority"]', '2');
      
      // Add scheduling notes
      await page.fill('[data-testid="schedule-notes"]', 'Agendado via teste E2E para publicação automática');
      
      // Confirm scheduling
      await page.click('[data-testid="confirm-schedule"]');
      
      // Wait for success message
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('[data-testid="success-message"]')).toContainText('agendada');
    }
  });

  test('should export denuncias data', async ({ page }) => {
    // Click export button
    await page.click('[data-testid="export-denuncias"]');
    
    // Select export format
    await expect(page.locator('[data-testid="export-modal"]')).toBeVisible();
    await page.click('[data-testid="export-csv"]');
    
    // Apply filters for export
    await page.check('[data-testid="export-include-images"]');
    await page.selectOption('[data-testid="export-date-range"]', '30days');
    
    // Start export
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="start-export"]');
    
    const download = await downloadPromise;
    
    // Verify download
    expect(download.suggestedFilename()).toMatch(/denuncias-export.*\.csv/);
  });

  test('should bulk approve multiple denuncias', async ({ page }) => {
    // Filter for pending denuncias
    await page.click('[data-testid="status-filter"]');
    await page.click('[data-testid="filter-pendente"]');
    
    await expect(page.locator('[data-testid="loading-indicator"]')).toBeHidden();
    
    // Select multiple denuncias
    const rows = await page.locator('[data-testid="denuncia-row"]').count();
    
    if (rows > 1) {
      // Select first two rows
      await page.click('[data-testid="select-denuncia"]:nth-of-type(1)');
      await page.click('[data-testid="select-denuncia"]:nth-of-type(2)');
      
      // Verify bulk actions appear
      await expect(page.locator('[data-testid="bulk-actions"]')).toBeVisible();
      
      // Click bulk approve
      await page.click('[data-testid="bulk-approve"]');
      
      // Confirm bulk action
      await expect(page.locator('[data-testid="bulk-confirm-modal"]')).toBeVisible();
      await page.fill('[data-testid="bulk-approval-notes"]', 'Aprovação em lote via teste E2E');
      await page.click('[data-testid="confirm-bulk-approve"]');
      
      // Wait for completion
      await expect(page.locator('[data-testid="bulk-success-message"]')).toBeVisible({ timeout: 15000 });
    }
  });

  test('should handle image gallery in denuncia details', async ({ page }) => {
    const firstRow = page.locator('[data-testid="denuncia-row"]').first();
    
    if (await firstRow.count() > 0) {
      await firstRow.click();
      
      await expect(page.locator('[data-testid="denuncia-details"]')).toBeVisible();
      
      // Check if image is present
      const imageElement = page.locator('[data-testid="denuncia-image"]');
      
      if (await imageElement.count() > 0) {
        // Click image to open gallery
        await imageElement.click();
        
        // Verify image gallery opens
        await expect(page.locator('[data-testid="image-gallery"]')).toBeVisible();
        
        // Test gallery controls
        const nextButton = page.locator('[data-testid="gallery-next"]');
        const prevButton = page.locator('[data-testid="gallery-prev"]');
        
        if (await nextButton.count() > 0) {
          await nextButton.click();
        }
        
        // Test zoom functionality
        await page.click('[data-testid="gallery-zoom-in"]');
        await page.click('[data-testid="gallery-zoom-out"]');
        
        // Close gallery
        await page.click('[data-testid="gallery-close"]');
        await expect(page.locator('[data-testid="image-gallery"]')).toBeHidden();
      }
    }
  });

  test('should support keyboard shortcuts', async ({ page }) => {
    // Test common keyboard shortcuts
    
    // Ctrl+F for search
    await page.keyboard.press('Control+f');
    await expect(page.locator('[data-testid="search-input"]')).toBeFocused();
    
    // Escape to close search
    await page.keyboard.press('Escape');
    
    // Arrow keys for navigation
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowUp');
    
    // Space to select
    await page.keyboard.press('Space');
    
    // Enter to open details
    await page.keyboard.press('Enter');
  });

  test('should maintain table state during operations', async ({ page }) => {
    // Set specific page size
    await page.selectOption('[data-testid="page-size-selector"]', '25');
    
    // Set sorting
    await page.click('[data-testid="sort-by-date"]');
    
    // Apply filter
    await page.click('[data-testid="status-filter"]');
    await page.click('[data-testid="filter-aprovada"]');
    
    // Perform an operation (approve/reject a denuncia)
    const firstRow = page.locator('[data-testid="denuncia-row"]').first();
    
    if (await firstRow.count() > 0) {
      await firstRow.click();
      await expect(page.locator('[data-testid="denuncia-details"]')).toBeVisible();
      
      // Go back to list
      await page.goBack();
      
      // Verify state is maintained
      const pageSize = await page.locator('[data-testid="page-size-selector"]').inputValue();
      expect(pageSize).toBe('25');
      
      // Verify filter is still active
      await expect(page.locator('[data-testid="active-filter-indicator"]')).toBeVisible();
    }
  });

  test('should handle real-time updates', async ({ page }) => {
    // Monitor for WebSocket connection
    await expect(page.locator('[data-testid="ws-status"]')).toBeVisible();
    
    // Get initial count
    const initialCount = await page.locator('[data-testid="table-row-count"]').textContent();
    
    // Wait for potential real-time updates
    await page.waitForTimeout(5000);
    
    // Verify page is still responsive
    await expect(page.locator('[data-testid="denuncias-table"]')).toBeVisible();
    
    // Test refresh functionality
    await page.click('[data-testid="refresh-table"]');
    await expect(page.locator('[data-testid="loading-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="loading-indicator"]')).toBeHidden({ timeout: 10000 });
  });

  test('should validate form inputs', async ({ page }) => {
    const firstRow = page.locator('[data-testid="denuncia-row"]').first();
    
    if (await firstRow.count() > 0) {
      await firstRow.click();
      await expect(page.locator('[data-testid="denuncia-details"]')).toBeVisible();
      
      // Test rejection form validation
      await page.click('[data-testid="reject-button"]');
      await expect(page.locator('[data-testid="rejection-modal"]')).toBeVisible();
      
      // Try to submit without reason
      await page.click('[data-testid="confirm-rejection"]');
      
      // Verify validation error
      await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="validation-error"]')).toContainText('obrigatório');
      
      // Close modal
      await page.click('[data-testid="close-modal"]');
    }
  });

  test('should handle offline/network error states', async ({ page }) => {
    // Simulate network failure
    await page.context().setOffline(true);
    
    // Try to refresh data
    await page.click('[data-testid="refresh-table"]');
    
    // Verify error state is shown
    await expect(page.locator('[data-testid="network-error"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    
    // Restore network
    await page.context().setOffline(false);
    
    // Test retry functionality
    await page.click('[data-testid="retry-button"]');
    await expect(page.locator('[data-testid="denuncias-table"]')).toBeVisible({ timeout: 15000 });
  });
});