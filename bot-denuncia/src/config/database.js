const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

// Instância do Prisma Client
const prisma = new PrismaClient({
  log: [
    {
      emit: 'event',
      level: 'query',
    },
    {
      emit: 'event',
      level: 'error',
    },
    {
      emit: 'event',
      level: 'info',
    },
    {
      emit: 'event',
      level: 'warn',
    },
  ],
});

// Event listeners para logging
prisma.$on('error', (e) => {
  logger.error('Database error:', e);
});

prisma.$on('warn', (e) => {
  logger.warn('Database warning:', e);
});

if (process.env.NODE_ENV === 'development') {
  prisma.$on('query', (e) => {
    logger.info(`Query: ${e.query} - Duration: ${e.duration}ms`);
  });
}

// Conectar ao banco na inicialização
prisma.$connect()
  .then(() => {
    logger.info('✅ Conectado ao banco de dados PostgreSQL');
  })
  .catch((error) => {
    logger.error('❌ Erro ao conectar ao banco de dados:', error);
    process.exit(1);
  });

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
  logger.info('🔌 Desconectado do banco de dados');
});

module.exports = prisma;