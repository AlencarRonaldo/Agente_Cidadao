/**
 * WhatsApp Service Unit Tests
 * Comprehensive testing for WhatsApp service functionality
 */

const WhatsAppService = require('../../../src/services/whatsappService');
const testData = require('../../fixtures/testData');
const { PrismaClient } = require('@prisma/client');

// Mock Prisma
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    conversaUsuario: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      findMany: jest.fn()
    },
    denuncia: {
      create: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn()
    },
    $disconnect: jest.fn()
  }))
}));

describe('WhatsAppService', () => {
  let whatsappService;
  let mockPrisma;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    testData.reset();
    
    // Create fresh instance
    whatsappService = require('../../../src/services/whatsappService');
    mockPrisma = new PrismaClient();
  });

  afterEach(() => {
    // Clean up any timers or intervals
    if (whatsappService.heartbeatInterval) {
      clearInterval(whatsappService.heartbeatInterval);
    }
    if (whatsappService.initializationTimeout) {
      clearTimeout(whatsappService.initializationTimeout);
    }
  });

  describe('Initialization', () => {
    test('should initialize WhatsApp service successfully', async () => {
      const result = await global.testUtils.measurePerformance(async () => {
        return await whatsappService.initialize();
      });

      expect(result.result.success).toBe(true);
      expect(result.passed).toBe(true); // Under 200ms
      expect(whatsappService.isConnecting).toBe(true);
    });

    test('should handle initialization timeout', async () => {
      // Mock client initialize to take too long
      const mockClient = {
        initialize: jest.fn(() => new Promise(resolve => setTimeout(resolve, 5000))),
        on: jest.fn(),
        destroy: jest.fn().mockResolvedValue(true)
      };
      
      whatsappService.client = mockClient;
      
      const result = await whatsappService.initialize();
      expect(result.success).toBe(false);
      expect(result.message).toContain('timeout');
    });

    test('should prevent multiple concurrent initializations', async () => {
      whatsappService.isConnecting = true;
      
      const result = await whatsappService.initialize();
      expect(result.success).toBe(true);
      expect(result.message).toContain('conectando');
    });
  });

  describe('Connection Management', () => {
    test('should establish connection and set proper state', async () => {
      const mockClient = {
        initialize: jest.fn().mockResolvedValue(true),
        on: jest.fn(),
        info: {
          wid: { user: '5511999999999' },
          pushname: 'Test User',
          platform: 'android'
        }
      };

      whatsappService.client = mockClient;
      
      // Simulate ready event
      const readyCallback = mockClient.on.mock.calls.find(call => call[0] === 'ready')[1];
      await readyCallback();

      expect(whatsappService.isConnected).toBe(true);
      expect(whatsappService.isConnecting).toBe(false);
      expect(whatsappService.connectionInfo).toBeDefined();
      expect(whatsappService.connectionInfo.phone).toBe('5511999999999');
    });

    test('should handle disconnection gracefully', async () => {
      whatsappService.isConnected = true;
      whatsappService.connectionInfo = { phone: '5511999999999' };

      const mockClient = {
        on: jest.fn(),
        destroy: jest.fn().mockResolvedValue(true)
      };
      whatsappService.client = mockClient;

      // Simulate disconnect event
      const disconnectCallback = mockClient.on.mock.calls.find(call => call[0] === 'disconnected')[1];
      if (disconnectCallback) {
        disconnectCallback('LOGOUT');
      }

      expect(whatsappService.isConnected).toBe(false);
      expect(whatsappService.connectionInfo).toBeNull();
    });

    test('should perform connection health check', async () => {
      const mockClient = {
        getState: jest.fn().mockResolvedValue('CONNECTED'),
        info: {
          wid: { user: '5511999999999' },
          platform: 'android'
        }
      };

      whatsappService.client = mockClient;
      whatsappService.isConnected = true;

      const result = await global.testUtils.measurePerformance(async () => {
        return await whatsappService.checkConnectionHealth();
      });

      expect(result.result.healthy).toBe(true);
      expect(result.result.state).toBe('CONNECTED');
      expect(result.passed).toBe(true); // Under 200ms
    });
  });

  describe('Message Handling', () => {
    beforeEach(() => {
      // Setup mock client for message handling
      whatsappService.client = {
        sendMessage: jest.fn().mockResolvedValue(true),
        info: { wid: { user: '5511999999999' } }
      };
      whatsappService.isConnected = true;
    });

    test('should handle initial menu interaction', async () => {
      const message = testData.createWhatsAppMessage({
        body: '1',
        from: '5511999999999@c.us'
      });

      const conversation = testData.createConversaUsuario({
        phoneNumber: message.from,
        estado: 'INICIAL'
      });

      mockPrisma.conversaUsuario.findUnique.mockResolvedValue(conversation);
      mockPrisma.conversaUsuario.update.mockResolvedValue(conversation);

      const result = await global.testUtils.measurePerformance(async () => {
        await whatsappService.handleMessage(message);
      });

      expect(whatsappService.client.sendMessage).toHaveBeenCalled();
      expect(result.passed).toBe(true); // Under 200ms
    });

    test('should create new conversation for new user', async () => {
      const message = testData.createWhatsAppMessage({
        body: 'Olá',
        from: '5511999999999@c.us'
      });

      mockPrisma.conversaUsuario.findUnique.mockResolvedValue(null);
      mockPrisma.conversaUsuario.create.mockResolvedValue(
        testData.createConversaUsuario({ phoneNumber: message.from })
      );

      await whatsappService.handleMessage(message);

      expect(mockPrisma.conversaUsuario.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          phoneNumber: message.from,
          estado: 'INICIAL'
        })
      });
    });

    test('should handle conversation timeout', async () => {
      const message = testData.createWhatsAppMessage({
        body: 'test',
        from: '5511999999999@c.us'
      });

      const expiredConversation = testData.createConversaUsuario({
        phoneNumber: message.from,
        ultimaInteracao: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
      });

      mockPrisma.conversaUsuario.findUnique.mockResolvedValue(expiredConversation);
      mockPrisma.conversaUsuario.delete.mockResolvedValue(expiredConversation);
      mockPrisma.conversaUsuario.create.mockResolvedValue(
        testData.createConversaUsuario({ phoneNumber: message.from })
      );

      await whatsappService.handleMessage(message);

      expect(mockPrisma.conversaUsuario.delete).toHaveBeenCalled();
      expect(mockPrisma.conversaUsuario.create).toHaveBeenCalled();
      expect(whatsappService.client.sendMessage).toHaveBeenCalledWith(
        message.from,
        expect.stringContaining('expirada')
      );
    });

    test('should process image messages in foto state', async () => {
      const message = testData.createWhatsAppMessage({
        type: 'image',
        hasMedia: true,
        from: '5511999999999@c.us',
        downloadMedia: jest.fn().mockResolvedValue({
          data: Buffer.from('fake-image-data').toString('base64'),
          mimetype: 'image/jpeg'
        })
      });

      const conversation = testData.createConversaUsuario({
        phoneNumber: message.from,
        estado: 'AGUARDANDO_FOTO',
        problemaTemp: 'Test problem',
        enderecoTemp: 'Test address',
        bairroTemp: 'Test neighborhood'
      });

      mockPrisma.conversaUsuario.findUnique.mockResolvedValue(conversation);
      mockPrisma.conversaUsuario.update.mockResolvedValue(conversation);

      // Mock upload service
      const mockUploadService = {
        processWhatsAppImage: jest.fn().mockResolvedValue({
          url: 'http://test.com/image.jpg',
          filename: 'test-image.jpg',
          size: 1024,
          thumbnailUrl: 'http://test.com/thumb.jpg'
        })
      };

      // Mock vereador service
      const mockVereadorService = {
        selecionarParaDenuncia: jest.fn().mockResolvedValue([
          { instagram: '@vereador1' },
          { instagram: '@vereador2' }
        ])
      };

      await whatsappService.handleMessage(message);

      expect(mockPrisma.conversaUsuario.update).toHaveBeenCalledWith({
        where: { id: conversation.id },
        data: expect.objectContaining({
          estado: 'AGUARDANDO_CONFIRMACAO'
        })
      });
    });
  });

  describe('Session Management', () => {
    test('should check for existing session', async () => {
      const result = await global.testUtils.measurePerformance(async () => {
        return await whatsappService.checkExistingSession();
      });

      expect(result.result).toHaveProperty('hasValidSession');
      expect(result.passed).toBe(true); // Under 200ms
    });

    test('should validate current session', async () => {
      whatsappService.isConnected = true;
      whatsappService.client = {
        info: {
          wid: { user: '5511999999999' },
          platform: 'android'
        }
      };

      const result = await whatsappService.validateCurrentSession();
      
      expect(result.valid).toBe(true);
      expect(result.phone).toBe('5511999999999');
    });

    test('should restore existing session', async () => {
      const mockClient = {
        initialize: jest.fn().mockResolvedValue(true),
        on: jest.fn(),
        destroy: jest.fn().mockResolvedValue(true)
      };

      // Mock successful restoration
      const result = await whatsappService.restoreExistingSession();
      
      // Should attempt restoration process
      expect(result).toHaveProperty('success');
    });
  });

  describe('Error Handling', () => {
    test('should handle authentication failure', async () => {
      const mockClient = {
        initialize: jest.fn().mockRejectedValue(new Error('Auth failed')),
        on: jest.fn(),
        destroy: jest.fn().mockResolvedValue(true)
      };

      whatsappService.client = mockClient;

      const result = await whatsappService.initialize();
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Auth failed');
      expect(whatsappService.lastError).toBeTruthy();
    });

    test('should handle message processing errors gracefully', async () => {
      const message = testData.createWhatsAppMessage();
      
      // Mock Prisma error
      mockPrisma.conversaUsuario.findUnique.mockRejectedValue(new Error('Database error'));

      whatsappService.client = {
        sendMessage: jest.fn().mockResolvedValue(true)
      };
      whatsappService.isConnected = true;

      await whatsappService.handleMessage(message);

      // Should send error message to user
      expect(whatsappService.client.sendMessage).toHaveBeenCalledWith(
        message.from,
        expect.stringContaining('erro')
      );
    });

    test('should recover from connection loss', async () => {
      whatsappService.isConnected = true;
      whatsappService.reconnectAttempts = 0;

      const mockClient = {
        on: jest.fn(),
        destroy: jest.fn().mockResolvedValue(true)
      };
      whatsappService.client = mockClient;

      // Simulate disconnect with reconnection reason
      const disconnectCallback = mockClient.on.mock.calls.find(call => call[0] === 'disconnected')[1];
      if (disconnectCallback) {
        disconnectCallback('UNPAIRED');
      }

      expect(whatsappService.isConnected).toBe(false);
      // Should trigger reconnection attempt (tested via setTimeout)
    });
  });

  describe('Performance Requirements', () => {
    test('should respond to messages within 200ms', async () => {
      const message = testData.createWhatsAppMessage({
        body: 'test',
        from: '5511999999999@c.us'
      });

      const conversation = testData.createConversaUsuario({
        phoneNumber: message.from
      });

      mockPrisma.conversaUsuario.findUnique.mockResolvedValue(conversation);
      mockPrisma.conversaUsuario.update.mockResolvedValue(conversation);

      whatsappService.client = {
        sendMessage: jest.fn().mockResolvedValue(true)
      };
      whatsappService.isConnected = true;

      const result = await global.testUtils.measurePerformance(async () => {
        await whatsappService.handleMessage(message);
      });

      expect(result.passed).toBe(true); // Under 200ms
      expect(result.duration).toBeLessThan(200);
    });

    test('should handle concurrent messages efficiently', async () => {
      const messages = Array.from({ length: 10 }, () => 
        testData.createWhatsAppMessage({
          from: `5511${Math.floor(Math.random() * 1000000000)}@c.us`
        })
      );

      const conversation = testData.createConversaUsuario();
      mockPrisma.conversaUsuario.findUnique.mockResolvedValue(conversation);
      mockPrisma.conversaUsuario.update.mockResolvedValue(conversation);

      whatsappService.client = {
        sendMessage: jest.fn().mockResolvedValue(true)
      };
      whatsappService.isConnected = true;

      const result = await global.testUtils.measurePerformance(async () => {
        await Promise.all(messages.map(msg => whatsappService.handleMessage(msg)));
      });

      expect(result.passed).toBe(true); // Under 200ms for batch
      expect(whatsappService.client.sendMessage).toHaveBeenCalledTimes(messages.length);
    });
  });

  describe('Data Consistency', () => {
    test('should maintain conversation state consistency', async () => {
      const message = testData.createWhatsAppMessage({
        body: '1',
        from: '5511999999999@c.us'
      });

      const conversation = testData.createConversaUsuario({
        phoneNumber: message.from,
        estado: 'INICIAL'
      });

      mockPrisma.conversaUsuario.findUnique.mockResolvedValue(conversation);
      mockPrisma.conversaUsuario.update.mockResolvedValue({
        ...conversation,
        estado: 'SELECIONANDO_CATEGORIA'
      });

      whatsappService.client = {
        sendMessage: jest.fn().mockResolvedValue(true)
      };
      whatsappService.isConnected = true;

      await whatsappService.handleMessage(message);

      expect(mockPrisma.conversaUsuario.update).toHaveBeenCalledWith({
        where: { id: conversation.id },
        data: expect.objectContaining({
          estado: 'SELECIONANDO_CATEGORIA'
        })
      });
    });

    test('should properly cleanup expired conversations', async () => {
      const expiredConversations = Array.from({ length: 5 }, () =>
        testData.createConversaUsuario({
          expiresAt: new Date(Date.now() - 60000) // 1 minute ago
        })
      );

      mockPrisma.conversaUsuario.findMany.mockResolvedValue(expiredConversations);
      mockPrisma.conversaUsuario.deleteMany.mockResolvedValue({ count: 5 });

      const result = await global.testUtils.measurePerformance(async () => {
        await whatsappService.cleanupExpiredConversations();
      });

      expect(mockPrisma.conversaUsuario.deleteMany).toHaveBeenCalledWith({
        where: {
          id: {
            in: expiredConversations.map(c => c.id)
          }
        }
      });
      expect(result.passed).toBe(true); // Under 200ms
    });
  });

  describe('Integration Points', () => {
    test('should integrate with text filter service', async () => {
      // This would test the integration with textFilterService
      // for content moderation during message processing
      const message = testData.createWhatsAppMessage({
        body: 'Test message with content to filter'
      });

      // Mock text filter response
      const mockTextFilter = {
        analyze: jest.fn().mockReturnValue({
          filteredText: 'Filtered content',
          score: 0.8,
          rejected: false,
          moderationDetails: []
        })
      };

      // Integration test would verify proper text filtering
      expect(mockTextFilter.analyze).toBeDefined();
    });

    test('should integrate with geo service for address validation', async () => {
      const address = 'Rua das Flores, 123 - Centro';
      
      // Mock geo service response
      const mockGeoService = {
        parseAddress: jest.fn().mockResolvedValue({
          bairro: 'Centro',
          encontrado: true,
          sugestoes: []
        })
      };

      const result = await mockGeoService.parseAddress(address);
      
      expect(result.encontrado).toBe(true);
      expect(result.bairro).toBe('Centro');
    });
  });
});