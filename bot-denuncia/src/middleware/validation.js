const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const logger = require('../utils/logger');

// Rate limiting para diferentes endpoints
const createRateLimit = (windowMs, max, message, skipSuccessfulRequests = true) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: message,
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil(windowMs / 1000)
    },
    skipSuccessfulRequests,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn(`Rate limit excedido para IP: ${req.ip}, endpoint: ${req.path}`);
      res.status(429).json({
        error: message,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
  });
};

// Rate limits específicos
const rateLimits = {
  // Login: DESABILITADO PARA TESTES (era: 5 tentativas por 15 minutos)
  login: (req, res, next) => next(), // Middleware vazio

  // API geral: 100 requisições por 15 minutos
  api: createRateLimit(
    15 * 60 * 1000, // 15 minutos
    100, // 100 requisições
    'Muitas requisições. Tente novamente em alguns minutos.'
  ),

  // Admin actions: 50 ações por 10 minutos
  admin: createRateLimit(
    10 * 60 * 1000, // 10 minutos
    50, // 50 ações
    'Muitas ações administrativas. Tente novamente em alguns minutos.'
  ),

  // Upload de arquivos: 10 uploads por hora
  upload: createRateLimit(
    60 * 60 * 1000, // 1 hora
    10, // 10 uploads
    'Limite de uploads atingido. Tente novamente em 1 hora.'
  )
};

// Configuração de segurança com Helmet
const securityMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      formAction: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Para compatibilidade com upload de imagens
});

// Configuração de CORS
const corsOptions = {
  origin: function (origin, callback) {
    // Permitir requisições sem origin (mobile apps, postman, etc)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001', 
      'http://localhost:5173', // Vite dev server
      process.env.FRONTEND_URL,
      process.env.ADMIN_PANEL_URL
    ].filter(Boolean);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`CORS bloqueado para origin: ${origin}`);
      callback(new Error('Não permitido pelo CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// Middleware para sanitizar input
const sanitizeInput = (req, res, next) => {
  try {
    // Função recursiva para sanitizar objeto
    const sanitize = (obj) => {
      if (typeof obj === 'string') {
        // Remove tags HTML básicas e scripts
        return obj
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<[^>]*>/g, '')
          .trim();
      }
      
      if (Array.isArray(obj)) {
        return obj.map(sanitize);
      }
      
      if (obj && typeof obj === 'object') {
        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
          sanitized[key] = sanitize(value);
        }
        return sanitized;
      }
      
      return obj;
    };

    // Sanitizar body, query e params
    if (req.body) req.body = sanitize(req.body);
    if (req.query) req.query = sanitize(req.query);
    if (req.params) req.params = sanitize(req.params);

    next();
  } catch (error) {
    logger.error('Erro na sanitização de input:', error);
    res.status(400).json({
      error: 'Dados de entrada inválidos',
      code: 'INVALID_INPUT'
    });
  }
};

// Schema de validação para login
const validateLogin = (req, res, next) => {
  const { email, senha } = req.body;

  const errors = [];

  if (!email) {
    errors.push('Email é obrigatório');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('Email deve ter formato válido');
  }

  if (!senha) {
    errors.push('Senha é obrigatória');
  } else if (senha.length < 6) {
    errors.push('Senha deve ter pelo menos 6 caracteres');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Dados de entrada inválidos',
      code: 'VALIDATION_ERROR',
      details: errors
    });
  }

  next();
};

// Schema de validação para criação de usuário admin
const validateCreateAdmin = (req, res, next) => {
  const { nome, email, senha, role } = req.body;

  const errors = [];

  if (!nome) {
    errors.push('Nome é obrigatório');
  } else if (nome.length < 2) {
    errors.push('Nome deve ter pelo menos 2 caracteres');
  }

  if (!email) {
    errors.push('Email é obrigatório');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('Email deve ter formato válido');
  }

  if (!senha) {
    errors.push('Senha é obrigatória');
  } else if (senha.length < 8) {
    errors.push('Senha deve ter pelo menos 8 caracteres');
  } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(senha)) {
    errors.push('Senha deve conter pelo menos: 1 letra minúscula, 1 maiúscula e 1 número');
  }

  if (role && !['ADMIN', 'MODERADOR', 'VISUALIZADOR'].includes(role)) {
    errors.push('Role deve ser: ADMIN, MODERADOR ou VISUALIZADOR');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Dados de entrada inválidos',
      code: 'VALIDATION_ERROR',
      details: errors
    });
  }

  next();
};

// Validação para aprovação/rejeição de denúncia
const validateDenunciaAction = (req, res, next) => {
  const { acao, motivo } = req.body;
  const { id } = req.params;

  const errors = [];

  if (!id || !/^[a-zA-Z0-9_-]{1,50}$/.test(id)) {
    errors.push('ID da denúncia inválido');
  }

  if (!acao) {
    errors.push('Ação é obrigatória');
  } else if (!['aprovar', 'rejeitar', 'editar'].includes(acao)) {
    errors.push('Ação deve ser: aprovar, rejeitar ou editar');
  }

  if (acao === 'rejeitar' && !motivo) {
    errors.push('Motivo é obrigatório para rejeição');
  }

  if (motivo && motivo.length > 500) {
    errors.push('Motivo não pode exceder 500 caracteres');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Dados de entrada inválidos',
      code: 'VALIDATION_ERROR',
      details: errors
    });
  }

  next();
};

// Middleware para log de requisições
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { method, url, ip } = req;
    const { statusCode } = res;
    
    const logData = {
      method,
      url,
      statusCode,
      duration: `${duration}ms`,
      ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id || 'anonymous'
    };

    if (statusCode >= 400) {
      logger.warn('Requisição com erro:', logData);
    } else {
      logger.info('Requisição processada:', logData);
    }
  });

  next();
};

// Middleware para tratar erros de validação do Prisma
const handlePrismaErrors = (error, req, res, next) => {
  if (error.code === 'P2002') {
    // Unique constraint violation
    return res.status(409).json({
      error: 'Recurso já existe',
      code: 'DUPLICATE_RESOURCE',
      field: error.meta?.target
    });
  }

  if (error.code === 'P2025') {
    // Record not found
    return res.status(404).json({
      error: 'Recurso não encontrado',
      code: 'RESOURCE_NOT_FOUND'
    });
  }

  if (error.code === 'P2003') {
    // Foreign key constraint violation
    return res.status(400).json({
      error: 'Referência inválida',
      code: 'INVALID_REFERENCE'
    });
  }

  // Erro genérico do Prisma
  if (error.code && error.code.startsWith('P')) {
    logger.error('Erro do Prisma:', error);
    return res.status(500).json({
      error: 'Erro no banco de dados',
      code: 'DATABASE_ERROR'
    });
  }

  next(error);
};

module.exports = {
  rateLimits,
  securityMiddleware,
  corsOptions,
  sanitizeInput,
  validateLogin,
  validateCreateAdmin,
  validateDenunciaAction,
  requestLogger,
  handlePrismaErrors
};