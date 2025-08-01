require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const fileUpload = require('express-fileupload');

// Import do sistema integrado
const integratedFlowController = require('./services/integratedFlowController');
const logger = require('./utils/logger');
const portManager = require('./utils/portManager');

const app = express();
const PORT = process.env.PORT || 3355;

// Teste do dashboard ANTES dos middlewares
app.get('/test-dashboard-early', async (req, res) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const totalDenuncias = await prisma.denuncia.count();
    
    res.json({
      success: true,
      message: 'Dashboard early funcionando!',
      data: {
        totalDenuncias,
        timestamp: new Date()
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Erro no dashboard early',
      details: error.message
    });
  }
});

// Middleware básico
app.use(helmet());
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3007',
    process.env.ADMIN_PANEL_URL || 'http://localhost:3007',
    'http://localhost:3007',
    'http://localhost:3006',
    'http://localhost:3005',
    'http://localhost:3001',
    'http://localhost:3000',
    'http://localhost:3002',
    'http://localhost:3003',
    'http://localhost:3004'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'Pragma'
  ],
  exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Middleware para upload de arquivos
app.use(fileUpload({
  useTempFiles: true,
  tempFileDir: './temp/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  abortOnLimit: true,
  responseOnLimit: 'Arquivo muito grande. Máximo 10MB permitido.',
  uploadTimeout: 60000, // 60 segundos
  createParentPath: true
}));

// Rota de health check
app.get('/', (req, res) => {
  res.json({
    message: 'Bot de Denúncias Cidadãs está online!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Teste simples para ver se funciona
app.get('/teste-admin', (req, res) => {
  res.send('<h1>Admin Panel Teste</h1><p>Se você vê isso, as rotas estão funcionando!</p>');
});

const path = require('path');

// Rotas da API - carregadas diretamente
try {
  console.log('Carregando rotas admin...');
  app.use('/api/admin', require('./routes/admin'));
  
  // Health check endpoints
  app.use('/health', require('./routes/health'));
  console.log('✅ Rotas admin carregadas');
} catch (error) {
  console.error('❌ Erro ao carregar rotas admin:', error.message);
}

// Rota de teste PRIORITÁRIA - colocada logo após as rotas básicas
app.get('/admin-test', (req, res) => {
  const fs = require('fs');
  const adminPath = path.join(__dirname, '../admin-panel/build');
  const indexPath = path.join(adminPath, 'index.html');
  
  res.json({
    message: 'Teste do Admin Panel',
    adminPanelPath: adminPath,
    indexPath: indexPath,
    indexExists: fs.existsSync(indexPath),
    buildExists: fs.existsSync(adminPath),
    currentDir: __dirname,
    files: fs.existsSync(adminPath) ? fs.readdirSync(adminPath) : []
  });
});

// Debug do caminho do admin panel
const adminPanelPath = path.join(__dirname, '../admin-panel/build');
console.log('📁 Caminho do Admin Panel:', adminPanelPath);

// IMPORTANTE: Servir os arquivos estáticos do build TAMBÉM na raiz
// Isso resolve o problema dos caminhos absolutos do React build
app.use('/static', express.static(path.join(adminPanelPath, 'static'), {
  setHeaders: (res, path) => {
    if (path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    } else if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));

// Servir arquivos individuais do build
app.get('/favicon.ico', (req, res) => {
  res.sendFile(path.join(adminPanelPath, 'favicon.ico'));
});

app.get('/manifest.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.sendFile(path.join(adminPanelPath, 'manifest.json'));
});

app.get('/logo192.png', (req, res) => {
  res.sendFile(path.join(adminPanelPath, 'logo192.png'));
});

app.get('/logo512.png', (req, res) => {
  res.sendFile(path.join(adminPanelPath, 'logo512.png'));
});

// Servir arquivos estáticos do admin panel
app.use('/admin', express.static(adminPanelPath, {
  index: 'index.html',
  dotfiles: 'ignore',
  etag: false,
  extensions: ['html', 'js', 'css', 'png', 'jpg', 'jpeg', 'gif', 'svg'],
  fallthrough: true,
  redirect: true
}));

// Servir arquivos de upload
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Rota específica para /admin (sem barra no final)
app.get('/admin', (req, res) => {
  const indexPath = path.join(__dirname, '../admin-panel/build/index.html');
  console.log('📄 Servindo admin panel (raiz):', indexPath);
  res.sendFile(indexPath);
});

// Rota catch-all para React Router (admin panel)
app.get('/admin/*', (req, res) => {
  const indexPath = path.join(__dirname, '../admin-panel/build/index.html');
  console.log('📄 Servindo admin panel:', indexPath);
  res.sendFile(indexPath);
});

// TESTE FINAL - Dashboard público sem qualquer middleware
app.get('/dashboard-test', async (req, res) => {
  try {
    const prisma = require('./config/database');
    
    const totalDenuncias = await prisma.denuncia.count();
    const denunciasPendentes = await prisma.denuncia.count({ 
      where: { status: 'PENDENTE_MODERACAO' } 
    });
    
    res.json({
      success: true,
      message: '✅ Dashboard funcionando sem autenticação!',
      data: {
        totalDenuncias,
        denunciasPendentes,
        timestamp: new Date()
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Erro no dashboard test',
      details: error.message
    });
  }
});

// Teste do dashboard direto (bypass total)
app.get('/test-direct-dashboard', async (req, res) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const totalDenuncias = await prisma.denuncia.count();
    
    res.json({
      success: true,
      message: 'Dashboard direto funcionando!',
      data: {
        totalDenuncias,
        timestamp: new Date()
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Erro no dashboard direto',
      details: error.message
    });
  }
});

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Algo deu errado'
  });
});

// Middleware para rotas não encontradas (DEVE SER O ÚLTIMO)
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Rota não encontrada',
    path: req.originalUrl
  });
});

