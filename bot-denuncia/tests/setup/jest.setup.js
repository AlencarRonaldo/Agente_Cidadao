/**
 * Jest Setup File
 * Global test configuration and mocks
 */

// Import necessary testing utilities
import '@testing-library/jest-dom';

// Global test timeout
jest.setTimeout(30000);

// Environment variables for testing
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/bot_denuncia_test';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.INSTAGRAM_USERNAME = 'test_instagram_user';
process.env.INSTAGRAM_PASSWORD = 'test_instagram_password';
process.env.WHATSAPP_AUTO_INIT = 'false';

// Mock external dependencies that don't need real connections in tests
jest.mock('whatsapp-web.js', () => ({
  Client: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(true),
    on: jest.fn(),
    sendMessage: jest.fn().mockResolvedValue(true),
    destroy: jest.fn().mockResolvedValue(true),
    getState: jest.fn().mockResolvedValue('CONNECTED'),
    info: {
      wid: { user: '5511999999999' },
      pushname: 'Test User',
      platform: 'android'
    }
  })),
  LocalAuth: jest.fn(),
  MessageMedia: jest.fn()
}));

jest.mock('instagram-private-api', () => ({
  IgApiClient: jest.fn().mockImplementation(() => ({
    state: {
      generateDevice: jest.fn(),
      deviceString: 'test-device-string'
    },
    account: {
      login: jest.fn().mockResolvedValue(true)
    },
    publish: {
      photo: jest.fn().mockResolvedValue({ media: { id: 'test-media-id' } })
    }
  })),
  IgCheckpointError: class IgCheckpointError extends Error {},
  IgChallengeWrongCodeError: class IgChallengeWrongCodeError extends Error {},
  IgLoginTwoFactorRequiredError: class IgLoginTwoFactorRequiredError extends Error {}
}));

jest.mock('bull', () => {
  return jest.fn().mockImplementation(() => ({
    add: jest.fn().mockResolvedValue({ id: 'test-job-id' }),
    process: jest.fn(),
    on: jest.fn(),
    clean: jest.fn().mockResolvedValue([]),
    getJobs: jest.fn().mockResolvedValue([]),
    getWaiting: jest.fn().mockResolvedValue([]),
    getActive: jest.fn().mockResolvedValue([]),
    getFailed: jest.fn().mockResolvedValue([])
  }));
});

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockResolvedValue(null),
    del: jest.fn().mockResolvedValue(1),
    exists: jest.fn().mockResolvedValue(0),
    expire: jest.fn().mockResolvedValue(1),
    flushall: jest.fn().mockResolvedValue('OK'),
    quit: jest.fn().mockResolvedValue('OK')
  }));
});

// Mock file system operations
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    unlink: jest.fn(),
    mkdir: jest.fn(),
    stat: jest.fn(),
    readdir: jest.fn()
  },
  existsSync: jest.fn().mockReturnValue(false),
  rmSync: jest.fn(),
  statSync: jest.fn().mockReturnValue({
    mtime: new Date(),
    size: 1024
  })
}));

// Mock sharp for image processing
jest.mock('sharp', () => {
  const mockSharp = {
    resize: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    png: jest.fn().mockReturnThis(),
    webp: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('test-image-data')),
    toFile: jest.fn().mockResolvedValue({ size: 1024 }),
    metadata: jest.fn().mockResolvedValue({
      width: 800,
      height: 600,
      format: 'jpeg'
    })
  };
  
  return jest.fn(() => mockSharp);
});

// Global test utilities
global.testUtils = {
  // Generate test data
  generateMockDenuncia: (overrides = {}) => ({
    id: 'test-denuncia-id',
    protocolo: 'DEN-TEST-001',
    texto: 'Test complaint description',
    endereco: 'Test Address, 123',
    bairro: 'Test Neighborhood',
    status: 'PENDENTE_MODERACAO',
    imagemUrl: 'http://test.com/image.jpg',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  }),
  
  generateMockUser: (overrides = {}) => ({
    phoneNumber: '5511999999999@c.us',
    estado: 'INICIAL',
    ultimaInteracao: new Date(),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    ...overrides
  }),
  
  // Mock Prisma responses
  mockPrismaResponse: (data) => ({
    ...data,
    id: data.id || 'mock-id',
    createdAt: data.createdAt || new Date(),
    updatedAt: data.updatedAt || new Date()
  }),
  
  // Async test helper
  waitFor: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Performance measurement
  measurePerformance: async (fn) => {
    const start = process.hrtime.bigint();
    const result = await fn();
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1000000; // Convert to milliseconds
    
    return {
      result,
      duration,
      passed: duration < 200 // Check if under 200ms (roadmap requirement)
    };
  }
};

// Console override for cleaner test output
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: process.env.VERBOSE_TESTS === 'true' ? originalConsole.log : jest.fn(),
  info: process.env.VERBOSE_TESTS === 'true' ? originalConsole.info : jest.fn(),
  warn: originalConsole.warn,
  error: originalConsole.error
};

// Cleanup after all tests
afterAll(() => {
  // Restore console
  global.console = originalConsole;
});

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

export {};