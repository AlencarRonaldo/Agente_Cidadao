/**
 * Database Integration Tests
 * Tests real database operations and data integrity
 */

const { PrismaClient } = require('@prisma/client');
const testData = require('../fixtures/testData');

describe('Database Integration Tests', () => {
  let prisma;

  beforeAll(async () => {
    // Use test database
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/bot_denuncia_test'
        }
      }
    });

    // Ensure database connection
    await prisma.$connect();
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.denuncia.deleteMany({});
    await prisma.conversaUsuario.deleteMany({});
    await prisma.vereador.deleteMany({});
    await prisma.adminUser.deleteMany({});
    
    await prisma.$disconnect();
  });

  beforeEach(() => {
    testData.reset();
  });

  describe('Denuncia Operations', () => {
    test('should create and retrieve denuncia with all fields', async () => {
      const denunciaData = testData.createDenuncia({
        status: 'RECEBIDA'
      });

      const result = await global.testUtils.measurePerformance(async () => {
        const created = await prisma.denuncia.create({
          data: {
            protocolo: denunciaData.protocolo,
            texto: denunciaData.texto,
            endereco: denunciaData.endereco,
            bairro: denunciaData.bairro,
            imagemUrl: denunciaData.imagemUrl,
            status: denunciaData.status,
            vereadores: denunciaData.vereadores,
            phoneNumber: denunciaData.phoneNumber,
            conversaCompleta: denunciaData.conversaCompleta,
            tempoConversa: denunciaData.tempoConversa
          }
        });

        const retrieved = await prisma.denuncia.findUnique({
          where: { id: created.id }
        });

        return { created, retrieved };
      });

      expect(result.result.created).toBeDefined();
      expect(result.result.retrieved.protocolo).toBe(denunciaData.protocolo);
      expect(result.result.retrieved.status).toBe('RECEBIDA');
      expect(result.passed).toBe(true); // Under 200ms
    });

    test('should update denuncia status and maintain data integrity', async () => {
      const denuncia = await prisma.denuncia.create({
        data: {
          protocolo: testData.createDenuncia().protocolo,
          texto: 'Test complaint',
          endereco: 'Test address',
          bairro: 'Test neighborhood',
          status: 'RECEBIDA',
          phoneNumber: '5511999999999@c.us'
        }
      });

      const result = await global.testUtils.measurePerformance(async () => {
        return await prisma.denuncia.update({
          where: { id: denuncia.id },
          data: { 
            status: 'APROVADA',
            scheduledPublishAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
          }
        });
      });

      expect(result.result.status).toBe('APROVADA');
      expect(result.result.scheduledPublishAt).toBeDefined();
      expect(result.passed).toBe(true);
    });

    test('should handle concurrent denuncia creation without conflicts', async () => {
      const denuncias = Array.from({ length: 10 }, () => testData.createDenuncia());

      const result = await global.testUtils.measurePerformance(async () => {
        return await Promise.all(
          denuncias.map(data => 
            prisma.denuncia.create({
              data: {
                protocolo: data.protocolo,
                texto: data.texto,
                endereco: data.endereco,
                bairro: data.bairro,
                status: data.status,
                phoneNumber: data.phoneNumber
              }
            })
          )
        );
      });

      expect(result.result).toHaveLength(10);
      expect(result.passed).toBe(true);

      // Verify all protocols are unique
      const protocols = result.result.map(d => d.protocolo);
      expect(new Set(protocols).size).toBe(10);
    });

    test('should perform complex queries efficiently', async () => {
      // Create test data
      const bairros = ['Centro', 'Jardim', 'Vila Nova'];
      const statuses = ['RECEBIDA', 'APROVADA', 'PUBLICADA'];
      
      for (let i = 0; i < 50; i++) {
        await prisma.denuncia.create({
          data: {
            protocolo: `TEST-${i}-${Date.now()}`,
            texto: `Test complaint ${i}`,
            endereco: `Address ${i}`,
            bairro: bairros[i % 3],
            status: statuses[i % 3],
            phoneNumber: `55119999999${i.toString().padStart(2, '0')}@c.us`,
            createdAt: new Date(Date.now() - (i * 60 * 60 * 1000))
          }
        });
      }

      const result = await global.testUtils.measurePerformance(async () => {
        const [
          totalCount,
          statusDistribution,
          topBairros,
          recentDenuncias
        ] = await Promise.all([
          prisma.denuncia.count(),
          prisma.denuncia.groupBy({
            by: ['status'],
            _count: { status: true }
          }),
          prisma.denuncia.groupBy({
            by: ['bairro'],
            _count: { bairro: true },
            orderBy: { _count: { bairro: 'desc' } },
            take: 3
          }),
          prisma.denuncia.findMany({
            where: { status: 'RECEBIDA' },
            orderBy: { createdAt: 'desc' },
            take: 10
          })
        ]);

        return { totalCount, statusDistribution, topBairros, recentDenuncias };
      });

      expect(result.result.totalCount).toBeGreaterThan(50);
      expect(result.result.statusDistribution).toHaveLength(3);
      expect(result.result.topBairros).toHaveLength(3);
      expect(result.passed).toBe(true); // Complex queries under 200ms
    });
  });

  describe('ConversaUsuario Operations', () => {
    test('should create and manage conversation lifecycle', async () => {
      const conversationData = testData.createConversaUsuario();

      const result = await global.testUtils.measurePerformance(async () => {
        const created = await prisma.conversaUsuario.create({
          data: {
            phoneNumber: conversationData.phoneNumber,
            estado: conversationData.estado,
            ultimaInteracao: conversationData.ultimaInteracao,
            expiresAt: conversationData.expiresAt
          }
        });

        // Update conversation state
        const updated = await prisma.conversaUsuario.update({
          where: { id: created.id },
          data: {
            estado: 'AGUARDANDO_PROBLEMA',
            problemaTemp: 'Test problem description',
            dadosTemp: { categoriaCompleta: 'Test > Subcategoria' }
          }
        });

        return { created, updated };
      });

      expect(result.result.updated.estado).toBe('AGUARDANDO_PROBLEMA');
      expect(result.result.updated.problemaTemp).toBe('Test problem description');
      expect(result.passed).toBe(true);
    });

    test('should handle conversation expiration cleanup', async () => {
      // Create expired conversations
      const expiredConversations = [];
      for (let i = 0; i < 5; i++) {
        const conv = await prisma.conversaUsuario.create({
          data: {
            phoneNumber: `5511999999${i.toString().padStart(3, '0')}@c.us`,
            estado: 'INICIAL',
            ultimaInteracao: new Date(Date.now() - (2 * 60 * 60 * 1000)), // 2 hours ago
            expiresAt: new Date(Date.now() - (60 * 60 * 1000)) // 1 hour ago
          }
        });
        expiredConversations.push(conv);
      }

      const result = await global.testUtils.measurePerformance(async () => {
        // Find expired conversations
        const expired = await prisma.conversaUsuario.findMany({
          where: {
            expiresAt: {
              lt: new Date()
            }
          }
        });

        // Clean up expired conversations
        const deleteResult = await prisma.conversaUsuario.deleteMany({
          where: {
            id: {
              in: expired.map(c => c.id)
            }
          }
        });

        return { expired, deleteResult };
      });

      expect(result.result.expired).toHaveLength(5);
      expect(result.result.deleteResult.count).toBe(5);
      expect(result.passed).toBe(true);
    });
  });

  describe('Vereador Operations', () => {
    test('should create and query vereadores by region', async () => {
      const vereadores = [
        testData.createVereador({ nome: 'João Silva', regioes: ['Centro', 'Norte'] }),
        testData.createVereador({ nome: 'Maria Santos', regioes: ['Sul', 'Leste'] }),
        testData.createVereador({ nome: 'Pedro Costa', regioes: ['Centro', 'Oeste'] })
      ];

      for (const vereador of vereadores) {
        await prisma.vereador.create({
          data: {
            nome: vereador.nome,
            partido: vereador.partido,
            instagram: vereador.instagram,
            email: vereador.email,
            regioes: vereador.regioes,
            ativo: true
          }
        });
      }

      const result = await global.testUtils.measurePerformance(async () => {
        // Find vereadores for Centro region
        return await prisma.vereador.findMany({
          where: {
            regioes: {
              has: 'Centro'
            },
            ativo: true
          }
        });
      });

      expect(result.result).toHaveLength(2); // João Silva and Pedro Costa
      expect(result.passed).toBe(true);
    });
  });

  describe('Transaction Handling', () => {
    test('should handle complex transaction with rollback', async () => {
      const denunciaData = testData.createDenuncia();
      const conversationData = testData.createConversaUsuario();

      try {
        await prisma.$transaction(async (tx) => {
          // Create denuncia
          await tx.denuncia.create({
            data: {
              protocolo: denunciaData.protocolo,
              texto: denunciaData.texto,
              endereco: denunciaData.endereco,
              bairro: denunciaData.bairro,
              status: 'RECEBIDA',
              phoneNumber: denunciaData.phoneNumber
            }
          });

          // Create conversation
          await tx.conversaUsuario.create({
            data: {
              phoneNumber: conversationData.phoneNumber,
              estado: 'DENUNCIA_PROCESSADA',
              ultimaInteracao: new Date(),
              expiresAt: new Date(Date.now() + 30 * 60 * 1000)
            }
          });

          // Simulate error to test rollback
          throw new Error('Simulated transaction error');
        });
      } catch (error) {
        expect(error.message).toBe('Simulated transaction error');
      }

      // Verify rollback - no data should exist
      const denunciaCount = await prisma.denuncia.count({
        where: { protocolo: denunciaData.protocolo }
      });
      const conversationCount = await prisma.conversaUsuario.count({
        where: { phoneNumber: conversationData.phoneNumber }
      });

      expect(denunciaCount).toBe(0);
      expect(conversationCount).toBe(0);
    });

    test('should complete successful transaction', async () => {
      const denunciaData = testData.createDenuncia();

      const result = await global.testUtils.measurePerformance(async () => {
        return await prisma.$transaction(async (tx) => {
          const denuncia = await tx.denuncia.create({
            data: {
              protocolo: denunciaData.protocolo,
              texto: denunciaData.texto,
              endereco: denunciaData.endereco,
              bairro: denunciaData.bairro,
              status: 'RECEBIDA',
              phoneNumber: denunciaData.phoneNumber
            }
          });

          await tx.denuncia.update({
            where: { id: denuncia.id },
            data: { status: 'APROVADA' }
          });

          return denuncia;
        });
      });

      expect(result.result.protocolo).toBe(denunciaData.protocolo);
      expect(result.passed).toBe(true);

      // Verify transaction completed
      const finalDenuncia = await prisma.denuncia.findUnique({
        where: { id: result.result.id }
      });
      expect(finalDenuncia.status).toBe('APROVADA');
    });
  });

  describe('Performance and Indexing', () => {
    test('should perform indexed queries efficiently', async () => {
      // Create test data with different statuses and dates
      const testDenuncias = [];
      for (let i = 0; i < 100; i++) {
        testDenuncias.push({
          protocolo: `PERF-${i}-${Date.now()}`,
          texto: `Performance test ${i}`,
          endereco: `Address ${i}`,
          bairro: `Bairro ${i % 10}`,
          status: ['RECEBIDA', 'APROVADA', 'PUBLICADA'][i % 3],
          phoneNumber: `55119999${i.toString().padStart(5, '0')}@c.us`,
          createdAt: new Date(Date.now() - (i * 60 * 60 * 1000))
        });
      }

      // Insert test data
      await prisma.denuncia.createMany({
        data: testDenuncias
      });

      // Test indexed queries
      const queries = [
        () => prisma.denuncia.findMany({
          where: { status: 'APROVADA' },
          orderBy: { createdAt: 'desc' },
          take: 10
        }),
        () => prisma.denuncia.count({
          where: { 
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
            }
          }
        }),
        () => prisma.denuncia.findMany({
          where: { bairro: 'Bairro 1' },
          select: { id: true, protocolo: true, status: true }
        })
      ];

      for (const query of queries) {
        const result = await global.testUtils.measurePerformance(query);
        expect(result.passed).toBe(true); // Each query under 200ms
      }
    });

    test('should handle concurrent read/write operations', async () => {
      const operations = [];

      // Create concurrent operations
      for (let i = 0; i < 20; i++) {
        if (i % 2 === 0) {
          // Read operation
          operations.push(
            prisma.denuncia.count()
          );
        } else {
          // Write operation
          operations.push(
            prisma.denuncia.create({
              data: {
                protocolo: `CONCURRENT-${i}-${Date.now()}`,
                texto: `Concurrent test ${i}`,
                endereco: `Address ${i}`,
                bairro: `Bairro ${i}`,
                status: 'RECEBIDA',
                phoneNumber: `55119999${i.toString().padStart(5, '0')}@c.us`
              }
            })
          );
        }
      }

      const result = await global.testUtils.measurePerformance(async () => {
        return await Promise.all(operations);
      });

      expect(result.result).toHaveLength(20);
      expect(result.passed).toBe(true); // All operations under 200ms
    });
  });

  describe('Data Validation and Constraints', () => {
    test('should enforce unique constraints', async () => {
      const protocolo = `UNIQUE-TEST-${Date.now()}`;

      // Create first denuncia
      await prisma.denuncia.create({
        data: {
          protocolo,
          texto: 'First denuncia',
          endereco: 'Address 1',
          bairro: 'Bairro 1',
          status: 'RECEBIDA',
          phoneNumber: '5511999999999@c.us'
        }
      });

      // Try to create duplicate protocol
      await expect(
        prisma.denuncia.create({
          data: {
            protocolo, // Same protocol
            texto: 'Second denuncia',
            endereco: 'Address 2',
            bairro: 'Bairro 2',
            status: 'RECEBIDA',
            phoneNumber: '5511999999998@c.us'
          }
        })
      ).rejects.toThrow();
    });

    test('should validate required fields', async () => {
      // Try to create denuncia without required fields
      await expect(
        prisma.denuncia.create({
          data: {
            // Missing protocolo, texto, etc.
            status: 'RECEBIDA'
          }
        })
      ).rejects.toThrow();
    });

    test('should handle JSON field operations', async () => {
      const conversationData = {
        phoneNumber: '5511999999999@c.us',
        estado: 'AGUARDANDO_CONFIRMACAO',
        ultimaInteracao: new Date(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        dadosTemp: {
          categoriaCompleta: 'Iluminação > Lâmpada queimada',
          vereadoresMencionados: ['@vereador1', '@vereador2'],
          uploadInfo: {
            filename: 'test.jpg',
            size: 1024
          }
        }
      };

      const result = await global.testUtils.measurePerformance(async () => {
        return await prisma.conversaUsuario.create({
          data: conversationData
        });
      });

      expect(result.result.dadosTemp.categoriaCompleta).toBe('Iluminação > Lâmpada queimada');
      expect(result.result.dadosTemp.vereadoresMencionados).toHaveLength(2);
      expect(result.result.dadosTemp.uploadInfo.size).toBe(1024);
      expect(result.passed).toBe(true);
    });
  });
});