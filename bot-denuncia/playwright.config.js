/**
 * Playwright Configuration for Bot Denúncia E2E Testing
 * Comprehensive configuration for cross-browser testing and performance validation
 */

const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  // Test directory
  testDir: './tests/e2e',
  
  // Run tests in files in parallel
  fullyParallel: true,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/playwright-results.json' }],
    ['junit', { outputFile: 'test-results/playwright-results.xml' }],
    ['list'],
    process.env.CI ? ['github'] : null
  ].filter(Boolean),
  
  // Global test configuration
  use: {
    // Base URL for tests
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    
    // Collect trace when retrying the failed test
    trace: 'on-first-retry',
    
    // Record video on failure
    video: 'retain-on-failure',
    
    // Take screenshot on failure
    screenshot: 'only-on-failure',
    
    // Action timeout
    actionTimeout: 10000,
    
    // Navigation timeout
    navigationTimeout: 30000,
    
    // Global timeout for each test
    testTimeout: 60000,
    
    // Expect timeout
    expect: {
      timeout: 10000,
      // Custom matchers for performance testing
      toHaveResponseTime: { timeout: 200 } // 200ms requirement from roadmap
    },
    
    // Ignore HTTPS errors in test environment
    ignoreHTTPSErrors: true,
    
    // Browser context options
    contextOptions: {
      // Permissions
      permissions: ['clipboard-read', 'clipboard-write'],
      
      // Geolocation for testing location-based features
      geolocation: { latitude: -23.6945, longitude: -46.5435 }, // São Bernardo do Campo
      
      // Timezone
      timezoneId: 'America/Sao_Paulo'
    }
  },

  // Test projects for different browsers and scenarios
  projects: [
    // Setup project for authentication and test data
    {
      name: 'setup',
      testMatch: /.*\.setup\.js/,
      use: { ...devices['Desktop Chrome'] }
    },
    
    // Desktop Chrome
    {
      name: 'Desktop Chrome',
      use: { 
        ...devices['Desktop Chrome'],
        // Use authenticated state
        storageState: 'tests/e2e/auth/admin-auth.json'
      },
      dependencies: ['setup']
    },

    // Desktop Firefox
    {
      name: 'Desktop Firefox',
      use: { 
        ...devices['Desktop Firefox'],
        storageState: 'tests/e2e/auth/admin-auth.json'
      },
      dependencies: ['setup']
    },

    // Desktop Safari
    {
      name: 'Desktop Safari',
      use: { 
        ...devices['Desktop Safari'],
        storageState: 'tests/e2e/auth/admin-auth.json'
      },
      dependencies: ['setup']
    },

    // Mobile Chrome
    {
      name: 'Mobile Chrome',
      use: { 
        ...devices['Pixel 5'],
        storageState: 'tests/e2e/auth/admin-auth.json'
      },
      dependencies: ['setup']
    },

    // Mobile Safari
    {
      name: 'Mobile Safari',
      use: { 
        ...devices['iPhone 12'],
        storageState: 'tests/e2e/auth/admin-auth.json'
      },
      dependencies: ['setup']
    },

    // Performance testing project
    {
      name: 'Performance',
      testMatch: /.*\.performance\.js/,
      use: {
        ...devices['Desktop Chrome'],
        // Enable performance metrics collection
        contextOptions: {
          recordHar: {
            path: 'test-results/performance.har',
            mode: 'minimal'
          }
        }
      },
      dependencies: ['setup']
    },

    // Accessibility testing project
    {
      name: 'Accessibility',
      testMatch: /.*\.accessibility\.js/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/e2e/auth/admin-auth.json'
      },
      dependencies: ['setup']
    },

    // Visual regression testing
    {
      name: 'Visual Tests',
      testMatch: /.*\.visual\.js/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/e2e/auth/admin-auth.json'
      },
      dependencies: ['setup']
    }
  ],

  // Global setup and teardown
  globalSetup: require.resolve('./tests/e2e/global-setup.js'),
  globalTeardown: require.resolve('./tests/e2e/global-teardown.js'),

  // Web server configuration for local testing
  webServer: process.env.CI ? undefined : {
    command: 'npm run all:dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000, // 2 minutes to start the server
    env: {
      NODE_ENV: 'test',
      PORT: '3000',
      ADMIN_PORT: '3001',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/bot_denuncia_test',
      REDIS_HOST: 'localhost',
      REDIS_PORT: '6379',
      WHATSAPP_AUTO_INIT: 'false',
      INSTAGRAM_USERNAME: 'test_user',
      INSTAGRAM_PASSWORD: 'test_password'
    }
  },

  // Output directory
  outputDir: 'test-results/playwright-artifacts',

  // Metadata
  metadata: {
    project: 'Bot Denúncia E2E Tests',
    version: require('./package.json').version,
    environment: process.env.NODE_ENV || 'test'
  }
});