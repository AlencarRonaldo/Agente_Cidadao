/**
 * Jest Configuration for Bot Denúncia Testing Suite
 * Comprehensive testing setup with coverage, mocking, and multiple environments
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Root directories for tests
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  
  // Test patterns - exclude E2E tests
  testMatch: [
    'tests/unit/**/*.test.js',
    'tests/integration/**/*.test.js',
    'tests/security/**/*.test.js',
    '**/__tests__/**/*.js'
  ],
  
  // Ignore patterns to exclude Playwright tests
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/tests/e2e/',
    '<rootDir>/tests/performance/k6/',
    '<rootDir>/admin-panel/node_modules/'
  ],
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup/jest.setup.js'
  ],
  
  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.js',
    'admin-panel/src/**/*.js',
    '!src/index.js',
    '!src/**/*.test.js',
    '!src/**/*.spec.js',
    '!src/tests/**',
    '!**/node_modules/**',
    '!**/coverage/**'
  ],
  
  // Coverage thresholds (meeting roadmap requirements)
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    // Specific thresholds for critical services
    'src/services/whatsappService.js': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    'src/services/instagramService.js': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    'src/controllers/adminController.js': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // Coverage reporters
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json-summary'
  ],
  
  // Coverage directory
  coverageDirectory: '<rootDir>/coverage',
  
  // Transform configuration
  transform: {
    '^.+\\.jsx?$': 'babel-jest'
  },
  
  // Module name mapping for absolute imports (temporarily disabled due to Jest version compatibility)
  // moduleNameMapping: {
  //   '^@/(.*)$': '<rootDir>/src/$1',
  //   '^@tests/(.*)$': '<rootDir>/tests/$1'
  // },
  
  // Global variables
  globals: {
    NODE_ENV: 'test'
  },
  
  // Test timeout
  testTimeout: 30000,
  
  // Verbose output
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true,
  
  // Reset modules between tests
  resetModules: true,
  
  // Error handling
  errorOnDeprecated: true,
  
  // Performance monitoring
  maxWorkers: '50%',
  
  // Test result processor for custom reporting
  testResultsProcessor: '<rootDir>/tests/utils/testResultsProcessor.js'
};