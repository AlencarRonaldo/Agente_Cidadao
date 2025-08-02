/**
 * Simplified Playwright Configuration for Instagram Migration Testing
 */

const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  // Test directory
  testDir: './e2e-tests',
  
  // Test timeout
  timeout: 60000,
  
  // Run tests in files in parallel
  fullyParallel: false,
  
  // Retry configuration
  retries: 1,
  workers: 1,
  
  // Reporter configuration
  reporter: [
    ['list'],
    ['html', { outputFolder: 'test-results/html-report' }],
    ['json', { outputFile: 'test-results/results.json' }]
  ],
  
  // Global test configuration
  use: {
    // Base URL for admin panel
    baseURL: 'http://localhost:3001',
    
    // Timeouts
    actionTimeout: 10000,
    navigationTimeout: 30000,
    
    // Capture on failure
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    
    // Ignore HTTPS errors
    ignoreHTTPSErrors: true,
  },

  // Test projects
  projects: [
    {
      name: 'Desktop Chrome',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 }
      },
    },
  ],

  // Output directory
  outputDir: 'test-results/artifacts',
});