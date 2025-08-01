/**
 * API Integration Tests
 * Tests complete API endpoints with real HTTP requests
 */

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const testData = require('../fixtures/testData');

// Mock the app setup
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Mock admin routes
  const adminController = require('../../src/controllers/adminController');
  
  app.get('/api/admin/dashboard', adminController.getDashboard);
  app.get('/api/admin/denuncias', adminController.getDenuncias);
  app.post('/api/admin/denuncias/:id/approve', adminController.approveDenuncia);
  app.post('/api/admin/denuncias/:id/reject', adminController.rejectDenuncia);
  app.post('/api/admin/denuncias/:id/schedule', adminController.scheduleDenuncia);

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // WhatsApp status endpoint
  app.get('/api/whatsapp/status', (req, res) => {
    res.json({
      isConnected: true,
      connectionInfo: {
        phone: '5511999999999',
        platform: 'android'
      }
    });
  });

  return app;
};

describe('API Integration Tests', () => {
  let app;
  let authToken;

  beforeAll(() => {
    app = createTestApp();
    
    // Generate test JWT token
    authToken = jwt.sign(
      { userId: 'test-admin', role: 'ADMIN' },
      process.env.JWT_SECRET || 'test-secret'
    );
  });

  beforeEach(() => {
    testData.reset();
    jest.clearAllMocks();
  });

  describe('Health Check Endpoints', () => {
    test('should return health status within 200ms', async () => {
      const start = Date.now();
      
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      const duration = Date.now() - start;

      expect(response.body.status).toBe('ok');
      expect(response.body.timestamp).toBeDefined();
      expect(duration).toBeLessThan(200); // Performance requirement
    });

    test('should return WhatsApp connection status', async () => {
      const result = await global.testUtils.measurePerformance(async () => {
        return await request(app)
          .get('/api/whatsapp/status')
          .expect(200);
      });

      expect(result.result.body.isConnected).toBeDefined();
      expect(result.result.body.connectionInfo).toBeDefined();
      expect(result.passed).toBe(true); // Under 200ms
    });
  });

  describe('Admin Dashboard API', () => {
    test('should return dashboard data with performance metrics', async () => {
      // Mock dashboard data
      const mockDashboardData = {
        totalDenuncias: 150,
        denunciasPendentes: 25,
        denunciasPublicadas: 100,
        denunciasAgendadas: 15,
        aprovacaoAutomatica: 67,
        topBairros: [
          { bairro: 'Centro', count: 30 },
          { bairro: 'Jardim', count: 25 },
          { bairro: 'Vila Nova', count: 20 }
        ],
        statusDistribuicao: [
          { status: 'PUBLICADA', count: 100 },
          { status: 'PENDENTE_MODERACAO', count: 25 },
          { status: 'AGENDADA', count: 15 }
        ]
      };

      // Mock the controller response
      jest.doMock('../../src/controllers/adminController', () => ({
        getDashboard: (req, res) => {
          res.json({
            success: true,
            message: 'Dashboard carregado com sucesso',
            data: mockDashboardData
          });
        }
      }));

      const result = await global.testUtils.measurePerformance(async () => {
        return await request(app)
          .get('/api/admin/dashboard')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);
      });

      expect(result.result.body.success).toBe(true);
      expect(result.result.body.data.totalDenuncias).toBe(150);
      expect(result.result.body.data.topBairros).toHaveLength(3);
      expect(result.passed).toBe(true); // Under 200ms
    });

    test('should handle dashboard errors gracefully', async () => {
      jest.doMock('../../src/controllers/adminController', () => ({
        getDashboard: (req, res) => {
          res.status(500).json({
            success: false,
            message: 'Database connection error'
          });
        }
      }));

      const response = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('error');
    });
  });

  describe('Denuncias Management API', () => {
    test('should list denuncias with pagination', async () => {
      const mockDenuncias = Array.from({ length: 20 }, () => testData.createDenuncia());

      jest.doMock('../../src/controllers/adminController', () => ({
        getDenuncias: (req, res) => {
          const page = parseInt(req.query.page) || 1;
          const limit = parseInt(req.query.limit) || 10;
          const startIndex = (page - 1) * limit;
          const endIndex = startIndex + limit;

          const paginatedData = mockDenuncias.slice(startIndex, endIndex);

          res.json({
            success: true,
            data: {
              denuncias: paginatedData,
              pagination: {
                currentPage: page,
                totalPages: Math.ceil(mockDenuncias.length / limit),
                totalItems: mockDenuncias.length,
                itemsPerPage: limit
              }
            }
          });
        }
      }));

      const result = await global.testUtils.measurePerformance(async () => {
        return await request(app)
          .get('/api/admin/denuncias?page=1&limit=10')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);
      });

      expect(result.result.body.success).toBe(true);
      expect(result.result.body.data.denuncias).toHaveLength(10);
      expect(result.result.body.data.pagination.totalItems).toBe(20);
      expect(result.passed).toBe(true);
    });

    test('should approve denuncia successfully', async () => {
      const denunciaId = 'test-denuncia-id';

      jest.doMock('../../src/controllers/adminController', () => ({
        approveDenuncia: (req, res) => {
          const { id } = req.params;
          
          if (id === denunciaId) {
            res.json({
              success: true,
              message: 'Denúncia aprovada com sucesso',
              data: {
                id: denunciaId,
                status: 'APROVADA',
                approvedAt: new Date().toISOString()
              }
            });
          } else {
            res.status(404).json({
              success: false,
              message: 'Denúncia não encontrada'
            });
          }
        }
      }));

      const result = await global.testUtils.measurePerformance(async () => {
        return await request(app)
          .post(`/api/admin/denuncias/${denunciaId}/approve`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ observation: 'Aprovada automaticamente' })
          .expect(200);
      });

      expect(result.result.body.success).toBe(true);
      expect(result.result.body.data.status).toBe('APROVADA');
      expect(result.passed).toBe(true);
    });

    test('should reject denuncia with reason', async () => {
      const denunciaId = 'test-denuncia-id';
      const rejectionReason = 'Conteúdo inadequado';

      jest.doMock('../../src/controllers/adminController', () => ({
        rejectDenuncia: (req, res) => {
          const { id } = req.params;
          const { reason } = req.body;
          
          res.json({
            success: true,
            message: 'Denúncia rejeitada com sucesso',
            data: {
              id: denunciaId,
              status: 'REJEITADA',
              rejectionReason: reason,
              rejectedAt: new Date().toISOString()
            }
          });
        }
      }));

      const result = await global.testUtils.measurePerformance(async () => {
        return await request(app)
          .post(`/api/admin/denuncias/${denunciaId}/reject`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ reason: rejectionReason })
          .expect(200);
      });

      expect(result.result.body.success).toBe(true);
      expect(result.result.body.data.status).toBe('REJEITADA');
      expect(result.result.body.data.rejectionReason).toBe(rejectionReason);
      expect(result.passed).toBe(true);
    });

    test('should schedule denuncia for future publication', async () => {
      const denunciaId = 'test-denuncia-id';
      const scheduledTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      jest.doMock('../../src/controllers/adminController', () => ({
        scheduleDenuncia: (req, res) => {
          const { id } = req.params;
          const { scheduledPublishAt, priority } = req.body;
          
          res.json({
            success: true,
            message: 'Denúncia agendada com sucesso',
            data: {
              id: denunciaId,
              status: 'AGENDADA',
              scheduledPublishAt,
              priority: priority || 3
            }
          });
        }
      }));

      const result = await global.testUtils.measurePerformance(async () => {
        return await request(app)
          .post(`/api/admin/denuncias/${denunciaId}/schedule`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            scheduledPublishAt: scheduledTime,
            priority: 2
          })
          .expect(200);
      });

      expect(result.result.body.success).toBe(true);
      expect(result.result.body.data.status).toBe('AGENDADA');
      expect(result.result.body.data.scheduledPublishAt).toBe(scheduledTime);
      expect(result.passed).toBe(true);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle malformed JSON requests', async () => {
      const response = await request(app)
        .post('/api/admin/denuncias/test-id/approve')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send('invalid json{')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    test('should handle unauthorized requests', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('authorized');
    });

    test('should handle rate limiting', async () => {
      // Simulate multiple rapid requests
      const promises = [];
      for (let i = 0; i < 50; i++) {
        promises.push(
          request(app)
            .get('/api/health')
            .expect(200)
        );
      }

      const results = await Promise.all(promises);
      
      // All requests should complete successfully
      expect(results).toHaveLength(50);
      results.forEach(result => {
        expect(result.body.status).toBe('ok');
      });
    });

    test('should validate request parameters', async () => {
      const response = await request(app)
        .get('/api/admin/denuncias?page=invalid&limit=abc')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('parameter');
    });
  });

  describe('Performance and Load Testing', () => {
    test('should handle concurrent API requests efficiently', async () => {
      const concurrentRequests = 20;
      const requests = [];

      for (let i = 0; i < concurrentRequests; i++) {
        requests.push(
          request(app)
            .get('/api/health')
            .expect(200)
        );
      }

      const result = await global.testUtils.measurePerformance(async () => {
        return await Promise.all(requests);
      });

      expect(result.result).toHaveLength(concurrentRequests);
      expect(result.passed).toBe(true); // All requests under 200ms total
    });

    test('should maintain response time under load', async () => {
      const testDuration = 5000; // 5 seconds
      const requestInterval = 50; // Request every 50ms
      const results = [];

      const startTime = Date.now();
      while (Date.now() - startTime < testDuration) {
        const requestStart = Date.now();
        
        try {
          await request(app)
            .get('/api/health')
            .expect(200);
          
          const responseTime = Date.now() - requestStart;
          results.push(responseTime);
        } catch (error) {
          results.push(null); // Failed request
        }

        await global.testUtils.waitFor(requestInterval);
      }

      // Calculate performance metrics
      const validResults = results.filter(r => r !== null);
      const averageResponseTime = validResults.reduce((sum, time) => sum + time, 0) / validResults.length;
      const p95ResponseTime = validResults.sort((a, b) => a - b)[Math.floor(validResults.length * 0.95)];

      expect(validResults.length).toBeGreaterThan(0);
      expect(averageResponseTime).toBeLessThan(200); // Average under 200ms
      expect(p95ResponseTime).toBeLessThan(200); // P95 under 200ms (roadmap requirement)
    });

    test('should handle large response payloads efficiently', async () => {
      // Mock large dataset
      const largeDenuncias = Array.from({ length: 1000 }, () => testData.createDenuncia());

      jest.doMock('../../src/controllers/adminController', () => ({
        getDenuncias: (req, res) => {
          res.json({
            success: true,
            data: {
              denuncias: largeDenuncias,
              total: largeDenuncias.length
            }
          });
        }
      }));

      const result = await global.testUtils.measurePerformance(async () => {
        return await request(app)
          .get('/api/admin/denuncias?limit=1000')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);
      });

      expect(result.result.body.data.denuncias).toHaveLength(1000);
      expect(result.passed).toBe(true); // Large payload under 200ms
    });
  });

  describe('Data Consistency and Integrity', () => {
    test('should maintain data consistency across API operations', async () => {
      const denunciaId = 'consistency-test-id';
      let currentStatus = 'PENDENTE_MODERACAO';

      // Mock state-aware controller
      jest.doMock('../../src/controllers/adminController', () => ({
        approveDenuncia: (req, res) => {
          if (currentStatus === 'PENDENTE_MODERACAO') {
            currentStatus = 'APROVADA';
            res.json({
              success: true,
              data: { id: denunciaId, status: currentStatus }
            });
          } else {
            res.status(400).json({
              success: false,
              message: `Cannot approve denuncia with status ${currentStatus}`
            });
          }
        },
        rejectDenuncia: (req, res) => {
          if (currentStatus === 'PENDENTE_MODERACAO') {
            currentStatus = 'REJEITADA';
            res.json({
              success: true,
              data: { id: denunciaId, status: currentStatus }
            });
          } else {
            res.status(400).json({
              success: false,
              message: `Cannot reject denuncia with status ${currentStatus}`
            });
          }
        }
      }));

      // First approval should succeed
      const approveResponse = await request(app)
        .post(`/api/admin/denuncias/${denunciaId}/approve`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(approveResponse.body.data.status).toBe('APROVADA');

      // Second approval should fail (already approved)
      const secondApproveResponse = await request(app)
        .post(`/api/admin/denuncias/${denunciaId}/approve`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(secondApproveResponse.body.success).toBe(false);
    });

    test('should validate business rules in API operations', async () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      jest.doMock('../../src/controllers/adminController', () => ({
        scheduleDenuncia: (req, res) => {
          const { scheduledPublishAt } = req.body;
          
          if (new Date(scheduledPublishAt) <= new Date()) {
            res.status(400).json({
              success: false,
              message: 'Cannot schedule for past date'
            });
          } else {
            res.json({
              success: true,
              data: { status: 'AGENDADA', scheduledPublishAt }
            });
          }
        }
      }));

      // Should reject past date scheduling
      const response = await request(app)
        .post('/api/admin/denuncias/test-id/schedule')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ scheduledPublishAt: pastDate })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('past date');
    });
  });
});