// Adicionar rotas do sistema integrado
app.get('/api/system/status', (req, res) => {
  const status = integratedFlowController.getSystemStatus();
  res.json(status);
});

app.post('/api/system/process-message', async (req, res) => {
  try {
    const { message, options = {} } = req.body;
    
    if (!message) {
      return res.status(400).json({
        error: 'Mensagem é obrigatória',
        required: ['message']
      });
    }

    const result = await integratedFlowController.processMessage(message, options);
    res.json(result);
    
  } catch (error) {
    logger.error('[API] Erro ao processar mensagem:', error);
    res.status(500).json({
      error: 'Erro ao processar mensagem',
      message: error.message
    });
  }
});

// Função auxiliar para iniciar servidor com tratamento de erro
function startServerWithErrorHandling(app, port) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port)
      .on('listening', () => {
        resolve(server);
      })
      .on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
          const errorMsg = `Porta ${port} ainda está em uso após tentativa de resolução. PID do processo conflitante pode não ter sido liberado completamente.`;
          logger.error(`❌ ${errorMsg}`);
          reject(new Error(errorMsg));
        } else {
          logger.error(`❌ Erro ao iniciar servidor na porta ${port}:`, error);
          reject(error);
        }
      });
  });
}

// Inicializar sistema integrado e servidor
async function startServer() {
  try {
    logger.info('🚀 Iniciando aplicação...');
    
    // Resolver conflitos de porta antes de iniciar
    const portResolution = await portManager.resolvePortConflict(PORT, {
      allowKill: true,        // Permitir finalizar processos seguros
      allowPortChange: true,  // Permitir mudança de porta se necessário
      forceKill: false,       // Não forçar finalização (mais seguro)
      maxPortAttempts: 10     // Tentar até 10 portas diferentes
    });
    
    const finalPort = portResolution.port;
    logger.info(`🔧 ${portResolution.message}`);
    
    if (portResolution.action === 'port_changed') {
      logger.warn(`⚠️ Porta alterada de ${PORT} para ${finalPort}`);
      // Atualizar variável de ambiente para sessão atual
      process.env.PORT = finalPort.toString();
    }
    
    // Inicializar sistema integrado
    await integratedFlowController.initialize();
    
    // Iniciar servidor HTTP com tratamento de erro específico
    const server = await startServerWithErrorHandling(app, finalPort);
    
    logger.info(`🚀 Servidor rodando na porta ${finalPort}`);
    logger.info(`📊 Dashboard: http://localhost:${finalPort}/api/admin/dashboard`);
    logger.info(`🔗 Health Check: http://localhost:${finalPort}/health`);
    logger.info(`🎛️ System Status: http://localhost:${finalPort}/api/system/status`);
    logger.info(`✅ Sistema integrado inicializado com sucesso`);
    
    // Configurar shutdown graceful
    const gracefulShutdown = async (signal) => {
      logger.info(`📡 Sinal ${signal} recebido, iniciando shutdown graceful...`);
      
      server.close(async () => {
        logger.info('🔌 Servidor HTTP fechado');
        
        try {
          await integratedFlowController.shutdown(signal);
        } catch (error) {
          logger.error('❌ Erro no shutdown do sistema integrado:', error);
          process.exit(1);
        }
      });
    };

    // Event listeners para shutdown
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Event listeners do sistema integrado
    integratedFlowController.on('systemInitialized', (data) => {
      logger.info('✅ Sistema integrado inicializado:', data);
    });

    integratedFlowController.on('statusChanged', (data) => {
      logger.warn(`📊 Status do sistema mudou: ${data.previous} → ${data.current}`);
    });

    integratedFlowController.on('slaViolation', (data) => {
      logger.warn('⚠️ Violação de SLA detectada:', data);
    });

    integratedFlowController.on('criticalError', (data) => {
      logger.error('💥 Erro crítico no sistema:', data);
    });
    
  } catch (error) {
    logger.error('❌ Falha ao inicializar aplicação:', error);
    process.exit(1);
  }
}

// Iniciar aplicação
startServer();
