require('dotenv').config();
const { initializeWorkers } = require('./workers');
const logger = require('./utils/logger');

// Configurar processo
process.title = 'bot-denuncia-workers';

async function start() {
  try {
    logger.info('=================================');
    logger.info('Bot Denúncia - Workers');
    logger.info('=================================');
    logger.info(`Ambiente: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`Redis: ${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`);
    
    // Inicializar workers
    await initializeWorkers();
    
    logger.info('Workers rodando... Pressione Ctrl+C para parar.');
    
  } catch (error) {
    logger.error('Erro ao iniciar workers:', error);
    process.exit(1);
  }
}

// Iniciar
start();

// Manter processo vivo
process.stdin.resume();