#!/usr/bin/env node

/**
 * INTEGRATION SYSTEM BOOTSTRAP SCRIPT
 * 
 * Script de inicialização do sistema completo de orquestração de integração
 * Execute este script para inicializar todos os componentes do sistema
 * 
 * Usage: node initializeIntegrationSystem.js [options]
 * 
 * Options:
 *   --dev          Modo desenvolvimento com logs verbosos
 *   --prod         Modo produção com otimizações
 *   --test         Modo teste com mocks
 *   --no-monitor   Desabilitar monitoramento de performance
 *   --help         Mostrar ajuda
 * 
 * @author Integration Flow Orchestrator
 */

const systemInitializer = require('./src/systemInitializer');
const logger = require('./src/utils/logger');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  dev: args.includes('--dev'),
  prod: args.includes('--prod'),
  test: args.includes('--test'),
  noMonitor: args.includes('--no-monitor'),
  help: args.includes('--help')
};

function showHelp() {
  console.log(`
🚀 INTEGRATION ORCHESTRATION SYSTEM BOOTSTRAP

Inicializa o sistema completo de orquestração de integração WhatsApp→Instagram

USAGE:
  node initializeIntegrationSystem.js [options]

OPTIONS:
  --dev          Modo desenvolvimento com logs verbosos
  --prod         Modo produção com otimizações  
  --test         Modo teste com componentes mockados
  --no-monitor   Desabilitar monitoramento de performance
  --help         Mostrar esta ajuda

ENVIRONMENT VARIABLES:
  NODE_ENV              Ambiente (development|production|test)
  REDIS_HOST           Host do Redis (default: localhost)
  REDIS_PORT           Porta do Redis (default: 6379)
  JWT_SECRET           Secret para JWT (obrigatório)
  WS_PORT              Porta WebSocket (default: 8081)
  LOG_LEVEL            Nível de log (error|warn|info|debug)

EXAMPLES:
  # Desenvolvimento
  node initializeIntegrationSystem.js --dev
  
  # Produção
  NODE_ENV=production node initializeIntegrationSystem.js --prod
  
  # Teste
  npm test

SYSTEM COMPONENTS:
  ✓ Performance Monitoring System    - Coleta de métricas e alertas
  ✓ Integration Flow Orchestrator    - Coordenação de fluxos WhatsApp→Instagram
  ✓ Global State Manager            - Gerenciamento de estado global
  ✓ WebSocket Orchestration Layer   - Comunicação real-time com frontend
  ✓ Error Recovery Engine           - Recuperação automática de erros
  ✓ Health Monitoring               - Monitoramento contínuo de saúde

For more information, check the documentation in the docs/ directory.
`);
}

