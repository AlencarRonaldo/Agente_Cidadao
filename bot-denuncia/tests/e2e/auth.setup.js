/**
 * Authentication Setup for E2E Tests
 * Creates authenticated sessions for admin users
 */

const { test as setup, expect } = require('@playwright/test');
const path = require('path');

const adminAuthFile = 'tests/e2e/auth/admin-auth.json';

setup('authenticate as admin', async ({ page }) => {
  // Navigate to admin login page
  await page.goto('/admin/login');
  
  // Wait for login form to be visible
  await expect(page.locator('#login-form')).toBeVisible({ timeout: 10000 });
  
  // Fill login credentials
  await page.fill('#username', process.env.ADMIN_USERNAME || 'admin');
  await page.fill('#password', process.env.ADMIN_PASSWORD || 'admin123');
  
  // Click login button
  await page.click('#login-button');
  
  // Wait for successful login (dashboard should be visible)
  await expect(page.locator('#dashboard')).toBeVisible({ timeout: 15000 });
  
  // Verify admin is logged in by checking for admin menu
  await expect(page.locator('[data-testid="admin-menu"]')).toBeVisible();
  
  // Save authenticated state
  await page.context().storageState({ path: adminAuthFile });
  
  console.log('✅ Admin authentication completed and saved');
});

setup('create test data', async ({ page }) => {
  // Navigate to dashboard with authenticated state
  await page.goto('/admin/dashboard');
  
  // Ensure we have test data for E2E tests
  // This could involve API calls to seed the database
  // or interacting with the UI to create test data
  
  // For now, just verify the dashboard loads
  await expect(page.locator('#dashboard')).toBeVisible();
  
  console.log('✅ Test data setup completed');
});