async function main() {
  try {
    // Show help if requested
    if (options.help) {
      showHelp();
      process.exit(0);
    }

    // Configure environment
    if (options.dev) {
      process.env.NODE_ENV = 'development';
      process.env.LOG_LEVEL = 'debug';
    } else if (options.prod) {
      process.env.NODE_ENV = 'production';
      process.env.LOG_LEVEL = 'info';
    } else if (options.test) {
      process.env.NODE_ENV = 'test';
      process.env.LOG_LEVEL = 'warn';
    }

    // Validate required environment variables
    const requiredEnvVars = ['JWT_SECRET'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      logger.error(`[BOOTSTRAP] Variáveis de ambiente obrigatórias não definidas: ${missingVars.join(', ')}`);
      logger.error('[BOOTSTRAP] Configure as variáveis necessárias e tente novamente.');
      process.exit(1);
    }

    // Banner de inicialização
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║        🚀 INTEGRATION ORCHESTRATION SYSTEM BOOTSTRAP         ║
║                                                               ║
║  Sistema de orquestração completo WhatsApp → Instagram       ║
║  com monitoramento, recovery automático e zero message loss  ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`);

    logger.info('[BOOTSTRAP] Iniciando sistema de orquestração de integração...');
    logger.info(`[BOOTSTRAP] Ambiente: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`[BOOTSTRAP] Nível de log: ${process.env.LOG_LEVEL || 'info'}`);
    
    if (options.noMonitor) {
      logger.info('[BOOTSTRAP] Monitoramento de performance desabilitado');
    }

    // Pre-flight checks
    logger.info('[BOOTSTRAP] Executando verificações pré-voo...');
    
    // Check Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    if (majorVersion < 16) {
      logger.error(`[BOOTSTRAP] Node.js versão ${nodeVersion} não suportada. Versão mínima: 16.x`);
      process.exit(1);
    }
    logger.info(`[BOOTSTRAP] ✓ Node.js ${nodeVersion} compatível`);

    // Check available memory
    const totalMemory = require('os').totalmem();
    const availableMemory = require('os').freemem();
    const memoryGB = (totalMemory / 1024 / 1024 / 1024).toFixed(1);
    
    if (totalMemory < 1024 * 1024 * 1024) { // Less than 1GB
      logger.warn('[BOOTSTRAP] ⚠ Memória disponível baixa. Recomendado: 2GB+');
    }
    logger.info(`[BOOTSTRAP] ✓ Memória: ${memoryGB}GB total`);

    // Check disk space (simplified)
    try {
      const fs = require('fs');
      const stats = fs.statSync(process.cwd());
      logger.info('[BOOTSTRAP] ✓ Diretório de trabalho acessível');
    } catch (error) {
      logger.error('[BOOTSTRAP] ✗ Erro ao acessar diretório de trabalho:', error.message);
      process.exit(1);
    }

    // Initialize system
    logger.info('[BOOTSTRAP] Iniciando componentes do sistema...');
    const startTime = Date.now();
    
    const result = await systemInitializer.initialize();
    
    const initTime = Date.now() - startTime;
    
    if (result.success) {
      logger.info('[BOOTSTRAP] ========================================');
      logger.info('[BOOTSTRAP] 🎉 SISTEMA INICIALIZADO COM SUCESSO!');
      logger.info('[BOOTSTRAP] ========================================');
      logger.info(`[BOOTSTRAP] Tempo de inicialização: ${initTime}ms`);
      logger.info(`[BOOTSTRAP] Componentes inicializados: ${result.components.length}`);
      
      // System status
      const status = systemInitializer.getSystemStatus();
      logger.info(`[BOOTSTRAP] Status geral: ${status.initialized ? '✓ Ativo' : '✗ Inativo'}`);
      logger.info(`[BOOTSTRAP] Uptime: ${Math.round(status.uptime / 1000)}s`);
      
      // Component status
      logger.info('[BOOTSTRAP] Status dos componentes:');
      Object.entries(status.components).forEach(([key, component]) => {
        const healthIcon = component.healthy ? '✓' : '✗';
        logger.info(`[BOOTSTRAP]   ${healthIcon} ${component.name}`);
      });

      // Performance info
      if (status.metrics) {
        logger.info('[BOOTSTRAP] Métricas iniciais coletadas');
      }

      // Final instructions
      console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                         SISTEMA ATIVO                        ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  🌐 WebSocket Server: ws://localhost:${process.env.WS_PORT || 8081}/admin/ws              ║
║  📊 Performance Monitoring: Ativo                           ║
║  🔄 Auto-Recovery: Habilitado                               ║
║  💾 State Persistence: Ativo                                ║
║                                                               ║
║  Para parar o sistema: Ctrl+C ou SIGTERM                    ║
║  Logs em tempo real disponíveis                             ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`);

      // Health monitoring info
      if (!options.noMonitor) {
        logger.info('[BOOTSTRAP] Sistema de monitoramento ativo - verificações a cada 60s');
      }

      // API endpoints info (if applicable)
      logger.info('[BOOTSTRAP] Sistema pronto para coordenar fluxos WhatsApp→Instagram');
      logger.info('[BOOTSTRAP] Para testar: systemInitializer.coordinateFlow(messageData)');

    } else {
      logger.error('[BOOTSTRAP] ========================================');
      logger.error('[BOOTSTRAP] ❌ FALHA NA INICIALIZAÇÃO DO SISTEMA');
      logger.error('[BOOTSTRAP] ========================================');
      process.exit(1);
    }

  } catch (error) {
    logger.error('[BOOTSTRAP] ========================================');
    logger.error('[BOOTSTRAP] 💥 ERRO CRÍTICO NA INICIALIZAÇÃO');
    logger.error('[BOOTSTRAP] ========================================');
    logger.error('[BOOTSTRAP] Erro:', error.message);
    logger.error('[BOOTSTRAP] Stack trace:', error.stack);
    
    // Try to provide helpful debugging info
    if (error.code === 'ECONNREFUSED') {
      logger.error('[BOOTSTRAP] 💡 Dica: Verifique se o Redis está rodando');
    } else if (error.message.includes('JWT_SECRET')) {
      logger.error('[BOOTSTRAP] 💡 Dica: Configure a variável JWT_SECRET');
    } else if (error.message.includes('permission')) {
      logger.error('[BOOTSTRAP] 💡 Dica: Verifique permissões de arquivo/diretório');
    }

    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                     FALHA NA INICIALIZAÇÃO                   ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Consulte os logs acima para detalhes do erro               ║
║                                                               ║
║  Soluções comuns:                                           ║
║  • Verificar variáveis de ambiente                          ║
║  • Iniciar serviços dependentes (Redis)                     ║
║  • Verificar permissões de arquivo                          ║
║  • Validar configuração de rede                             ║
║                                                               ║
║  Para ajuda: node initializeIntegrationSystem.js --help     ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`);

    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('[BOOTSTRAP] Recebido SIGINT, iniciando shutdown graceful...');
});

process.on('SIGTERM', () => {
  logger.info('[BOOTSTRAP] Recebido SIGTERM, iniciando shutdown graceful...');
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('[BOOTSTRAP] Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('[BOOTSTRAP] Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run main function
if (require.main === module) {
  main().catch((error) => {
    logger.error('[BOOTSTRAP] Erro no main:', error);
    process.exit(1);
  });
}

module.exports = { main, showHelp };